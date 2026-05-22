// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ACCESS CONTROL — CSC Maintenance Tracker v3.1                          ║
// ║  Container Supply Co. — Garden Grove, CA                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝

var SH_MANAGER_ACCESS = '👔 Manager Access';

var ADMIN_EMAILS = [
  'izuniga@cscmfg.com',
  'enahabedian@cscmfg.com',
  'mmagallanes@cscmfg.com',
  'mjmarrujo@cscmfg.com',
];

// ═══════════════════════════════════════════════════════════════════════════
//  GET MANAGER ACCESS LIST
//  Col A: Manager Name
//  Col B: Reserved / unused
//  Col C: Manager Email
//  Col D: Approved Team Emails (comma-separated)
//  Col E: Owned Departments (comma-separated) — ITEM 8C
//         e.g. "METAL, PLASTICS" — used for dept-based transfer email routing
// ═══════════════════════════════════════════════════════════════════════════
function getManagerConfig() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SH_MANAGER_ACCESS);
  if (!sheet || sheet.getLastRow() < 4) return [];

  var numCols = Math.max(5, sheet.getLastColumn());
  var data = sheet.getRange(4, 1, sheet.getLastRow() - 3, numCols).getValues();
  var mgrs = [];
  data.forEach(function(r) {
    var name  = String(r[0] || '').trim();
    var email = String(r[2] || '').trim();
    if (!name && !email) return;
    mgrs.push({
      managerName:  name,
      managerEmail: email,
      teamEmails:   String(r[3] || '').trim(),
      ownedDepts:   String(r[4] || '').trim()   // ITEM 8C — col E
    });
  });
  return mgrs;
}

// ═══════════════════════════════════════════════════════════════════════════
//  GET TEAM EMAILS FOR MANAGER
// ═══════════════════════════════════════════════════════════════════════════
function getTeamEmailsForManager(managerEmail) {
  var emailLc = (managerEmail || '').toLowerCase().trim();
  var mgrs = getManagerConfig();
  for (var i = 0; i < mgrs.length; i++) {
    if (mgrs[i].managerEmail.toLowerCase().trim() === emailLc) {
      return mgrs[i].teamEmails
        .split(',')
        .map(function(e){ return e.trim(); })
        .filter(function(e){ return e !== ''; });
    }
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════
//  GET CURRENT USER INFO
// ═══════════════════════════════════════════════════════════════════════════
function getCurrentUserInfo() {
  var email   = Session.getActiveUser().getEmail() || '';
  var emailLc = email.toLowerCase().trim();

  var isAdmin = ADMIN_EMAILS.some(function(a) {
    return a.toLowerCase().trim() === emailLc;
  });

  var isManager = isAdmin;
  if (!isManager) {
    try {
      getManagerConfig().forEach(function(m) {
        if (m.managerEmail.toLowerCase().trim() === emailLc) isManager = true;
      });
    } catch(e) {}
  }

  var authorizedTabs = [];
  if (isAdmin) {
    authorizedTabs.push({ tabName: '', role: 'admin' });
  } else if (isManager) {
    authorizedTabs.push({ tabName: '', role: 'manager' });
  }

  return {
    email:          email,
    isAdmin:        isAdmin,
    isManager:      isManager,
    authorizedTabs: authorizedTabs
  };
}

function getCurrentUserRole() {
  var userInfo = getCurrentUserInfo();
  if (userInfo.isAdmin)   return 'admin';
  if (userInfo.isManager) return 'manager';
  return 'tech';
}

function enforceTabVisibility() {
  // No tab hiding — role-based restrictions enforced at form/action level
}

