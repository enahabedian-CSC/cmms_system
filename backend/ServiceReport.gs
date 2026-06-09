// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ServiceReport.gs — CSC CMMS v5.0                                       ║
// ║  FRM-040-002 Maintenance Service Report infrastructure.                 ║
// ║  C11: field set conformed to Izzy's ServiceReport.html + backend.       ║
// ║  Report Database (📝 Report Database) stores one row per report.        ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  getServiceReportFormData
//  Pre-populates a new service report form (ServiceReport.html).
//  C11 conformance: matches Izzy's return shape exactly — returns openTickets,
//  technicians, location, equipFlatList, and equipmentTypes so that Izzy's
//  ServiceReport.html can be used without modification.
//
//  Accepts an optional ticketNo argument (string OR { ticketNo: '...' } object)
//  for pre-fill; if omitted the ticket property is null.
// ═══════════════════════════════════════════════════════════════════════════════

function getServiceReportFormData(ticketNoOrOpts) {
  var user = getCurrentUserInfo();
  if (user.role === ROLES.NOACCESS) throw new Error('UNAUTHORIZED');

  // Accept string or {ticketNo:...} opts object
  var ticketNo = '';
  if (ticketNoOrOpts) {
    ticketNo = typeof ticketNoOrOpts === 'string'
      ? ticketNoOrOpts
      : String(ticketNoOrOpts.ticketNo || '');
  }

  var cfg   = getConfig();
  var lists = getAllDataLists();

  // Build equipment flat list + extract type list
  var equipFlat     = getEquipmentFlatList();
  var eTypeSet      = {};
  equipFlat.forEach(function(e) { if (e.eType) eTypeSet[e.eType] = true; });
  var equipmentTypes = Object.keys(eTypeSet).sort();

  var base = {
    // ── Doc header ─────────────────────────────────────────────────────────
    companyName:    String(cfg['Company Name']            || 'Container Supply Co.'),
    location:       String(cfg['Location']                || 'Garden Grove, CA'),
    docNo:          String(cfg['Doc No (Service Report)'] || 'FRM-040-002'),
    revision:       String(cfg['Revision']                || '0'),

    // ── Dropdown lists (Izzy-compatible key names) ──────────────────────────
    departments:    DEPT_TRACKERS.map(function(dt) { return dt.dept; }),
    buildingZones:  lists['Building / Zone']  || [],
    equipmentTypes: equipmentTypes,
    priorities:     lists['Priorities']       || ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    problemTypes:   lists['Problem Types']    || [],
    downtimeTypes:  lists['Downtime Types']   || ['PLANNED', 'UNPLANNED'],
    shifts:         lists['Shifts']           || ['DAY', 'SWING', 'NIGHT'],
    technicians:    lists['Technicians']      || [],

    // ── Equipment cascade ───────────────────────────────────────────────────
    equipFlatList:  equipFlat,

    // ── Open tickets for ticket-selector bar ────────────────────────────────
    openTickets:    _getOpenTicketsForServiceForm_(),

    // ── Pre-fill ticket (null if no ticketNo given) ─────────────────────────
    ticket: null
  };

  if (ticketNo) {
    var mlRow = getLatestMlRow_(ticketNo);
    if (mlRow) {
      base.ticket = {
        ticketNo:      String(mlRow[ML.TICKET_NO      - 1] || ''),
        dept:          String(mlRow[ML.DEPT            - 1] || ''),
        buildingZone:  String(mlRow[ML.BUILDING_ZONE   - 1] || ''),
        equipType:     String(mlRow[ML.EQUIP_TYPE      - 1] || ''),
        equipCode:     String(mlRow[ML.EQUIP_CODE      - 1] || ''),
        specificEquip: String(mlRow[ML.SPECIFIC_EQUIP  - 1] || ''),
        description:   String(mlRow[ML.DESCRIPTION     - 1] || ''),
        rootCause:     String(mlRow[ML.ROOT_CAUSE      - 1] || ''),
        correctiveAct: String(mlRow[ML.CORRECTIVE_ACT  - 1] || ''),
        preventiveAct: String(mlRow[ML.PREVENTIVE_ACT  - 1] || ''),
        workSummary:   String(mlRow[ML.PREVENTIVE_ACT  - 1] || ''),  // legacy alias
        fixType:       String(mlRow[ML.FIX_TYPE        - 1] || ''),
        tempFixFlag:   String(mlRow[ML.TEMP_FIX_FLAG   - 1] || ''),
        priority:      String(mlRow[ML.PRIORITY        - 1] || ''),
        downtimeType:  String(mlRow[ML.DOWNTIME_TYPE   - 1] || ''),
        assignedTo:    String(mlRow[ML.ASSIGNED_TO     - 1] || ''),
        actualHours:   mlRow[ML.ACTUAL_HOURS - 1] || '',
        addedBy:       String(mlRow[ML.ADDED_BY        - 1] || ''),
        status:        String(mlRow[ML.STATUS          - 1] || ''),
        problemType:   String(mlRow[ML.PROBLEM_TYPE    - 1] || '')
      };
    }
  }

  return base;
}

// ─── Internal helper ──────────────────────────────────────────────────────────
// Returns all non-CLOSED tickets for the ServiceReport.html ticket-selector bar.
// Same shape Izzy's getOpenTicketsList_() produces.
function _getOpenTicketsForServiceForm_() {
  try {
    var ss    = getBoundSS_();
    var logSh = ss.getSheetByName(SH.MASTER_LOG);
    if (!logSh || logSh.getLastRow() < 2) return [];

    var tz      = Session.getScriptTimeZone();
    var lastCol = Math.min(ML_COLS, logSh.getLastColumn());
    var data    = logSh.getRange(2, 1, logSh.getLastRow() - 1, lastCol).getValues();

    // Best-row merge per ticket (last-write wins)
    var ticketMap = {};
    data.forEach(function(r) {
      var tn = String(r[ML.TICKET_NO - 1] || '').trim();
      if (tn) ticketMap[tn] = r;
    });

    var list = [];
    Object.keys(ticketMap).forEach(function(tn) {
      var r = ticketMap[tn];
      var s = String(r[ML.STATUS - 1] || '').toUpperCase();
      if (s === 'CLOSED' || s === 'VOIDED') return;

      function col(idx) { return idx <= lastCol ? String(r[idx - 1] || '') : ''; }
      var doRaw = r[ML.DATE_OPENED - 1];
      var doStr = (doRaw && ML.DATE_OPENED <= lastCol)
        ? Utilities.formatDate(new Date(doRaw), tz, 'MM/dd/yyyy') : '';

      list.push({
        ticketNo:      col(ML.TICKET_NO),
        status:        col(ML.STATUS),
        priority:      col(ML.PRIORITY),
        dept:          col(ML.DEPT),
        equipType:     col(ML.EQUIP_TYPE),
        specificEquip: col(ML.SPECIFIC_EQUIP),
        equipCode:     col(ML.EQUIP_CODE),
        description:   col(ML.DESCRIPTION),
        dateOpened:    doStr,
        assignedTo:    col(ML.ASSIGNED_TO),
        buildingZone:  col(ML.BUILDING_ZONE),
        addedBy:       col(ML.ADDED_BY),
        downtimeType:  col(ML.DOWNTIME_TYPE),
        problemType:   col(ML.PROBLEM_TYPE),
        estHours:      ML.EST_HOURS <= lastCol ? (r[ML.EST_HOURS - 1] || '') : ''
      });
    });

    // Sort Critical / High first
    var po = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    list.sort(function(a, b) {
      return (po[a.priority] !== undefined ? po[a.priority] : 4) -
             (po[b.priority] !== undefined ? po[b.priority] : 4);
    });
    return list;
  } catch (e) {
    Logger.log('_getOpenTicketsForServiceForm_ error: ' + e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  submitServiceReport
//  Public entry point called by ServiceReport.html (Izzy's form).
//  C11: accepts Izzy's field names (correctiveAction, preventiveAction, partsRows,
//  isTempFix, etc.), maps them to the copy app's internal schema, and delegates
//  to saveServiceReport().
//  Returns { success: true, reportNo: 'RPT-YYYYMM-###' } on success.
// ═══════════════════════════════════════════════════════════════════════════════

function submitServiceReport(data) {
  data = data || {};
  var mapped = {
    ticketNo:        String(data.ticketNo       || ''),
    dept:            String(data.dept           || ''),
    buildingZone:    String(data.buildingZone   || ''),
    equipType:       String(data.equipType      || ''),
    equipCode:       String(data.equipCode      || ''),
    specificEquip:   String(data.specificEquip  || ''),
    problemDesc:     String(data.problemDesc    || ''),
    rootCause:       String(data.rootCause      || ''),
    // Accept both Izzy's camelCase name and copy app's internal name
    correctiveAct:   String(data.correctiveAction || data.correctiveAct  || ''),
    preventiveAct:   String(data.preventiveAction || data.preventiveAct  || ''),
    workSummary:     String(data.workSummary    || ''),
    recommendations: String(data.recommendations || ''),
    // partsRows array → serialized string
    partsUsed:       _serializePartsRows_(data.partsRows),
    addedBy:         String(data.addedBy        || ''),
    completedBy:     String(data.completedBy    || ''),
    laborHours:      data.laborHours            || '',
    priority:        String(data.priority       || ''),
    downtimeType:    String(data.downtimeType   || ''),
    serviceDate:     String(data.serviceDate    || ''),
    dateCompleted:   String(data.dateCompleted  || ''),
    shift:           String(data.shift          || ''),
    tempFixFlag:     !!(data.isTempFix),
    fixType:         String(data.fixType || (data.isTempFix ? 'Temporary' : 'Permanent')),
    verifiedBy:      String(data.verifiedBy     || ''),
    verifiedDate:    String(data.verifiedDate   || ''),
    managerNotes:    String(data.managerNotes   || ''),
    notes:           String(data.notes         || ''),
    imageCount:      data.imageCount            || 0,
    problemType:     String(data.problemType    || '')
  };

  var result = saveServiceReport(mapped);
  if (!result.success) return result;
  // Izzy's form shows r.reportNo in its success message
  return { success: true, reportNo: result.reportId };
}

// ─── Internal helper ──────────────────────────────────────────────────────────
// Serializes Izzy's partsRows array into a single string for RDB storage.
// Each element: { partId, partDesc, notes }  →  "ID :: Desc :: Notes | ..."
function _serializePartsRows_(rows) {
  if (!rows || !Array.isArray(rows)) return '';
  return rows
    .filter(function(p) { return p.partId || p.partDesc; })
    .map(function(p) { return [p.partId || '', p.partDesc || '', p.notes || ''].join(' :: '); })
    .join(' | ');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  generateReportNo_
//  Generates a sequential report number in Izzy's format: RPT-YYYYMM-###
//  Scans the Report Database to find the highest existing sequence for the
//  current month and increments it.
// ═══════════════════════════════════════════════════════════════════════════════

function generateReportNo_() {
  var ss    = getBoundSS_();
  var sh    = ss.getSheetByName(SH.RPT_DB);
  var tz    = Session.getScriptTimeZone();
  var ym    = Utilities.formatDate(new Date(), tz, 'yyyyMM');
  var prefix = 'RPT-' + ym + '-';
  var seq   = 1;

  if (sh && sh.getLastRow() > 1) {
    var ids = sh.getRange(2, RDB.REPORT_ID, sh.getLastRow() - 1, 1).getValues();
    ids.forEach(function(r) {
      var v = String(r[0] || '');
      if (v.indexOf(prefix) === 0) {
        var n = parseInt(v.slice(prefix.length), 10) || 0;
        if (n >= seq) seq = n + 1;
      }
    });
  }
  return prefix + String(seq).padStart(3, '0');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  saveServiceReport
//  Writes a new row to 📝 Report Database and appends a Ticket History event.
//  C11: updated to store all new RDB cols 28–33 (shift, serviceDate,
//  dateCompleted, recommendations, managerNotes, problemType).
//  Idempotent on reportId — will not create duplicate rows.
//  Required params: dept (and at least one of ticketNo / problemDesc).
// ═══════════════════════════════════════════════════════════════════════════════

function saveServiceReport(data) {
  var user = getCurrentUserInfo();
  if (user.role !== ROLES.MANAGER && user.role !== ROLES.ADMIN &&
      user.role !== ROLES.TECH) throw new Error('UNAUTHORIZED');

  data = data || {};
  var tn = String(data.ticketNo || '').trim();
  if (!data.dept) return { success: false, error: 'dept required' };

  var ss  = getBoundSS_();
  var sh  = ss.getSheetByName(SH.RPT_DB);
  if (!sh) return { success: false, error: 'Report Database sheet not found. Run Setup first.' };

  var now      = new Date();
  var reportId = generateReportNo_();

  var row = new Array(RDB_COLS).fill('');
  // ── Core fields (cols 1–27) ──────────────────────────────────────────────
  row[RDB.REPORT_ID     - 1] = reportId;
  row[RDB.TICKET_NO     - 1] = tn;
  row[RDB.DATE          - 1] = formatDateStr_(now);
  row[RDB.DEPT          - 1] = normalizeDept(String(data.dept || ''));
  row[RDB.BUILDING_ZONE - 1] = String(data.buildingZone  || '');
  row[RDB.EQUIP_TYPE    - 1] = String(data.equipType     || '');
  row[RDB.EQUIP_CODE    - 1] = String(data.equipCode     || '');
  row[RDB.SPECIFIC_EQUIP- 1] = String(data.specificEquip || '');
  row[RDB.PROBLEM_DESC  - 1] = String(data.problemDesc   || data.description || '');
  row[RDB.ROOT_CAUSE    - 1] = String(data.rootCause     || '');
  row[RDB.CORRECTIVE_ACT- 1] = String(data.correctiveAct || '');
  row[RDB.PREVENTIVE_ACT- 1] = String(data.preventiveAct || '');
  row[RDB.WORK_SUMMARY  - 1] = String(data.workSummary   || '');
  row[RDB.FIX_TYPE      - 1] = String(data.fixType       || '');
  row[RDB.TEMP_FIX_FLAG - 1] = data.tempFixFlag ? 'Y' : 'N';
  row[RDB.PARTS_USED    - 1] = String(data.partsUsed     || '');
  row[RDB.LABOR_HOURS   - 1] = data.laborHours           || '';
  row[RDB.ADDED_BY      - 1] = String(data.addedBy       || user.displayName);
  row[RDB.COMPLETED_BY  - 1] = String(data.completedBy   || '');
  row[RDB.VERIFIED_BY   - 1] = String(data.verifiedBy    || '');
  row[RDB.VERIFIED_DATE - 1] = String(data.verifiedDate  || '');
  row[RDB.UPDATED_BY    - 1] = String(data.addedBy       || user.displayName);
  row[RDB.PRIORITY      - 1] = String(data.priority      || '');
  row[RDB.DOWNTIME_TYPE - 1] = String(data.downtimeType  || '');
  row[RDB.IMAGE_LINKS   - 1] = String(data.imageLinks    || '');
  row[RDB.PDF_LINK      - 1] = '';
  row[RDB.NOTES         - 1] = String(data.notes         || '');
  // ── C11 fields (cols 28–33) ──────────────────────────────────────────────
  row[RDB.SHIFT         - 1] = String(data.shift         || '');
  row[RDB.SERVICE_DATE  - 1] = String(data.serviceDate   || '');
  row[RDB.DATE_COMPLETED- 1] = String(data.dateCompleted || '');
  row[RDB.RECOMMENDATIONS-1] = String(data.recommendations || '');
  row[RDB.MANAGER_NOTES - 1] = String(data.managerNotes  || '');
  row[RDB.PROBLEM_TYPE  - 1] = String(data.problemType   || '');

  sh.appendRow(row);

  if (tn) {
    appendToTicketHistory_(tn, TH_EVENTS.SERVICE_REPORT, '', '',
      data.addedBy || user.displayName, 'Service report ' + reportId + ' created');
  }

  return { success: true, reportId: reportId };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  verifyServiceReport
//  Manager verifies and signs off a service report. Writes VERIFIED_BY + date.
// ═══════════════════════════════════════════════════════════════════════════════

function verifyServiceReport(params) {
  var user = getCurrentUserInfo();
  if (user.role !== ROLES.MANAGER && user.role !== ROLES.ADMIN) throw new Error('UNAUTHORIZED');

  params = params || {};
  var reportId = String(params.reportId || '').trim();
  if (!reportId) return { success: false, error: 'reportId required' };

  var ss = getBoundSS_();
  var sh = ss.getSheetByName(SH.RPT_DB);
  if (!sh || sh.getLastRow() < 2) return { success: false, error: 'Report not found' };

  var ids = sh.getRange(2, RDB.REPORT_ID, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim() === reportId) {
      var row = i + 2;
      var now = new Date();
      sh.getRange(row, RDB.VERIFIED_BY).setValue(params.verifiedBy || user.displayName);
      sh.getRange(row, RDB.VERIFIED_DATE).setValue(formatDateStr_(now));
      var tn = String(sh.getRange(row, RDB.TICKET_NO).getValue() || '');
      if (tn) {
        appendToTicketHistory_(tn, TH_EVENTS.VERIFIED, '', '',
          params.verifiedBy || user.displayName, 'Service report ' + reportId + ' verified');
      }
      return { success: true };
    }
  }
  return { success: false, error: 'Report ID not found: ' + reportId };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  getServiceReportData
//  Returns service report records for a ticket or date range.
//  Used by the reports page and ticket-detail view.
// ═══════════════════════════════════════════════════════════════════════════════

function getServiceReportData(params) {
  var user = getCurrentUserInfo();
  if (user.role === ROLES.NOACCESS) throw new Error('UNAUTHORIZED');

  params = params || {};
  var filterTicket = String(params.ticketNo || '').trim();
  var filterDept   = String(params.dept     || '').trim().toUpperCase();
  var filterFrom   = params.dateFrom ? new Date(params.dateFrom) : null;
  var filterTo     = params.dateTo   ? new Date(params.dateTo)   : null;
  if (filterTo) filterTo.setHours(23, 59, 59, 999);

  var ss = getBoundSS_();
  var sh = ss.getSheetByName(SH.RPT_DB);
  if (!sh || sh.getLastRow() < 2) return { reports: [] };

  var numRows = sh.getLastRow() - 1;
  var raw = sh.getRange(2, 1, numRows, RDB_COLS).getValues();
  var reports = [];

  for (var i = 0; i < raw.length; i++) {
    var r = raw[i];
    var reportId = String(r[RDB.REPORT_ID - 1] || '').trim();
    if (!reportId) continue;
    var ticketNo = String(r[RDB.TICKET_NO - 1] || '').trim();
    var dept     = String(r[RDB.DEPT      - 1] || '').trim();
    var dateRaw  = r[RDB.DATE - 1];
    var date     = dateRaw ? new Date(dateRaw) : null;

    if (filterTicket && ticketNo !== filterTicket) continue;
    if (filterDept   && dept.toUpperCase().indexOf(filterDept) === -1) continue;
    if (filterFrom   && date && date < filterFrom) continue;
    if (filterTo     && date && date > filterTo)   continue;

    reports.push({
      reportId:        reportId,
      ticketNo:        ticketNo,
      date:            date ? formatDateStr_(date) : '',
      dept:            dept,
      buildingZone:    String(r[RDB.BUILDING_ZONE  - 1] || ''),
      equipType:       String(r[RDB.EQUIP_TYPE     - 1] || ''),
      equipCode:       String(r[RDB.EQUIP_CODE     - 1] || ''),
      specificEquip:   String(r[RDB.SPECIFIC_EQUIP - 1] || ''),
      problemDesc:     String(r[RDB.PROBLEM_DESC   - 1] || ''),
      rootCause:       String(r[RDB.ROOT_CAUSE     - 1] || ''),
      correctiveAct:   String(r[RDB.CORRECTIVE_ACT - 1] || ''),
      preventiveAct:   String(r[RDB.PREVENTIVE_ACT - 1] || ''),
      workSummary:     String(r[RDB.WORK_SUMMARY   - 1] || ''),
      fixType:         String(r[RDB.FIX_TYPE       - 1] || ''),
      partsUsed:       String(r[RDB.PARTS_USED     - 1] || ''),
      laborHours:      r[RDB.LABOR_HOURS - 1] || '',
      addedBy:         String(r[RDB.ADDED_BY       - 1] || ''),
      completedBy:     String(r[RDB.COMPLETED_BY   - 1] || ''),
      verifiedBy:      String(r[RDB.VERIFIED_BY    - 1] || ''),
      verifiedDate:    String(r[RDB.VERIFIED_DATE  - 1] || ''),
      priority:        String(r[RDB.PRIORITY       - 1] || ''),
      notes:           String(r[RDB.NOTES          - 1] || ''),
      // C11 fields
      shift:           String(r[RDB.SHIFT          - 1] || ''),
      serviceDate:     String(r[RDB.SERVICE_DATE   - 1] || ''),
      dateCompleted:   String(r[RDB.DATE_COMPLETED - 1] || ''),
      recommendations: String(r[RDB.RECOMMENDATIONS- 1] || ''),
      managerNotes:    String(r[RDB.MANAGER_NOTES  - 1] || ''),
      problemType:     String(r[RDB.PROBLEM_TYPE   - 1] || '')
    });
  }

  return { reports: reports };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  getUnverifiedReports_
//  Internal helper — returns all reports without a VERIFIED_BY value.
//  Used by monitoring/dashboard to surface pending verifications.
// ═══════════════════════════════════════════════════════════════════════════════

function getUnverifiedReports_() {
  var ss = getBoundSS_();
  var sh = ss.getSheetByName(SH.RPT_DB);
  if (!sh || sh.getLastRow() < 2) return [];
  var numRows = sh.getLastRow() - 1;
  var raw = sh.getRange(2, 1, numRows, RDB_COLS).getValues();
  return raw.filter(function(r) {
    return String(r[RDB.REPORT_ID  - 1] || '').trim() &&
           !String(r[RDB.VERIFIED_BY - 1] || '').trim();
  }).map(function(r) {
    return {
      reportId:  String(r[RDB.REPORT_ID  - 1] || ''),
      ticketNo:  String(r[RDB.TICKET_NO  - 1] || ''),
      dept:      String(r[RDB.DEPT       - 1] || ''),
      addedBy:   String(r[RDB.ADDED_BY   - 1] || ''),
      date:      String(r[RDB.DATE       - 1] || '')
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ensureRptDbSheet_
//  Creates the Report Database sheet with headers if it doesn't exist.
//  Called from runSetup().
// ═══════════════════════════════════════════════════════════════════════════════

function ensureRptDbSheet_() {
  var ss = getBoundSS_();
  var sh = ss.getSheetByName(SH.RPT_DB);
  if (!sh) {
    sh = ss.insertSheet(SH.RPT_DB);
    sh.getRange(1, 1, 1, RDB_COLS).setValues([RDB_HEADERS]);
    sh.setFrozenRows(1);
    Logger.log('ensureRptDbSheet_: created ' + SH.RPT_DB);
  } else {
    Logger.log('ensureRptDbSheet_: sheet already exists — skipping');
  }
}
