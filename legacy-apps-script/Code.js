// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  CSC MAINTENANCE TRACKER v3.1 — Code.gs                                
// ║  Container Supply Co. — Garden Grove, CA                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════
//  COLOR CONSTANTS
//  ITEM 7B — LOW priority changed to blue (cold = low urgency, distinct from green)
// ═══════════════════════════════════════════════════════════════════════════
var CLR = {
  CHARCOAL:'#3C3C3C', DEEP_STEEL:'#2A2A2A', STEEL:'#4A4A4A',
  MED_GRAY:'#616161', LIGHT_GRAY:'#D9D9D9', BORDER:'#B0B0B0',
  BG:'#F5F5F5', DISABLED:'#EBEBEB', WHITE:'#FFFFFF', BLACK:'#000000',
  GOLD:'#FFD700', GOLD_LT:'#FFE066',
  RED:'#C62828', RED_LT:'#FFCDD2',
  GREEN:'#2E7D32', GREEN_LT:'#C8E6C9',
  ORANGE:'#EF6C00', ORANGE_LT:'#FFE0B2',
  BLUE:'#1565C0', BLUE_LT:'#BBDEFB',
  NAVY:'#1B2A3C',
  YELLOW:'#F9A825', YELLOW_LT:'#FFF9C4',
  PURPLE:'#6A1B9A', PURPLE_LT:'#E1BEE7',
  CRITICAL:'#B71C1C', CRITICAL_LT:'#FFCDD2',
  HIGH:'#E64A19', HIGH_LT:'#FFE0B2',
  MEDIUM:'#F9A825', MEDIUM_LT:'#FFF9C4',
  LOW:'#1565C0', LOW_LT:'#BBDEFB',  // ITEM 7B — was green, now blue
  TAG_RED:'#B71C1C', TAG_YELLOW:'#F57F17', TAG_ORANGE:'#E64A19',
  TAG_GREEN:'#2E7D32', TAB_DASH:'#3C3C3C', TAB_TRACK:'#4A4A4A',
  TAB_DATA:'#616161', TAB_REPORT:'#757575', TAB_CONFIG:'#9E9E9E',
  TAB_WAIT:'#EF6C00', TAB_TEMP:'#F9A825', TAB_HIST:'#1565C0',
  TAB_PARTS:'#2E7D32', TAB_ARCH:'#546E7A'
};

// ═══════════════════════════════════════════════════════════════════════════
//  TRACKER SHEET LAYOUT CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
var TK_DATA_COL         = 2;
var TRACKER_FROZEN      = 5;
var QUEUE_FROZEN        = 6;
var TRACKER_PRIO_BANNER = 6;
var TRACKER_PRIO_HDR    = 7;
var TRACKER_PRIO_START  = 8;
var TRACKER_PRIO_END    = 27;
var TRACKER_OPEN_BANNER = 28;
var TRACKER_OPEN_HDR    = 29;
var TRACKER_OPEN_START  = 30;

// ═══════════════════════════════════════════════════════════════════════════
//  SHEET NAMES
// ═══════════════════════════════════════════════════════════════════════════
var SH = {
  DASH:'📊 System Dashboard', 
  DEPT_DRILL:'🔍 Dept Drill-Down',
  WAITING:'⏳ Waiting Queue', 
  OPEN:'📂 Open Tickets', 
  CLOSED:'✅ Closed Tickets',
  TRACKER_EL:'📋 Tracker — Electrical', 
  TRACKER_MS:'📋 Tracker — Machine Shop',
  TRACKER_FAC:'📋 Tracker — Facilities', 
  TRACKER_PL:'📋 Tracker — Plastics',
  TRACKER_MTL:'📋 Tracker — Metals', 
  TRACKER_LTH:'📋 Tracker — Litho',
  TEMP_FIX:'🔧 Temp Fix Monitor', 
  TICKET_HIST:'📜 Ticket History',
  PARTS_NEEDED:'🔩 Parts Needed', 
  EQUIP_HOLD_LOG:'🏷️ Equipment Hold Log',
  REPORTING:'📈 Reporting', 
  TECH_WORK:'👷 Tech Work Board',
  RPT_DB:'📝 Report Database', 
  MASTER_LOG:'🗄️ Master Log',
  EQUIP_INV:'⚙️ Equipment Inventory', 
  DATA_VALID:'📋 Data Lists',
  CONFIG:'⚙️ Configuration', 
  ARCHIVE:'🗃️ Archive',
  MANAGER_ACCESS:'👔 Manager Access', 
  EQUIP_CACHE:'⚙️ Equip Inventory Cache',
  TRANSFER_LOG:'📋 Transfer Log', 
  DEPT_MAP:'📋 Dept Map'
};

// ═══════════════════════════════════════════════════════════════════════════
//  DEPARTMENT TRACKERS
// ═══════════════════════════════════════════════════════════════════════════
var DEPT_TRACKERS = [
  {key:'EL',  name:SH.TRACKER_EL,  dept:'ELECTRICAL',   color:'#1A237E'},
  {key:'MS',  name:SH.TRACKER_MS,  dept:'MACHINE SHOP', color:'#4A4A4A'},
  {key:'FAC', name:SH.TRACKER_FAC, dept:'FACILITIES',   color:'#263238'},
  {key:'PL',  name:SH.TRACKER_PL,  dept:'PLASTICS',     color:'#0D47A1'},
  {key:'MTL', name:SH.TRACKER_MTL, dept:'METALS',       color:'#37474F'},
  {key:'LTH', name:SH.TRACKER_LTH, dept:'LITHO',        color:'#1B2838'}
];

// Accounting dept codes — match equipment inventory and ticket number generation
// Routing to tracker sheets uses DEPT_TRACKERS (system names), NOT these codes
var DEPT_CODES = {
  'METAL':       '001', 'PLASTIC':     '003', 'LITHO':       '004',
  'PLASTIC DEC': '006', 'QA':          '007', 'M/S':         '008',
  'S/R':         '009', 'SALES':       '030', 'G&A':         '031'
};

var PRIORITY_CONFIG = {
  'CRITICAL':{color:CLR.CRITICAL, lt:CLR.CRITICAL_LT, order:1},
  'HIGH':    {color:CLR.HIGH,     lt:CLR.HIGH_LT,     order:2},
  'MEDIUM':  {color:CLR.MEDIUM,   lt:CLR.MEDIUM_LT,   order:3},
  'LOW':     {color:CLR.LOW,      lt:CLR.LOW_LT,      order:4}  // ITEM 7B — now blue
};

var _deptMappingCache = null;
function getDeptMapping_() {
  if (_deptMappingCache) return _deptMappingCache;
  try {
    var ss=SpreadsheetApp.getActiveSpreadsheet(), sh=ss.getSheetByName(SH.DEPT_MAP);
    if(!sh||sh.getLastRow()<2) return {};
    var data=sh.getRange(2,1,sh.getLastRow()-1,2).getValues(), map={};
    data.forEach(function(r){var src=String(r[0]||'').trim().toUpperCase(), dest=String(r[1]||'').trim().toUpperCase(); if(src&&dest) map[src]=dest;});
    _deptMappingCache=map; return map;
  } catch(e){Logger.log('getDeptMapping_ error: '+e.message);return{};}
}
function getDeptGroup_(dept){var d=String(dept||'').trim().toUpperCase(), map=getDeptMapping_();return map[d]||d;}

// ═══════════════════════════════════════════════════════════════════════════
//  MASTER LOG COLUMNS (35 cols)
// ═══════════════════════════════════════════════════════════════════════════
var ML = {
  ROW_ID:1,TICKET_NO:2,TIMESTAMP:3,ACTION:4,STATUS:5,DEPT:6,
  BUILDING_ZONE:7,EQUIP_TYPE:8,EQUIP_CODE:9,SPECIFIC_EQUIP:10,
  DOWNTIME_TYPE:11,PRIORITY:12,DESCRIPTION:13,ASSIGNED_TO:14,
  EST_HOURS:15,ACTUAL_HOURS:16,DATE_OPENED:17,DATE_COMPLETED:18,
  DATE_CLOSED:19,CORRECTIVE_ACT:20,ROOT_CAUSE:21,WORK_SUMMARY:22,
  FIX_TYPE:23,TEMP_FIX_FLAG:24,PARTS_NEEDED:25,PARTS_STATUS:26,
  EQUIP_TAG_STATUS:27,VERIFIED_BY:28,VERIFIED_DATE:29,ADDED_BY:30,
  UPDATED_BY:31,NOTES:32,PROBLEM_TYPE:33,TRACKER_GROUP:34,LINE_NO:35
};
var ML_COLS=35;
var ML_HEADERS=['Row ID','Ticket #','Timestamp','Action','Status','Department','Building / Zone','Equipment Type','Equipment Code','Equipment Description','Downtime Type','Priority','Description','Assigned To','Est Hours','Actual Hours','Date Opened','Date Completed','Date Closed','Corrective Action','Root Cause','Work Summary','Fix Type','Temp Fix Flag','Parts Needed Flag','Parts Status','Equip Tag Status','Verified By','Verified Date','Added By','Updated By','Notes','Problem Type','Tracker Group','Line #'];

// ═══════════════════════════════════════════════════════════════════════════
//  TRACKER COLUMNS (26 cols)
// ═══════════════════════════════════════════════════════════════════════════
var TK = {
  TICKET_NO:1,STATUS:2,PRIORITY:3,DEPT:4,BUILDING_ZONE:5,
  EQUIP_TYPE:6,EQUIP_CODE:7,SPECIFIC_EQUIP:8,DOWNTIME_TYPE:9,
  PROBLEM_TYPE:10,DESCRIPTION:11,LINE_NO:12,ASSIGNED_TO:13,
  EST_HOURS:14,ACTUAL_HOURS:15,DATE_OPENED:16,LAST_UPDATED:17,
  FIX_TYPE:18,TEMP_FIX_FLAG:19,PARTS_NEEDED:20,PARTS_STATUS:21,
  VERIFIED_BY:22,VERIFIED_DATE:23,ADDED_BY:24,UPDATED_BY:25,NOTES:26
};
var TK_COLS=26;
var TK_HEADERS=['Ticket #','Ticket Status','Priority','Department','Building / Zone','Equipment Type','Equip Code','Equipment Description','Downtime Type','Problem Type','Problem Description','Line #','Assigned To','Est Hrs','Act Hrs','Date Opened','Last Updated','Fix Type','Temp Fix','Parts Needed','Parts Status','Verified By','Verified Date','Added By','Updated By','Notes'];

var RDB={REPORT_ID:1,TICKET_NO:2,DATE:3,DEPT:4,BUILDING_ZONE:5,EQUIP_TYPE:6,EQUIP_CODE:7,SPECIFIC_EQUIP:8,PROBLEM_DESC:9,ROOT_CAUSE:10,CORRECTIVE_ACT:11,PREVENTIVE_ACT:12,WORK_SUMMARY:13,FIX_TYPE:14,TEMP_FIX_FLAG:15,PARTS_USED:16,LABOR_HOURS:17,ADDED_BY:18,COMPLETED_BY:19,VERIFIED_BY:20,VERIFIED_DATE:21,UPDATED_BY:22,PRIORITY:23,DOWNTIME_TYPE:24,IMAGE_LINKS:25,PDF_LINK:26,NOTES:27};
var RDB_COLS=27;
var TH={HIST_ID:1,TICKET_NO:2,TIMESTAMP:3,EVENT_TYPE:4,STATUS_FROM:5,STATUS_TO:6,PERFORMED_BY:7,NOTES:8};
var TH_COLS=8;
var TH_HEADERS=['History ID','Ticket #','Timestamp','Event Type','Status From','Status To','Performed By','Notes'];
var TH_EVENTS={CREATED:'CREATED',UPDATED:'UPDATED',ASSIGNED:'ASSIGNED',COMPLETED:'COMPLETED',VERIFIED:'VERIFIED',CLOSED:'CLOSED',TAGGED:'EQUIPMENT TAGGED',PARTS_REQUESTED:'PARTS REQUESTED',PARTS_UPDATED:'PARTS UPDATED',TEMP_FIX:'TEMP FIX FLAGGED',MOVED_TO_WAITING:'MOVED TO WAITING',MOVED_TO_OPEN:'MOVED TO OPEN'};
var TF={TEMP_ID:1,TICKET_NO:2,EQUIP_CODE:3,SPECIFIC_EQUIP:4,DEPT:5,BUILDING_ZONE:6,DATE_FLAGGED:7,DESCRIPTION:8,TEMP_FIX_DESC:9,FREQ_DAYS:10,LAST_INSPECTED:11,NEXT_DUE:12,STATUS:13,FLAGGED_BY:14,CLEARED_BY:15,CLEARED_DATE:16,NOTES:17};
var TF_COLS=17;
var PN={PART_ID:1,PART_DESC:2,TICKET_NO:3,EQUIP_CODE:4,SPECIFIC_EQUIP:5,DEPT:6,DATE_REQUESTED:7,PARTS_STATUS:8,DATE_ORDERED:9,DATE_RECEIVED:10,ORDERED_BY:11,NOTES:12};
var PN_COLS=12;
var EHL={TAG_ID:1,TICKET_NO:2,EQUIP_CODE:3,SPECIFIC_EQUIP:4,DEPT:5,BUILDING_ZONE:6,TAG_TYPE:7,DATE_TAGGED:8,TAGGED_BY:9,REASON:10,EQUIP_STATUS:11,CLEARED_BY:12,CLEARED_DATE:13,NOTES:14};
var EHL_COLS=14;
var TL={TRANSFER_ID:1,TICKET_NO:2,TIMESTAMP:3,FROM_DEPT:4,TO_DEPT:5,TRANSFERRED_BY:6,REASON:7,EMAIL_SENT:8};
var TL_COLS=8;

// ═══════════════════════════════════════════════════════════════════════════
//  MENU
// ═══════════════════════════════════════════════════════════════════════════
function onOpen() {
  var ui=SpreadsheetApp.getUi();
  ui.createMenu('⚡ Maintenance')
    .addItem('📊 Open Dashboard','goToDashboard')
    .addSeparator()
    .addItem('➕ Add New Ticket','showAddTicket')
    .addItem('✏️ Update Ticket','showUpdateTicket')
    .addItem('📝 Service Report','showServiceReport')
    .addItem('🏷️ Print Equipment Hold Tag','showEquipHoldTag')
    .addSeparator()
    .addItem('🔄 Close Month & Start New','showMonthRollover')
    .addItem('🔧 Temp Fix Inspection','showTempFixInspection')
    .addItem('🔃 Refresh Dashboard','buildDashboard')
    .addSeparator()
    .addItem('🔵 Manager Review Board','openManagerReviewBoard')
    .addSeparator()
    .addItem('⚙️ System Settings','openSystemSettings')
    .addToUi();
  enforceTabVisibility();
}

function goToDashboard(){var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(SH.DASH);if(sh)ss.setActiveSheet(sh);}

// ═══════════════════════════════════════════════════════════════════════════
//  NAVIGATION PANEL
// ═══════════════════════════════════════════════════════════════════════════
function showNavPanel(){SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutputFromFile('NavPanel').setTitle('⚡ Maintenance Tracker'));}
function goToSheet(sheetName){var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(sheetName);if(sh)ss.setActiveSheet(sh);}
function openExternalUrl(url){SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput('<script>window.open("'+url+'","_blank");google.script.host.close();<\/script>'),'Opening...');}

function getNavPanelData(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),cfg=getConfig(),userInfo=getCurrentUserInfo();
  var waitingCount=0,openCount=0,criticalCount=0,pastDueCount=0;
  try{var wSh=ss.getSheetByName(SH.WAITING);if(wSh&&wSh.getLastRow()>QUEUE_FROZEN){wSh.getRange(QUEUE_FROZEN+1,TK_DATA_COL,wSh.getLastRow()-QUEUE_FROZEN,TK_COLS).getValues().forEach(function(r){if(r[TK.TICKET_NO-1])waitingCount++;});}}catch(e){}
  try{var oSh=ss.getSheetByName(SH.OPEN);if(oSh&&oSh.getLastRow()>QUEUE_FROZEN){oSh.getRange(QUEUE_FROZEN+1,TK_DATA_COL,oSh.getLastRow()-QUEUE_FROZEN,TK_COLS).getValues().forEach(function(r){if(!r[TK.TICKET_NO-1])return;openCount++;if(String(r[TK.PRIORITY-1]).toUpperCase()==='CRITICAL')criticalCount++;});}}catch(e){}
  try{var tfSh=ss.getSheetByName(SH.TEMP_FIX);if(tfSh&&tfSh.getLastRow()>1){tfSh.getRange(2,TF.STATUS,tfSh.getLastRow()-1,1).getValues().forEach(function(r){if(String(r[0]).toUpperCase()==='PAST DUE')pastDueCount++;});}}catch(e){}
  return{openCount:openCount,waitingCount:waitingCount,criticalCount:criticalCount,pastDueCount:pastDueCount,companyName:cfg['Company Name']||'Container Supply Co.',currentMonth:cfg['Current Month']||getCurrentMonth_(),pmUrl:cfg['PM System URL']||'',deptTrackers:DEPT_TRACKERS.map(function(d){return{name:d.name,dept:d.dept,key:d.key};}),isAdmin:userInfo.isAdmin||false,isManager:userInfo.isManager||false,userEmail:userInfo.email||''};
}

// ═══════════════════════════════════════════════════════════════════════════
//  FORM LAUNCHERS
// ═══════════════════════════════════════════════════════════════════════════
function showAddTicket(){SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('AddTicket').setWidth(860).setHeight(900),'➕ Add New Ticket');}
function showUpdateTicket() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile('UpdateTicket').setWidth(1100).setHeight(900),
    '✏️ Update Ticket');
}
function showReviewTicket(){SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('ReviewTicket').setWidth(960).setHeight(900),'Review Ticket');}
function showMonthRollover(){SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('MonthRollover').setWidth(860).setHeight(900),'🔄 Close Month & Start New');}

// ═══════════════════════════════════════════════════════════════════════════
//  CONFIG HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function getConfig(){var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(SH.CONFIG);if(!sh)return{};var cfg={};sh.getRange('C2:D30').getValues().forEach(function(r){if(r[0])cfg[String(r[0]).trim()]=r[1];});return cfg;}
function getConfigValue(key){return getConfig()[key]||'';}
function setConfigValue(key,value){var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(SH.CONFIG);if(!sh)return;var data=sh.getRange('C2:C30').getValues();for(var i=0;i<data.length;i++){if(String(data[i][0]).trim()===key){sh.getRange(i+2,4).setValue(value);return;}}}

// ═══════════════════════════════════════════════════════════════════════════
//  DATA LIST HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function getDataList(listName){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(SH.DATA_VALID);
  if(!sh)return[];var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0],col=-1;
  for(var i=0;i<headers.length;i++){if(String(headers[i]).trim().toLowerCase()===listName.toLowerCase()){col=i+1;break;}}
  if(col<0||sh.getLastRow()<2)return[];
  return sh.getRange(2,col,sh.getLastRow()-1,1).getValues().map(function(r){return String(r[0]).trim();}).filter(function(v){return v!=='';});
}
function getAllDataLists(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(SH.DATA_VALID);
  if(!sh||sh.getLastRow()<2)return{};
  var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var data=sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues(),lists={};
  headers.forEach(function(h,i){var name=String(h).trim();if(!name)return;lists[name]=data.map(function(r){return String(r[i]).trim();}).filter(function(v){return v!=='';});});
  return lists;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ITEM 4 — COMBINED PEOPLE LIST (techs + managers)
//  Used by "Added By" on AddTicket and UpdateTicket forms so managers
//  can appear in the dropdown without being added to the Technicians list.
//  showRoles=true → "J. Morales (Tech)", "I. Garcia (Manager)"
// ═══════════════════════════════════════════════════════════════════════════
function getPeopleList_(showRoles){
  var techs=getDataList('Technicians')||[];
  var techSet={};
  techs.forEach(function(t){techSet[t.toLowerCase().trim()]=true;});
  var managers=[];
  try{getManagerConfig().forEach(function(m){var name=(m.managerName||'').trim();if(name)managers.push(name);});}catch(e){Logger.log('getPeopleList_ manager error: '+e.message);}
  var result=[];
  techs.forEach(function(t){result.push(showRoles?t+' (Tech)':t);});
  managers.forEach(function(m){if(!techSet[m.toLowerCase().trim()]){result.push(showRoles?m+' (Manager)':m);}});
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
//  EQUIPMENT INVENTORY
// ═══════════════════════════════════════════════════════════════════════════
function getEquipmentFromInventory(){
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  var cacheSh=ss.getSheetByName(SH.EQUIP_CACHE);
  if(cacheSh&&cacheSh.getLastRow()>4){var cached=getEquipmentFromCache_(cacheSh);if(cached.length>0)return cached;}
  var sh=ss.getSheetByName(SH.EQUIP_INV);
  if(!sh||sh.getLastRow()<2)return[];
  var data=sh.getRange(2,1,sh.getLastRow()-1,6).getValues();
  return data.filter(function(r){var code=String(r[3]).trim(),spec=String(r[4]).trim(),stat=String(r[5]).trim().toUpperCase();return(code||spec)&&stat!=='INACTIVE';}).map(function(r){return{dept:String(r[0]).trim()||'UNASSIGNED',group:String(r[1]).trim(),eType:String(r[2]).trim()||'GENERAL',code:String(r[3]).trim(),specific:String(r[4]).trim(),status:String(r[5]).trim()||'ACTIVE'};});
}
function getEquipmentFromCache_(cacheSh){
  var lastRow=cacheSh.getLastRow(),lastCol=cacheSh.getLastColumn();
  if(lastRow<5||lastCol<1)return[];
  var headers=cacheSh.getRange(4,1,1,lastCol).getValues()[0].map(function(h){return String(h).trim().toLowerCase();});
  var colMap={},mappings={dept:['department','dept','dept.'],deptCode:['dept code','department code','dept #','dept no','dept no.','dept number','department #'],group:['group','category','equipment group','line #','line#','line number','line'],eType:['equipment type','equip type','type'],code:['equipment code','equip code','code','asset code','job #','job no','id','job number','job no.'],specific:['specific equipment','equipment name','name','description','asset name','equipment description'],status:['status','active','state']};
  Object.keys(mappings).forEach(function(key){for(var i=0;i<headers.length;i++){if(mappings[key].indexOf(headers[i])>=0){colMap[key]=i;break;}}});
  var data=cacheSh.getRange(5,1,lastRow-4,lastCol).getValues();
  return data.filter(function(r){var code=colMap.code!==undefined?String(r[colMap.code]).trim():'';var spec=colMap.specific!==undefined?String(r[colMap.specific]).trim():'';var stat=colMap.status!==undefined?String(r[colMap.status]).trim().toUpperCase():'ACTIVE';return(code||spec)&&stat!=='INACTIVE'&&stat!=='';}).map(function(r){function col(k){return colMap[k]!==undefined?String(r[colMap[k]]||'').trim():'';}return{dept:col('dept')||'UNASSIGNED',deptCode:col('deptCode'),group:col('group'),eType:col('eType')||'GENERAL',code:col('code'),specific:col('specific'),status:col('status')||'ACTIVE'};});
}
function getEquipmentHierarchy(){var equip=getEquipmentFromInventory(),hierarchy={};equip.forEach(function(e){var dept=e.dept||'UNASSIGNED',eType=e.eType||'GENERAL';if(!hierarchy[dept])hierarchy[dept]={};if(!hierarchy[dept][eType])hierarchy[dept][eType]=[];hierarchy[dept][eType].push(e);});return hierarchy;}
function getEquipmentFlatList(){return getEquipmentFromInventory().map(function(e){return{code:e.code,deptCode:e.deptCode,specific:e.specific,dept:e.dept,eType:e.eType,group:e.group};});}

// ═══════════════════════════════════════════════════════════════════════════
//  ID GENERATORS
// ═══════════════════════════════════════════════════════════════════════════
function generateRowId(){return Utilities.getUuid().substring(0,8).toUpperCase();}
function generateTempFixId(){return 'TF-'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMddHHmmss');}
function generateTagId(){return 'TAG-'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMddHHmmss');}
function generateHistId(){return 'H-'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMddHHmmss');}

// ═══════════════════════════════════════════════════════════════════════════
//  TICKET HISTORY LOGGER
// ═══════════════════════════════════════════════════════════════════════════
function logTicketHistory(ticketNo,eventType,statusFrom,statusTo,performedBy,notes){var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH.TICKET_HIST);if(!sh)return;sh.appendRow([generateHistId(),ticketNo,formatTimestamp_(new Date()),eventType,statusFrom||'',statusTo||'',performedBy||'',notes||'']);}

// ═══════════════════════════════════════════════════════════════════════════
//  FORM DATA GETTERS
// ═══════════════════════════════════════════════════════════════════════════
function getUpdateTicketFormData() {
  var cfg      = getConfig();
  var lists    = getAllDataLists();
  var deptMapping = getDeptMapping_();

  var transferReasons = getDataList('Transfer Reasons');
  if (!transferReasons || !transferReasons.length) transferReasons = ['Beyond Scope'];

  return {
    companyName:     cfg['Company Name']              || 'Container Supply Co.',
    location:        cfg['Location']                  || 'Garden Grove, CA',
    docNo:           cfg['Doc No (Ticket Form)']      || 'FRM-040-001',
    departments:     Object.keys(deptMapping).sort(),
    deptCodes:       DEPT_CODES,
    deptMapping:     deptMapping,
    technicians:     lists['Technicians']             || [],
    peopleList:      getPeopleList_(false),
    problemTypes:    lists['Problem Types']           || [],
    priorities:      lists['Priorities']              || ['LOW','MEDIUM','HIGH','CRITICAL'],
    statuses:        lists['Statuses']                || [],
    partsStatuses:   lists['Parts Status']            || [],
    fixTypes:        ['Temporary','Permanent'],
    transferReasons: transferReasons,
    // ── Tickets only — NO equipHierarchy, NO equipFlatList ──
    openTickets:     getTicketsForForm_(['OPEN','PENDING PARTS','ON HOLD','WAITING','IN REVIEW','COMPLETE']),
    voidReasons:     getDataList('Void Reasons').length ? getDataList('Void Reasons') : ['Duplicate Ticket','Entry Error','Test Ticket','Other'],
    closedTickets: getClosedTicketsForForm_()
  };
}

function getReviewTicketFormData(){var base=getAddTicketFormData();base.statuses=getDataList('Statuses')||[];base.partsStatuses=getDataList('Parts Status')||[];base.fixTypes=['Temporary','Permanent'];base.waitingTickets=getTicketsForForm_(['WAITING','OPEN','PENDING PARTS','ON HOLD','COMPLETE','IN REVIEW']);base.docNo=getConfigValue('Doc No (Ticket Form)')||'FRM-040-001';return base;}

function getEquipHoldTagFormData(){var base=getAddTicketFormData();base.openTickets=getTicketsForForm_(['OPEN','PENDING PARTS','ON HOLD']);base.tagTypes=['Red — Out of Service','Yellow — Use with Caution'];base.docNo='FRM-029-002';var userInfo=getCurrentUserInfo();base.isAdmin=userInfo.isAdmin||false;base.problemTypes=getDataList('Problem Types')||[];base.technicians=getDataList('Technicians')||[];base.isManager=userInfo.isManager||userInfo.isAdmin||false;return base;}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN FORM DATA — ITEMS 4 + 8A
//  Returns combined people list (peopleList) and transferReasons
// ═══════════════════════════════════════════════════════════════════════════
function getAddTicketFormData(){
  var cfg=getConfig(), lists=getAllDataLists(), deptMapping=getDeptMapping_();
  var departments=Object.keys(deptMapping).sort();

  // ITEM 8A: Transfer reasons — Data Lists col K, default to Beyond Scope
  var transferReasons=getDataList('Transfer Reasons');
  if(!transferReasons||!transferReasons.length) transferReasons=['Beyond Scope'];

  // ITEM 4: Combined people list (techs + managers) for Added By
  var peopleList=getPeopleList_(false);

  return{
    companyName:    cfg['Company Name']          ||'Container Supply Co.',
    location:       cfg['Location']              ||'Garden Grove, CA',
    docNo:          cfg['Doc No (Ticket Form)']  ||'FRM-040-001',
    revision:       cfg['Revision']              ||'0',
    departments:    departments,
    deptCodes:      DEPT_CODES,
    deptMapping:    deptMapping,
    buildingZones:  lists['Building / Zone']     ||[],
    equipmentTypes: lists['Equipment Types']     ||[],
    priorities:     lists['Priorities']          ||['LOW','MEDIUM','HIGH','CRITICAL'],
    downtimeTypes:  lists['Downtime Types']      ||['PLANNED','UNPLANNED'],
    technicians:    lists['Technicians']         ||[],   // pure tech list — Assign To
    peopleList:     peopleList,                           // combined — Added By
    problemTypes:   lists['Problem Types']       ||[],
    shifts:         lists['Shifts']              ||['1ST','2ND','3RD'],
    partsStatuses:  lists['Parts Status']        ||[],
    transferReasons:transferReasons,                      // ITEM 8A
    equipHierarchy: getEquipmentHierarchy(),
    equipFlatList:  getEquipmentFlatList()
  };
}

function getTicketsForForm_(statuses) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ml = ss.getSheetByName(SH.MASTER_LOG);
    if (!ml) return [];

    var data = ml.getDataRange().getValues();
    if (data.length < 2) return [];

    var rowsByTicket = {};
    for (var i = 1; i < data.length; i++) {
      var tid = data[i][ML.TICKET_NO - 1];
      if (!tid) continue;
      if (!rowsByTicket[tid]) rowsByTicket[tid] = [];
      rowsByTicket[tid].push(data[i]);
    }

    var statusFilter = statuses
      ? statuses.map(function(s) { return s.toUpperCase(); })
      : null;

    var tickets = [];

    for (var ticketId in rowsByTicket) {
      var rows = rowsByTicket[ticketId];
      var best = rows[0].slice();
      for (var r = 1; r < rows.length; r++) {
        var row = rows[r];
        for (var c = 0; c < row.length; c++) {
          var val = row[c];
          if (val !== '' && val !== null && val !== undefined) {
            best[c] = val;
          }
        }
      }

      var status = String(best[ML.STATUS - 1] || '').toUpperCase();
      if (status === 'CLOSED') continue;
      if (statusFilter && statusFilter.indexOf(status) < 0) continue;

      tickets.push({
        ticketNo:     String(best[ML.TICKET_NO - 1]     || ''),
        status:       String(best[ML.STATUS - 1]         || ''),
        dept:         String(best[ML.DEPT - 1]           || ''),
        buildingZone: String(best[ML.BUILDING_ZONE - 1]  || ''),
        equipType:    String(best[ML.EQUIP_TYPE - 1]     || ''),
        equipCode:    String(best[ML.EQUIP_CODE - 1]     || ''),
        specificEquip:String(best[ML.SPECIFIC_EQUIP - 1] || ''),
        description:  String(best[ML.DESCRIPTION - 1]    || ''),
        priority:     String(best[ML.PRIORITY - 1]       || ''),
        assignedTo:   String(best[ML.ASSIGNED_TO - 1]    || ''),
        dateOpened:   best[ML.DATE_OPENED-1] instanceof Date ? Utilities.formatDate(best[ML.DATE_OPENED-1], Session.getScriptTimeZone(), 'MM/dd/yyyy') : String(best[ML.DATE_OPENED-1] || ''),
        problemType:  String(best[ML.PROBLEM_TYPE - 1]   || ''),
        addedBy:      String(best[ML.ADDED_BY - 1]       || ''),
        downtimeType: String(best[ML.DOWNTIME_TYPE - 1]  || ''),
        line:         String(best[ML.LINE_NO - 1]        || ''),
        workSummary:  String(best[ML.WORK_SUMMARY - 1]   || ''),
        actualHours:  String(best[ML.ACTUAL_HOURS - 1]   || ''),
    fixType:      String(best[ML.FIX_TYPE - 1]       || ''),
        source:       'INTERNAL',
        observations: (function(){
          var n = String(best[ML.NOTES-1] || '');
          var m = n.match(/^Observations:\s*([\s\S]*?)(?:\s*\|\s*Notes:[\s\S]*)?$/);
          return (m && m[1]) ? m[1].trim() : '';
        })(),
        notes:        (function(){
          var n = String(best[ML.NOTES-1] || '');
          var m = n.match(/\|\s*Notes:\s*([\s\S]*)$/);
          return m ? m[1].trim() : '';
        })()
      });
    }
    return tickets;

  } catch(e) {
    Logger.log('getTicketsForForm_ error: ' + e.message + ' | stack: ' + e.stack);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  REVIEW TICKET (unchanged from original)
// ═══════════════════════════════════════════════════════════════════════════
function reviewTicket(data){
  try{
    var ss=SpreadsheetApp.getActiveSpreadsheet(),now=new Date();
    var mlSh=ss.getSheetByName(SH.MASTER_LOG);if(!mlSh)throw new Error('Master Log not found');
    var orig=getOriginalTicketData_(mlSh,data.ticketNo);
    data.dept=data.dept||orig.dept;data.buildingZone=data.buildingZone||orig.buildingZone;data.equipType=data.equipType||orig.equipType;data.equipCode=data.equipCode||orig.equipCode;data.equipDesc=data.equipDesc||orig.equipDesc;data.specificEquip=data.specificEquip||orig.specificEquip;data.downtimeType=data.downtimeType||orig.downtimeType;data.problemDesc=data.problemDesc||orig.problemDesc;data.description=data.description||orig.description;data.dateOpened=data.dateOpened||orig.dateOpened;data.addedBy=data.addedBy||orig.addedBy;data.problemType=data.problemType||orig.problemType;data.estHours=data.estHours||orig.estHours;if(!data.priority)data.priority=orig.priority;
    var newStatus=data.newStatus||'OPEN';var isClosed=data.verifiedBy?'CLOSED':newStatus;var priority=String(data.priority||'').toUpperCase();var canCloseHere=(priority==='LOW'||priority==='MEDIUM')&&data.correctiveAction&&data.verifiedBy;if(canCloseHere)isClosed='CLOSED';
    var mlRow=new Array(ML_COLS).fill('');mlRow[ML.ROW_ID-1]=generateRowId();mlRow[ML.TICKET_NO-1]=data.ticketNo;mlRow[ML.TIMESTAMP-1]=formatTimestamp_(now);mlRow[ML.ACTION-1]='MANAGER REVIEW';mlRow[ML.STATUS-1]=isClosed;mlRow[ML.DEPT-1]=data.dept||'';mlRow[ML.BUILDING_ZONE-1]=data.buildingZone||'';mlRow[ML.EQUIP_TYPE-1]=data.equipType||'';mlRow[ML.EQUIP_CODE-1]=data.equipCode||'';mlRow[ML.SPECIFIC_EQUIP-1]=data.equipDesc||data.specificEquip||'';mlRow[ML.DOWNTIME_TYPE-1]=data.downtimeType||'';mlRow[ML.DESCRIPTION-1]=data.problemDesc||data.description||'';mlRow[ML.PRIORITY-1]=data.priority||'';mlRow[ML.ASSIGNED_TO-1]=data.assignedTo||'';mlRow[ML.ACTUAL_HOURS-1]=data.actualHours||'';mlRow[ML.DATE_OPENED-1]=data.dateOpened||'';mlRow[ML.CORRECTIVE_ACT-1]=data.correctiveAction||'';mlRow[ML.FIX_TYPE-1]=data.fixType||'';mlRow[ML.TEMP_FIX_FLAG-1]=data.tempFixFlag?'Y':'N';mlRow[ML.PARTS_STATUS-1]=data.partsStatus||'';mlRow[ML.EQUIP_TAG_STATUS-1]=data.equipTagStatus||'';mlRow[ML.VERIFIED_BY-1]=data.verifiedBy||'';mlRow[ML.VERIFIED_DATE-1]=data.verifiedBy?formatDateStr_(now):'';mlRow[ML.UPDATED_BY-1]=data.verifiedBy||data.updatedBy||'';mlRow[ML.NOTES-1]=data.notes||'';mlRow[ML.PROBLEM_TYPE-1]=data.problemType||'';mlRow[ML.TRACKER_GROUP-1]=getDeptGroup_(data.dept||'');mlRow[ML.LINE_NO-1]=data.lineNo||'';if(isClosed==='CLOSED'){mlRow[ML.DATE_COMPLETED-1]=formatDateStr_(now);mlRow[ML.DATE_CLOSED-1]=formatDateStr_(now);}mlSh.appendRow(mlRow);
    if(isClosed!=='CLOSED'){removeTicketFromSheet_(ss,SH.WAITING,data.ticketNo);writeTicketToTrackerSheet_(ss,SH.OPEN,data.ticketNo,data,isClosed,now);}else{removeTicketFromSheet_(ss,SH.WAITING,data.ticketNo);moveTicketToClosed_(ss,data.ticketNo,data,now);}
    updateTicketInTrackerSheet_(ss,data.ticketNo,data,isClosed,now);if(data.tempFixFlag)logTempFix_(ss,data.ticketNo,data,now);
    logTicketHistory(data.ticketNo,isClosed==='CLOSED'?TH_EVENTS.CLOSED:TH_EVENTS.MOVED_TO_OPEN,'WAITING',isClosed,data.verifiedBy||data.updatedBy,canCloseHere?'Closed by manager at review':'Reviewed — moved to Open');
    return{success:true,ticketNo:data.ticketNo,status:isClosed};
  }catch(e){return{success:false,error:e.message};}
}

// ═══════════════════════════════════════════════════════════════════════════
//  MONTH ROLLOVER (unchanged)
// ═══════════════════════════════════════════════════════════════════════════
function executeMonthRollover(newMonth){
  try{
    var ss=SpreadsheetApp.getActiveSpreadsheet(),carried=0,closed=0;var nc=TK_COLS+2;
    DEPT_TRACKERS.forEach(function(dt){var sh=ss.getSheetByName(dt.name);if(!sh||sh.getLastRow()<TRACKER_PRIO_START)return;var firstRow=TRACKER_PRIO_START,numRows=sh.getLastRow()-firstRow+1;if(numRows<1)return;var data=sh.getRange(firstRow,TK_DATA_COL,numRows,TK_COLS).getValues(),rollover=[],toClose=[];data.forEach(function(r){if(!r[TK.TICKET_NO-1])return;var status=String(r[TK.STATUS-1]).toUpperCase();if(status==='COMPLETE'||status==='CLOSED'){toClose.push(r);}else{rollover.push(r);carried++;}});closed+=toClose.length;var closedSh=ss.getSheetByName(SH.CLOSED);toClose.forEach(function(r){if(closedSh){var nextRow=closedSh.getLastRow()+1;closedSh.getRange(nextRow,TK_DATA_COL,1,TK_COLS).setValues([r]);}});sh.getRange(TRACKER_PRIO_START,1,sh.getMaxRows()-TRACKER_PRIO_START+1,nc).clearContent().clearFormat();if(rollover.length>0){sh.getRange(TRACKER_PRIO_START,1,1,nc).merge().setValue('⟳  ROLLOVER FROM PREVIOUS MONTH').setBackground(CLR.ORANGE_LT).setFontColor(CLR.ORANGE).setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');sh.setRowHeight(TRACKER_PRIO_START,24);rollover.forEach(function(r,i){var destRow=TRACKER_PRIO_START+1+i;sh.getRange(destRow,TK_DATA_COL,1,TK_COLS).setValues([r]);applyDataRowBorders_(sh,destRow);applyPriorityRowColor_(sh,destRow,r[TK.PRIORITY-1]);});var newBannerRow=TRACKER_PRIO_START+1+rollover.length;sh.getRange(newBannerRow,1,1,nc).merge().setValue('✦  NEW TICKETS — '+newMonth.toUpperCase()).setBackground(CLR.GREEN_LT).setFontColor(CLR.GREEN).setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');sh.setRowHeight(newBannerRow,24);}});
    setConfigValue('Current Month',newMonth);setConfigValue('Month Status','OPEN');setConfigValue('Last Rollover Date',formatDateStr_(new Date()));buildDashboard();return{success:true,carried:carried,closed:closed,month:newMonth};
  }catch(e){return{success:false,error:e.message};}
}

// ═══════════════════════════════════════════════════════════════════════════
//  INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function getDeptTrackerName_(dept){var d=DEPT_TRACKERS.filter(function(dt){return dt.dept===String(dept).toUpperCase().trim();});return d.length>0?d[0].name:null;}
function isTrackerSheet_(sheetName){return DEPT_TRACKERS.some(function(dt){return dt.name===sheetName;});}
function getMasterLogFieldForTicket_(ticketNo,colIndex){var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(SH.MASTER_LOG);if(!sh||sh.getLastRow()<2)return'';var data=sh.getRange(2,ML.TICKET_NO,sh.getLastRow()-1,1).getValues(),lastMatch='';for(var i=0;i<data.length;i++){if(String(data[i][0])===ticketNo)lastMatch=sh.getRange(i+2,colIndex).getValue();}return lastMatch;}
function getOriginalTicketData_(mlSh,ticketNo){if(!mlSh||mlSh.getLastRow()<2)return{};var rows=mlSh.getRange(2,1,mlSh.getLastRow()-1,ML_COLS).getValues();for(var i=0;i<rows.length;i++){if(String(rows[i][ML.TICKET_NO-1]).trim()===ticketNo){return{dept:String(rows[i][ML.DEPT-1]||''),buildingZone:String(rows[i][ML.BUILDING_ZONE-1]||''),equipType:String(rows[i][ML.EQUIP_TYPE-1]||''),equipCode:String(rows[i][ML.EQUIP_CODE-1]||''),specificEquip:String(rows[i][ML.SPECIFIC_EQUIP-1]||''),equipDesc:String(rows[i][ML.SPECIFIC_EQUIP-1]||''),downtimeType:String(rows[i][ML.DOWNTIME_TYPE-1]||''),description:String(rows[i][ML.DESCRIPTION-1]||''),problemDesc:String(rows[i][ML.DESCRIPTION-1]||''),priority:String(rows[i][ML.PRIORITY-1]||''),dateOpened:rows[i][ML.DATE_OPENED-1]||'',addedBy:String(rows[i][ML.ADDED_BY-1]||''),problemType:String(rows[i][ML.PROBLEM_TYPE-1]||''),estHours:rows[i][ML.EST_HOURS-1]||'',partsNeeded:String(rows[i][ML.PARTS_NEEDED-1]||'N')};}}return{};}

function updateTicketInTrackerSheet_(ss,ticketNo,data,newStatus,now){
  var deptTrackerName=getTrackerForDept(data.dept,data.problemType,data.equipType);
  var sheetsToUpdate=[SH.OPEN,SH.WAITING,deptTrackerName].filter(Boolean);
  sheetsToUpdate.forEach(function(shName){var sh=ss.getSheetByName(shName);if(!sh||sh.getLastRow()<1)return;var startRow=isTrackerSheet_(shName)?TRACKER_PRIO_START:QUEUE_FROZEN+1;if(sh.getLastRow()<startRow)return;var tickets=sh.getRange(startRow,TK_DATA_COL,sh.getLastRow()-startRow+1,1).getValues();for(var i=0;i<tickets.length;i++){if(String(tickets[i][0])===ticketNo){var rowNum=i+startRow;sh.getRange(rowNum,TK.STATUS+1).setValue(newStatus);sh.getRange(rowNum,TK.LAST_UPDATED+1).setValue(formatTimestamp_(now));if(data.priority)sh.getRange(rowNum,TK.PRIORITY+1).setValue(data.priority);if(data.assignedTo)sh.getRange(rowNum,TK.ASSIGNED_TO+1).setValue(data.assignedTo);if(data.actualHours)sh.getRange(rowNum,TK.ACTUAL_HOURS+1).setValue(data.actualHours);if(data.fixType)sh.getRange(rowNum,TK.FIX_TYPE+1).setValue(data.fixType);if(data.tempFixFlag)sh.getRange(rowNum,TK.TEMP_FIX_FLAG+1).setValue('Y');if(data.partsStatus)sh.getRange(rowNum,TK.PARTS_STATUS+1).setValue(data.partsStatus);if(data.verifiedBy)sh.getRange(rowNum,TK.VERIFIED_BY+1).setValue(data.verifiedBy);if(data.verifiedDate||data.verifiedBy)sh.getRange(rowNum,TK.VERIFIED_DATE+1).setValue(formatDateStr_(now));if(data.updatedBy)sh.getRange(rowNum,TK.UPDATED_BY+1).setValue(data.updatedBy);if(data.notes)sh.getRange(rowNum,TK.NOTES+1).setValue(data.notes);applyPriorityRowColor_(sh,rowNum,data.priority||sh.getRange(rowNum,TK.PRIORITY+1).getValue());break;}}});
}

function greyOutClosedTickets_() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var updated = 0;

  DEPT_TRACKERS.forEach(function(dt) {
    var sh = ss.getSheetByName(dt.name);
    if (!sh || sh.getLastRow() < TRACKER_PRIO_START) return;

    var startRow = TRACKER_PRIO_START;
    var numRows  = sh.getLastRow() - startRow + 1;
    if (numRows < 1) return;

    var statusVals = sh.getRange(startRow, TK.STATUS + 1, numRows, 1).getValues();
    statusVals.forEach(function(r, i) {
      var status = String(r[0] || '').toUpperCase().trim();
      if (status === 'CLOSED') {
        applyClosedRowStyle_(sh, startRow + i);
        updated++;
      }
    });
  });

  Logger.log('greyOutClosedTickets_: greyed out ' + updated + ' closed rows.');
  SpreadsheetApp.getActiveSpreadsheet()
    .toast('✅ Greyed out ' + updated + ' closed ticket row(s).', '7A Closed Rows', 5);
}


function removeTicketFromSheet_(ss,sheetName,ticketNo){var sh=ss.getSheetByName(sheetName);if(!sh||sh.getLastRow()<1)return;var startRow=isTrackerSheet_(sheetName)?TRACKER_PRIO_START:QUEUE_FROZEN+1;if(sh.getLastRow()<startRow)return;var tickets=sh.getRange(startRow,TK_DATA_COL,sh.getLastRow()-startRow+1,1).getValues();for(var i=tickets.length-1;i>=0;i--){if(String(tickets[i][0]).trim()===String(ticketNo).trim()){sh.deleteRow(i+startRow);break;}}}
function moveTicketToClosed_(ss,ticketNo,data,now){var closedSh=ss.getSheetByName(SH.CLOSED);if(!closedSh)return;var tkRow=new Array(TK_COLS).fill('');tkRow[TK.TICKET_NO-1]=ticketNo;tkRow[TK.STATUS-1]='CLOSED';tkRow[TK.PRIORITY-1]=data.priority||'';tkRow[TK.DEPT-1]=data.dept||'';tkRow[TK.BUILDING_ZONE-1]=data.buildingZone||'';tkRow[TK.EQUIP_TYPE-1]=data.equipType||'';tkRow[TK.EQUIP_CODE-1]=data.equipCode||'';tkRow[TK.SPECIFIC_EQUIP-1]=data.specificEquip||'';tkRow[TK.DESCRIPTION-1]=data.description||'';tkRow[TK.ASSIGNED_TO-1]=data.assignedTo||'';tkRow[TK.ACTUAL_HOURS-1]=data.actualHours||'';tkRow[TK.DATE_OPENED-1]=data.dateOpened||'';tkRow[TK.LAST_UPDATED-1]=formatTimestamp_(now);tkRow[TK.VERIFIED_BY-1]=data.verifiedBy||'';tkRow[TK.VERIFIED_DATE-1]=data.verifiedBy?formatDateStr_(now):'';tkRow[TK.UPDATED_BY-1]=data.updatedBy||'';tkRow[TK.NOTES-1]=data.notes||'';tkRow[TK.LINE_NO-1]=data.lineNo||data.line||'';var nextRow=closedSh.getLastRow()+1;closedSh.getRange(nextRow,TK_DATA_COL,1,TK_COLS).setValues([tkRow]);applyDataRowBorders_(closedSh,nextRow);removeTicketFromSheet_(ss,SH.OPEN,ticketNo);}
function logTempFix_(ss,ticketNo,data,now){var sh=ss.getSheetByName(SH.TEMP_FIX);if(!sh)return;var cfg=getConfig(),freq=parseInt(cfg['Monitoring Frequency']||'7',10);var nextDue=new Date(now.getTime()+freq*24*60*60*1000);sh.appendRow([generateTempFixId(),ticketNo,data.equipCode||'',data.specificEquip||'',data.dept||'',data.buildingZone||'',formatDateStr_(now),data.description||'',data.workSummary||data.correctiveAction||'',freq,'',formatDateStr_(nextDue),'ACTIVE',data.updatedBy||data.addedBy||'','','',data.notes||'']);logTicketHistory(ticketNo,TH_EVENTS.TEMP_FIX,'','',data.updatedBy,'Temp fix flagged — monitoring every '+freq+' days');}
function logPartsNeeded_(ss,ticketNo,data){var sh=ss.getSheetByName(SH.PARTS_NEEDED);if(!sh||!data.partsTable)return;data.partsTable.forEach(function(p){if(!p.partId&&!p.partDesc)return;sh.appendRow([p.partId||'',p.partDesc||'',ticketNo,data.equipCode||'',data.specificEquip||'',data.dept||'',formatDateStr_(new Date()),'REQUESTED','','',p.notes||'']);});logTicketHistory(ticketNo,TH_EVENTS.PARTS_REQUESTED,'','',data.addedBy,(data.partsTable.length)+' part(s) requested');}

function logEquipHoldTag_(ss,ticketNo,data,now){
  var sh=ss.getSheetByName(SH.EQUIP_HOLD_LOG);if(!sh)return;
  var tagType='Red — Out of Service';
  if(String(data.equipTagStatus||'').toLowerCase().indexOf('yellow')>=0||String(data.equipTagStatus||'').toLowerCase().indexOf('caution')>=0)tagType='Yellow — Use with Caution';
  else if(String(data.equipTagStatus||'').toLowerCase().indexOf('orange')>=0)tagType='Orange — Temp Fix';
  var tagId=generateTagId();
  var row=[tagId,ticketNo,data.equipCode||'',data.specificEquip||data.equipDesc||'',data.dept||'',data.buildingZone||'',tagType,formatDateStr_(now),data.addedBy||data.updatedBy||'',data.notes||'','TAGGED','','',''];
  sh.appendRow(row);
  var tagColor=tagType.toLowerCase().indexOf('yellow')>=0?CLR.YELLOW_LT:tagType.toLowerCase().indexOf('orange')>=0?CLR.ORANGE_LT:CLR.RED_LT;
  sh.getRange(sh.getLastRow(),1,1,EHL_COLS).setBackground(tagColor).setBorder(true,true,true,true,true,true,'#FFCDD2',SpreadsheetApp.BorderStyle.SOLID);
  writeToExternalHoldRegister_(row);
  logTicketHistory(ticketNo,TH_EVENTS.TAGGED,'','',data.addedBy||data.updatedBy,'Equipment tagged: '+tagType);
}
function appendImageLinksToLog_(ticketNo,imageLinks){var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(SH.RPT_DB);if(!sh||sh.getLastRow()<2)return;var tickets=sh.getRange(2,RDB.TICKET_NO,sh.getLastRow()-1,1).getValues();for(var i=tickets.length-1;i>=0;i--){if(String(tickets[i][0])===ticketNo){var existing=sh.getRange(i+2,RDB.IMAGE_LINKS).getValue();sh.getRange(i+2,RDB.IMAGE_LINKS).setValue(existing?existing+', '+imageLinks.join(', '):imageLinks.join(', '));break;}}}
function applyDataRowBorders_(sh,rowNum){sh.getRange(rowNum,TK_DATA_COL,1,TK_COLS).setBorder(true,true,true,true,true,true,'#E0E0E0',SpreadsheetApp.BorderStyle.SOLID);}
function applyPriorityRowColor_(sh,rowNum,priority){var p=String(priority||'').toUpperCase(),cfg=PRIORITY_CONFIG[p];sh.getRange(rowNum,1).setBackground(CLR.BG);if(!cfg)return;sh.getRange(rowNum,TK_DATA_COL,1,TK_COLS).setBackground(cfg.lt);sh.getRange(rowNum,TK.PRIORITY+1).setFontColor(cfg.color).setFontWeight('bold');}

// ═══════════════════════════════════════════════════════════════════════════
//  TICKET TRANSFER — ITEM 8C
// ═══════════════════════════════════════════════════════════════════════════
function logTicketTransfer_(ss,ticketNo,fromDept,toDept,transferredBy,reason){
  var sh=ss.getSheetByName(SH.TRANSFER_LOG);if(!sh){Logger.log('Transfer Log tab not found');return null;}
  var transferId='TRF-'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMddHHmmss');
  sh.appendRow([transferId,ticketNo,formatTimestamp_(new Date()),fromDept||'',toDept||'',transferredBy||'',reason||'','N']);
  var mlSh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH.MASTER_LOG);
  var ticketData=mlSh?getOriginalTicketData_(mlSh,ticketNo):{};
  var currentStatus=String(getMasterLogFieldForTicket_(ticketNo,ML.STATUS)||'OPEN');
  var emailSent='N';
  try{sendTransferNotification_(ticketNo,fromDept,toDept,transferredBy,reason,ticketData,currentStatus);emailSent='Y';}catch(e){Logger.log('Transfer email failed: '+e.message);}
  sh.getRange(sh.getLastRow(),TL.EMAIL_SENT).setValue(emailSent);
  logTicketHistory(ticketNo,'TRANSFERRED',fromDept,toDept,transferredBy,'Ticket transferred to '+toDept+(reason?' — '+reason:''));
  return transferId;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ITEM 8C — ENHANCED TRANSFER NOTIFICATION EMAIL
//  Recipients: sending dept manager + receiving dept manager (from col E)
//  Fallback: global Manager Email(s) config if no dept mapping
// ═══════════════════════════════════════════════════════════════════════════
function sendTransferNotification_(ticketNo,fromDept,toDept,transferredBy,reason,ticketData,currentStatus){
  var cfg=getConfig(), globalMgr=cfg['Manager Email(s)']||'';
  ticketData=ticketData||{}; currentStatus=String(currentStatus||'OPEN').toUpperCase();
  var recipientSet={};
  getManagersForDept_(fromDept).forEach(function(e){if(e)recipientSet[e]=true;});
  getManagersForDept_(toDept).forEach(function(e){if(e)recipientSet[e]=true;});
  if(!Object.keys(recipientSet).length&&globalMgr){globalMgr.split(',').forEach(function(e){var t=e.trim();if(t)recipientSet[t]=true;});}
  var recipients=Object.keys(recipientSet).join(', ');
  if(!recipients){Logger.log('sendTransferNotification_: no recipients');return;}
  var prio=String(ticketData.priority||'').toUpperCase();
  var prioColor=prio==='CRITICAL'?'#C62828':prio==='HIGH'?'#E64A19':prio==='MEDIUM'?'#F57F17':'#1565C0';
  var prioBg=prio==='CRITICAL'?'#FFCDD2':prio==='HIGH'?'#FFE0B2':prio==='MEDIUM'?'#FFF9C4':'#E3F2FD';
  var actionTitle,actionBody;
  if(currentStatus==='WAITING'){actionTitle='Action Required — Pending Approval';actionBody='This ticket has been transferred to <strong>'+esc_(toDept)+'</strong> and is currently in the <strong>Waiting Queue</strong>. Please review, set a priority, assign a technician, and approve it for open work.';}
  else if(currentStatus==='OPEN'||currentStatus==='IN PROGRESS'){actionTitle='Ready for Work';actionBody='This ticket has been transferred to <strong>'+esc_(toDept)+'</strong> and is already <strong>Open</strong>. Please assign or reassign a technician to take over the work.';}
  else if(currentStatus==='ON HOLD'||currentStatus==='PENDING PARTS'){actionTitle='Action Required — Ticket On Hold';actionBody='This ticket has been transferred to <strong>'+esc_(toDept)+'</strong>. The ticket is currently <strong>'+esc_(currentStatus)+'</strong>. Please review and reassign as needed.';}
  else{actionTitle='Transfer Notification';actionBody='This ticket has been transferred to <strong>'+esc_(toDept)+'</strong>. Current status: <strong>'+esc_(currentStatus)+'</strong>.';}
  var now=new Date(),tz=Session.getScriptTimeZone();
  var tsStr=Utilities.formatDate(now,tz,'MM/dd/yyyy \u00b7 hh:mm a');
  var dateOpenedStr=ticketData.dateOpened?(ticketData.dateOpened instanceof Date?Utilities.formatDate(ticketData.dateOpened,tz,'MM/dd/yyyy hh:mm a'):String(ticketData.dateOpened)):'—';
  function row_(label,value,shade){var bg=shade?'background:#FAFAFA;':'';return'<tr><td style="padding:5px 6px;'+bg+'font-size:11px;color:#9E9E9E;width:140px;vertical-align:top">'+esc_(label)+'</td><td style="padding:5px 6px;'+bg+'font-size:12px;color:#2A2A2A;">'+(value||'—')+'</td></tr>';}
  var htmlBody=
    '<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">'+
    '<div style="background:#2A2A2A;padding:18px 24px;display:flex;align-items:center;gap:12px;">'+
      '<div style="background:#EF6C00;width:5px;height:44px;border-radius:3px;flex-shrink:0;"></div>'+
      '<div style="flex:1;"><div style="font-size:17px;font-weight:bold;color:#FFD700;letter-spacing:.4px;">⚡ MAINTENANCE TRACKER</div><div style="font-size:10px;color:#9E9E9E;margin-top:3px;">Container Supply Co. — Garden Grove, CA</div></div>'+
      '<div style="text-align:right;"><div style="font-size:10px;color:#9E9E9E;">Ticket Transfer Notification</div><div style="font-size:10px;color:#9E9E9E;margin-top:2px;">'+tsStr+'</div></div>'+
    '</div>'+
    '<div style="background:#1B2A3C;padding:14px 24px;display:flex;align-items:center;justify-content:center;border-bottom:3px solid #EF6C00;">'+
      '<div style="text-align:center;"><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">From Department</div><div style="font-size:18px;font-weight:bold;color:#fff;">'+esc_(fromDept)+'</div></div>'+
      '<div style="margin:0 28px;font-size:28px;color:#FFD700;">&rarr;</div>'+
      '<div style="text-align:center;"><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">To Department</div><div style="font-size:18px;font-weight:bold;color:#FFD700;">'+esc_(toDept)+'</div></div>'+
    '</div>'+
    '<div style="background:#3C3C3C;padding:9px 24px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">'+
      '<div style="font-size:13px;font-weight:bold;color:#FFD700;font-family:monospace;">'+esc_(ticketNo)+'</div>'+
      (prio?'<div style="background:'+prioBg+';color:'+prioColor+';padding:2px 8px;border-radius:3px;font-size:10px;font-weight:bold;">'+esc_(prio)+'</div>':'')+
      '<div style="background:rgba(255,255,255,.12);color:#90CAF9;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:bold;">'+esc_(currentStatus)+'</div>'+
      '<div style="margin-left:auto;font-size:11px;color:#9E9E9E;">Transferred by: <strong style="color:#ECEFF1;">'+esc_(transferredBy)+'</strong></div>'+
    '</div>'+
    '<div style="padding:20px 24px;">'+
    '<div style="background:#FFF3E0;border-left:4px solid #EF6C00;border-radius:0 4px 4px 0;padding:10px 14px;margin-bottom:18px;">'+
      '<div style="font-size:9px;font-weight:bold;color:#E64A19;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px;">Transfer Reason</div>'+
      '<div style="font-size:13px;font-weight:bold;color:#2A2A2A;">'+esc_(reason||'—')+'</div>'+
    '</div>'+
    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">'+
      '<tr><td colspan="2" style="padding:0 0 7px 0;"><div style="font-size:10px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;">Ticket Information</div></td></tr>'+
      row_('Ticket #','<span style="font-family:monospace;font-weight:bold;">'+esc_(ticketNo)+'</span>',false)+
      row_('Date Opened',esc_(dateOpenedStr),true)+
      row_('Added By',esc_(ticketData.addedBy||'—'),false)+
    '</table>'+
    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">'+
      '<tr><td colspan="2" style="padding:0 0 7px 0;"><div style="font-size:10px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;">Equipment</div></td></tr>'+
      row_('Equipment Type',esc_(ticketData.equipType||'—'),false)+
      row_('Equipment Desc',esc_(ticketData.specificEquip||ticketData.equipDesc||'—'),true)+
      row_('Equipment Code','<span style="font-family:monospace;font-weight:bold;">'+esc_(ticketData.equipCode||'—')+'</span>',false)+
      row_('Zone / Building',esc_(ticketData.buildingZone||'—'),true)+
    '</table>'+
    '<table style="width:100%;border-collapse:collapse;margin-bottom:18px;">'+
      '<tr><td colspan="2" style="padding:0 0 7px 0;"><div style="font-size:10px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;">Problem</div></td></tr>'+
      row_('Problem Type',esc_(ticketData.problemType||'—'),false)+
      row_('Downtime Type',esc_(ticketData.downtimeType||'—'),true)+
      row_('Description',esc_(ticketData.description||ticketData.problemDesc||'—'),false)+
    '</table>'+
    '<div style="background:#E8EAF6;border:1px solid #C5CAE9;border-radius:5px;padding:12px 14px;display:flex;gap:12px;align-items:flex-start;">'+
      '<div style="font-size:18px;flex-shrink:0;">📋</div>'+
      '<div><div style="font-size:11px;font-weight:bold;color:#1A237E;margin-bottom:4px;">'+actionTitle+'</div><div style="font-size:11px;color:#3C4A6E;line-height:1.6;">'+actionBody+'</div></div>'+
    '</div>'+
    '</div>'+
    '<div style="background:#F5F5F5;border-top:1px solid #E0E0E0;padding:11px 24px;text-align:center;">'+
      '<div style="font-size:10px;color:#9E9E9E;">Container Supply Co. — Maintenance Tracker v3.0 &nbsp;&middot;&nbsp; Garden Grove, CA</div>'+
      '<div style="font-size:10px;color:#B0B0B0;margin-top:3px;">This is an automated notification. Do not reply to this email.</div>'+
    '</div></div>';
  MailApp.sendEmail({to:recipients, name:'CSC Maintenance Tracker', subject:'🔄 Ticket Transfer | '+ticketNo+' | '+fromDept+' \u2192 '+toDept,htmlBody:htmlBody});
}

// ═══════════════════════════════════════════════════════════════════════════
//  ITEM 8C — GET MANAGERS FOR DEPT
//  Reads col E (Owned Departments) from Manager Access tab.
//  Returns emails of managers who own that dept.
// ═══════════════════════════════════════════════════════════════════════════
function getManagersForDept_(dept){
  if(!dept)return[];var deptUpper=String(dept).toUpperCase().trim(),emails=[];
  try{getManagerConfig().forEach(function(m){var ownedRaw=String(m.ownedDepts||'').trim();if(!ownedRaw)return;var owned=ownedRaw.toUpperCase().split(',').map(function(d){return d.trim();});if(owned.indexOf(deptUpper)>=0&&m.managerEmail)emails.push(m.managerEmail.trim());});}catch(e){Logger.log('getManagersForDept_ error: '+e.message);}
  return emails;
}
function esc_(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ═══════════════════════════════════════════════════════════════════════════
//  EQUIPMENT TAG FUNCTIONS (unchanged)
// ═══════════════════════════════════════════════════════════════════════════
function greenTagEquipment(tagId,clearedBy){try{var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(SH.EQUIP_HOLD_LOG);if(!sh)return{success:false,error:'Equipment Hold Log not found'};var data=sh.getRange(2,EHL.TAG_ID,sh.getLastRow()-1,EHL_COLS).getValues();for(var i=0;i<data.length;i++){if(String(data[i][EHL.TAG_ID-1])===tagId){sh.getRange(i+2,EHL.EQUIP_STATUS).setValue('ACTIVE');sh.getRange(i+2,EHL.CLEARED_BY).setValue(clearedBy);sh.getRange(i+2,EHL.CLEARED_DATE).setValue(formatDateStr_(new Date()));sh.getRange(i+2,1,1,EHL_COLS).setBackground(CLR.GREEN_LT);return{success:true};}}return{success:false,error:'Tag ID not found'};}catch(e){return{success:false,error:e.message};}}
function submitEquipmentHoldTag(data){try{var ss=SpreadsheetApp.getActiveSpreadsheet(),now=new Date();var tagId=(data.ticketNo&&data.ticketNo.trim())?data.ticketNo.trim():generateTagId();var sh=ss.getSheetByName(SH.EQUIP_HOLD_LOG);if(!sh)throw new Error('Equipment Hold Log tab not found');var row=[tagId,data.ticketNo||'',data.equipCode||'',data.equipDesc||'',data.dept||'',data.buildingZone||'',data.tagType||'',formatDateStr_(now),data.taggedBy||'',data.reason||'','TAGGED','','',data.notes||''];sh.appendRow(row);var tagColor=data.tagType.toLowerCase().indexOf('yellow')>=0?CLR.YELLOW_LT:data.tagType.toLowerCase().indexOf('orange')>=0?CLR.ORANGE_LT:CLR.RED_LT;sh.getRange(sh.getLastRow(),1,1,EHL_COLS).setBackground(tagColor).setBorder(true,true,true,true,true,true,'#FFCDD2',SpreadsheetApp.BorderStyle.SOLID);writeToExternalHoldRegister_(row);if(data.ticketNo){logTicketHistory(data.ticketNo,TH_EVENTS.TAGGED,'','',data.taggedBy,'Equipment tagged: '+data.tagType+' | '+(data.equipCode||'')+' — '+(data.equipDesc||''));}return{success:true,tagId:tagId};}catch(e){return{success:false,error:e.message};}}
function getActiveTagsForClearing(){var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(SH.EQUIP_HOLD_LOG);if(!sh||sh.getLastRow()<6)return[];var startRow=6,numRows=sh.getLastRow()-startRow+1;if(numRows<1)return[];var data=sh.getRange(startRow,1,numRows,EHL_COLS).getValues(),tags=[];data.forEach(function(r){var tagId=String(r[EHL.TAG_ID-1]).trim(),status=String(r[EHL.EQUIP_STATUS-1]).toUpperCase().trim();if(!tagId||status==='CLEARED'||status==='INACTIVE')return;tags.push({tagId:tagId,ticketNo:String(r[EHL.TICKET_NO-1]).trim(),equipCode:String(r[EHL.EQUIP_CODE-1]).trim(),equipDesc:String(r[EHL.SPECIFIC_EQUIP-1]).trim(),dept:String(r[EHL.DEPT-1]).trim(),tagType:String(r[EHL.TAG_TYPE-1]).trim(),dateTagged:formatDateStr_(r[EHL.DATE_TAGGED-1]),reason:String(r[EHL.REASON-1]).trim()});});return tags;}
function clearEquipmentTag(data){try{var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(SH.EQUIP_HOLD_LOG);if(!sh)return{success:false,error:'Equipment Hold Log not found'};var now=new Date(),clearedBy=data.clearedBy||Session.getActiveUser().getEmail()||'Manager';var clearedDate=formatDateStr_(now),notes=data.notes||'',tagId=data.tagId;if(!tagId)return{success:false,error:'No Tag ID provided'};var startRow=6,numRows=sh.getLastRow()-startRow+1;if(numRows<1)return{success:false,error:'Tag ID not found'};var rows=sh.getRange(startRow,1,numRows,EHL_COLS).getValues(),found=false;for(var i=0;i<rows.length;i++){if(String(rows[i][EHL.TAG_ID-1]).trim()===tagId){var rowNum=i+startRow;sh.getRange(rowNum,EHL.EQUIP_STATUS).setValue('CLEARED');sh.getRange(rowNum,EHL.CLEARED_BY).setValue(clearedBy);sh.getRange(rowNum,EHL.CLEARED_DATE).setValue(clearedDate);if(notes)sh.getRange(rowNum,EHL.NOTES).setValue(notes);sh.getRange(rowNum,1,1,EHL_COLS).setBackground(CLR.GREEN_LT).setBorder(true,true,true,true,true,true,'#A5D6A7',SpreadsheetApp.BorderStyle.SOLID);found=true;break;}}if(!found)return{success:false,error:'Tag ID not found: '+tagId};updateExternalHoldRegisterClear_(tagId,clearedBy,clearedDate,notes);if(data.ticketNo){logTicketHistory(data.ticketNo,'TAG CLEARED','TAGGED','CLEARED',clearedBy,'Green Tag issued — cleared by: '+clearedBy+(notes?' | '+notes:''));}return{success:true,tagId:tagId};}catch(e){return{success:false,error:e.message};}}
function writeToExternalHoldRegister_(rowData){try{var cfg=getConfig(),extUrl=cfg['Equipment Hold Register URL']||'';var extTab=cfg['Equipment Hold Register Tab Name']||'FRM-029-001 Equipment Hold Register';if(!extUrl){return;}var idMatch=extUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);if(!idMatch)return;var extSS=SpreadsheetApp.openById(idMatch[1]);var extSh=extSS.getSheetByName(extTab);if(!extSh)return;extSh.appendRow(rowData);}catch(e){Logger.log('writeToExternalHoldRegister_ error: '+e.message);}}
function updateExternalHoldRegisterClear_(tagId,clearedBy,clearedDate,notes){try{var cfg=getConfig(),extUrl=cfg['Equipment Hold Register URL']||'';var extTab=cfg['Equipment Hold Register Tab Name']||'FRM-029-001 Equipment Hold Register';if(!extUrl)return;var idMatch=extUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);if(!idMatch)return;var extSS=SpreadsheetApp.openById(idMatch[1]),extSh=extSS.getSheetByName(extTab);if(!extSh||extSh.getLastRow()<2)return;var data=extSh.getRange(2,1,extSh.getLastRow()-1,14).getValues();for(var i=0;i<data.length;i++){if(String(data[i][0]).trim()===tagId){var rowNum=i+2;extSh.getRange(rowNum,11).setValue('CLEARED');extSh.getRange(rowNum,12).setValue(clearedBy);extSh.getRange(rowNum,13).setValue(clearedDate);if(notes)extSh.getRange(rowNum,14).setValue(notes);extSh.getRange(rowNum,1,1,14).setBackground('#C8E6C9');break;}}}catch(e){Logger.log('updateExternalHoldRegisterClear_ error: '+e.message);}}

// ═══════════════════════════════════════════════════════════════════════════
//  EQUIPMENT INVENTORY SYNC (unchanged)
// ═══════════════════════════════════════════════════════════════════════════
function syncEquipmentInventory(){
  var ui=SpreadsheetApp.getUi(),cfg=getConfig();var sourceUrl=cfg['Equipment List Source URL']||'https://docs.google.com/spreadsheets/d/1dlqp8jEMxxNYkIhr30tWK1yuC6FFlYTFU8Eq6EXeIps/edit';
  try{SpreadsheetApp.getActiveSpreadsheet().toast('Syncing Equipment Inventory...','🔄',30);var idMatch=sourceUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);if(!idMatch)throw new Error('Could not extract spreadsheet ID');var sourceSS=SpreadsheetApp.openById(idMatch[1]);var sourceSheet=sourceSS.getSheetByName('Copy for Maintenance Tracker System')||sourceSS.getSheets()[0];if(!sourceSheet||sourceSheet.getLastRow()<2)throw new Error('Source sheet empty or not found');var sourceData=sourceSheet.getDataRange().getValues();var headers=sourceData[0].map(function(h){return String(h).trim().toLowerCase();});var colMap={},mappings={code:['equipment code','equip code','code','asset code','job #','job#','job number','id','asset id'],group:['group','category','equipment group','grp'],specific:['specific equipment','equipment name','equipment description','name','description','asset name','asset description'],eType:['equipment type','equip type','type'],dept:['department','dept'],status:['status','active','state']};Object.keys(mappings).forEach(function(key){for(var i=0;i<headers.length;i++){if(mappings[key].indexOf(headers[i])>=0){colMap[key]=i;break;}}});var ss=SpreadsheetApp.getActiveSpreadsheet(),invSh=ss.getSheetByName(SH.EQUIP_INV);if(!invSh)throw new Error('Equipment Inventory sheet not found');if(invSh.getLastRow()>1)invSh.getRange(2,1,invSh.getLastRow()-1,6).clear();var writeRow=2,imported=0;for(var r=1;r<sourceData.length;r++){var row=sourceData[r];var code=colMap.code!==undefined?String(row[colMap.code]).trim():'';var grp=colMap.group!==undefined?String(row[colMap.group]).trim():'';var spec=colMap.specific!==undefined?String(row[colMap.specific]).trim():'';var eTyp=colMap.eType!==undefined?String(row[colMap.eType]).trim():'';var dept=colMap.dept!==undefined?String(row[colMap.dept]).trim():'';var stat=colMap.status!==undefined?String(row[colMap.status]).trim():'';if(!code&&!spec)continue;if(dept==='-')dept='';var bg=(writeRow%2===0)?CLR.WHITE:'#F9F9F9';invSh.getRange(writeRow,1,1,6).setValues([[dept,grp,eTyp,code,spec,stat]]).setBackground(bg).setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle');writeRow++;imported++;}SpreadsheetApp.getActiveSpreadsheet().toast('✅ '+imported+' equipment records synced.','⚙️',5);ui.alert('✅ Equipment Inventory Synced',imported+' records imported.',ui.ButtonSet.OK);}catch(e){ui.alert('❌ Sync Failed','Error: '+e.message,ui.ButtonSet.OK);}
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHEET HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function resetSheet_(ss,name,tabColor,frozenRows){var sh=ss.getSheetByName(name);if(!sh){sh=ss.insertSheet(name);}else{sh.clear();sh.clearFormats();sh.clearConditionalFormatRules();}sh.setTabColor(tabColor||CLR.STEEL);if(frozenRows)sh.setFrozenRows(frozenRows);sh.setHiddenGridlines(true);return sh;}
function fillRow_(sh,row,startCol,endCol,color){sh.getRange(row,startCol,1,endCol-startCol+1).setBackground(color);}
function rh_(sh,row,height){sh.setRowHeight(row,height);}
function mw_(sh,row,startCol,numCols){var range=sh.getRange(row,startCol,1,numCols);range.merge();return range;}
function setColWidths_(sh,widths){var current=sh.getMaxColumns();if(current<widths.length)sh.insertColumnsAfter(current,widths.length-current);widths.forEach(function(w,i){if(w>0)sh.setColumnWidth(i+1,w);});}
function getCurrentMonth_(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'MMMM yyyy');}
function formatDateStr_(d){if(!d)return'';if(typeof d==='string')d=new Date(d);return Utilities.formatDate(d,Session.getScriptTimeZone(),'MM/dd/yyyy');}
function formatTimestamp_(d){if(!d)d=new Date();return Utilities.formatDate(d,Session.getScriptTimeZone(),'MM/dd/yyyy HH:mm:ss');}

// ═══════════════════════════════════════════════════════════════════════════
//  TEMP FIX MONITORING
// ═══════════════════════════════════════════════════════════════════════════
function checkTempFixDueDates() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName(SH.TEMP_FIX);
  if (!sh || sh.getLastRow() < 2) return;
  var today = new Date();

  sh.getRange(2, 1, sh.getLastRow()-1, TF_COLS).getValues().forEach(function(r, i) {
    var status  = String(r[TF.STATUS-1]).toUpperCase();
    if (status === 'CLEARED' || status === 'INACTIVE') return;
    var nextDue = r[TF.NEXT_DUE-1];
    if (!nextDue) return;
    if (new Date(nextDue) < today && status !== 'PAST DUE') {
      sh.getRange(i+2, TF.STATUS).setValue('PAST DUE');
      sh.getRange(i+2, 1, 1, TF_COLS).setBackground(CLR.RED_LT);
      sh.getRange(i+2, TF.STATUS).setFontColor(CLR.RED).setFontWeight('bold');
    }
  });

  sendTempFixDueReminders();     // tomorrow's due dates
  sendTempFixPastDueAlerts();    // already past due
}

function sendTempFixDueReminders() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName(SH.TEMP_FIX);
  if (!sh || sh.getLastRow() < 2) return;

  var tz       = Session.getScriptTimeZone();
  var today    = new Date();
  var tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  var tomorrowStr = Utilities.formatDate(tomorrow, tz, 'MM/dd/yyyy');

  var data = sh.getRange(2, 1, sh.getLastRow()-1, TF_COLS).getValues();

  data.forEach(function(r) {
    var status  = String(r[TF.STATUS-1]   || '').toUpperCase().trim();
    var nextDue = r[TF.NEXT_DUE-1];
    if (status === 'CLEARED' || status === 'INACTIVE' || status === 'PAST DUE') return;
    if (!nextDue) return;

    var nextDueStr = Utilities.formatDate(new Date(nextDue), tz, 'MM/dd/yyyy');
    if (nextDueStr !== tomorrowStr) return;

    // Get dept manager emails
    var dept       = String(r[TF.DEPT-1]          || '');
    var ticketNo   = String(r[TF.TICKET_NO-1]     || '');
    var equip      = String(r[TF.SPECIFIC_EQUIP-1]|| '');
    var equipCode  = String(r[TF.EQUIP_CODE-1]    || '');
    var description= String(r[TF.DESCRIPTION-1]   || '');
    var tempFixDesc= String(r[TF.TEMP_FIX_DESC-1] || '');
    var flaggedBy  = String(r[TF.FLAGGED_BY-1]    || '');
    var dateFlagged= formatDateStr_(r[TF.DATE_FLAGGED-1]);

    var recipients = getManagersForDept_(dept).join(', ');
    if (!recipients) {
      // Fall back to admin emails
      recipients = ADMIN_EMAILS.join(', ');
    }
    if (!recipients) return;

    var subject = '⚠️ Temp Fix Inspection Due Tomorrow | ' + ticketNo + ' | ' + equip;
    var body =
      '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">'+
      '<div style="background:#2A2A2A;padding:14px 20px;display:flex;align-items:center;gap:10px;">'+
        '<div style="background:#EF6C00;width:5px;height:40px;border-radius:3px;flex-shrink:0;"></div>'+
        '<div>'+
          '<div style="font-size:15px;font-weight:bold;color:#FFD700;">⚡ MAINTENANCE TRACKER</div>'+
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">Container Supply Co. — Garden Grove, CA</div>'+
        '</div>'+
      '</div>'+
      '<div style="background:#F57F17;padding:10px 20px;">'+
        '<div style="font-size:13px;font-weight:bold;color:#fff;">⚠️ Temp Fix Inspection Due Tomorrow — ' + tomorrowStr + '</div>'+
      '</div>'+
      '<div style="background:#1B2A3C;padding:10px 20px;display:flex;gap:24px;flex-wrap:wrap;">'+
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Ticket #</div>'+
          '<div style="font-size:13px;font-weight:bold;color:#FFD700;font-family:monospace;">'+ticketNo+'</div></div>'+
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Department</div>'+
          '<div style="font-size:13px;font-weight:bold;color:#ECEFF1;">'+dept+'</div></div>'+
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Due Date</div>'+
          '<div style="font-size:13px;font-weight:bold;color:#F9A825;">'+tomorrowStr+'</div></div>'+
      '</div>'+
      '<div style="padding:18px 20px;">'+
        '<table style="width:100%;border-collapse:collapse;font-size:12px;">'+
          '<tr><td style="padding:5px 0;color:#9E9E9E;width:140px;">Equipment</td><td style="padding:5px 0;color:#2A2A2A;font-weight:bold;">'+equip+'</td></tr>'+
          '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;">Equipment Code</td><td style="padding:5px 0;font-family:monospace;font-weight:bold;">'+equipCode+'</td></tr>'+
          '<tr><td style="padding:5px 0;color:#9E9E9E;">Problem Description</td><td style="padding:5px 0;color:#2A2A2A;">'+description+'</td></tr>'+
          '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;">Temp Fix Applied</td><td style="padding:5px 0;color:#2A2A2A;">'+tempFixDesc+'</td></tr>'+
          '<tr><td style="padding:5px 0;color:#9E9E9E;">Date Flagged</td><td style="padding:5px 0;color:#2A2A2A;">'+dateFlagged+'</td></tr>'+
          '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;">Flagged By</td><td style="padding:5px 0;color:#2A2A2A;">'+flaggedBy+'</td></tr>'+
        '</table>'+
        '<div style="background:#FFF3E0;border-left:4px solid #EF6C00;border-radius:0 4px 4px 0;padding:10px 14px;margin-top:16px;">'+
          '<div style="font-size:11px;font-weight:bold;color:#E64A19;margin-bottom:3px;">Action Required</div>'+
          '<div style="font-size:11px;color:#2A2A2A;line-height:1.6;">Please ensure a technician inspects this equipment tomorrow and logs the inspection using the <strong>Temp Fix Inspection Checklist</strong> in the Maintenance Tracker.</div>'+
        '</div>'+
      '</div>'+
      '<div style="background:#F5F5F5;border-top:1px solid #E0E0E0;padding:10px 20px;text-align:center;">'+
        '<div style="font-size:10px;color:#9E9E9E;">CSC Maintenance Tracker v3.1 — Automated Notification. Do not reply.</div>'+
      '</div></div>';

    try {
      MailApp.sendEmail({ to: recipients, name: 'CSC Maintenance Tracker', subject: subject, htmlBody: body });
      Logger.log('Temp fix reminder sent for ' + ticketNo + ' to ' + recipients);
    } catch(e) {
      Logger.log('Temp fix reminder error for ' + ticketNo + ': ' + e.message);
    }
  });
}

function sendTempFixPastDueAlerts() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName(SH.TEMP_FIX);
  if (!sh || sh.getLastRow() < 2) return;

  var tz   = Session.getScriptTimeZone();
  var data = sh.getRange(2, 1, sh.getLastRow()-1, TF_COLS).getValues();

  data.forEach(function(r) {
    var status = String(r[TF.STATUS-1] || '').toUpperCase().trim();
    if (status !== 'PAST DUE') return;

    var dept       = String(r[TF.DEPT-1]          || '');
    var ticketNo   = String(r[TF.TICKET_NO-1]     || '');
    var equip      = String(r[TF.SPECIFIC_EQUIP-1]|| '');
    var equipCode  = String(r[TF.EQUIP_CODE-1]    || '');
    var description= String(r[TF.DESCRIPTION-1]   || '');
    var tempFixDesc= String(r[TF.TEMP_FIX_DESC-1] || '');
    var flaggedBy  = String(r[TF.FLAGGED_BY-1]    || '');
    var dateFlagged= formatDateStr_(r[TF.DATE_FLAGGED-1]);
    var nextDue    = formatDateStr_(r[TF.NEXT_DUE-1]);

    var recipients = getManagersForDept_(dept).join(', ');
    if (!recipients) recipients = ADMIN_EMAILS.join(', ');
    if (!recipients) return;

    var subject = '🔴 Temp Fix PAST DUE — Inspection Required | ' + ticketNo + ' | ' + equip;
    var body =
      '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">'+
      '<div style="background:#2A2A2A;padding:14px 20px;display:flex;align-items:center;gap:10px;">'+
        '<div style="background:#EF6C00;width:5px;height:40px;border-radius:3px;flex-shrink:0;"></div>'+
        '<div>'+
          '<div style="font-size:15px;font-weight:bold;color:#FFD700;">⚡ MAINTENANCE TRACKER</div>'+
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">Container Supply Co. — Garden Grove, CA</div>'+
        '</div>'+
      '</div>'+
      '<div style="background:#C62828;padding:10px 20px;">'+
        '<div style="font-size:13px;font-weight:bold;color:#fff;">🔴 Temp Fix Inspection PAST DUE — Immediate Action Required</div>'+
      '</div>'+
      '<div style="background:#1B2A3C;padding:10px 20px;display:flex;gap:24px;flex-wrap:wrap;">'+
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Ticket #</div>'+
          '<div style="font-size:13px;font-weight:bold;color:#FFD700;font-family:monospace;">'+ticketNo+'</div></div>'+
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Department</div>'+
          '<div style="font-size:13px;font-weight:bold;color:#ECEFF1;">'+dept+'</div></div>'+
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Was Due</div>'+
          '<div style="font-size:13px;font-weight:bold;color:#FFCDD2;">'+nextDue+'</div></div>'+
      '</div>'+
      '<div style="padding:18px 20px;background:#fff;">'+
        '<table style="width:100%;border-collapse:collapse;font-size:12px;">'+
          '<tr><td style="padding:6px 0;color:#9E9E9E;width:140px;vertical-align:top;">Equipment</td><td style="padding:6px 0;color:#2A2A2A;font-weight:bold;">'+equip+'</td></tr>'+
          '<tr style="background:#FAFAFA;"><td style="padding:6px 0;color:#9E9E9E;">Equipment Code</td><td style="padding:6px 0;font-family:monospace;font-weight:bold;color:#2A2A2A;">'+equipCode+'</td></tr>'+
          '<tr><td style="padding:6px 0;color:#9E9E9E;vertical-align:top;">Problem Description</td><td style="padding:6px 0;color:#2A2A2A;">'+description+'</td></tr>'+
          '<tr style="background:#FAFAFA;"><td style="padding:6px 0;color:#9E9E9E;vertical-align:top;">Temp Fix Applied</td><td style="padding:6px 0;color:#2A2A2A;">'+tempFixDesc+'</td></tr>'+
          '<tr><td style="padding:6px 0;color:#9E9E9E;">Date Flagged</td><td style="padding:6px 0;color:#2A2A2A;">'+dateFlagged+'</td></tr>'+
          '<tr style="background:#FAFAFA;"><td style="padding:6px 0;color:#9E9E9E;">Flagged By</td><td style="padding:6px 0;color:#2A2A2A;">'+flaggedBy+'</td></tr>'+
        '</table>'+
        '<div style="background:#FFCDD2;border-left:4px solid #C62828;border-radius:0 4px 4px 0;padding:10px 14px;margin-top:16px;">'+
          '<div style="font-size:11px;font-weight:bold;color:#B71C1C;margin-bottom:3px;">Immediate Action Required</div>'+
          '<div style="font-size:11px;color:#7F0000;line-height:1.6;">This temp fix inspection is <strong>overdue</strong>. Please assign a technician to inspect this equipment today and log the inspection using the <strong>Temp Fix Inspection Checklist</strong> in the Maintenance Tracker.</div>'+
        '</div>'+
      '</div>'+
      '<div style="background:#F5F5F5;border-top:1px solid #E0E0E0;padding:10px 20px;text-align:center;">'+
        '<div style="font-size:10px;color:#9E9E9E;">CSC Maintenance Tracker v3.1 — Automated Notification. Do not reply.</div>'+
      '</div></div>';

    try {
    MailApp.sendEmail({ to: recipients, name: 'CSC Maintenance Tracker', subject: subject, htmlBody: body });
      Logger.log('Past due alert sent for ' + ticketNo + ' to ' + recipients);
    } catch(e) {
      Logger.log('Past due alert error for ' + ticketNo + ': ' + e.message);
    }
  });
}

function syncExternalTickets() {
  var cfg = getConfig();
  var syncEnabled = String(cfg['External Sync Enabled'] || 'Y').toUpperCase();
  if (syncEnabled !== 'Y') return;

  var sourceUrl = cfg['External Ticket Source URL'] || '';
  var tabName   = cfg['External Ticket Tab Name']   || 'Service Tickets';
  if (!sourceUrl) { Logger.log('External sync: no source URL configured'); return; }

  try {
    var idMatch = sourceUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!idMatch) { Logger.log('External sync: invalid URL'); return; }

    var sourceSS = SpreadsheetApp.openById(idMatch[1]);
    var sourceSh = sourceSS.getSheetByName(tabName);
    if (!sourceSh || sourceSh.getLastRow() < 2) {
      Logger.log('External sync: tab "' + tabName + '" not found or empty');
      return;
    }

    var sourceData = sourceSh.getRange(2, 1, sourceSh.getLastRow()-1, 10).getValues();
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var logSh = ss.getSheetByName(SH.MASTER_LOG);

    // Build map of already-imported ticket numbers to avoid duplicates
    var existingNos = {};
    if (logSh && logSh.getLastRow() > 1) {
      logSh.getRange(2, ML.TICKET_NO, logSh.getLastRow()-1, 1).getValues()
        .forEach(function(r) { existingNos[String(r[0]).trim()] = true; });
    }

    var tz = Session.getScriptTimeZone();
    var now = new Date();
    var imported = 0, skipped = 0;

    sourceData.forEach(function(row) {
      var ticketNo  = String(row[0] || '').trim();
      var timestamp = row[1];
      var mechanic  = String(row[2] || '').trim();
      var deptRaw   = String(row[3] || '').trim().toUpperCase();
      var lineNo    = String(row[4] || '').trim();
      var equipType = String(row[5] || '').trim().toUpperCase();
      var equipDesc = String(row[6] || '').trim();
      var issueDesc = String(row[7] || '').trim();
      var hoursHint = row[8];
      var photoLinks= String(row[9] || '').trim();

      // Skip blank rows
      if (!ticketNo && !issueDesc) { skipped++; return; }

      // Skip already-imported tickets
      if (ticketNo && existingNos[ticketNo]) { skipped++; return; }

      // ── KEY FIX: normalize dept through Dept Map (same as internal tickets) ──
      var mappedDept = getDeptGroup_(deptRaw);

      // ── KEY FIX: resolve the correct dept tracker (same as addNewTicket) ──
      var trackerSheet = getTrackerForDept(deptRaw, '', equipType);

      // Format timestamps
      var dateOpened = '', tsFormatted = '';
      if (timestamp instanceof Date && !isNaN(timestamp)) {
        dateOpened   = Utilities.formatDate(timestamp, tz, 'MM/dd/yyyy');
        tsFormatted  = Utilities.formatDate(timestamp, tz, 'MM/dd/yyyy HH:mm:ss');
      } else {
        dateOpened   = Utilities.formatDate(now, tz, 'MM/dd/yyyy');
        tsFormatted  = Utilities.formatDate(now, tz, 'MM/dd/yyyy HH:mm:ss');
      }

      // Build ticket data object — reused for both sheet writes below
      var ticketData = {
        dept:         mappedDept,
        equipType:    equipType,
        equipCode:    '',
        equipDesc:    equipDesc,
        specificEquip:equipDesc,
        description:  issueDesc,
        problemDesc:  issueDesc,
        downtimeType: 'UNPLANNED',
        priority:     '',
        estHours:     parseFloat(hoursHint) || '',
        partsNeeded:  false,
        addedBy:      mechanic || 'External Sync',
        updatedBy:    'External Sync',
        notes:        photoLinks ? 'Photos: ' + photoLinks : '',
        source:       'EXTERNAL'
      };

      // Write to Master Log — use mappedDept (not raw)
      var mlRow = new Array(ML_COLS).fill('');
      mlRow[ML.TICKET_NO-1]    = ticketNo;
      mlRow[ML.TIMESTAMP-1]    = tsFormatted;
      mlRow[ML.ACTION-1]       = 'EXTERNAL IMPORT';
      mlRow[ML.STATUS-1]       = 'WAITING';
      mlRow[ML.DEPT-1]         = mappedDept;       // ← was raw dept
      mlRow[ML.EQUIP_TYPE-1]   = equipType;
      mlRow[ML.SPECIFIC_EQUIP-1] = equipDesc;
      mlRow[ML.DOWNTIME_TYPE-1]= 'UNPLANNED';
      mlRow[ML.DESCRIPTION-1]  = issueDesc;
      mlRow[ML.EST_HOURS-1]    = parseFloat(hoursHint) || '';
      mlRow[ML.DATE_OPENED-1]  = dateOpened;
      mlRow[ML.PARTS_NEEDED-1] = 'N';
      mlRow[ML.ADDED_BY-1]     = mechanic || 'External Sync';
      mlRow[ML.UPDATED_BY-1]   = 'External Sync';
      mlRow[ML.NOTES-1]        = photoLinks ? 'Photos: ' + photoLinks : '';
      mlRow[ML.TRACKER_GROUP-1] = getDeptGroup_(mappedDept);
      mlRow[ML.LINE_NO-1] = lineNo || '';

      // Auto-lookup equipment code from inventory
      var resolvedCode = lookupEquipmentCode_(mappedDept, equipType, equipDesc);
      if (resolvedCode) {
        ticketData.equipCode = resolvedCode;
        mlRow[ML.EQUIP_CODE-1] = resolvedCode;
      }

      if (logSh) {
        logSh.appendRow(mlRow);
        existingNos[ticketNo] = true;
      }

      // ── Write to Waiting Queue (same as before) ──
      writeTicketToTrackerSheet_(ss, SH.WAITING, ticketNo, ticketData, 'WAITING', now);

      // ── KEY FIX: Also write to correct dept tracker (same as addNewTicket) ──
      writeTicketToTrackerSheet_(ss, trackerSheet, ticketNo, ticketData, 'WAITING', now);

      // Log ticket history
      logTicketHistory(
        ticketNo, TH_EVENTS.CREATED, '', 'WAITING',
        mechanic || 'External Sync',
        'Imported from external form | Dept: ' + mappedDept +
        ' | Tracker: ' + getTrackerDisplayName(trackerSheet) +
        ' | Equipment: ' + (equipDesc || '—') +
        ' | Line: '     + (lineNo    || '—')
      );
         sendNewTicketManagerNotification(ticketNo, ticketData);

      imported++;
    });

    if (imported > 0) {
      Logger.log('External sync: imported ' + imported + ' ticket(s). Skipped: ' + skipped +
                 '. Tracker routing active.');
      SpreadsheetApp.getActiveSpreadsheet()
        .toast('✅ ' + imported + ' external ticket(s) synced.', '🔄 External Sync', 5);
    } else {
      Logger.log('External sync: no new tickets. Skipped: ' + skipped);
    }

  } catch(e) { Logger.log('External sync error: ' + e.message); }
}

function manualSyncExternalTickets() { syncExternalTickets(); }

// ═══════════════════════════════════════════════════════════════════════════
//  MONTHLY BACKUP — exports key sheets as CSV to Google Drive
//  Trigger: run setupBackupTrigger_() once to schedule on 1st of each month
// ═══════════════════════════════════════════════════════════════════════════
function runMonthlyBackup() {
  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var tz     = Session.getScriptTimeZone();
  var stamp  = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');

  var sheetsToBackup = [
    SH.MASTER_LOG,
    SH.TICKET_HIST,
    SH.PARTS_NEEDED,
    SH.TEMP_FIX,
    SH.EQUIP_HOLD_LOG,
    SH.TRANSFER_LOG,
    SH.CLOSED
  ];

  try {
    var rootName   = 'CSC Maintenance System Backups';
    var rootFolder = getOrCreateFolder_(rootName, DriveApp.getRootFolder());
    var dateFolder = getOrCreateFolder_(stamp, rootFolder);

    var exported = 0;
    sheetsToBackup.forEach(function(shName) {
      var sh = ss.getSheetByName(shName);
      if (!sh || sh.getLastRow() < 1) return;

      var data    = sh.getDataRange().getValues();
      var csvRows = data.map(function(row) {
        return row.map(function(cell) {
          var val = String(cell instanceof Date
            ? Utilities.formatDate(cell, tz, 'MM/dd/yyyy HH:mm:ss')
            : (cell === null || cell === undefined ? '' : cell));
          if (val.indexOf(',') >= 0 || val.indexOf('"') >= 0 || val.indexOf('\n') >= 0) {
            val = '"' + val.replace(/"/g, '""') + '"';
          }
          return val;
        }).join(',');
      }).join('\n');

      var safeName = shName.replace(/[^\w\s\-]/g, '').trim().replace(/\s+/g, ' ');
      var fileName = stamp + ' — ' + safeName + '.csv';
      dateFolder.createFile(fileName, csvRows, MimeType.CSV);
      exported++;
    });

    // Also backup external tickets spreadsheet
    try {
      var extSS = SpreadsheetApp.openById('1F4-nPI4pkZZ933RKb2g6WBVR3JDZNgBRz8hQKGr0_4w');
      var extSh = extSS.getSheetByName('Service Tickets');
      if (extSh && extSh.getLastRow() > 0) {
        var extData = extSh.getDataRange().getValues();
        var extCsv  = extData.map(function(row) {
          return row.map(function(cell) {
            var val = String(cell instanceof Date
              ? Utilities.formatDate(cell, tz, 'MM/dd/yyyy HH:mm:ss')
              : (cell === null || cell === undefined ? '' : cell));
            if (val.indexOf(',') >= 0 || val.indexOf('"') >= 0 || val.indexOf('\n') >= 0) {
              val = '"' + val.replace(/"/g, '""') + '"';
            }
            return val;
          }).join(',');
        }).join('\n');
        dateFolder.createFile(stamp + ' — External Service Tickets.csv', extCsv, MimeType.CSV);
        exported++;
      }
    } catch(e) {
      Logger.log('External sheet backup error: ' + e.message);
    }

    Logger.log('Monthly backup complete: ' + exported + ' files saved.');
    SpreadsheetApp.getActiveSpreadsheet()
      .toast('✅ Backup complete — ' + exported + ' files saved to Drive.', '📦 Monthly Backup', 6);

    // Send confirmation email to admins
    var recipients = ADMIN_EMAILS.join(', ');
    if (recipients) {
      var subject = '📦 Monthly Backup Complete — ' + stamp;
      var body = '<p>The monthly backup ran successfully on <strong>' + stamp + '</strong>.</p>'
        + '<p><strong>' + exported + ' files</strong> were saved to Google Drive under:'
        + '<br><code>CSC Maintenance System Backups / ' + stamp + '</code></p>'
        + '<p>Sheets backed up:</p><ul>'
        + sheetsToBackup.map(function(s) { return '<li>' + s + '</li>'; }).join('')
        + '<li>External Service Tickets</li>'
        + '</ul><p style="color:#9E9E9E;font-size:11px;">CSC Maintenance Tracker — Automated Backup Notification</p>';
      MailApp.sendEmail({ to: recipients, name: 'CSC Maintenance Tracker', subject: subject, htmlBody: body });
    }

  } catch(e) {
    Logger.log('Monthly backup error: ' + e.message);
    SpreadsheetApp.getActiveSpreadsheet()
      .toast('❌ Backup failed: ' + e.message, '📦 Monthly Backup', 8);
  }
}

function getOrCreateFolder_(name, parent) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

function manualRunBackup() { runMonthlyBackup(); }

function setupBackupTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'runMonthlyBackup') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runMonthlyBackup')
    .timeBased()
    .onMonthDay(28)
    .atHour(1)
    .create();
  Logger.log('Backup trigger set: 28th of each month at 1am');
}

// ═══════════════════════════════════════════════════════════════════════════
//  TEMP FIX INSPECTION FORM
// ═══════════════════════════════════════════════════════════════════════════
function showTempFixInspection() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile('TempFixInspection').setWidth(900).setHeight(860),
    '🔧 Temp Fix Inspection Checklist'
  );
}

function getTempFixFormData() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName(SH.TEMP_FIX);
  var records = [];

  if (sh && sh.getLastRow() > 1) {
    var data = sh.getRange(2, 1, sh.getLastRow()-1, TF_COLS).getValues();
    data.forEach(function(r) {
      var status = String(r[TF.STATUS-1] || '').toUpperCase().trim();
      if (status === 'CLEARED' || status === 'INACTIVE') return;
      records.push({
        tempId:       String(r[TF.TEMP_ID-1]       || ''),
        ticketNo:     String(r[TF.TICKET_NO-1]      || ''),
        equipCode:    String(r[TF.EQUIP_CODE-1]     || ''),
        specificEquip:String(r[TF.SPECIFIC_EQUIP-1] || ''),
        dept:         String(r[TF.DEPT-1]           || ''),
        equipType:    String(r[TF.BUILDING_ZONE-1]  || ''),
        description:  String(r[TF.DESCRIPTION-1]    || ''),
        tempFixDesc:  String(r[TF.TEMP_FIX_DESC-1]  || ''),
        freqDays:     r[TF.FREQ_DAYS-1]             || 7,
        dateFlagged:  formatDateStr_(r[TF.DATE_FLAGGED-1]),
        nextDue:      formatDateStr_(r[TF.NEXT_DUE-1]),
        flaggedBy:    String(r[TF.FLAGGED_BY-1]     || ''),
        status:       status
      });
    });
  }

  // Sort — PAST DUE first
  records.sort(function(a, b) {
    if (a.status === 'PAST DUE' && b.status !== 'PAST DUE') return -1;
    if (b.status === 'PAST DUE' && a.status !== 'PAST DUE') return 1;
    return 0;
  });

  return {
    records:    records,
    peopleList: getPeopleList_(false)
  };
}

function submitTempFixInspection(data) {
  try {
    var ss  = SpreadsheetApp.getActiveSpreadsheet();
    var sh  = ss.getSheetByName(SH.TEMP_FIX);
    if (!sh) throw new Error('Temp Fix Monitor sheet not found');

    var now     = new Date();
    var tz      = Session.getScriptTimeZone();
    var tempId  = data.tempId;
    var outcome = data.outcome; // 'CONTINUE' or 'CLEAR'

    // Find the row
    var rows    = sh.getRange(2, 1, sh.getLastRow()-1, TF_COLS).getValues();
    var rowNum  = -1;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][TF.TEMP_ID-1]).trim() === tempId) {
        rowNum = i + 2;
        break;
      }
    }
    if (rowNum < 0) throw new Error('Temp fix record not found: ' + tempId);

    var checklistSummary = data.checklist.map(function(c) {
      return (c.checked ? '[X]' : '[ ]') + ' ' + c.label;
    }).join(' | ');

    var inspectionNote = 'Inspection by ' + data.inspectedBy +
      ' on ' + data.inspectionDate +
      ' | Checklist: ' + checklistSummary +
      (data.notes ? ' | Notes: ' + data.notes : '');

    if (outcome === 'CLEAR') {
      sh.getRange(rowNum, TF.STATUS).setValue('CLEARED');
      sh.getRange(rowNum, TF.CLEARED_BY).setValue(data.inspectedBy);
      sh.getRange(rowNum, TF.CLEARED_DATE).setValue(data.inspectionDate);
      sh.getRange(rowNum, TF.NOTES).setValue(inspectionNote);
      sh.getRange(rowNum, 1, 1, TF_COLS).setBackground('#C8E6C9');
      sh.getRange(rowNum, TF.STATUS).setFontColor('#2E7D32').setFontWeight('bold');

      logTicketHistory(
        data.ticketNo, 'TEMP FIX CLEARED', 'ACTIVE', 'CLEARED',
        data.inspectedBy,
        'Temp fix cleared — permanent fix confirmed | ' + inspectionNote
      );

    } else {
      // Continue monitoring — reset clock
      var freqDays = parseInt(data.freqDays) || 7;
      var nextDue  = new Date(now.getTime() + freqDays * 24 * 60 * 60 * 1000);

      sh.getRange(rowNum, TF.LAST_INSPECTED).setValue(data.inspectionDate);
      sh.getRange(rowNum, TF.NEXT_DUE).setValue(formatDateStr_(nextDue));
      sh.getRange(rowNum, TF.STATUS).setValue('ACTIVE');
      sh.getRange(rowNum, TF.NOTES).setValue(inspectionNote);
      sh.getRange(rowNum, 1, 1, TF_COLS).setBackground('#FFF9C4');
      sh.getRange(rowNum, TF.STATUS).setFontColor('#F9A825').setFontWeight('bold');

      logTicketHistory(
        data.ticketNo, 'TEMP FIX INSPECTED', 'PAST DUE', 'ACTIVE',
        data.inspectedBy,
        'Inspection completed — continuing monitoring | Next due: ' +
        formatDateStr_(nextDue) + ' | ' + inspectionNote
      );
    }

    return { success: true };

  } catch(e) {
    Logger.log('submitTempFixInspection error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  NEW TICKET MANAGER NOTIFICATION
// ═══════════════════════════════════════════════════════════════════════════
function sendNewTicketManagerNotification(ticketNo, ticketData) {
  try {
    var dept = getDeptGroup_(String(ticketData.dept || ''));
    var source  = String(ticketData.source      || 'INTERNAL');
    var equip   = String(ticketData.specificEquip || ticketData.equipDesc || '');
    var equipCode = String(ticketData.equipCode  || '');
    var equipType = String(ticketData.equipType  || '');
    var description = String(ticketData.description || ticketData.problemDesc || '');
    var addedBy = String(ticketData.addedBy      || '');
    var lineNo  = String(ticketData.lineNo || ticketData.line || '');
    var downtimeType = String(ticketData.downtimeType || '');
    var dateOpened = ticketData.dateOpened
      ? (ticketData.dateOpened instanceof Date
          ? formatDateStr_(ticketData.dateOpened)
          : String(ticketData.dateOpened))
      : formatDateStr_(new Date());

    var tz  = Session.getScriptTimeZone();
    var now = new Date();
    var tsStr = Utilities.formatDate(now, tz, 'MM/dd/yyyy \u00b7 hh:mm a');

    // Recipients — dept manager first, fall back to all managers, then admins
    var recipients = getManagersForDept_(dept).join(', ');
    if (!recipients) {
      var allMgrs = [];
      try {
        getManagerConfig().forEach(function(m) {
          if (m.managerEmail) allMgrs.push(m.managerEmail.trim());
        });
      } catch(e) { Logger.log('sendNewTicketManagerNotification manager fallback error: ' + e.message); }
      recipients = allMgrs.join(', ');
    }
    if (!recipients) recipients = ADMIN_EMAILS.join(', ');
    if (!recipients) { Logger.log('sendNewTicketManagerNotification: no recipients for ' + ticketNo); return; }

    var sourceLabel = source === 'EXTERNAL' ? 'External' : 'Internal';
    var sourceColor = source === 'EXTERNAL' ? '#1565C0' : '#616161';
    var sourceBg    = source === 'EXTERNAL' ? '#E3F2FD' : '#F5F5F5';

    var subject = '📋 Manager Action Required | New Ticket ' + ticketNo + ' | ' + dept;

    var htmlBody =
      '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">'+

      '<div style="background:#2A2A2A;padding:14px 20px;display:flex;align-items:center;gap:10px;">'+
        '<div style="background:#EF6C00;width:5px;height:40px;border-radius:3px;flex-shrink:0;"></div>'+
        '<div style="flex:1;">'+
          '<div style="font-size:15px;font-weight:bold;color:#FFD700;letter-spacing:.4px;">⚡ MAINTENANCE TRACKER</div>'+
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">Container Supply Co. — Garden Grove, CA</div>'+
        '</div>'+
        '<div style="text-align:right;">'+
          '<div style="font-size:10px;color:#9E9E9E;">New Ticket Notification</div>'+
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">'+tsStr+'</div>'+
        '</div>'+
      '</div>'+

      '<div style="background:#0D47A1;padding:12px 20px;display:flex;align-items:center;gap:12px;">'+
        '<div style="font-size:20px;">📋</div>'+
        '<div>'+
          '<div style="font-size:13px;font-weight:bold;color:#fff;">Manager Action Required</div>'+
          '<div style="font-size:11px;color:#90CAF9;margin-top:2px;">A new ticket has been submitted and is waiting for your review</div>'+
        '</div>'+
      '</div>'+

      '<div style="background:#1B2A3C;padding:10px 20px;display:flex;gap:24px;flex-wrap:wrap;">'+
        '<div>'+
          '<div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Ticket #</div>'+
          '<div style="font-size:18px;font-weight:bold;color:#FFD700;font-family:monospace;">'+ticketNo+'</div>'+
        '</div>'+
        '<div>'+
          '<div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Department</div>'+
          '<div style="font-size:13px;font-weight:bold;color:#ECEFF1;">'+esc_(dept)+'</div>'+
        '</div>'+
        '<div>'+
          '<div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Status</div>'+
          '<div style="font-size:13px;font-weight:bold;color:#F9A825;">Waiting Queue</div>'+
        '</div>'+
        '<div>'+
          '<div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Source</div>'+
          '<div style="font-size:13px;font-weight:bold;background:'+sourceBg+';color:'+sourceColor+';padding:2px 8px;border-radius:3px;display:inline-block;">'+sourceLabel+'</div>'+
        '</div>'+
      '</div>'+

      '<div style="padding:18px 20px;background:#fff;">'+

      '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">'+
        '<tr><td colspan="2" style="padding:0 0 8px 0;">'+
          '<div style="font-size:10px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;">Ticket Information</div>'+
        '</td></tr>'+
        '<tr><td style="padding:5px 0;color:#9E9E9E;width:140px;">Submitted By</td><td style="padding:5px 0;color:#2A2A2A;font-weight:bold;">'+esc_(addedBy)+'</td></tr>'+
        '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;">Date Opened</td><td style="padding:5px 0;color:#2A2A2A;">'+esc_(dateOpened)+'</td></tr>'+
        '<tr><td style="padding:5px 0;color:#9E9E9E;">Downtime Type</td><td style="padding:5px 0;color:#2A2A2A;">'+esc_(downtimeType)+'</td></tr>'+
      '</table>'+

      '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">'+
        '<tr><td colspan="2" style="padding:0 0 8px 0;">'+
          '<div style="font-size:10px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;">Equipment</div>'+
        '</td></tr>'+
        '<tr><td style="padding:5px 0;color:#9E9E9E;width:140px;">Equipment Type</td><td style="padding:5px 0;color:#2A2A2A;">'+esc_(equipType)+'</td></tr>'+
        '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;">Equipment</td><td style="padding:5px 0;color:#2A2A2A;font-weight:bold;">'+esc_(equip)+'</td></tr>'+
        '<tr><td style="padding:5px 0;color:#9E9E9E;">Equipment Code</td><td style="padding:5px 0;font-family:monospace;font-weight:bold;color:#2A2A2A;">'+esc_(equipCode||'—')+'</td></tr>'+
        (lineNo ? '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;">Line #</td><td style="padding:5px 0;color:#2A2A2A;">'+esc_(lineNo)+'</td></tr>' : '')+
      '</table>'+

      '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">'+
        '<tr><td colspan="2" style="padding:0 0 8px 0;">'+
          '<div style="font-size:10px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;">Problem</div>'+
        '</td></tr>'+
        '<tr><td style="padding:5px 0;color:#9E9E9E;width:140px;vertical-align:top;">Description</td><td style="padding:5px 0;color:#2A2A2A;">'+esc_(description)+'</td></tr>'+
      '</table>'+

      '<div style="background:#E8EAF6;border:1px solid #C5CAE9;border-radius:5px;padding:12px 14px;">'+
        '<div style="font-size:11px;font-weight:bold;color:#1A237E;margin-bottom:6px;">Action Required</div>'+
        '<div style="font-size:11px;color:#3C4A6E;line-height:1.7;">This ticket is sitting in the <strong>Waiting Queue</strong> and requires your approval before work can begin. Please set a priority, assign a technician, and approve it for open work.</div>'+
        '<div style="margin-top:8px;border-top:1px solid #C5CAE9;padding-top:8px;font-size:11px;color:#3C4A6E;line-height:1.7;">'+
          'This ticket can be actioned in two ways:<br>'+
          '&nbsp;&nbsp;&bull; <strong>Manager Review Board</strong> — full ticket review and approval workflow<br>'+
          '&nbsp;&nbsp;&bull; <strong>Update Ticket form &rarr; Manager Actions sidebar</strong> — set priority, assign a technician, and approve directly from the update form'+
        '</div>'+
      '</div>'+

      '</div>'+

      '<div style="background:#F5F5F5;border-top:1px solid #E0E0E0;padding:10px 20px;text-align:center;">'+
        '<div style="font-size:10px;color:#9E9E9E;">Container Supply Co. — Maintenance Tracker v3.1 &nbsp;&middot;&nbsp; Garden Grove, CA</div>'+
        '<div style="font-size:10px;color:#B0B0B0;margin-top:3px;">This is an automated notification. Do not reply to this email.</div>'+
      '</div>'+

      '</div>';

    MailApp.sendEmail({ to: recipients, name: 'CSC Maintenance Tracker', subject: subject, htmlBody: htmlBody });
    Logger.log('New ticket notification sent for ' + ticketNo + ' to ' + recipients);

  } catch(e) {
    Logger.log('sendNewTicketManagerNotification error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ADD PART TO CLOSED TICKET
//  Called from Manager Review Board — Closed Edits tab
// ═══════════════════════════════════════════════════════════════════════════
function addPartToClosedTicket(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SH.PARTS_NEEDED);
    if (!sh) throw new Error('Parts Needed tab not found');

    sh.appendRow([
      data.partId    || '',
      data.partDesc  || '',
      data.ticketNo  || '',
      data.equipCode || '',
      data.specificEquip || '',
      data.dept      || '',
      formatDateStr_(new Date()),
      'Requested',
      '', '', '',
      (data.qty ? data.qty + ' ' + (data.uom || '') : '') + (data.notes ? ' | ' + data.notes : '')
    ]);

    logTicketHistory(
      data.ticketNo, TH_EVENTS.PARTS_REQUESTED, 'CLOSED', 'CLOSED',
      data.addedBy || '',
      'Part added to closed ticket: ' + (data.partDesc || data.partId || '')
    );

    return { success: true };
  } catch(e) {
    Logger.log('addPartToClosedTicket error: ' + e.message);
    return { success: false, error: e.message };
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════
function setupTriggers_(){ScriptApp.getProjectTriggers().forEach(function(t){ScriptApp.deleteTrigger(t);});ScriptApp.newTrigger('checkTempFixDueDates').timeBased().atHour(6).everyDays(1).create();ScriptApp.newTrigger('runHourlySync').timeBased().everyMinutes(5).create();}
function buildDashboard(){var ss=SpreadsheetApp.getActiveSpreadsheet();buildDashboardSheet_(ss);refreshDashboardData_(ss);SpreadsheetApp.getActiveSpreadsheet().toast('Dashboard refreshed!','📊',3);}
function runHourlySync(){syncExternalTickets();syncEquipHoldLog_();}
function syncEquipHoldLog_(){}
function sendPartsNeededEmail_(ticketNo,data){try{var cfg=getConfig(),managerEmail=cfg['Manager Email(s)']||'';if(!managerEmail)return;var equipInfo=(data.equipCode||'')+' — '+(data.specificEquip||'');MailApp.sendEmail({to:managerEmail,subject:'Parts Needed | '+ticketNo+' | '+equipInfo,htmlBody:'<p>Parts needed for ticket '+ticketNo+'</p>'});}catch(e){Logger.log('Parts email error: '+e.message);}}


function testGetTickets() {
  var result = getTicketsForForm_(['OPEN','WAITING','COMPLETE','PENDING PARTS','ON HOLD']);
  Logger.log('Count: ' + result.length);
  if (result.length > 0) Logger.log('First ticket: ' + JSON.stringify(result[0]));
}


function testUpdateFormData() {
  var result = getUpdateTicketFormData();
  Logger.log('Keys returned: ' + Object.keys(result).join(', '));
  Logger.log('Ticket count: ' + (result.openTickets || []).length);
  Logger.log('Equip flat count: ' + (result.equipFlatList || []).length);
  Logger.log('Equip hierarchy dept count: ' + Object.keys(result.equipHierarchy || {}).length);
}


// ═══════════════════════════════════════════════════════════════════════════
//  GET CLOSED TICKETS FOR FORM
// ═══════════════════════════════════════════════════════════════════════════
function getClosedTicketsForForm_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SH.CLOSED);
    if (!sh || sh.getLastRow() <= QUEUE_FROZEN) return [];

    var data = sh.getRange(QUEUE_FROZEN + 1, TK_DATA_COL, sh.getLastRow() - QUEUE_FROZEN, TK_COLS).getValues();
    var tickets = [];

    data.forEach(function(r) {
      var ticketNo = String(r[TK.TICKET_NO - 1] || '').trim();
      if (!ticketNo) return;
      tickets.push({
        ticketNo:     ticketNo,
        status:       String(r[TK.STATUS       - 1] || ''),
        dept:         String(r[TK.DEPT         - 1] || ''),
        equipType:    String(r[TK.EQUIP_TYPE   - 1] || ''),
        equipCode:    String(r[TK.EQUIP_CODE   - 1] || ''),
        specificEquip:String(r[TK.SPECIFIC_EQUIP-1] || ''),
        description:  String(r[TK.DESCRIPTION  - 1] || ''),
        priority:     String(r[TK.PRIORITY     - 1] || ''),
        assignedTo:   String(r[TK.ASSIGNED_TO  - 1] || ''),
        actualHours:  String(r[TK.ACTUAL_HOURS - 1] || ''),
        fixType:      String(r[TK.FIX_TYPE     - 1] || ''),
        verifiedBy:   String(r[TK.VERIFIED_BY  - 1] || ''),
        notes:        String(r[TK.NOTES        - 1] || ''),
        dateOpened:   r[TK.DATE_OPENED - 1] instanceof Date
                        ? Utilities.formatDate(r[TK.DATE_OPENED-1], Session.getScriptTimeZone(), 'MM/dd/yyyy')
                        : String(r[TK.DATE_OPENED - 1] || ''),
        addedBy:      String(r[TK.ADDED_BY     - 1] || '')
      });
    });

    return tickets;
  } catch(e) {
    Logger.log('getClosedTicketsForForm_ error: ' + e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  EDIT CLOSED TICKET — Option 1
//  Updates fields in place on Closed sheet + appends to Master Log
//  Status stays CLOSED throughout — no sheet movements
// ═══════════════════════════════════════════════════════════════════════════
function editClosedTicket(data) {
  try {
    var ss  = SpreadsheetApp.getActiveSpreadsheet();
    var now = new Date();

    // ── 1. Append audit row to Master Log ──
    var mlSh = ss.getSheetByName(SH.MASTER_LOG);
    if (!mlSh) throw new Error('Master Log not found');

    var orig = getOriginalTicketData_(mlSh, data.ticketNo);

    var mlRow = new Array(ML_COLS).fill('');
    mlRow[ML.ROW_ID       - 1] = generateRowId();
    mlRow[ML.TICKET_NO    - 1] = data.ticketNo;
    mlRow[ML.TIMESTAMP    - 1] = formatTimestamp_(now);
    mlRow[ML.ACTION       - 1] = 'CLOSED TICKET EDIT';
    mlRow[ML.STATUS       - 1] = 'CLOSED';
    mlRow[ML.DEPT         - 1] = orig.dept         || '';
    mlRow[ML.EQUIP_TYPE   - 1] = orig.equipType    || '';
    mlRow[ML.EQUIP_CODE   - 1] = orig.equipCode    || '';
    mlRow[ML.SPECIFIC_EQUIP-1] = orig.specificEquip|| '';
    mlRow[ML.DOWNTIME_TYPE- 1] = orig.downtimeType || '';
    mlRow[ML.DESCRIPTION  - 1] = orig.description  || '';
    mlRow[ML.PRIORITY     - 1] = orig.priority     || '';
    mlRow[ML.DATE_OPENED  - 1] = orig.dateOpened   || '';
    mlRow[ML.ADDED_BY     - 1] = orig.addedBy      || '';
    mlRow[ML.CORRECTIVE_ACT-1] = data.correctiveAction || '';
    mlRow[ML.ROOT_CAUSE   - 1] = data.rootCause        || '';
    mlRow[ML.WORK_SUMMARY - 1] = data.workSummary      || '';
    mlRow[ML.ACTUAL_HOURS - 1] = data.actualHours      || '';
    mlRow[ML.FIX_TYPE     - 1] = data.fixType          || '';
    mlRow[ML.NOTES        - 1] = data.notes            || '';
    mlRow[ML.UPDATED_BY   - 1] = data.updatedBy        || '';
    mlRow[ML.TRACKER_GROUP- 1] = getDeptGroup_(orig.dept || '');

    mlSh.appendRow(mlRow);

    // ── 2. Update row in Closed sheet in place ──
    var closedSh = ss.getSheetByName(SH.CLOSED);
    if (closedSh && closedSh.getLastRow() > QUEUE_FROZEN) {
      var startRow = QUEUE_FROZEN + 1;
      var tickets  = closedSh.getRange(startRow, TK_DATA_COL, closedSh.getLastRow() - QUEUE_FROZEN, 1).getValues();

      for (var i = 0; i < tickets.length; i++) {
        if (String(tickets[i][0]).trim() === data.ticketNo) {
          var rowNum = i + startRow;
          if (data.actualHours)      closedSh.getRange(rowNum, TK.ACTUAL_HOURS  + 1).setValue(data.actualHours);
          if (data.fixType)          closedSh.getRange(rowNum, TK.FIX_TYPE      + 1).setValue(data.fixType);
          if (data.notes)            closedSh.getRange(rowNum, TK.NOTES         + 1).setValue(data.notes);
          if (data.updatedBy)        closedSh.getRange(rowNum, TK.UPDATED_BY    + 1).setValue(data.updatedBy);
          closedSh.getRange(rowNum, TK.LAST_UPDATED + 1).setValue(formatTimestamp_(now));
          break;
        }
      }
    }

    // ── 3. Log history ──
    logTicketHistory(
      data.ticketNo, TH_EVENTS.UPDATED, 'CLOSED', 'CLOSED',
      data.updatedBy,
      'Closed ticket edited by manager' +
      (data.correctiveAction ? ' | Corrective action updated'  : '') +
      (data.rootCause        ? ' | Root cause updated'         : '') +
      (data.workSummary      ? ' | Work summary updated'       : '') +
      (data.notes            ? ' | Notes updated'              : '')
    );

    return { success: true, ticketNo: data.ticketNo };

  } catch(e) {
    Logger.log('editClosedTicket error: ' + e.message);
    return { success: false, error: e.message };
  }
}
