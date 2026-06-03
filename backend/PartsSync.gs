// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  PartsSync.gs — CSC CMMS v5.0                                           ║
// ║  Polls Edward's external parts request Google Sheet and imports any     ║
// ║  new entries not yet present in the Parts Needed tab.                   ║
// ║  Called by runHourlySync() in EquipRegistry.gs.                         ║
// ║  Config keys (⚙️ Configuration tab):                                    ║
// ║    Parts Source URL       — Google Sheets URL of Edward's sheet         ║
// ║    Parts Source Tab Name  — tab name (default: Sheet1)                  ║
// ║    Parts Sync Enabled     — Y/N (default: Y)                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Flexible column header mapping — covers common naming conventions.
var _PARTS_COL_MAPPINGS_ = {
  partDesc:    ['part description','part desc','description','desc','part name',
                'name','item','item description','part','part #','part no',
                'part number','component','material'],
  ticketNo:    ['ticket #','ticket no','ticket number','ticket','work order',
                'wo #','wo number','job #','job no','job number','wo'],
  equipCode:   ['equip code','equipment code','asset code','code','asset #',
                'machine code','equip #','machine #','asset no'],
  equipDesc:   ['equipment','equipment description','equipment name','equip desc',
                'specific equipment','machine','asset name','equip name'],
  dept:        ['department','dept','dept.','area','division'],
  requestedBy: ['requested by','mechanic','technician','tech','requested_by',
                'req by','submitter','requestor','requester','submitted by'],
  notes:       ['notes','comments','note','additional info','remarks','details']
};

function _buildPartsColMap_(lowerHeaders) {
  var colMap = {};
  Object.keys(_PARTS_COL_MAPPINGS_).forEach(function(key) {
    var variants = _PARTS_COL_MAPPINGS_[key];
    for (var i = 0; i < lowerHeaders.length; i++) {
      if (variants.indexOf(lowerHeaders[i]) >= 0) { colMap[key] = i; break; }
    }
  });
  return colMap;
}

function _getPartsSourceSheetId_() {
  var CANDIDATES = [
    'Parts Source URL',
    'Parts Sheet URL',
    'Parts Request URL',
    'Edward Parts URL',
    'External Parts URL'
  ];
  function extractId_(str) {
    if (!str) return '';
    var s = String(str).trim();
    var m = s.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (m) return m[1];
    if (s.indexOf('/') < 0 && s.length >= 25) return s;
    return '';
  }
  for (var i = 0; i < CANDIDATES.length; i++) {
    var id = extractId_(getConfigValue(CANDIDATES[i]));
    if (id) return id;
  }
  return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  syncPartsFromExternal_
//  Imports new part requests from Edward's Google Sheet into PARTS_NEEDED.
//  Deduplication key: ticketNo + partDesc (lowercased) already present.
//  Emails manager(s) for affected depts when new parts are found.
// ═══════════════════════════════════════════════════════════════════════════════

function syncPartsFromExternal_() {
  var cfg = getConfig();
  if (String(cfg['Parts Sync Enabled'] || 'Y').toUpperCase() !== 'Y') {
    Logger.log('syncPartsFromExternal_: disabled via config');
    return { success: true, imported: 0, skipped: 0 };
  }

  var sheetId = _getPartsSourceSheetId_();
  if (!sheetId) {
    Logger.log('syncPartsFromExternal_: no Parts Source URL configured — skipping');
    return { success: true, imported: 0, skipped: 0, warning: 'Parts Source URL not configured' };
  }

  var tabName = String(cfg['Parts Source Tab Name'] || 'Sheet1');

  try {
    var sourceSS = SpreadsheetApp.openById(sheetId);
    var sourceSh = sourceSS.getSheetByName(tabName);
    if (!sourceSh || sourceSh.getLastRow() < 2) {
      Logger.log('syncPartsFromExternal_: tab "' + tabName + '" not found or empty');
      return { success: true, imported: 0, skipped: 0 };
    }

    var lastRow  = sourceSh.getLastRow();
    var lastCol  = sourceSh.getLastColumn();
    var allData  = sourceSh.getRange(1, 1, lastRow, lastCol).getValues();

    // Find header row — scan first 5 rows, pick the one with the most field matches
    var allVariants = [];
    Object.keys(_PARTS_COL_MAPPINGS_).forEach(function(k) {
      allVariants = allVariants.concat(_PARTS_COL_MAPPINGS_[k]);
    });
    var headerIdx  = 0;
    var bestCount  = 0;
    var scanLimit  = Math.min(5, allData.length);
    for (var i = 0; i < scanLimit; i++) {
      var matches = 0;
      allData[i].forEach(function(cell) {
        if (allVariants.indexOf(String(cell || '').trim().toLowerCase()) >= 0) matches++;
      });
      if (matches > bestCount) { bestCount = matches; headerIdx = i; }
    }

    var headers  = allData[headerIdx].map(function(h) { return String(h || '').trim().toLowerCase(); });
    var colMap   = _buildPartsColMap_(headers);
    var dataRows = allData.slice(headerIdx + 1);

    // Build deduplication set from existing PARTS_NEEDED rows
    var pnSh = getBoundSS_().getSheetByName(SH.PARTS_NEEDED);
    if (!pnSh) return { success: false, error: SH.PARTS_NEEDED + ' tab not found' };

    var existingKeys = {};
    if (pnSh.getLastRow() > HIST_HEADER_ROW) {
      pnSh.getRange(HIST_HEADER_ROW + 1, 1, pnSh.getLastRow() - HIST_HEADER_ROW, PN_COLS).getValues()
        .forEach(function(r) {
          var tn   = String(r[PN.TICKET_NO - 1] || '').trim();
          var desc = String(r[PN.PART_DESC - 1] || '').trim().toLowerCase();
          if (desc) existingKeys[tn + '||' + desc] = true;
        });
    }

    var syncNow  = new Date();
    var tz       = Session.getScriptTimeZone();
    var imported = 0;
    var skipped  = 0;
    var newParts = [];

    dataRows.forEach(function(row) {
      function col(k) { return colMap[k] !== undefined ? String(row[colMap[k]] || '').trim() : ''; }
      var partDesc    = col('partDesc');
      var ticketNo    = col('ticketNo');
      var equipCode   = col('equipCode');
      var equipDesc   = col('equipDesc');
      var dept        = normalizeDept(col('dept'));
      var requestedBy = col('requestedBy');
      var notes       = col('notes');

      if (!partDesc) { skipped++; return; }

      var dedupKey = ticketNo + '||' + partDesc.toLowerCase();
      if (existingKeys[dedupKey]) { skipped++; return; }
      existingKeys[dedupKey] = true;

      var partId        = 'PN-EXT-' + Utilities.formatDate(syncNow, tz, 'yyyyMMdd') +
                          '-' + String(pnSh.getLastRow() + imported + 1);
      var dateRequested = Utilities.formatDate(syncNow, tz, 'MM/dd/yyyy');
      var notesStr      = (requestedBy ? 'Requested by: ' + requestedBy : '') +
                          (notes       ? (requestedBy ? ' | ' : '') + notes : '');

      var partRow = new Array(PN_COLS).fill('');
      partRow[PN.PART_ID        - 1] = partId;
      partRow[PN.PART_DESC      - 1] = partDesc;
      partRow[PN.TICKET_NO      - 1] = ticketNo;
      partRow[PN.EQUIP_CODE     - 1] = equipCode;
      partRow[PN.SPECIFIC_EQUIP - 1] = equipDesc;
      partRow[PN.DEPT           - 1] = dept;
      partRow[PN.DATE_REQUESTED - 1] = dateRequested;
      partRow[PN.PARTS_STATUS   - 1] = 'REQUESTED';
      partRow[PN.NOTES          - 1] = notesStr;
      pnSh.appendRow(partRow);

      newParts.push({
        partId:    partId,
        partDesc:  partDesc,
        ticketNo:  ticketNo,
        equipDesc: equipDesc || equipCode,
        dept:      dept
      });
      imported++;
    });

    if (newParts.length > 0) {
      try { _sendPartsNotification_(newParts, syncNow); } catch (emailErr) {
        Logger.log('syncPartsFromExternal_: notification error: ' + emailErr.message);
      }
    }

    Logger.log('syncPartsFromExternal_: imported=' + imported + ' skipped=' + skipped);
    return { success: true, imported: imported, skipped: skipped };

  } catch (e) {
    Logger.log('syncPartsFromExternal_ error: ' + e.message);
    return { success: false, error: e.message, imported: 0, skipped: 0 };
  }
}

// Admin-callable manual trigger (Admin screen "Sync Parts Now" button).
function manualSyncParts() {
  requireAdmin_();
  return syncPartsFromExternal_();
}

// ─── Internal: email notification ────────────────────────────────────────────

function _sendPartsNotification_(newParts, syncNow) {
  var cfg        = getConfig();
  var tz         = Session.getScriptTimeZone();
  var ts         = Utilities.formatDate(syncNow, tz, 'MM/dd/yyyy h:mm a');
  var recipients = String(cfg['System Admins'] || '').split(',')
                     .map(function(e){ return e.trim(); }).filter(Boolean);

  // Add manager emails for depts that have new parts
  var affectedDepts = {};
  newParts.forEach(function(p) { if (p.dept) affectedDepts[p.dept] = true; });
  try {
    var maSh = getBoundSS_().getSheetByName(SH.MANAGER_ACCESS);
    if (maSh && maSh.getLastRow() > 1) {
      maSh.getRange(2, 1, maSh.getLastRow() - 1, 5).getValues().forEach(function(r) {
        var email = String(r[0] || '').trim();
        var dept  = normalizeDept(String(r[3] || '').trim());
        if (email && affectedDepts[dept] && recipients.indexOf(email) < 0) recipients.push(email);
      });
    }
  } catch (e) { /* non-fatal */ }

  if (recipients.length === 0) return;

  var lines = newParts.map(function(p) {
    return '• ' + p.partDesc +
      (p.ticketNo  ? ' [' + p.ticketNo  + ']' : '') +
      (p.equipDesc ? ' — ' + p.equipDesc  : '') +
      (p.dept      ? ' (' + p.dept + ')'  : '');
  }).join('\n');

  var ct      = newParts.length;
  var subject = '[CSC CMMS] ' + ct + ' new part request' + (ct !== 1 ? 's' : '') + ' — ' + ts;
  var body    = ct + ' new part request' + (ct !== 1 ? 's have' : ' has') +
                ' been imported from Edward\'s system:\n\n' + lines +
                '\n\nPlease review in the Parts Needed tab.';

  recipients.forEach(function(email) {
    try { MailApp.sendEmail({ to: email, subject: subject, body: body }); } catch (e) { /* non-fatal */ }
  });
}
