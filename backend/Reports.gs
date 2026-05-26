// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Reports.gs — CSC CMMS v5.0                                             ║
// ║  Ticket activity summary and SQF-ready report data (manager-only).     ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  getReportData
//  Returns dept-level summary stats + filtered ticket list for the reports tab.
//  opts.daysBack  — number of days to look back (default 30; max 365)
//  opts.dept      — restrict to a specific dept (optional)
// ═══════════════════════════════════════════════════════════════════════════════

function getReportData(opts) {
  requireManager_();
  opts = opts || {};
  var user     = getCurrentUserInfo();
  var daysBack = Math.min(Math.max(parseInt(opts.daysBack || 30, 10), 1), 365);
  var cutoff   = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  var deptFilter = opts.dept ? normalizeDept(opts.dept) : null;
  if (!deptFilter && !user.isAdmin && user.ownedDepts && user.ownedDepts.length > 0) {
    // default-scope to owned depts; caller can override with explicit dept='' for all
    deptFilter = user.ownedDepts; // array
  }

  try {
    var ss = getBoundSS_();
    var ml = ss.getSheetByName(SH.MASTER_LOG);
    if (!ml || ml.getLastRow() < 2) return _emptyReport_(daysBack);
    var tz   = Session.getScriptTimeZone();
    var data = ml.getRange(2, 1, ml.getLastRow() - 1, ML_COLS).getValues();

    // ── Build best-row map ─────────────────────────────────────────────────
    var rowsByTicket = {};
    data.forEach(function(r) {
      var tn   = String(r[ML.TICKET_NO - 1] || '').trim();
      var dept = String(r[ML.DEPT      - 1] || '').trim();
      if (!tn) return;
      if (deptFilter) {
        if (Array.isArray(deptFilter) ? deptFilter.indexOf(dept) < 0 : dept !== deptFilter) return;
      }
      if (!rowsByTicket[tn]) rowsByTicket[tn] = [];
      rowsByTicket[tn].push(r);
    });

    var activeStatuses = { 'OPEN':1, 'WAITING':1, 'PENDING VERIFICATION':1,
                           'PENDING PARTS':1, 'ON HOLD':1 };

    function fmtDate(v) {
      if (!v) return '';
      var d = v instanceof Date ? v : new Date(v);
      if (isNaN(d)) return String(v || '');
      return Utilities.formatDate(d, tz, 'MM/dd/yyyy');
    }

    var deptStats = {};
    var tickets   = [];

    for (var tn in rowsByTicket) {
      var rows = rowsByTicket[tn];
      var best = rows[0].slice();
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        for (var c = 0; c < row.length; c++) {
          if (row[c] !== '' && row[c] !== null && row[c] !== undefined) best[c] = row[c];
        }
      }

      var status   = String(best[ML.STATUS   - 1] || '').trim().toUpperCase();
      var priority = String(best[ML.PRIORITY - 1] || '').trim().toUpperCase();
      var dept     = String(best[ML.DEPT     - 1] || '').trim();

      // Include: active tickets regardless of age; closed/voided only if within window.
      var inWindow = false;
      if (activeStatuses[status]) {
        inWindow = true;
      } else {
        var closedVal = best[ML.DATE_CLOSED - 1];
        var cd = closedVal instanceof Date ? closedVal : (closedVal ? new Date(closedVal) : null);
        if (cd && !isNaN(cd) && cd >= cutoff) inWindow = true;

        if (!inWindow) {
          var tsVal = rows[0][ML.TIMESTAMP - 1];
          var ts = tsVal instanceof Date ? tsVal : (tsVal ? new Date(tsVal) : null);
          if (ts && !isNaN(ts) && ts >= cutoff) inWindow = true;
        }
      }
      if (!inWindow) continue;

      if (!deptStats[dept]) {
        deptStats[dept] = { dept:dept, open:0, waiting:0, closed:0, critical:0,
                            tempFix:0, totalHours:0 };
      }

      if (status === 'OPEN' || status === 'PENDING VERIFICATION' ||
          status === 'PENDING PARTS' || status === 'ON HOLD') {
        deptStats[dept].open++;
        if (priority === 'CRITICAL') deptStats[dept].critical++;
      }
      if (status === 'WAITING')  deptStats[dept].waiting++;
      if (status === 'CLOSED' || status === 'COMPLETE') deptStats[dept].closed++;
      if (String(best[ML.TEMP_FIX_FLAG - 1] || '') === 'Y') deptStats[dept].tempFix++;
      var hrs = parseFloat(best[ML.ACTUAL_HOURS - 1] || 0);
      if (!isNaN(hrs)) deptStats[dept].totalHours += hrs;

      tickets.push({
        ticketNo:     tn,
        status:       status,
        priority:     priority,
        dept:         dept,
        equipCode:    String(best[ML.EQUIP_CODE    - 1] || ''),
        specificEquip:String(best[ML.SPECIFIC_EQUIP- 1] || ''),
        description:  String(best[ML.DESCRIPTION   - 1] || ''),
        assignedTo:   String(best[ML.ASSIGNED_TO   - 1] || ''),
        dateOpened:   fmtDate(best[ML.DATE_OPENED  - 1]),
        dateClosed:   fmtDate(best[ML.DATE_CLOSED  - 1]),
        actualHours:  best[ML.ACTUAL_HOURS         - 1] || '',
        fixType:      String(best[ML.FIX_TYPE      - 1] || ''),
        tempFixFlag:  String(best[ML.TEMP_FIX_FLAG - 1] || '') === 'Y',
        addedBy:      String(best[ML.ADDED_BY      - 1] || ''),
        problemType:  String(best[ML.PROBLEM_TYPE  - 1] || '')
      });
    }

    var summary = Object.keys(deptStats).map(function(d) {
      var s = deptStats[d];
      s.totalHours = Math.round(s.totalHours * 10) / 10;
      return s;
    });
    summary.sort(function(a, b) { return a.dept.localeCompare(b.dept); });

    var priorityOrder = { 'CRITICAL':0, 'HIGH':1, 'MEDIUM':2, 'LOW':3, '':4 };
    tickets.sort(function(a, b) {
      var pa = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 4;
      var pb = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 4;
      if (pa !== pb) return pa - pb;
      return (b.dateOpened || '').localeCompare(a.dateOpened || '');
    });

    return {
      summary:  summary,
      tickets:  tickets,
      daysBack: daysBack,
      generatedAt: Utilities.formatDate(new Date(), tz, 'MM/dd/yyyy HH:mm')
    };
  } catch (e) {
    Logger.log('getReportData error: ' + e.message);
    return _emptyReport_(daysBack);
  }
}

function _emptyReport_(daysBack) {
  return {
    summary: [], tickets: [], daysBack: daysBack || 30,
    generatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm')
  };
}
