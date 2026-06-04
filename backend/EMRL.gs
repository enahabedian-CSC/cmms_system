// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EMRL.gs — CSC CMMS v5.0                                                ║
// ║  SQF 13.2.8 Equipment Maintenance Repair Log                            ║
// ║  Provides search/retrieval for the 10 EMRL columns appended to          ║
// ║  ✅ Closed Tickets (cols 28–37) on every ticket close.                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  getEMRLData
//  Returns EMRL records filtered by date range, dept, equip type, or ticket #.
//  Caller: EMRL search panel in reports page.
//  Params:
//    ticketNo  (string, optional) — exact ticket number filter
//    dept      (string, optional) — dept substring match
//    equipType (string, optional) — equipment type substring match
//    dateFrom  (string, optional) — 'YYYY-MM-DD' inclusive start
//    dateTo    (string, optional) — 'YYYY-MM-DD' inclusive end
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

  var ss      = getBoundSS_();
  var sh      = ss.getSheetByName(SH.CLOSED);
  if (!sh || sh.getLastRow() <= QUEUE_FROZEN) return { records: [] };

  var startRow = QUEUE_FROZEN + 1;
  var numRows  = sh.getLastRow() - QUEUE_FROZEN;
  // Read TK columns (from TK_DATA_COL) + EMRL columns (10 more) in one call.
  var totalCols = TK_COLS + EMRL_COLS;
  var raw = sh.getRange(startRow, TK_DATA_COL, numRows, totalCols).getValues();

  var records = [];
  for (var i = 0; i < raw.length && records.length < limit; i++) {
    var r = raw[i];
    var ticketNo  = String(r[TK.TICKET_NO  - 1] || '').trim();
    if (!ticketNo) continue;

    var dept      = String(r[TK.DEPT       - 1] || '').trim();
    var equipType = String(r[TK.EQUIP_TYPE - 1] || '').trim();
    var repairDateRaw = r[EMRL.REPAIR_DATE - TK_DATA_COL];
    var repairDate = repairDateRaw ? new Date(repairDateRaw) : null;

    if (filterTicket && ticketNo.toUpperCase().indexOf(filterTicket) === -1) continue;
    if (filterDept   && dept.toUpperCase().indexOf(filterDept)        === -1) continue;
    if (filterEquip  && equipType.toUpperCase().indexOf(filterEquip)  === -1) continue;
    if (filterFrom   && repairDate && repairDate < filterFrom) continue;
    if (filterTo     && repairDate && repairDate > filterTo)   continue;

    records.push({
      ticketNo:       ticketNo,
      dept:           dept,
      buildingZone:   String(r[TK.BUILDING_ZONE  - 1] || ''),
      equipType:      equipType,
      equipCode:      String(r[TK.EQUIP_CODE     - 1] || ''),
      specificEquip:  String(r[TK.SPECIFIC_EQUIP - 1] || ''),
      description:    String(r[TK.DESCRIPTION    - 1] || ''),
      assignedTo:     String(r[TK.ASSIGNED_TO    - 1] || ''),
      verifiedBy:     String(r[TK.VERIFIED_BY    - 1] || ''),
      verifiedDate:   r[TK.VERIFIED_DATE - 1] ? formatDateStr_(new Date(r[TK.VERIFIED_DATE - 1])) : '',
      actualHours:    r[TK.ACTUAL_HOURS  - 1] || '',
      // EMRL fields (offset from start of raw row = TK_COLS + emrl_1based - 1)
      repairDate:     repairDate ? formatDateStr_(repairDate) : '',
      partsUsed:      String(r[EMRL.PARTS_USED      - TK_DATA_COL] || ''),
      rootCause:      String(r[EMRL.ROOT_CAUSE      - TK_DATA_COL] || ''),
      correctiveAct:  String(r[EMRL.CORRECTIVE_ACT  - TK_DATA_COL] || ''),
      preventiveAct:  String(r[EMRL.PREVENTIVE_ACT  - TK_DATA_COL] || ''),
      caDate:         String(r[EMRL.CA_DATE          - TK_DATA_COL] || ''),
      capaRequired:   String(r[EMRL.CAPA_REQUIRED    - TK_DATA_COL] || ''),
      clearanceChk:   String(r[EMRL.CLEARANCE_CHK    - TK_DATA_COL] || ''),
      hadTempFix:     String(r[EMRL.HAD_TEMP_FIX     - TK_DATA_COL] || ''),
      tfResolvedDate: String(r[EMRL.TF_RESOLVED_DATE - TK_DATA_COL] || '')
    });
  }

  return { records: records };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  updateEmrlRecord
//  Allows a manager to fill in preventive action, CA date, clearance checklist,
//  and CAPA required after the ticket has been closed.
//  Params: ticketNo, preventiveAct, caDate, capaRequired, clearanceChk, updatedBy
// ═══════════════════════════════════════════════════════════════════════════════

function updateEmrlRecord(params) {
  var user = getCurrentUserInfo();
  if (user.role !== ROLES.MANAGER && user.role !== ROLES.ADMIN) throw new Error('UNAUTHORIZED');

  params = params || {};
  var tn = String(params.ticketNo || '').trim();
  if (!tn) return { success: false, error: 'ticketNo required' };

  var ss = getBoundSS_();
  var sh = ss.getSheetByName(SH.CLOSED);
  if (!sh || sh.getLastRow() <= QUEUE_FROZEN) return { success: false, error: 'Closed Tickets sheet not found' };

  var startRow = QUEUE_FROZEN + 1;
  var numRows  = sh.getLastRow() - QUEUE_FROZEN;
  var ticketCol = sh.getRange(startRow, TK_DATA_COL + TK.TICKET_NO - 1, numRows, 1).getValues();

  var targetRow = -1;
  for (var i = 0; i < ticketCol.length; i++) {
    if (String(ticketCol[i][0] || '').trim() === tn) {
      targetRow = startRow + i;
      break;
    }
  }
  if (targetRow === -1) return { success: false, error: 'Ticket not found in Closed Tickets: ' + tn };

  // Update only the editable EMRL fields — never overwrite repair date or auto-populated fields.
  var updates = [
    [params.preventiveAct || '', params.caDate || '', params.capaRequired || '',
     params.clearanceChk  || '']
  ];
  sh.getRange(targetRow, EMRL.PREVENTIVE_ACT, 1, 4).setValues(updates);

  appendToTicketHistory_(tn, TH_EVENTS.UPDATED, 'CLOSED', 'CLOSED',
    params.updatedBy || user.displayName, 'EMRL record updated');

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  setupEmrlHeaders_
//  One-time setup: writes EMRL column headers to the ✅ Closed Tickets sheet.
//  Safe to re-run — checks if headers already exist before writing.
//  Call once from Setup.gs onInstall or run manually after deploy.
// ═══════════════════════════════════════════════════════════════════════════════

function setupEmrlHeaders_() {
  var ss = getBoundSS_();
  var sh = ss.getSheetByName(SH.CLOSED);
  if (!sh) { Logger.log('setupEmrlHeaders_: Closed Tickets sheet not found'); return; }

  // Header row is QUEUE_FROZEN (row 6 by default).
  var headerRow = QUEUE_FROZEN;
  var emrlStart = TK_DATA_COL + TK_COLS; // col 28
  var existing  = sh.getRange(headerRow, emrlStart, 1, EMRL_COLS).getValues()[0];

  // Only write if first EMRL header cell is blank (avoid overwriting manual edits).
  if (String(existing[0] || '').trim()) {
    Logger.log('setupEmrlHeaders_: EMRL headers already present — skipping');
    return;
  }
  sh.getRange(headerRow, emrlStart, 1, EMRL_COLS).setValues([EMRL_HEADERS]);
  Logger.log('setupEmrlHeaders_: wrote EMRL headers to Closed Tickets cols 28–37');
}
