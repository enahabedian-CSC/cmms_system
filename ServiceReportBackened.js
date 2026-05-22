// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  SERVICE REPORT & TECH WORK BOARD  v3.0                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─── Open forms ─────────────────────────────────────────────────────────────
function showServiceReport() {
  var html = HtmlService.createHtmlOutputFromFile('ServiceReport')
    .setTitle('📝 Service Report')
    .setWidth(1600).setHeight(950);
  SpreadsheetApp.getUi().showModalDialog(html, '📝 Maintenance Service Report — FRM-040-002');
}

function showEquipHoldTag(ticketNo) {
  var template = HtmlService.createTemplateFromFile('EquipmentHoldTag');
  template.preloadTicketNo = ticketNo || '';
  var html = template.evaluate()
    .setTitle('🏷️ Equipment Hold Tag')
    .setWidth(720).setHeight(760);
  SpreadsheetApp.getUi().showModalDialog(html, '🏷️ Equipment Hold Tag — FRM-029-002');
}


// ─── Form data getters ───────────────────────────────────────────────────────
function getServiceReportFormData() {
  var cfg   = getConfig();
  var lists = getAllDataLists();
  return {
    companyName:    cfg['Company Name']           || 'Container Supply Co.',
    location:       cfg['Location']               || 'Garden Grove, CA',
    docNo:          cfg['Doc No (Service Report)']|| 'FRM-040-002',
    revision:       cfg['Revision']               || '0',
    departments:    lists['Departments']          || [],
    buildingZones:  lists['Building / Zone']      || [],
    equipmentTypes: lists['Equipment Types']      || [],
    priorities:     lists['Priorities']           || [],
    downtimeTypes:  lists['Downtime Types']       || [],
    technicians:    lists['Technicians']          || [],
    shifts:         lists['Shifts']               || [],
    problemTypes:   lists['Problem Types']        || [],
    equipFlatList:  getEquipmentFlatList(),
    openTickets:    getOpenTicketsList_()
  };
}

function getReviewTicketFormData() {
  var cfg = getConfig();
  return {
    companyName:    cfg.companyName,
    location:       cfg.location,
    docNo:          cfg.docNoTicket,
    revision:       cfg.revision,
    departments:    getDataList('Departments'),
    buildingZones:  getDataList('Building / Zone'),
    technicians:    getDataList('Technicians'),
    priorities:     getDataList('Priorities'),
    partsStatuses:  getDataList('Parts Status'),
    waitingTickets: getWaitingTicketsList_()
  };
}

function getEquipHoldTagData() {
  var cfg = getConfig();
  return {
    companyName:    cfg.companyName,
    location:       cfg.location,
    docNo_tag:      cfg.docNoTag,
    revision:       cfg.revision,
    departments:    getDataList('Departments'),
    buildingZones:  getDataList('Building / Zone'),
    equipmentTypes: getDataList('Equipment Types'),
    technicians:    getDataList('Technicians'),
    equipHierarchy: getEquipmentHierarchy(),
    openTickets:    getOpenTicketsList_()
  };
}

function getMonthRolloverData() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = getConfig();
  var logSh = ss.getSheetByName(SH.MASTER_LOG);
  var tfSh  = ss.getSheetByName(SH.TEMP_FIX);
  var pnSh  = ss.getSheetByName(SH.PARTS_NEEDED);

  var data = logSh && logSh.getLastRow() > 1
    ? logSh.getRange(2, 1, logSh.getLastRow()-1, ML_COLS).getValues()
    : [];

  var statusCounts = {total:0, open:0, waiting:0, closed:0};
  data.forEach(function(r) {
    if (!r[ML.TICKET_NO-1]) return;
    statusCounts.total++;
    var s = String(r[ML.STATUS-1]).toUpperCase();
    if (s==='OPEN'||s==='PENDING PARTS'||s==='ON HOLD'||s==='IN REVIEW') statusCounts.open++;
    else if (s==='WAITING') statusCounts.waiting++;
    else if (s==='CLOSED') statusCounts.closed++;
  });

  var activeTempFix = 0;
  if (tfSh && tfSh.getLastRow() > 1) {
    var tfData = tfSh.getRange(2, 1, tfSh.getLastRow()-1, TF_COLS).getValues();
    tfData.forEach(function(r) {
      var st = String(r[TF.STATUS-1]).toUpperCase();
      if (st==='ACTIVE'||st==='PAST DUE') activeTempFix++;
    });
  }

  var pendingParts = 0;
  if (pnSh && pnSh.getLastRow() > 1) {
    var pnData = pnSh.getRange(2, 1, pnSh.getLastRow()-1, PN_COLS).getValues();
    pnData.forEach(function(r) {
      var st = String(r[PN.STATUS-1]).toUpperCase();
      if (st!=='RECEIVED') pendingParts++;
    });
  }

  return {
    companyName:    cfg.companyName,
    location:       cfg.location,
    currentMonth:   cfg.currentMonth,
    totalTickets:   statusCounts.total,
    openTickets:    statusCounts.open,
    waitingTickets: statusCounts.waiting,
    closedTickets:  statusCounts.closed,
    activeTempFix:  activeTempFix,
    pendingParts:   pendingParts
  };
}



// ─── Submit Service Report ───────────────────────────────────────────────────
function submitServiceReport(data) {
  try {
    var ss  = SpreadsheetApp.getActiveSpreadsheet();
    var cfg = getConfig();

    // Generate report number: RPT-YYYYMM-###
    var rptNo = generateReportNo_();

    // Log to Report Database
    var rdbSh = ss.getSheetByName(SH.RPT_DB);
    if (rdbSh) {
      var now  = new Date();
      var tz   = Session.getScriptTimeZone();
      var nowStr = Utilities.formatDate(now, tz, 'MM/dd/yyyy HH:mm');
      var partsStr = (data.partsRows||[]).map(function(p){
        return [p.partId||'',p.partDesc||'',p.notes||''].join(' :: ');
      }).join(' | ');

      var row = new Array(RDB_COLS).fill('');
      row[RDB.REPORT_NO-1]         = rptNo;
      row[RDB.TICKET_NO-1]         = data.ticketNo||'';
      row[RDB.DATE-1]              = nowStr;
      row[RDB.DEPT-1]              = data.dept||'';
      row[RDB.EQUIP_TYPE-1]        = data.equipType||'';
      row[RDB.EQUIP_CODE-1]        = data.equipCode||'';
      row[RDB.PRIORITY-1]          = data.priority||'';
      row[RDB.DOWNTIME_TYPE-1]     = data.downtimeType||'';
      row[RDB.PROBLEM_DESC-1]      = data.problemDesc||'';
      row[RDB.ROOT_CAUSE-1]        = data.rootCause||'';
      row[RDB.CORRECTIVE_ACTION-1] = data.correctiveAction||'';
      row[RDB.WORK_SUMMARY-1]      = data.workSummary||'';
      row[RDB.PARTS_USED-1]        = partsStr;
      row[RDB.ADDED_BY-1]          = data.addedBy||'';
      row[RDB.COMPLETED_BY-1]      = data.completedBy||'';
      row[RDB.LABOR_HOURS-1]       = data.laborHours||0;
      row[RDB.TEMP_FIX_FLAG-1]     = data.isTempFix ? 'Y' : 'N';
      row[RDB.FIX_TYPE-1]          = data.fixType||'Permanent';
      row[RDB.VERIFIED_BY-1]       = data.verifiedBy||'';
      row[RDB.VERIFIED_DATE-1]     = data.verifiedDate||'';
      row[RDB.NOTES-1]             = data.notes||'';
      row[RDB.PREVENTIVE_ACT-1]    = data.preventiveAction||'';
      // Problem Type stored in notes prefix if RDB has no dedicated col
      if(data.problemType) row[RDB.NOTES-1] = '['+data.problemType+'] '+(data.notes||'');
      row[RDB.BUILDING_ZONE-1]     = '';
      row[RDB.MONTH-1]             = cfg.currentMonth;
      row[RDB.IMAGE_COUNT-1]       = data.imageCount||0;

      rdbSh.appendRow(row);

      // Color temp fix rows yellow
      if (data.isTempFix) {
        var lr = rdbSh.getLastRow();
        rdbSh.getRange(lr,1,1,RDB_COLS).setBackground('#FFF9C4');
      }
    }

    // If linked to a ticket, log the service report reference in Master Log
    if (data.ticketNo) {
      updateMasterLogField_(ss, data.ticketNo, ML.WORK_SUMMARY, data.workSummary||'');
      if (data.laborHours) updateMasterLogField_(ss, data.ticketNo, ML.ACTUAL_HOURS, data.laborHours);
      logTicketHistory(data.ticketNo, 'Service Report', 'Service Report Submitted', data.addedBy||'', 'Report: '+rptNo);
    }

    return { success:true, reportNo: rptNo };
  } catch(e) {
    return { success:false, error: e.message };
  }
}

// ─── Review Ticket ───────────────────────────────────────────────────────────


// ─── Assign Ticket to Tech (from Tech Work Board) ────────────────────────────
function assignTicketToTech(data) {
  try {
    return updateTicket({
      ticketNo:   data.ticketNo,
      newStatus:  'OPEN',
      assignedTo: data.tech,
      updatedBy:  data.tech
    });
  } catch(e) {
    return { success:false, error: e.message };
  }
}

// ─── Log Equipment Hold Tag (for Hold Tag form) ──────────────────────────────
// (Core logging is in Code.gs logEquipHoldTag_; this wrapper exposed to HTML)
function logEquipHoldTag(data) {
  try {
    var ss  = SpreadsheetApp.getActiveSpreadsheet();
    var now = new Date();
    // Map hold tag form data to the format logEquipHoldTag_ expects
    var tagData = {
      equipCode:     data.equipCode     || '',
      specificEquip: data.specificEquip || '',
      dept:          data.dept          || '',
      buildingZone:  data.buildingZone  || '',
      equipTagStatus: data.tagType === 'red' ? 'Red — Out of Service' : 'Yellow — Use with Caution',
      notes:         data.issueReason   || '',
      addedBy:       data.taggedBy      || ''
    };
    logEquipHoldTag_(ss, data.ticketNo || '', tagData, now);

    var ehlSh = ss.getSheetByName(SH.EQUIP_HOLD_LOG);
    var seq   = ehlSh && ehlSh.getLastRow() > 1 ? String(ehlSh.getLastRow()-1).padStart(3,'0') : '001';
    var tagId = 'TAG-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd') + '-' + seq;
    return { success: true, tagId: tagId };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function generateReportNo_() {
  var rdbSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH.RPT_DB);
  var ym    = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMM');
  var seq   = 1;
  if (rdbSh && rdbSh.getLastRow() > 1) {
    var vals = rdbSh.getRange(2, RDB.REPORT_NO, rdbSh.getLastRow()-1, 1).getValues();
    vals.forEach(function(r) {
      var v = String(r[0]);
      if (v.indexOf('RPT-'+ym) === 0) {
        var n = parseInt(v.split('-')[2]) || 0;
        if (n >= seq) seq = n + 1;
      }
    });
  }
  return 'RPT-' + ym + '-' + String(seq).padStart(3,'0');
}

function getWaitingTicketsList_() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var logSh = ss.getSheetByName(SH.MASTER_LOG);
  var list  = [];
  if (!logSh || logSh.getLastRow() < 2) return list;
  var data  = logSh.getRange(2,1,logSh.getLastRow()-1,ML_COLS).getValues();
  var ticketMap = {};
  data.forEach(function(r){var tn=String(r[ML.TICKET_NO-1]);if(tn) ticketMap[tn]=r;});
  Object.keys(ticketMap).forEach(function(tn){
    var r=ticketMap[tn];
    var s=String(r[ML.STATUS-1]).toUpperCase();
    if(s!=='WAITING'&&s!=='IN REVIEW') return;
    list.push({
      ticketNo:    String(r[ML.TICKET_NO-1]),
      status:      String(r[ML.STATUS-1]),
      priority:    String(r[ML.PRIORITY-1]),
      dept:        String(r[ML.DEPT-1]),
      equipType:   String(r[ML.EQUIP_TYPE-1]),
      specificEquip:String(r[ML.SPECIFIC_EQUIP-1]),
      equipCode:   String(r[ML.EQUIP_CODE-1]),
      description: String(r[ML.DESCRIPTION-1]),
      dateOpened:  r[ML.DATE_OPENED-1]?Utilities.formatDate(new Date(r[ML.DATE_OPENED-1]),Session.getScriptTimeZone(),'MM/dd/yyyy'):'',
      assignedTo:  String(r[ML.ASSIGNED_TO-1]),
      buildingZone:String(r[ML.BUILDING_ZONE-1]),
      partsNeeded: String(r[ML.PARTS_NEEDED-1]),
      addedBy:     String(r[ML.ADDED_BY-1])
    });
  });
  // Sort critical + high first
  var po={CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3};
  list.sort(function(a,b){return (po[a.priority]||3)-(po[b.priority]||3);});
  return list;
}

function getOpenTicketsList_() {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var logSh = ss.getSheetByName(SH.MASTER_LOG);
    var list  = [];
    if (!logSh || logSh.getLastRow() < 2) return list;
    // Use actual sheet column count to avoid out-of-bounds errors
    var lastCol = Math.min(ML_COLS, logSh.getLastColumn());
    var data = logSh.getRange(2, 1, logSh.getLastRow()-1, lastCol).getValues();
    var ticketMap = {};
    data.forEach(function(r){
      var tn = String(r[ML.TICKET_NO-1]||'').trim();
      if(tn) ticketMap[tn] = r;
    });
    Object.keys(ticketMap).forEach(function(tn){
      var r = ticketMap[tn];
      var s = String(r[ML.STATUS-1]||'').toUpperCase();
      if(s==='CLOSED') return;
      // Safe column read helper
      function col(idx){ return idx<=lastCol ? String(r[idx-1]||'') : ''; }
      list.push({
        ticketNo:     col(ML.TICKET_NO),
        status:       col(ML.STATUS),
        priority:     col(ML.PRIORITY),
        dept:         col(ML.DEPT),
        equipType:    col(ML.EQUIP_TYPE),
        specificEquip:col(ML.SPECIFIC_EQUIP),
        equipCode:    col(ML.EQUIP_CODE),
        description:  col(ML.DESCRIPTION),
        dateOpened:   (r[ML.DATE_OPENED-1] && ML.DATE_OPENED<=lastCol) ?
                        Utilities.formatDate(new Date(r[ML.DATE_OPENED-1]), Session.getScriptTimeZone(), 'MM/dd/yyyy') : '',
        assignedTo:   col(ML.ASSIGNED_TO),
        buildingZone: col(ML.BUILDING_ZONE),
        addedBy:      col(ML.ADDED_BY),
        downtimeType: col(ML.DOWNTIME_TYPE),
        problemType:  col(ML.PROBLEM_TYPE),
        estHours:     ML.EST_HOURS<=lastCol ? (r[ML.EST_HOURS-1]||'') : ''
      });
    });
    return list;
  } catch(e) {
    Logger.log('getOpenTicketsList_ error: ' + e.message);
    return [];
  }
}

function updateMasterLogField_(ss, ticketNo, colIdx, value) {
  var logSh = ss.getSheetByName(SH.MASTER_LOG);
  if (!logSh || logSh.getLastRow() < 2) return;
  var data = logSh.getRange(2, ML.TICKET_NO, logSh.getLastRow()-1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === ticketNo) {
      logSh.getRange(i+2, colIdx).setValue(value);
      break;
    }
  }
}

