// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EMRL.gs — CSC CMMS v5.0 (Round 7 — CS_ layout)                        ║
// ║  SQF 13.2.8 Equipment Maintenance Repair Log                            ║
// ║  Closed Tickets tab now uses the 29-col CS_ layout (see Config.gs CS).  ║
// ║  Legacy EMRL_LEGACY constants are preserved in Config.gs for migration. ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  getEMRLData
//  Returns Closed Tickets records filtered by date range, dept, equip type,
//  or ticket number.  Reads the CS_ layout (col 1 = ROW_MARKER, 29 cols total).
//  Params:
//    ticketNo  (string, optional) — exact ticket number filter
//    dept      (string, optional) — dept substring match
//    equipType (string, optional) — equipment type substring match
//    dateFrom  (string, optional) — 'YYYY-MM-DD' inclusive start (Repair Date)
//    dateTo    (string, optional) — 'YYYY-MM-DD' inclusive end   (Repair Date)
//    limit     (number, optional) — max rows returned (default 200)
// ═══════════════════════════════════════════════════════════════════════════════

function getEMRLData(params) {
  var user = getCurrentUserInfo();
  if (user.role === ROLES.NOACCESS) throw new Error('UNAUTHORIZED');

  params = params || {};
  var filterTicket = String(params.ticketNo  || '').trim().toUpperCase();
  var filterDept   = String(params.dept      || '').trim().toUpperCase();
  var filterEquip  = String(params.equipType || '').trim().toUpperCase();
  var filterFrom   = params.dateFrom ? new Date(params.dateFrom) : null;
  var filterTo     = params.dateTo   ? new Date(params.dateTo)   : null;
  if (filterTo) filterTo.setHours(23, 59, 59, 999);
  var limit = Math.min(parseInt(params.limit || '200', 10), 500);

  var ss  = getBoundSS_();
  var sh  = ss.getSheetByName(SH.CLOSED);
  if (!sh || sh.getLastRow() <= QUEUE_FROZEN) return { records: [] };

  var startRow = QUEUE_FROZEN + 1;
  var numRows  = sh.getLastRow() - QUEUE_FROZEN;
  // CS_ rows start at col 1 — read all 29 columns.
  var raw = sh.getRange(startRow, 1, numRows, CS_COLS).getValues();

  var records = [];
  for (var i = 0; i < raw.length && records.length < limit; i++) {
    var r = raw[i];
    var ticketNo = String(r[CS.TICKET_NO - 1] || '').trim();
    if (!ticketNo) continue;

    var dept      = String(r[CS.DEPT       - 1] || '').trim();
    var equipType = String(r[CS.EQUIP_TYPE - 1] || '').trim();
    var repairDateRaw = r[CS.REPAIR_DATE - 1];
    var repairDate    = repairDateRaw ? new Date(repairDateRaw) : null;

    if (filterTicket && ticketNo.toUpperCase().indexOf(filterTicket) === -1) continue;
    if (filterDept   && dept.toUpperCase().indexOf(filterDept)        === -1) continue;
    if (filterEquip  && equipType.toUpperCase().indexOf(filterEquip)  === -1) continue;
    if (filterFrom   && repairDate && repairDate < filterFrom) continue;
    if (filterTo     && repairDate && repairDate > filterTo)   continue;

    records.push({
      ticketNo:       ticketNo,
      status:         String(r[CS.STATUS        - 1] || ''),
      priority:       String(r[CS.PRIORITY      - 1] || ''),
      dept:           dept,
      buildingZone:   String(r[CS.BUILDING_ZONE - 1] || ''),
      equipType:      equipType,
      equipCode:      String(r[CS.EQUIP_CODE    - 1] || ''),
      specificEquip:  String(r[CS.SPECIFIC_EQUIP- 1] || ''),
      downtimeType:   String(r[CS.DOWNTIME_TYPE - 1] || ''),
      addedBy:        String(r[CS.ADDED_BY      - 1] || ''),
      dateOpened:     r[CS.DATE_OPENED   - 1] ? formatDateStr_(new Date(r[CS.DATE_OPENED - 1])) : '',
      problemType:    String(r[CS.PROBLEM_TYPE  - 1] || ''),
      description:    String(r[CS.DESCRIPTION   - 1] || ''),
      lineNo:         String(r[CS.LINE_NO        - 1] || ''),
      estHours:       r[CS.EST_HOURS    - 1] || '',
      actualHours:    r[CS.ACTUAL_HOURS - 1] || '',
      repairComplete: String(r[CS.REPAIR_COMPLETE- 1] || ''),
      completedBy:    String(r[CS.COMPLETED_BY  - 1] || ''),
      repairDate:     repairDate ? formatDateStr_(repairDate) : '',
      partsUsed:      String(r[CS.PARTS_USED    - 1] || ''),
      correctiveAct:  String(r[CS.CORRECTIVE    - 1] || ''),
      capaRequired:   String(r[CS.CAPA_REQ      - 1] || ''),
      rootCause:      String(r[CS.ROOT_CAUSE    - 1] || ''),
      preventiveAct:  String(r[CS.PREVENTIVE    - 1] || ''),
      checklist:      String(r[CS.CHECKLIST     - 1] || ''),
      verifiedBy:     String(r[CS.VERIFIED_BY   - 1] || ''),
      verifiedDate:   r[CS.VERIFIED_DATE - 1] ? formatDateStr_(new Date(r[CS.VERIFIED_DATE - 1])) : '',
      notes:          String(r[CS.NOTES         - 1] || '')
    });
  }

  return { records: records };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  updateEmrlRecord
//  Allows a manager to update post-close fields on a CS_ closed row.
//  Editable fields: correctiveAct, capaRequired, rootCause, preventiveAct,
//                   checklist, verifiedBy, verifiedDate.
//  Params: ticketNo, correctiveAct, capaRequired, rootCause, preventiveAct,
//          checklist, verifiedBy, verifiedDate, updatedBy
// ═══════════════════════════════════════════════════════════════════════════════

function updateEmrlRecord(params) {
  var user = getCurrentUserInfo();
  if (user.role !== ROLES.MANAGER && user.role !== ROLES.ADMIN) throw new Error('UNAUTHORIZED');

  params = params || {};
  var tn = String(params.ticketNo || '').trim();
  if (!tn) return { success: false, error: 'ticketNo required' };

  var ss = getBoundSS_();
  var sh = ss.getSheetByName(SH.CLOSED);
  if (!sh || sh.getLastRow() <= QUEUE_FROZEN) {
    return { success: false, error: 'Closed Tickets sheet not found' };
  }

  // Find the row — scan CS.TICKET_NO (col 2) for the ticket number.
  var startRow  = QUEUE_FROZEN + 1;
  var numRows   = sh.getLastRow() - QUEUE_FROZEN;
  var ticketCol = sh.getRange(startRow, CS.TICKET_NO, numRows, 1).getValues();

  var targetRow = -1;
  for (var i = 0; i < ticketCol.length; i++) {
    if (String(ticketCol[i][0] || '').trim() === tn) {
      targetRow = startRow + i;
      break;
    }
  }
  if (targetRow === -1) {
    return { success: false, error: 'Ticket not found in Closed Tickets: ' + tn };
  }

  // CS_ editable block: cols CORRECTIVE(22) through VERIFIED_DATE(28) — 7 contiguous cols.
  var block = [[
    params.correctiveAct || '',
    params.capaRequired  || '',
    params.rootCause     || '',
    params.preventiveAct || '',
    params.checklist     || '',
    params.verifiedBy    || '',
    params.verifiedDate  || ''
  ]];
  sh.getRange(targetRow, CS.CORRECTIVE, 1, 7).setValues(block);

  appendToMasterLog_({
    ticketNo:   tn,
    now:        new Date(),
    action:     ML_ACTIONS.CLOSED_EDIT,
    status:     'CLOSED',
    updatedBy:  params.updatedBy || user.displayName
  });
  appendToTicketHistory_(tn, TH_EVENTS.UPDATED, 'CLOSED', 'CLOSED',
    params.updatedBy || user.displayName, 'Closed record updated');

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  setupClosedHeaders_
//  One-time setup: writes CS_ column headers to the ✅ Closed Tickets sheet.
//  Safe to re-run — writes only when header row col 1 is blank or still old.
//  Called from Setup.gs onInstall or run manually after migration.
// ═══════════════════════════════════════════════════════════════════════════════

function setupClosedHeaders_() {
  var ss = getBoundSS_();
  var sh = ss.getSheetByName(SH.CLOSED);
  if (!sh) { Logger.log('setupClosedHeaders_: Closed Tickets sheet not found'); return; }

  var headerRow = QUEUE_FROZEN;
  var existing  = sh.getRange(headerRow, 1, 1, CS_COLS).getValues()[0];

  // Skip if already written with the new CS_ first header ('#').
  if (String(existing[0] || '').trim() === '#') {
    Logger.log('setupClosedHeaders_: CS_ headers already present — skipping');
    return;
  }
  sh.getRange(headerRow, 1, 1, CS_COLS).setValues([CS_HEADERS]);
  Logger.log('setupClosedHeaders_: wrote CS_ headers to Closed Tickets cols 1–' + CS_COLS);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  migrateClosedTab_
//  One-time data migration: converts existing legacy EMRL rows (37-col layout
//  starting at TK_DATA_COL) to the new CS_ 29-col layout (starting at col 1).
//  Reads using EMRL_LEGACY offsets, writes using CS_ offsets.
//  Safe to call multiple times — skips rows already in CS_ format (detected by
//  checking whether col 1 / col 2 holds a row number vs a ticket number).
//  Returns: { migrated: N, skipped: N }
// ═══════════════════════════════════════════════════════════════════════════════

function migrateClosedTab_() {
  var ss = getBoundSS_();
  var sh = ss.getSheetByName(SH.CLOSED);
  if (!sh || sh.getLastRow() <= QUEUE_FROZEN) {
    Logger.log('migrateClosedTab_: nothing to migrate');
    return { migrated: 0, skipped: 0 };
  }

  var startRow = QUEUE_FROZEN + 1;
  var numRows  = sh.getLastRow() - QUEUE_FROZEN;
  // Read enough columns to cover both old (37) and new (29) layouts.
  var readCols = Math.max(37, CS_COLS);
  var raw = sh.getRange(startRow, 1, numRows, readCols).getValues();

  var migrated = 0;
  var skipped  = 0;

  for (var i = 0; i < raw.length; i++) {
    var r      = raw[i];
    var sheetRow = startRow + i;

    // Detection: old layout has ticket number at col TK_DATA_COL (index 1).
    // New CS_ layout has '#' (row number integer) at col 1 (index 0) and ticket
    // number at col 2 (index 1).  A numeric value at index 0 = already migrated.
    var col1val = r[0];
    var col2val = String(r[1] || '').trim();
    if (typeof col1val === 'number' && col1val > 0 && col2val.indexOf('-') !== -1) {
      // Already in CS_ format (row marker = number, col 2 = ticket no with dash).
      skipped++;
      continue;
    }

    // Old format: ticket number is at index TK_DATA_COL - 1 = 1.
    var ticketNo = String(r[TK_DATA_COL - 1 + TK.TICKET_NO - 1] || '').trim();
    if (!ticketNo) { skipped++; continue; }

    // Helper to read a TK field from the raw old-format row.
    // TK fields start at index TK_DATA_COL - 1 = 1.
    var tkOffset = TK_DATA_COL - 1;

    var csRow = new Array(CS_COLS).fill('');
    csRow[CS.ROW_MARKER    - 1] = i + 1;  // sequential number
    csRow[CS.TICKET_NO     - 1] = ticketNo;
    csRow[CS.STATUS        - 1] = String(r[tkOffset + TK.STATUS        - 1] || 'CLOSED');
    csRow[CS.PRIORITY      - 1] = String(r[tkOffset + TK.PRIORITY      - 1] || '');
    csRow[CS.DEPT          - 1] = String(r[tkOffset + TK.DEPT          - 1] || '');
    csRow[CS.BUILDING_ZONE - 1] = String(r[tkOffset + TK.BUILDING_ZONE - 1] || '');
    csRow[CS.EQUIP_TYPE    - 1] = String(r[tkOffset + TK.EQUIP_TYPE    - 1] || '');
    csRow[CS.EQUIP_CODE    - 1] = String(r[tkOffset + TK.EQUIP_CODE    - 1] || '');
    csRow[CS.SPECIFIC_EQUIP- 1] = String(r[tkOffset + TK.SPECIFIC_EQUIP- 1] || '');
    csRow[CS.DOWNTIME_TYPE - 1] = String(r[tkOffset + TK.DOWNTIME_TYPE - 1] || '');
    csRow[CS.ADDED_BY      - 1] = String(r[tkOffset + TK.ADDED_BY      - 1] || '');
    csRow[CS.DATE_OPENED   - 1] = r[tkOffset + TK.DATE_OPENED - 1] || '';
    csRow[CS.PROBLEM_TYPE  - 1] = String(r[tkOffset + TK.PROBLEM_TYPE  - 1] || '');
    csRow[CS.DESCRIPTION   - 1] = String(r[tkOffset + TK.DESCRIPTION   - 1] || '');
    csRow[CS.LINE_NO       - 1] = String(r[tkOffset + TK.LINE_NO       - 1] || '');
    csRow[CS.EST_HOURS     - 1] = r[tkOffset + TK.EST_HOURS    - 1] || '';
    csRow[CS.ACTUAL_HOURS  - 1] = r[tkOffset + TK.ACTUAL_HOURS - 1] || '';
    csRow[CS.REPAIR_COMPLETE-1] = 'Y';
    csRow[CS.COMPLETED_BY  - 1] = String(r[tkOffset + TK.UPDATED_BY - 1] || '');
    // EMRL_LEGACY fields (absolute col, so index = col - 1)
    csRow[CS.REPAIR_DATE   - 1] = r[EMRL_LEGACY.REPAIR_DATE    - 1] || '';
    csRow[CS.PARTS_USED    - 1] = String(r[EMRL_LEGACY.PARTS_USED    - 1] || '');
    csRow[CS.CORRECTIVE    - 1] = String(r[EMRL_LEGACY.CORRECTIVE_ACT- 1] || '');
    csRow[CS.CAPA_REQ      - 1] = String(r[EMRL_LEGACY.CAPA_REQUIRED  - 1] || '');
    csRow[CS.ROOT_CAUSE    - 1] = String(r[EMRL_LEGACY.ROOT_CAUSE     - 1] || '');
    csRow[CS.PREVENTIVE    - 1] = String(r[EMRL_LEGACY.PREVENTIVE_ACT - 1] || '');
    csRow[CS.CHECKLIST     - 1] = String(r[EMRL_LEGACY.CLEARANCE_CHK  - 1] || '');
    csRow[CS.VERIFIED_BY   - 1] = String(r[tkOffset + TK.VERIFIED_BY  - 1] || '');
    csRow[CS.VERIFIED_DATE - 1] = r[tkOffset + TK.VERIFIED_DATE - 1] || '';
    csRow[CS.NOTES         - 1] = String(r[tkOffset + TK.NOTES        - 1] || '');

    // Write the new CS_ row (cols 1–29) and blank cols 30–37 (old EMRL tail).
    sh.getRange(sheetRow, 1, 1, CS_COLS).setValues([csRow]);
    if (readCols > CS_COLS) {
      var blankTail = new Array(readCols - CS_COLS).fill('');
      sh.getRange(sheetRow, CS_COLS + 1, 1, readCols - CS_COLS).setValues([blankTail]);
    }
    migrated++;
  }

  Logger.log('migrateClosedTab_: migrated=' + migrated + ' skipped=' + skipped);
  return { migrated: migrated, skipped: skipped };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  runMigrateClosedTab  (public trigger — run once manually after deploy)
//  Updates headers first, then migrates data rows.
// ═══════════════════════════════════════════════════════════════════════════════

function runMigrateClosedTab() {
  setupClosedHeaders_();
  var result = migrateClosedTab_();
  Logger.log('runMigrateClosedTab complete: ' + JSON.stringify(result));
  return result;
}
