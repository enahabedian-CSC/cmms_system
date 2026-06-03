// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  SYSTEM SETTINGS — CSC Maintenance Tracker v3.2                        ║
// ║  Server-side functions for SettingsPanel.html                           ║
// ╚══════════════════════════════════════════════════════════════════════════╝

function openSystemSettings() {
  var userInfo  = getCurrentUserInfo();
  var isAdmin   = userInfo.isAdmin;
  var isManager = isAdmin;
  if (!isAdmin) {
    (userInfo.authorizedTabs || []).forEach(function(t) {
      if (t.role === 'manager' || t.role === 'admin') isManager = true;
    });
  }
  if (!isAdmin && !isManager) {
    SpreadsheetApp.getUi().alert('⚠️ Access Denied',
      'System Settings requires Manager or Admin access.',
      SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  var html = HtmlService.createHtmlOutputFromFile('SettingsPanel').setWidth(1300).setHeight(980);
  SpreadsheetApp.getUi().showModalDialog(html, '⚙️ System Settings');
}

function getSystemSettingsData() {
  var cfg      = getConfig();
  var userInfo = getCurrentUserInfo();
  var mgrs     = getManagerConfig();
  var lists    = getAllDataLists();

  return {
    userInfo:  userInfo,

    // Company & Documents
    companyName:    cfg['Company Name']            || 'Container Supply Co.',
    location:       cfg['Location']                || 'Garden Grove, CA',
    docNoTicket:    cfg['Doc No (Ticket Form)']    || 'FRM-040-001',
    docNoService:   cfg['Doc No (Service Report)'] || 'FRM-040-002',
    docNoHoldTag:   cfg['Doc No (Hold Tag)']       || 'FRM-029-002',
    revision:       cfg['Revision']                || '0',

    // System Config
    managerEmails:  cfg['Manager Email(s)']           || '',
    pmSystemUrl:    cfg['PM System URL']              || '',
    monitoringFreq: cfg['Monitoring Frequency']       || '7',
    extSyncEnabled: cfg['External Sync Enabled']      || 'Y',
    extTicketUrl:   cfg['External Ticket Source URL'] || '',
    extTicketTab:   cfg['External Ticket Tab Name']   || 'Service Tickets',
    equipSourceUrl: cfg['Equipment List Source URL']  || '',

    // Equipment Hold Register (external)
    equipHoldUrl:   cfg['Equipment Hold Register URL']      || '',
    equipHoldTab:   cfg['Equipment Hold Register Tab Name'] || 'FRM-029-001 Equipment Hold Register',

    // Routing Rules
    routingRules: parseRoutingRules_(cfg['Routing Override Rules'] || ''),

    // Notification Settings
    senderName:   cfg['Sender Display Name'] || 'CSC Maintenance Tracker',
    adminEmails:  cfg['Admin Emails']        || '',
    notifRules:   parseNotifRules_(cfg['Notification Rules'] || ''),
    sqfDocuments: parseSqfDocuments_(cfg['SQF Documents'] || ''),

    // Manager Access rows
    managers: mgrs,

    // Data lists summary
    listNames: Object.keys(lists).map(function(k) {
      return { name: k, count: lists[k].length };
    }),

    // Dept Mapping
    deptMapping: getDeptMapping_(),

    // Tech Directory
    techDirectory: getTechDirectory_(),
  };
}

function saveSystemSettings(data) {
  try {
    var userInfo = getCurrentUserInfo();
    if (!userInfo.isAdmin) return { success: false, error: 'Admin access required.' };

    // Company & Documents
    if (data.companyName    !== undefined) setConfigValue('Company Name',            data.companyName);
    if (data.location       !== undefined) setConfigValue('Location',                data.location);
    if (data.docNoTicket    !== undefined) setConfigValue('Doc No (Ticket Form)',     data.docNoTicket);
    if (data.docNoService   !== undefined) setConfigValue('Doc No (Service Report)', data.docNoService);
    if (data.docNoHoldTag   !== undefined) setConfigValue('Doc No (Hold Tag)',        data.docNoHoldTag);
    if (data.revision       !== undefined) setConfigValue('Revision',                data.revision);

    // System Config
    if (data.managerEmails  !== undefined) setConfigValue('Manager Email(s)',           data.managerEmails);
    if (data.pmSystemUrl    !== undefined) setConfigValue('PM System URL',              data.pmSystemUrl);
    if (data.monitoringFreq !== undefined) setConfigValue('Monitoring Frequency',       data.monitoringFreq);
    if (data.extSyncEnabled !== undefined) setConfigValue('External Sync Enabled',      data.extSyncEnabled);
    if (data.extTicketUrl   !== undefined) setConfigValue('External Ticket Source URL', data.extTicketUrl);
    if (data.extTicketTab   !== undefined) setConfigValue('External Ticket Tab Name',   data.extTicketTab);
    if (data.equipSourceUrl !== undefined) setConfigValue('Equipment List Source URL',  data.equipSourceUrl);

    // Equipment Hold Register
    if (data.equipHoldUrl   !== undefined) setConfigValue('Equipment Hold Register URL',      data.equipHoldUrl);
    if (data.equipHoldTab   !== undefined) setConfigValue('Equipment Hold Register Tab Name', data.equipHoldTab);

    // Routing Rules
    if (data.routingRules   !== undefined) setConfigValue('Routing Override Rules', JSON.stringify(data.routingRules));

    // Notification Settings
    if (data.senderName     !== undefined) setConfigValue('Sender Display Name', data.senderName);
    if (data.adminEmails    !== undefined) setConfigValue('Admin Emails',         data.adminEmails);
    if (data.notifRules     !== undefined) setConfigValue('Notification Rules',   data.notifRules);
    if (data.sqfDocuments   !== undefined) setConfigValue('SQF Documents',        data.sqfDocuments);

    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}


function saveManagerAccess(rows) {
  try {
    var userInfo = getCurrentUserInfo();
    if (!userInfo.isAdmin) return { success: false, error: 'Admin access required.' };

    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SH.MANAGER_ACCESS);
    if (!sheet) return { success: false, error: 'Manager Access tab not found.' };

    // Data starts at row 4 (rows 1-3 are title/instructions/header)
    // Col A=Name, B=blank, C=Manager Email, D=Team Emails, E=Owned Depts
    var startRow = 4;
    if (sheet.getLastRow() >= startRow) {
      sheet.getRange(startRow, 1, sheet.getLastRow() - startRow + 1, 5).clearContent();
    }

    var writeRow = startRow;
    rows.forEach(function(row) {
      if (!row.managerName && !row.managerEmail) return;
      sheet.getRange(writeRow, 1, 1, 5).setValues([[
        row.managerName  || '',   // Col A
        '',                       // Col B — blank
        row.managerEmail || '',   // Col C
        row.teamEmails   || '',   // Col D
        row.ownedDepts   || ''    // Col E
      ]]);
      writeRow++;
    });

    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

function getDataListForEdit(listName) { return getDataList(listName); }

function saveDataList(listName, items) {
  try {
    var userInfo = getCurrentUserInfo();
    if (!userInfo.isAdmin) return { success: false, error: 'Admin access required.' };
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SH.DATA_VALID);
    if (!sheet) return { success: false, error: 'Data Lists tab not found.' };
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var col = -1;
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim().toLowerCase() === listName.toLowerCase()) { col = i + 1; break; }
    }
    if (col < 0) return { success: false, error: 'List "' + listName + '" not found.' };
    var maxRows = Math.max(sheet.getLastRow(), items.length + 1);
    sheet.getRange(2, col, maxRows - 1, 1).clearContent();
    var vals = items.filter(function(v){ return v && v.trim(); }).map(function(v){ return [v.trim()]; });
    if (vals.length > 0) sheet.getRange(2, col, vals.length, 1).setValues(vals);
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

function settingsRefreshDashboard() {
  try { buildDashboard(); return { success: true }; }
  catch(e) { return { success: false, error: e.message }; }
}

function settingsSyncEquipment() {
  try { syncEquipmentInventory(); return { success: true }; }
  catch(e) { return { success: false, error: e.message }; }
}

function saveDeptMapping(rows) {
  try {
    var userInfo = getCurrentUserInfo();
    if (!userInfo.isAdmin) return { success: false, error: 'Admin access required.' };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SH.DEPT_MAP);
    if (!sh) return { success: false, error: '📋 Dept Map tab not found. Please create it first.' };

    if (sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow()-1, 2).clearContent();
    }

    var writeRow = 2;
    rows.forEach(function(r) {
      var src  = String(r.source||'').trim().toUpperCase();
      var dest = String(r.dest||'').trim().toUpperCase();
      if (!src || !dest) return;
      sh.getRange(writeRow, 1, 1, 2).setValues([[src, dest]])
        .setFontFamily('Arial').setFontSize(10);
      writeRow++;
    });

    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  PARSERS
// ═══════════════════════════════════════════════════════════════════════════
function parseRoutingRules_(json) {
  if (!json) return [
    { keyword:'ELECTRICAL', matchOn:'PROBLEM_TYPE', routeTo:'ELECTRICAL' },
    { keyword:'FACILITY',   matchOn:'EQUIP_DESC',   routeTo:'FACILITIES' }
  ];
  try { return JSON.parse(json) || []; } catch(e) { return []; }
}

function parseNotifRules_(json) {
  if (!json) return {};
  try { return JSON.parse(json) || {}; } catch(e) { return {}; }
}

function parseSqfDocuments_(json) {
  if (!json) return [];
  try { return JSON.parse(json) || []; } catch(e) { return []; }
}

// ═══════════════════════════════════════════════════════════════════════════
//  TECH DIRECTORY
// ═══════════════════════════════════════════════════════════════════════════
function getTechDirectory_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('👷 Tech Directory');
    if (!sh || sh.getLastRow() < 2) return [];
    return sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues()
      .filter(function(r) { return r[0]; })
      .map(function(r) {
        return {
          techName:    String(r[0] || ''),
          techEmail:   String(r[1] || ''),
          dept:        String(r[2] || ''),
          managerName: String(r[3] || ''),
          active:      String(r[4] || 'Y')
        };
      });
  } catch(e) {
    Logger.log('getTechDirectory_ error: ' + e.message);
    return [];
  }
}

function saveTechDirectory(rows) {
  try {
    var userInfo = getCurrentUserInfo();
    if (!userInfo.isAdmin) return { success: false, error: 'Admin access required.' };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('👷 Tech Directory');
    if (!sh) return { success: false, error: 'Tech Directory tab not found.' };

    if (sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, 6).clearContent();
    }

    var writeRow = 2;
    rows.forEach(function(r) {
      if (!r.techName) return;
      sh.getRange(writeRow, 1, 1, 6).setValues([[
        r.techName    || '',
        r.techEmail   || '',
        r.dept        || '',
        r.managerName || '',
        r.active      || 'Y',
        ''
      ]]);
      writeRow++;
    });

    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

