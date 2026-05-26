// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  DASHBOARD & DEPT DRILL-DOWN  v3.0                                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝

function buildDashboardSheet_(ss) {
  var sh = resetSheet_(ss, SH.DASH, CLR.TAB_DASH, 0);
  sh.setHiddenGridlines(true);
  var COLS = 14;
  for (var r=1;r<=80;r++) sh.getRange(r,1,1,COLS).setBackground(CLR.BG);
  setColWidths_(sh,[30,155,155,155,155,155,155,155,155,155,155,155,155,30]);

  var row=1;
  rh_(sh,row,8); fillRow_(sh,row,1,COLS,CLR.CHARCOAL); row++;
  rh_(sh,row,56);
  mw_(sh,row,1,COLS).setValue('⚡  MAINTENANCE DASHBOARD')
    .setFontFamily('Arial').setFontSize(24).setFontWeight('bold')
    .setFontColor(CLR.GOLD).setBackground(CLR.CHARCOAL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  rh_(sh,row,22);
  mw_(sh,row,1,COLS)
    .setFormula('="Container Supply Co. — Garden Grove, CA  |  🟢 Live as of: "&TEXT(NOW(),"mmm dd, yyyy  h:mm AM/PM")')
    .setFontFamily('Arial').setFontSize(9).setFontStyle('italic')
    .setFontColor(CLR.GOLD_LT).setBackground(CLR.DEEP_STEEL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  rh_(sh,row,8); fillRow_(sh,row,1,COLS,CLR.CHARCOAL); row++;
  rh_(sh,row,12); row++;

  // KPI Cards
  var kpiStart=row;
  var kpis=[
    {label:'TOTAL TICKETS',formula:'=IFERROR(COUNTA(INDIRECT("\''+SH.MASTER_LOG+'\'!B2:B")),0)',color:CLR.CHARCOAL,icon:'📋'},
    {label:'OPEN',formula:'=IFERROR(COUNTIF(INDIRECT("\''+SH.OPEN+'\'!B8:B"),">"""),0)',color:CLR.ORANGE,icon:'🔓'},
    {label:'WAITING REVIEW',formula:'=IFERROR(COUNTIF(INDIRECT("\''+SH.WAITING+'\'!B8:B"),">"""),0)',color:CLR.BLUE,icon:'⏳'},
    {label:'CRITICAL OPEN',formula:'=IFERROR(COUNTIFS(INDIRECT("\''+SH.MASTER_LOG+'\'!L:L"),"CRITICAL",INDIRECT("\''+SH.MASTER_LOG+'\'!E:E"),"OPEN"),0)',color:CLR.RED,icon:'🚨'},
    {label:'CLOSED',formula:'=IFERROR(COUNTIF(INDIRECT("\''+SH.MASTER_LOG+'\'!E:E"),"CLOSED"),0)',color:CLR.GREEN,icon:'✅'},
    {label:'TEMP FIX ACTIVE',formula:'=IFERROR(COUNTIF(INDIRECT("\''+SH.TEMP_FIX+'\'!M:M"),"ACTIVE")+COUNTIF(INDIRECT("\''+SH.TEMP_FIX+'\'!M:M"),"PAST DUE"),0)',color:CLR.YELLOW,icon:'🔧'}
  ];
  for (var k=0;k<kpis.length;k++) {
    var col=2+(k*2);
    rh_(sh,kpiStart,28);
    mw_(sh,kpiStart,col,2).setValue(kpis[k].icon+'  '+kpis[k].label)
      .setFontFamily('Arial').setFontSize(10).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(kpis[k].color)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    rh_(sh,kpiStart+1,52);
    mw_(sh,kpiStart+1,col,2).setFormula(kpis[k].formula)
      .setFontFamily('Arial').setFontSize(28).setFontWeight('bold')
      .setFontColor(kpis[k].color).setBackground(CLR.WHITE)
      .setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setBorder(true,true,true,true,false,false,kpis[k].color,SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  }
  row=kpiStart+2;
  rh_(sh,row,12); row++;

  // % Tickets Closed + Total Service Hours + Repair Costs
  rh_(sh,row,28);
  mw_(sh,row,2,4).setValue('📊  TICKET CLOSURE RATE')
    .setFontFamily('Arial').setFontSize(11).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground(CLR.STEEL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  mw_(sh,row,6,4).setValue('⏱️  TOTAL SERVICE HOURS')
    .setFontFamily('Arial').setFontSize(11).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground(CLR.STEEL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  mw_(sh,row,10,4).setValue('💰  TOTAL REPAIR COSTS')
    .setFontFamily('Arial').setFontSize(11).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground(CLR.STEEL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  rh_(sh,row,48);
  mw_(sh,row,2,4)
    .setFormula('=IFERROR(TEXT(COUNTIF(INDIRECT("\''+SH.MASTER_LOG+'\'!E:E"),"CLOSED")/MAX(1,COUNTA(INDIRECT("\''+SH.MASTER_LOG+'\'!B2:B"))),"0%")&"  closed","—")')
    .setFontFamily('Arial').setFontSize(18).setFontWeight('bold').setFontColor(CLR.GREEN)
    .setBackground(CLR.WHITE).setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBorder(true,true,true,true,false,false,CLR.GREEN,SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  mw_(sh,row,6,4)
    .setFormula('=IFERROR(SUM(INDIRECT("\''+SH.MASTER_LOG+'\'!P:P"))&" hrs",0)')
    .setFontFamily('Arial').setFontSize(22).setFontWeight('bold').setFontColor(CLR.BLUE)
    .setBackground(CLR.WHITE).setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBorder(true,true,true,true,false,false,CLR.BLUE,SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  mw_(sh,row,10,4).setValue('UNDER DEVELOPMENT')
    .setFontFamily('Arial').setFontSize(13).setFontWeight('bold').setFontColor(CLR.MED_GRAY)
    .setBackground(CLR.DISABLED).setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBorder(true,true,true,true,false,false,CLR.BORDER,SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  row++;
  rh_(sh,row,12); row++;

  // Downtime Tracking section
  rh_(sh,row,28);
  mw_(sh,row,2,12).setValue('⏱️  DOWNTIME TRACKING')
    .setFontFamily('Arial').setFontSize(12).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground(CLR.STEEL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  ['','Planned Hours','Unplanned Hours','Total Hours','Planned Tickets','Unplanned Tickets'].forEach(function(h,i){
    if(!h) return;
    sh.getRange(row,i+2).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(CLR.CHARCOAL).setHorizontalAlignment('center');
  });
  rh_(sh,row,26); row++;
  rh_(sh,row,40);
  sh.getRange(row,2).setValue('All Time').setFontFamily('Arial').setFontSize(10).setFontWeight('bold').setFontColor(CLR.CHARCOAL).setVerticalAlignment('middle');
  sh.getRange(row,3).setFormula('=IFERROR(SUMPRODUCT((INDIRECT("\''+SH.MASTER_LOG+'\'!K:K")="PLANNED")*ISNUMBER(INDIRECT("\''+SH.MASTER_LOG+'\'!P:P"))*INDIRECT("\''+SH.MASTER_LOG+'\'!P:P")),0)')
    .setFontFamily('Arial').setFontSize(14).setFontWeight('bold').setFontColor(CLR.GREEN).setHorizontalAlignment('center');
  sh.getRange(row,4).setFormula('=IFERROR(SUMPRODUCT((INDIRECT("\''+SH.MASTER_LOG+'\'!K:K")="UNPLANNED")*ISNUMBER(INDIRECT("\''+SH.MASTER_LOG+'\'!P:P"))*INDIRECT("\''+SH.MASTER_LOG+'\'!P:P")),0)')
    .setFontFamily('Arial').setFontSize(14).setFontWeight('bold').setFontColor(CLR.RED).setHorizontalAlignment('center');
  sh.getRange(row,5).setFormula('=IFERROR(SUM(INDIRECT("\''+SH.MASTER_LOG+'\'!P:P")),0)')
    .setFontFamily('Arial').setFontSize(14).setFontWeight('bold').setFontColor(CLR.BLUE).setHorizontalAlignment('center');
  sh.getRange(row,6).setFormula('=COUNTIF(INDIRECT("\''+SH.MASTER_LOG+'\'!K:K"),"PLANNED")')
    .setFontFamily('Arial').setFontSize(14).setFontColor(CLR.GREEN).setHorizontalAlignment('center');
  sh.getRange(row,7).setFormula('=COUNTIF(INDIRECT("\''+SH.MASTER_LOG+'\'!K:K"),"UNPLANNED")')
    .setFontFamily('Arial').setFontSize(14).setFontColor(CLR.RED).setHorizontalAlignment('center');
  row++;
  rh_(sh,row,12); row++;

  // Tech Summary
  rh_(sh,row,28);
  mw_(sh,row,2,12).setValue('👷  TECHNICIAN SUMMARY')
    .setFontFamily('Arial').setFontSize(12).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground(CLR.STEEL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  ['Technician','Assigned','Completed','Closed','Total Hrs','Avg Hrs/Ticket'].forEach(function(h,i){
    sh.getRange(row,i+2).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(CLR.CHARCOAL).setHorizontalAlignment('center');
  });
  rh_(sh,row,26); row++;
  for (var t=0;t<10;t++){
    rh_(sh,row+t,26);
    sh.getRange(row+t,2,1,6).setBackground(t%2===0?CLR.WHITE:'#F5F5F5')
      .setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
  row+=12;

  // Dept Breakdown
  rh_(sh,row,28);
  mw_(sh,row,2,12).setValue('📊  DEPARTMENT BREAKDOWN')
    .setFontFamily('Arial').setFontSize(12).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground(CLR.STEEL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  ['Department','Open','Waiting','Pending','On Hold','Completed','Total','Planned Hrs','Unplanned Hrs','Avg Age (days)'].forEach(function(h,i){
    sh.getRange(row,i+2).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(CLR.CHARCOAL).setHorizontalAlignment('center');
  });
  rh_(sh,row,26); row++;
  for (var d=0;d<8;d++){
    rh_(sh,row+d,26);
    sh.getRange(row+d,2,1,10).setBackground(d%2===0?CLR.WHITE:'#F5F5F5')
      .setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
  row+=10;

  // Aging
  rh_(sh,row,28);
  mw_(sh,row,2,12).setValue('⏳  AGING REPORT')
    .setFontFamily('Arial').setFontSize(12).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground(CLR.STEEL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  ['Age Range','0–7 days','8–14 days','15–30 days','31–60 days','60+ days','Total Open'].forEach(function(h,i){
    sh.getRange(row,i+2).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(CLR.CHARCOAL).setHorizontalAlignment('center');
  });
  rh_(sh,row,26); row++;
  rh_(sh,row,32);
  sh.getRange(row,2).setValue('Count').setFontFamily('Arial').setFontSize(10).setFontWeight('bold').setFontColor(CLR.CHARCOAL).setVerticalAlignment('middle');
  row+=4;

  // ── TREND ANALYSIS SECTION ──
  rh_(sh,row,12); row++;
  rh_(sh,row,32);
  mw_(sh,row,1,COLS).setValue('📊  TREND ANALYSIS — Click Refresh Dashboard to populate')
    .setFontFamily('Arial').setFontSize(14).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground('#1A237E')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  rh_(sh,row,8); mw_(sh,row,1,COLS).setBackground('#283593'); row++;
  rh_(sh,row,12); row++;

  // Top Recurring Equipment + Chronic Equipment
  rh_(sh,row,26);
  mw_(sh,row,2,6).setValue('🔁  TOP RECURRING EQUIPMENT')
    .setFontFamily('Arial').setFontSize(11).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground('#37474F')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  mw_(sh,row,9,5).setValue('⚠️  CHRONIC EQUIPMENT (3+ tickets in 90 days)')
    .setFontFamily('Arial').setFontSize(11).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground(CLR.CRITICAL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  ['Equipment','Dept','Ticket Count','Avg Close (days)','Last Ticket'].forEach(function(h,i){
    sh.getRange(row,i+2).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground('#546E7A').setHorizontalAlignment('center');
  });
  ['Equipment','Dept','# Tickets','Days Span','Flag'].forEach(function(h,i){
    sh.getRange(row,i+9).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground('#C62828').setHorizontalAlignment('center');
  });
  rh_(sh,row,26); row++;
  for(var eq=0;eq<8;eq++){
    rh_(sh,row+eq,26);
    sh.getRange(row+eq,2,1,5).setBackground(eq%2===0?CLR.WHITE:'#ECEFF1')
      .setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
    sh.getRange(row+eq,9,1,5).setBackground(eq%2===0?CLR.WHITE:'#FFEBEE')
      .setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
  row+=10;

  // Problem Type Frequency + Top Parts
  rh_(sh,row,26);
  mw_(sh,row,2,6).setValue('🔍  PROBLEM TYPE FREQUENCY')
    .setFontFamily('Arial').setFontSize(11).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground('#37474F')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  mw_(sh,row,9,5).setValue('📦  TOP PARTS REPEATEDLY NEEDED')
    .setFontFamily('Arial').setFontSize(11).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground('#4A148C')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  ['Problem Type','Ticket Count','% of Total','Avg Close (days)','Top Dept'].forEach(function(h,i){
    sh.getRange(row,i+2).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground('#546E7A').setHorizontalAlignment('center');
  });
  ['Part Description','Times Requested','Last Requested','Tickets'].forEach(function(h,i){
    sh.getRange(row,i+9).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground('#6A1B9A').setHorizontalAlignment('center');
  });
  rh_(sh,row,26); row++;
  for(var pt=0;pt<10;pt++){
    rh_(sh,row+pt,26);
    sh.getRange(row+pt,2,1,5).setBackground(pt%2===0?CLR.WHITE:'#ECEFF1')
      .setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
    sh.getRange(row+pt,9,1,4).setBackground(pt%2===0?CLR.WHITE:'#F3E5F5')
      .setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
  row+=12;

  // Building/Zone Hotspots
  rh_(sh,row,26);
  mw_(sh,row,2,12).setValue('🏭  BUILDING / ZONE TICKET HOTSPOTS')
    .setFontFamily('Arial').setFontSize(11).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground('#37474F')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  ['Building / Zone','Total Tickets','Open','Unplanned','Avg Close (days)','Top Problem Type','Top Equipment'].forEach(function(h,i){
    sh.getRange(row,i+2).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground('#546E7A').setHorizontalAlignment('center');
  });
  rh_(sh,row,26); row++;
  for(var z=0;z<10;z++){
    rh_(sh,row+z,26);
    sh.getRange(row+z,2,1,7).setBackground(z%2===0?CLR.WHITE:'#ECEFF1')
      .setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
  row+=12;

  // Avg Time to Close by Dept + Priority
  rh_(sh,row,26);
  mw_(sh,row,2,12).setValue('⏱️  AVERAGE TIME TO CLOSE — By Department & Priority')
    .setFontFamily('Arial').setFontSize(11).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground('#37474F')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  ['Department','LOW (days)','MEDIUM (days)','HIGH (days)','CRITICAL (days)','ALL (days)'].forEach(function(h,i){
    sh.getRange(row,i+2).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground('#546E7A').setHorizontalAlignment('center');
  });
  rh_(sh,row,26); row++;
  for(var cl=0;cl<8;cl++){
    rh_(sh,row+cl,26);
    sh.getRange(row+cl,2,1,6).setBackground(cl%2===0?CLR.WHITE:'#ECEFF1')
      .setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
}

function buildDeptDrillDownSheet_(ss) {
  var sh=resetSheet_(ss,SH.DEPT_DRILL,CLR.TAB_DASH,0);
  sh.setHiddenGridlines(true);
  var COLS=14;
  for(var r=1;r<=60;r++) sh.getRange(r,1,1,COLS).setBackground(CLR.BG);
  setColWidths_(sh,[30,155,155,155,155,155,155,155,155,155,155,155,155,30]);
  var row=1;
  rh_(sh,row,8); fillRow_(sh,row,1,COLS,CLR.CHARCOAL); row++;
  rh_(sh,row,50);
  mw_(sh,row,1,COLS).setValue('🔍  DEPARTMENT DRILL-DOWN')
    .setFontFamily('Arial').setFontSize(22).setFontWeight('bold')
    .setFontColor(CLR.GOLD).setBackground(CLR.CHARCOAL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  rh_(sh,row,8); fillRow_(sh,row,1,COLS,CLR.CHARCOAL); row++;
  rh_(sh,row,12); row++;
  // Dept dropdown slicer
  rh_(sh,row,38);
  mw_(sh,row,2,3).setValue('SELECT DEPARTMENT:')
    .setFontFamily('Arial').setFontSize(13).setFontWeight('bold')
    .setFontColor(CLR.CHARCOAL).setHorizontalAlignment('right').setVerticalAlignment('middle');
  mw_(sh,row,5,4).setValue('ALL')
    .setFontFamily('Arial').setFontSize(13).setFontWeight('bold')
    .setFontColor(CLR.STEEL).setBackground(CLR.WHITE)
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBorder(true,true,true,true,false,false,CLR.CHARCOAL,SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  var deptList=['ALL','ELECTRICAL','MACHINE SHOP','FACILITIES','PLASTICS','METALS','LITHO'];
  var dRule=SpreadsheetApp.newDataValidation().requireValueInList(deptList,true).setAllowInvalid(false).build();
  sh.getRange(row,5,1,4).merge().setDataValidation(dRule);
  row++;
  rh_(sh,row,12); row++;
  // KPI cards row
  rh_(sh,row,28);
  mw_(sh,row,2,12).setValue('📊  KPIs FOR SELECTED DEPARTMENT — Refresh after changing selection')
    .setFontFamily('Arial').setFontSize(11).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground(CLR.STEEL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  [{label:'OPEN',color:CLR.ORANGE},{label:'WAITING',color:CLR.BLUE},{label:'CRITICAL',color:CLR.RED},
   {label:'COMPLETED',color:CLR.GREEN},{label:'TOTAL HRS',color:CLR.CHARCOAL},{label:'TEMP FIX',color:CLR.YELLOW}].forEach(function(k,i){
    var col=2+(i*2);
    rh_(sh,row,26);
    mw_(sh,row,col,2).setValue(k.label).setFontFamily('Arial').setFontSize(10).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(k.color).setHorizontalAlignment('center').setVerticalAlignment('middle');
    rh_(sh,row+1,48);
    mw_(sh,row+1,col,2).setValue('—').setFontFamily('Arial').setFontSize(26).setFontWeight('bold')
      .setFontColor(k.color).setBackground(CLR.WHITE).setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setBorder(true,true,true,true,false,false,k.color,SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  });
  row+=2; rh_(sh,row,12); row++;
  // Monthly breakdown
  rh_(sh,row,28);
  mw_(sh,row,2,12).setValue('📅  MONTHLY BREAKDOWN')
    .setFontFamily('Arial').setFontSize(12).setFontWeight('bold')
    .setFontColor(CLR.WHITE).setBackground(CLR.STEEL)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;
  ['Month','Open','Waiting','Pending','On Hold','Completed','Total','Plan Hrs','Unplan Hrs','Critical'].forEach(function(h,i){
    sh.getRange(row,i+2).setValue(h).setFontFamily('Arial').setFontSize(9).setFontWeight('bold')
      .setFontColor(CLR.WHITE).setBackground(CLR.CHARCOAL).setHorizontalAlignment('center');
  });
  rh_(sh,row,26); row++;
  for(var m=0;m<12;m++){
    rh_(sh,row+m,26);
    sh.getRange(row+m,2,1,10).setBackground(m%2===0?CLR.WHITE:'#F5F5F5')
      .setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
}

function refreshDashboardData_(ss) {
  var dashSh=ss.getSheetByName(SH.DASH);
  var logSh=ss.getSheetByName(SH.MASTER_LOG);
  if(!dashSh||!logSh||logSh.getLastRow()<2) return;
  var data=logSh.getRange(2,1,logSh.getLastRow()-1,ML_COLS).getValues();
  var ticketMap={};
  data.forEach(function(r){var tn=String(r[ML.TICKET_NO-1]);if(tn) ticketMap[tn]=r;});
  var depts={};
  var techStats={};
  var today=new Date();
  Object.keys(ticketMap).forEach(function(tn){
    var r=ticketMap[tn];
    var dept=String(r[ML.DEPT-1])||'UNKNOWN';
    var status=String(r[ML.STATUS-1]).toUpperCase();
    var actualH=parseFloat(r[ML.ACTUAL_HOURS-1])||0;
    var dType=String(r[ML.DOWNTIME_TYPE-1]).toUpperCase();
    var tech=String(r[ML.ASSIGNED_TO-1]);
    if(!depts[dept]) depts[dept]={open:0,waiting:0,pending:0,hold:0,complete:0,total:0,planned:0,unplanned:0,ages:[]};
    depts[dept].total++;
    if(status==='OPEN') depts[dept].open++;
    else if(status==='WAITING') depts[dept].waiting++;
    else if(status==='PENDING PARTS') depts[dept].pending++;
    else if(status==='ON HOLD') depts[dept].hold++;
    else if(status==='COMPLETE'||status==='CLOSED') depts[dept].complete++;
    if(dType==='PLANNED') depts[dept].planned+=actualH;
    else if(dType==='UNPLANNED') depts[dept].unplanned+=actualH;
    if(status!=='COMPLETE'&&status!=='CLOSED'&&r[ML.DATE_OPENED-1]){
      var age=Math.floor((today-new Date(r[ML.DATE_OPENED-1]))/(86400000));
      depts[dept].ages.push(age);
    }
    if(tech){
      if(!techStats[tech]) techStats[tech]={assigned:0,complete:0,closed:0,hours:0};
      techStats[tech].assigned++;
      if(status==='COMPLETE') techStats[tech].complete++;
      if(status==='CLOSED') techStats[tech].closed++;
      techStats[tech].hours+=actualH;
    }
  });
  // Tech summary rows start at approx row 27
  var techStart=27;
  Object.keys(techStats).sort().forEach(function(tech,i){
    var t=techStats[tech];
    var avg=t.assigned>0?(t.hours/t.assigned).toFixed(1):0;
    dashSh.getRange(techStart+i,2,1,6).setValues([[tech,t.assigned,t.complete,t.closed,t.hours.toFixed(1),avg]])
      .setBackground(i%2===0?CLR.WHITE:'#F5F5F5').setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center');
  });
  // Dept breakdown rows start at approx row 41
  var deptStart=41;
  Object.keys(depts).sort().forEach(function(dept,i){
    var d=depts[dept];
    var avgAge=d.ages.length>0?Math.round(d.ages.reduce(function(a,b){return a+b;},0)/d.ages.length):0;
    dashSh.getRange(deptStart+i,2,1,10).setValues([[dept,d.open,d.waiting,d.pending,d.hold,d.complete,d.total,d.planned.toFixed(1),d.unplanned.toFixed(1),avgAge]])
      .setBackground(i%2===0?CLR.WHITE:'#F5F5F5').setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center');
  });
  // Aging rows
  var total=Object.keys(ticketMap).length;
  var closed=Object.keys(ticketMap).filter(function(tn){return String(ticketMap[tn][ML.STATUS-1]).toUpperCase()==='CLOSED';}).length;
  var agingRow=53;
  var buckets=[0,0,0,0,0,0];
  Object.keys(ticketMap).forEach(function(tn){
    var r=ticketMap[tn]; var status=String(r[ML.STATUS-1]).toUpperCase();
    if(status==='COMPLETE'||status==='CLOSED') return;
    var dO=r[ML.DATE_OPENED-1]; if(!dO) return;
    var age=Math.floor((today-new Date(dO))/86400000);
    if(age<=7) buckets[0]++; else if(age<=14) buckets[1]++; else if(age<=30) buckets[2]++;
    else if(age<=60) buckets[3]++; else buckets[4]++;
    buckets[5]++;
  });
  buckets.forEach(function(v,i){dashSh.getRange(agingRow,i+3).setValue(v).setFontFamily('Arial').setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');});

  // ── TREND ANALYSIS DATA ──
  // Row offsets — based on dashboard layout (aging ends ~row 56, trend starts after +4 spacer rows)
  var TREND_BASE = agingRow + 6;

  // ── Recurring Equipment ──
  var equipCount={}, equipDept={}, equipLast={}, equipClose={};
  Object.keys(ticketMap).forEach(function(tn){
    var r=ticketMap[tn];
    var key=(String(r[ML.SPECIFIC_EQUIP-1])||String(r[ML.EQUIP_TYPE-1])||'').trim();
    if(!key) return;
    var dept=String(r[ML.DEPT-1]);
    var dO=r[ML.DATE_OPENED-1]; var dC=r[ML.DATE_CLOSED-1];
    equipCount[key]=(equipCount[key]||0)+1;
    equipDept[key]=dept;
    if(dO){if(!equipLast[key]||new Date(dO)>new Date(equipLast[key])) equipLast[key]=dO;}
    if(dO&&dC){
      var days=Math.floor((new Date(dC)-new Date(dO))/86400000);
      if(!equipClose[key]) equipClose[key]={sum:0,n:0};
      equipClose[key].sum+=days; equipClose[key].n++;
    }
  });
  var EQUIP_ROW = TREND_BASE + 4;
  Object.keys(equipCount).sort(function(a,b){return equipCount[b]-equipCount[a];}).slice(0,8).forEach(function(eq,i){
    var avg=equipClose[eq]?Math.round(equipClose[eq].sum/equipClose[eq].n):'—';
    var last=equipLast[eq]?Utilities.formatDate(new Date(equipLast[eq]),Session.getScriptTimeZone(),'MM/dd/yy'):'—';
    dashSh.getRange(EQUIP_ROW+i,2,1,5).setValues([[eq,equipDept[eq]||'—',equipCount[eq],avg,last]])
      .setBackground(i%2===0?CLR.WHITE:'#ECEFF1').setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center');
  });

  // ── Chronic Equipment (3+ tickets in 90 days) ──
  var chronic=[];
  Object.keys(equipCount).forEach(function(eq){
    var tix=Object.keys(ticketMap).filter(function(tn){
      var r=ticketMap[tn];
      var key=(String(r[ML.SPECIFIC_EQUIP-1])||String(r[ML.EQUIP_TYPE-1])||'').trim();
      if(key!==eq) return false;
      var dO=r[ML.DATE_OPENED-1]; if(!dO) return false;
      return (today-new Date(dO))/86400000<=90;
    });
    if(tix.length>=3){
      var dates=tix.map(function(tn){return new Date(ticketMap[tn][ML.DATE_OPENED-1]);});
      var span=Math.round((Math.max.apply(null,dates)-Math.min.apply(null,dates))/86400000);
      chronic.push({eq:eq,dept:equipDept[eq]||'—',count:tix.length,span:span});
    }
  });
  chronic.sort(function(a,b){return b.count-a.count;}).slice(0,8).forEach(function(c,i){
    dashSh.getRange(EQUIP_ROW+i,9,1,5).setValues([[c.eq,c.dept,c.count,c.span+'d','🚨 CHRONIC']])
      .setBackground(i%2===0?CLR.WHITE:'#FFEBEE').setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center');
  });

  // ── Problem Type Frequency ──
  var probCount={}, probDept={}, probClose={};
  Object.keys(ticketMap).forEach(function(tn){
    var r=ticketMap[tn];
    var pt=(String(r[ML.PROBLEM_TYPE-1])||'Not Set').trim();
    var dept=String(r[ML.DEPT-1]);
    var dO=r[ML.DATE_OPENED-1]; var dC=r[ML.DATE_CLOSED-1];
    probCount[pt]=(probCount[pt]||0)+1;
    if(!probDept[pt]) probDept[pt]={};
    probDept[pt][dept]=(probDept[pt][dept]||0)+1;
    if(dO&&dC){
      var days=Math.floor((new Date(dC)-new Date(dO))/86400000);
      if(!probClose[pt]) probClose[pt]={sum:0,n:0};
      probClose[pt].sum+=days; probClose[pt].n++;
    }
  });
  var PROB_ROW = EQUIP_ROW + 12;
  var probTotal=Object.keys(ticketMap).length;
  Object.keys(probCount).sort(function(a,b){return probCount[b]-probCount[a];}).slice(0,10).forEach(function(pt,i){
    var pct=Math.round((probCount[pt]/Math.max(1,probTotal))*100)+'%';
    var avg=probClose[pt]?Math.round(probClose[pt].sum/probClose[pt].n)+'d':'—';
    var topDept=Object.keys(probDept[pt]).sort(function(a,b){return probDept[pt][b]-probDept[pt][a];})[0]||'—';
    dashSh.getRange(PROB_ROW+i,2,1,5).setValues([[pt,probCount[pt],pct,avg,topDept]])
      .setBackground(i%2===0?CLR.WHITE:'#ECEFF1').setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center');
  });

  // ── Building/Zone Hotspots ──
  var zoneData={};
  Object.keys(ticketMap).forEach(function(tn){
    var r=ticketMap[tn];
    var zone=(String(r[ML.BUILDING_ZONE-1])||'Unknown').trim();
    var status=String(r[ML.STATUS-1]).toUpperCase();
    var dType=String(r[ML.DOWNTIME_TYPE-1]).toUpperCase();
    var dO=r[ML.DATE_OPENED-1]; var dC=r[ML.DATE_CLOSED-1];
    var pt=String(r[ML.PROBLEM_TYPE-1])||'';
    var eq=(String(r[ML.SPECIFIC_EQUIP-1])||String(r[ML.EQUIP_TYPE-1])||'').trim();
    if(!zoneData[zone]) zoneData[zone]={total:0,open:0,unplanned:0,closeDays:[],problems:{},equip:{}};
    zoneData[zone].total++;
    if(status!=='CLOSED'&&status!=='COMPLETE') zoneData[zone].open++;
    if(dType==='UNPLANNED') zoneData[zone].unplanned++;
    if(dO&&dC) zoneData[zone].closeDays.push(Math.floor((new Date(dC)-new Date(dO))/86400000));
    if(pt) zoneData[zone].problems[pt]=(zoneData[zone].problems[pt]||0)+1;
    if(eq) zoneData[zone].equip[eq]=(zoneData[zone].equip[eq]||0)+1;
  });
  var ZONE_ROW = PROB_ROW + 14;
  Object.keys(zoneData).sort(function(a,b){return zoneData[b].total-zoneData[a].total;}).slice(0,10).forEach(function(zone,i){
    var z=zoneData[zone];
    var avgC=z.closeDays.length?Math.round(z.closeDays.reduce(function(a,b){return a+b;},0)/z.closeDays.length)+'d':'—';
    var topProb=Object.keys(z.problems).sort(function(a,b){return z.problems[b]-z.problems[a];})[0]||'—';
    var topEq=Object.keys(z.equip).sort(function(a,b){return z.equip[b]-z.equip[a];})[0]||'—';
    dashSh.getRange(ZONE_ROW+i,2,1,7).setValues([[zone,z.total,z.open,z.unplanned,avgC,topProb,topEq]])
      .setBackground(i%2===0?CLR.WHITE:'#ECEFF1').setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center');
  });

  // ── Avg Time to Close by Dept + Priority ──
  var closeMap={};
  Object.keys(ticketMap).forEach(function(tn){
    var r=ticketMap[tn];
    var dept=String(r[ML.DEPT-1]);
    var pri=String(r[ML.PRIORITY-1]).toUpperCase();
    var dO=r[ML.DATE_OPENED-1]; var dC=r[ML.DATE_CLOSED-1];
    if(!dO||!dC) return;
    var days=Math.floor((new Date(dC)-new Date(dO))/86400000);
    if(!closeMap[dept]) closeMap[dept]={LOW:[],MEDIUM:[],HIGH:[],CRITICAL:[],ALL:[]};
    if(closeMap[dept][pri]) closeMap[dept][pri].push(days);
    closeMap[dept].ALL.push(days);
  });
  function avgDays(arr){return arr&&arr.length?Math.round(arr.reduce(function(a,b){return a+b;},0)/arr.length)+'d':'—';}
  var CLOSE_ROW = ZONE_ROW + 14;
  Object.keys(closeMap).sort().forEach(function(dept,i){
    var c=closeMap[dept];
    dashSh.getRange(CLOSE_ROW+i,2,1,6).setValues([[dept,avgDays(c.LOW),avgDays(c.MEDIUM),avgDays(c.HIGH),avgDays(c.CRITICAL),avgDays(c.ALL)]])
      .setBackground(i%2===0?CLR.WHITE:'#ECEFF1').setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center');
  });
}


// ═══════════════════════════════════════════════════════════════════════════
//  BUILD TREND ANALYSIS TABLES — populates Dept Drill-Down trend section
// ═══════════════════════════════════════════════════════════════════════════
function buildTrendAnalysisTables_(ss, sheet, startRow) {
  try {
    var logSh = ss.getSheetByName(SH.MASTER_LOG);
    if (!logSh || logSh.getLastRow() < 2) return;
    var data = logSh.getRange(2,1,logSh.getLastRow()-1,ML_COLS).getValues();
    var ticketMap = {};
    data.forEach(function(r){
      var tn=String(r[ML.TICKET_NO-1]||'').trim(); if(tn) ticketMap[tn]=r;
    });

    var filterDept = '';
    try {
      filterDept = String(sheet.getRange(4,4).getValue()).toUpperCase().trim();
    } catch(e) {}
    if (filterDept === 'ALL DEPARTMENTS' || filterDept === 'ALL') filterDept = '';

    var monthly = {};
    Object.keys(ticketMap).forEach(function(tn) {
      var r    = ticketMap[tn];
      var dept = String(r[ML.DEPT-1]||'');
      var dg   = getDeptGroup_(dept);
      if (filterDept && dg !== filterDept) return;
      var dO = r[ML.DATE_OPENED-1];
      if (!dO) return;
      var m = Utilities.formatDate(new Date(dO), Session.getScriptTimeZone(), 'MMM yyyy');
      if (!monthly[m]) monthly[m] = {open:0,waiting:0,pending:0,hold:0,complete:0,total:0,planned:0,unplanned:0,crit:0};
      monthly[m].total++;
      var s  = String(r[ML.STATUS-1]||'').toUpperCase();
      var dt = String(r[ML.DOWNTIME_TYPE-1]||'').toUpperCase();
      var ah = parseFloat(r[ML.ACTUAL_HOURS-1])||0;
      if(s==='OPEN')                      monthly[m].open++;
      if(s==='WAITING')                   monthly[m].waiting++;
      if(s==='PENDING PARTS')             monthly[m].pending++;
      if(s==='ON HOLD')                   monthly[m].hold++;
      if(s==='COMPLETE'||s==='CLOSED')    monthly[m].complete++;
      if(dt==='PLANNED')                  monthly[m].planned+=ah;
      if(dt==='UNPLANNED')                monthly[m].unplanned+=ah;
      if(String(r[ML.PRIORITY-1]||'').toUpperCase()==='CRITICAL') monthly[m].crit++;
    });

    var months = Object.keys(monthly).sort(function(a,b){
      return new Date('1 '+a) - new Date('1 '+b);
    }).reverse().slice(0,12);

    // Clear old data first
    sheet.getRange(startRow, 2, 12, 10).clearContent().setBackground('#FFFFFF');

    months.forEach(function(m,i) {
      var mo = monthly[m];
      sheet.getRange(startRow+i, 2, 1, 10).setValues([[
        m, mo.open, mo.waiting, mo.pending, mo.hold, mo.complete,
        mo.total, mo.planned.toFixed(1), mo.unplanned.toFixed(1), mo.crit
      ]]).setBackground(i%2===0?'#FFFFFF':'#F5F5F5')
        .setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center');
    });
  } catch(e) {
    Logger.log('buildTrendAnalysisTables_ error: '+e.message);
  }
}
