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

  return { view: view, rows: [], sheetUrl: sheetUrl };
}
