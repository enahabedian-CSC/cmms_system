// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Auth.gs — CSC CMMS v5.0                                                ║
// ║  Identity and role resolution.  The 👔 Manager Access tab is the sole  ║
// ║  authority on role permissions — no hard-coded logic here.              ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Role hierarchy (ascending privilege): noaccess < tech < manager < admin
var ROLES = { NOACCESS: 'noaccess', TECH: 'tech', MANAGER: 'manager', ADMIN: 'admin' };

// ═══════════════════════════════════════════════════════════════════════════════
//  getCurrentUserInfo
//  Returns the calling user's identity and resolved role.
//  Called once per page load — result passed to the frontend as JSON.
// ═══════════════════════════════════════════════════════════════════════════════

function getCurrentUserInfo() {
  var email = (Session.getActiveUser().getEmail() || '').toLowerCase().trim();
  if (!email) {
    return _noAccessPayload_('');
  }

  var admins    = getAdminEmails();
  var isAdmin   = admins.indexOf(email) > -1;
  var managers  = getManagerConfig();
  var mgrRecord = null;
  for (var i = 0; i < managers.length; i++) {
    if (managers[i].managerEmail === email) { mgrRecord = managers[i]; break; }
  }
  var isManager = !!mgrRecord;

  // Admins have full visibility across all depts regardless of Manager Access rows.
  var role = isAdmin ? ROLES.ADMIN : isManager ? ROLES.MANAGER : ROLES.NOACCESS;

  var ownedDepts = isAdmin
    ? DEPT_TRACKERS.map(function(dt) { return dt.dept; })
    : mgrRecord ? mgrRecord.ownedDepts : [];

  var displayName = mgrRecord
    ? mgrRecord.managerName
    : email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });

  return {
    email:       email,
    displayName: displayName,
    initials:    _initials_(displayName),
    role:        role,
    isAdmin:     isAdmin,
    isManager:   isManager || isAdmin,
    ownedDepts:  ownedDepts,
    teamEmails:  mgrRecord ? mgrRecord.teamEmails : ''
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  requireRole_
//  Server-side guard.  Call at the top of any google.script.run handler
//  that requires elevated access.  Throws on insufficient role so the
//  frontend withFailureHandler receives a structured error.
// ═══════════════════════════════════════════════════════════════════════════════

function requireRole_(minRole) {
  var user  = getCurrentUserInfo();
  var order = [ROLES.NOACCESS, ROLES.TECH, ROLES.MANAGER, ROLES.ADMIN];
  var have  = order.indexOf(user.role);
  var need  = order.indexOf(minRole);
  if (have < need) {
    throw new Error('UNAUTHORIZED: requires ' + minRole + ', caller has ' + user.role);
  }
  return user;
}

function requireAdmin_()   { return requireRole_(ROLES.ADMIN);   }
function requireManager_() { return requireRole_(ROLES.MANAGER); }

// ═══════════════════════════════════════════════════════════════════════════════
//  requireDeptAccess_
//  Throws if the calling user is not admin and does not own the given dept.
// ═══════════════════════════════════════════════════════════════════════════════

function requireDeptAccess_(dept) {
  var user = requireManager_();
  if (user.isAdmin) return user;
  var norm = normalizeDept(dept);
  if (user.ownedDepts.indexOf(norm) === -1) {
    throw new Error('UNAUTHORIZED: you do not have access to dept ' + norm);
  }
  return user;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _noAccessPayload_(email) {
  return {
    email:       email,
    displayName: email || 'Unknown',
    initials:    '?',
    role:        ROLES.NOACCESS,
    isAdmin:     false,
    isManager:   false,
    ownedDepts:  [],
    teamEmails:  ''
  };
}

function _initials_(name) {
  return String(name || '?').trim().split(/\s+/)
    .map(function(w) { return w[0] || ''; })
    .join('').substring(0, 2).toUpperCase() || '?';
}
