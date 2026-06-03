// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EQUIPMENT INVENTORY CACHE — CSC Maintenance Tracker v3.2              ║
// ║  Sets up and manages the IMPORTRANGE cache tab                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
 
// Cache layout:
//   Row 1: Title bar
//   Row 2: Instructions
//   Row 3: Spacer
//   Row 4+: IMPORTRANGE data starts here (formula placed at A4)
//           External sheet row 1 (headers) lands at cache row 4
//           External sheet row 2+ (data) lands at cache row 5+
//
// External sheet headers (from CSC Equipment Register):
//   Job Number | Department | Line # | Equipment Type | Equipment Description | Dept Code | Status
 
function setupEquipInventoryCache() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var ui  = SpreadsheetApp.getUi();
  var cfg = getConfig();
 
  // ── Step 1: Confirm source URL ─────────────────────────────────────────
  var sourceUrl = cfg['Equipment List Source URL'] || '';
  if (!sourceUrl) {
    ui.alert('⚠️ Equipment URL Missing',
      'Please set the Equipment List Source URL in the Configuration tab before running this setup.',
      ui.ButtonSet.OK);
    return;
  }
 
  // ── Step 2: Get or prompt for the tab name ─────────────────────────────
  var tabName = cfg['Equipment Inventory Tab Name'] || '';
  if (!tabName) {
    var resp = ui.prompt(
      'Equipment Inventory Tab Name',
      'Enter the EXACT name of the tab in the equipment spreadsheet that contains the inventory data.\n\n' +
      'Example: "Equipment List" or "Sheet1"\n\nThis is case-sensitive and must match exactly.',
      ui.ButtonSet.OK_CANCEL);
    if (resp.getSelectedButton() !== ui.Button.OK) return;
    tabName = resp.getResponseText().trim();
    if (!tabName) { ui.alert('❌ Tab name is required. Setup cancelled.'); return; }
    setConfigValue('Equipment Inventory Tab Name', tabName);
  }
 
  // ── Step 3: Get or create the cache sheet ─────────────────────────────
  var cacheSh = ss.getSheetByName(SH.EQUIP_CACHE);
  if (!cacheSh) {
    buildEquipCacheSheet_(ss);
    cacheSh = ss.getSheetByName(SH.EQUIP_CACHE);
  }
 
  // ── Step 4: Build and set the IMPORTRANGE formula at A4 ───────────────
  // Formula lands at A4 so external row 1 (headers) maps to cache row 4
  // and external data rows map to cache rows 5+
  // The column mapper in getEquipmentFromCache_() reads headers from
  // whichever row the formula lands on and data from the rows below.
  var cleanUrl = sourceUrl.split('/edit')[0].split('/view')[0];
  var formula  = '=IMPORTRANGE("' + cleanUrl + '", "' + tabName + '!A4:Z")';
 
  // Clear any old formulas and data from rows 1, 4, and 5 before setting
  cacheSh.getRange('A1').clearContent();
  cacheSh.getRange('A5').clearContent();
  cacheSh.getRange(4, 1, Math.max(cacheSh.getLastRow() - 3, 1), 8).clearContent();
 
  // Show sheet so the IMPORTRANGE authorization prompt appears
  cacheSh.showSheet();
 
  // Place formula at A4
  cacheSh.getRange('A4').setFormula(formula);
 
  // Activate the cache sheet so the user sees the auth prompt
  ss.setActiveSheet(cacheSh);
 
  ui.alert('✅ Cache Setup Complete — Action Required',
    'The equipment cache formula has been set at row 4.\n\n' +
    '⚠️ IMPORTANT — Authorization Required:\n' +
    'You should see a prompt in cell A4 of the "' + SH.EQUIP_CACHE + '" tab saying ' +
    '"You need to connect these sheets." Click "Allow access" to authorize the connection.\n\n' +
    'This is a one-time step. After authorizing, the cache will update automatically ' +
    'whenever the source equipment list changes.\n\n' +
    'Once authorized, the tab will be hidden again automatically.',
    ui.ButtonSet.OK);
 
  cacheSh.hideSheet();
 
  var dashSh = ss.getSheetByName(SH.DASH);
  if (dashSh) ss.setActiveSheet(dashSh);
  ss.toast('✅ Equipment cache configured. Data will sync automatically.', '⚙️', 6);
}
 
// ─────────────────────────────────────────────────────────────────────────────
//  REFRESH CACHE — forces a re-read by clearing and resetting the formula
// ─────────────────────────────────────────────────────────────────────────────
function refreshEquipCache() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var ui  = SpreadsheetApp.getUi();
  var cfg = getConfig();
 
  var cacheSh = ss.getSheetByName(SH.EQUIP_CACHE);
  if (!cacheSh) { ui.alert('⚠️ Cache tab not found. Run Setup Equipment Cache first.'); return; }
 
  var sourceUrl = cfg['Equipment List Source URL'] || '';
  var tabName   = cfg['Equipment Inventory Tab Name'] || '';
  if (!sourceUrl || !tabName) { ui.alert('⚠️ Missing config values. Run Setup Equipment Cache first.'); return; }
 
  var cleanUrl = sourceUrl.split('/edit')[0].split('/view')[0];
  var formula  = '=IMPORTRANGE("' + cleanUrl + '", "' + tabName + '!A4:Z")';
 
  // Clear then reset at A4
  cacheSh.getRange('A4').clearContent();
  Utilities.sleep(500);
  cacheSh.getRange('A4').setFormula(formula);
 
  ss.toast('✅ Equipment cache refreshed.', '⚙️', 3);
}
 
// ─────────────────────────────────────────────────────────────────────────────
//  CACHE STATUS CHECK — called by getSystemSettingsData()
// ─────────────────────────────────────────────────────────────────────────────
function getEquipCacheStatus() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var cacheSh = ss.getSheetByName(SH.EQUIP_CACHE);
  if (!cacheSh) return { status: 'NOT SETUP', rowCount: 0 };
 
  var lastRow = cacheSh.getLastRow();
  if (lastRow < 4) return { status: 'EMPTY — needs IMPORTRANGE authorization', rowCount: 0 };
 
  // Check A4 for the IMPORTRANGE formula
  var cellA4     = cacheSh.getRange('A4');
  var hasFormula = cellA4.getFormula().indexOf('IMPORTRANGE') > -1;
  if (!hasFormula) return { status: 'NO FORMULA — run Setup Equipment Cache', rowCount: 0 };
 
  // Rows 1-3 are title/instructions/spacer, row 4 = external headers, row 5+ = data
  var rowCount = lastRow - 4;
  return { status: 'ACTIVE', rowCount: Math.max(rowCount, 0) };
}
 
