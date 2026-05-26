// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Config.gs — CSC CMMS v5.0                                              ║
// ║  Single source of truth for all sheet IDs, tab names, column indices,  ║
// ║  and runtime configuration.  No other .gs file hard-codes any of        ║
// ║  these values.                                                           ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─── EXTERNAL SHEET IDs ───────────────────────────────────────────────────────
// These are the ONLY hard-coded sheet IDs in the entire codebase.
// The copy sheet is accessed via getBoundSS_() (bound script; no ID needed).
// LIVE production sheet (1yyqt0HiH...) and live standalone script (1wLnVe...)
// are NEVER read from, written to, or referenced anywhere in new code.
var EXT_SHEET_IDS = {
  EQUIP_REGISTER:   '1dlqp8jEMxxNYkIhr30tWK1yuC6FFlYTFU8Eq6EXeIps', // read-only
  EXTERNAL_TICKETS: '1F4-nPI4pkZZ933RKb2g6WBVR3JDZNgBRz8hQKGr0_4w'  // read-only
};

// ─── SHEET TAB NAME CONSTANTS ─────────────────────────────────────────────────
// Exact string match required — emoji + space + name must be identical to sheet.
var SH = {
  DASH:           '📊 System Dashboard',
  DEPT_DRILL:     '🔍 Dept Drill-Down',
  WAITING:        '⏳ Waiting Queue',
  OPEN:           '📂 Open Tickets',
  CLOSED:         '✅ Closed Tickets',
  TRACKER_EL:     '📋 Tracker — Electrical',
  TRACKER_MS:     '📋 Tracker — Machine Shop',
  TRACKER_FAC:    '📋 Tracker — Facilities',
  TRACKER_PL:     '📋 Tracker — Plastics',
  TRACKER_MTL:    '📋 Tracker — Metals',
  TRACKER_LTH:    '📋 Tracker — Litho',
  TEMP_FIX:       '🔧 Temp Fix Monitor',
  TICKET_HIST:    '📜 Ticket History',
  PARTS_NEEDED:   '🔩 Parts Needed',
  EQUIP_HOLD_LOG: '🏷️ Equipment Hold Log',
  REPORTING:      '📈 Reporting',
  RPT_DB:         '📝 Report Database',
  MASTER_LOG:     '🗄️ Master Log',
  EQUIP_INV:      '⚙️ Equipment Inventory',
  DATA_VALID:     '📋 Data Lists',
  CONFIG:         '⚙️ Configuration',
  ARCHIVE:        '🗃️ Archive',
  MANAGER_ACCESS: '👔 Manager Access',
  EQUIP_CACHE:    '⚙️ Equip Inventory Cache',
  TRANSFER_LOG:   '📋 Transfer Log',
  DEPT_MAP:       '📋 Dept Map',
  // PM forward-design: schemas in place, no UI in v1
  PM_SCHEDULES:   '📅 PM Schedules',
  PM_CHECKLIST:   '📋 PM Checklist Items',
  PM_RECURRENCES: '🔄 PM Recurrences'
};

// ─── TRACKER SHEET LAYOUT CONSTANTS ──────────────────────────────────────────
var TK_DATA_COL         = 2;   // col A = 24 px grey margin; data starts col B
var TRACKER_FROZEN      = 5;
var QUEUE_FROZEN        = 6;
var TRACKER_PRIO_BANNER = 6;
var TRACKER_PRIO_HDR    = 7;
var TRACKER_PRIO_START  = 8;   // first Priority Watch List data row
var TRACKER_PRIO_END    = 27;  // last Priority Watch List row
var TRACKER_OPEN_BANNER = 28;
var TRACKER_OPEN_HDR    = 29;
var TRACKER_OPEN_START  = 30;  // first All Open Tickets data row
var HIST_HEADER_ROW     = 5;   // Ticket History / Parts Needed / Temp Fix headers

// ─── DEPARTMENT TRACKER REGISTRY ─────────────────────────────────────────────
// Single authoritative list of dept → tracker sheet mappings.
// Used for routing, display, and trigger setup.
var DEPT_TRACKERS = [
  { key: 'EL',  name: SH.TRACKER_EL,  dept: 'ELECTRICAL',   color: '#1A237E' },
  { key: 'MS',  name: SH.TRACKER_MS,  dept: 'MACHINE SHOP', color: '#4A4A4A' },
  { key: 'FAC', name: SH.TRACKER_FAC, dept: 'FACILITIES',   color: '#263238' },
  { key: 'PL',  name: SH.TRACKER_PL,  dept: 'PLASTICS',     color: '#0D47A1' },
  { key: 'MTL', name: SH.TRACKER_MTL, dept: 'METALS',       color: '#37474F' },
  { key: 'LTH', name: SH.TRACKER_LTH, dept: 'LITHO',        color: '#1B2838' }
];

// Maps internal canonical dept names → ticket number prefix codes.
// New internal submissions use these; external-import tickets retain their
// original code for idempotency.  Legacy external codes kept for reference.
var INTERNAL_DEPT_CODES = {
  'ELECTRICAL':   'EL',
  'MACHINE SHOP': 'MS',
  'FACILITIES':   'FAC',
  'PLASTICS':     'PL',
  'METALS':       'MTL',
  'LITHO':        'LTH'
};

// Legacy external-source dept codes (from ⚙️ Configuration via Dept Map).
// Retained for ticket number generation from external-import tickets.
var LEGACY_DEPT_CODES = {
  'METAL': '001', 'PLASTIC': '003', 'LITHO': '004',
  'PLASTIC DEC': '006', 'QA': '007', 'M/S': '008',
  'S/R': '009', 'SALES': '030', 'G&A': '031'
};

// ─── MASTER LOG — 35 columns ──────────────────────────────────────────────────
var ML = {
  ROW_ID:1,         TICKET_NO:2,      TIMESTAMP:3,       ACTION:4,
  STATUS:5,         DEPT:6,           BUILDING_ZONE:7,   EQUIP_TYPE:8,
  EQUIP_CODE:9,     SPECIFIC_EQUIP:10, DOWNTIME_TYPE:11, PRIORITY:12,
  DESCRIPTION:13,   ASSIGNED_TO:14,   EST_HOURS:15,      ACTUAL_HOURS:16,
  DATE_OPENED:17,   DATE_COMPLETED:18, DATE_CLOSED:19,   CORRECTIVE_ACT:20,
  ROOT_CAUSE:21,    WORK_SUMMARY:22,  FIX_TYPE:23,       TEMP_FIX_FLAG:24,
  PARTS_NEEDED:25,  PARTS_STATUS:26,  EQUIP_TAG_STATUS:27, VERIFIED_BY:28,
  VERIFIED_DATE:29, ADDED_BY:30,      UPDATED_BY:31,     NOTES:32,
  PROBLEM_TYPE:33,  TRACKER_GROUP:34, LINE_NO:35
};
var ML_COLS = 35;
var ML_HEADERS = [
  'Row ID','Ticket #','Timestamp','Action','Status','Department',
  'Building / Zone','Equipment Type','Equipment Code','Equipment Description',
  'Downtime Type','Priority','Description','Assigned To','Est Hours',
  'Actual Hours','Date Opened','Date Completed','Date Closed','Corrective Action',
  'Root Cause','Work Summary','Fix Type','Temp Fix Flag','Parts Needed Flag',
  'Parts Status','Equip Tag Status','Verified By','Verified Date','Added By',
  'Updated By','Notes','Problem Type','Tracker Group','Line #'
];

// ─── TRACKER / QUEUE — 26 columns (physical col B = index 1 in TK object) ────
// TK indices are 1-based offsets from col B.  On the sheet: sheet col = TK.x + 1.
var TK = {
  TICKET_NO:1,    STATUS:2,        PRIORITY:3,      DEPT:4,
  BUILDING_ZONE:5, EQUIP_TYPE:6,   EQUIP_CODE:7,    SPECIFIC_EQUIP:8,
  DOWNTIME_TYPE:9, PROBLEM_TYPE:10, DESCRIPTION:11, LINE_NO:12,
  ASSIGNED_TO:13, EST_HOURS:14,    ACTUAL_HOURS:15, DATE_OPENED:16,
  LAST_UPDATED:17, FIX_TYPE:18,    TEMP_FIX_FLAG:19, PARTS_NEEDED:20,
  PARTS_STATUS:21, VERIFIED_BY:22, VERIFIED_DATE:23, ADDED_BY:24,
  UPDATED_BY:25,  NOTES:26
};
var TK_COLS = 26;
var TK_HEADERS = [
  'Ticket #','Ticket Status','Priority','Department','Building / Zone',
  'Equipment Type','Equip Code','Equipment Description','Downtime Type',
  'Problem Type','Problem Description','Line #','Assigned To','Est Hrs',
  'Act Hrs','Date Opened','Last Updated','Fix Type','Temp Fix','Parts Needed',
  'Parts Status','Verified By','Verified Date','Added By','Updated By','Notes'
];

// ─── TICKET HISTORY — 8 columns ──────────────────────────────────────────────
var TH = {
  HIST_ID:1, TICKET_NO:2, TIMESTAMP:3, EVENT_TYPE:4,
  STATUS_FROM:5, STATUS_TO:6, PERFORMED_BY:7, NOTES:8
};
var TH_COLS = 8;
var TH_HEADERS = [
  'History ID','Ticket #','Timestamp','Event Type',
  'Status From','Status To','Performed By','Notes'
];

// Canonical TH event vocabulary — always use these constants, never raw strings.
// Divergence from ML_ACTIONS is intentional (different tables, different granularity).
// See docs/system-map.md §5 for the full reconciliation note.
var TH_EVENTS = {
  CREATED:          'CREATED',
  UPDATED:          'UPDATED',
  ASSIGNED:         'ASSIGNED',
  COMPLETED:        'COMPLETED',
  VERIFIED:         'VERIFIED',
  CLOSED:           'CLOSED',
  VOIDED:           'VOIDED',
  TAGGED:           'EQUIPMENT TAGGED',
  TAG_CLEARED:      'TAG CLEARED',
  PARTS_REQUESTED:  'PARTS REQUESTED',
  PARTS_UPDATED:    'PARTS UPDATED',
  TEMP_FIX:         'TEMP FIX FLAGGED',
  TEMP_FIX_CLEARED: 'TEMP FIX CLEARED',
  TEMP_FIX_INSPECT: 'TEMP FIX INSPECTED',
  MOVED_TO_WAITING: 'MOVED TO WAITING',
  MOVED_TO_OPEN:    'MOVED TO OPEN',
  TRANSFERRED:      'TRANSFERRED',
  REROUTED:         'REROUTED',
  DIRECT_EDIT:      'DIRECT EDIT',
  SERVICE_REPORT:   'Service Report',
  PENDING_VERIFY:   'PENDING VERIFICATION'
};

// Canonical ML action vocabulary.
var ML_ACTIONS = {
  TICKET_CREATED:       'TICKET CREATED',
  TICKET_CREATED_CRIT:  'TICKET CREATED — CRITICAL (bypass)',
  EXTERNAL_IMPORT:      'EXTERNAL IMPORT',
  UPDATED:              'UPDATED',
  UPDATED_REROUTED:     'UPDATED + REROUTED',
  MANAGER_REVIEW:       'MANAGER REVIEW',
  MANAGER_ACTION:       'MANAGER ACTION',       // caller appends ' — {STATUS}'
  MANAGER_VERIFIED:     'MANAGER VERIFIED — CLOSED',
  REASSIGNED:           'REASSIGNED',
  DIRECT_EDIT:          'DIRECT EDIT',           // caller appends ' — {FIELD}'
  VOIDED:               'VOIDED',
  CLOSED_EDIT:          'CLOSED TICKET EDIT',
  SERVICE_REPORT:       'SERVICE REPORT SUBMITTED',
  REPORT_VERIFIED:      'REPORT VERIFIED',
  PARTS_STATUS_UPDATED: 'PARTS STATUS UPDATED',
  EQUIP_TAGGED:         'EQUIPMENT TAGGED',
  EQUIP_CLEARED:        'EQUIPMENT CLEARED',
  TEMP_FIX_INSPECTED:   'TEMP FIX INSPECTED',
  TEMP_FIX_ALERT:       'TEMP FIX REMINDER SENT',
  TEMP_FIX_PAST_DUE:    'TEMP FIX PAST DUE ALERT',
  EQUIP_CACHE_REFRESH:  'EQUIP CACHE REFRESHED',
  MONTH_ROLLOVER:       'MONTH ROLLOVER',
  MONTHLY_BACKUP:       'MONTHLY BACKUP COMPLETED',
  DEPT_TRANSFER:        'DEPT TRANSFER'
};

// ─── TEMP FIX MONITOR — 17 columns ───────────────────────────────────────────
var TF = {
  TEMP_ID:1,      TICKET_NO:2,     EQUIP_CODE:3,    SPECIFIC_EQUIP:4,
  DEPT:5,         BUILDING_ZONE:6, DATE_FLAGGED:7,  DESCRIPTION:8,
  TEMP_FIX_DESC:9, FREQ_DAYS:10,   LAST_INSPECTED:11, NEXT_DUE:12,
  STATUS:13,      FLAGGED_BY:14,   CLEARED_BY:15,   CLEARED_DATE:16,
  NOTES:17
};
var TF_COLS = 17;
var TF_HEADERS = [
  'Temp ID','Ticket #','Equip Code','Specific Equip','Department',
  'Building / Zone','Date Flagged','Description','Temp Fix Description',
  'Frequency (Days)','Last Inspected','Next Due','Status',
  'Flagged By','Cleared By','Cleared Date','Notes'
];

// ─── PARTS NEEDED — 12 columns ───────────────────────────────────────────────
var PN = {
  PART_ID:1,        PART_DESC:2,      TICKET_NO:3,      EQUIP_CODE:4,
  SPECIFIC_EQUIP:5, DEPT:6,           DATE_REQUESTED:7, PARTS_STATUS:8,
  DATE_ORDERED:9,   DATE_RECEIVED:10, ORDERED_BY:11,    NOTES:12
};
var PN_COLS = 12;
var PN_HEADERS = [
  'Part ID','Part Description','Ticket #','Equip Code','Specific Equip',
  'Department','Date Requested','Parts Status','Date Ordered',
  'Date Received','Ordered By','Notes'
];

// ─── EQUIPMENT HOLD LOG — 14 columns ─────────────────────────────────────────
var EHL = {
  TAG_ID:1,        TICKET_NO:2,     EQUIP_CODE:3,    SPECIFIC_EQUIP:4,
  DEPT:5,          BUILDING_ZONE:6, TAG_TYPE:7,      DATE_TAGGED:8,
  TAGGED_BY:9,     REASON:10,       EQUIP_STATUS:11, CLEARED_BY:12,
  CLEARED_DATE:13, NOTES:14
};
var EHL_COLS = 14;
var EHL_HEADERS = [
  'Tag ID','Ticket #','Equip Code','Specific Equip','Department',
  'Building / Zone','Tag Type','Date Tagged','Tagged By','Reason',
  'Equip Status','Cleared By','Cleared Date','Notes'
];

// ─── TRANSFER LOG — 8 columns ─────────────────────────────────────────────────
var TL = {
  TRANSFER_ID:1, TICKET_NO:2,    TIMESTAMP:3,       FROM_DEPT:4,
  TO_DEPT:5,     TRANSFERRED_BY:6, REASON:7,        EMAIL_SENT:8
};
var TL_COLS = 8;
var TL_HEADERS = [
  'Transfer ID','Ticket #','Timestamp','From Dept',
  'To Dept','Transferred By','Reason','Email Sent'
];

// ─── REPORT DATABASE — 27 columns ────────────────────────────────────────────
var RDB = {
  REPORT_ID:1,    TICKET_NO:2,    DATE:3,          DEPT:4,
  BUILDING_ZONE:5, EQUIP_TYPE:6,  EQUIP_CODE:7,    SPECIFIC_EQUIP:8,
  PROBLEM_DESC:9, ROOT_CAUSE:10,  CORRECTIVE_ACT:11, PREVENTIVE_ACT:12,
  WORK_SUMMARY:13, FIX_TYPE:14,   TEMP_FIX_FLAG:15, PARTS_USED:16,
  LABOR_HOURS:17, ADDED_BY:18,    COMPLETED_BY:19, VERIFIED_BY:20,
  VERIFIED_DATE:21, UPDATED_BY:22, PRIORITY:23,    DOWNTIME_TYPE:24,
  IMAGE_LINKS:25, PDF_LINK:26,    NOTES:27
};
var RDB_COLS = 27;
var RDB_HEADERS = [
  'Report ID','Ticket #','Date','Department','Building / Zone','Equipment Type',
  'Equipment Code','Equipment Description','Problem Description','Root Cause',
  'Corrective Action','Preventive Action','Work Summary','Fix Type','Temp Fix Flag',
  'Parts Used','Labor Hours','Added By','Completed By','Verified By','Verified Date',
  'Updated By','Priority','Downtime Type','Image Links','PDF Link','Notes'
];

// ─── PM FORWARD-DESIGN SCHEMAS (v1: no UI; schema and nav placeholder only) ──
var PM_SCHED_HEADERS = [
  'PM ID','Equipment Code','Equipment Desc','Department','Schedule Name',
  'Frequency Type','Frequency Value','Cron Expression','Assigned To',
  'Est Duration (hrs)','Last Completed','Next Due','Status',
  'Created By','Created Date','Notes'
];
var PM_CHECKLIST_HEADERS = [
  'Item ID','PM ID','Step No','Task Description','Expected Result',
  'Required Tool','Safety Note','Created By','Notes'
];
var PM_RECURRENCE_HEADERS = [
  'Recurrence ID','PM ID','Equipment Code','Dept','Rule Type',
  'Rule Value','Start Date','End Date','Active','Notes'
];

// ═══════════════════════════════════════════════════════════════════════════════
//  BOUND SPREADSHEET
// ═══════════════════════════════════════════════════════════════════════════════

var _boundSS_ = null;

function getBoundSS_() {
  if (!_boundSS_) _boundSS_ = SpreadsheetApp.getActiveSpreadsheet();
  return _boundSS_;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RUNTIME CONFIG READER
//  Reads ⚙️ Configuration cols C (key) + D (value), rows 2–30.
//  New config keys added in Step 1:
//    'System Admins'         — comma-separated admin emails (replaces hard-coded list)
//    'Backup Drive Folder ID' — Drive folder for monthly backup copies
// ═══════════════════════════════════════════════════════════════════════════════

var _configCache_ = null;

function getConfig() {
  if (_configCache_) return _configCache_;
  try {
    var sh  = getBoundSS_().getSheetByName(SH.CONFIG);
    if (!sh) return {};
    var cfg = {};
    sh.getRange('C2:D30').getValues().forEach(function(r) {
      if (r[0]) cfg[String(r[0]).trim()] = r[1];
    });
    _configCache_ = cfg;
    return cfg;
  } catch (e) {
    Logger.log('getConfig error: ' + e.message);
    return {};
  }
}

function getConfigValue(key) {
  return getConfig()[key] || '';
}

function setConfigValue(key, value) {
  var sh = getBoundSS_().getSheetByName(SH.CONFIG);
  if (!sh) return;
  var data = sh.getRange('C2:C30').getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      sh.getRange(i + 2, 4).setValue(value);
      _configCache_ = null;
      return;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DEPARTMENT MAPPING
//  Reads 📋 Dept Map.  Applies identity mappings for ELECTRICAL and FACILITIES
//  (missing from sheet — flagged for manual addition).  Normalizes the
//  'Faciltiies' typo from Arnel Nagel's Manager Access row.
// ═══════════════════════════════════════════════════════════════════════════════

var _deptMappingCache_ = null;

function getDeptMapping_() {
  if (_deptMappingCache_) return _deptMappingCache_;
  try {
    var sh  = getBoundSS_().getSheetByName(SH.DEPT_MAP);
    var map = {
      // Identity mappings for the 6 canonical dept names.
      // ELECTRICAL and FACILITIES are missing from the sheet — listed here
      // until a manual sheet update adds them.
      'ELECTRICAL':   'ELECTRICAL',
      'FACILITIES':   'FACILITIES',
      'LITHO':        'LITHO',
      'MACHINE SHOP': 'MACHINE SHOP',
      'METALS':       'METALS',
      'PLASTICS':     'PLASTICS',
      // Typo in Arnel Nagel's Manager Access row (col E).
      'FACILTIIES':   'FACILITIES'
    };
    if (sh && sh.getLastRow() >= 2) {
      sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function(r) {
        var src  = String(r[0] || '').trim().toUpperCase();
        var dest = String(r[1] || '').trim().toUpperCase();
        if (src && dest) map[src] = dest;
      });
    }
    _deptMappingCache_ = map;
    return map;
  } catch (e) {
    Logger.log('getDeptMapping_ error: ' + e.message);
    return {};
  }
}

// Normalize any raw dept string to a canonical internal dept name.
function normalizeDept(raw) {
  var d   = String(raw || '').trim().toUpperCase();
  var map = getDeptMapping_();
  return map[d] || d;
}

// Two-pass tracker routing: dept map first, then keyword override rules.
// Routing override rules stored as JSON in ⚙️ Configuration key
// 'Routing Override Rules'.  Default rules handle ELECTRICAL and FACILITY
// keyword cases when no config override is present.
function getTrackerForDept(dept, problemType, equipType) {
  var map = getDeptMapping_();
  var d   = String(dept || '').toUpperCase().trim();
  var dg  = map[d] || d;
  var pt  = String(problemType || '').toUpperCase().trim();
  var et  = String(equipType   || '').toUpperCase().trim();

  var rules = [];
  try { rules = JSON.parse(getConfigValue('Routing Override Rules') || '[]'); } catch (e) { rules = []; }
  if (!rules.length) {
    rules = [
      { keyword: 'ELECTRICAL', matchOn: 'PROBLEM_TYPE', routeTo: 'ELECTRICAL' },
      { keyword: 'FACILITY',   matchOn: 'EQUIP_DESC',   routeTo: 'FACILITIES' }
    ];
  }
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    var kw   = String(rule.keyword || '').toUpperCase().trim();
    if (!kw) continue;
    var haystack = String(rule.matchOn || '').toUpperCase() === 'EQUIP_DESC' ? et : pt;
    if (haystack.indexOf(kw) > -1) {
      var dest = String(rule.routeTo || '').toUpperCase();
      for (var j = 0; j < DEPT_TRACKERS.length; j++) {
        if (DEPT_TRACKERS[j].dept === dest) return DEPT_TRACKERS[j].name;
      }
    }
  }

  for (var k = 0; k < DEPT_TRACKERS.length; k++) {
    if (DEPT_TRACKERS[k].dept === dg) return DEPT_TRACKERS[k].name;
  }
  return SH.TRACKER_MS; // fallback: Machine Shop (matches legacy behavior)
}

function getDeptTrackerName_(dept) {
  var norm = normalizeDept(dept);
  for (var i = 0; i < DEPT_TRACKERS.length; i++) {
    if (DEPT_TRACKERS[i].dept === norm) return DEPT_TRACKERS[i].name;
  }
  return null;
}

function isTrackerSheet_(sheetName) {
  return DEPT_TRACKERS.some(function(dt) { return dt.name === sheetName; });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MANAGER ACCESS READER
//  Reads 👔 Manager Access — sole authority on role permissions.
//  Admin emails come from ⚙️ Configuration key 'System Admins' (no hard-coding).
//  Normalizes 'Faciltiies' typo in owned-dept strings via normalizeDept().
// ═══════════════════════════════════════════════════════════════════════════════

var _managerConfigCache_ = null;

function getManagerConfig() {
  if (_managerConfigCache_) return _managerConfigCache_;
  try {
    var sheet = getBoundSS_().getSheetByName(SH.MANAGER_ACCESS);
    if (!sheet || sheet.getLastRow() < 4) return [];
    var numCols = Math.max(5, sheet.getLastColumn());
    var data    = sheet.getRange(4, 1, sheet.getLastRow() - 3, numCols).getValues();
    var mgrs    = [];
    data.forEach(function(r) {
      var name  = String(r[0] || '').trim();
      var email = String(r[2] || '').trim().toLowerCase();
      if (!name && !email) return;
      var normDepts = String(r[4] || '').split(',').map(function(d) {
        return normalizeDept(d.trim());
      }).filter(function(d) { return d !== ''; });
      mgrs.push({
        managerName:  name,
        managerEmail: email,
        teamEmails:   String(r[3] || '').trim(),
        ownedDepts:   normDepts
      });
    });
    _managerConfigCache_ = mgrs;
    return mgrs;
  } catch (e) {
    Logger.log('getManagerConfig error: ' + e.message);
    return [];
  }
}

// Returns array of lowercase email strings from ⚙️ Configuration 'System Admins'.
function getAdminEmails() {
  var raw = getConfigValue('System Admins');
  if (!raw) return [];
  return String(raw).split(',').map(function(e) {
    return e.trim().toLowerCase();
  }).filter(function(e) { return e !== ''; });
}

// Returns manager emails for a given dept (post-normalization).
function getManagersForDept_(dept) {
  var norm   = normalizeDept(dept);
  var emails = [];
  getManagerConfig().forEach(function(m) {
    if (m.ownedDepts.indexOf(norm) >= 0 && m.managerEmail) {
      emails.push(m.managerEmail);
    }
  });
  return emails;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TECH DIRECTORY READER
//  Legacy code reads technician list from 📋 Data Lists col 'Technicians'.
//  The prompt references a '👷 Tech Directory' tab that does not yet exist
//  in the sheet.  This function reads Data Lists until that tab is added.
// ═══════════════════════════════════════════════════════════════════════════════

function getTechDirectory() {
  try {
    var sh = getBoundSS_().getSheetByName(SH.DATA_VALID);
    if (!sh || sh.getLastRow() < 2) return [];
    var hdrs    = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var techCol = -1;
    for (var i = 0; i < hdrs.length; i++) {
      if (String(hdrs[i]).trim().toUpperCase() === 'TECHNICIANS') { techCol = i; break; }
    }
    if (techCol === -1) return [];
    return sh.getRange(2, techCol + 1, sh.getLastRow() - 1, 1).getValues()
      .map(function(r) { return String(r[0] || '').trim(); })
      .filter(function(v) { return v !== ''; });
  } catch (e) {
    Logger.log('getTechDirectory error: ' + e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DATA LISTS READER
//  Reads 📋 Data Lists tab by column header name.
// ═══════════════════════════════════════════════════════════════════════════════

var _dataListsCache_ = null;

function getAllDataLists() {
  if (_dataListsCache_) return _dataListsCache_;
  try {
    var sh = getBoundSS_().getSheetByName(SH.DATA_VALID);
    if (!sh || sh.getLastRow() < 1) { _dataListsCache_ = {}; return {}; }
    var hdrs  = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var data  = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), sh.getLastColumn()).getValues();
    var lists = {};
    hdrs.forEach(function(h, col) {
      var key = String(h || '').trim();
      if (!key) return;
      lists[key] = data.map(function(r) {
        return String(r[col] || '').trim();
      }).filter(function(v) { return v !== ''; });
    });
    _dataListsCache_ = lists;
    return lists;
  } catch (e) {
    Logger.log('getAllDataLists error: ' + e.message);
    return {};
  }
}

function getDataList(name) {
  return getAllDataLists()[name] || [];
}
