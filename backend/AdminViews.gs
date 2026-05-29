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
