// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  SERVICE REPORT & TECH WORK BOARD  v3.2                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─── Open forms ─────────────────────────────────────────────────────────────


function showEquipHoldTag(ticketNo) {
  var template = HtmlService.createTemplateFromFile('EquipmentHoldTag');
  template.preloadTicketNo = ticketNo || '';
  var html = template.evaluate()
    .setTitle('🏷️ Equipment Hold Tag')
    .setWidth(720).setHeight(760);
  SpreadsheetApp.getUi().showModalDialog(html, '🏷️ Equipment Hold Tag — FRM-029-002');
}


// ─── Form data getters ───────────────────────────────────────────────────────





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



// ─── Helpers ────────────────────────────────────────────────────────────────




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



