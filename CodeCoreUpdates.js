// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  CODE_CORE_UPDATES.gs — v3.1                                            ║
// ║  Container Supply Co. — Garden Grove, CA                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝

var DEPT_CODES = {
  'METAL':       '001', 'PLASTIC':     '003', 'LITHO':       '004',
  'PLASTIC DEC': '006', 'QA':          '007', 'M/S':         '008',
  'S/R':         '009', 'SALES':       '030', 'G&A':         '031'
};

var DEPT_CODE_TO_NAME = {
  '001':'METAL','003':'PLASTIC','004':'LITHO','006':'PLASTIC DEC',
  '007':'QA','008':'M/S','009':'S/R','030':'SALES','031':'G&A'
};

function getTrackerForDept(dept, problemType, equipType) {
  var mapping = getDeptMapping_();
  var d  = String(dept||'').toUpperCase().trim();
  var dg = mapping[d] || d;
  var pt = String(problemType||'').toUpperCase().trim();
  var et = String(equipType||'').toUpperCase().trim();

  var cfg   = getConfig();
  var rules = [];
  try { rules = JSON.parse(cfg['Routing Override Rules'] || '[]'); } catch(e) { rules = []; }
  if (!rules.length) {
    rules = [
      { keyword:'ELECTRICAL', matchOn:'PROBLEM_TYPE', routeTo:'ELECTRICAL' },
      { keyword:'FACILITY',   matchOn:'EQUIP_DESC',   routeTo:'FACILITIES' }
    ];
  }
  for (var r=0; r<rules.length; r++) {
    var rule    = rules[r];
    var kw      = String(rule.keyword||'').toUpperCase().trim();
    if (!kw) continue;
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

  if (dg === 'METALS')       return SH.TRACKER_MTL;
  if (dg === 'PLASTICS')     return SH.TRACKER_PL;
  if (dg === 'LITHO')        return SH.TRACKER_LTH;
  if (dg === 'ELECTRICAL')   return SH.TRACKER_EL;
  if (dg === 'FACILITIES')   return SH.TRACKER_FAC;
  if (dg === 'MACHINE SHOP') return SH.TRACKER_MS;
  return SH.TRACKER_MS;
}

function getTrackerDisplayName(trackerSheetName) {
  var map = {};
  DEPT_TRACKERS.forEach(function(dt) { map[dt.name] = dt.dept; });
  return map[trackerSheetName] || trackerSheetName;
}

function generateTicketNumber(dept) {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName(SH.MASTER_LOG);
  var tz  = Session.getScriptTimeZone();
  var now = new Date();

  var deptUp   = String(dept||'').toUpperCase().trim();
  var deptCode = '000';
  Object.keys(DEPT_CODES).forEach(function(key) {
    if (key.toUpperCase() === deptUp) deptCode = DEPT_CODES[key];
  });
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

function getAddTicketFormData() {
  var cfg         = getConfig();
  var lists       = getAllDataLists();
  var deptMapping = getDeptMapping_();
  var departments = Object.keys(deptMapping).sort();

  var transferReasons = getDataList('Transfer Reasons');
  if (!transferReasons || !transferReasons.length) transferReasons = ['Beyond Scope'];

  var peopleList = getPeopleList_(true);

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

function addNewTicket(data) {
  try {
    var ss=SpreadsheetApp.getActiveSpreadsheet(), now=new Date();
    var ticketNo=generateTicketNumber(data.dept), rowId=generateRowId();
    var trackerSheet=getTrackerForDept(data.dept,data.problemType,data.equipType);
    var isCritical=String(data.priority).toUpperCase()==='CRITICAL';
    var initialStatus=isCritical?'OPEN':'WAITING';
    var mlSh=ss.getSheetByName(SH.MASTER_LOG);
    if(!mlSh) throw new Error('Master Log not found');
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
    var destSheet=isCritical?SH.OPEN:SH.WAITING;
    writeTicketToTrackerSheet_(ss,destSheet,ticketNo,data,initialStatus,now);
    writeTicketToTrackerSheet_(ss,trackerSheet,ticketNo,data,initialStatus,now);
    logTicketHistory(ticketNo,TH_EVENTS.CREATED,'',initialStatus,data.addedBy,
      isCritical?'Critical ticket — bypassed waiting queue → '+getTrackerDisplayName(trackerSheet)
               :'Ticket created → Waiting Queue | Tracker: '+getTrackerDisplayName(trackerSheet));
    if(data.partsNeeded&&data.partsTable&&data.partsTable.length>0){
      logPartsNeeded_(ss,ticketNo,data);
      sendPartsNeededEmail_(ticketNo,data);
    }
    if(data.equipTagStatus&&data.equipTagStatus!=='None'&&data.equipTagStatus!==''){
      logEquipHoldTag_(ss,ticketNo,data,now);
    }
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

function writeTicketToTrackerSheet_(ss, sheetName, ticketNo, data, status, now) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh) { Logger.log('writeTicketToTrackerSheet_: sheet not found: ' + sheetName); return; }

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

  var isDeptTracker = isTrackerSheet_(sheetName);
  var isPriority    = ['CRITICAL','HIGH'].indexOf(String(data.priority||'').toUpperCase()) >= 0;
  var sectionStart, sectionEnd;

  if (isDeptTracker) {
    if (isPriority) {
      sectionStart = TRACKER_PRIO_START;
      sectionEnd   = TRACKER_PRIO_END;
    } else {
      sectionStart = TRACKER_OPEN_START;
      sectionEnd   = sh.getLastRow() + 300;
    }
  } else {
    sectionStart = QUEUE_FROZEN + 1;
    sectionEnd   = sh.getLastRow() + 300;
  }

  var nextRow = -1;
  for (var r = sectionStart; r <= Math.max(sectionEnd, sectionStart + 300); r++) {
    if (isDeptTracker && (r === TRACKER_OPEN_BANNER || r === TRACKER_OPEN_HDR)) continue;
    var val = sh.getRange(r, TK_DATA_COL).getValue();
    if (!val || String(val).trim() === '') { nextRow = r; break; }
  }
  if (nextRow < 0) nextRow = sh.getLastRow() + 1;

  sh.getRange(nextRow, TK_DATA_COL, 1, TK_COLS).setValues([tkRow]);
  applyDataRowBorders_(sh, nextRow);
  applyPriorityRowColor_(sh, nextRow, data.priority);
}

function updateTicket(data) {
  try {
    var ss=SpreadsheetApp.getActiveSpreadsheet(), now=new Date();
    var oldStatus=getMasterLogFieldForTicket_(data.ticketNo,ML.STATUS);
    var oldDept=getMasterLogFieldForTicket_(data.ticketNo,ML.DEPT);
    var oldProbType=getMasterLogFieldForTicket_(data.ticketNo,ML.PROBLEM_TYPE);
    var oldEquipType=getMasterLogFieldForTicket_(data.ticketNo,ML.EQUIP_TYPE);
    var oldPriority=getMasterLogFieldForTicket_(data.ticketNo,ML.PRIORITY);
    var newStatus=data.newStatus||oldStatus;
    if(data.verifiedBy&&data.verifiedDate) newStatus='CLOSED';
    var newProbType=data.problemType||oldProbType;
    var newEquipType=data.equipType||oldEquipType;
    var newDept=data.dept||oldDept;
    var oldTracker=getTrackerForDept(oldDept,oldProbType,oldEquipType);
    var newTracker=getTrackerForDept(newDept,newProbType,newEquipType);
    var trackerChanged=(oldTracker!==newTracker);
    var mlSh=ss.getSheetByName(SH.MASTER_LOG);
    if(!mlSh) throw new Error('Master Log not found');
    var mlRow=new Array(ML_COLS).fill('');
    mlRow[ML.ROW_ID-1]=generateRowId(); mlRow[ML.TICKET_NO-1]=data.ticketNo;
    mlRow[ML.TIMESTAMP-1]=formatTimestamp_(now);
    mlRow[ML.ACTION-1]=trackerChanged?'UPDATED + REROUTED':'UPDATED';
    mlRow[ML.STATUS-1]=newStatus; mlRow[ML.DEPT-1]=newDept;
    mlRow[ML.BUILDING_ZONE-1]=data.buildingZone||''; mlRow[ML.EQUIP_TYPE-1]=newEquipType;
    mlRow[ML.EQUIP_CODE-1]=data.equipCode||''; mlRow[ML.SPECIFIC_EQUIP-1]=data.equipDesc||'';
    mlRow[ML.DOWNTIME_TYPE-1]=data.downtimeType||''; mlRow[ML.PRIORITY-1]=data.priority||'';
    mlRow[ML.DESCRIPTION-1]=data.problemDesc||''; mlRow[ML.ASSIGNED_TO-1]=data.assignedTo||'';
    mlRow[ML.EST_HOURS-1]=data.estHours||''; mlRow[ML.ACTUAL_HOURS-1]=data.actualHours||'';
    mlRow[ML.DATE_OPENED-1]=data.dateOpened instanceof Date ? formatDateStr_(data.dateOpened) : String(data.dateOpened||'');
    if(newStatus==='COMPLETE') mlRow[ML.DATE_COMPLETED-1]=formatDateStr_(now);
    if(newStatus==='CLOSED')   mlRow[ML.DATE_CLOSED-1]=formatDateStr_(now);
    mlRow[ML.CORRECTIVE_ACT-1]=data.correctiveAction||''; mlRow[ML.ROOT_CAUSE-1]=data.rootCause||'';
    mlRow[ML.WORK_SUMMARY-1]=data.workSummary||''; mlRow[ML.FIX_TYPE-1]=data.fixType||'';
    mlRow[ML.TEMP_FIX_FLAG-1]=data.tempFixFlag?'Y':'N'; mlRow[ML.PARTS_NEEDED-1]=data.partsNeeded?'Y':'N';
    mlRow[ML.PARTS_STATUS-1]=data.partsStatus||''; mlRow[ML.EQUIP_TAG_STATUS-1]=data.equipTagStatus||'';
    mlRow[ML.VERIFIED_BY-1]=data.verifiedBy||''; mlRow[ML.VERIFIED_DATE-1]=data.verifiedDate||'';
    mlRow[ML.ADDED_BY-1]=data.addedBy||''; mlRow[ML.UPDATED_BY-1]=data.updatedBy||'';
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

    if(trackerChanged){
      removeTicketFromSheet_(ss,oldTracker,data.ticketNo);
      writeTicketToTrackerSheet_(ss,newTracker,data.ticketNo,data,newStatus,now);
      logTicketHistory(data.ticketNo,'REROUTED',getTrackerDisplayName(oldTracker),
        getTrackerDisplayName(newTracker),data.updatedBy,'Re-routed due to dept/problem type change');
    }

    if (oldStatus === 'WAITING' && newStatus === 'OPEN') {
      var origData = getOriginalTicketData_(mlSh, data.ticketNo);
      if (origData) {
        data.equipType    = data.equipType    || String(origData[ML.EQUIP_TYPE-1]    ||'');
        data.equipCode    = data.equipCode    || String(origData[ML.EQUIP_CODE-1]    ||'');
        data.equipDesc    = data.equipDesc    || String(origData[ML.SPECIFIC_EQUIP-1]||'');
        data.buildingZone = data.buildingZone || String(origData[ML.BUILDING_ZONE-1] ||'');
        data.downtimeType = data.downtimeType || String(origData[ML.DOWNTIME_TYPE-1] ||'');
        data.priority     = data.priority     || String(origData[ML.PRIORITY-1]      ||'');
        data.addedBy      = data.addedBy      || String(origData[ML.ADDED_BY-1]      ||'');
        data.lineNo       = data.lineNo       || String(origData[ML.LINE_NO-1]       ||'');
        data.problemType  = data.problemType  || String(origData[ML.PROBLEM_TYPE-1]  ||'');
      }
      removeTicketFromSheet_(ss, SH.WAITING, data.ticketNo);
      writeTicketToTrackerSheet_(ss, SH.OPEN, data.ticketNo, data, 'OPEN', now);
    }

    updateTicketInTrackerSheet_(ss,data.ticketNo,data,newStatus,now);
    // Reposition ticket in dept tracker if priority upgraded to HIGH/CRITICAL
    var newPrioU = String(data.priority || '').toUpperCase();
    var oldPrioU = String(oldPriority   || '').toUpperCase();
    var isNowPriority = ['HIGH','CRITICAL'].indexOf(newPrioU) >= 0;
    var wasPriority   = ['HIGH','CRITICAL'].indexOf(oldPrioU) >= 0;
    if (isNowPriority && !wasPriority && !trackerChanged) {
      removeTicketFromSheet_(ss, newTracker, data.ticketNo);
      writeTicketToTrackerSheet_(ss, newTracker, data.ticketNo, data, newStatus, now);
    }

    if(data.dept&&data.dept!==oldDept){
      logTicketTransfer_(ss,data.ticketNo,oldDept,data.dept,data.updatedBy,data.transferReason||'');
    }
    var histEvent=newStatus==='CLOSED'?TH_EVENTS.CLOSED:newStatus==='COMPLETE'?TH_EVENTS.COMPLETED:TH_EVENTS.UPDATED;
    var histNotes=[];
    if(data.workSummary)  histNotes.push('Work: '+data.workSummary.substring(0,60));
    if(data.observations) histNotes.push('Obs: '+data.observations.substring(0,80));
    if(data.tempFixFlag)  histNotes.push('Temp fix flagged');
    if(data.verifiedBy)  histNotes.push('Verified by: '+data.verifiedBy);
    if(trackerChanged)   histNotes.push('Rerouted: '+getTrackerDisplayName(oldTracker)+' → '+getTrackerDisplayName(newTracker));
    logTicketHistory(data.ticketNo,histEvent,oldStatus,newStatus,data.updatedBy,histNotes.join(' | '));
    if(newStatus==='CLOSED') moveTicketToClosed_(ss,data.ticketNo,data,now);
    if(data.tempFixFlag)     logTempFix_(ss,data.ticketNo,data,now);
    if(data.photoLinks)      appendImageLinksToLog_(data.ticketNo,[data.photoLinks]);
    if(data.partsUsed&&data.partsUsed.length>0) logPartsUsed_(ss,data.ticketNo,data);
    return{success:true,ticketNo:data.ticketNo,status:newStatus,rerouted:trackerChanged};
  } catch(e){Logger.log('updateTicket error: '+e.message);return{success:false,error:e.message};}
}

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
//  ON EDIT — watches tracker sheets for direct manager edits
// ═══════════════════════════════════════════════════════════════════════════
function onEdit(e) {
  try {
    if(!e||!e.range) return;
    var sheet=e.range.getSheet(), sheetName=sheet.getName();
    var cell=e.range, row=cell.getRow(), col=cell.getColumn(), newVal=e.value;

    if(sheetName===SH.DEPT_DRILL&&e.range.getA1Notation()==='D4'){
      var ss2=SpreadsheetApp.getActiveSpreadsheet();
      buildTrendAnalysisTables_(ss2,sheet,26);
      ss2.toast('Analytics updated for: '+e.value,'🔍',3);
      return;
    }

    if(!isTrackerSheet_(sheetName)) return;
    if(row<=TRACKER_FROZEN) return;
    if(row===TRACKER_PRIO_BANNER||row===TRACKER_PRIO_HDR) return;
    if(row===TRACKER_OPEN_BANNER||row===TRACKER_OPEN_HDR) return;

    var ticketNo=String(sheet.getRange(row,TK.TICKET_NO+1).getValue()).trim();
    if(!ticketNo) return;

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

    if(fieldName==='STATUS'&&String(newVal).toUpperCase()==='CLOSED'){
      var tkData=buildTkDataFromRow_(sheet,row);
      moveTicketToClosed_(ss,ticketNo,tkData,now);
      removeTicketFromSheet_(ss,SH.OPEN,ticketNo);
    }
    if(fieldName==='STATUS'){
      sheet.getRange(row,TK.LAST_UPDATED+1).setValue(formatTimestamp_(now));
      // ITEM 7A: Grey out row if closed
      if(String(newVal).toUpperCase()==='CLOSED'){
        applyClosedRowStyle_(sheet, row);
      }
    }
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
        // ITEM 7A: Grey out after auto-close
        applyClosedRowStyle_(sheet, row);
      }
    }
    if(fieldName==='PRIORITY'){
      applyPriorityRowColor_(sheet,row,newVal);
    }
    if(fieldName==='ASSIGNED_TO'&&newVal){
      logTicketHistory(ticketNo,TH_EVENTS.ASSIGNED,oldVal,newVal,userEmail,'Assigned directly on tracker to: '+newVal);
    }
  } catch(err){Logger.log('onEdit error: '+err.message);}
}

// ═══════════════════════════════════════════════════════════════════════════
//  ITEM 7A — APPLY CLOSED ROW STYLE (grey out, remove priority shading)
//  Called when a ticket is marked CLOSED on any tracker sheet
// ═══════════════════════════════════════════════════════════════════════════
function applyClosedRowStyle_(sh, rowNum) {
  try {
    // Col A stays grey margin
    sh.getRange(rowNum, 1).setBackground('#EEEEEE');
    // Data cols B+ get light grey background
    sh.getRange(rowNum, TK_DATA_COL, 1, TK_COLS)
      .setBackground('#EEEEEE')
      .setFontColor('#9E9E9E');
    // Priority column loses bold styling
    sh.getRange(rowNum, TK.PRIORITY + 1)
      .setFontColor('#9E9E9E')
      .setFontWeight('normal');
  } catch(e) {
    Logger.log('applyClosedRowStyle_ error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ITEM 7A — GREY OUT ALL EXISTING CLOSED TICKETS (batch backfill)
//  Run once from the menu after deploying this update to grey out all
//  tickets that are already closed in the tracker sheets.
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

    // 1. Write VOIDED row to Master Log
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

    // 2. Remove from active sheets
    var trackerSheet = getTrackerForDept(oldDept, oldProbType, oldEquipType);
    removeTicketFromSheet_(ss, SH.WAITING, data.ticketNo);
    removeTicketFromSheet_(ss, SH.OPEN,    data.ticketNo);
    removeTicketFromSheet_(ss, trackerSheet, data.ticketNo);

    // 3. Move to Closed Tickets with VOID status
    var closedSh = ss.getSheetByName(SH.CLOSED);
    if (closedSh) {
      var tkRow = new Array(TK_COLS).fill('');
      tkRow[TK.TICKET_NO-1]   = data.ticketNo;
      tkRow[TK.STATUS-1]      = 'VOID';
      tkRow[TK.DEPT-1]        = oldDept || data.dept || '';
      tkRow[TK.LAST_UPDATED-1]= formatTimestamp_(now);
      tkRow[TK.UPDATED_BY-1]  = data.voidedBy || '';
      tkRow[TK.NOTES-1]       = 'Void Reason: ' + data.voidReason;
      var nextRow = closedSh.getLastRow() + 1;
      closedSh.getRange(nextRow, TK_DATA_COL, 1, TK_COLS).setValues([tkRow]);
      applyDataRowBorders_(closedSh, nextRow);
      // Grey out the void row
      closedSh.getRange(nextRow, TK_DATA_COL, 1, TK_COLS)
        .setBackground('#EEEEEE').setFontColor('#9E9E9E');
    }

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
