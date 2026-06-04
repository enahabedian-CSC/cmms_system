// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  IzzySync.gs — CSC CMMS v5.0                                            ║
// ║  Read-only hourly sync from Izzy's live tracker sheet into our Master  ║
// ║  Log.  Only imports tickets whose ACTION = 'TICKET CREATED' — skips    ║
// ║  rows that Izzy herself imported from Edward's external form so we      ║
// ║  don't double-import (ExternalSync.gs already handles Edward's tickets).║
// ║  Zero writes to Izzy's sheet.  Called by runHourlySync().               ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Izzy's Master Log column layout (1-based, 35 cols — same as ours minus
// VERIFICATION_CHECKLIST col 36 and PHOTO_URL col 37 which we added later).
// We read cols 1-35 by index and map to our ML schema.
var IZ_COL = {
  ROW_ID:1,         TICKET_NO:2,      TIMESTAMP:3,       ACTION:4,
  STATUS:5,         DEPT:6,           BUILDING_ZONE:7,   EQUIP_TYPE:8,
  EQUIP_CODE:9,     SPECIFIC_EQUIP:10, DOWNTIME_TYPE:11, PRIORITY:12,
  DESCRIPTION:13,   ASSIGNED_TO:14,   EST_HOURS:15,      ACTUAL_HOURS:16,
  DATE_OPENED:17,   DATE_COMPLETED:18, DATE_CLOSED:19,   CORRECTIVE_ACT:20,
  ROOT_CAUSE:21,    WORK_SUMMARY:22,  FIX_TYPE:23,       TEMP_FIX_FLAG:24,
  PARTS_NEEDED:25,  PARTS_STATUS:26,  EQUIP_TAG_STATUS:27, VERIFIED_BY:28,
  VERIFIED_DATE:29, ADDED_BY:30,      UPDATED_BY:31,     NOTES:32,
  PROBLEM_TYPE:33,  TRACKER_GROUP:34, LINE_NO:35
};
var IZ_READ_COLS = 35;

// ═══════════════════════════════════════════════════════════════════════════════
//  syncFromIzzySheet_
//  Opens Izzy's 🗄️ Master Log, finds any ticket numbers not yet in our ML,
//  and imports them (dual-write invariant: ML + TH + queue + tracker).
// ═══════════════════════════════════════════════════════════════════════════════

function syncFromIzzySheet_() {
  var cfg = getConfig();
  if (String(cfg['Izzy Sync Enabled'] || 'Y').toUpperCase() !== 'Y') {
    Logger.log('syncFromIzzySheet_: disabled via config');
    return { success: true, imported: 0, skipped: 0 };
  }

  var izzySheetId = EXT_SHEET_IDS.IZZY_TRACKER;
  var tabName     = '🗄️ Master Log';

  try {
    var sourceSS = SpreadsheetApp.openById(izzySheetId);
    var sourceSh = sourceSS.getSheetByName(tabName);
    if (!sourceSh || sourceSh.getLastRow() < 2) {
      Logger.log('syncFromIzzySheet_: tab "' + tabName + '" not found or empty');
      return { success: true, imported: 0, skipped: 0 };
    }

    var numRows   = sourceSh.getLastRow() - 1;
    var numCols   = Math.min(sourceSh.getLastColumn(), IZ_READ_COLS);
    var sourceData = sourceSh.getRange(2, 1, numRows, numCols).getValues();

    // ── Collect the best (most-complete) row per ticket number ───────────────
    // Izzy's ML may have multiple rows for the same ticket (one per action).
    // We want the most recent/complete snapshot.  Strategy: for each column,
    // prefer the last non-empty value seen while scanning rows in order.
    var ticketMap = {};   // ticketNo → best-merged row array
    var ticketOrder = []; // insertion order for deterministic import sequence

    sourceData.forEach(function(row) {
      var action   = String(row[IZ_COL.ACTION - 1]    || '').trim().toUpperCase();
      var ticketNo = String(row[IZ_COL.TICKET_NO - 1] || '').trim();

      // Skip blank rows
      if (!ticketNo) return;

      // Skip rows that Izzy imported from Edward — we handle those ourselves
      if (action === 'EXTERNAL IMPORT') return;

      if (!ticketMap[ticketNo]) {
        ticketMap[ticketNo] = row.slice(); // clone
        ticketOrder.push(ticketNo);
      } else {
        // Merge: overwrite with non-empty values from later rows
        var existing = ticketMap[ticketNo];
        row.forEach(function(val, idx) {
          if (val !== '' && val !== null && val !== undefined) {
            existing[idx] = val;
          }
        });
      }
    });

    // ── Build deduplication set from our Master Log ──────────────────────────
    var existingNos = _buildExistingTicketSet_();

    var tz       = Session.getScriptTimeZone();
    var syncNow  = new Date();
    var imported = 0;
    var skipped  = 0;
    var ss       = getBoundSS_();

    ticketOrder.forEach(function(ticketNo) {
      // Skip tickets already in our system
      if (existingNos[ticketNo]) { skipped++; return; }

      var row = ticketMap[ticketNo];

      // ── Extract fields ─────────────────────────────────────────────────────
      var rawTs        = row[IZ_COL.TIMESTAMP     - 1];
      var status       = String(row[IZ_COL.STATUS      - 1] || 'WAITING').trim().toUpperCase();
      var deptRaw      = String(row[IZ_COL.DEPT        - 1] || '').trim();
      var buildingZone = String(row[IZ_COL.BUILDING_ZONE - 1] || '').trim();
      var equipType    = String(row[IZ_COL.EQUIP_TYPE   - 1] || '').trim().toUpperCase();
      var equipCode    = String(row[IZ_COL.EQUIP_CODE   - 1] || '').trim();
      var specificEquip= String(row[IZ_COL.SPECIFIC_EQUIP - 1] || '').trim();
      var downtimeType = String(row[IZ_COL.DOWNTIME_TYPE - 1] || 'UNPLANNED').trim().toUpperCase();
      var priority     = String(row[IZ_COL.PRIORITY     - 1] || '').trim();
      var description  = String(row[IZ_COL.DESCRIPTION  - 1] || '').trim();
      var assignedTo   = String(row[IZ_COL.ASSIGNED_TO  - 1] || '').trim();
      var estHours     = parseFloat(row[IZ_COL.EST_HOURS    - 1]) || '';
      var actualHours  = parseFloat(row[IZ_COL.ACTUAL_HOURS - 1]) || '';
      var dateOpened   = row[IZ_COL.DATE_OPENED   - 1];
      var dateCompleted= row[IZ_COL.DATE_COMPLETED - 1];
      var dateClosed   = row[IZ_COL.DATE_CLOSED   - 1];
      var correctiveAct= String(row[IZ_COL.CORRECTIVE_ACT - 1] || '').trim();
      var rootCause    = String(row[IZ_COL.ROOT_CAUSE   - 1] || '').trim();
      var workSummary  = String(row[IZ_COL.WORK_SUMMARY - 1] || '').trim();
      var fixType      = String(row[IZ_COL.FIX_TYPE     - 1] || '').trim();
      var tempFixFlag  = String(row[IZ_COL.TEMP_FIX_FLAG - 1] || '').trim();
      var partsNeeded  = String(row[IZ_COL.PARTS_NEEDED - 1] || '').trim();
      var partsStatus  = String(row[IZ_COL.PARTS_STATUS - 1] || '').trim();
      var equipTagStatus= String(row[IZ_COL.EQUIP_TAG_STATUS - 1] || '').trim();
      var verifiedBy   = String(row[IZ_COL.VERIFIED_BY  - 1] || '').trim();
      var verifiedDate = row[IZ_COL.VERIFIED_DATE - 1];
      var addedBy      = String(row[IZ_COL.ADDED_BY     - 1] || 'Izzy Sync').trim();
      var updatedBy    = String(row[IZ_COL.UPDATED_BY   - 1] || 'Izzy Sync').trim();
      var notes        = String(row[IZ_COL.NOTES        - 1] || '').trim();
      var problemType  = String(row[IZ_COL.PROBLEM_TYPE - 1] || '').trim();
      var trackerGroup = String(row[IZ_COL.TRACKER_GROUP - 1] || '').trim();
      var lineNo       = String(row[IZ_COL.LINE_NO      - 1] || '').trim();

      // ── Normalize dept ─────────────────────────────────────────────────────
      var dept = normalizeDept(deptRaw) || deptRaw;

      // ── Resolve timestamps ─────────────────────────────────────────────────
      var ticketDate;
      if (rawTs instanceof Date && !isNaN(rawTs)) {
        ticketDate = rawTs;
      } else {
        ticketDate = syncNow;
      }

      var dateOpenedStr = '';
      if (dateOpened instanceof Date && !isNaN(dateOpened)) {
        dateOpenedStr = Utilities.formatDate(dateOpened, tz, 'MM/dd/yyyy');
      } else if (dateOpened) {
        dateOpenedStr = String(dateOpened);
      } else {
        dateOpenedStr = Utilities.formatDate(ticketDate, tz, 'MM/dd/yyyy');
      }

      // ── If no equipment code found locally, use Izzy's ────────────────────
      if (!equipCode && specificEquip) {
        var resolved = lookupEquipmentCode_(dept, equipType, specificEquip);
        if (resolved) equipCode = resolved;
      }

      // ── Resolve import status — preserve Izzy's status ────────────────────
      // Map to valid statuses in our system.
      var importStatus;
      if (status === 'CLOSED' || status === 'VERIFIED') {
        importStatus = 'CLOSED';
      } else if (status === 'VOIDED') {
        importStatus = 'VOIDED';
      } else if (status === 'OPEN' || status === 'PENDING VERIFICATION' || status === 'PENDING PARTS') {
        importStatus = status;
      } else {
        importStatus = 'WAITING';
      }

      // ── MANDATORY: Master Log write ────────────────────────────────────────
      appendToMasterLog_({
        ticketNo:      ticketNo,
        now:           ticketDate,
        action:        ML_ACTIONS.IZZY_IMPORT,
        status:        importStatus,
        dept:          dept,
        buildingZone:  buildingZone,
        equipType:     equipType,
        equipCode:     equipCode,
        specificEquip: specificEquip,
        downtimeType:  downtimeType,
        priority:      priority,
        description:   description,
        assignedTo:    assignedTo,
        estHours:      estHours,
        actualHours:   actualHours,
        dateOpened:    dateOpenedStr,
        dateCompleted: dateCompleted instanceof Date ? Utilities.formatDate(dateCompleted, tz, 'MM/dd/yyyy') : (dateCompleted || ''),
        dateClosed:    dateClosed    instanceof Date ? Utilities.formatDate(dateClosed,    tz, 'MM/dd/yyyy') : (dateClosed    || ''),
        correctiveAct: correctiveAct,
        rootCause:     rootCause,
        workSummary:   workSummary,
        fixType:       fixType,
        tempFixFlag:   tempFixFlag,
        partsNeeded:   partsNeeded === 'YES' || partsNeeded === 'TRUE' || partsNeeded === '1',
        partsStatus:   partsStatus,
        equipTagStatus:equipTagStatus,
        verifiedBy:    verifiedBy,
        verifiedDate:  verifiedDate instanceof Date ? Utilities.formatDate(verifiedDate, tz, 'MM/dd/yyyy') : (verifiedDate || ''),
        addedBy:       addedBy,
        updatedBy:     'Izzy Sync',
        notes:         notes,
        problemType:   problemType,
        trackerGroup:  trackerGroup,
        lineNo:        lineNo
      });

      // Mark imported before sheet writes so a partial failure doesn't duplicate
      existingNos[ticketNo] = true;

      // ── MANDATORY: Ticket History write ───────────────────────────────────
      appendToTicketHistory_(
        ticketNo,
        TH_EVENTS.CREATED,
        '',
        importStatus,
        addedBy,
        'Imported from Izzy\'s tracker | Dept: ' + dept +
        ' | Status: ' + importStatus +
        ' | Equipment: ' + (specificEquip || '—') +
        ' | Line: ' + (lineNo || '—')
      );

      // ── Queue + tracker writes (only for non-closed, non-voided) ──────────
      if (importStatus !== 'CLOSED' && importStatus !== 'VOIDED') {
        var tracker = getTrackerForDept(dept, '', equipType);
        var ticketData = {
          dept:          dept,
          equipType:     equipType,
          equipCode:     equipCode,
          specificEquip: specificEquip,
          equipDesc:     specificEquip,
          description:   description,
          problemDesc:   description,
          downtimeType:  downtimeType,
          priority:      priority,
          estHours:      estHours,
          lineNo:        lineNo,
          partsNeeded:   partsNeeded === 'YES' || partsNeeded === 'TRUE' || partsNeeded === '1',
          notes:         notes
        };

        var targetQueue = importStatus === 'WAITING' ? SH.WAITING : SH.OPEN;
        writeTicketToSheet_(ss, targetQueue, ticketNo, ticketData, importStatus, dept, ticketDate, addedBy);
        writeTicketToSheet_(ss, tracker,     ticketNo, ticketData, importStatus, dept, ticketDate, addedBy);
      }

      imported++;
    });

    Logger.log('syncFromIzzySheet_: imported=' + imported + ' skipped=' + skipped);
    return { success: true, imported: imported, skipped: skipped };

  } catch (e) {
    Logger.log('syncFromIzzySheet_ error: ' + e.message);
    return { success: false, error: e.message, imported: 0, skipped: 0 };
  }
}

// Admin-callable wrapper for a manual "Sync from Izzy Now" button.
function manualSyncFromIzzy() {
  requireAdmin_();
  return syncFromIzzySheet_();
}
