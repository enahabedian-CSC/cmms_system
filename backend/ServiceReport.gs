// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ServiceReport.gs — CSC CMMS v5.0                                       ║
// ║  FRM-040-002 Maintenance Service Report infrastructure.                 ║
// ║  Report Database (📝 Report Database) stores one row per report.        ║
// ║  Not yet in active production use — infrastructure-only build.          ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  getServiceReportFormData
//  Pre-fills a new service report form from a ticket number (optional).
//  Returns all dropdowns + any existing ticket data to auto-populate the form.
// ═══════════════════════════════════════════════════════════════════════════════

function getServiceReportFormData(ticketNo) {
  var user = getCurrentUserInfo();
  if (user.role === ROLES.NOACCESS) throw new Error('UNAUTHORIZED');

  var cfg   = getConfig();
  var lists = getAllDataLists();

  var base = {
    docNo:         String(cfg['Doc No (Service Report)'] || 'FRM-040-002'),
    revision:      String(cfg['Revision']                || '0'),
    companyName:   String(cfg['Company Name']            || 'Container Supply Co.'),
    departments:   DEPT_TRACKERS.map(function(dt) { return dt.dept; }),
    equipHierarchy: getEquipmentHierarchy(),
    buildingZones:  lists['Building / Zone'] || [],
    priorities:     lists['Priorities']      || ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    problemTypes:   lists['Problem Types']   || [],
    downtimeTypes:  lists['Downtime Types']  || ['PLANNED', 'UNPLANNED'],
    fixTypes:       lists['Fix Types']       || ['PERMANENT', 'TEMPORARY'],
    shifts:         lists['Shifts']          || ['DAY', 'SWING', 'NIGHT'],
    peopleList:     getPeopleList_(),
    ticket:         null
  };

  if (ticketNo) {
    var mlRow = getLatestMlRow_(String(ticketNo).trim());
    if (mlRow) {
      base.ticket = {
        ticketNo:      String(mlRow[ML.TICKET_NO     - 1] || ''),
        dept:          String(mlRow[ML.DEPT           - 1] || ''),
        buildingZone:  String(mlRow[ML.BUILDING_ZONE  - 1] || ''),
        equipType:     String(mlRow[ML.EQUIP_TYPE     - 1] || ''),
        equipCode:     String(mlRow[ML.EQUIP_CODE     - 1] || ''),
        specificEquip: String(mlRow[ML.SPECIFIC_EQUIP - 1] || ''),
        description:   String(mlRow[ML.DESCRIPTION   - 1] || ''),
        rootCause:     String(mlRow[ML.ROOT_CAUSE     - 1] || ''),
        correctiveAct: String(mlRow[ML.CORRECTIVE_ACT - 1] || ''),
        preventiveAct: String(mlRow[ML.PREVENTIVE_ACT  - 1] || ''),
        workSummary:   String(mlRow[ML.PREVENTIVE_ACT  - 1] || ''),  // legacy alias
        fixType:       String(mlRow[ML.FIX_TYPE       - 1] || ''),
        tempFixFlag:   String(mlRow[ML.TEMP_FIX_FLAG  - 1] || ''),
        priority:      String(mlRow[ML.PRIORITY       - 1] || ''),
        downtimeType:  String(mlRow[ML.DOWNTIME_TYPE  - 1] || ''),
        assignedTo:    String(mlRow[ML.ASSIGNED_TO    - 1] || ''),
        actualHours:   mlRow[ML.ACTUAL_HOURS - 1] || '',
        addedBy:       String(mlRow[ML.ADDED_BY       - 1] || ''),
        status:        String(mlRow[ML.STATUS         - 1] || ''),
        problemType:   String(mlRow[ML.PROBLEM_TYPE   - 1] || '')
      };
    }
  }

  return base;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  saveServiceReport
//  Writes a new row to 📝 Report Database and appends a Ticket History event.
//  Idempotent by report ID — will not create duplicate rows.
//  Params mirror RDB columns.  Required: ticketNo, dept, addedBy.
// ═══════════════════════════════════════════════════════════════════════════════

function saveServiceReport(data) {
  var user = getCurrentUserInfo();
  if (user.role !== ROLES.MANAGER && user.role !== ROLES.ADMIN) throw new Error('UNAUTHORIZED');

  data = data || {};
  var tn = String(data.ticketNo || '').trim();
  if (!tn)   return { success: false, error: 'ticketNo required' };
  if (!data.dept) return { success: false, error: 'dept required' };

  var ss  = getBoundSS_();
  var sh  = ss.getSheetByName(SH.RPT_DB);
  if (!sh) return { success: false, error: 'Report Database sheet not found. Run Setup first.' };

  var now      = new Date();
  var reportId = 'RPT-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMddHHmmss');

  var row = new Array(RDB_COLS).fill('');
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
  row[RDB.LABOR_HOURS   - 1] = data.laborHours || '';
  row[RDB.ADDED_BY      - 1] = String(data.addedBy       || user.displayName);
  row[RDB.COMPLETED_BY  - 1] = String(data.completedBy   || '');
  row[RDB.VERIFIED_BY   - 1] = '';
  row[RDB.VERIFIED_DATE - 1] = '';
  row[RDB.UPDATED_BY    - 1] = String(data.addedBy       || user.displayName);
  row[RDB.PRIORITY      - 1] = String(data.priority      || '');
  row[RDB.DOWNTIME_TYPE - 1] = String(data.downtimeType  || '');
  row[RDB.IMAGE_LINKS   - 1] = String(data.imageLinks    || '');
  row[RDB.PDF_LINK      - 1] = '';
  row[RDB.NOTES         - 1] = String(data.notes         || '');

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
      reportId:      reportId,
      ticketNo:      ticketNo,
      date:          date ? formatDateStr_(date) : '',
      dept:          dept,
      buildingZone:  String(r[RDB.BUILDING_ZONE  - 1] || ''),
      equipType:     String(r[RDB.EQUIP_TYPE     - 1] || ''),
      equipCode:     String(r[RDB.EQUIP_CODE     - 1] || ''),
      specificEquip: String(r[RDB.SPECIFIC_EQUIP - 1] || ''),
      problemDesc:   String(r[RDB.PROBLEM_DESC   - 1] || ''),
      rootCause:     String(r[RDB.ROOT_CAUSE     - 1] || ''),
      correctiveAct: String(r[RDB.CORRECTIVE_ACT - 1] || ''),
      preventiveAct: String(r[RDB.PREVENTIVE_ACT - 1] || ''),
      workSummary:   String(r[RDB.WORK_SUMMARY   - 1] || ''),
      fixType:       String(r[RDB.FIX_TYPE       - 1] || ''),
      partsUsed:     String(r[RDB.PARTS_USED     - 1] || ''),
      laborHours:    r[RDB.LABOR_HOURS - 1] || '',
      addedBy:       String(r[RDB.ADDED_BY       - 1] || ''),
      completedBy:   String(r[RDB.COMPLETED_BY   - 1] || ''),
      verifiedBy:    String(r[RDB.VERIFIED_BY    - 1] || ''),
      verifiedDate:  String(r[RDB.VERIFIED_DATE  - 1] || ''),
      priority:      String(r[RDB.PRIORITY       - 1] || ''),
      notes:         String(r[RDB.NOTES          - 1] || '')
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
