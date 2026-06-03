// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  SETUP.gs — INITIAL SETUP  v3.2                                       ║
// ║  Container Supply Co. — Garden Grove, CA                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
 
function initialSetup() {
  var ui   = SpreadsheetApp.getUi();
  var resp = ui.alert('⚡ Initial Setup v3.0',
    'This will build all tabs for the CSC Maintenance Tracker v3.0.\n\n' +
    'Existing tabs will be reconfigured. Click OK to continue.',
    ui.ButtonSet.OK_CANCEL);
  if (resp !== ui.Button.OK) return;
 
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Building system… please wait.', '⚙️ Setup', 120);
 
  // Clear all existing filters before rebuilding
  ss.getSheets().forEach(function(sh) {
    try { var f = sh.getFilter(); if (f) f.remove(); } catch(e) {}
  });
 
  buildConfigSheet_(ss);
  buildDataListsSheet_(ss);
  buildEquipmentInventorySheet_(ss);
  buildEquipCacheSheet_(ss);
  buildMasterLogSheet_(ss);
  buildTicketHistorySheet_(ss);
  buildTransferLogSheet_(ss);
  buildWaitingQueueSheet_(ss);
  buildOpenTicketsSheet_(ss);
  buildClosedTicketsSheet_(ss);
  DEPT_TRACKERS.forEach(function(dt) { buildDeptTrackerSheet_(ss, dt); });
  buildTempFixSheet_(ss);
  buildPartsNeededSheet_(ss);
  buildEquipHoldLogSheet_(ss);
  buildReportingSheet_(ss);
  buildReportDatabaseSheet_(ss);
  buildDashboardSheet_(ss);
  buildDeptDrillDownSheet_(ss);
  buildWorkflowSheet_(ss);
  buildArchiveSheet_(ss);
 
  // Tab order
  var order = [
    '📋 Workflow', SH.DASH, SH.DEPT_DRILL, SH.WAITING, SH.OPEN, SH.CLOSED,
    SH.TRACKER_EL, SH.TRACKER_MS, SH.TRACKER_FAC, SH.TRACKER_PL, SH.TRACKER_MTL, SH.TRACKER_LTH,
    SH.TEMP_FIX, SH.TICKET_HIST, SH.PARTS_NEEDED, SH.EQUIP_HOLD_LOG,
    SH.REPORTING, SH.RPT_DB, SH.MASTER_LOG, SH.EQUIP_INV,
    SH.EQUIP_CACHE, SH.DATA_VALID, SH.CONFIG, SH.TRANSFER_LOG, SH.ARCHIVE
  ];
  order.reverse().forEach(function(n) {
    var s = ss.getSheetByName(n);
    if (s) { ss.setActiveSheet(s); ss.moveActiveSheet(1); }
  });
 
  applyAllSheetRedesigns();
  setupTriggers_();
 
  var dash = ss.getSheetByName(SH.DASH);
  if (dash) ss.setActiveSheet(dash);
 
  ss.toast('✅ Setup complete!', '⚡ Maintenance', 5);
  ui.alert('✅ Setup Complete!',
    'Maintenance Tracker v3.0 is ready!\n\n' +
    'Next steps:\n' +
    '1. Fill in the Configuration tab\n' +
    '2. Update the Data Lists tab (technicians, departments, etc.)\n' +
    '3. Run Setup → Setup Equipment Cache\n' +
    '4. Start adding tickets!',
    ui.ButtonSet.OK);
}
 
function rebuildAllSheets() {
  var ui   = SpreadsheetApp.getUi();
  var resp = ui.alert('🔄 Rebuild All Sheets','Rebuilds formatting. Data is preserved.\n\nContinue?',ui.ButtonSet.OK_CANCEL);
  if (resp !== ui.Button.OK) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.getSheets().forEach(function(sh){
    try{var f=sh.getFilter();if(f)f.remove();}catch(e){}
  });
  ss.toast('Rebuilding…','🔄',120);
  buildDashboardSheet_(ss);
  buildDeptDrillDownSheet_(ss);
  DEPT_TRACKERS.forEach(function(dt){buildDeptTrackerSheet_(ss,dt);});
  applyAllSheetRedesigns();
  ss.toast('✅ Rebuild complete!','⚡',4);
}
 
// ═══════════════════════════════════════════════════════════════════════════
//  COLUMN GUARD — auto-expand before writing
// ═══════════════════════════════════════════════════════════════════════════
function ensureColumns_(sh, numCols) {
  var current = sh.getMaxColumns();
  if (current < numCols) sh.insertColumnsAfter(current, numCols - current);
}
 
// ═══════════════════════════════════════════════════════════════════════════
//  SHEET BUILDERS
// ═══════════════════════════════════════════════════════════════════════════
 
function buildConfigSheet_(ss) {
  var sh = resetSheet_(ss, SH.CONFIG, CLR.TAB_CONFIG, 0);
  setColWidths_(sh, [20, 20, 260, 380, 20]);
  var row = 1;
  rh_(sh, row, 8); sh.getRange(row, 1, 1, 5).setBackground(CLR.CHARCOAL); row++;
  rh_(sh, row, 52);
  mw_(sh, row, 2, 3).setValue('⚙️  CONFIGURATION')
    .setFontFamily('Calibri').setFontSize(22).setFontWeight('bold')
    .setFontColor(CLR.GOLD).setBackground(CLR.CHARCOAL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.getRange(row, 1).setBackground(CLR.CHARCOAL);
  sh.getRange(row, 5).setBackground(CLR.CHARCOAL); row++;
  rh_(sh, row, 8); sh.getRange(row, 1, 1, 5).setBackground(CLR.CHARCOAL); row++;
  var items = [
    ['Company Name','Container Supply Co.'],
    ['Location','Garden Grove, CA'],
    ['Doc No (Ticket Form)','FRM-040-001'],
    ['Doc No (Service Report)','FRM-040-002'],
    ['Doc No (Hold Tag)','FRM-029-002'],
    ['Revision','0'],
    ['Equipment List Source URL','https://docs.google.com/spreadsheets/d/1dlqp8jEMxxNYkIhr30tWK1yuC6FFlYTFU8Eq6EXeIps/edit'],
    ['Equipment Inventory Tab Name',''],
    ['Equipment Hold Register URL',      'https://docs.google.com/spreadsheets/d/1dlqp8jEMxxNYkIhr30tWK1yuC6FFlYTFU8Eq6EXeIps/edit'],
    ['Equipment Hold Register Tab Name', 'FRM-029-001 Equipment Hold Register'],
    ['PM System URL',''],
    ['Manager Email(s)',''],
    ['External Ticket Source URL','https://docs.google.com/spreadsheets/d/1F4-nPI4pkZZ933RKb2g6WBVR3JDZNgBRz8hQKGr0_4w/edit'],
    ['External Ticket Tab Name','Service Tickets'],
    ['External Sync Enabled','Y'],
    ['Monitoring Frequency','7'],
    ['Current Month',getCurrentMonth_()],
    ['Month Status','OPEN'],
    ['Last Rollover Date',''],
    ['System Version','3.0']
  ];
  items.forEach(function(item) {
    rh_(sh, row, 32);
    sh.getRange(row,1).setBackground(CLR.BG); sh.getRange(row,2).setBackground(CLR.BG);
    sh.getRange(row,3).setValue(item[0]).setFontFamily('Arial').setFontSize(10).setFontWeight('bold')
      .setFontColor(CLR.CHARCOAL).setBackground(CLR.LIGHT_GRAY).setVerticalAlignment('middle');
    sh.getRange(row,4).setValue(item[1]).setFontFamily('Arial').setFontSize(10).setFontColor(CLR.STEEL)
      .setBackground(CLR.WHITE).setVerticalAlignment('middle')
      .setBorder(true,true,true,true,false,false,CLR.BORDER,SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(row,5).setBackground(CLR.BG); row++;
  });
}
 
function buildDataListsSheet_(ss) {
  var sh = resetSheet_(ss, SH.DATA_VALID, CLR.TAB_DATA, 1);
  var headers = ['Technicians','Departments','Building / Zone','Equipment Types',
    'Priorities','Statuses','Downtime Types','Shifts','Parts Status','Fix Type','Tag Colors','Problem Types'];
  ensureColumns_(sh, headers.length);
  setColWidths_(sh, [180,160,180,200,130,160,140,110,180,130,160,180]);
  rh_(sh, 1, 36);
  headers.forEach(function(h, i) {
    sh.getRange(1,i+1).setValue(h).setFontFamily('Arial').setFontSize(10).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(CLR.CHARCOAL)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  });
  var defaults = {
    'Priorities':['LOW','MEDIUM','HIGH','CRITICAL'],
    'Statuses':['WAITING','OPEN','PENDING PARTS','ON HOLD','COMPLETE','CLOSED'],
    'Downtime Types':['PLANNED','UNPLANNED'],
    'Shifts':['1ST','2ND','3RD'],
    'Departments':Object.keys(DEPT_CODES),
    'Building / Zone':['Building A','Building B','Building C','Warehouse','Office','Exterior'],
    'Equipment Types':['MOTOR','CONVEYOR','PRESS','COMPRESSOR','HVAC','LIGHTING','PLC/CONTROLS','ELECTRICAL PANEL','PUMP','FORKLIFT'],
    'Technicians':['Tech 1','Tech 2','Tech 3'],
    'Parts Status':['REQUESTED','ORDERED','ON HOLD FOR APPROVAL','RECEIVED','BACKORDERED'],
    'Fix Type':['Temporary','Permanent'],
    'Tag Colors':['Red — Out of Service','Yellow — Use with Caution','Orange — Temp Fix','Green — Cleared'],
    'Problem Types':['Mechanical Failure','Electrical Issue','Hydraulic','Pneumatic','Controls / PLC','Wear & Tear','Operator Error','Preventive Maintenance','Facility','Other']
  };
  headers.forEach(function(h, i) {
    (defaults[h]||[]).forEach(function(v, j) {
      sh.getRange(j+2,i+1).setValue(v).setFontFamily('Arial').setFontSize(10).setFontColor(CLR.DEEP_STEEL);
    });
  });
  for(var r=2;r<=60;r++) sh.getRange(r,1,1,headers.length).setBackground(r%2===0?CLR.WHITE:'#F9F9F9');
}
 
function resetDataLists() {
  buildDataListsSheet_(SpreadsheetApp.getActiveSpreadsheet());
  SpreadsheetApp.getActiveSpreadsheet().toast('Data Lists reset.','⚡',3);
}
 
function buildEquipmentInventorySheet_(ss) {
  var sh = resetSheet_(ss, SH.EQUIP_INV, CLR.TAB_DATA, 1);
  var headers = ['Department','Group','Equipment Type','Equipment Code','Equipment Description','Status'];
  ensureColumns_(sh, headers.length);
  setColWidths_(sh, [160,160,200,150,280,110]);
  rh_(sh, 1, 36);
  headers.forEach(function(h, i) {
    sh.getRange(1,i+1).setValue(h).setFontFamily('Arial').setFontSize(10).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(CLR.CHARCOAL)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  });
  sh.getRange(2,1).setValue('← Primary source is the Equipment Cache (IMPORTRANGE). This tab is a local fallback only. Use ⚡ Setup → Sync Equipment Inventory if needed.')
    .setFontFamily('Arial').setFontSize(10).setFontStyle('italic')
    .setFontColor(CLR.MED_GRAY).setBackground(CLR.YELLOW_LT);
}
 
function buildMasterLogSheet_(ss) {
  var sh = resetSheet_(ss, SH.MASTER_LOG, CLR.TAB_DATA, 1);
  ensureColumns_(sh, ML_COLS);
  setColWidths_(sh, [90,130,160,120,110,130,140,160,130,220,110,100,280,130,80,80,110,110,110,250,200,200,100,80,80,160,120,130,110,130,130,250,130]);
  rh_(sh, 1, 36);
  ML_HEADERS.forEach(function(h, i) {
    sh.getRange(1,i+1).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(CLR.DEEP_STEEL)
      .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  });
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,ML_COLS).createFilter();
}
 
function buildTicketHistorySheet_(ss) {
  var sh = resetSheet_(ss, SH.TICKET_HIST, CLR.TAB_HIST, 0);
  ensureColumns_(sh, TH_COLS);
  setColWidths_(sh, [160,140,180,180,130,130,150,350]);
  var row = 1;
  rh_(sh,row,8); sh.getRange(row,1,1,TH_COLS).setBackground(CLR.NAVY); row++;
  rh_(sh,row,44);
  mw_(sh,row,1,TH_COLS).setValue('📜  TICKET HISTORY LOG')
    .setFontFamily('Calibri').setFontSize(18).setFontWeight('bold')
    .setFontColor(CLR.GOLD).setBackground(CLR.NAVY)
    .setHorizontalAlignment('center').setVerticalAlignment('middle'); row++;
  rh_(sh,row,20);
  mw_(sh,row,1,TH_COLS).setValue('Complete audit trail — every status change and event timestamped')
    .setFontFamily('Arial').setFontSize(9).setFontStyle('italic')
    .setFontColor(CLR.GOLD_LT).setBackground(CLR.DEEP_STEEL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle'); row++;
  rh_(sh,row,8); sh.getRange(row,1,1,TH_COLS).setBackground(CLR.NAVY); row++;
  rh_(sh,row,32);
  TH_HEADERS.forEach(function(h, i) {
    sh.getRange(row,i+1).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(CLR.NAVY)
      .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  });
  sh.setFrozenRows(row);
  sh.getRange(row,1,1,TH_COLS).createFilter();
}
 
function buildWaitingQueueSheet_(ss) {
  var sh = resetSheet_(ss, SH.WAITING, CLR.TAB_WAIT, 0);
  buildTicketListSheet_(sh,'⏳  WAITING QUEUE',
    'New tickets pending manager review — CRITICAL tickets bypass to Open  |  External tickets tagged [EXT]',
    '#E65100','#FFE0B2');
}
 
function buildOpenTicketsSheet_(ss) {
  var sh = resetSheet_(ss, SH.OPEN, '#1565C0', 0);
  buildTicketListSheet_(sh,'📂  OPEN TICKETS',
    'Approved tickets in progress — update via Update Ticket form or directly in dept tracker',
    '#1565C0','#BBDEFB');
}
 
function buildClosedTicketsSheet_(ss) {
  var sh = resetSheet_(ss, SH.CLOSED, CLR.GREEN, 0);
  buildTicketListSheet_(sh,'✅  CLOSED TICKETS',
    'Verified and closed — manager sign-off required  |  Preserved for SQF audit trail',
    CLR.GREEN, CLR.GREEN_LT);
}
 
function buildTicketListSheet_(sh, title, subtitle, accentColor, accentLt) {
  var cc = TK_COLS + 2; // col A margin + TK_COLS data + col right margin
  ensureColumns_(sh, cc);
  // col A = 24px margin, cols B-Z = data, final col = 24px margin
  setColWidths_(sh,[24,120,110,100,130,130,150,110,200,110,260,120,70,70,110,120,90,70,70,140,110,120,120,220,130,24]);
 
  var row = 1;
  // Row 1: top margin
  rh_(sh,row,8); sh.getRange(row,1,1,cc).setBackground(CLR.CHARCOAL); row++;
  // Row 2: Title
  rh_(sh,row,48);
  sh.getRange(row,1).setBackground(CLR.CHARCOAL);
  mw_(sh,row,2,TK_COLS).setValue(title)
    .setFontFamily('Calibri').setFontSize(18).setFontWeight('bold')
    .setFontColor(CLR.GOLD).setBackground(CLR.CHARCOAL)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  sh.getRange(row,cc).setBackground(CLR.CHARCOAL); row++;
  // Row 3: Subtitle
  rh_(sh,row,20);
  sh.getRange(row,1).setBackground(CLR.DEEP_STEEL);
  mw_(sh,row,2,TK_COLS).setValue(subtitle)
    .setFontFamily('Arial').setFontSize(9).setFontStyle('italic')
    .setFontColor(CLR.GOLD_LT).setBackground(CLR.DEEP_STEEL)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  sh.getRange(row,cc).setBackground(CLR.DEEP_STEEL); row++;
  // Row 4: Accent stripe
  rh_(sh,row,4); sh.getRange(row,1,1,cc).setBackground(accentColor); row++;
  // Row 5: Spacer
  rh_(sh,row,8); sh.getRange(row,1,1,cc).setBackground(CLR.BG); row++;
  // Row 6: Column headers — FROZEN (QUEUE_FROZEN = 6)
  rh_(sh,row,28);
  sh.getRange(row,1).setBackground(accentColor);
  TK_HEADERS.forEach(function(h, i) {
    sh.getRange(row,i+2).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(accentColor)
      .setHorizontalAlignment('left').setVerticalAlignment('middle').setWrap(true);
  });
  sh.getRange(row,cc).setBackground(accentColor);
  sh.setFrozenRows(row); // = 6
  sh.getRange(row,1,1,cc).setBorder(false,false,true,false,false,false,CLR.GOLD,SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
 
  // Pre-format 200 data rows with borders
  for(var r=row+1;r<=row+200;r++){
    sh.getRange(r,1).setBackground(CLR.BG); // col A = grey margin
    sh.getRange(r,2,1,TK_COLS)
      .setBackground(CLR.WHITE).setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle')
      .setBorder(true,true,true,true,true,true,'#E0E0E0',SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(r,cc).setBackground(CLR.BG); // right margin
    sh.setRowHeight(r,26);
  }
  sh.setHiddenGridlines(true);
}
 
// ═══════════════════════════════════════════════════════════════════════════
//  DEPT TRACKER SHEET — Two-section layout
//
//  Row 1:  Title (charcoal/gold)
//  Row 2:  KPI numbers
//  Row 3:  KPI gold border accent
//  Row 4:  KPI labels
//  Row 5:  Column headers — FROZEN (TRACKER_FROZEN = 5)
//  Row 6:  ⚠️ PRIORITY WATCH LIST banner (dark red)
//  Row 7:  Mini headers for priority section
//  Rows 8-27:  Priority data rows (20 rows, light red tint) ← CRITICAL/HIGH
//  Row 28: 📂 ALL OPEN TICKETS banner (steel blue)
//  Row 29: Mini headers for open section
//  Rows 30+: All open ticket data rows (white)
// ═══════════════════════════════════════════════════════════════════════════
function buildDeptTrackerSheet_(ss, dt) {
  var sh  = resetSheet_(ss, dt.name, dt.color, 0);
  var nc  = TK_COLS + 2; // col A margin + TK_COLS + right margin col
  ensureColumns_(sh, nc);
 
  var colWidths = [24,120,110,100,130,130,150,110,200,110,260,120,70,70,110,120,90,70,70,140,110,120,120,220,130,24];
  setColWidths_(sh, colWidths);
 
  // ── ROW 1: Title ──────────────────────────────────────────────────────────
  sh.getRange(1,1,1,nc).setBackground(CLR.CHARCOAL);
  mw_(sh,1,1,nc).setValue('⚡  '+dt.dept.toUpperCase()+'  |  MAINTENANCE TRACKER  |  '+getCurrentMonth_().toUpperCase())
    .setFontFamily('Calibri').setFontSize(16).setFontWeight('bold')
    .setFontColor(CLR.GOLD).setBackground(CLR.CHARCOAL)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  rh_(sh,1,52);
 
  // ── ROWS 2-4: KPI Scoreboard (populated by applyAllSheetRedesigns) ────────
  sh.getRange(2,1,3,nc).setBackground(CLR.CHARCOAL);
  rh_(sh,2,60); rh_(sh,3,4); rh_(sh,4,20);
 
  // ── ROW 5: Column headers — FROZEN ───────────────────────────────────────
  sh.getRange(5,1).setBackground(dt.color);
  TK_HEADERS.forEach(function(h, i) {
    sh.getRange(5,i+2).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.GOLD).setBackground(dt.color)
      .setHorizontalAlignment('left').setVerticalAlignment('middle').setWrap(true);
  });
  sh.getRange(5,nc).setBackground(dt.color);
  rh_(sh,5,30);
  sh.setFrozenRows(TRACKER_FROZEN); // = 5
  sh.getRange(5,1,1,nc).setBorder(false,false,true,false,false,false,CLR.GOLD,SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
 
  // ── ROW 6: Priority Watch List banner ─────────────────────────────────────
  mw_(sh,TRACKER_PRIO_BANNER,1,nc)
    .setValue('⚠️  PRIORITY WATCH LIST — Critical & High Priority Tickets')
    .setBackground('#1A0000').setFontColor('#FF8A80')
    .setFontWeight('bold').setFontSize(10).setFontFamily('Arial')
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  sh.getRange(TRACKER_PRIO_BANNER,1).setBorder(
    null,true,null,null,null,null,'#B71C1C',SpreadsheetApp.BorderStyle.SOLID_THICK);
  rh_(sh,TRACKER_PRIO_BANNER,26);
 
  // ── ROW 7: Mini column headers for priority section ───────────────────────
  sh.getRange(TRACKER_PRIO_HDR,1).setBackground('#2A0000');
  TK_HEADERS.forEach(function(h, i) {
    sh.getRange(TRACKER_PRIO_HDR,i+2).setValue(h)
      .setFontFamily('Arial').setFontSize(8).setFontWeight('bold')
      .setFontColor('#FF8A80').setBackground('#2A0000')
      .setHorizontalAlignment('left').setVerticalAlignment('middle').setWrap(false);
  });
  sh.getRange(TRACKER_PRIO_HDR,nc).setBackground('#2A0000');
  rh_(sh,TRACKER_PRIO_HDR,22);
 
  // ── ROWS 8-27: Priority data rows (20 rows, light red tint) ──────────────
  for(var pr=TRACKER_PRIO_START;pr<=TRACKER_PRIO_END;pr++){
    sh.getRange(pr,1).setBackground(CLR.BG);
    sh.getRange(pr,2,1,TK_COLS)
      .setBackground('#FFF5F5') // light red tint for priority section
      .setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle')
      .setBorder(true,true,true,true,true,true,'#FFCDD2',SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(pr,nc).setBackground(CLR.BG);
    sh.setRowHeight(pr,26);
  }
 
  // ── ROW 28: All Open Tickets banner ──────────────────────────────────────
  mw_(sh,TRACKER_OPEN_BANNER,1,nc)
    .setValue('📂  ALL OPEN TICKETS — Active Work Queue')
    .setBackground('#0D2137').setFontColor('#90CAF9')
    .setFontWeight('bold').setFontSize(10).setFontFamily('Arial')
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  sh.getRange(TRACKER_OPEN_BANNER,1).setBorder(
    null,true,null,null,null,null,'#1565C0',SpreadsheetApp.BorderStyle.SOLID_THICK);
  rh_(sh,TRACKER_OPEN_BANNER,26);
 
  // ── ROW 29: Mini column headers for open section ──────────────────────────
  sh.getRange(TRACKER_OPEN_HDR,1).setBackground('#0D2137');
  TK_HEADERS.forEach(function(h, i) {
    sh.getRange(TRACKER_OPEN_HDR,i+2).setValue(h)
      .setFontFamily('Arial').setFontSize(8).setFontWeight('bold')
      .setFontColor('#90CAF9').setBackground('#0D2137')
      .setHorizontalAlignment('left').setVerticalAlignment('middle').setWrap(false);
  });
  sh.getRange(TRACKER_OPEN_HDR,nc).setBackground('#0D2137');
  rh_(sh,TRACKER_OPEN_HDR,22);
 
  // ── ROWS 30-330: Open data rows (white with borders) ─────────────────────
  for(var dr=TRACKER_OPEN_START;dr<=330;dr++){
    sh.getRange(dr,1).setBackground(CLR.BG);
    sh.getRange(dr,2,1,TK_COLS)
      .setBackground(CLR.WHITE).setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle')
      .setBorder(true,true,true,true,true,true,'#E0E0E0',SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(dr,nc).setBackground(CLR.BG);
    sh.setRowHeight(dr,26);
  }
 
  sh.setHiddenGridlines(true);
}
 
function buildTempFixSheet_(ss) {
  var sh = resetSheet_(ss, SH.TEMP_FIX, CLR.TAB_TEMP, 0);
  ensureColumns_(sh, TF_COLS);
  setColWidths_(sh,[130,130,130,220,130,150,110,280,280,120,120,120,120,130,130,110,250]);
  var row=1;
  rh_(sh,row,8); sh.getRange(row,1,1,TF_COLS).setBackground('#5D4037'); row++;
  rh_(sh,row,46);
  mw_(sh,row,1,TF_COLS).setValue('🔧  TEMPORARY FIX MONITOR')
    .setFontFamily('Calibri').setFontSize(18).setFontWeight('bold')
    .setFontColor(CLR.GOLD).setBackground('#5D4037').setHorizontalAlignment('left').setVerticalAlignment('middle'); row++;
  rh_(sh,row,20);
  mw_(sh,row,1,TF_COLS).setValue('All temporary fixes requiring monitoring — past due items highlighted automatically')
    .setFontFamily('Arial').setFontSize(9).setFontStyle('italic')
    .setFontColor('#D7CCC8').setBackground(CLR.DEEP_STEEL).setHorizontalAlignment('left').setVerticalAlignment('middle'); row++;
  rh_(sh,row,8); sh.getRange(row,1,1,TF_COLS).setBackground('#5D4037'); row++;
  rh_(sh,row,30);
  TF_HEADERS.forEach(function(h,i){
    sh.getRange(row,i+1).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground('#5D4037').setHorizontalAlignment('left').setVerticalAlignment('middle').setWrap(true);
  });
  sh.setFrozenRows(row); sh.getRange(row,1,1,TF_COLS).createFilter();
  for(var r=row+1;r<=row+150;r++){
    sh.getRange(r,1,1,TF_COLS).setBackground(CLR.WHITE).setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle')
      .setBorder(true,true,true,true,true,true,'#E0E0E0',SpreadsheetApp.BorderStyle.SOLID);
    sh.setRowHeight(r,26);
  }
}
 
function buildPartsNeededSheet_(ss) {
  var sh = resetSheet_(ss, SH.PARTS_NEEDED, CLR.TAB_PARTS, 0);
  ensureColumns_(sh, PN_COLS);
  setColWidths_(sh,[130,250,130,130,220,130,120,160,120,120,130,250]);
  var row=1;
  rh_(sh,row,8); sh.getRange(row,1,1,PN_COLS).setBackground('#455A64'); row++;
  rh_(sh,row,46);
  mw_(sh,row,1,PN_COLS).setValue('🔩  PARTS NEEDED')
    .setFontFamily('Calibri').setFontSize(18).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground('#455A64').setHorizontalAlignment('left').setVerticalAlignment('middle'); row++;
  rh_(sh,row,20);
  mw_(sh,row,1,PN_COLS).setValue('Parts lifecycle: Requested → Ordered → Received  |  Manager email sent on new request')
    .setFontFamily('Arial').setFontSize(9).setFontStyle('italic')
    .setFontColor('#B0BEC5').setBackground('#546E7A').setHorizontalAlignment('left').setVerticalAlignment('middle'); row++;
  rh_(sh,row,8); sh.getRange(row,1,1,PN_COLS).setBackground('#455A64'); row++;
  rh_(sh,row,30);
  PN_HEADERS.forEach(function(h,i){
    sh.getRange(row,i+1).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground('#607D8B').setHorizontalAlignment('left').setVerticalAlignment('middle').setWrap(true);
  });
  sh.setFrozenRows(row); sh.getRange(row,1,1,PN_COLS).createFilter();
  for(var r=row+1;r<=row+150;r++){
    sh.getRange(r,1,1,PN_COLS).setBackground('#FAFAFA').setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle')
      .setBorder(true,true,true,true,true,true,'#CFD8DC',SpreadsheetApp.BorderStyle.SOLID);
    sh.setRowHeight(r,26);
  }
}
 
function buildEquipHoldLogSheet_(ss) {
  var sh = resetSheet_(ss, SH.EQUIP_HOLD_LOG, '#B71C1C', 0);
  ensureColumns_(sh, EHL_COLS);
  setColWidths_(sh,[140,130,130,220,130,150,180,120,130,250,130,130,120,250]);
  var row=1;
  rh_(sh,row,8); sh.getRange(row,1,1,EHL_COLS).setBackground(CLR.TAG_RED); row++;
  rh_(sh,row,46);
  mw_(sh,row,1,EHL_COLS).setValue('🏷️  EQUIPMENT HOLD LOG  |  FRM-029-001')
    .setFontFamily('Calibri').setFontSize(18).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground(CLR.TAG_RED).setHorizontalAlignment('left').setVerticalAlignment('middle'); row++;
  rh_(sh,row,20);
  mw_(sh,row,1,EHL_COLS).setValue('All tagged equipment — manager must issue Green Tag to return to service')
    .setFontFamily('Arial').setFontSize(9).setFontStyle('italic')
    .setFontColor('#FFCDD2').setBackground(CLR.DEEP_STEEL).setHorizontalAlignment('left').setVerticalAlignment('middle'); row++;
  rh_(sh,row,8); sh.getRange(row,1,1,EHL_COLS).setBackground(CLR.TAG_RED); row++;
  rh_(sh,row,30);
  EHL_HEADERS.forEach(function(h,i){
    sh.getRange(row,i+1).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(CLR.TAG_RED).setHorizontalAlignment('left').setVerticalAlignment('middle').setWrap(true);
  });
  sh.setFrozenRows(row); sh.getRange(row,1,1,EHL_COLS).createFilter();
  for(var r=row+1;r<=row+150;r++){
    sh.getRange(r,1,1,EHL_COLS)
      .setBackground(r%2===0?CLR.WHITE:'#FFEBEE').setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle')
      .setBorder(true,true,true,true,true,true,'#FFCDD2',SpreadsheetApp.BorderStyle.SOLID);
    sh.setRowHeight(r,26);
  }
}
 
function buildReportingSheet_(ss) {
  var sh=resetSheet_(ss,SH.REPORTING,CLR.TAB_REPORT,0);
  var cc=TK_COLS+2; ensureColumns_(sh,cc);
  var row=1;
  rh_(sh,row,8); sh.getRange(row,1,1,cc).setBackground(CLR.CHARCOAL); row++;
  rh_(sh,row,46);
  mw_(sh,row,1,cc).setValue('📈  REPORTING  —  UNDER DEVELOPMENT')
    .setFontFamily('Calibri').setFontSize(20).setFontWeight('bold')
    .setFontColor(CLR.GOLD).setBackground(CLR.CHARCOAL).setHorizontalAlignment('left').setVerticalAlignment('middle'); row++;
  rh_(sh,row,8); sh.getRange(row,1,1,cc).setBackground(CLR.CHARCOAL); row++;
  rh_(sh,row,34); sh.getRange(row,1,1,cc).setBackground(CLR.BG);
}
 
function buildReportDatabaseSheet_(ss) {
  var sh=resetSheet_(ss,SH.RPT_DB,'#1565C0',1);
  ensureColumns_(sh,RDB_COLS);
  setColWidths_(sh,[110,110,120,130,150,160,130,200,300,250,300,300,200,100,80,200,90,130,130,130,110,130,100,120,200,200,250]);
  rh_(sh,1,36);
  RDB_HEADERS.forEach(function(h,i){
    sh.getRange(1,i+1).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(CLR.NAVY).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  });
  sh.setFrozenRows(1); sh.getRange(1,1,1,RDB_COLS).createFilter();
}
 
function buildArchiveSheet_(ss) {
  var sh=resetSheet_(ss,SH.ARCHIVE,CLR.TAB_ARCH,1);
  var headers=['Archive ID','Archive Date','Archived By','Source Tab','Ticket #',
    'Equipment Code','Equipment Description','Department','Date Opened','Date Closed','Description','Data JSON'];
  ensureColumns_(sh,headers.length);
  setColWidths_(sh,[140,120,130,140,130,130,220,130,110,110,280,400]);
  rh_(sh,1,36);
  headers.forEach(function(h,i){
    sh.getRange(1,i+1).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(CLR.TAB_ARCH).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  });
  sh.setFrozenRows(1); sh.getRange(1,1,1,headers.length).createFilter();
  sh.getRange(2,1).setValue('Hidden by default — SQF audit archive.')
    .setFontFamily('Arial').setFontSize(10).setFontStyle('italic').setFontColor(CLR.MED_GRAY).setBackground(CLR.YELLOW_LT);
  sh.hideSheet();
}
 
// ═══════════════════════════════════════════════════════════════════════════
//  TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════
function setupTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('checkTempFixDueDates').timeBased().atHour(6).everyDays(1).create();
  ScriptApp.newTrigger('runHourlySync').timeBased().everyHours(1).create();
  Logger.log('Triggers set: checkTempFixDueDates (daily 6am) + runHourlySync (hourly)');
}
// ═══════════════════════════════════════════════════════════════════════════
//  EQUIP CACHE SHEET BUILDER (hidden)
// ═══════════════════════════════════════════════════════════════════════════
function buildEquipCacheSheet_(ss) {
  var sh=resetSheet_(ss,SH.EQUIP_CACHE,'#9E9E9E',3);
  ensureColumns_(sh,8);
  sh.getRange(1,1,1,8).merge()
    .setValue('⚙️ Equipment Inventory Cache — IMPORTRANGE Auto-Sync')
    .setBackground('#3C3C3C').setFontColor('#FFD700').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  sh.setRowHeight(1,36);
  sh.getRange(2,1,1,8).merge()
    .setValue('PRIMARY source for equipment data. Row 4 = headers, Row 5+ = data. Set up IMPORTRANGE from Equipment Register.')
    .setBackground('#F5F5F5').setFontColor('#616161').setFontSize(9)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  sh.setRowHeight(2,24);
  sh.getRange(3,1,1,8).setBackground('#E0E0E0'); sh.setRowHeight(3,6);
  var headers=['Department','Group','Equipment Type','Equipment Code','Specific Equipment','Status','Building / Zone','Notes'];
  sh.getRange(4,1,1,8).setValues([headers])
    .setBackground('#4A4A4A').setFontColor('#FFD700').setFontWeight('bold').setFontSize(9)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  sh.setRowHeight(4,24);
  sh.setFrozenRows(4);
  [100,100,130,120,180,80,120,120].forEach(function(w,i){sh.setColumnWidth(i+1,w);});
  sh.hideSheet();
}
 
// ═══════════════════════════════════════════════════════════════════════════
//  TRANSFER LOG SHEET BUILDER (hidden)
// ═══════════════════════════════════════════════════════════════════════════
function buildTransferLogSheet_(ss) {
  var sh=resetSheet_(ss,SH.TRANSFER_LOG,'#9E9E9E',1);
  ensureColumns_(sh,TL_COLS);
  sh.getRange(1,1,1,TL_COLS).merge()
    .setValue('📋 Transfer Log — Ticket Department Transfer Audit Trail')
    .setBackground('#3C3C3C').setFontColor('#FFD700').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  sh.setRowHeight(1,36);
  sh.getRange(2,1,1,TL_COLS).setValues([TL_HEADERS])
    .setBackground('#4A4A4A').setFontColor('#FFD700').setFontWeight('bold').setFontSize(9)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  sh.setRowHeight(2,24);
  sh.setFrozenRows(2);
  [140,130,140,100,100,120,200,80].forEach(function(w,i){sh.setColumnWidth(i+1,w);});
  sh.hideSheet();
}
 
// ═══════════════════════════════════════════════════════════════════════════
//  WORKFLOW PLACEHOLDER
// ═══════════════════════════════════════════════════════════════════════════
function buildWorkflowSheet_(ss) {
  var sh=ss.getSheetByName('📋 Workflow');
  if(!sh){
    sh=ss.insertSheet('📋 Workflow');
    sh.setTabColor(CLR.STEEL);
    mw_(sh,1,1,10).setValue('📋 Workflow — see ⚙️ System Settings → Workflow Chart for the full process diagram.')
      .setFontFamily('Arial').setFontSize(11).setFontColor(CLR.STEEL)
      .setBackground(CLR.BG).setHorizontalAlignment('left').setVerticalAlignment('middle');
    sh.setRowHeight(1,40);
  }
}
 
