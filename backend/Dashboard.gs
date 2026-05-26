// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Dashboard.gs — CSC CMMS v5.0                                           ║
// ║  KPI aggregation for the home page.  Step 9 replaces these stubs with  ║
// ║  real computations.                                                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Called by the home page on load.  Returns ticket counts scoped to the
// calling user's owned departments.
function getDashboardCounts() {
  requireManager_();
  var user = getCurrentUserInfo();

  try {
    var ss   = getBoundSS_();
    var ml   = ss.getSheetByName(SH.MASTER_LOG);
    if (!ml || ml.getLastRow() < 2) return _zeroCounts_();

    var data = ml.getRange(2, 1, ml.getLastRow() - 1, ML_COLS).getValues();
    var thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    var counts = _zeroCounts_();
    // Track latest status per ticket (last ML row wins)
    var latestStatus   = {};
    var latestPriority = {};
    var latestDept     = {};
    var latestClosed   = {};

    data.forEach(function(r) {
      var tn   = String(r[ML.TICKET_NO  - 1] || '').trim();
      var dept = String(r[ML.DEPT       - 1] || '').trim();
      if (!tn) return;
      // dept-scope filter
      if (!user.isAdmin && user.ownedDepts.indexOf(dept) === -1) return;
      latestStatus[tn]   = String(r[ML.STATUS   - 1] || '').trim().toUpperCase();
      latestPriority[tn] = String(r[ML.PRIORITY - 1] || '').trim().toUpperCase();
      latestDept[tn]     = dept;
      if (r[ML.DATE_CLOSED - 1]) latestClosed[tn] = r[ML.DATE_CLOSED - 1];
    });

    Object.keys(latestStatus).forEach(function(tn) {
      var st = latestStatus[tn];
      if (st === 'OPEN' || st === 'PENDING PARTS' || st === 'ON HOLD' || st === 'PENDING VERIFICATION') {
        counts.open++;
        if (latestPriority[tn] === 'CRITICAL') counts.critical++;
      }
      if (st === 'WAITING') counts.waiting++;
      if ((st === 'CLOSED' || st === 'COMPLETE') && latestClosed[tn]) {
        var cd = latestClosed[tn] instanceof Date ? latestClosed[tn] : new Date(latestClosed[tn]);
        if (!isNaN(cd) && cd >= thirtyDaysAgo) counts.closedRecent++;
      }
    });

    // Temp fix active count
    var tfSh = ss.getSheetByName(SH.TEMP_FIX);
    if (tfSh && tfSh.getLastRow() > HIST_HEADER_ROW) {
      var tfData = tfSh.getRange(HIST_HEADER_ROW + 1, 1, tfSh.getLastRow() - HIST_HEADER_ROW, TF_COLS).getValues();
      tfData.forEach(function(r) {
        var st   = String(r[TF.STATUS - 1] || '').trim().toUpperCase();
        var dept = String(r[TF.DEPT   - 1] || '').trim();
        if (!user.isAdmin && user.ownedDepts.indexOf(dept) === -1) return;
        if (st === 'ACTIVE' || st === 'PAST DUE') counts.tempFixActive++;
      });
    }

    // Parts pending count
    var pnSh = ss.getSheetByName(SH.PARTS_NEEDED);
    if (pnSh && pnSh.getLastRow() > HIST_HEADER_ROW) {
      var pnData = pnSh.getRange(HIST_HEADER_ROW + 1, 1, pnSh.getLastRow() - HIST_HEADER_ROW, PN_COLS).getValues();
      pnData.forEach(function(r) {
        var st   = String(r[PN.PARTS_STATUS - 1] || '').trim().toUpperCase();
        var dept = String(r[PN.DEPT         - 1] || '').trim();
        if (!user.isAdmin && user.ownedDepts.indexOf(dept) === -1) return;
        if (st === 'PENDING' || st === 'ORDERED') counts.partsPending++;
      });
    }

    return counts;
  } catch (e) {
    Logger.log('getDashboardCounts error: ' + e.message);
    return _zeroCounts_();
  }
}

function _zeroCounts_() {
  return { open: 0, waiting: 0, critical: 0, tempFixActive: 0, closedRecent: 0, partsPending: 0 };
}
