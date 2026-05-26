// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  BACKFILL_TRACKERGROUP.gs — One-time run, then delete                   ║
// ║  Fills in Tracker Group (col 34) on all existing Master Log rows        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function backfillTrackerGroup() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sh   = ss.getSheetByName(SH.MASTER_LOG);
  if (!sh || sh.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('Master Log not found or empty.'); return;
  }

  var lastRow = sh.getLastRow();
  var depts   = sh.getRange(2, ML.DEPT, lastRow-1, 1).getValues();
  var updates = depts.map(function(r) {
    return [getDeptGroup_(String(r[0]||''))];
  });

  sh.getRange(2, ML.TRACKER_GROUP, lastRow-1, 1).setValues(updates);

  SpreadsheetApp.getActiveSpreadsheet()
    .toast('✅ Tracker Group backfilled on '+(lastRow-1)+' rows.','🔧 Backfill',5);
  SpreadsheetApp.getUi().alert(
    '✅ Done!\n\n'+(lastRow-1)+' rows updated.\n\nYou can now delete Backfill_TrackerGroup.gs.');
}