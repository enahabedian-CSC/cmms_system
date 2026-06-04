// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Reports.gs — CSC CMMS v5.0                                             ║
// ║  Ticket activity summary and SQF-ready report data (manager-only).     ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  getReportData
//  Returns dept-level summary stats, filtered ticket list, and all KPI
//  analytics needed by the reports page (see design/09-reports.jsx).
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

  // Trend window: always 12 weeks regardless of daysBack
  var trendCutoff = new Date();
  trendCutoff.setDate(trendCutoff.getDate() - 84);

  var deptFilter = opts.dept ? normalizeDept(opts.dept) : null;
  if (!deptFilter && !user.isAdmin && user.ownedDepts && user.ownedDepts.length > 0) {
    deptFilter = user.ownedDepts;
  }

  try {
    var ss = getBoundSS_();
    var ml = ss.getSheetByName(SH.MASTER_LOG);
    if (!ml || ml.getLastRow() < 2) return _emptyReport_(daysBack);
    var tz   = Session.getScriptTimeZone();
    var data = ml.getRange(2, 1, ml.getLastRow() - 1, ML_COLS).getValues();

    // ── Build best-row map (all tickets, no time filter at this stage) ────────
    var rowsByTicket = {};
    data.forEach(function(r) {
      var tn   = String(r[ML.TICKET_NO - 1] || '').trim();
      var dept = String(r[ML.DEPT      - 1] || '').trim();
      if (!tn) return;
      if (deptFilter) {
        if (Array.isArray(deptFilter) ? deptFilter.indexOf(dept) < 0 : dept !== deptFilter) return;
      }
      if (!rowsByTicket[tn]) rowsByTicket[tn] = { first: r, rows: [] };
      rowsByTicket[tn].rows.push(r);
    });

    var activeStatuses = { 'OPEN':1, 'WAITING':1, 'PENDING VERIFICATION':1,
                           'PENDING PARTS':1, 'ON HOLD':1 };

    function fmtDate(v) {
      if (!v) return '';
      var d = v instanceof Date ? v : new Date(v);
      if (isNaN(d)) return String(v || '');
      return Utilities.formatDate(d, tz, 'MM/dd/yyyy');
    }

    function toDate(v) {
      if (!v) return null;
      var d = v instanceof Date ? v : new Date(v);
      return isNaN(d) ? null : d;
    }

    function weekKey(d) {
      // ISO-ish: Monday-anchored week label 'MM/DD'
      var day = new Date(d);
      day.setHours(0, 0, 0, 0);
      var dow = day.getDay(); // 0=Sun
      var diff = dow === 0 ? 6 : dow - 1;
      day.setDate(day.getDate() - diff);
      return Utilities.formatDate(day, tz, 'MM/dd');
    }

    var deptStats = {};
    var tickets   = [];

    // KPI accumulators
    var kpis = { totalOpen:0, critical:0, avgTimeToCloseSum:0, avgTimeToCloseCount:0,
                 tempFix:0, partsPending:0, closedThisPeriod:0 };
    var statusFunnel = { waiting:0, open:0, pendingVerify:0, pendingParts:0, onHold:0, closed:0, voided:0 };
    var trendOpened = {}, trendClosed = {};
    var equipCounts = {}, equipHeatmap = {}, buildingCounts = {}, problemCounts = {};
    var teamStats = {};

    for (var tn in rowsByTicket) {
      var entry  = rowsByTicket[tn];
      var rows   = entry.rows;
      var firstR = entry.first;

      // Merge rows: take last non-empty value per column
      var best = rows[0].slice();
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        for (var c = 0; c < row.length; c++) {
          if (row[c] !== '' && row[c] !== null && row[c] !== undefined) best[c] = row[c];
        }
      }

      var status     = String(best[ML.STATUS    - 1] || '').trim().toUpperCase();
      var priority   = String(best[ML.PRIORITY  - 1] || '').trim().toUpperCase();
      var dept       = String(best[ML.DEPT      - 1] || '').trim();
      var equipCode  = String(best[ML.EQUIP_CODE     - 1] || '').trim();
      var equipType  = String(best[ML.EQUIP_TYPE     - 1] || '').trim();
      var specEquip  = String(best[ML.SPECIFIC_EQUIP - 1] || '').trim();
      var bz         = String(best[ML.BUILDING_ZONE  - 1] || '').trim();
      var assignedTo = String(best[ML.ASSIGNED_TO    - 1] || '').trim();
      var probType   = String(best[ML.PROBLEM_TYPE   - 1] || '').trim();
      var dateOpened = toDate(firstR[ML.DATE_OPENED  - 1] || firstR[ML.TIMESTAMP - 1]);
      var dateClosed = toDate(best[ML.DATE_CLOSED    - 1]);
      var actualHrs  = parseFloat(best[ML.ACTUAL_HOURS - 1] || 0) || 0;
      var isTempFix  = String(best[ML.TEMP_FIX_FLAG - 1] || '') === 'Y';
      var partsY     = String(best[ML.PARTS_NEEDED  - 1] || '') === 'Y';

      // ── Window filter for ticket list + dept stats ─────────────────────────
      var inWindow = false;
      if (activeStatuses[status]) {
        inWindow = true;
      } else {
        if (dateClosed && dateClosed >= cutoff) inWindow = true;
        if (!inWindow && dateOpened && dateOpened >= cutoff) inWindow = true;
      }

      // ── Status funnel (ALL tickets, no window) ─────────────────────────────
      var sUpper = status;
      if (sUpper === 'WAITING')              statusFunnel.waiting++;
      else if (sUpper === 'OPEN' || sUpper === 'ON HOLD') statusFunnel.open++;
      else if (sUpper === 'PENDING VERIFICATION') statusFunnel.pendingVerify++;
      else if (sUpper === 'PENDING PARTS')    statusFunnel.pendingParts++;
      else if (sUpper === 'CLOSED' || sUpper === 'COMPLETE') statusFunnel.closed++;
      else if (sUpper === 'VOIDED')           statusFunnel.voided++;

      // ── Trend: 12-week window ─────────────────────────────────────────────
      if (dateOpened && dateOpened >= trendCutoff) {
        var wk = weekKey(dateOpened);
        trendOpened[wk] = (trendOpened[wk] || 0) + 1;
      }
      if (dateClosed && dateClosed >= trendCutoff) {
        var wkc = weekKey(dateClosed);
        trendClosed[wkc] = (trendClosed[wkc] || 0) + 1;
      }

      if (!inWindow) continue;

      // ── Dept stats ─────────────────────────────────────────────────────────
      if (!deptStats[dept]) {
        deptStats[dept] = { dept:dept, open:0, waiting:0, closed:0, critical:0,
                            tempFix:0, totalHours:0 };
      }
      if (activeStatuses[status]) {
        if (status !== 'WAITING') deptStats[dept].open++;
        else deptStats[dept].waiting++;
        if (priority === 'CRITICAL') deptStats[dept].critical++;
      }
      if (status === 'CLOSED' || status === 'COMPLETE') deptStats[dept].closed++;
      if (isTempFix) deptStats[dept].tempFix++;
      deptStats[dept].totalHours += actualHrs;

      // ── Global KPIs ────────────────────────────────────────────────────────
      if (activeStatuses[status]) {
        kpis.totalOpen++;
        if (priority === 'CRITICAL') kpis.critical++;
        if (isTempFix) kpis.tempFix++;
        if (partsY) kpis.partsPending++;
      }
      if ((status === 'CLOSED' || status === 'COMPLETE') && dateClosed) {
        kpis.closedThisPeriod++;
        if (dateOpened) {
          var hrs = (dateClosed.getTime() - dateOpened.getTime()) / 3600000;
          if (hrs >= 0) {
            kpis.avgTimeToCloseSum   += hrs;
            kpis.avgTimeToCloseCount++;
          }
        }
      }

      // ── Equipment hotspots ─────────────────────────────────────────────────
      if (equipCode) {
        var ek = equipCode + (specEquip ? '|' + specEquip : '');
        if (!equipCounts[ek]) equipCounts[ek] = { equipCode:equipCode, specificEquip:specEquip, dept:dept, count:0 };
        equipCounts[ek].count++;
      }

      // ── Equipment heatmap (dept × equipType) ──────────────────────────────
      if (dept && equipType) {
        var hk = dept + '||' + equipType;
        equipHeatmap[hk] = (equipHeatmap[hk] || 0) + 1;
      }

      // ── Building / zone heatmap ────────────────────────────────────────────
      if (bz) {
        buildingCounts[bz] = (buildingCounts[bz] || 0) + 1;
      }

      // ── Problem type frequency ─────────────────────────────────────────────
      if (probType) {
        problemCounts[probType] = (problemCounts[probType] || 0) + 1;
      }

      // ── Team workload ──────────────────────────────────────────────────────
      if (assignedTo) {
        if (!teamStats[assignedTo]) {
          teamStats[assignedTo] = { name:assignedTo, open:0, closed:0, totalHrs:0,
                                    closeTimeSum:0, closeTimeCount:0 };
        }
        if (activeStatuses[status]) teamStats[assignedTo].open++;
        if (status === 'CLOSED' || status === 'COMPLETE') {
          teamStats[assignedTo].closed++;
          teamStats[assignedTo].totalHrs += actualHrs;
          if (dateOpened && dateClosed) {
            var ct = (dateClosed.getTime() - dateOpened.getTime()) / 3600000;
            if (ct >= 0) {
              teamStats[assignedTo].closeTimeSum   += ct;
              teamStats[assignedTo].closeTimeCount++;
            }
          }
        }
      }

      // ── Ticket list ────────────────────────────────────────────────────────
      tickets.push({
        ticketNo:     tn,
        status:       status,
        priority:     priority,
        dept:         dept,
        equipType:    equipType,
        equipCode:    equipCode,
        specificEquip: specEquip,
        description:  String(best[ML.DESCRIPTION  - 1] || ''),
        assignedTo:   assignedTo,
        dateOpened:   fmtDate(dateOpened),
        dateClosed:   fmtDate(dateClosed),
        actualHours:  best[ML.ACTUAL_HOURS - 1] || '',
        fixType:      String(best[ML.FIX_TYPE      - 1] || ''),
        tempFixFlag:  isTempFix,
        addedBy:      String(best[ML.ADDED_BY      - 1] || ''),
        problemType:  probType
      });
    }

    // ── Post-process dept stats ────────────────────────────────────────────
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

    // ── KPIs final ────────────────────────────────────────────────────────
    var avgHrs = kpis.avgTimeToCloseCount > 0
      ? Math.round(kpis.avgTimeToCloseSum / kpis.avgTimeToCloseCount * 10) / 10
      : null;
    var kpisOut = {
      totalOpen:       kpis.totalOpen,
      critical:        kpis.critical,
      avgTimeToClose:  avgHrs,
      tempFix:         kpis.tempFix,
      partsPending:    kpis.partsPending,
      closedThisPeriod:kpis.closedThisPeriod
    };

    // ── Trend: build 12-week label array ──────────────────────────────────
    var trendLabels = [];
    var trendOpArr  = [];
    var trendClArr  = [];
    var tw = new Date();
    for (var w = 11; w >= 0; w--) {
      var wStart = new Date(tw);
      wStart.setDate(tw.getDate() - w * 7);
      wStart.setHours(0, 0, 0, 0);
      var dow2 = wStart.getDay();
      var diff2 = dow2 === 0 ? 6 : dow2 - 1;
      wStart.setDate(wStart.getDate() - diff2);
      var lbl = Utilities.formatDate(wStart, tz, 'MM/dd');
      trendLabels.push(lbl);
      trendOpArr.push(trendOpened[lbl]  || 0);
      trendClArr.push(trendClosed[lbl]  || 0);
    }

    // ── Equipment hotspots: top 10 ─────────────────────────────────────────
    var equipHotspots = Object.keys(equipCounts).map(function(k) {
      return equipCounts[k];
    }).sort(function(a, b) { return b.count - a.count; }).slice(0, 10);

    // ── Equipment heatmap ─────────────────────────────────────────────────
    var hDepts = [];
    var hTypes = [];
    var hMatrix = {};
    Object.keys(equipHeatmap).forEach(function(k) {
      var parts = k.split('||');
      var d = parts[0], t = parts[1];
      if (hDepts.indexOf(d) < 0) hDepts.push(d);
      if (hTypes.indexOf(t) < 0) hTypes.push(t);
      hMatrix[k] = equipHeatmap[k];
    });
    hDepts.sort();

    // ── Building heatmap: parse "Building X / Zone Y" ─────────────────────
    var bHeatmap = {};
    Object.keys(buildingCounts).forEach(function(bz) {
      var parts = bz.split(/[\/\-]/);
      var bldg = parts[0] ? parts[0].trim() : bz;
      var zone = parts[1] ? parts[1].trim() : 'General';
      var k2 = bldg + '||' + zone;
      bHeatmap[k2] = (bHeatmap[k2] || 0) + buildingCounts[bz];
    });
    var bBuildings = [], bZones = [];
    Object.keys(bHeatmap).forEach(function(k) {
      var p = k.split('||');
      if (bBuildings.indexOf(p[0]) < 0) bBuildings.push(p[0]);
      if (bZones.indexOf(p[1])     < 0) bZones.push(p[1]);
    });
    bBuildings.sort();
    bZones.sort();

    // ── Problem types: top 10 ─────────────────────────────────────────────
    var problemTypes = Object.keys(problemCounts).map(function(k) {
      return { type: k, count: problemCounts[k] };
    }).sort(function(a, b) { return b.count - a.count; }).slice(0, 10);

    // ── Team workload ─────────────────────────────────────────────────────
    var teamWorkload = Object.keys(teamStats).map(function(name) {
      var ts = teamStats[name];
      var avgClose = ts.closeTimeCount > 0
        ? Math.round(ts.closeTimeSum / ts.closeTimeCount * 10) / 10
        : null;
      return {
        name:       name,
        open:       ts.open,
        closed:     ts.closed,
        totalHrs:   Math.round(ts.totalHrs * 10) / 10,
        avgCloseHrs:avgClose
      };
    }).sort(function(a, b) { return b.open - a.open; });

    // ── SQF Compliance pack ───────────────────────────────────────────────
    var sqfVerified = 0;
    var sqfTotal    = 0;
    var sqfOpenCrit = kpis.critical;
    var sqfCaDays   = avgHrs !== null ? Math.round(avgHrs / 24 * 10) / 10 : null;

    // Count verified closed tickets in window
    data.forEach(function(r) {
      var tn2 = String(r[ML.TICKET_NO - 1] || '').trim();
      if (!tn2) return;
      var action = String(r[ML.ACTION - 1] || '').toUpperCase();
      if (action === ML_ACTIONS.MANAGER_VERIFIED.toUpperCase()) {
        var ts2 = toDate(r[ML.TIMESTAMP - 1]);
        if (ts2 && ts2 >= cutoff) {
          sqfVerified++;
        }
        sqfTotal++;
      }
    });

    var sqfPack = {
      verifiedCount:  sqfVerified,
      totalClosed:    kpis.closedThisPeriod,
      openCritical:   sqfOpenCrit,
      avgCaDays:      sqfCaDays
    };

    return {
      summary:        summary,
      tickets:        tickets,
      daysBack:       daysBack,
      generatedAt:    Utilities.formatDate(new Date(), tz, 'MM/dd/yyyy HH:mm'),
      kpis:           kpisOut,
      statusFunnel:   statusFunnel,
      trend:          { labels: trendLabels, opened: trendOpArr, closed: trendClArr },
      deptVolume:     summary.map(function(s) {
        return { dept: s.dept, count: s.open + s.waiting + s.closed };
      }),
      equipHotspots:  equipHotspots,
      equipHeatmap:   { depts: hDepts, types: hTypes, matrix: hMatrix },
      buildingHeatmap:{ buildings: bBuildings, zones: bZones, matrix: bHeatmap },
      problemTypes:   problemTypes,
      teamWorkload:   teamWorkload,
      sqfPack:        sqfPack
    };
  } catch (e) {
    Logger.log('getReportData error: ' + e.message);
    return _emptyReport_(daysBack);
  }
}

function _emptyReport_(daysBack) {
  return {
    summary: [], tickets: [], daysBack: daysBack || 30,
    generatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm'),
    kpis: { totalOpen:0, critical:0, avgTimeToClose:null, tempFix:0, partsPending:0, closedThisPeriod:0 },
    statusFunnel: { waiting:0, open:0, pendingVerify:0, pendingParts:0, onHold:0, closed:0, voided:0 },
    trend: { labels:[], opened:[], closed:[] },
    deptVolume: [],
    equipHotspots: [],
    equipHeatmap: { depts:[], types:[], matrix:{} },
    buildingHeatmap: { buildings:[], zones:[], matrix:{} },
    problemTypes: [],
    teamWorkload: [],
    sqfPack: { verifiedCount:0, totalClosed:0, openCritical:0, avgCaDays:null }
  };
}
