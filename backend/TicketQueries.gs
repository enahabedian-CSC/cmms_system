// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  TicketQueries.gs — CSC CMMS v5.0                                       ║
// ║  Read-only data fetching for queue views, ticket detail, and closed     ║
// ║  tickets.  All reads go through the Master Log (source of truth).       ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  getQueueTickets
//  Returns tickets for waiting / open / tracker views.
//  queueType: 'waiting' | 'open' | 'tracker'
//  opts.dept : canonical dept name for tracker filter (string) or array
// ═══════════════════════════════════════════════════════════════════════════════

function getQueueTickets(queueType, opts) {
  var user = requireRole_(ROLES.TECH);
  opts = opts || {};

  var statusFilter;
  switch (queueType) {
    case 'waiting': statusFilter = ['WAITING']; break;
    case 'open':    statusFilter = ['OPEN', 'PENDING VERIFICATION', 'PENDING PARTS', 'ON HOLD']; break;
    case 'tracker': statusFilter = ['WAITING', 'OPEN', 'PENDING VERIFICATION', 'PENDING PARTS', 'ON HOLD']; break;
    default:        statusFilter = ['WAITING', 'OPEN']; break;
  }

  // Dept scoping: tracker view uses explicit dept; waiting/open scope to owned depts for managers
  var deptFilter = null;
  if (opts.dept) {
    deptFilter = normalizeDept(opts.dept);
  } else if (!user.isAdmin && user.isManager && user.ownedDepts && user.ownedDepts.length > 0) {
    deptFilter = user.ownedDepts; // array — any match passes
  }

  try {
    var ml = getBoundSS_().getSheetByName(SH.MASTER_LOG);
    if (!ml || ml.getLastRow() < 2) return [];
    var data = ml.getRange(2, 1, ml.getLastRow() - 1, ML_COLS).getValues();
    return _mergeAndFilter_(data, statusFilter, deptFilter, opts.limit || 500);
  } catch (e) {
    Logger.log('getQueueTickets error: ' + e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  getTicketDetail
//  Returns merged ML record + ticket history array + people list for form.
// ═══════════════════════════════════════════════════════════════════════════════

function getTicketDetail(ticketNo) {
  requireRole_(ROLES.TECH);
  if (!ticketNo) throw new Error('ticketNo required');

  try {
    var ss = getBoundSS_();
    var tz = Session.getScriptTimeZone();

    // ── Merge all ML rows for this ticket ──────────────────────────────────────
    var ml   = ss.getSheetByName(SH.MASTER_LOG);
    if (!ml || ml.getLastRow() < 2) throw new Error('Master Log empty');
    var allRows = ml.getRange(2, 1, ml.getLastRow() - 1, ML_COLS).getValues();
    var rows = allRows.filter(function(r) {
      return String(r[ML.TICKET_NO - 1] || '').trim() === ticketNo;
    });
    if (rows.length === 0) throw new Error('Ticket not found: ' + ticketNo);

    var best = rows[0].slice();
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      for (var c = 0; c < row.length; c++) {
        if (row[c] !== '' && row[c] !== null && row[c] !== undefined) best[c] = row[c];
      }
    }

    function fmtDate(v) {
      if (!v) return '';
      if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz, 'MM/dd/yyyy');
      return String(v);
    }
    function fmtTs(v) {
      if (!v) return '';
      if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz, 'MM/dd/yyyy HH:mm');
      return String(v);
    }

    var ticket = {
      ticketNo:      String(best[ML.TICKET_NO      - 1] || ''),
      status:        String(best[ML.STATUS          - 1] || '').toUpperCase(),
      priority:      String(best[ML.PRIORITY        - 1] || '').toUpperCase(),
      dept:          String(best[ML.DEPT            - 1] || ''),
      buildingZone:  String(best[ML.BUILDING_ZONE   - 1] || ''),
      equipType:     String(best[ML.EQUIP_TYPE      - 1] || ''),
      equipCode:     String(best[ML.EQUIP_CODE      - 1] || ''),
      specificEquip: String(best[ML.SPECIFIC_EQUIP  - 1] || ''),
      downtimeType:  String(best[ML.DOWNTIME_TYPE   - 1] || ''),
      description:   String(best[ML.DESCRIPTION     - 1] || ''),
      assignedTo:    String(best[ML.ASSIGNED_TO     - 1] || ''),
      estHours:      best[ML.EST_HOURS              - 1] || '',
      actualHours:   best[ML.ACTUAL_HOURS           - 1] || '',
      dateOpened:    fmtDate(best[ML.DATE_OPENED    - 1]),
      dateCompleted: fmtDate(best[ML.DATE_COMPLETED - 1]),
      dateClosed:    fmtDate(best[ML.DATE_CLOSED    - 1]),
      correctiveAct: String(best[ML.CORRECTIVE_ACT  - 1] || ''),
      rootCause:     String(best[ML.ROOT_CAUSE      - 1] || ''),
      preventiveAct: String(best[ML.PREVENTIVE_ACT  - 1] || ''),
      workSummary:   String(best[ML.PREVENTIVE_ACT  - 1] || ''),  // legacy alias for existing UI
      fixType:       String(best[ML.FIX_TYPE        - 1] || ''),
      tempFixFlag:   String(best[ML.TEMP_FIX_FLAG   - 1] || '') === 'Y',
      partsNeeded:   String(best[ML.PARTS_NEEDED    - 1] || '') === 'Y',
      partsStatus:   String(best[ML.PARTS_STATUS    - 1] || ''),
      equipTagStatus:String(best[ML.EQUIP_TAG_STATUS- 1] || ''),
      verifiedBy:    String(best[ML.VERIFIED_BY     - 1] || ''),
      verifiedDate:  fmtDate(best[ML.VERIFIED_DATE  - 1]),
      addedBy:       String(best[ML.ADDED_BY        - 1] || ''),
      updatedBy:     String(best[ML.UPDATED_BY      - 1] || ''),
      notes:         String(best[ML.NOTES           - 1] || ''),
      problemType:   String(best[ML.PROBLEM_TYPE    - 1] || ''),
      lineNo:        String(best[ML.LINE_NO         - 1] || ''),
      sqfChecklist:  String(best[ML.VERIFICATION_CHECKLIST - 1] || ''),
      photoUrl:      String(best[ML.PHOTO_URL       - 1] || '')
    };

    // ── Ticket History ─────────────────────────────────────────────────────────
    var history = [];
    var thSh = ss.getSheetByName(SH.TICKET_HIST);
    if (thSh && thSh.getLastRow() > 1) {
      thSh.getRange(2, 1, thSh.getLastRow() - 1, 8).getValues().forEach(function(r) {
        if (String(r[1] || '').trim() !== ticketNo) return;
        history.push({
          histId:      String(r[0] || ''),
          timestamp:   fmtTs(r[2]),
          eventType:   String(r[3] || ''),
          statusFrom:  String(r[4] || ''),
          statusTo:    String(r[5] || ''),
          performedBy: String(r[6] || ''),
          notes:       String(r[7] || '')
        });
      });
    }

    return { ticket: ticket, history: history, techs: getTechsForDept(ticket.dept) };
  } catch (e) {
    Logger.log('getTicketDetail error: ' + e.message);
    throw e;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  getEquipTicketHistory
//  Returns a summary list of all tickets for a given equipment code from ML.
//  Used by the Equipment Inventory detail view.
// ═══════════════════════════════════════════════════════════════════════════════

function getEquipTicketHistory(equipCode) {
  requireRole_(ROLES.TECH);
  if (!equipCode) return [];
  try {
    var sh = getBoundSS_().getSheetByName(SH.MASTER_LOG);
    if (!sh || sh.getLastRow() < 2) return [];
    var tz   = Session.getScriptTimeZone();
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, ML_COLS).getValues();

    function fmtDate(v) {
      if (!v) return '';
      if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz, 'MM/dd/yyyy');
      return String(v);
    }

    // Collect per-ticket latest row
    var perTicket = {};
    data.forEach(function(row) {
      var tn   = String(row[ML.TICKET_NO  - 1] || '').trim();
      var code = String(row[ML.EQUIP_CODE - 1] || '').trim();
      if (!tn || tn === 'SYSTEM' || code !== equipCode) return;
      if (!perTicket[tn]) perTicket[tn] = row.slice();
      else {
        // last-write-wins for non-empty cells
        for (var c = 0; c < row.length; c++) {
          if (row[c] !== '' && row[c] !== null && row[c] !== undefined) perTicket[tn][c] = row[c];
        }
      }
    });

    var result = [];
    Object.keys(perTicket).forEach(function(tn) {
      var r = perTicket[tn];
      result.push({
        ticketNo:    tn,
        dateOpened:  fmtDate(r[ML.DATE_OPENED  - 1]),
        status:      String(r[ML.STATUS         - 1] || '').toUpperCase(),
        priority:    String(r[ML.PRIORITY       - 1] || '').toUpperCase(),
        problemType: String(r[ML.PROBLEM_TYPE   - 1] || ''),
        estHours:    r[ML.EST_HOURS             - 1] || '',
        actualHours: r[ML.ACTUAL_HOURS          - 1] || ''
      });
    });

    result.sort(function(a,b) {
      return (b.dateOpened || '').localeCompare(a.dateOpened || '');
    });
    return result;
  } catch (e) {
    Logger.log('getEquipTicketHistory error: ' + e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  getClosedTickets
//  Reads the Closed Tickets sheet (dept-scoped to caller's owned depts).
// ═══════════════════════════════════════════════════════════════════════════════

function getClosedTickets(opts) {
  requireManager_();
  opts = opts || {};
  var user = getCurrentUserInfo();

  try {
    var ss       = getBoundSS_();
    var closedSh = ss.getSheetByName(SH.CLOSED);
    if (!closedSh || closedSh.getLastRow() < 2) return [];

    var startRow = QUEUE_FROZEN + 1;
    if (closedSh.getLastRow() < startRow) return [];
    var numRows  = closedSh.getLastRow() - startRow + 1;
    var data     = closedSh.getRange(startRow, TK_DATA_COL, numRows, TK_COLS).getValues();
    var tz       = Session.getScriptTimeZone();

    function fmtDate(v) {
      if (!v) return '';
      if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz, 'MM/dd/yyyy');
      return String(v);
    }

    var tickets = [];
    data.forEach(function(r) {
      var tn   = String(r[TK.TICKET_NO - 1] || '').trim();
      if (!tn) return;
      var dept = String(r[TK.DEPT - 1] || '').trim();
      if (!user.isAdmin && user.ownedDepts && user.ownedDepts.length > 0) {
        if (user.ownedDepts.indexOf(dept) < 0) return;
      }
      // Optional text search
      if (opts.search) {
        var q = opts.search.toLowerCase();
        var haystack = (tn + ' ' + dept + ' ' +
          String(r[TK.SPECIFIC_EQUIP - 1] || '') + ' ' +
          String(r[TK.DESCRIPTION - 1]    || '') + ' ' +
          String(r[TK.ASSIGNED_TO  - 1]   || '')).toLowerCase();
        if (haystack.indexOf(q) < 0) return;
      }
      tickets.push({
        ticketNo:     tn,
        status:       String(r[TK.STATUS         - 1] || '').trim(),
        priority:     String(r[TK.PRIORITY        - 1] || '').trim().toUpperCase(),
        dept:         dept,
        equipCode:    String(r[TK.EQUIP_CODE      - 1] || ''),
        specificEquip:String(r[TK.SPECIFIC_EQUIP  - 1] || ''),
        description:  String(r[TK.DESCRIPTION     - 1] || ''),
        assignedTo:   String(r[TK.ASSIGNED_TO     - 1] || ''),
        actualHours:  r[TK.ACTUAL_HOURS           - 1] || '',
        dateOpened:   fmtDate(r[TK.DATE_OPENED    - 1]),
        lastUpdated:  fmtDate(r[TK.LAST_UPDATED   - 1]),
        verifiedBy:   String(r[TK.VERIFIED_BY     - 1] || ''),
        verifiedDate: fmtDate(r[TK.VERIFIED_DATE  - 1]),
        addedBy:      String(r[TK.ADDED_BY        - 1] || ''),
        lineNo:       String(r[TK.LINE_NO         - 1] || '')
      });
    });

    tickets.reverse(); // most-recently-closed first
    if (opts.limit) tickets = tickets.slice(0, opts.limit);
    return tickets;
  } catch (e) {
    Logger.log('getClosedTickets error: ' + e.message);
    return [];
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _mergeAndFilter_(data, statusFilter, deptFilter, limit) {
  var rowsByTicket = {};
  for (var i = 0; i < data.length; i++) {
    var tn = String(data[i][ML.TICKET_NO - 1] || '').trim();
    if (!tn) continue;
    if (!rowsByTicket[tn]) rowsByTicket[tn] = [];
    rowsByTicket[tn].push(data[i]);
  }

  var tz      = Session.getScriptTimeZone();
  var tickets = [];
  var priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, '': 4 };

  for (var ticketId in rowsByTicket) {
    var rows = rowsByTicket[ticketId];
    var best = rows[0].slice();
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      for (var c = 0; c < row.length; c++) {
        if (row[c] !== '' && row[c] !== null && row[c] !== undefined) best[c] = row[c];
      }
    }

    var status = String(best[ML.STATUS - 1] || '').trim().toUpperCase();
    if (statusFilter && statusFilter.indexOf(status) < 0) continue;

    var dept = String(best[ML.DEPT - 1] || '').trim();
    if (deptFilter) {
      if (Array.isArray(deptFilter)) {
        if (deptFilter.indexOf(dept) < 0) continue;
      } else if (dept !== deptFilter) {
        continue;
      }
    }

    var dateOpened = best[ML.DATE_OPENED - 1];
    var dateStr = '';
    if (dateOpened instanceof Date && !isNaN(dateOpened)) {
      dateStr = Utilities.formatDate(dateOpened, tz, 'MM/dd/yyyy');
    } else if (dateOpened) {
      dateStr = String(dateOpened);
    }

    tickets.push({
      ticketNo:     String(best[ML.TICKET_NO     - 1] || ''),
      status:       status,
      priority:     String(best[ML.PRIORITY      - 1] || '').toUpperCase(),
      dept:         dept,
      buildingZone: String(best[ML.BUILDING_ZONE - 1] || ''),
      equipType:    String(best[ML.EQUIP_TYPE    - 1] || ''),
      equipCode:    String(best[ML.EQUIP_CODE    - 1] || ''),
      specificEquip:String(best[ML.SPECIFIC_EQUIP- 1] || ''),
      description:  String(best[ML.DESCRIPTION   - 1] || ''),
      assignedTo:   String(best[ML.ASSIGNED_TO   - 1] || ''),
      dateOpened:   dateStr,
      problemType:  String(best[ML.PROBLEM_TYPE  - 1] || ''),
      addedBy:      String(best[ML.ADDED_BY      - 1] || ''),
      downtimeType: String(best[ML.DOWNTIME_TYPE - 1] || ''),
      lineNo:       String(best[ML.LINE_NO       - 1] || ''),
      tempFixFlag:  String(best[ML.TEMP_FIX_FLAG - 1] || '') === 'Y',
      partsNeeded:  String(best[ML.PARTS_NEEDED  - 1] || '') === 'Y',
      estHours:     best[ML.EST_HOURS            - 1] || '',
      actualHours:  best[ML.ACTUAL_HOURS         - 1] || '',
      fixType:      String(best[ML.FIX_TYPE      - 1] || ''),
      verifiedBy:   String(best[ML.VERIFIED_BY   - 1] || '')
    });
  }

  tickets.sort(function(a, b) {
    var pa = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 4;
    var pb = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 4;
    if (pa !== pb) return pa - pb;
    return b.dateOpened.localeCompare(a.dateOpened);
  });

  return limit ? tickets.slice(0, limit) : tickets;
}
