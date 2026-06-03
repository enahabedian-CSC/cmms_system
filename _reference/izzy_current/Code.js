// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  CSC MAINTENANCE TRACKER v3.2 — Code.gs                                
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
  DEPT_MAP:'📋 Dept Map',
  TECH_DIR: '👷 Tech Directory'
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
  UPDATED_BY:31,NOTES:32,PROBLEM_TYPE:33,TRACKER_GROUP:34,LINE_NO:35,VERIFICATION_CHECKLIST:36
};
var ML_COLS=36;
var ML_HEADERS=['Row ID','Ticket #','Timestamp','Action','Status','Department','Building / Zone','Equipment Type','Equipment Code','Equipment Description','Downtime Type','Priority','Description','Assigned To','Est Hours','Actual Hours','Date Opened','Date Completed','Date Closed','Corrective Action','Root Cause','Work Summary','Fix Type','Temp Fix Flag','Parts Needed Flag','Parts Status','Equip Tag Status','Verified By','Verified Date','Added By','Updated By','Notes','Problem Type','Tracker Group','Line #','Verification Checklist'];

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
var TF={TEMP_ID:1,TICKET_NO:2,EQUIP_CODE:3,SPECIFIC_EQUIP:4,DEPT:5,BUILDING_ZONE:6,DATE_FLAGGED:7,DESCRIPTION:8,TEMP_FIX_DESC:9,FREQ_DAYS:10,LAST_INSPECTED:11,NEXT_DUE:12,STATUS:13,FLAGGED_BY:14,CLEARED_BY:15,CLEARED_DATE:16,NOTES:17,ROW_TYPE:18};
var TF_COLS=18;
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
    .addItem('👷 Tech Work Board','showTechWorkBoard')
    .addSeparator()
    .addItem('🏷️ Print Equipment Hold Tag','showEquipHoldTag')
    .addItem('🔧 Temp Fix Inspection','showTempFixInspection')
    .addSeparator()
    .addItem('🔵 Manager Review Board','openManagerReviewBoard')
    .addItem('📋 Maintenance Repair Record', 'openMaintenanceRepairRecord')
    .addSeparator()
    .addItem('🗃️ Archive Closed Tickets', 'openArchiveClosedTickets')
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

function showMonthRollover(){SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('MonthRollover').setWidth(860).setHeight(900),'🔄 Close Month & Start New');}

// ═══════════════════════════════════════════════════════════════════════════
//  CONFIG HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function getConfig(){var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(SH.CONFIG);if(!sh)return{};var cfg={};sh.getRange('C2:D30').getValues().forEach(function(r){if(r[0])cfg[String(r[0]).trim()]=r[1];});return cfg;}
function getConfigValue(key){return getConfig()[key]||'';}
function setConfigValue(key, value) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SH.CONFIG);
  if (!sh) {
    Logger.log('setConfigValue: Configuration tab not found');
    return false;
  }

  var lastRow = sh.getLastRow();
  if (lastRow < 2) lastRow = 2;

  // Read existing keys from column C (key column)
  var keys = sh.getRange(2, 3, lastRow - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i][0]).trim() === String(key).trim()) {
      // Found existing key — update value in column D
      sh.getRange(i + 2, 4).setValue(value);
      return true;
    }
  }

  // Key not found — append new row at bottom
  // Column B is left blank (matches existing layout)
  // Column C gets the key, Column D gets the value
  var appendRow = lastRow + 1;
  sh.getRange(appendRow, 3).setValue(key);
  sh.getRange(appendRow, 4).setValue(value);
  Logger.log('setConfigValue: appended new key "' + key + '" at row ' + appendRow);
  return true;
}

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
    peopleList:      getPeopleList_(true),
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


function getEquipHoldTagFormData(){var base=getAddTicketFormData();base.openTickets=getTicketsForForm_(['OPEN','PENDING PARTS','ON HOLD']);base.tagTypes=['Red — Out of Service','Yellow — Use with Caution'];base.docNo='FRM-029-002';var userInfo=getCurrentUserInfo();base.isAdmin=userInfo.isAdmin||false;base.problemTypes=getDataList('Problem Types')||[];base.technicians=getDataList('Technicians')||[];base.isManager=userInfo.isManager||userInfo.isAdmin||false;return base;}



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
        correctiveAction: String(best[ML.CORRECTIVE_ACT - 1] || ''),
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

// Returns the LATEST NON-EMPTY value for a given column across all ML rows
// for a ticket. Reads the full sheet once in memory — skips empty values so
// early-row data (e.g. DOWNTIME_TYPE set only on creation) is not wiped out
// by later sparse rows. Used by all backfill flows (Bug #1 fix).
function getMasterLogFieldForTicket_(ticketNo, colIndex) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SH.MASTER_LOG);
  if (!sh || sh.getLastRow() < 2) return '';
  var rows = sh.getRange(2, 1, sh.getLastRow()-1, ML_COLS).getValues();
  var lastMatch = '';
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][ML.TICKET_NO-1]).trim() !== ticketNo) continue;
    var val = rows[i][colIndex-1];
    if (val !== '' && val !== null && val !== undefined) lastMatch = val;
  }
  return lastMatch;
}

function getOriginalTicketData_(mlSh,ticketNo){if(!mlSh||mlSh.getLastRow()<2)return{};var rows=mlSh.getRange(2,1,mlSh.getLastRow()-1,ML_COLS).getValues();for(var i=0;i<rows.length;i++){if(String(rows[i][ML.TICKET_NO-1]).trim()===ticketNo){return{dept:String(rows[i][ML.DEPT-1]||''),buildingZone:String(rows[i][ML.BUILDING_ZONE-1]||''),equipType:String(rows[i][ML.EQUIP_TYPE-1]||''),equipCode:String(rows[i][ML.EQUIP_CODE-1]||''),specificEquip:String(rows[i][ML.SPECIFIC_EQUIP-1]||''),equipDesc:String(rows[i][ML.SPECIFIC_EQUIP-1]||''),downtimeType:String(rows[i][ML.DOWNTIME_TYPE-1]||''),description:String(rows[i][ML.DESCRIPTION-1]||''),problemDesc:String(rows[i][ML.DESCRIPTION-1]||''),priority:String(rows[i][ML.PRIORITY-1]||''),dateOpened:rows[i][ML.DATE_OPENED-1]||'',addedBy:String(rows[i][ML.ADDED_BY-1]||''),problemType:String(rows[i][ML.PROBLEM_TYPE-1]||''),estHours:rows[i][ML.EST_HOURS-1]||'',partsNeeded:String(rows[i][ML.PARTS_NEEDED-1]||'N')};}}return{};}

function updateTicketInTrackerSheet_(ss,ticketNo,data,newStatus,now){
  var deptTrackerName=getTrackerForDept(data.dept,data.problemType,data.equipType);
  var sheetsToUpdate=[SH.OPEN,SH.WAITING,deptTrackerName].filter(Boolean);
  sheetsToUpdate.forEach(function(shName){var sh=ss.getSheetByName(shName);if(!sh||sh.getLastRow()<1)return;var startRow=isTrackerSheet_(shName)?TRACKER_PRIO_START:QUEUE_FROZEN+1;if(sh.getLastRow()<startRow)return;var tickets=sh.getRange(startRow,TK_DATA_COL,sh.getLastRow()-startRow+1,1).getValues();for(var i=0;i<tickets.length;i++){if(String(tickets[i][0])===ticketNo){var rowNum=i+startRow;sh.getRange(rowNum,TK.STATUS+1).setValue(newStatus);sh.getRange(rowNum,TK.LAST_UPDATED+1).setValue(formatTimestamp_(now));if(data.priority)sh.getRange(rowNum,TK.PRIORITY+1).setValue(data.priority);if(data.assignedTo)sh.getRange(rowNum,TK.ASSIGNED_TO+1).setValue(data.assignedTo);if(data.actualHours)sh.getRange(rowNum,TK.ACTUAL_HOURS+1).setValue(data.actualHours);if(data.fixType)sh.getRange(rowNum,TK.FIX_TYPE+1).setValue(data.fixType);if(data.tempFixFlag)sh.getRange(rowNum,TK.TEMP_FIX_FLAG+1).setValue('Y');if(data.partsStatus)sh.getRange(rowNum,TK.PARTS_STATUS+1).setValue(data.partsStatus);if(data.verifiedBy)sh.getRange(rowNum,TK.VERIFIED_BY+1).setValue(data.verifiedBy);if(data.verifiedDate||data.verifiedBy)sh.getRange(rowNum,TK.VERIFIED_DATE+1).setValue(formatDateStr_(now));if(data.updatedBy)sh.getRange(rowNum,TK.UPDATED_BY+1).setValue(data.updatedBy);if(data.notes)sh.getRange(rowNum,TK.NOTES+1).setValue(data.notes);if (String(newStatus).toUpperCase() === 'CLOSED') {
          applyClosedRowStyle_(sh, rowNum);
        } else {
          applyPriorityRowColor_(sh,rowNum,data.priority||sh.getRange(rowNum,TK.PRIORITY+1).getValue());
        }
        break;}}});
}

function removeTicketFromSheet_(ss,sheetName,ticketNo){var sh=ss.getSheetByName(sheetName);if(!sh||sh.getLastRow()<1)return;var startRow=isTrackerSheet_(sheetName)?TRACKER_PRIO_START:QUEUE_FROZEN+1;if(sh.getLastRow()<startRow)return;var tickets=sh.getRange(startRow,TK_DATA_COL,sh.getLastRow()-startRow+1,1).getValues();for(var i=tickets.length-1;i>=0;i--){if(String(tickets[i][0]).trim()===String(ticketNo).trim()){sh.deleteRow(i+startRow);break;}}}

function moveTicketToClosed_(ss, ticketNo, data, now) {
  var closedSh = ss.getSheetByName(SH.CLOSED);
  if (!closedSh) return;

    // EMRL — completed records only, do not write VOID tickets
  if (String(data.status || '').toUpperCase() === 'VOID') return;

  var tkRow = new Array(TK_COLS).fill('');
  tkRow[TK.TICKET_NO    - 1] = ticketNo;
  tkRow[TK.STATUS       - 1] = 'CLOSED';
  tkRow[TK.PRIORITY     - 1] = data.priority      || '';
  tkRow[TK.DEPT         - 1] = data.dept          || '';
  tkRow[TK.BUILDING_ZONE- 1] = data.buildingZone  || '';
  tkRow[TK.EQUIP_TYPE   - 1] = data.equipType     || '';
  tkRow[TK.EQUIP_CODE   - 1] = data.equipCode     || '';
  tkRow[TK.SPECIFIC_EQUIP-1] = data.specificEquip || '';
  tkRow[TK.DOWNTIME_TYPE- 1] = data.downtimeType  || '';
  tkRow[TK.PROBLEM_TYPE - 1] = data.problemType   || '';
  tkRow[TK.DESCRIPTION  - 1] = data.description   || '';
  tkRow[TK.LINE_NO      - 1] = data.lineNo || data.line || '';
  tkRow[TK.ASSIGNED_TO  - 1] = data.assignedTo    || '';
  tkRow[TK.EST_HOURS    - 1] = data.estHours      || '';
  tkRow[TK.ACTUAL_HOURS - 1] = data.actualHours   || '';
  tkRow[TK.DATE_OPENED  - 1] = data.dateOpened    || '';
  tkRow[TK.LAST_UPDATED - 1] = formatTimestamp_(now);
  tkRow[TK.FIX_TYPE     - 1] = data.fixType       || '';
  tkRow[TK.VERIFIED_BY  - 1] = data.verifiedBy    || '';
  tkRow[TK.VERIFIED_DATE- 1] = data.verifiedDate || (data.verifiedBy ? formatDateStr_(now) : '');
  tkRow[TK.ADDED_BY     - 1] = data.addedBy       || '';
  tkRow[TK.UPDATED_BY   - 1] = data.updatedBy     || '';
  tkRow[TK.NOTES        - 1] = data.notes         || '';
  var nextRow = Math.max(closedSh.getLastRow() + 1, QUEUE_FROZEN + 1);
  closedSh.getRange(nextRow, TK_DATA_COL, 1, TK_COLS).setValues([tkRow]);
  applyDataRowBorders_(closedSh, nextRow);
  populateEMRL_(ticketNo);
  removeTicketFromSheet_(ss, SH.OPEN, ticketNo);
}

function logTempFix_(ss,ticketNo,data,now){var sh=ss.getSheetByName(SH.TEMP_FIX);if(!sh)return;var cfg=getConfig(),freq=parseInt(cfg['Monitoring Frequency']||'7',10);var nextDue=new Date(now.getTime()+freq*24*60*60*1000);sh.appendRow([generateTempFixId(),ticketNo,data.equipCode||'',data.specificEquip||'',data.dept||'',data.buildingZone||'',formatDateStr_(now),data.description||'',data.workSummary||data.correctiveAction||'',freq,'',formatDateStr_(nextDue),'FLAGGED',data.updatedBy||data.addedBy||'','','',data.notes||'','RECORD']);logTicketHistory(ticketNo,TH_EVENTS.TEMP_FIX,'','',data.updatedBy,'Temp fix flagged — monitoring every '+freq+' days');}
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
      '<div style="font-size:10px;color:#9E9E9E;">Container Supply Co. — Maintenance Tracker v3.2 &nbsp;&middot;&nbsp; Garden Grove, CA</div>'+
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
 if (String(r[TF.ROW_TYPE-1]||'').toUpperCase() === 'INSPECTION') return;
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
   if (String(r[TF.ROW_TYPE-1]||'').toUpperCase() === 'INSPECTION') return;
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
      recipients = getAdminEmails_().join(', ');
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
        '<div style="font-size:10px;color:#9E9E9E;">CSC Maintenance Tracker v3.2 — Automated Notification. Do not reply.</div>'+
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
    if (String(r[TF.ROW_TYPE-1]||'').toUpperCase() === 'INSPECTION') return;
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
    if (!recipients) recipients = getAdminEmails_().join(', ');
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
        '<div style="font-size:10px;color:#9E9E9E;">CSC Maintenance Tracker v3.2 — Automated Notification. Do not reply.</div>'+
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
    var recipients = getAdminEmails_().join(', ');
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
      if (String(r[TF.ROW_TYPE-1]||'').toUpperCase() === 'INSPECTION') return;
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
    var parentRow = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][TF.TEMP_ID-1]).trim() === tempId &&
          String(rows[i][TF.ROW_TYPE-1]||'').toUpperCase() !== 'INSPECTION') {
        rowNum = i + 2;
        parentRow = rows[i];
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
      sh.getRange(rowNum, TF.LAST_INSPECTED).setValue(data.inspectionDate);
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
      sh.getRange(rowNum, TF.STATUS).setValue('MONITORING');
      sh.getRange(rowNum, 1, 1, TF_COLS).setBackground('#E3F2FD');
      sh.getRange(rowNum, TF.STATUS).setFontColor('#1565C0').setFontWeight('bold');

      logTicketHistory(
        data.ticketNo, 'TEMP FIX INSPECTED', 'PAST DUE', 'ACTIVE',
        data.inspectedBy,
        'Inspection completed — continuing monitoring | Next due: ' +
        formatDateStr_(nextDue) + ' | ' + inspectionNote
      );
    }

// SQF #3 — insert INSPECTION history row directly below parent (or after last inspection for this tempId)
    var insertAfter = rowNum;
    var shLastRow = sh.getLastRow();
    if (shLastRow > rowNum) {
      var belowVals = sh.getRange(rowNum+1, 1, shLastRow-rowNum, TF_COLS).getValues();
      for (var bi = 0; bi < belowVals.length; bi++) {
        if (String(belowVals[bi][TF.TEMP_ID-1]||'').trim() === tempId &&
            String(belowVals[bi][TF.ROW_TYPE-1]||'').toUpperCase() === 'INSPECTION') {
          insertAfter = rowNum + 1 + bi;
        } else { break; }
      }
    }
    sh.insertRowAfter(insertAfter);
    var freqDaysInsp = parseInt(data.freqDays) || 7;
    var nextDueInsp  = outcome === 'CLEAR' ? '' : formatDateStr_(new Date(now.getTime() + freqDaysInsp * 24 * 60 * 60 * 1000));
    var inspRow = new Array(TF_COLS).fill('');
    inspRow[TF.TEMP_ID        - 1] = tempId;
    inspRow[TF.TICKET_NO      - 1] = data.ticketNo;
    inspRow[TF.EQUIP_CODE     - 1] = String(parentRow[TF.EQUIP_CODE     - 1] || '');
    inspRow[TF.SPECIFIC_EQUIP - 1] = String(parentRow[TF.SPECIFIC_EQUIP - 1] || '');
    inspRow[TF.DEPT           - 1] = String(parentRow[TF.DEPT           - 1] || '');
    inspRow[TF.BUILDING_ZONE  - 1] = String(parentRow[TF.BUILDING_ZONE  - 1] || '');
    inspRow[TF.DATE_FLAGGED   - 1] = data.inspectionDate;
    inspRow[TF.DESCRIPTION    - 1] = String(parentRow[TF.DESCRIPTION    - 1] || '');
    inspRow[TF.TEMP_FIX_DESC  - 1] = String(parentRow[TF.TEMP_FIX_DESC  - 1] || '');
    inspRow[TF.FREQ_DAYS      - 1] = freqDaysInsp;
    inspRow[TF.LAST_INSPECTED - 1] = data.inspectionDate;
    inspRow[TF.NEXT_DUE       - 1] = nextDueInsp;
    inspRow[TF.STATUS         - 1] = outcome === 'CLEAR' ? 'CLEARED' : 'CONTINUE';
    inspRow[TF.FLAGGED_BY     - 1] = data.inspectedBy;
    inspRow[TF.NOTES          - 1] = inspectionNote;
    inspRow[TF.ROW_TYPE       - 1] = 'INSPECTION';
    sh.getRange(insertAfter+1, 1, 1, TF_COLS).setValues([inspRow]);
    sh.getRange(insertAfter+1, 1, 1, TF_COLS)
      .setBackground('#F8F9FF').setFontColor('#546E7A').setFontStyle('italic');

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
    if (!recipients) recipients = getAdminEmails_().join(', ');
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
        '<div style="font-size:10px;color:#9E9E9E;">Container Supply Co. — Maintenance Tracker v3.2 &nbsp;&middot;&nbsp; Garden Grove, CA</div>'+
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





// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                                                                          ║
// ║  ▼▼▼ MERGED FROM CodeCoreUpdates.gs — Phase 1 Cleanup ▼▼▼              ║
// ║                                                                          ║
// ║  Everything below this banner was previously in CodeCoreUpdates.gs.     ║
// ║  Moved here so there's a single source of truth and no load-order        ║
// ║  fragility. After verifying these work, CodeCoreUpdates.gs gets         ║
// ║  deleted entirely in Step 4c.                                            ║
// ║                                                                          ║
// ║  Contents (in order):                                                    ║
// ║    • DEPT_CODES        — accounting dept codes for ticket numbering     ║
// ║    • DEPT_CODE_TO_NAME — reverse lookup (code → dept name)              ║
// ║    • getTrackerForDept — routing logic (dept + rules → tracker sheet)   ║
// ║    • getTrackerDisplayName — tracker sheet name → display name          ║
// ║    • generateTicketNumber — MT-{deptcode}-{YYMMDD}-{seq}                ║
// ║    • getAddTicketFormData — form data with routingRules support         ║
// ║    • addNewTicket — create a new ticket from Add Ticket form            ║
// ║    • writeTicketToTrackerSheet_ — write a ticket row to a sheet         ║
// ║    • updateTicket — apply updates from Update Ticket form               ║
// ║    • logPartsUsed_ — log parts used to Parts Needed sheet               ║
// ║    • uploadPhotoToDrive — upload photo attachments                      ║
// ║    • onEdit — handler for direct edits on tracker sheets                ║
// ║    • applyClosedRowStyle_ — grey out a closed ticket row                ║
// ║    • greyOutClosedTickets_ — batch grey-out all closed tickets         ║
// ║    • buildTkDataFromRow_ — helper to read a tracker row into an object  ║
// ║    • voidTicket — mark a ticket as VOID with a reason                   ║
// ║                                                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝


// ═══════════════════════════════════════════════════════════════════════════
//  DEPT_CODES — accounting department codes
//  ───────────────────────────────────────────────────────────────────────
//  These codes are used in the ticket number format MT-{deptcode}-{YYMMDD}-{seq}
//  and to match against the equipment inventory's "Dept Code" column.
//
//  IMPORTANT: These are SOURCE dept codes (where the ticket originates).
//  Routing to tracker sheets (Electrical/Facilities/etc.) is handled
//  separately by getTrackerForDept() using DEPT_TRACKERS + Dept Map.
// ═══════════════════════════════════════════════════════════════════════════
var DEPT_CODES = {
  'METAL':       '001', 'PLASTIC':     '003', 'LITHO':       '004',
  'PLASTIC DEC': '006', 'QA':          '007', 'M/S':         '008',
  'S/R':         '009', 'SALES':       '030', 'G&A':         '031'
};

// Reverse lookup — given a code like '003', returns the dept name 'PLASTIC'
// Used when parsing ticket numbers to figure out the originating dept
var DEPT_CODE_TO_NAME = {
  '001':'METAL','003':'PLASTIC','004':'LITHO','006':'PLASTIC DEC',
  '007':'QA','008':'M/S','009':'S/R','030':'SALES','031':'G&A'
};


// ═══════════════════════════════════════════════════════════════════════════
//  getTrackerForDept — routing logic
//  ───────────────────────────────────────────────────────────────────────
//  Given a ticket's dept + problem type + equipment type, returns the
//  sheet name of the tracker the ticket should land in.
//
//  Logic order:
//    1. Map source dept (e.g. 'METAL') to system dept (e.g. 'METALS') via Dept Map
//    2. Check Routing Override Rules from Configuration. If a keyword matches
//       in the chosen field (PROBLEM_TYPE or EQUIP_DESC), route to that tracker.
//       Default rules: 'ELECTRICAL' in problem type → Electrical tracker,
//                      'FACILITY' in equip desc → Facilities tracker
//    3. If no override matched, route based on the mapped system dept
//    4. Fallback to Machine Shop tracker if nothing else matches
// ═══════════════════════════════════════════════════════════════════════════
function getTrackerForDept(dept, problemType, equipType) {
  var mapping = getDeptMapping_();
  var d  = String(dept||'').toUpperCase().trim();
  var dg = mapping[d] || d;
  var pt = String(problemType||'').toUpperCase().trim();
  var et = String(equipType||'').toUpperCase().trim();

  // Pull routing override rules from Configuration tab (JSON-encoded string).
  // If parsing fails or no rules are configured, fall back to the defaults.
  var cfg   = getConfig();
  var rules = [];
  try { rules = JSON.parse(cfg['Routing Override Rules'] || '[]'); } catch(e) { rules = []; }
  if (!rules.length) {
    rules = [
      { keyword:'ELECTRICAL', matchOn:'PROBLEM_TYPE', routeTo:'ELECTRICAL' },
      { keyword:'FACILITY',   matchOn:'EQUIP_DESC',   routeTo:'FACILITIES' }
    ];
  }

  // Check each rule in order — first match wins
  for (var r=0; r<rules.length; r++) {
    var rule    = rules[r];
    var kw      = String(rule.keyword||'').toUpperCase().trim();
    if (!kw) continue;
    // matchOn === 'EQUIP_DESC' checks equipment type, otherwise checks problem type
    var haystack = String(rule.matchOn||'').toUpperCase() === 'EQUIP_DESC' ? et : pt;
    if (haystack.indexOf(kw) > -1) {
      var dest = String(rule.routeTo||'').toUpperCase();
      if (dest === 'ELECTRICAL')   return SH.TRACKER_EL;
      if (dest === 'FACILITIES')   return SH.TRACKER_FAC;
      if (dest === 'MACHINE SHOP') return SH.TRACKER_MS;
      if (dest === 'METALS')       return SH.TRACKER_MTL;
      if (dest === 'PLASTICS')     return SH.TRACKER_PL;
      if (dest === 'LITHO')        return SH.TRACKER_LTH;
    }
  }

  // No override matched — route based on the mapped system dept
  if (dg === 'METALS')       return SH.TRACKER_MTL;
  if (dg === 'PLASTICS')     return SH.TRACKER_PL;
  if (dg === 'LITHO')        return SH.TRACKER_LTH;
  if (dg === 'ELECTRICAL')   return SH.TRACKER_EL;
  if (dg === 'FACILITIES')   return SH.TRACKER_FAC;
  if (dg === 'MACHINE SHOP') return SH.TRACKER_MS;

  // Unknown dept — default to Machine Shop
  return SH.TRACKER_MS;
}


// ═══════════════════════════════════════════════════════════════════════════
//  getTrackerDisplayName — sheet name to readable name
//  ───────────────────────────────────────────────────────────────────────
//  Given a tracker sheet name like '📋 Tracker — Electrical',
//  returns the human-readable dept name like 'ELECTRICAL'.
//  Used for emails, logs, and UI messages.
// ═══════════════════════════════════════════════════════════════════════════
function getTrackerDisplayName(trackerSheetName) {
  var map = {};
  DEPT_TRACKERS.forEach(function(dt) { map[dt.name] = dt.dept; });
  return map[trackerSheetName] || trackerSheetName;
}


// ═══════════════════════════════════════════════════════════════════════════
//  generateTicketNumber — build a new ticket #
//  ───────────────────────────────────────────────────────────────────────
//  Format: MT-{deptcode}-{YYMMDD}-{seq}
//  Example: MT-001-261125-003  (METAL dept, Nov 25 2026, 3rd ticket that month)
//
//  Logic:
//    1. Look up the dept code from DEPT_CODES (METAL → '001')
//    2. If dept isn't a known code, reverse-lookup via Dept Map
//       (e.g. PLASTICS [system dept] → maps back to PLASTIC source → '003')
//    3. Find the highest existing seq # for this dept+month in Master Log
//    4. Return prefix + (max+1) zero-padded to 3 digits
// ═══════════════════════════════════════════════════════════════════════════
function generateTicketNumber(dept) {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName(SH.MASTER_LOG);
  var tz  = Session.getScriptTimeZone();
  var now = new Date();

  var deptUp   = String(dept||'').toUpperCase().trim();
  var deptCode = '000';

  // Step 1: direct lookup
  Object.keys(DEPT_CODES).forEach(function(key) {
    if (key.toUpperCase() === deptUp) deptCode = DEPT_CODES[key];
  });

  // Step 2: reverse-lookup through Dept Map if no direct match
  if (deptCode === '000') {
    var mapping = getDeptMapping_();
    Object.keys(mapping).forEach(function(src) {
      if (mapping[src] === deptUp) {
        Object.keys(DEPT_CODES).forEach(function(key) {
          if (key.toUpperCase() === src) deptCode = DEPT_CODES[key];
        });
      }
    });
  }

  var yymmdd       = Utilities.formatDate(now, tz, 'yyMMdd');
  var currentYYMM  = Utilities.formatDate(now, tz, 'yyMM');
  var prefix       = 'MT-' + deptCode + '-' + yymmdd + '-';
  var monthPattern = 'MT-' + deptCode + '-' + currentYYMM;
  var max = 0;

  // Scan Master Log for the highest seq # in this dept+month
  if (sh && sh.getLastRow() >= 2) {
    sh.getRange(2, ML.TICKET_NO, sh.getLastRow()-1, 1).getValues().forEach(function(r) {
      var t     = String(r[0]).trim();
      if (t.indexOf(monthPattern) === 0) {
        var parts = t.split('-');
        var seq   = parseInt(parts[parts.length-1], 10);
        if (!isNaN(seq) && seq > max) max = seq;
      }
    });
  }
  return prefix + String(max+1).padStart(3,'0');
}


// ═══════════════════════════════════════════════════════════════════════════
//  getAddTicketFormData — data for the Add Ticket form
//  ───────────────────────────────────────────────────────────────────────
//  Builds the bundle of data the Add Ticket HTML form needs to populate
//  dropdowns, render the routing banner, and validate input.
//
//  This is the WINNER version — includes routingRules so the form's
//  "This ticket will route to..." banner mirrors server-side routing logic.
// ═══════════════════════════════════════════════════════════════════════════
function getAddTicketFormData() {
  var cfg         = getConfig();
  var lists       = getAllDataLists();
  var deptMapping = getDeptMapping_();
  var departments = Object.keys(deptMapping).sort();

  // Transfer reasons — used by Manager Actions when transferring depts
  var transferReasons = getDataList('Transfer Reasons');
  if (!transferReasons || !transferReasons.length) transferReasons = ['Beyond Scope'];

  // peopleList = techs + managers combined (true = show "(Tech)" / "(Manager)" suffix)
  // Used for "Added By" dropdown so a manager can submit a ticket too
  var peopleList = getPeopleList_(true);

  // Routing rules — pulled from Configuration so the client and server stay in sync
  var routingRules = [];
  try { routingRules = JSON.parse(cfg['Routing Override Rules'] || '[]'); } catch(e) {}
  if (!routingRules.length) {
    routingRules = [
      { keyword:'ELECTRICAL', matchOn:'PROBLEM_TYPE', routeTo:'ELECTRICAL' },
      { keyword:'FACILITY',   matchOn:'EQUIP_DESC',   routeTo:'FACILITIES' }
    ];
  }

  return {
    companyName:     cfg['Company Name']          || 'Container Supply Co.',
    location:        cfg['Location']              || 'Garden Grove, CA',
    docNo:           cfg['Doc No (Ticket Form)']  || 'FRM-040-001',
    revision:        cfg['Revision']              || '0',
    departments:     departments,
    deptCodes:       DEPT_CODES,
    deptMapping:     deptMapping,
    buildingZones:   lists['Building / Zone']     || [],
    equipmentTypes:  lists['Equipment Types']     || [],
    priorities:      lists['Priorities']          || ['LOW','MEDIUM','HIGH','CRITICAL'],
    downtimeTypes:   lists['Downtime Types']      || ['PLANNED','UNPLANNED'],
    technicians:     lists['Technicians']         || [],
    peopleList:      peopleList,
    problemTypes:    lists['Problem Types']       || [],
    shifts:          lists['Shifts']              || ['1ST','2ND','3RD'],
    partsStatuses:   lists['Parts Status']        || [],
    transferReasons: transferReasons,
    equipHierarchy:  getEquipmentHierarchy(),
    equipFlatList:   getEquipmentFlatList(),
    routingRules:    routingRules
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  addNewTicket — handler for new ticket submission
//  ───────────────────────────────────────────────────────────────────────
//  Called from AddTicket.html when a tech (or manager) submits a new ticket.
//
//  Steps:
//    1. Generate ticket # and resolve routing tracker
//    2. CRITICAL bypass — Critical tickets skip Waiting Queue, go straight to Open
//    3. Append a row to Master Log (the audit source of truth)
//    4. Write the ticket to the queue sheet (Waiting or Open) + dept tracker
//    5. Log the creation event in Ticket History
//    6. If parts needed, log them + email manager
//    7. If equipment was tagged, log the tag
//    8. For non-critical tickets, send "New Ticket" email to dept manager
// ═══════════════════════════════════════════════════════════════════════════
function addNewTicket(data) {
  try {
    var ss=SpreadsheetApp.getActiveSpreadsheet(), now=new Date();
    var ticketNo=generateTicketNumber(data.dept), rowId=generateRowId();
    var trackerSheet=getTrackerForDept(data.dept,data.problemType,data.equipType);

    // CRITICAL tickets bypass Waiting Queue
    var isCritical=String(data.priority).toUpperCase()==='CRITICAL';
    var initialStatus=isCritical?'OPEN':'WAITING';

    var mlSh=ss.getSheetByName(SH.MASTER_LOG);
    if(!mlSh) throw new Error('Master Log not found');

    // Build the Master Log audit row
    var mlRow=new Array(ML_COLS).fill('');
    mlRow[ML.ROW_ID-1]=rowId; mlRow[ML.TICKET_NO-1]=ticketNo;
    mlRow[ML.TIMESTAMP-1]=formatTimestamp_(now);
    mlRow[ML.ACTION-1]=isCritical?'TICKET CREATED — CRITICAL (bypass)':'TICKET CREATED';
    mlRow[ML.STATUS-1]=initialStatus; mlRow[ML.DEPT-1]=data.dept||'';
    mlRow[ML.BUILDING_ZONE-1]=data.buildingZone||''; mlRow[ML.EQUIP_TYPE-1]=data.equipType||'';
    mlRow[ML.EQUIP_CODE-1]=data.equipCode||''; mlRow[ML.SPECIFIC_EQUIP-1]=data.equipDesc||'';
    mlRow[ML.DOWNTIME_TYPE-1]=data.downtimeType||''; mlRow[ML.PRIORITY-1]=data.priority||'';
    mlRow[ML.DESCRIPTION-1]=data.problemDesc||''; mlRow[ML.EST_HOURS-1]=data.estHours||'';
    mlRow[ML.DATE_OPENED-1]=formatTimestamp_(now);
    mlRow[ML.PARTS_NEEDED-1]=data.partsNeeded?'Y':'N';
    mlRow[ML.EQUIP_TAG_STATUS-1]=data.equipTagStatus||'';
    mlRow[ML.ADDED_BY-1]=data.addedBy||''; mlRow[ML.UPDATED_BY-1]=data.addedBy||'';
    mlRow[ML.NOTES-1]=data.notes||''; mlRow[ML.PROBLEM_TYPE-1]=data.problemType||'';
    mlRow[ML.TRACKER_GROUP-1]=getDeptGroup_(data.dept||'');
    mlRow[ML.LINE_NO-1]=data.lineNo||'';
    mlSh.appendRow(mlRow);

    // Write to queue sheet (Waiting or Open) + dept tracker
    var destSheet=isCritical?SH.OPEN:SH.WAITING;
    writeTicketToTrackerSheet_(ss,destSheet,ticketNo,data,initialStatus,now);
    writeTicketToTrackerSheet_(ss,trackerSheet,ticketNo,data,initialStatus,now);

    // Log creation event
    logTicketHistory(ticketNo,TH_EVENTS.CREATED,'',initialStatus,data.addedBy,
      isCritical?'Critical ticket — bypassed waiting queue → '+getTrackerDisplayName(trackerSheet)
               :'Ticket created → Waiting Queue | Tracker: '+getTrackerDisplayName(trackerSheet));

    // Parts handling
    if(data.partsNeeded&&data.partsTable&&data.partsTable.length>0){
      logPartsNeeded_(ss,ticketNo,data);
      sendPartsNeededEmail_(ticketNo,data);
    }

    // Equipment tag handling — only fires if a non-empty tag status was selected
    if(data.equipTagStatus&&data.equipTagStatus!=='None'&&data.equipTagStatus!==''){
      logEquipHoldTag_(ss,ticketNo,data,now);
    }

    // Email dept manager for non-critical tickets (Critical goes straight to Open,
    // so no need to alert about "pending review")
    if(!isCritical){
      sendNewTicketManagerNotification(ticketNo,{
        dept:         data.dept         || '',
        source:       'INTERNAL',
        specificEquip:data.equipDesc    || '',
        equipCode:    data.equipCode    || '',
        equipType:    data.equipType    || '',
        description:  data.problemDesc  || '',
        addedBy:      data.addedBy      || '',
        lineNo:       data.lineNo       || '',
        downtimeType: data.downtimeType || '',
        dateOpened:   formatDateStr_(now)
      });
    }

    return {success:true,ticketNo:ticketNo,status:initialStatus,isCritical:isCritical,
            tracker:getTrackerDisplayName(trackerSheet)};
  } catch(e){Logger.log('addNewTicket error: '+e.message);return{success:false,error:e.message};}
}


// ═══════════════════════════════════════════════════════════════════════════
//  writeTicketToTrackerSheet_ — write a ticket to a sheet
//  ───────────────────────────────────────────────────────────────────────
//  Generic helper used to write ticket rows to:
//    - Waiting Queue / Open Tickets / Closed Tickets (queue sheets)
//    - Dept tracker sheets (Electrical / Plastics / etc.)
//
//  For dept trackers, ticket goes into the "Priority" section (rows
//  TRACKER_PRIO_START to TRACKER_PRIO_END) if HIGH or CRITICAL, otherwise
//  goes to the "Open" section starting at TRACKER_OPEN_START.
//
//  For queue sheets, ticket goes to the next blank row after QUEUE_FROZEN.
//
//  Also applies row styling (borders, priority color coding).
// ═══════════════════════════════════════════════════════════════════════════
function writeTicketToTrackerSheet_(ss, sheetName, ticketNo, data, status, now) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh) { Logger.log('writeTicketToTrackerSheet_: sheet not found: ' + sheetName); return; }

  // Build the 26-column tracker row
  var tkRow = new Array(TK_COLS).fill('');
  tkRow[TK.TICKET_NO-1]      = ticketNo;
  tkRow[TK.STATUS-1]         = status;
  tkRow[TK.PRIORITY-1]       = data.priority       || '';
  tkRow[TK.DEPT-1]           = data.dept           || '';
  tkRow[TK.BUILDING_ZONE-1]  = data.buildingZone   || '';
  tkRow[TK.EQUIP_TYPE-1]     = data.equipType      || '';
  tkRow[TK.EQUIP_CODE-1]     = data.equipCode      || '';
  tkRow[TK.SPECIFIC_EQUIP-1] = data.equipDesc      || data.specificEquip || '';
  tkRow[TK.DOWNTIME_TYPE-1]  = data.downtimeType   || '';
  tkRow[TK.DESCRIPTION-1]    = data.problemDesc    || data.description || '';
  tkRow[TK.ASSIGNED_TO-1]    = data.assignedTo     || '';
  tkRow[TK.EST_HOURS-1]      = data.estHours       || '';
  tkRow[TK.ACTUAL_HOURS-1]   = data.actualHours    || '';
  tkRow[TK.DATE_OPENED-1]    = formatTimestamp_(now);
  tkRow[TK.LAST_UPDATED-1]   = formatTimestamp_(now);
  tkRow[TK.FIX_TYPE-1]       = data.fixType        || '';
  tkRow[TK.TEMP_FIX_FLAG-1]  = data.tempFixFlag    ? 'Y' : 'N';
  tkRow[TK.PARTS_NEEDED-1]   = data.partsNeeded    ? 'Y' : 'N';
  tkRow[TK.PARTS_STATUS-1]   = data.partsStatus    || '';
  tkRow[TK.VERIFIED_BY-1]    = data.verifiedBy     || '';
  tkRow[TK.VERIFIED_DATE-1]  = data.verifiedDate   || '';
  tkRow[TK.ADDED_BY-1]       = data.addedBy        || '';
  tkRow[TK.UPDATED_BY-1]     = data.updatedBy      || data.addedBy || '';
  tkRow[TK.NOTES-1]          = data.notes          || '';
  tkRow[TK.LINE_NO-1]        = data.lineNo         || data.line || '';
  tkRow[TK.PROBLEM_TYPE-1]   = data.problemType    || '';

  // Figure out which row to write to
  var isDeptTracker = isTrackerSheet_(sheetName);
  var isPriority    = ['CRITICAL','HIGH'].indexOf(String(data.priority||'').toUpperCase()) >= 0;
  var sectionStart, sectionEnd;

  if (isDeptTracker) {
    if (isPriority) {
      // Priority section — rows TRACKER_PRIO_START to TRACKER_PRIO_END
      sectionStart = TRACKER_PRIO_START;
      sectionEnd   = TRACKER_PRIO_END;
    } else {
      // Open section — starts at TRACKER_OPEN_START, no fixed end
      sectionStart = TRACKER_OPEN_START;
      sectionEnd   = sh.getLastRow() + 300;
    }
  } else {
    // Queue sheets — write to next blank row after QUEUE_FROZEN
    sectionStart = QUEUE_FROZEN + 1;
    sectionEnd   = sh.getLastRow() + 300;
  }

  // Find first blank row in the target section
  var nextRow = -1;
  for (var r = sectionStart; r <= Math.max(sectionEnd, sectionStart + 300); r++) {
    if (isDeptTracker && (r === TRACKER_OPEN_BANNER || r === TRACKER_OPEN_HDR)) continue;
    var val = sh.getRange(r, TK_DATA_COL).getValue();
    if (!val || String(val).trim() === '') { nextRow = r; break; }
  }
  if (nextRow < 0) nextRow = sh.getLastRow() + 1;

  // Write the row and style it
  sh.getRange(nextRow, TK_DATA_COL, 1, TK_COLS).setValues([tkRow]);
  applyDataRowBorders_(sh, nextRow);
  applyPriorityRowColor_(sh, nextRow, data.priority);
}


// ═══════════════════════════════════════════════════════════════════════════
//  updateTicket — handler for ticket updates
//  ───────────────────────────────────────────────────────────────────────
//  Called from UpdateTicket.html when a tech or manager submits an update.
//  Also called from Manager Review Board (approveForOpen, sendBackToOpen, etc.)
//
//  Handles:
//    - Status changes (OPEN → COMPLETE → CLOSED, etc.)
//    - Field updates (priority, assignee, parts status, etc.)
//    - Re-routing if dept/problem type changes the tracker
//    - WAITING → OPEN hydration (preserves original ticket fields)
//    - Auto-close on verify (verifiedBy + verifiedDate filled = CLOSED)
//    - Priority repositioning (LOW/MED → HIGH/CRITICAL moves ticket in tracker)
//    - Temp fix logging
//    - Photo upload + parts used
// ═══════════════════════════════════════════════════════════════════════════
function updateTicket(data) {
  try {
    var ss=SpreadsheetApp.getActiveSpreadsheet(), now=new Date();

    // Pull existing values from Master Log to detect changes
   var oldStatus    = getMasterLogFieldForTicket_(data.ticketNo, ML.STATUS);
    var oldDept      = getMasterLogFieldForTicket_(data.ticketNo, ML.DEPT);
    var oldProbType  = getMasterLogFieldForTicket_(data.ticketNo, ML.PROBLEM_TYPE);
    var oldEquipType = getMasterLogFieldForTicket_(data.ticketNo, ML.EQUIP_TYPE);
    var oldPriority  = getMasterLogFieldForTicket_(data.ticketNo, ML.PRIORITY);
    // Backfill fields the update form never sends — preserve from original ticket
    var oldDowntime  = getMasterLogFieldForTicket_(data.ticketNo, ML.DOWNTIME_TYPE);
    var oldEstHours  = getMasterLogFieldForTicket_(data.ticketNo, ML.EST_HOURS);

    var newStatus=data.newStatus||oldStatus;
    // Auto-close: if a manager filled both Verified By and Verified Date, mark CLOSED
    if(data.verifiedBy&&data.verifiedDate) newStatus='CLOSED';

    // Convert ISO verified date from <input type="date"> to MM/DD/YYYY
    if (data.verifiedDate) {
      var _vm = String(data.verifiedDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (_vm) data.verifiedDate = formatDateStr_(new Date(parseInt(_vm[1]), parseInt(_vm[2])-1, parseInt(_vm[3])));
    }

    var newProbType=data.problemType||oldProbType;
    var newEquipType=data.equipType||oldEquipType;
    var newDept=data.dept||oldDept;

    // Did the routing change? (E.g. dept changed, or problem type added 'ELECTRICAL')
    var oldTracker=getTrackerForDept(oldDept,oldProbType,oldEquipType);
    var newTracker=getTrackerForDept(newDept,newProbType,newEquipType);
    var trackerChanged=(oldTracker!==newTracker);

    var mlSh=ss.getSheetByName(SH.MASTER_LOG);
    if(!mlSh) throw new Error('Master Log not found');

    // Build the Master Log audit row for this update
    var mlRow=new Array(ML_COLS).fill('');
    mlRow[ML.ROW_ID-1]=generateRowId(); mlRow[ML.TICKET_NO-1]=data.ticketNo;
    mlRow[ML.TIMESTAMP-1]=formatTimestamp_(now);
    mlRow[ML.ACTION-1]=trackerChanged?'UPDATED + REROUTED':'UPDATED';
    mlRow[ML.STATUS-1]=newStatus; mlRow[ML.DEPT-1]=newDept;
    mlRow[ML.BUILDING_ZONE-1]=data.buildingZone||''; mlRow[ML.EQUIP_TYPE-1]=newEquipType;
    mlRow[ML.EQUIP_CODE-1]=data.equipCode||''; mlRow[ML.SPECIFIC_EQUIP-1]=data.equipDesc||'';
    mlRow[ML.DOWNTIME_TYPE-1]=data.downtimeType||oldDowntime||''; mlRow[ML.PRIORITY-1]=data.priority||'';
    mlRow[ML.DESCRIPTION-1]=data.problemDesc||data.description||''; mlRow[ML.ASSIGNED_TO-1]=data.assignedTo||'';
    mlRow[ML.EST_HOURS-1]=data.estHours||oldEstHours||''; mlRow[ML.ACTUAL_HOURS-1]=data.actualHours||'';
    mlRow[ML.DATE_OPENED-1]=data.dateOpened instanceof Date ? formatDateStr_(data.dateOpened) : String(data.dateOpened||'');
    if(newStatus==='COMPLETE') mlRow[ML.DATE_COMPLETED-1]=formatDateStr_(now);
    if(newStatus==='CLOSED')   mlRow[ML.DATE_CLOSED-1]=formatDateStr_(now);
    mlRow[ML.CORRECTIVE_ACT-1]=data.correctiveAction||''; mlRow[ML.ROOT_CAUSE-1]=data.rootCause||'';
    mlRow[ML.WORK_SUMMARY-1]=data.workSummary||''; mlRow[ML.FIX_TYPE-1]=data.fixType||'';
    mlRow[ML.TEMP_FIX_FLAG-1]=data.tempFixFlag?'Y':'N'; mlRow[ML.PARTS_NEEDED-1]=data.partsNeeded?'Y':'N';
    mlRow[ML.PARTS_STATUS-1]=data.partsStatus||''; mlRow[ML.EQUIP_TAG_STATUS-1]=data.equipTagStatus||'';
    mlRow[ML.VERIFIED_BY-1]=data.verifiedBy||''; mlRow[ML.VERIFIED_DATE-1]=data.verifiedDate||'';
    mlRow[ML.ADDED_BY-1]=data.addedBy||''; mlRow[ML.UPDATED_BY-1]=data.updatedBy||'';

    // Combine observations + notes into a single NOTES column using prefix tags
    // (NOTE: This data model is on the list to be refactored in Phase 4 — see SQF #4)
    var _obs   = String(data.observations || '').trim();
    var _notes = String(data.notes        || '').trim();
    var _combinedNotes = _obs
      ? ('Observations: ' + _obs + (_notes ? ' | Notes: ' + _notes : ''))
      : _notes;
    mlRow[ML.NOTES-1] = _combinedNotes;
    data.notes = _combinedNotes;   // propagate so tracker sheet also writes it

    mlRow[ML.PROBLEM_TYPE-1]=newProbType;
    mlRow[ML.TRACKER_GROUP-1]=getDeptGroup_(newDept);
    mlRow[ML.LINE_NO-1]=data.lineNo||'';
    mlSh.appendRow(mlRow);

    // Tracker re-routing — move ticket from old tracker to new
    if(trackerChanged){
      removeTicketFromSheet_(ss,oldTracker,data.ticketNo);
      writeTicketToTrackerSheet_(ss,newTracker,data.ticketNo,data,newStatus,now);
      logTicketHistory(data.ticketNo,'REROUTED',getTrackerDisplayName(oldTracker),
        getTrackerDisplayName(newTracker),data.updatedBy,'Re-routed due to dept/problem type change');
    }

    // WAITING → OPEN hydration
    // When manager approves a waiting ticket, the update payload may only contain
    // priority/assignedTo. We need to backfill the rest of the ticket data from
    // the original creation row so the ticket carries forward correctly.
    if (oldStatus === 'WAITING' && newStatus === 'OPEN') {
      var origData = getOriginalTicketData_(mlSh, data.ticketNo);
      if (origData) {
        // origData is an object with named properties (not an array) — use direct property access
        data.equipType    = data.equipType    || origData.equipType    || '';
        data.equipCode    = data.equipCode    || origData.equipCode    || '';
        data.equipDesc    = data.equipDesc    || origData.specificEquip|| '';
        data.buildingZone = data.buildingZone || origData.buildingZone || '';
        data.downtimeType = data.downtimeType || origData.downtimeType || '';
        data.priority     = data.priority     || origData.priority     || '';
        data.addedBy      = data.addedBy      || origData.addedBy      || '';
        data.lineNo       = data.lineNo       || origData.lineNo       || '';
        data.problemType  = data.problemType  || origData.problemType  || '';
      }
      removeTicketFromSheet_(ss, SH.WAITING, data.ticketNo);
      writeTicketToTrackerSheet_(ss, SH.OPEN, data.ticketNo, data, 'OPEN', now);
    }

    // Update the ticket row in whichever tracker sheets currently hold it
    updateTicketInTrackerSheet_(ss,data.ticketNo,data,newStatus,now);

    // Priority repositioning — if priority just got bumped to HIGH/CRITICAL,
    // remove from current location and re-write so it lands in the priority section
    var newPrioU = String(data.priority || '').toUpperCase();
    var oldPrioU = String(oldPriority   || '').toUpperCase();
    var isNowPriority = ['HIGH','CRITICAL'].indexOf(newPrioU) >= 0;
    var wasPriority   = ['HIGH','CRITICAL'].indexOf(oldPrioU) >= 0;
    if (isNowPriority && !wasPriority && !trackerChanged) {
      removeTicketFromSheet_(ss, newTracker, data.ticketNo);
      writeTicketToTrackerSheet_(ss, newTracker, data.ticketNo, data, newStatus, now);
    }

    // Log dept transfer if dept changed
    if(data.dept&&data.dept!==oldDept){
      logTicketTransfer_(ss,data.ticketNo,oldDept,data.dept,data.updatedBy,data.transferReason||'');
    }

    // Log to Ticket History with a useful summary
    var histEvent=newStatus==='CLOSED'?TH_EVENTS.CLOSED:newStatus==='COMPLETE'?TH_EVENTS.COMPLETED:TH_EVENTS.UPDATED;
    var histNotes=[];
    if(data.workSummary)  histNotes.push('Work: '+data.workSummary.substring(0,60));
    if(data.observations) histNotes.push('Obs: '+data.observations.substring(0,80));
    if(data.tempFixFlag)  histNotes.push('Temp fix flagged');
    if(data.verifiedBy)  histNotes.push('Verified by: '+data.verifiedBy);
    if(trackerChanged)   histNotes.push('Rerouted: '+getTrackerDisplayName(oldTracker)+' → '+getTrackerDisplayName(newTracker));
    logTicketHistory(data.ticketNo,histEvent,oldStatus,newStatus,data.updatedBy,histNotes.join(' | '));

    // Side effects based on status / flags
    if(newStatus==='CLOSED') {
      if (!data.specificEquip) data.specificEquip = data.equipDesc || '';
      if (!data.downtimeType)  data.downtimeType  = oldDowntime   || '';
      if (!data.estHours)      data.estHours      = oldEstHours   || '';
      if (!data.addedBy)       data.addedBy       = getMasterLogFieldForTicket_(data.ticketNo, ML.ADDED_BY) || '';
      moveTicketToClosed_(ss, data.ticketNo, data, now);
    }
    if(data.tempFixFlag)     logTempFix_(ss,data.ticketNo,data,now);
    if(data.photoLinks)      appendImageLinksToLog_(data.ticketNo,[data.photoLinks]);
    if(data.partsUsed&&data.partsUsed.length>0) logPartsUsed_(ss,data.ticketNo,data);

    return{success:true,ticketNo:data.ticketNo,status:newStatus,rerouted:trackerChanged};
  } catch(e){Logger.log('updateTicket error: '+e.message);return{success:false,error:e.message};}
}


// ═══════════════════════════════════════════════════════════════════════════
//  logPartsUsed_ — log parts consumed during a repair
//  ───────────────────────────────────────────────────────────────────────
//  Called when a tech submits Update Ticket with parts used filled in.
//  Each part becomes a row in Parts Needed with status 'USED'.
// ═══════════════════════════════════════════════════════════════════════════
function logPartsUsed_(ss,ticketNo,data) {
  var sh=ss.getSheetByName(SH.PARTS_NEEDED);
  if(!sh||!data.partsUsed) return;
  data.partsUsed.forEach(function(p){
    if(!p.partId&&!p.partDesc) return;
    sh.appendRow([p.partId||'',p.partDesc||'',ticketNo,data.equipCode||'',
      data.equipDesc||'',data.dept||'',formatDateStr_(new Date()),'USED','','',
      data.updatedBy||'','Parts used — '+(p.qty||'')+' '+(p.uom||'')+(p.notes?' | '+p.notes:'')]);
  });
}


// ═══════════════════════════════════════════════════════════════════════════
//  uploadPhotoToDrive — save tech photos to Google Drive
//  ───────────────────────────────────────────────────────────────────────
//  Called from Update Ticket form when a tech uploads photos.
//  File structure: /Maintenance Reports/Images/{ticketNo}/{fileName}
//  Photos are shared "anyone with link can view" so they show in tracker.
// ═══════════════════════════════════════════════════════════════════════════
function uploadPhotoToDrive(base64Data,fileName,ticketNo,mimeType) {
  try {
    var rootFolders=DriveApp.getFoldersByName('Maintenance Reports');
    var rootFolder=rootFolders.hasNext()?rootFolders.next():DriveApp.createFolder('Maintenance Reports');
    var imgFolders=rootFolder.getFoldersByName('Images');
    var imgFolder=imgFolders.hasNext()?imgFolders.next():rootFolder.createFolder('Images');
    var tktFolders=imgFolder.getFoldersByName(ticketNo);
    var tktFolder=tktFolders.hasNext()?tktFolders.next():imgFolder.createFolder(ticketNo);
    var decoded=Utilities.base64Decode(base64Data);
    var blob=Utilities.newBlob(decoded,mimeType||'image/jpeg',fileName);
    var file=tktFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
    return{success:true,url:file.getUrl(),name:fileName};
  } catch(e){Logger.log('uploadPhotoToDrive error: '+e.message);return{success:false,error:e.message};}
}


// ═══════════════════════════════════════════════════════════════════════════
//  onEdit — direct-edit handler for tracker sheets
//  ───────────────────────────────────────────────────────────────────────
//  Fires automatically when someone edits a cell in any sheet. We only react
//  to edits in dept tracker sheets (rows below the frozen header).
//
//  Watches: STATUS, PRIORITY, ASSIGNED_TO, PARTS_STATUS, VERIFIED_BY, NOTES
//
//  Side effects:
//    - All edits → audit row in Master Log + history event
//    - STATUS = CLOSED → move ticket to Closed sheet, grey out row
//    - VERIFIED_BY filled on a COMPLETE ticket → auto-close
//    - PRIORITY changed → re-apply priority row color
//    - ASSIGNED_TO changed → history event
//
//  Also handles dept drilldown sheet edits to rebuild trend analytics.
// ═══════════════════════════════════════════════════════════════════════════
function onEdit(e) {
  try {
    if(!e||!e.range) return;
    var sheet=e.range.getSheet(), sheetName=sheet.getName();
    var cell=e.range, row=cell.getRow(), col=cell.getColumn(), newVal=e.value;

    // Dept Drill-Down sheet: D4 = dept selector → rebuild trend tables
    if(sheetName===SH.DEPT_DRILL&&e.range.getA1Notation()==='D4'){
      var ss2=SpreadsheetApp.getActiveSpreadsheet();
      buildTrendAnalysisTables_(ss2,sheet,26);
      ss2.toast('Analytics updated for: '+e.value,'🔍',3);
      return;
    }

    // Only respond to edits on tracker sheets, below the header
    if(!isTrackerSheet_(sheetName)) return;
    if(row<=TRACKER_FROZEN) return;
    if(row===TRACKER_PRIO_BANNER||row===TRACKER_PRIO_HDR) return;
    if(row===TRACKER_OPEN_BANNER||row===TRACKER_OPEN_HDR) return;

    var ticketNo=String(sheet.getRange(row,TK.TICKET_NO+1).getValue()).trim();
    if(!ticketNo) return;

    // Only react to edits in tracked columns
    var fieldMap={};
    fieldMap[TK.STATUS+1]       ='STATUS';
    fieldMap[TK.PRIORITY+1]     ='PRIORITY';
    fieldMap[TK.ASSIGNED_TO+1]  ='ASSIGNED_TO';
    fieldMap[TK.PARTS_STATUS+1] ='PARTS_STATUS';
    fieldMap[TK.VERIFIED_BY+1]  ='VERIFIED_BY';
    fieldMap[TK.NOTES+1]        ='NOTES';

    if(!fieldMap[col]) return;
    var fieldName=fieldMap[col];
    var ss=SpreadsheetApp.getActiveSpreadsheet();
    var userEmail=Session.getActiveUser().getEmail()||'Manager';
    var now=new Date(), oldVal=String(e.oldValue||'').trim();

    // Log the direct edit to Master Log for audit
    var mlSh=ss.getSheetByName(SH.MASTER_LOG);
    if(mlSh){
      var mlRow=new Array(ML_COLS).fill('');
      mlRow[ML.ROW_ID-1]=generateRowId(); mlRow[ML.TICKET_NO-1]=ticketNo;
      mlRow[ML.TIMESTAMP-1]=formatTimestamp_(now);
      mlRow[ML.ACTION-1]='DIRECT EDIT — '+fieldName;
      mlRow[ML.STATUS-1]=String(sheet.getRange(row,TK.STATUS+1).getValue());
      mlRow[ML.UPDATED_BY-1]=userEmail;
      mlRow[ML.NOTES-1]=fieldName+': "'+oldVal+'" → "'+newVal+'"';
      mlRow[ML.TRACKER_GROUP-1]=getDeptGroup_(String(sheet.getRange(row,TK.DEPT+1).getValue()));
      mlRow[ML.LINE_NO-1]=String(sheet.getRange(row,TK.LINE_NO+1).getValue()||'');
      mlSh.appendRow(mlRow);
    }

    logTicketHistory(ticketNo,'DIRECT EDIT',oldVal,String(newVal),userEmail,fieldName+' updated on tracker');

    // STATUS = CLOSED → move to Closed sheet
    if(fieldName==='STATUS'&&String(newVal).toUpperCase()==='CLOSED'){
      var tkData=buildTkDataFromRow_(sheet,row);
      moveTicketToClosed_(ss,ticketNo,tkData,now);
      removeTicketFromSheet_(ss,SH.OPEN,ticketNo);
    }
    if(fieldName==='STATUS'){
      sheet.getRange(row,TK.LAST_UPDATED+1).setValue(formatTimestamp_(now));
      // Grey out closed rows
      if(String(newVal).toUpperCase()==='CLOSED'){
        applyClosedRowStyle_(sheet, row);
      }
    }

    // VERIFIED_BY filled on COMPLETE ticket → auto-close
    if(fieldName==='VERIFIED_BY'&&newVal){
      var currentStatus=String(sheet.getRange(row,TK.STATUS+1).getValue()).toUpperCase();
      if(currentStatus==='COMPLETE'){
        sheet.getRange(row,TK.STATUS+1).setValue('CLOSED');
        sheet.getRange(row,TK.VERIFIED_DATE+1).setValue(formatDateStr_(now));
        sheet.getRange(row,TK.LAST_UPDATED+1).setValue(formatTimestamp_(now));
        var tkData2=buildTkDataFromRow_(sheet,row);
        moveTicketToClosed_(ss,ticketNo,tkData2,now);
        removeTicketFromSheet_(ss,SH.OPEN,ticketNo);
        logTicketHistory(ticketNo,TH_EVENTS.CLOSED,'COMPLETE','CLOSED',newVal,'Auto-closed on verification');
        applyClosedRowStyle_(sheet, row);
      }
    }

    // Re-apply row color when priority changes
    if(fieldName==='PRIORITY'){
      applyPriorityRowColor_(sheet,row,newVal);
    }

    // Log assignment changes
    if(fieldName==='ASSIGNED_TO'&&newVal){
      logTicketHistory(ticketNo,TH_EVENTS.ASSIGNED,oldVal,newVal,userEmail,'Assigned directly on tracker to: '+newVal);
    }
  } catch(err){Logger.log('onEdit error: '+err.message);}
}


// ═══════════════════════════════════════════════════════════════════════════
//  applyClosedRowStyle_ — grey out a closed ticket row
//  ───────────────────────────────────────────────────────────────────────
//  Called when a ticket gets marked CLOSED on any tracker sheet.
//  Removes the priority color and applies a uniform grey style so
//  closed tickets visually fade into the background.
// ═══════════════════════════════════════════════════════════════════════════
function applyClosedRowStyle_(sh, rowNum) {
  try {
    sh.getRange(rowNum, 1).setBackground('#EEEEEE');
    sh.getRange(rowNum, TK_DATA_COL, 1, TK_COLS)
      .setBackground('#EEEEEE')
      .setFontColor('#9E9E9E');
    sh.getRange(rowNum, TK.PRIORITY + 1)
      .setFontColor('#9E9E9E')
      .setFontWeight('normal');
  } catch(e) {
    Logger.log('applyClosedRowStyle_ error: ' + e.message);
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  greyOutClosedTickets_ — batch grey-out all closed rows
//  ───────────────────────────────────────────────────────────────────────
//  One-time backfill that scans every dept tracker, finds rows where
//  status = CLOSED, and applies the closed-row style. Useful after
//  deploying the closed-row styling for the first time.
// ═══════════════════════════════════════════════════════════════════════════
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


// ═══════════════════════════════════════════════════════════════════════════
//  buildTkDataFromRow_ — read a tracker row into a data object
//  ───────────────────────────────────────────────────────────────────────
//  When the onEdit handler needs to move a ticket to Closed, it needs the
//  ticket's data as an object. This helper reads a tracker row and returns
//  the right shape.
// ═══════════════════════════════════════════════════════════════════════════
function buildTkDataFromRow_(sheet, row) {
  var vals = sheet.getRange(row, TK_DATA_COL, 1, TK_COLS).getValues()[0];
  return {
    dept:          vals[TK.DEPT-1],
    priority:      vals[TK.PRIORITY-1],
    buildingZone:  vals[TK.BUILDING_ZONE-1],
    equipType:     vals[TK.EQUIP_TYPE-1],
    equipCode:     vals[TK.EQUIP_CODE-1],
    specificEquip: vals[TK.SPECIFIC_EQUIP-1],
    description:   vals[TK.DESCRIPTION-1],
    assignedTo:    vals[TK.ASSIGNED_TO-1],
    actualHours:   vals[TK.ACTUAL_HOURS-1],
    dateOpened:    vals[TK.DATE_OPENED-1],
    fixType:       vals[TK.FIX_TYPE-1],
    verifiedBy:    vals[TK.VERIFIED_BY-1],
    updatedBy:     vals[TK.UPDATED_BY-1],
    notes:         vals[TK.NOTES-1],
    problemType:   vals[TK.PROBLEM_TYPE-1],
    lineNo:        vals[TK.LINE_NO-1]
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  voidTicket — mark a ticket VOID
//  ───────────────────────────────────────────────────────────────────────
//  Used when a ticket was created in error (duplicate, test, wrong dept, etc.)
//  Requires manager/admin access and a void reason.
//
//  Steps:
//    1. Write VOIDED row to Master Log
//    2. Remove from all active sheets (Waiting / Open / Dept Tracker)
//    3. Move to Closed Tickets with status VOID (greyed out)
//    4. Log to Ticket History
// ═══════════════════════════════════════════════════════════════════════════
function voidTicket(data) {
  try {
    var userInfo = getCurrentUserInfo();
    if (!userInfo.isAdmin && !userInfo.isManager) {
      return { success: false, error: 'Manager or Admin access required.' };
    }
    if (!data.ticketNo) return { success: false, error: 'No ticket number provided.' };
    if (!data.voidReason) return { success: false, error: 'Void reason is required.' };

    var ss  = SpreadsheetApp.getActiveSpreadsheet();
    var now = new Date();

    // 1. Append VOIDED row to Master Log
    var mlSh = ss.getSheetByName(SH.MASTER_LOG);
    if (!mlSh) throw new Error('Master Log not found');
    var oldDept     = getMasterLogFieldForTicket_(data.ticketNo, ML.DEPT);
    var oldProbType = getMasterLogFieldForTicket_(data.ticketNo, ML.PROBLEM_TYPE);
    var oldEquipType= getMasterLogFieldForTicket_(data.ticketNo, ML.EQUIP_TYPE);

    var mlRow = new Array(ML_COLS).fill('');
    mlRow[ML.ROW_ID-1]     = generateRowId();
    mlRow[ML.TICKET_NO-1]  = data.ticketNo;
    mlRow[ML.TIMESTAMP-1]  = formatTimestamp_(now);
    mlRow[ML.ACTION-1]     = 'VOIDED';
    mlRow[ML.STATUS-1]     = 'VOID';
    mlRow[ML.DEPT-1]       = oldDept || data.dept || '';
    mlRow[ML.NOTES-1]      = 'Void Reason: ' + data.voidReason;
    mlRow[ML.UPDATED_BY-1] = data.voidedBy || '';
    mlRow[ML.TRACKER_GROUP-1] = getDeptGroup_(oldDept || data.dept || '');
    mlSh.appendRow(mlRow);

    // 2. Remove ticket from active sheets
    var trackerSheet = getTrackerForDept(oldDept, oldProbType, oldEquipType);
    removeTicketFromSheet_(ss, SH.WAITING, data.ticketNo);
    removeTicketFromSheet_(ss, SH.OPEN,    data.ticketNo);
    removeTicketFromSheet_(ss, trackerSheet, data.ticketNo);

   

    // 4. Log to Ticket History
    logTicketHistory(
      data.ticketNo, 'VOIDED', '', 'VOID',
      data.voidedBy || '',
      'Ticket voided — Reason: ' + data.voidReason
    );

    return { success: true, ticketNo: data.ticketNo };

  } catch(e) {
    Logger.log('voidTicket error: ' + e.message);
    return { success: false, error: e.message };
  }
}


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ▲▲▲ END OF MERGED CodeCoreUpdates.gs CONTENT ▲▲▲                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝



// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                                                                          ║
// ║  ▼▼▼ MOVED FROM ServiceReportBackend.gs — Phase 1 Cleanup ▼▼▼          ║
// ║                                                                          ║
// ║  4 functions kept from ServiceReportBackend.gs. The rest of that file   ║
// ║  is being deleted in Step 5c — its content was for the Service Report   ║
// ║  workflow which is going away entirely in Phase 4 (replaced by on-      ║
// ║  demand PDF generation from any closed ticket per SQF #4).              ║
// ║                                                                          ║
// ║  Contents (in order):                                                    ║
// ║    • showEquipHoldTag      — launch Equipment Hold Tag form             ║
// ║    • assignTicketToTech    — tech work board "claim ticket" action      ║
// ║    • getMonthRolloverData  — stats for the Month Rollover dialog        ║
// ║    • getOpenTicketsList_   — helper returning all non-closed tickets    ║
// ║                                                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝


// ═══════════════════════════════════════════════════════════════════════════
//  showEquipHoldTag — launch the Equipment Hold Tag form
//  ───────────────────────────────────────────────────────────────────────
//  Opens the modal form for issuing a Red / Yellow / Orange hold tag.
//  Optionally pre-fills the form with a ticket # so the manager can tag
//  equipment directly from a ticket review without typing it again.
//
//  Called from:
//    - Menu: ⚡ Maintenance → 🏷️ Print Equipment Hold Tag (no ticketNo)
//    - Manager Review Board's "Tag Equipment" button (with ticketNo)
//    - Add Ticket form when a tag status is selected (with ticketNo)
// ═══════════════════════════════════════════════════════════════════════════
function showEquipHoldTag(ticketNo) {
  var template = HtmlService.createTemplateFromFile('EquipmentHoldTag');
  template.preloadTicketNo = ticketNo || '';
  var html = template.evaluate()
    .setTitle('🏷️ Equipment Hold Tag')
    .setWidth(720).setHeight(760);
  SpreadsheetApp.getUi().showModalDialog(html, '🏷️ Equipment Hold Tag — FRM-029-002');
}


// ═══════════════════════════════════════════════════════════════════════════
//  assignTicketToTech — claim a waiting ticket
//  ───────────────────────────────────────────────────────────────────────
//  Called from the Tech Work Board when a tech claims a waiting ticket.
//  Routes through the standard updateTicket pipeline so all the normal
//  side effects fire: Master Log audit row, tracker sheet update, history
//  event, status moves to OPEN, etc.
//
//  Kept thin on purpose — all real logic lives in updateTicket so there's
//  only one path that moves tickets from WAITING to OPEN.
// ═══════════════════════════════════════════════════════════════════════════
function assignTicketToTech(data) {
  try {
    return updateTicket({
      ticketNo:   data.ticketNo,
      newStatus:  'OPEN',
      assignedTo: data.tech,
      updatedBy:  data.tech
    });
  } catch(e) {
    return { success:false, error: e.message };
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  getMonthRolloverData — stats for the Month Rollover dialog
//  ───────────────────────────────────────────────────────────────────────
//  Called from MonthRollover.html on load to populate the warning UI.
//  Returns counts of total / open / waiting / closed tickets plus active
//  temp fixes and pending parts orders, so the manager sees what will
//  carry over vs what will archive when they click "Close Month".
//
//  Counts come from the latest row per ticket in Master Log (not the
//  queue sheets) so we get the true current status even if a tracker
//  sheet is out of sync.
//
//  NOTE: This function previously used camelCase config keys (cfg.companyName)
//        but getConfig() returns keys with the original tab spelling
//        (cfg['Company Name']). That's why the dialog showed "Loading..."
//        for the month. Fixed below — uses the correct bracketed keys.
// ═══════════════════════════════════════════════════════════════════════════
function getMonthRolloverData() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = getConfig();
  var logSh = ss.getSheetByName(SH.MASTER_LOG);
  var tfSh  = ss.getSheetByName(SH.TEMP_FIX);
  var pnSh  = ss.getSheetByName(SH.PARTS_NEEDED);

  // Pull every Master Log row (we'll dedupe per ticket below)
  var data = logSh && logSh.getLastRow() > 1
    ? logSh.getRange(2, 1, logSh.getLastRow()-1, ML_COLS).getValues()
    : [];

  // Get latest status per ticket — Master Log appends, so the LAST row
  // for a given ticket # has the current status
  var latestStatusByTicket = {};
  data.forEach(function(r) {
    var tn = String(r[ML.TICKET_NO-1] || '').trim();
    if (!tn) return;
    latestStatusByTicket[tn] = String(r[ML.STATUS-1] || '').toUpperCase();
  });

  // Count tickets by status bucket
  var statusCounts = {total:0, open:0, waiting:0, closed:0};
  Object.keys(latestStatusByTicket).forEach(function(tn) {
    statusCounts.total++;
    var s = latestStatusByTicket[tn];
    if (s==='OPEN'||s==='PENDING PARTS'||s==='ON HOLD'||s==='IN REVIEW') statusCounts.open++;
    else if (s==='WAITING') statusCounts.waiting++;
    else if (s==='CLOSED') statusCounts.closed++;
  });

  // Active temp fixes — anything still being monitored (not cleared)
  var activeTempFix = 0;
  if (tfSh && tfSh.getLastRow() > 1) {
    var tfData = tfSh.getRange(2, 1, tfSh.getLastRow()-1, TF_COLS).getValues();
    tfData.forEach(function(r) {
      var st = String(r[TF.STATUS-1]).toUpperCase();
      if (st==='ACTIVE'||st==='PAST DUE') activeTempFix++;
    });
  }

  // Pending parts — anything not received yet
  // NOTE: PN.STATUS doesn't exist in your PN constants — should be PN.PARTS_STATUS
  // Using PN.PARTS_STATUS so this actually works
  var pendingParts = 0;
  if (pnSh && pnSh.getLastRow() > 1) {
    var pnData = pnSh.getRange(2, 1, pnSh.getLastRow()-1, PN_COLS).getValues();
    pnData.forEach(function(r) {
      var st = String(r[PN.PARTS_STATUS-1] || '').toUpperCase();
      if (st && st!=='RECEIVED') pendingParts++;
    });
  }

  // FIXED: use bracketed config keys (was cfg.companyName etc, which returned undefined)
  return {
    companyName:    cfg['Company Name']  || 'Container Supply Co.',
    location:       cfg['Location']      || 'Garden Grove, CA',
    currentMonth:   cfg['Current Month'] || getCurrentMonth_(),
    totalTickets:   statusCounts.total,
    openTickets:    statusCounts.open,
    waitingTickets: statusCounts.waiting,
    closedTickets:  statusCounts.closed,
    activeTempFix:  activeTempFix,
    pendingParts:   pendingParts
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  getOpenTicketsList_ — list of all non-closed tickets
//  ───────────────────────────────────────────────────────────────────────
//  Returns the most-recent Master Log row per ticket, filtered to anything
//  that isn't CLOSED. Used by the Tech Work Board and a few other places
//  that need a quick "everything still active" list.
//
//  Defensive: uses getLastColumn() rather than ML_COLS in case the
//  Master Log has fewer columns than expected. Each field accessor falls
//  back to empty string if its column index is out of bounds.
// ═══════════════════════════════════════════════════════════════════════════
function getOpenTicketsList_() {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var logSh = ss.getSheetByName(SH.MASTER_LOG);
    var list  = [];
    if (!logSh || logSh.getLastRow() < 2) return list;

    // Use actual sheet column count to avoid out-of-bounds errors
    var lastCol = Math.min(ML_COLS, logSh.getLastColumn());
    var data = logSh.getRange(2, 1, logSh.getLastRow()-1, lastCol).getValues();

    // Master Log appends, so last row per ticket wins
    var ticketMap = {};
    data.forEach(function(r){
      var tn = String(r[ML.TICKET_NO-1]||'').trim();
      if(tn) ticketMap[tn] = r;
    });

    Object.keys(ticketMap).forEach(function(tn){
      var r = ticketMap[tn];
      var s = String(r[ML.STATUS-1]||'').toUpperCase();
      if(s==='CLOSED') return;  // skip closed

      // Safe column read helper — returns empty string if col is out of bounds
      function col(idx){ return idx<=lastCol ? String(r[idx-1]||'') : ''; }

      list.push({
        ticketNo:     col(ML.TICKET_NO),
        status:       col(ML.STATUS),
        priority:     col(ML.PRIORITY),
        dept:         col(ML.DEPT),
        equipType:    col(ML.EQUIP_TYPE),
        specificEquip:col(ML.SPECIFIC_EQUIP),
        equipCode:    col(ML.EQUIP_CODE),
        description:  col(ML.DESCRIPTION),
        dateOpened:   (r[ML.DATE_OPENED-1] && ML.DATE_OPENED<=lastCol) ?
                        Utilities.formatDate(new Date(r[ML.DATE_OPENED-1]), Session.getScriptTimeZone(), 'MM/dd/yyyy') : '',
        assignedTo:   col(ML.ASSIGNED_TO),
        buildingZone: col(ML.BUILDING_ZONE),
        addedBy:      col(ML.ADDED_BY),
        downtimeType: col(ML.DOWNTIME_TYPE),
        problemType:  col(ML.PROBLEM_TYPE),
        estHours:     ML.EST_HOURS<=lastCol ? (r[ML.EST_HOURS-1]||'') : ''
      });
    });
    return list;
  } catch(e) {
    Logger.log('getOpenTicketsList_ error: ' + e.message);
    return [];
  }
}


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ▲▲▲ END OF MOVED ServiceReportBackend.gs CONTENT ▲▲▲                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝



function openArchiveClosedTickets() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile('ArchiveClosedTickets')
      .setWidth(1600).setHeight(1200),
    '🗃️ Archive Closed Tickets');
}