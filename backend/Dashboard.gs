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

    // Week start = most recent Monday (or today if Monday)
    var weekStart = new Date(thirtyDaysAgo);
    weekStart.setTime(new Date().getTime());
    weekStart.setHours(0, 0, 0, 0);
    var dayOfWeek = weekStart.getDay(); // 0=Sun, 1=Mon…
    weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    var nowM = new Date();
    var monthStart = new Date(nowM.getFullYear(), nowM.getMonth(), 1);

    // Track latest status per ticket (last ML row wins)
    var latestStatus   = {};
    var latestPriority = {};
    var latestDept     = {};
    var latestClosed   = {};
    var latestOpened   = {};

    data.forEach(function(r) {
      var tn   = String(r[ML.TICKET_NO  - 1] || '').trim();
      var dept = String(r[ML.DEPT       - 1] || '').trim();
      if (!tn) return;
      // dept-scope filter
      if (!user.isAdmin && user.ownedDepts.indexOf(dept) === -1) return;
      // Last NON-EMPTY wins (matches the tracker/panel queues). Absolute
      // last-write-wins let a trailing blank-status row overwrite a real status
      // with '', silently dropping open tickets from the count.
      var st = String(r[ML.STATUS   - 1] || '').trim().toUpperCase();
      if (st) latestStatus[tn] = st;
      var pr = String(r[ML.PRIORITY - 1] || '').trim().toUpperCase();
      if (pr) latestPriority[tn] = pr;
      latestDept[tn]     = dept;
      if (r[ML.DATE_CLOSED - 1]) latestClosed[tn] = r[ML.DATE_CLOSED - 1];
      if (r[ML.DATE_OPENED - 1]) latestOpened[tn] = r[ML.DATE_OPENED - 1];
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
        if (!isNaN(cd) && cd >= weekStart) counts.closedThisWeek++;
        if (!isNaN(cd) && cd >= monthStart) counts.closedThisMonth++;
      }
      if (latestOpened[tn]) {
        var od = latestOpened[tn] instanceof Date ? latestOpened[tn] : new Date(latestOpened[tn]);
        if (!isNaN(od) && od >= weekStart)  counts.openedThisWeek++;
        if (!isNaN(od) && od >= monthStart) counts.openedThisMonth++;
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
  return { open: 0, waiting: 0, critical: 0, tempFixActive: 0, closedRecent: 0, partsPending: 0,
           closedThisWeek: 0, openedThisWeek: 0, openedThisMonth: 0, closedThisMonth: 0 };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  getDashboardPanels
//  Returns rich panel data for the dashboard layout:
//    attentionItems — tickets needing manager action (WAITING, PENDING VERIFY,
//                     temp fixes PAST DUE)
//    openTickets    — up to 10 open tickets for the manager's depts
//    holdTags       — active equipment hold tags
//  Scoped to the calling user's owned departments.
// ═══════════════════════════════════════════════════════════════════════════════

function getDashboardPanels() {
  requireManager_();
  var user = getCurrentUserInfo();

  try {
    var ss  = getBoundSS_();
    var ml  = ss.getSheetByName(SH.MASTER_LOG);
    var tz  = Session.getScriptTimeZone();
    if (!ml || ml.getLastRow() < 2) return _emptyPanels_();

    var data = ml.getRange(2, 1, ml.getLastRow() - 1, ML_COLS).getValues();

    // Collapse ML rows per ticket (latest row wins for mutable fields)
    var byTicket = {};
    data.forEach(function(r) {
      var tn = String(r[ML.TICKET_NO - 1] || '').trim();
      if (!tn) return;
      var dept = String(r[ML.DEPT - 1] || '').trim();
      if (!user.isAdmin && user.ownedDepts.indexOf(dept) === -1) return;
      if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
      // merge: later non-empty values overwrite
      var cur = byTicket[tn];
      for (var c = 0; c < r.length; c++) {
        if (r[c] !== '' && r[c] !== null && r[c] !== undefined) cur[c] = r[c];
      }
    });

    function fmtDate(v) {
      if (!v) return '';
      if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz, 'MM/dd/yyyy');
      return String(v);
    }

    var attentionItems = [];
    var openTickets    = [];
    var prioOrder      = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, '': 4 };

    var allTickets = Object.keys(byTicket).map(function(tn) { return byTicket[tn]; });
    allTickets.sort(function(a, b) {
      var pa = prioOrder[String(a[ML.PRIORITY - 1] || '').toUpperCase()] || 4;
      var pb = prioOrder[String(b[ML.PRIORITY - 1] || '').toUpperCase()] || 4;
      return pa - pb;
    });

    allTickets.forEach(function(r) {
      var tn     = String(r[ML.TICKET_NO     - 1] || '').trim();
      var status = String(r[ML.STATUS        - 1] || '').trim().toUpperCase();
      var prio   = String(r[ML.PRIORITY      - 1] || '').trim().toUpperCase();
      var equip  = String(r[ML.SPECIFIC_EQUIP- 1] || '').trim();
      var code   = String(r[ML.EQUIP_CODE    - 1] || '').trim();
      var dept   = String(r[ML.DEPT          - 1] || '').trim();
      var desc   = String(r[ML.DESCRIPTION   - 1] || '').trim();
      var opened = fmtDate(r[ML.DATE_OPENED  - 1]);

      if (status === 'WAITING') {
        if (attentionItems.length < 8) {
          attentionItems.push({
            kind: 'review', ticketNo: tn,
            title: (equip || desc || tn),
            sub: dept + (code ? ' · ' + code : '') + (prio ? ' · ' + prio + ' priority' : '') + ' — awaiting approval',
            action: 'Approve', pageTarget: 'waiting'
          });
        }
      } else if (status === 'PENDING VERIFICATION') {
        if (attentionItems.length < 8) {
          attentionItems.push({
            kind: 'complete', ticketNo: tn,
            title: (equip || desc || tn),
            sub: dept + (code ? ' · ' + code : '') + ' — awaiting your verification & service-report signoff',
            action: 'Verify', pageTarget: 'open'
          });
        }
      }

      // Collect open tickets for the table panel (first 10, priority-sorted)
      var openStatuses = ['OPEN', 'PENDING PARTS', 'ON HOLD', 'PENDING VERIFICATION'];
      if (openStatuses.indexOf(status) >= 0 && openTickets.length < 10) {
        openTickets.push({
          ticketNo:     tn,
          status:       status,
          priority:     prio,
          dept:         dept,
          equipCode:    code,
          specificEquip:equip,
          description:  desc,
          assignedTo:   String(r[ML.ASSIGNED_TO - 1] || '').trim(),
          dateOpened:   opened,
          tempFixFlag:  String(r[ML.TEMP_FIX_FLAG - 1] || '') === 'Y'
        });
      }
    });

    // Temp fix PAST DUE items → attention
    var tfSh = ss.getSheetByName(SH.TEMP_FIX);
    if (tfSh && tfSh.getLastRow() > HIST_HEADER_ROW) {
      var tfData = tfSh.getRange(HIST_HEADER_ROW + 1, 1,
        tfSh.getLastRow() - HIST_HEADER_ROW, TF_COLS).getValues();
      tfData.forEach(function(r) {
        var tempId = String(r[TF.TEMP_ID - 1] || '').trim();
        if (!tempId) return;
        var dept   = String(r[TF.DEPT   - 1] || '').trim();
        if (!user.isAdmin && user.ownedDepts.indexOf(dept) < 0) return;
        var status = String(r[TF.STATUS - 1] || '').trim().toUpperCase();
        if (status !== 'PAST DUE') return;
        var tn    = String(r[TF.TICKET_NO      - 1] || '');
        var equip = String(r[TF.SPECIFIC_EQUIP - 1] || '');
        var due   = fmtDate(r[TF.NEXT_DUE      - 1]);
        if (attentionItems.length < 8) {
          attentionItems.push({
            kind: 'temp', ticketNo: tn,
            title: tempId + (equip ? ' — ' + equip : ''),
            sub: dept + ' · Temp fix PAST DUE' + (due ? ' (due ' + due + ')' : '') + ' — Maintenance Program 030',
            action: 'Inspect', pageTarget: 'tempfix'
          });
        }
      });
    }

    // Active equipment hold tags
    var holdTags = [];
    var ehlSh = ss.getSheetByName(SH.EQUIP_HOLD_LOG);
    if (ehlSh && ehlSh.getLastRow() > HIST_HEADER_ROW) {
      var ehlData = ehlSh.getRange(HIST_HEADER_ROW + 1, 1,
        ehlSh.getLastRow() - HIST_HEADER_ROW, EHL_COLS).getValues();
      ehlData.forEach(function(r) {
        var tagId = String(r[EHL.TAG_ID  - 1] || '').trim();
        if (!tagId) return;
        var dept  = String(r[EHL.DEPT   - 1] || '').trim();
        if (!user.isAdmin && user.ownedDepts.indexOf(dept) < 0) return;
        var equSt = String(r[EHL.EQUIP_STATUS - 1] || '').trim().toUpperCase();
        if (equSt === 'CLEARED') return;
        holdTags.push({
          tagId:        tagId,
          ticketNo:     String(r[EHL.TICKET_NO      - 1] || ''),
          equipCode:    String(r[EHL.EQUIP_CODE     - 1] || ''),
          specificEquip:String(r[EHL.SPECIFIC_EQUIP - 1] || ''),
          tagType:      String(r[EHL.TAG_TYPE       - 1] || ''),
          dateTagged:   fmtDate(r[EHL.DATE_TAGGED   - 1]),
          reason:       String(r[EHL.REASON         - 1] || ''),
          dept:         dept
        });
      });
    }

    // Pending joint attachment requests for user's depts
    // (separate scan — primary-dept filter above would exclude these tickets)
    var pendingJointMap = {};
    data.forEach(function(r) {
      var tn = String(r[ML.TICKET_NO - 1] || '').trim();
      if (!tn) return;
      var pendStr = String(r[ML.PENDING_JOINT_DEPTS - 1] || '').trim();
      if (!pendStr) return;
      var pendList = pendStr.split(',').map(function(d) { return d.trim(); }).filter(Boolean);
      var myPend = user.isAdmin
        ? pendList
        : pendList.filter(function(d) { return (user.ownedDepts || []).indexOf(d) >= 0; });
      if (myPend.length === 0) return;
      if (!pendingJointMap[tn]) {
        pendingJointMap[tn] = { row: r.slice(), myDepts: myPend };
      } else {
        var cur = pendingJointMap[tn];
        for (var c = 0; c < r.length; c++) {
          if (r[c] !== '' && r[c] !== null && r[c] !== undefined) cur.row[c] = r[c];
        }
        cur.myDepts = myPend;  // refresh from latest row
      }
    });

    var pendingJointRequests = Object.keys(pendingJointMap).map(function(tn) {
      var entry = pendingJointMap[tn];
      var r = entry.row;
      var equip = String(r[ML.SPECIFIC_EQUIP - 1] || '').trim();
      var code  = String(r[ML.EQUIP_CODE     - 1] || '').trim();
      var desc  = String(r[ML.DESCRIPTION    - 1] || '').trim();
      var fromDept = String(r[ML.DEPT        - 1] || '').trim();
      var deptStr  = entry.myDepts.join(', ');
      return {
        kind: 'joint-request', ticketNo: tn,
        title: equip || desc || tn,
        sub:   fromDept + (code ? ' · ' + code : '') + ' — requesting your dept: ' + deptStr,
        action: 'Review'
      };
    });

    // C09: chronic equipment — equipment with 3+ distinct tickets in the last 90 days.
    // Threshold matches Izzy's reference code: if(tix.length >= 3).
    // Dept-scoped the same way as attentionItems (user.ownedDepts filter).
    var CHRONIC_THRESHOLD = 3;
    var cutoff90 = new Date();
    cutoff90.setDate(cutoff90.getDate() - 90);

    var equipTickets = {};  // equipCode → { dept, equip, ticketSet:{} }
    data.forEach(function(r) {
      var tn    = String(r[ML.TICKET_NO      - 1] || '').trim();
      var dept  = String(r[ML.DEPT           - 1] || '').trim();
      var code  = String(r[ML.EQUIP_CODE     - 1] || '').trim();
      var equip = String(r[ML.SPECIFIC_EQUIP - 1] || '').trim();
      if (!tn || !code) return;
      if (!user.isAdmin && user.ownedDepts.indexOf(dept) === -1) return;
      var doVal  = r[ML.DATE_OPENED - 1];
      if (!doVal) return;
      var doDate = doVal instanceof Date ? doVal : new Date(doVal);
      if (isNaN(doDate) || doDate < cutoff90) return;
      if (!equipTickets[code]) equipTickets[code] = { dept: dept, equip: equip || code, ticketSet: {} };
      equipTickets[code].ticketSet[tn] = true;
    });

    var chronicEquipment = [];
    Object.keys(equipTickets).forEach(function(code) {
      var entry = equipTickets[code];
      var count = Object.keys(entry.ticketSet).length;
      if (count >= CHRONIC_THRESHOLD) {
        chronicEquipment.push({
          kind:       'chronic',
          ticketNo:   code,       // equipment code — displayed in mono font in the attention row
          title:      entry.equip,
          sub:        entry.dept + ' · ' + count + ' ticket' + (count !== 1 ? 's' : '') + ' in the last 90 days — chronic equipment alert',
          action:     'View Open',
          pageTarget: 'open',
          count:      count
        });
      }
    });
    chronicEquipment.sort(function(a, b) { return b.count - a.count; });

    return { attentionItems: attentionItems, openTickets: openTickets, holdTags: holdTags,
             pendingJointRequests: pendingJointRequests,
             chronicEquipment: chronicEquipment };
  } catch (e) {
    Logger.log('getDashboardPanels error: ' + e.message);
    return _emptyPanels_();
  }
}

function _emptyPanels_() {
  return { attentionItems: [], openTickets: [], holdTags: [], pendingJointRequests: [], chronicEquipment: [] };
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

// ═══════════════════════════════════════════════════════════════════════════════
//  getEquipQuickStats
//  Returns a lightweight summary of recent ticket activity for a given
//  equipment code — used by the Submit Ticket "Heads Up" panel.
//  Caller must be at least MANAGER level.
// ═══════════════════════════════════════════════════════════════════════════════
function getEquipQuickStats(equipCode) {
  if (!equipCode) return null;
  requireManager_();
  try {
    var ss  = getBoundSS_();
    var ml  = ss.getSheetByName(SH.MASTER_LOG);
    if (!ml || ml.getLastRow() < 2) return { count60d: 0, topProbType: null, lastDate: null };

    var tz      = Session.getScriptTimeZone();
    var cutoff  = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    var data    = ml.getRange(2, 1, ml.getLastRow() - 1, ML_COLS).getValues();
    var byTicket = {};

    data.forEach(function(r) {
      var tn = String(r[ML.TICKET_NO  - 1] || '').trim();
      var ec = String(r[ML.EQUIP_CODE - 1] || '').trim();
      if (!tn || ec.toUpperCase() !== equipCode.trim().toUpperCase()) return;
      if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
      var cur = byTicket[tn];
      for (var c = 0; c < r.length; c++) {
        if (r[c] !== '' && r[c] !== null && r[c] !== undefined) cur[c] = r[c];
      }
    });

    var count60d = 0;
    var probTypes = {};
    var lastDate  = null;

    Object.keys(byTicket).forEach(function(tn) {
      var r  = byTicket[tn];
      var do_ = r[ML.DATE_OPENED - 1];
      if (!(do_ instanceof Date) || isNaN(do_) || do_ < cutoff) return;
      count60d++;
      var pt = String(r[ML.PROBLEM_TYPE - 1] || '').trim();
      if (pt) probTypes[pt] = (probTypes[pt] || 0) + 1;
      if (!lastDate || do_ > lastDate) lastDate = do_;
    });

    var topProbType = null;
    var maxCt = 0;
    Object.keys(probTypes).forEach(function(pt) {
      if (probTypes[pt] > maxCt) { maxCt = probTypes[pt]; topProbType = pt; }
    });

    return {
      count60d:    count60d,
      topProbType: topProbType,
      lastDate:    lastDate ? Utilities.formatDate(lastDate, tz, 'MM/dd/yyyy') : null
    };
  } catch (e) {
    Logger.log('getEquipQuickStats error: ' + e.message);
    return null;
  }
}
