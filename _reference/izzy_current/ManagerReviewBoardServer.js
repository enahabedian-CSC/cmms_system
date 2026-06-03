// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MANAGER REVIEW BOARD — SERVER FUNCTIONS  v3.2                        ║
// ║  Container Supply Co. — Garden Grove, CA                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝

function openManagerReviewBoard() {
  var userInfo  = getCurrentUserInfo();
  var isManager = userInfo.isAdmin;
  if (!isManager) {
    (userInfo.authorizedTabs || []).forEach(function(t) {
      if (t.role === 'manager' || t.role === 'admin') isManager = true;
    });
  }
  if (!isManager) {
    SpreadsheetApp.getUi().alert('⚠️ Access Denied',
      'Manager Review Board requires Manager or Admin access.',
      SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  var html = HtmlService.createHtmlOutputFromFile('ManagerReviewBoard')
    .setWidth(2000).setHeight(1900);
  SpreadsheetApp.getUi().showModalDialog(html, '🔵 Manager Review Board');
}

function showTechWorkBoard() {
  var html = HtmlService.createHtmlOutputFromFile('TechWorkBoard')
    .setTitle('👷 Tech Work Board')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setWidth(1200).setHeight(980);
  SpreadsheetApp.getUi().showModalDialog(html, '👷 Maintenance — Tech Work Board');
}

// ═══════════════════════════════════════════════════════════════════════════
//  GET ALL BOARD DATA
//  ITEM 3: adds managers array from getManagerConfig() for Verified By dropdown
// ═══════════════════════════════════════════════════════════════════════════
function getManagerReviewBoardData() {
  try {
    var ss       = SpreadsheetApp.getActiveSpreadsheet();
    var cfg      = getConfig();
    var userInfo = getCurrentUserInfo();
    var lists    = getAllDataLists();
    var deptMapping = getDeptMapping_();

    var systemDepts = {};
    Object.keys(deptMapping).forEach(function(src) {
      systemDepts[deptMapping[src]] = true;
    });

    var waiting = getTicketsForBoard_(['WAITING']);
    var pending = getTicketsForBoard_(['COMPLETE']);
    var open    = getTicketsForBoard_(['OPEN','ON HOLD','PENDING PARTS','IN PROGRESS']);

    var partsNeeded = [], equipmentTags = [], serviceReports = [];
    try { partsNeeded    = getOpenPartsNeeded_();    } catch(e) { Logger.log('partsNeeded error: '+e.message); }
    try { equipmentTags  = getActiveEquipmentTags_(); } catch(e) { Logger.log('equipmentTags error: '+e.message); }
    try { serviceReports = getUnverifiedReports_();   } catch(e) { Logger.log('serviceReports error: '+e.message); }

    // ITEM 3: Build manager list for Verified By dropdown (name or email display)
    var managers = [];
    try {
      getManagerConfig().forEach(function(m) {
        var display = m.managerName || m.managerEmail || '';
        if (display) managers.push(display);
      });
    } catch(e) { Logger.log('manager list error: '+e.message); }

    // ITEM 8A: Transfer reasons
    var transferReasons = getDataList('Transfer Reasons');
    if (!transferReasons || !transferReasons.length) transferReasons = ['Beyond Scope'];

    return {
      userEmail:       userInfo.email || '',
      companyName:     cfg['Company Name']  || 'Container Supply Co.',
      location:        cfg['Location']      || 'Garden Grove, CA',
      currentMonth:    cfg['Current Month'] || getCurrentMonth_(),
      technicians:     lists['Technicians'] || [],
      managers:        managers,             // ITEM 3 — manager-only list for Verified By
      transferReasons: transferReasons,      // ITEM 8A
      deptCodes:       DEPT_CODES,
      deptMapping:     deptMapping,
      systemDepts:     Object.keys(systemDepts).sort(),
      waitingTickets:  waiting,
      pendingVerify:   pending,
      openTickets:     open,
      partsNeeded:     partsNeeded,
      equipmentTags:   equipmentTags,
      serviceReports:  serviceReports,
      closedTickets:   getClosedTicketsForBoard_()
    };
  } catch(e) {
    Logger.log('FATAL ERROR: ' + e.message + ' | Stack: ' + e.stack);
    throw e;
  }
}

function getManagerReviewBoardDataJson() {
  var data = getManagerReviewBoardData();
  return JSON.stringify(data);
}

// ═══════════════════════════════════════════════════════════════════════════
//  GET TICKETS BY STATUS
//  ITEM 1: description always pulled from first non-empty row across all ML rows
// ═══════════════════════════════════════════════════════════════════════════
function getTicketsForBoard_(statuses) {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName(SH.MASTER_LOG);
  if (!sh || sh.getLastRow() < 2) return [];

  var lastCol = Math.min(ML_COLS, sh.getLastColumn());
  var data    = sh.getRange(2, 1, sh.getLastRow()-1, lastCol).getValues();

  var firstRowMap = {}, lastRowMap = {};
  // ITEM 1: also track first non-empty description per ticket
  var firstDescMap = {};

  data.forEach(function(r) {
    var tn = String(r[ML.TICKET_NO-1]||'').trim();
    if (!tn) return;
    if (!firstRowMap[tn]) firstRowMap[tn] = r;
    lastRowMap[tn] = r;
    // Capture first non-empty description across ALL rows for this ticket
    if (!firstDescMap[tn]) {
      var desc = String(r[ML.DESCRIPTION-1]||'').trim();
      if (desc) firstDescMap[tn] = desc;
    }
  });

  var upperStatuses = statuses.map(function(s){ return s.toUpperCase(); });
  var result = [];

Object.keys(lastRowMap).forEach(function(tn) {
  var r  = lastRowMap[tn];
  var r0 = firstRowMap[tn];
  var status = String(r[ML.STATUS-1]||'').toUpperCase().trim();
  if (upperStatuses.indexOf(status) < 0) return;

  function col(idx, row) {
    row = row || r;
    return idx <= lastCol ? String(row[idx-1]||'') : '';
  }
  function eCol(idx) {
    var v = col(idx, r);
    return (v && v.trim()) ? v : col(idx, r0);
  }

  var description = firstDescMap[tn] || eCol(ML.DESCRIPTION);

  // ── DEPT FILTER FIX ──
  // Use getTrackerForDept() so Electrical/Facilities tickets routed by
  // keyword rules get the correct deptGroup, not the raw submitting dept.
  var _dept      = col(ML.DEPT)         || col(ML.DEPT, r0);
  var _probType  = col(ML.PROBLEM_TYPE) || col(ML.PROBLEM_TYPE, r0);
  var _equipType = col(ML.EQUIP_TYPE)   || col(ML.EQUIP_TYPE, r0);
  var _tracker   = getTrackerForDept(_dept, _probType, _equipType);
  var _deptGroup = getTrackerDisplayName(_tracker);
  // ── END FIX ──

  result.push({
    ticketNo:         tn,
    status:           col(ML.STATUS),
    priority:         col(ML.PRIORITY)      || col(ML.PRIORITY, r0),
    dept:             col(ML.DEPT)          || col(ML.DEPT, r0),
    deptGroup:        _deptGroup,            // ← was getDeptGroup_(col(ML.DEPT)||col(ML.DEPT,r0))
    buildingZone:     eCol(ML.BUILDING_ZONE),
    equipType:        eCol(ML.EQUIP_TYPE),
    equipCode:        eCol(ML.EQUIP_CODE),
    specificEquip:    eCol(ML.SPECIFIC_EQUIP),
    downtimeType:     eCol(ML.DOWNTIME_TYPE),
    description:      description,
    assignedTo:       col(ML.ASSIGNED_TO),
    addedBy:          col(ML.ADDED_BY, r0),
    updatedBy:        col(ML.UPDATED_BY),
    dateOpened:       formatDateStr_(r0[ML.DATE_OPENED-1]),
    workSummary:      col(ML.WORK_SUMMARY),
    observations:     col(ML.NOTES),
    rootCause:        col(ML.ROOT_CAUSE),
    correctiveAction: col(ML.CORRECTIVE_ACT),
    fixType:          col(ML.FIX_TYPE),
    actualHours:      r[ML.ACTUAL_HOURS-1]  || '',
    estHours:         r0[ML.EST_HOURS-1]    || '',
    partsNeeded:      eCol(ML.PARTS_NEEDED),
    partsStatus:      col(ML.PARTS_STATUS),
    equipTagStatus:   col(ML.EQUIP_TAG_STATUS),
    verifiedBy:       col(ML.VERIFIED_BY),
    photoLinks:       '',
    line:             '',
    source:           'INTERNAL',
    problemType:      col(ML.PROBLEM_TYPE)  || col(ML.PROBLEM_TYPE, r0)
  });
});

  var pOrder = { CRITICAL:1, HIGH:2, MEDIUM:3, LOW:4 };
  result.sort(function(a,b){
    return (pOrder[a.priority.toUpperCase()]||5)-(pOrder[b.priority.toUpperCase()]||5);
  });

  return result;
}

function getOpenPartsNeeded_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SH.PARTS_NEEDED);
  if (!sh || sh.getLastRow() < 2) return [];
  var data   = sh.getRange(2, 1, sh.getLastRow() - 1, PN_COLS).getValues();
  var result = [];
  data.forEach(function(r, i) {
    var status   = String(r[PN.PARTS_STATUS - 1] || '').toUpperCase().trim();
    if (status === 'RECEIVED') return;
    var partId   = String(r[PN.PART_ID    - 1] || '').trim();
    var partDesc = String(r[PN.PART_DESC  - 1] || '').trim();
    if (!partId && !partDesc) return;
    result.push({
      rowIndex:      i + 2,
      partId:        partId,
      partDesc:      partDesc,
      ticketNo:      String(r[PN.TICKET_NO      - 1] || '').trim(),
      equipCode:     String(r[PN.EQUIP_CODE     - 1] || '').trim(),
      specificEquip: String(r[PN.SPECIFIC_EQUIP - 1] || '').trim(),
      dept:          String(r[PN.DEPT           - 1] || '').trim(),
      dateRequested: formatDateStr_(r[PN.DATE_REQUESTED - 1]),
      status:        String(r[PN.PARTS_STATUS   - 1] || '').trim() || 'Requested',
      qty:           String(r[PN.NOTES - 1] || '').match(/^(\d+)/)?.[1] || '',
      uom:           ''
    });
  });
  return result;
}

function getActiveEquipmentTags_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SH.EQUIP_HOLD_LOG);
  if (!sh || sh.getLastRow() < 2) return [];
  var data   = sh.getRange(2, 1, sh.getLastRow() - 1, EHL_COLS).getValues();
  var result = [];
  data.forEach(function(r) {
    var equipStatus = String(r[EHL.EQUIP_STATUS - 1] || '').toUpperCase().trim();
    if (equipStatus === 'ACTIVE' || equipStatus === 'CLEARED') return;
    result.push({
      tagId:         String(r[EHL.TAG_ID        - 1] || ''),
      ticketNo:      String(r[EHL.TICKET_NO     - 1] || ''),
      equipCode:     String(r[EHL.EQUIP_CODE    - 1] || ''),
      specificEquip: String(r[EHL.SPECIFIC_EQUIP- 1] || ''),
      dept:          String(r[EHL.DEPT          - 1] || ''),
      buildingZone:  String(r[EHL.BUILDING_ZONE - 1] || ''),
      tagType:       String(r[EHL.TAG_TYPE      - 1] || ''),
      dateTagged:    formatDateStr_(r[EHL.DATE_TAGGED - 1]),
      taggedBy:      String(r[EHL.TAGGED_BY     - 1] || ''),
      reason:        String(r[EHL.REASON        - 1] || ''),
      equipTagStatus:String(r[EHL.EQUIP_STATUS  - 1] || ''),
      description:   String(r[EHL.REASON        - 1] || ''),
      dateOpened:    formatDateStr_(r[EHL.DATE_TAGGED - 1]),
      priority:      '',
      source:        'INTERNAL'
    });
  });
  return result;
}

function getUnverifiedReports_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SH.RPT_DB);
  if (!sh || sh.getLastRow() < 2) return [];
  var lastCol = Math.min(RDB_COLS, sh.getLastColumn());
  var data    = sh.getRange(2, 1, sh.getLastRow() - 1, lastCol).getValues();
  var result  = [];
  data.forEach(function(r) {
    var reportId = String(r[RDB.REPORT_ID - 1] || '').trim();
    if (!reportId) return;
    function col(idx) { return idx <= lastCol ? String(r[idx - 1] || '') : ''; }
    result.push({
      reportId:         reportId,
      ticketNo:         col(RDB.TICKET_NO),
      date:             formatDateStr_(r[RDB.DATE - 1]),
      dept:             col(RDB.DEPT),
      equipType:        col(RDB.EQUIP_TYPE),
      specificEquip:    col(RDB.SPECIFIC_EQUIP),
      problemDesc:      col(RDB.PROBLEM_DESC),
      rootCause:        col(RDB.ROOT_CAUSE),
      correctiveAction: col(RDB.CORRECTIVE_ACT),
      preventiveAction: col(RDB.PREVENTIVE_ACT),
      workSummary:      col(RDB.WORK_SUMMARY),
      partsUsed:        col(RDB.PARTS_USED),
      laborHours:       col(RDB.LABOR_HOURS),
      completedBy:      col(RDB.COMPLETED_BY),
      verifiedBy:       col(RDB.VERIFIED_BY),
      verifiedDate:     formatDateStr_(r[RDB.VERIFIED_DATE - 1]),
      notes:            col(RDB.NOTES),
      description:      col(RDB.PROBLEM_DESC),
      dateOpened:       formatDateStr_(r[RDB.DATE - 1]),
      priority:         col(RDB.PRIORITY),
      source:           'INTERNAL'
    });
  });
  return result;
}

function getClosedTicketsForBoard_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SH.CLOSED);
    if (!sh || sh.getLastRow() <= QUEUE_FROZEN) return [];
    var data = sh.getRange(QUEUE_FROZEN + 1, TK_DATA_COL, sh.getLastRow() - QUEUE_FROZEN, TK_COLS).getValues();
    var tickets = [];
    data.forEach(function(r) {
      var ticketNo = String(r[TK.TICKET_NO - 1] || '').trim();
      if (!ticketNo) return;
      tickets.push({
        ticketNo:     ticketNo,
        status:       String(r[TK.STATUS        - 1] || ''),
        dept:         String(r[TK.DEPT          - 1] || ''),
        deptGroup:    getTrackerDisplayName(getTrackerForDept(String(r[TK.DEPT-1]||''), String(r[TK.PROBLEM_TYPE-1]||''), String(r[TK.EQUIP_TYPE-1]||''))),
        equipType:    String(r[TK.EQUIP_TYPE    - 1] || ''),
        equipCode:    String(r[TK.EQUIP_CODE    - 1] || ''),
        specificEquip:String(r[TK.SPECIFIC_EQUIP- 1] || ''),
        description:  String(r[TK.DESCRIPTION   - 1] || ''),
        priority:     String(r[TK.PRIORITY      - 1] || ''),
        assignedTo:   String(r[TK.ASSIGNED_TO   - 1] || ''),
        actualHours:  String(r[TK.ACTUAL_HOURS  - 1] || ''),
        fixType:      String(r[TK.FIX_TYPE      - 1] || ''),
        verifiedBy:   String(r[TK.VERIFIED_BY   - 1] || ''),
        notes:        String(r[TK.NOTES         - 1] || ''),
        dateOpened:   r[TK.DATE_OPENED - 1] instanceof Date
                        ? Utilities.formatDate(r[TK.DATE_OPENED-1], Session.getScriptTimeZone(), 'MM/dd/yyyy')
                        : String(r[TK.DATE_OPENED - 1] || ''),
        addedBy:      String(r[TK.ADDED_BY      - 1] || ''),
        source:       'INTERNAL'
      });
    });
    return tickets;
  } catch(e) {
    Logger.log('getClosedTicketsForBoard_ error: ' + e.message);
    return [];
  }
}



// ═══════════════════════════════════════════════════════════════════════════
//  MANAGER APPROVE TICKET
// ═══════════════════════════════════════════════════════════════════════════
function managerApproveTicket(data) {
  try {
    var ss       = SpreadsheetApp.getActiveSpreadsheet();
    var now      = new Date();
    var userInfo = getCurrentUserInfo();
    var byEmail  = userInfo.email || Session.getActiveUser().getEmail() || 'Manager';

    var newStatus = data.newStatus || 'OPEN';
    var isClosed  = newStatus === 'CLOSED';

    var oldDept = getMasterLogFieldForTicket_(data.ticketNo, ML.DEPT);
    var newDept = data.dept || oldDept;
    var deptChanged = (newDept && newDept !== oldDept);

    var oldTracker = getTrackerForDept(oldDept, data.problemType || '', data.equipType || '');
    var newTracker = deptChanged
      ? getTrackerForDept(newDept, data.problemType || '', data.equipType || '')
      : oldTracker;

    var mlSh = ss.getSheetByName(SH.MASTER_LOG);
    if (!mlSh) throw new Error('Master Log not found');

    var mlRow = new Array(ML_COLS).fill('');
    mlRow[ML.ROW_ID      - 1] = generateRowId();
    mlRow[ML.TICKET_NO   - 1] = data.ticketNo;
    mlRow[ML.TIMESTAMP   - 1] = formatTimestamp_(now);
    mlRow[ML.ACTION      - 1] = 'MANAGER ACTION — ' + newStatus;
    mlRow[ML.STATUS      - 1] = newStatus;
    mlRow[ML.DEPT        - 1] = newDept;
    mlRow[ML.UPDATED_BY  - 1] = byEmail;  // ITEM 6D — actual email, not hardcoded
    mlRow[ML.NOTES       - 1] = data.notes || '';
    mlRow[ML.TRACKER_GROUP - 1] = getDeptGroup_(newDept);
    // Carry forward description and key fields from original ticket so ML stays complete
    
    // Identity — carry forward from ML, equipment fields always locked
    var origDesc      = getMasterLogFieldForTicket_(data.ticketNo, ML.DESCRIPTION);
    mlRow[ML.DESCRIPTION    - 1] = data.description       || origDesc      || '';

    var origEquipType = getMasterLogFieldForTicket_(data.ticketNo, ML.EQUIP_TYPE);
    mlRow[ML.EQUIP_TYPE     - 1] = origEquipType || '';

    var origEquipCode = getMasterLogFieldForTicket_(data.ticketNo, ML.EQUIP_CODE);
    mlRow[ML.EQUIP_CODE     - 1] = origEquipCode || '';

    var origSpecEquip = getMasterLogFieldForTicket_(data.ticketNo, ML.SPECIFIC_EQUIP);
    mlRow[ML.SPECIFIC_EQUIP - 1] = origSpecEquip || '';

    var origProbType  = getMasterLogFieldForTicket_(data.ticketNo, ML.PROBLEM_TYPE);
    mlRow[ML.PROBLEM_TYPE   - 1] = data.problemType       || origProbType  || '';

    var origDateOpen  = getMasterLogFieldForTicket_(data.ticketNo, ML.DATE_OPENED);
    mlRow[ML.DATE_OPENED    - 1] = origDateOpen || '';

    var origAddedBy   = getMasterLogFieldForTicket_(data.ticketNo, ML.ADDED_BY);
    mlRow[ML.ADDED_BY       - 1] = origAddedBy || '';

    mlRow[ML.LINE_NO        - 1] = getMasterLogFieldForTicket_(data.ticketNo, ML.LINE_NO) || '';

    // New editable fields from MRB — manager edit wins, falls back to existing ML value
    var origDowntime  = getMasterLogFieldForTicket_(data.ticketNo, ML.DOWNTIME_TYPE);
    mlRow[ML.DOWNTIME_TYPE  - 1] = data.downtimeType      || origDowntime  || '';

    var origRootCause = getMasterLogFieldForTicket_(data.ticketNo, ML.ROOT_CAUSE);
    mlRow[ML.ROOT_CAUSE     - 1] = data.rootCause         || origRootCause || '';

    var origCorrAct   = getMasterLogFieldForTicket_(data.ticketNo, ML.CORRECTIVE_ACT);
    mlRow[ML.CORRECTIVE_ACT - 1] = data.correctiveAction  || origCorrAct   || '';

    var origWorkSum   = getMasterLogFieldForTicket_(data.ticketNo, ML.WORK_SUMMARY);
    mlRow[ML.WORK_SUMMARY   - 1] = data.workSummary       || origWorkSum   || '';

    // Observations + notes combined with prefix tag — same pattern as updateTicket()
    var origNotes     = getMasterLogFieldForTicket_(data.ticketNo, ML.NOTES);
    var _obs          = String(data.observations || '').trim();
    var _mgrnotes     = String(data.notes        || '').trim();
    var _combined     = _obs
      ? ('Observations: ' + _obs + (_mgrnotes ? ' | Notes: ' + _mgrnotes : ''))
      : (_mgrnotes || origNotes || '');
    mlRow[ML.NOTES          - 1] = _combined;

    if (data.priority)       mlRow[ML.PRIORITY      - 1] = data.priority;
    if (data.assignedTo)     mlRow[ML.ASSIGNED_TO   - 1] = data.assignedTo;
    if (data.equipTagStatus) mlRow[ML.EQUIP_TAG_STATUS-1] = data.equipTagStatus;
    if (data.actualHours)    mlRow[ML.ACTUAL_HOURS  - 1] = data.actualHours;
    if (data.managerNotes)   mlRow[ML.NOTES         - 1] = (data.notes || '') + ' | MGR: ' + data.managerNotes;
    if (data.verifiedBy) {
      mlRow[ML.VERIFIED_BY   - 1] = data.verifiedBy;
      mlRow[ML.VERIFIED_DATE - 1] = data.verifiedDate || formatDateStr_(now);
    }
    if (isClosed) {
      mlRow[ML.DATE_CLOSED - 1] = formatDateStr_(now);
    }
    mlSh.appendRow(mlRow);

    var tkUpdate = {
      dept:          newDept,
      priority:      data.priority || '',
      assignedTo:    data.assignedTo || '',
      equipTagStatus:data.equipTagStatus || '',
      actualHours:   data.actualHours || '',
      notes:         data.notes || '',
      verifiedBy:    data.verifiedBy || '',
      updatedBy:     byEmail
    };
    updateTicketInTrackerSheet_(ss, data.ticketNo, tkUpdate, newStatus, now);

    if (deptChanged && oldTracker !== newTracker) {
      removeTicketFromSheet_(ss, oldTracker, data.ticketNo);
      writeTicketToTrackerSheet_(ss, newTracker, data.ticketNo, {
        dept: newDept, priority: data.priority || '', assignedTo: data.assignedTo || '',
        notes: data.notes || '', addedBy: '', source: data.source || 'INTERNAL'
      }, newStatus, now);
    }

    if (newStatus !== 'WAITING') {
      if (newStatus === 'OPEN') {
        moveTicketFromWaitingToOpen_(ss, data.ticketNo, {
          priority:   data.priority   || '',
          assignedTo: data.assignedTo || '',
          notes:      data.notes      || '',
          dept:       newDept
        }, now);
      } else {
        removeTicketFromSheet_(ss, SH.WAITING, data.ticketNo);
      }
    }

    if (isClosed) {
      removeTicketFromSheet_(ss, SH.OPEN, data.ticketNo);
      moveTicketToClosed_(ss, data.ticketNo, tkUpdate, now);
    }

    if (deptChanged) {
      logTicketTransfer_(ss, data.ticketNo, oldDept, newDept, byEmail, data.transferReason || '');
    }

    if (data.equipTagStatus && data.equipTagStatus !== 'None' && data.equipTagStatus !== '') {
      logEquipHoldTag_(ss, data.ticketNo, {
        equipCode:     getMasterLogFieldForTicket_(data.ticketNo, ML.EQUIP_CODE),
        specificEquip: getMasterLogFieldForTicket_(data.ticketNo, ML.SPECIFIC_EQUIP),
        dept:          newDept,
        buildingZone:  getMasterLogFieldForTicket_(data.ticketNo, ML.BUILDING_ZONE),
        equipTagStatus:data.equipTagStatus,
        notes:         data.notes || '',
        addedBy:       byEmail,
        updatedBy:     byEmail
      }, now);
    }

    logTicketHistory(data.ticketNo,
      isClosed ? TH_EVENTS.CLOSED : TH_EVENTS.UPDATED,
      '', newStatus, byEmail,
      'Manager action: ' + newStatus + (deptChanged ? ' | Transferred: ' + oldDept + ' → ' + newDept : ''));

    return { success: true };

  } catch(e) {
    Logger.log('managerApproveTicket error: ' + e.message);
    return { success: false, error: e.message };
  }
}

function moveTicketFromWaitingToOpen_(ss, ticketNo, updates, now) {
  var waitSh = ss.getSheetByName(SH.WAITING);
  var openSh = ss.getSheetByName(SH.OPEN);
  if (!waitSh || !openSh) return;

  var startRow = QUEUE_FROZEN + 1;
  if (waitSh.getLastRow() < startRow) return;

  var tickets = waitSh.getRange(startRow, TK_DATA_COL,
    waitSh.getLastRow()-startRow+1, 1).getValues();

  for (var i = 0; i < tickets.length; i++) {
    if (String(tickets[i][0]).trim() === String(ticketNo).trim()) {
      var rowNum  = i + startRow;
      var rowData = waitSh.getRange(rowNum, TK_DATA_COL, 1, TK_COLS).getValues()[0];

      rowData[TK.STATUS-1]       = 'OPEN';
      rowData[TK.LAST_UPDATED-1] = formatTimestamp_(now);
      if (updates.priority)   rowData[TK.PRIORITY-1]    = updates.priority;
      if (updates.assignedTo) rowData[TK.ASSIGNED_TO-1] = updates.assignedTo;
      if (updates.notes)      rowData[TK.NOTES-1]        = updates.notes;
      if (updates.dept)       rowData[TK.DEPT-1]         = updates.dept;

      var openStart = QUEUE_FROZEN + 1;
      var nextRow   = Math.max(openSh.getLastRow() + 1, openStart);

      openSh.getRange(nextRow, TK_DATA_COL, 1, TK_COLS).setValues([rowData]);
      applyDataRowBorders_(openSh, nextRow);
      applyPriorityRowColor_(openSh, nextRow, rowData[TK.PRIORITY-1]);

      waitSh.deleteRow(rowNum);
      return;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  MANAGER VERIFY TICKET
//  ITEM 6D: UPDATED_BY uses byEmail (actual email) not data.verifiedBy || 'Manager'
// ═══════════════════════════════════════════════════════════════════════════
function managerVerifyTicket(data) {
  try {
    var ss       = SpreadsheetApp.getActiveSpreadsheet();
    var now      = new Date();
    var userInfo = getCurrentUserInfo();
    var byEmail  = userInfo.email || Session.getActiveUser().getEmail() || data.verifiedBy || 'Manager';

    var mlSh = ss.getSheetByName(SH.MASTER_LOG);
    if (!mlSh) throw new Error('Master Log not found');

   // Bug #2 fix — convert ISO YYYY-MM-DD (from <input type="date">) to MM/DD/YYYY,
    // treating as local date to avoid timezone shift
    var verifiedDateStr;
    if (data.verifiedDate) {
      var m = String(data.verifiedDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      verifiedDateStr = m
        ? formatDateStr_(new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3])))
        : data.verifiedDate;
    } else {
      verifiedDateStr = formatDateStr_(now);
    }

    // SQF #1 — server-side checklist validation
    var _chkItems = ['Work completed satisfactorily','Area cleaned and safe','No food safety risk identified'];
    var _chkResult = String(data.verificationChecklist || '');
    var _allChecked = _chkItems.every(function(item){ return _chkResult.indexOf(item) >= 0; });
    if (!_allChecked) throw new Error('Verification checklist incomplete — all 3 items must be confirmed before closing.');

    var mlRow = new Array(ML_COLS).fill('');
    mlRow[ML.ROW_ID        - 1] = generateRowId();
    mlRow[ML.TICKET_NO     - 1] = data.ticketNo;
    mlRow[ML.TIMESTAMP     - 1] = formatTimestamp_(now);
    mlRow[ML.ACTION        - 1] = 'MANAGER VERIFIED — CLOSED';
    mlRow[ML.STATUS        - 1] = 'CLOSED';
    mlRow[ML.VERIFIED_BY   - 1] = data.verifiedBy   || '';
    mlRow[ML.VERIFIED_DATE - 1] = verifiedDateStr;            // Bug #2 fix
    mlRow[ML.DATE_CLOSED   - 1] = formatDateStr_(now);
    mlRow[ML.ACTUAL_HOURS  - 1] = data.actualHours   || '';
    mlRow[ML.NOTES         - 1] = data.managerNotes  || '';
    mlRow[ML.UPDATED_BY    - 1] = byEmail;

    // Bug #1 fix — carry forward identity fields from the ticket's history so this
    // audit row stands on its own. Same pattern used in managerApproveTicket.
    var origDept       = getMasterLogFieldForTicket_(data.ticketNo, ML.DEPT);
    if (origDept)       mlRow[ML.DEPT           - 1] = origDept;
    var origBldgZone   = getMasterLogFieldForTicket_(data.ticketNo, ML.BUILDING_ZONE);
    if (origBldgZone)   mlRow[ML.BUILDING_ZONE  - 1] = origBldgZone;
    var origEquipType  = getMasterLogFieldForTicket_(data.ticketNo, ML.EQUIP_TYPE);
    if (origEquipType)  mlRow[ML.EQUIP_TYPE     - 1] = origEquipType;
    var origEquipCode  = getMasterLogFieldForTicket_(data.ticketNo, ML.EQUIP_CODE);
    if (origEquipCode)  mlRow[ML.EQUIP_CODE     - 1] = origEquipCode;
    var origSpecEquip  = getMasterLogFieldForTicket_(data.ticketNo, ML.SPECIFIC_EQUIP);
    if (origSpecEquip)  mlRow[ML.SPECIFIC_EQUIP - 1] = origSpecEquip;
    var origDtType     = getMasterLogFieldForTicket_(data.ticketNo, ML.DOWNTIME_TYPE);
    if (origDtType)     mlRow[ML.DOWNTIME_TYPE  - 1] = origDtType;
    var origPriority   = getMasterLogFieldForTicket_(data.ticketNo, ML.PRIORITY);
    if (origPriority)   mlRow[ML.PRIORITY       - 1] = origPriority;
    var origDesc       = getMasterLogFieldForTicket_(data.ticketNo, ML.DESCRIPTION);
    if (origDesc)       mlRow[ML.DESCRIPTION    - 1] = origDesc;
    var origAssigned   = getMasterLogFieldForTicket_(data.ticketNo, ML.ASSIGNED_TO);
    if (origAssigned)   mlRow[ML.ASSIGNED_TO    - 1] = origAssigned;
    var origDateOpen   = getMasterLogFieldForTicket_(data.ticketNo, ML.DATE_OPENED);
    if (origDateOpen)   mlRow[ML.DATE_OPENED    - 1] = origDateOpen;
    var origDateComp   = getMasterLogFieldForTicket_(data.ticketNo, ML.DATE_COMPLETED);
    if (origDateComp)   mlRow[ML.DATE_COMPLETED - 1] = origDateComp;
    var origCorrAct    = getMasterLogFieldForTicket_(data.ticketNo, ML.CORRECTIVE_ACT);
    if (origCorrAct)    mlRow[ML.CORRECTIVE_ACT - 1] = origCorrAct;
    var origWorkSum    = getMasterLogFieldForTicket_(data.ticketNo, ML.WORK_SUMMARY);
    if (origWorkSum)    mlRow[ML.WORK_SUMMARY   - 1] = origWorkSum;
    var origFixType    = getMasterLogFieldForTicket_(data.ticketNo, ML.FIX_TYPE);
    if (origFixType)    mlRow[ML.FIX_TYPE       - 1] = origFixType;
    var origAddedBy    = getMasterLogFieldForTicket_(data.ticketNo, ML.ADDED_BY);
    if (origAddedBy)    mlRow[ML.ADDED_BY       - 1] = origAddedBy;
    var origProbType   = getMasterLogFieldForTicket_(data.ticketNo, ML.PROBLEM_TYPE);
    if (origProbType)   mlRow[ML.PROBLEM_TYPE   - 1] = origProbType;

    var origEstHours   = getMasterLogFieldForTicket_(data.ticketNo, ML.EST_HOURS);
    if (origEstHours)   mlRow[ML.EST_HOURS      - 1] = origEstHours;
    var origTempFix    = getMasterLogFieldForTicket_(data.ticketNo, ML.TEMP_FIX_FLAG);
    if (origTempFix)    mlRow[ML.TEMP_FIX_FLAG  - 1] = origTempFix;
    var origParts      = getMasterLogFieldForTicket_(data.ticketNo, ML.PARTS_NEEDED);
    if (origParts)      mlRow[ML.PARTS_NEEDED   - 1] = origParts;

    mlRow[ML.TRACKER_GROUP          - 1] = getDeptGroup_(origDept);
    mlRow[ML.LINE_NO                - 1] = getMasterLogFieldForTicket_(data.ticketNo, ML.LINE_NO) || '';
    mlRow[ML.VERIFICATION_CHECKLIST - 1] = data.verificationChecklist || '';
    mlSh.appendRow(mlRow);

  updateTicketInTrackerSheet_(ss, data.ticketNo, {
    dept:        origDept      || '',
    problemType: origProbType  || '',
    equipType:   origEquipType || '',
    priority:    origPriority  || '',
    verifiedBy:  data.verifiedBy || '',
    updatedBy:   byEmail
  }, 'CLOSED', now);

    removeTicketFromSheet_(ss, SH.OPEN, data.ticketNo);

    moveTicketToClosed_(ss, data.ticketNo, {
      dept:         origDept         || '',
      priority:     origPriority     || '',
      buildingZone: origBldgZone     || '',
      equipType:    origEquipType    || '',
      equipCode:    origEquipCode    || '',
      specificEquip:origSpecEquip    || '',
      downtimeType: origDtType       || '',
      problemType:  origProbType     || '',
      description:  origDesc         || '',
      assignedTo:   origAssigned     || '',
      estHours:     origEstHours     || '',
      actualHours:  data.actualHours || '',
      dateOpened:   origDateOpen     || '',
      fixType:      origFixType      || '',
      addedBy:      origAddedBy      || '',
      verifiedBy:   data.verifiedBy  || '',
      verifiedDate: verifiedDateStr  || '',
      updatedBy:    byEmail,
      notes:        data.managerNotes || ''
    }, now);

    logTicketHistory(data.ticketNo, TH_EVENTS.CLOSED, 'COMPLETE', 'CLOSED',
      byEmail, 'Verified and closed by manager.');

    return { success: true };
  } catch(e) {
    Logger.log('managerVerifyTicket error: ' + e.message);
    return { success: false, error: e.message };
  }
}

function managerUpdatePartStatus(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SH.PARTS_NEEDED);
    if (!sh) throw new Error('Parts Needed tab not found');
    var lastRow = sh.getLastRow();
    if (lastRow < 2) return { success: false, error: 'No parts data found' };
    var rows  = sh.getRange(2, 1, lastRow - 1, PN_COLS).getValues();
    var found = false;
    for (var i = 0; i < rows.length; i++) {
      var rowPartId = String(rows[i][PN.PART_ID   - 1] || '').trim();
      var rowTicket = String(rows[i][PN.TICKET_NO - 1] || '').trim();
      if (rowPartId === data.partId && rowTicket === data.ticketNo) {
        sh.getRange(i + 2, PN.PARTS_STATUS).setValue(data.newStatus);
        if (data.newStatus === 'Ordered')  sh.getRange(i + 2, PN.DATE_ORDERED).setValue(formatDateStr_(new Date()));
        if (data.newStatus === 'Received') sh.getRange(i + 2, PN.DATE_RECEIVED).setValue(formatDateStr_(new Date()));
        found = true;
        break;
      }
    }
    if (found && data.newStatus === 'Received') {
      var mlSh = ss.getSheetByName(SH.MASTER_LOG);
      if (mlSh && mlSh.getLastRow() > 1) {
        var mlData = mlSh.getRange(2, ML.TICKET_NO, mlSh.getLastRow() - 1, 1).getValues();
        for (var j = mlData.length - 1; j >= 0; j--) {
          if (String(mlData[j][0] || '').trim() === data.ticketNo) {
            mlSh.getRange(j + 2, ML.PARTS_STATUS).setValue('Received');
            break;
          }
        }
      }
    }
    return { success: found, error: found ? null : 'Part record not found' };
  } catch(e) {
    Logger.log('managerUpdatePartStatus error: ' + e.message);
    return { success: false, error: e.message };
  }
}

function managerVerifyReport(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SH.RPT_DB);
    if (!sh) throw new Error('Report Database not found');
    var lastRow = sh.getLastRow();
    if (lastRow < 2) return { success: false, error: 'No reports found' };
    var rows = sh.getRange(2, RDB.REPORT_ID, lastRow - 1, 1).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0] || '').trim() === data.reportId) {
        sh.getRange(i + 2, RDB.VERIFIED_BY).setValue(data.verifiedBy   || '');
        sh.getRange(i + 2, RDB.VERIFIED_DATE).setValue(data.verifiedDate || formatDateStr_(new Date()));
        sh.getRange(i + 2, RDB.NOTES).setValue(data.notes || '');
        return { success: true };
      }
    }
    return { success: false, error: 'Report not found' };
  } catch(e) {
    Logger.log('managerVerifyReport error: ' + e.message);
    return { success: false, error: e.message };
  }
}



function getTechWorkBoardData() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var cfg   = getConfig();
  var lists = getAllDataLists();
  var logSh = ss.getSheetByName(SH.MASTER_LOG);
  var tickets = [];

  if (logSh && logSh.getLastRow() > 1) {
    var lastCol   = Math.min(ML_COLS, logSh.getLastColumn());
    var data      = logSh.getRange(2, 1, logSh.getLastRow() - 1, lastCol).getValues();
    var ticketMap = {};
    data.forEach(function(r) {
      var tn = String(r[ML.TICKET_NO - 1] || '').trim();
      if (tn) ticketMap[tn] = r;
    });

    Object.keys(ticketMap).forEach(function(tn) {
      var r      = ticketMap[tn];
      var status = String(r[ML.STATUS - 1] || '').toUpperCase();
      if (status === 'CLOSED' || status === 'COMPLETE') return;

      function col(idx) { return idx <= lastCol ? String(r[idx - 1] || '') : ''; }

      var dept     = col(ML.DEPT);
      var deptCode = DEPT_CODES[dept.toUpperCase()] || '';

      tickets.push({
        ticketNo:      tn,
        dept:          dept,
        deptCode:      deptCode,
        status:        col(ML.STATUS),
        priority:      col(ML.PRIORITY),
        assignedTo:    col(ML.ASSIGNED_TO),
        equipType:     col(ML.EQUIP_TYPE),
        specificEquip: col(ML.SPECIFIC_EQUIP),
        equipCode:     col(ML.EQUIP_CODE),
        description:   col(ML.DESCRIPTION),
        problemType:   col(ML.PROBLEM_TYPE),
        estHours:      r[ML.EST_HOURS - 1] || '',
        dateOpened:    r[ML.DATE_OPENED - 1]
          ? Utilities.formatDate(new Date(r[ML.DATE_OPENED - 1]), Session.getScriptTimeZone(), 'MM/dd/yy')
          : '',
        buildingZone:  col(ML.BUILDING_ZONE),
        line:          '',
        source:        'INTERNAL',
        photoLinks:    ''
      });
    });
  }

  return {
    companyName:  cfg['Company Name'] || 'Container Supply Co.',
    location:     cfg['Location']     || 'Garden Grove, CA',
    technicians:  lists['Technicians'] || [],
    departments:  Object.keys(DEPT_CODES),
    deptCodes:    DEPT_CODES,
    tickets:      tickets
  };
}

function getTicketHistory(ticketNo) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SH.TICKET_HIST);
    if (!sh || sh.getLastRow() < 2) return [];
    var data   = sh.getRange(2, 1, sh.getLastRow()-1, TH_COLS).getValues();
    var result = [];
    data.forEach(function(r) {
      if (String(r[TH.TICKET_NO-1]).trim() !== ticketNo) return;
      result.push({
        timestamp:   String(r[TH.TIMESTAMP-1]    || ''),
        eventType:   String(r[TH.EVENT_TYPE-1]   || ''),
        statusTo:    String(r[TH.STATUS_TO-1]    || ''),
        performedBy: String(r[TH.PERFORMED_BY-1] || ''),
        notes:       String(r[TH.NOTES-1]        || '')
      });
    });
    return result;
  } catch(e) {
    Logger.log('getTicketHistory error: ' + e.message);
    return [];
  }
}