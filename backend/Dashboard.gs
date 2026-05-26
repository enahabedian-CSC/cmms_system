// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Dashboard.gs — CSC CMMS v5.0                                           ║
// ║  KPI aggregation and trend data for the home page.                     ║
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

// ═══════════════════════════════════════════════════════════════════════════════
//  getDashboardTrend
//  Returns last N months of ticket activity: opened vs. closed counts.
//  Used by the home-page bar chart.
// ═══════════════════════════════════════════════════════════════════════════════

function getDashboardTrend(monthCount) {
  requireManager_();
  var user   = getCurrentUserInfo();
  monthCount = Math.min(Math.max(monthCount || 6, 2), 12);

  try {
    var ml = getBoundSS_().getSheetByName(SH.MASTER_LOG);
    if (!ml || ml.getLastRow() < 2) return _emptyTrend_(monthCount);

    var data = ml.getRange(2, 1, ml.getLastRow() - 1, ML_COLS).getValues();
    var tz   = Session.getScriptTimeZone();
    var now  = new Date();

    // Build month bucket labels (current month last)
    var months = [];
    for (var m = monthCount - 1; m >= 0; m--) {
      var d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      months.push(Utilities.formatDate(d, tz, 'MMM yyyy'));
    }

    var opened  = {};
    var closed  = {};
    months.forEach(function(lbl) { opened[lbl] = 0; closed[lbl] = 0; });

    // Track first-seen and last-status per ticket
    var firstAction  = {};
    var latestStatus = {};
    var latestDept   = {};
    var closedDate   = {};

    data.forEach(function(r) {
      var tn   = String(r[ML.TICKET_NO  - 1] || '').trim();
      var dept = String(r[ML.DEPT       - 1] || '').trim();
      if (!tn) return;
      if (!user.isAdmin && user.ownedDepts.indexOf(dept) === -1) return;

      var ts = r[ML.TIMESTAMP - 1];
      if (!firstAction[tn] && ts) firstAction[tn] = ts;

      var st = String(r[ML.STATUS - 1] || '').trim().toUpperCase();
      latestStatus[tn] = st;
      latestDept[tn]   = dept;
      if ((st === 'CLOSED' || st === 'COMPLETE') && r[ML.DATE_CLOSED - 1]) {
        closedDate[tn] = r[ML.DATE_CLOSED - 1];
      }
    });

    function monthLabel(d) {
      if (!d) return '';
      var dt = d instanceof Date ? d : new Date(d);
      if (isNaN(dt)) return '';
      return Utilities.formatDate(dt, tz, 'MMM yyyy');
    }

    Object.keys(firstAction).forEach(function(tn) {
      var lbl = monthLabel(firstAction[tn]);
      if (opened[lbl] !== undefined) opened[lbl]++;
    });

    Object.keys(closedDate).forEach(function(tn) {
      var lbl = monthLabel(closedDate[tn]);
      if (closed[lbl] !== undefined) closed[lbl]++;
    });

    return {
      labels:  months,
      opened:  months.map(function(l) { return opened[l]; }),
      closed:  months.map(function(l) { return closed[l]; })
    };
  } catch (e) {
    Logger.log('getDashboardTrend error: ' + e.message);
    return _emptyTrend_(monthCount);
  }
}

function _emptyTrend_(n) {
  var tz     = Session.getScriptTimeZone();
  var labels = [];
  var now    = new Date();
  for (var i = n - 1; i >= 0; i--) {
    labels.push(Utilities.formatDate(new Date(now.getFullYear(), now.getMonth() - i, 1), tz, 'MMM yyyy'));
  }
  var zeros = labels.map(function() { return 0; });
  return { labels: labels, opened: zeros, closed: zeros };
}
