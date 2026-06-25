// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ExternalSync.gs — CSC CMMS v5.0                                        ║
// ║  Polls the external Google Form response sheet and imports any rows     ║
// ║  not yet present in the Master Log.  Read-only access to source sheet.  ║
// ║  Called by runHourlySync() in EquipRegistry.gs.                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// External source column layout (1-based, matches legacy):
//   A(1): Ticket No   B(2): Timestamp    C(3): Mechanic      D(4): Department
//   E(5): Line No     F(6): Equip Type   G(7): Equip Desc    H(8): Issue Desc
//   I(9): Est Hours   J(10): Photo Links
var EXT_COL = { TICKET_NO:1, TIMESTAMP:2, MECHANIC:3, DEPT:4,
                LINE_NO:5, EQUIP_TYPE:6, EQUIP_DESC:7, ISSUE_DESC:8,
                EST_HOURS:9, PHOTO_LINKS:10 };
var EXT_READ_COLS = 10;

// ═══════════════════════════════════════════════════════════════════════════════
//  syncExternalTickets
//  Imports new rows from the external ticket source into the bound sheet.
//  Deduplication key: ticket number present in Master Log.
//  All imports are WAITING status (no CRITICAL bypass for external tickets).
//  Dual-write invariant: appendToMasterLog_() + appendToTicketHistory_() per row.
// ═══════════════════════════════════════════════════════════════════════════════

function syncExternalTickets() {
  var cfg = getConfig();
  if (String(cfg['External Sync Enabled'] || 'Y').toUpperCase() !== 'Y') {
    Logger.log('syncExternalTickets: disabled via config');
    return { success: true, imported: 0, skipped: 0 };
  }

  var tabName = cfg['External Ticket Tab Name'] || 'Service Tickets';

  try {
    var sourceSS = SpreadsheetApp.openById(EXT_SHEET_IDS.EXTERNAL_TICKETS);
    var sourceSh = sourceSS.getSheetByName(tabName);
    if (!sourceSh || sourceSh.getLastRow() < 2) {
      Logger.log('syncExternalTickets: tab "' + tabName + '" not found or empty');
      return { success: true, imported: 0, skipped: 0 };
    }

    var sourceData = sourceSh.getRange(
      2, 1,
      sourceSh.getLastRow() - 1,
      EXT_READ_COLS
    ).getValues();

    // ── Build deduplication set from Master Log ───────────────────────────────
    var existingNos = _buildExistingTicketSet_();

    var tz       = Session.getScriptTimeZone();
    var syncNow  = new Date();
    var imported = 0;
    var skipped  = 0;

    sourceData.forEach(function(row) {
      var ticketNo  = String(row[EXT_COL.TICKET_NO  - 1] || '').trim();
      var rawTs     = row[EXT_COL.TIMESTAMP  - 1];
      var mechanic  = String(row[EXT_COL.MECHANIC   - 1] || '').trim();
      var deptRaw   = String(row[EXT_COL.DEPT       - 1] || '').trim();
      var lineNo    = String(row[EXT_COL.LINE_NO    - 1] || '').trim();
      var equipType = String(row[EXT_COL.EQUIP_TYPE - 1] || '').trim().toUpperCase();
      var equipDesc = String(row[EXT_COL.EQUIP_DESC - 1] || '').trim();
      var issueDesc = String(row[EXT_COL.ISSUE_DESC - 1] || '').trim();
      var estHours  = parseFloat(row[EXT_COL.EST_HOURS   - 1]) || '';
      var photoLinks= String(row[EXT_COL.PHOTO_LINKS - 1] || '').trim();

      // Skip blank rows
      if (!ticketNo && !issueDesc) { skipped++; return; }

      // Skip already-imported tickets
      if (ticketNo && existingNos[ticketNo]) { skipped++; return; }

      // ── Normalize dept and resolve tracker ───────────────────────────────────
      var dept    = normalizeDept(deptRaw);
      var tracker = getTrackerForDept(dept, '', equipType);

      // ── Resolve timestamps ────────────────────────────────────────────────────
      var ticketDate, dateOpened;
      if (rawTs instanceof Date && !isNaN(rawTs)) {
        ticketDate  = rawTs;
        dateOpened  = Utilities.formatDate(rawTs, tz, 'MM/dd/yyyy');
      } else {
        ticketDate  = syncNow;
        dateOpened  = Utilities.formatDate(syncNow, tz, 'MM/dd/yyyy');
      }

      // ── Auto-resolve equipment code from inventory ────────────────────────────
      var equipCode = lookupEquipmentCode_(dept, equipType, equipDesc);

      var addedBy = mechanic || 'External Sync';

      // ── MANDATORY: Master Log write ───────────────────────────────────────────
      appendToMasterLog_({
        ticketNo:      ticketNo,
        now:           ticketDate,
        action:        ML_ACTIONS.EXTERNAL_IMPORT,
        status:        'WAITING',
        dept:          dept,
        equipType:     equipType,
        equipCode:     equipCode,
        specificEquip: equipDesc,
        downtimeType:  'UNPLANNED',
        description:   issueDesc,
        estHours:      estHours,
        dateOpened:    dateOpened,
        lineNo:        lineNo,
        addedBy:       addedBy,
        updatedBy:     'External Sync',
        notes:         '',
        photoUrl:      photoLinks
      });

      // Mark as imported before the sheet writes so a partial failure doesn't
      // produce a duplicate on the next run.
      if (ticketNo) existingNos[ticketNo] = true;

      // ── MANDATORY: Ticket History write ──────────────────────────────────────
      appendToTicketHistory_(
        ticketNo,
        TH_EVENTS.CREATED,
        '',
        'WAITING',
        addedBy,
        'Imported from external form | Dept: ' + dept +
        ' | Tracker: ' + tracker +
        ' | Equipment: ' + (equipDesc || '—') +
        ' | Line: '     + (lineNo    || '—')
      );

      // ── Queue + tracker writes ────────────────────────────────────────────────
      var ss         = getBoundSS_();
      var ticketData = {
        dept:          dept,
        equipType:     equipType,
        equipCode:     equipCode,
        specificEquip: equipDesc,
        equipDesc:     equipDesc,
        description:   issueDesc,
        problemDesc:   issueDesc,
        downtimeType:  'UNPLANNED',
        priority:      '',
        estHours:      estHours,
        lineNo:        lineNo,
        partsNeeded:   false,
        photoUrl:      photoLinks,
        notes:         ''
      };
      writeTicketToSheet_(ss, SH.WAITING, ticketNo, ticketData, 'WAITING', dept, ticketDate, addedBy);
      writeTicketToSheet_(ss, tracker,    ticketNo, ticketData, 'WAITING', dept, ticketDate, addedBy);

      // ── Manager notification (non-CRITICAL only — all external tickets qualify)
      sendNewTicketManagerNotification_(ticketNo, {
        dept:          dept,
        source:        'EXTERNAL',
        specificEquip: equipDesc,
        equipCode:     equipCode,
        equipType:     equipType,
        description:   issueDesc,
        addedBy:       addedBy,
        lineNo:        lineNo,
        downtimeType:  'UNPLANNED',
        dateOpened:    dateOpened
      });

      imported++;
    });

    Logger.log('syncExternalTickets: imported=' + imported + ' skipped=' + skipped);
    return { success: true, imported: imported, skipped: skipped };

  } catch (e) {
    Logger.log('syncExternalTickets error: ' + e.message);
    return { success: false, error: e.message, imported: 0, skipped: 0 };
  }
}

// Admin-callable wrapper (used by future Admin screen "Sync Now" button).
function manualSyncExternalTickets() {
  requireAdmin_();
  return syncExternalTickets();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  lookupEquipmentCode_
//  Returns the inventory equipment code for a given dept + type + description.
//  Ported from legacy EquipmentCodeLookup.js.  Uses getEquipmentFlatList()
//  which is powered by the cache refreshed in EquipRegistry.gs.
// ═══════════════════════════════════════════════════════════════════════════════

function lookupEquipmentCode_(dept, equipType, equipDesc) {
  var equip = getEquipmentFlatList();
  if (!equip || equip.length === 0) return '';

  var deptNorm = String(dept      || '').toUpperCase().trim();
  var typNorm  = String(equipType || '').toUpperCase().trim();
  var descNorm = String(equipDesc || '').toUpperCase().trim();
  if (!descNorm) return '';

  // Step 1 — filter by normalized dept
  var byDept = equip.filter(function(e) {
    return String(e.dept || '').toUpperCase().trim() === deptNorm;
  });

  // Step 2 — try reverse-mapping through Dept Map if no direct hit
  if (byDept.length === 0) {
    var mapping = getDeptMapping_();
    Object.keys(mapping).forEach(function(src) {
      if (mapping[src] === deptNorm) {
        equip.forEach(function(e) {
          if (String(e.dept || '').toUpperCase().trim() === src) byDept.push(e);
        });
      }
    });
  }

  // Step 3 — fall back to full list
  var pool = byDept.length > 0 ? byDept : equip;

  // Step 4 — narrow by equip type if provided
  if (typNorm) {
    var byType = pool.filter(function(e) {
      return String(e.eType || '').toUpperCase().trim() === typNorm;
    });
    if (byType.length > 0) pool = byType;
  }

  // Step 5 — exact description match (case-insensitive)
  var match = pool.filter(function(e) {
    return String(e.specific || '').toUpperCase().trim() === descNorm;
  });
  return match.length > 0 ? match[0].code : '';
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _buildExistingTicketSet_() {
  var set = {};
  var sh  = getBoundSS_().getSheetByName(SH.MASTER_LOG);
  if (!sh || sh.getLastRow() < 2) return set;
  sh.getRange(2, ML.TICKET_NO, sh.getLastRow() - 1, 1).getValues()
    .forEach(function(r) {
      var v = String(r[0] || '').trim();
      if (v) set[v] = true;
    });
  return set;
}
