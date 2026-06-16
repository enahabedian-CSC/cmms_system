// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MonitoringViews.gs — CSC CMMS v5.0                                     ║
// ║  Temp Fix Monitor, Equipment Hold Log, Parts Needed — read + update.   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  getTempFixItems
//  Returns rows from 🔧 Temp Fix Monitor, scoped to caller's owned depts.
//  opts.includeCleared — if truthy, include CLEARED rows too.
// ═══════════════════════════════════════════════════════════════════════════════

function getTempFixItems(opts) {
  requireManager_();
  opts = opts || {};
  var user = getCurrentUserInfo();

  try {
    var sh = getBoundSS_().getSheetByName(SH.TEMP_FIX);
    if (!sh || sh.getLastRow() <= HIST_HEADER_ROW) return [];
    var data = sh.getRange(HIST_HEADER_ROW + 1, 1,
      sh.getLastRow() - HIST_HEADER_ROW, TF_COLS).getValues();
    var tz = Session.getScriptTimeZone();

    function fmtDate(v) {
      if (!v) return '';
      if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz, 'MM/dd/yyyy');
      return String(v);
    }

    var items = [];
    data.forEach(function(r) {
      var tempId = String(r[TF.TEMP_ID - 1] || '').trim();
      if (!tempId) return;
      var dept   = String(r[TF.DEPT   - 1] || '').trim();
      if (!user.isAdmin && user.ownedDepts && user.ownedDepts.length > 0) {
        if (user.ownedDepts.indexOf(dept) < 0) return;
      }
      var status = String(r[TF.STATUS - 1] || '').trim().toUpperCase();
      if (!opts.includeCleared && status === 'CLEARED') return;

      items.push({
        tempId:       tempId,
        ticketNo:     String(r[TF.TICKET_NO      - 1] || ''),
        equipCode:    String(r[TF.EQUIP_CODE     - 1] || ''),
        specificEquip:String(r[TF.SPECIFIC_EQUIP - 1] || ''),
        dept:         dept,
        buildingZone: String(r[TF.BUILDING_ZONE  - 1] || ''),
        dateFlagged:  fmtDate(r[TF.DATE_FLAGGED  - 1]),
        description:  String(r[TF.DESCRIPTION    - 1] || ''),
        tempFixDesc:  String(r[TF.TEMP_FIX_DESC  - 1] || ''),
        freqDays:     r[TF.FREQ_DAYS             - 1] || '',
        lastInspected:fmtDate(r[TF.LAST_INSPECTED- 1]),
        nextDue:      fmtDate(r[TF.NEXT_DUE      - 1]),
        status:       status,
        flaggedBy:    String(r[TF.FLAGGED_BY     - 1] || ''),
        clearedBy:    String(r[TF.CLEARED_BY     - 1] || ''),
        clearedDate:  fmtDate(r[TF.CLEARED_DATE  - 1]),
        notes:        String(r[TF.NOTES          - 1] || ''),
        // Temporary Repair Log fields (SQF 2.10)
        reasonTemporary:    String(r[TF.REASON_TEMPORARY    - 1] || ''),
        permFixPlan:        String(r[TF.PERM_FIX_PLAN       - 1] || ''),
        expectedCompletion: fmtDate(r[TF.EXPECTED_COMPLETION - 1]),
        noImprovised:       String(r[TF.NO_IMPROVISED       - 1] || ''),
        productRiskOk:      String(r[TF.PRODUCT_RISK_OK     - 1] || '')
      });
    });
    return items;
  } catch (e) {
    Logger.log('getTempFixItems error: ' + e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  inspectTempFix
//  Records an inspection: updates LAST_INSPECTED, calculates next NEXT_DUE,
//  status stays ACTIVE (or clears PAST DUE → ACTIVE).
// ═══════════════════════════════════════════════════════════════════════════════

function inspectTempFix(data) {
  requireManager_();
  var user = getCurrentUserInfo();
  var now  = new Date();
  var id   = String(data.tempId || '').trim();
  if (!id) return { success: false, error: 'tempId required' };

  try {
    var sh = getBoundSS_().getSheetByName(SH.TEMP_FIX);
    if (!sh) return { success: false, error: 'Temp Fix sheet not found' };
    var row = _findMonitorRow_(sh, id, HIST_HEADER_ROW + 1);
    if (row < 0) return { success: false, error: 'Temp fix not found: ' + id };

    var rowData = sh.getRange(row, 1, 1, TF_COLS).getValues()[0];
    var freq    = parseInt(rowData[TF.FREQ_DAYS  - 1] || '7', 10);
    var ticketNo= String(rowData[TF.TICKET_NO    - 1] || '');
    var dept    = String(rowData[TF.DEPT         - 1] || '');
    var nextDue = new Date(now.getTime() + freq * 24 * 60 * 60 * 1000);

    sh.getRange(row, TF.LAST_INSPECTED).setValue(formatDateStr_(now));
    sh.getRange(row, TF.NEXT_DUE).setValue(formatDateStr_(nextDue));
    sh.getRange(row, TF.STATUS).setValue('ACTIVE');

    if (ticketNo) {
      appendToMasterLog_({
        ticketNo:  ticketNo,
        now:       now,
        action:    ML_ACTIONS.TEMP_FIX_INSPECTED,
        status:    'OPEN',
        dept:      dept,
        updatedBy: data.updatedBy || user.displayName,
        notes:     'Temp fix inspected — next due: ' + formatDateStr_(nextDue) + (data.notes ? ' | ' + data.notes : '')
      });
      appendToTicketHistory_(ticketNo, TH_EVENTS.TEMP_FIX_INSPECT, '', '',
        data.updatedBy || user.displayName,
        'Inspected — next due: ' + formatDateStr_(nextDue));
    }

    return { success: true, tempId: id };
  } catch (e) {
    Logger.log('inspectTempFix error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  clearTempFix
//  Marks a temp fix as CLEARED. Does not close the parent ticket.
// ═══════════════════════════════════════════════════════════════════════════════

function clearTempFix(data) {
  requireManager_();
  var user = getCurrentUserInfo();
  var now  = new Date();
  var id   = String(data.tempId || '').trim();
  if (!id) return { success: false, error: 'tempId required' };

  try {
    var sh = getBoundSS_().getSheetByName(SH.TEMP_FIX);
    if (!sh) return { success: false, error: 'Temp Fix sheet not found' };
    var row = _findMonitorRow_(sh, id, HIST_HEADER_ROW + 1);
    if (row < 0) return { success: false, error: 'Temp fix not found: ' + id };

    var rowData  = sh.getRange(row, 1, 1, TF_COLS).getValues()[0];
    var ticketNo = String(rowData[TF.TICKET_NO - 1] || '');
    var dept     = String(rowData[TF.DEPT      - 1] || '');

    sh.getRange(row, TF.STATUS).setValue('CLEARED');
    sh.getRange(row, TF.CLEARED_BY).setValue(data.clearedBy || user.displayName);
    sh.getRange(row, TF.CLEARED_DATE).setValue(formatDateStr_(now));

    if (ticketNo) {
      appendToMasterLog_({
        ticketNo:  ticketNo,
        now:       now,
        action:    ML_ACTIONS.MANAGER_ACTION + ' — TEMP FIX CLEARED',
        status:    'OPEN',
        dept:      dept,
        updatedBy: data.clearedBy || user.displayName,
        notes:     data.notes || ''
      });
      appendToTicketHistory_(ticketNo, TH_EVENTS.TEMP_FIX_CLEARED, '', '',
        data.clearedBy || user.displayName, data.notes || '');
    }

    return { success: true, tempId: id };
  } catch (e) {
    Logger.log('clearTempFix error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  getEquipHoldItems
//  Returns rows from 🏷️ Equipment Hold Log, scoped to caller's depts.
// ═══════════════════════════════════════════════════════════════════════════════

function getEquipHoldItems(opts) {
  requireManager_();
  opts = opts || {};
  var user = getCurrentUserInfo();

  try {
    var sh = getBoundSS_().getSheetByName(SH.EQUIP_HOLD_LOG);
    if (!sh || sh.getLastRow() <= HIST_HEADER_ROW) return [];
    var data = sh.getRange(HIST_HEADER_ROW + 1, 1,
      sh.getLastRow() - HIST_HEADER_ROW, EHL_COLS).getValues();
    var tz = Session.getScriptTimeZone();

    function fmtDate(v) {
      if (!v) return '';
      if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz, 'MM/dd/yyyy');
      return String(v);
    }

    var items = [];
    data.forEach(function(r) {
      var tagId = String(r[EHL.TAG_ID - 1] || '').trim();
      if (!tagId) return;
      var dept   = String(r[EHL.DEPT  - 1] || '').trim();
      if (!user.isAdmin && user.ownedDepts && user.ownedDepts.length > 0) {
        if (user.ownedDepts.indexOf(dept) < 0) return;
      }
      var status = String(r[EHL.EQUIP_STATUS - 1] || '').trim().toUpperCase();
      if (!opts.includeCleared && status === 'CLEARED') return;

      items.push({
        tagId:        tagId,
        ticketNo:     String(r[EHL.TICKET_NO      - 1] || ''),
        equipCode:    String(r[EHL.EQUIP_CODE     - 1] || ''),
        specificEquip:String(r[EHL.SPECIFIC_EQUIP - 1] || ''),
        dept:         dept,
        buildingZone: String(r[EHL.BUILDING_ZONE  - 1] || ''),
        tagType:      String(r[EHL.TAG_TYPE       - 1] || ''),
        dateTagged:   fmtDate(r[EHL.DATE_TAGGED   - 1]),
        taggedBy:     String(r[EHL.TAGGED_BY      - 1] || ''),
        reason:       String(r[EHL.REASON         - 1] || ''),
        equipStatus:  status,
        clearedBy:    String(r[EHL.CLEARED_BY     - 1] || ''),
        clearedDate:  fmtDate(r[EHL.CLEARED_DATE  - 1]),
        notes:        String(r[EHL.NOTES          - 1] || '')
      });
    });
    return items;
  } catch (e) {
    Logger.log('getEquipHoldItems error: ' + e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  issueEquipHoldTag
//  Issues a new equipment hold tag, writes a row to 🏷️ Equipment Hold Log,
//  updates ML EQUIP_TAG_STATUS, and appends Ticket History.
//  Params: ticketNo, equipCode, specificEquip, dept, buildingZone,
//          tagType ('Red — Out of Service' | 'Yellow — Use with Caution' | 'Orange — Temp Fix'),
//          reason, taggedBy
// ═══════════════════════════════════════════════════════════════════════════════

function issueEquipHoldTag(data) {
  requireManager_();
  var user = getCurrentUserInfo();
  var now  = new Date();
  data = data || {};

  var ticketNo = String(data.ticketNo || '').trim();
  var tagType  = String(data.tagType  || '').trim();
  if (!ticketNo) return { success: false, error: 'ticketNo required' };
  if (!tagType)  return { success: false, error: 'tagType required' };

  try {
    var ss = getBoundSS_();
    var sh = ss.getSheetByName(SH.EQUIP_HOLD_LOG);
    if (!sh) return { success: false, error: 'Equipment Hold Log sheet not found. Run Setup.' };

    var tagId = 'TAG-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
    var dept  = normalizeDept(String(data.dept || ''));

    var row = new Array(EHL_COLS).fill('');
    row[EHL.TAG_ID        - 1] = tagId;
    row[EHL.TICKET_NO     - 1] = ticketNo;
    row[EHL.EQUIP_CODE    - 1] = String(data.equipCode    || '');
    row[EHL.SPECIFIC_EQUIP- 1] = String(data.specificEquip|| '');
    row[EHL.DEPT          - 1] = dept;
    row[EHL.BUILDING_ZONE - 1] = String(data.buildingZone || '');
    row[EHL.TAG_TYPE      - 1] = tagType;
    row[EHL.DATE_TAGGED   - 1] = formatDateStr_(now);
    row[EHL.TAGGED_BY     - 1] = data.taggedBy || user.displayName;
    row[EHL.REASON        - 1] = String(data.reason || '');
    row[EHL.EQUIP_STATUS  - 1] = 'TAGGED';
    row[EHL.CLEARED_BY    - 1] = '';
    row[EHL.CLEARED_DATE  - 1] = '';
    row[EHL.NOTES         - 1] = String(data.notes || '');

    sh.appendRow(row);

    appendToMasterLog_({
      ticketNo:      ticketNo,
      now:           now,
      action:        ML_ACTIONS.EQUIP_TAGGED,
      status:        '',
      dept:          dept,
      equipCode:     String(data.equipCode    || ''),
      specificEquip: String(data.specificEquip|| ''),
      updatedBy:     data.taggedBy || user.displayName,
      notes:         tagType + (data.reason ? ' — ' + data.reason : '')
    });

    appendToTicketHistory_(ticketNo, TH_EVENTS.TAGGED, '', '',
      data.taggedBy || user.displayName,
      tagType + (data.reason ? ' — ' + data.reason : ''));

    // Update EQUIP_TAG_STATUS in Master Log latest row (best effort).
    try {
      _updateTicketInSheets_(ss, ticketNo, { equipTagStatus: tagType }, now);
    } catch (e2) {
      Logger.log('issueEquipHoldTag/_updateTicketInSheets_ warn: ' + e2.message);
    }

    return { success: true, tagId: tagId };
  } catch (e) {
    Logger.log('issueEquipHoldTag error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  clearEquipTag
//  Clears an equipment hold tag (sets EQUIP_STATUS = CLEARED).
// ═══════════════════════════════════════════════════════════════════════════════

function clearEquipTag(data) {
  requireManager_();
  var user = getCurrentUserInfo();
  var now  = new Date();
  var id   = String(data.tagId || '').trim();
  if (!id) return { success: false, error: 'tagId required' };

  try {
    var sh = getBoundSS_().getSheetByName(SH.EQUIP_HOLD_LOG);
    if (!sh) return { success: false, error: 'Equipment Hold Log not found' };
    var row = _findMonitorRow_(sh, id, HIST_HEADER_ROW + 1);
    if (row < 0) return { success: false, error: 'Tag not found: ' + id };

    var rowData  = sh.getRange(row, 1, 1, EHL_COLS).getValues()[0];
    var ticketNo = String(rowData[EHL.TICKET_NO - 1] || '');
    var dept     = String(rowData[EHL.DEPT      - 1] || '');

    sh.getRange(row, EHL.EQUIP_STATUS).setValue('CLEARED');
    sh.getRange(row, EHL.CLEARED_BY).setValue(data.clearedBy || user.displayName);
    sh.getRange(row, EHL.CLEARED_DATE).setValue(formatDateStr_(now));

    if (ticketNo) {
      appendToMasterLog_({
        ticketNo:      ticketNo,
        now:           now,
        action:        ML_ACTIONS.EQUIP_CLEARED,
        status:        'OPEN',
        dept:          dept,
        equipCode:     String(rowData[EHL.EQUIP_CODE     - 1] || ''),
        specificEquip: String(rowData[EHL.SPECIFIC_EQUIP - 1] || ''),
        updatedBy:     data.clearedBy || user.displayName,
        notes:         data.notes || ''
      });
      appendToTicketHistory_(ticketNo, TH_EVENTS.TAG_CLEARED, '', '',
        data.clearedBy || user.displayName, data.notes || '');
    }

    return { success: true, tagId: id };
  } catch (e) {
    Logger.log('clearEquipTag error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  getPartsItems
//  Returns rows from 🔩 Parts Needed, scoped to caller's depts.
// ═══════════════════════════════════════════════════════════════════════════════

function getPartsItems(opts) {
  requireRole_(ROLES.TECH);
  opts = opts || {};
  var user = getCurrentUserInfo();

  try {
    var sh = getBoundSS_().getSheetByName(SH.PARTS_NEEDED);
    if (!sh || sh.getLastRow() <= HIST_HEADER_ROW) return [];
    var data = sh.getRange(HIST_HEADER_ROW + 1, 1,
      sh.getLastRow() - HIST_HEADER_ROW, PN_COLS).getValues();
    var tz = Session.getScriptTimeZone();

    function fmtDate(v) {
      if (!v) return '';
      if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz, 'MM/dd/yyyy');
      return String(v);
    }

    var items = [];
    data.forEach(function(r) {
      var partId = String(r[PN.PART_ID - 1] || '').trim();
      if (!partId) return;
      var dept = String(r[PN.DEPT - 1] || '').trim();
      if (!user.isAdmin && user.isManager && user.ownedDepts && user.ownedDepts.length > 0) {
        if (user.ownedDepts.indexOf(dept) < 0) return;
      }
      var status = String(r[PN.PARTS_STATUS - 1] || '').trim().toUpperCase();
      if (opts.statusFilter && status !== opts.statusFilter.toUpperCase()) return;

      items.push({
        partId:       partId,
        partDesc:     String(r[PN.PART_DESC      - 1] || ''),
        ticketNo:     String(r[PN.TICKET_NO      - 1] || ''),
        equipCode:    String(r[PN.EQUIP_CODE     - 1] || ''),
        specificEquip:String(r[PN.SPECIFIC_EQUIP - 1] || ''),
        dept:         dept,
        dateRequested:fmtDate(r[PN.DATE_REQUESTED- 1]),
        partsStatus:  status,
        dateOrdered:  fmtDate(r[PN.DATE_ORDERED  - 1]),
        dateReceived: fmtDate(r[PN.DATE_RECEIVED - 1]),
        orderedBy:    String(r[PN.ORDERED_BY     - 1] || ''),
        notes:        String(r[PN.NOTES          - 1] || '')
      });
    });
    return items;
  } catch (e) {
    Logger.log('getPartsItems error: ' + e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  updatePartsStatus
//  Updates a part's status (PENDING → ORDERED → RECEIVED / CANCELLED).
//  Dual-writes to Master Log + Ticket History.
// ═══════════════════════════════════════════════════════════════════════════════

function updatePartsStatus(data) {
  requireManager_();
  var user    = getCurrentUserInfo();
  var now     = new Date();
  var partId  = String(data.partId  || '').trim();
  var newStat = String(data.status  || '').trim().toUpperCase();
  if (!partId)   return { success: false, error: 'partId required' };
  if (!newStat)  return { success: false, error: 'status required' };

  try {
    var sh = getBoundSS_().getSheetByName(SH.PARTS_NEEDED);
    if (!sh) return { success: false, error: 'Parts Needed sheet not found' };
    var row = _findMonitorRow_(sh, partId, HIST_HEADER_ROW + 1);
    if (row < 0) return { success: false, error: 'Part not found: ' + partId };

    var rowData  = sh.getRange(row, 1, 1, PN_COLS).getValues()[0];
    var ticketNo = String(rowData[PN.TICKET_NO - 1] || '');
    var dept     = String(rowData[PN.DEPT      - 1] || '');

    sh.getRange(row, PN.PARTS_STATUS).setValue(newStat);
    if (newStat === 'ORDERED')   sh.getRange(row, PN.DATE_ORDERED).setValue(formatDateStr_(now));
    if (newStat === 'RECEIVED')  sh.getRange(row, PN.DATE_RECEIVED).setValue(formatDateStr_(now));

    if (ticketNo) {
      appendToMasterLog_({
        ticketNo:    ticketNo,
        now:         now,
        action:      ML_ACTIONS.PARTS_STATUS_UPDATED,
        status:      'OPEN',
        dept:        dept,
        partsStatus: newStat,
        updatedBy:   data.updatedBy || user.displayName,
        notes:       'Part ' + partId + ' → ' + newStat + (data.notes ? ' | ' + data.notes : '')
      });
      appendToTicketHistory_(ticketNo, TH_EVENTS.PARTS_UPDATED, '', '',
        data.updatedBy || user.displayName,
        'Part ' + String(rowData[PN.PART_DESC - 1] || partId) + ' status → ' + newStat);
    }

    return { success: true, partId: partId, status: newStat };
  } catch (e) {
    Logger.log('updatePartsStatus error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ─── Private helper ───────────────────────────────────────────────────────────

// Scans column 1 of a monitor sheet (TF, EHL, PN) for a given ID.
// Returns 1-based sheet row or -1 if not found.
function _findMonitorRow_(sh, id, startRow) {
  if (!sh || sh.getLastRow() < startRow) return -1;
  var numRows = sh.getLastRow() - startRow + 1;
  var vals = sh.getRange(startRow, 1, numRows, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === id) return startRow + i;
  }
  return -1;
}
