// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Utilities.gs — CSC CMMS v5.0                                           ║
// ║  Pure helper functions: ID generators, timestamp formatters, string     ║
// ║  normalizers, and shared sheet write helpers.                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  ID GENERATORS
//  All IDs are deterministic from timestamp.  History ID format is canonical:
//  H-YYYYMMddHHmmss (invariant from Phase 5 spec — never H-MMddYYYY).
// ═══════════════════════════════════════════════════════════════════════════════

function generateRowId() {
  return Utilities.getUuid().substring(0, 8).toUpperCase();
}

function generateHistId() {
  return 'H-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
}

function generateTempFixId() {
  return 'TF-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
}

function generateTagId() {
  return 'TAG-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
}

function generateTransferId() {
  return 'TR-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
}

function generateReportId() {
  return 'RPT-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TICKET NUMBER GENERATOR
//  Format: MT-{deptCode}-{YYMMDD}-{seq}  where seq is zero-padded 3 digits.
//  Uses INTERNAL_DEPT_CODES for new internally-submitted tickets.
//  Falls back to LEGACY_DEPT_CODES for backward compat with external-import
//  dept strings (e.g. 'LITHO' → '004' for legacy tickets in ML).
//  Seq is 1-based and counts only tickets with the same dept+YYMM prefix.
// ═══════════════════════════════════════════════════════════════════════════════

function generateTicketNumber(dept) {
  var ss  = getBoundSS_();
  var sh  = ss.getSheetByName(SH.MASTER_LOG);
  var tz  = Session.getScriptTimeZone();
  var now = new Date();

  var deptUp   = normalizeDept(dept);
  var deptCode = INTERNAL_DEPT_CODES[deptUp];
  if (!deptCode) {
    // Fall back to legacy codes for any unmapped dept
    var legacyKey = Object.keys(LEGACY_DEPT_CODES).filter(function(k) {
      return k.toUpperCase() === String(dept || '').toUpperCase().trim();
    })[0];
    deptCode = legacyKey ? LEGACY_DEPT_CODES[legacyKey] : '000';
  }

  var yymmdd       = Utilities.formatDate(now, tz, 'yyMMdd');
  var currentYYMM  = Utilities.formatDate(now, tz, 'yyMM');
  var prefix       = 'MT-' + deptCode + '-' + yymmdd + '-';
  var monthPattern = 'MT-' + deptCode + '-' + currentYYMM;
  var max          = 0;

  if (sh && sh.getLastRow() >= 2) {
    sh.getRange(2, ML.TICKET_NO, sh.getLastRow() - 1, 1).getValues().forEach(function(r) {
      var t = String(r[0]).trim();
      if (t.indexOf(monthPattern) === 0) {
        var parts = t.split('-');
        var seq   = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(seq) && seq > max) max = seq;
      }
    });
  }
  return prefix + String(max + 1).padStart(3, '0');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TIMESTAMP / DATE FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatTimestamp_(d) {
  return Utilities.formatDate(d || new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss');
}

function formatDateStr_(d) {
  return Utilities.formatDate(d || new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STRING NORMALIZERS
//  'Buidling' typo normalization applied on read from any external data source.
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeBuildingZone(raw) {
  return String(raw || '').replace(/Buidling/gi, 'Building').trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DUAL-WRITE HELPERS
//  appendToMasterLog_ and appendToTicketHistory_ are called together for every
//  state-change action.  Neither is optional.  If one throws, the caller's
//  try/catch must surface the error — never silently swallow a partial write.
// ═══════════════════════════════════════════════════════════════════════════════

function appendToMasterLog_(params) {
  var sh = getBoundSS_().getSheetByName(SH.MASTER_LOG);
  if (!sh) throw new Error('Master Log sheet not found');
  var row = new Array(ML_COLS).fill('');
  row[ML.ROW_ID         - 1] = generateRowId();
  row[ML.TICKET_NO      - 1] = params.ticketNo      || '';
  row[ML.TIMESTAMP      - 1] = formatTimestamp_(params.now || new Date());
  row[ML.ACTION         - 1] = params.action        || '';
  row[ML.STATUS         - 1] = params.status        || '';
  row[ML.DEPT           - 1] = normalizeDept(params.dept || '');
  row[ML.BUILDING_ZONE  - 1] = normalizeBuildingZone(params.buildingZone || '');
  row[ML.EQUIP_TYPE     - 1] = params.equipType     || '';
  row[ML.EQUIP_CODE     - 1] = params.equipCode     || '';
  row[ML.SPECIFIC_EQUIP - 1] = params.specificEquip || '';
  row[ML.DOWNTIME_TYPE  - 1] = params.downtimeType  || '';
  row[ML.PRIORITY       - 1] = params.priority      || '';
  row[ML.DESCRIPTION    - 1] = params.description   || '';
  row[ML.ASSIGNED_TO    - 1] = params.assignedTo    || '';
  row[ML.EST_HOURS      - 1] = params.estHours      || '';
  row[ML.ACTUAL_HOURS   - 1] = params.actualHours   || '';
  row[ML.DATE_OPENED    - 1] = params.dateOpened    || '';
  row[ML.DATE_COMPLETED - 1] = params.dateCompleted || '';
  row[ML.DATE_CLOSED    - 1] = params.dateClosed    || '';
  row[ML.CORRECTIVE_ACT - 1] = params.correctiveAct || '';
  row[ML.ROOT_CAUSE     - 1] = params.rootCause     || '';
  row[ML.PREVENTIVE_ACT - 1] = params.preventiveAct || params.workSummary || '';
  row[ML.FIX_TYPE       - 1] = params.fixType       || '';
  row[ML.TEMP_FIX_FLAG  - 1] = params.tempFixFlag   ? 'Y' : 'N';
  row[ML.PARTS_NEEDED   - 1] = params.partsNeeded   ? 'Y' : 'N';
  row[ML.PARTS_STATUS   - 1] = params.partsStatus   || '';
  row[ML.EQUIP_TAG_STATUS-1] = params.equipTagStatus|| '';
  row[ML.VERIFIED_BY    - 1] = params.verifiedBy    || '';
  row[ML.VERIFIED_DATE  - 1] = params.verifiedDate  || '';
  row[ML.ADDED_BY       - 1] = params.addedBy       || '';
  row[ML.UPDATED_BY     - 1] = params.updatedBy     || '';
  row[ML.NOTES          - 1] = buildNotesField_(params.observations, params.notes);
  row[ML.PROBLEM_TYPE   - 1] = params.problemType   || '';
  row[ML.TRACKER_GROUP          - 1] = normalizeDept(params.dept || '');
  row[ML.LINE_NO                - 1] = params.lineNo        || '';
  row[ML.VERIFICATION_CHECKLIST - 1] = params.sqfChecklist  || '';
  row[ML.PHOTO_URL              - 1] = params.photoUrl      || '';
  // Round 7 columns (38–42)
  row[ML.JOINT_DEPTS       - 1] = params.jointDepts       || '';
  row[ML.JOINT_SIGNOFFS    - 1] = params.jointSignoffs    || '';
  row[ML.PERM_FIX_PLAN     - 1] = params.permFixPlan      || '';
  row[ML.PERM_FIX_DATE     - 1] = params.permFixDate      || '';
  row[ML.DOWNTIME_DURATION - 1] = params.downtimeDuration || '';
  sh.appendRow(row);
}

function appendToTicketHistory_(ticketNo, eventType, statusFrom, statusTo, performedBy, notes) {
  var sh = getBoundSS_().getSheetByName(SH.TICKET_HIST);
  if (!sh) throw new Error('Ticket History sheet not found');
  sh.appendRow([
    generateHistId(),
    ticketNo     || '',
    formatTimestamp_(new Date()),
    eventType    || '',
    statusFrom   || '',
    statusTo     || '',
    performedBy  || '',
    notes        || ''
  ]);
}

// Builds the Notes field using the legacy 'Observations: {x} | Notes: {y}' pattern.
function buildNotesField_(observations, notes) {
  var obs  = String(observations || '').trim();
  var note = String(notes || '').trim();
  if (obs && note)  return 'Observations: ' + obs + ' | Notes: ' + note;
  if (obs)          return 'Observations: ' + obs;
  if (note)         return note;
  return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHEET SEARCH HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

// Returns the last ML row for a ticket (most recent state), or null.
function getLatestMlRow_(ticketNo) {
  var sh = getBoundSS_().getSheetByName(SH.MASTER_LOG);
  if (!sh || sh.getLastRow() < 2) return null;
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, ML_COLS).getValues();
  var lastMatch = null;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][ML.TICKET_NO - 1]).trim() === ticketNo) lastMatch = data[i];
  }
  return lastMatch;
}

// Returns the first ML row for a ticket (original submission data).
function getOriginalMlRow_(ticketNo) {
  var sh = getBoundSS_().getSheetByName(SH.MASTER_LOG);
  if (!sh || sh.getLastRow() < 2) return null;
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, ML_COLS).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][ML.TICKET_NO - 1]).trim() === ticketNo) return data[i];
  }
  return null;
}

// Searches a sheet for a ticket number in the TK data column.
// startRow: first data row to search (avoids header/banner rows).
// Returns 1-based sheet row number, or -1 if not found.
function findTicketRowInSheet_(sh, ticketNo, startRow) {
  if (!sh || sh.getLastRow() < startRow) return -1;
  var numRows = sh.getLastRow() - startRow + 1;
  if (numRows < 1) return -1;
  var vals = sh.getRange(startRow, TK_DATA_COL, numRows, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === ticketNo) return startRow + i;
  }
  return -1;
}
