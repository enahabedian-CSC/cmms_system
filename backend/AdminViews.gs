// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  AdminViews.gs — CSC CMMS v5.0                                          ║
// ║  Read-only data for admin screens.  All writes go through Edit-in-Sheet.║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  getAdminViewData
//  view: 'config' | 'access' | 'deptmap'
//  Returns the sheet data + the spreadsheet URL for the "Edit in Sheet" button.
// ═══════════════════════════════════════════════════════════════════════════════

function getAdminViewData(view) {
  requireAdmin_();
  var ss       = getBoundSS_();
  var sheetUrl = ss.getUrl();

  if (view === 'config') {
    var cfgSh = ss.getSheetByName(SH.CONFIG);
    var rows  = [];
    if (cfgSh && cfgSh.getLastRow() >= 2) {
      cfgSh.getRange('C2:D30').getValues().forEach(function(r) {
        var key = String(r[0] || '').trim();
        if (!key) return;
        rows.push({ key: key, value: String(r[1] !== null && r[1] !== undefined ? r[1] : '').trim() });
      });
    }
    return {
      view:     'config',
      rows:     rows,
      sheetUrl: sheetUrl,
      sheetTab: encodeURIComponent(SH.CONFIG)
    };
  }

  if (view === 'access') {
    var mgrs = getManagerConfig();
    return {
      view:     'access',
      managers: mgrs,
      sheetUrl: sheetUrl,
      sheetTab: encodeURIComponent(SH.MANAGER_ACCESS)
    };
  }

  if (view === 'deptmap') {
    var dmSh = ss.getSheetByName(SH.DEPT_MAP);
    var rows = [];
    if (dmSh && dmSh.getLastRow() >= 2) {
      dmSh.getRange(2, 1, dmSh.getLastRow() - 1, 2).getValues().forEach(function(r) {
        var src = String(r[0] || '').trim();
        if (!src) return;
        rows.push({ src: src, dest: String(r[1] || '').trim() });
      });
    }
    return {
      view:     'deptmap',
      rows:     rows,
      sheetUrl: sheetUrl,
      sheetTab: encodeURIComponent(SH.DEPT_MAP)
    };
  }

  if (view === 'techdir') {
    var tdSh = ss.getSheetByName(SH.TECH_DIR);
    var rows = [];
    if (tdSh && tdSh.getLastRow() >= 2) {
      tdSh.getRange(2, 1, tdSh.getLastRow() - 1, 4).getValues().forEach(function(r) {
        var name = String(r[0] || '').trim();
        if (!name) return;
        rows.push({
          name:   name,
          email:  String(r[1] || '').trim(),
          dept:   String(r[2] || '').trim(),
          active: String(r[3] !== undefined ? r[3] : 'Y').trim().toUpperCase() !== 'N' ? 'Y' : 'N'
        });
      });
    }
    return {
      view:     'techdir',
      rows:     rows,
      tabExists: !!tdSh,
      sheetUrl: sheetUrl,
      sheetTab: tdSh ? encodeURIComponent(SH.TECH_DIR) : ''
    };
  }

  return { view: view, rows: [], sheetUrl: sheetUrl };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  repairTrackerGroup
//  One-time admin utility: re-normalizes TRACKER_GROUP (col 34) on all ML rows
//  using the current Dept Map.  Corrects historical rows imported before the
//  Dept Map was fully populated.  Does NOT modify any audit-trail columns.
// ═══════════════════════════════════════════════════════════════════════════════

function repairTrackerGroup() {
  requireAdmin_();
  var ss = getBoundSS_();
  var sh = ss.getSheetByName(SH.MASTER_LOG);
  if (!sh || sh.getLastRow() < 2) return { success: false, error: 'Master Log empty' };

  try {
    _deptMappingCache_ = null; // force fresh map read
    var lastRow = sh.getLastRow();
    var depts   = sh.getRange(2, ML.DEPT, lastRow - 1, 1).getValues();
    var updates = depts.map(function(r) {
      return [normalizeDept(String(r[0] || ''))];
    });
    sh.getRange(2, ML.TRACKER_GROUP, lastRow - 1, 1).setValues(updates);
    return { success: true, rowsRepaired: lastRow - 1 };
  } catch (e) {
    Logger.log('repairTrackerGroup error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  setupTechDirectoryTab
//  Creates the 👷 Tech Directory sheet tab with correct headers and a sample row.
//  Safe to call multiple times — returns error if tab already exists.
// ═══════════════════════════════════════════════════════════════════════════════

function setupTechDirectoryTab() {
  requireAdmin_();
  var ss = getBoundSS_();
  if (ss.getSheetByName(SH.TECH_DIR)) {
    return { success: false, error: '👷 Tech Directory tab already exists — edit it directly in the sheet.' };
  }
  try {
    var sh = ss.insertSheet(SH.TECH_DIR);
    sh.getRange(1, 1, 1, 4).setValues([['Tech Name', 'Email', 'Department', 'Active']]);
    sh.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#F1F3F6');
    sh.setFrozenRows(1);
    sh.setColumnWidths(1, 1, 200);
    sh.setColumnWidths(2, 1, 240);
    sh.setColumnWidths(3, 1, 160);
    sh.setColumnWidths(4, 1, 70);
    sh.getRange(2, 1, 1, 4).setValues([['Sample Tech', 'sample@cscmfg.com', 'METALS', 'Y']]);
    sh.getRange(2, 1, 1, 4).setFontColor('#999999').setFontStyle('italic');
    return { success: true, sheetUrl: ss.getUrl() };
  } catch (e) {
    Logger.log('setupTechDirectoryTab error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  getTechWorkBoardData
//  Returns open/active tickets for the Tech Work Board page.
//  Managers see all tickets for their owned depts.
//  Techs see only tickets assigned to them (matched by display name).
// ═══════════════════════════════════════════════════════════════════════════════

function getTechWorkBoardData() {
  var user = requireRole_(ROLES.TECH);

  try {
    var ml = getBoundSS_().getSheetByName(SH.MASTER_LOG);
    if (!ml || ml.getLastRow() < 2) {
      return { tickets: [], userDisplayName: user.displayName, isManager: user.isManager || user.isAdmin };
    }

    var activeStatuses = ['OPEN', 'PENDING VERIFICATION', 'PENDING PARTS', 'ON HOLD'];
    var deptFilter = null;
    if (!user.isAdmin && user.isManager && user.ownedDepts && user.ownedDepts.length > 0) {
      deptFilter = user.ownedDepts;
    }

    var data    = ml.getRange(2, 1, ml.getLastRow() - 1, ML_COLS).getValues();
    var tickets = _mergeAndFilter_(data, activeStatuses, deptFilter, 500);

    if (!user.isManager && !user.isAdmin) {
      var myName = user.displayName.toLowerCase().trim();
      tickets = tickets.filter(function(t) {
        return t.assignedTo && t.assignedTo.toLowerCase().trim() === myName;
      });
    }

    return {
      tickets:         tickets,
      userDisplayName: user.displayName,
      isManager:       user.isManager || user.isAdmin
    };
  } catch (e) {
    Logger.log('getTechWorkBoardData error: ' + e.message);
    return { tickets: [], userDisplayName: '', isManager: false };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  monthlyRollover
//  Removes CLOSED and VOIDED rows from dept tracker sheets.
//  Managers process their own depts; admins may pass data.dept to scope it.
//  Priority Watch List rows (8-27) are cleared in-place (fixed layout).
//  All Open Tickets rows (30+) are deleted bottom-to-top.
//  Writes one ML audit row per dept where rows were actually removed.
// ═══════════════════════════════════════════════════════════════════════════════

function monthlyRollover(data) {
  requireManager_();
  var user = getCurrentUserInfo();
  var now  = new Date();
  data = data || {};

  var allOwned = user.isAdmin
    ? DEPT_TRACKERS.map(function(dt) { return dt.dept; })
    : (user.ownedDepts || []);

  var toProcess;
  if (data.dept) {
    var norm = normalizeDept(String(data.dept));
    if (!user.isAdmin && allOwned.indexOf(norm) < 0) {
      return { success: false, error: 'Not authorized for: ' + norm };
    }
    toProcess = DEPT_TRACKERS.filter(function(dt) { return dt.dept === norm; });
  } else {
    toProcess = DEPT_TRACKERS.filter(function(dt) { return allOwned.indexOf(dt.dept) >= 0; });
  }

  if (toProcess.length === 0) {
    return { success: false, error: 'No matching dept trackers found' };
  }

  var ss       = getBoundSS_();
  var TERMINAL = ['CLOSED', 'VOIDED'];
  var totalRemoved = 0;
  var results      = [];

  toProcess.forEach(function(dt) {
    var sh = ss.getSheetByName(dt.name);
    if (!sh) {
      results.push({ dept: dt.dept, removed: 0, error: 'Sheet not found' });
      return;
    }

    var lastRow = sh.getLastRow();
    var removed = 0;

    // ── Priority Watch List (rows 8-27): clear closed/voided rows in-place ──
    var priEnd = Math.min(TRACKER_PRIO_END, lastRow);
    if (priEnd >= TRACKER_PRIO_START) {
      var priData = sh.getRange(TRACKER_PRIO_START, TK_DATA_COL,
        priEnd - TRACKER_PRIO_START + 1, TK_COLS).getValues();
      for (var p = 0; p < priData.length; p++) {
        if (!String(priData[p][TK.TICKET_NO - 1] || '').trim()) continue;
        if (TERMINAL.indexOf(String(priData[p][TK.STATUS - 1] || '').trim().toUpperCase()) >= 0) {
          sh.getRange(TRACKER_PRIO_START + p, TK_DATA_COL, 1, TK_COLS).clearContent();
          removed++;
        }
      }
    }

    // ── All Open Tickets (rows 30+): delete closed/voided rows bottom→top ───
    if (lastRow >= TRACKER_OPEN_START) {
      var openData = sh.getRange(TRACKER_OPEN_START, TK_DATA_COL,
        lastRow - TRACKER_OPEN_START + 1, TK_COLS).getValues();
      var rowsToDelete = [];
      for (var o = 0; o < openData.length; o++) {
        if (!String(openData[o][TK.TICKET_NO - 1] || '').trim()) continue;
        if (TERMINAL.indexOf(String(openData[o][TK.STATUS - 1] || '').trim().toUpperCase()) >= 0) {
          rowsToDelete.push(TRACKER_OPEN_START + o);
        }
      }
      for (var d = rowsToDelete.length - 1; d >= 0; d--) {
        sh.deleteRow(rowsToDelete[d]);
        removed++;
      }
    }

    totalRemoved += removed;
    results.push({ dept: dt.dept, removed: removed });

    if (removed > 0) {
      appendToMasterLog_({
        ticketNo:  '',
        now:       now,
        action:    ML_ACTIONS.MONTH_ROLLOVER,
        status:    '',
        dept:      dt.dept,
        updatedBy: user.displayName,
        notes:     removed + ' closed/voided ticket(s) removed from ' + dt.name
      });
    }
  });

  return {
    success:      true,
    totalRemoved: totalRemoved,
    results:      results,
    performedBy:  user.displayName,
    timestamp:    formatDateStr_(now)
  };
}
