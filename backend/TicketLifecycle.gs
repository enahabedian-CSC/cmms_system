// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  TicketLifecycle.gs — CSC CMMS v5.0                                     ║
// ║  All ticket state-change actions.  Every function that transitions a   ║
// ║  ticket's status MUST call appendToMasterLog_() AND                    ║
// ║  appendToTicketHistory_() before returning — no exceptions.            ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  approveTicket — WAITING → OPEN
//  Sets priority, optionally assigns technician, moves to Open queue.
// ═══════════════════════════════════════════════════════════════════════════════

function approveTicket(data) {
  requireManager_();
  var user = getCurrentUserInfo();
  var now  = new Date();
  var tn   = String(data.ticketNo || '').trim();
  if (!tn) return { success: false, error: 'ticketNo required' };

  try {
    var orig = getOriginalMlRow_(tn) || {};
    var dept = normalizeDept(String(data.dept || orig[ML.DEPT - 1] || ''));

    appendToMasterLog_({
      ticketNo:      tn,
      now:           now,
      action:        ML_ACTIONS.MANAGER_ACTION + ' — APPROVED',
      status:        'OPEN',
      dept:          dept,
      buildingZone:  String(data.buildingZone  || orig[ML.BUILDING_ZONE  - 1] || ''),
      equipType:     String(data.equipType     || orig[ML.EQUIP_TYPE     - 1] || ''),
      equipCode:     String(data.equipCode     || orig[ML.EQUIP_CODE     - 1] || ''),
      specificEquip: String(data.specificEquip || orig[ML.SPECIFIC_EQUIP - 1] || ''),
      downtimeType:  String(data.downtimeType  || orig[ML.DOWNTIME_TYPE  - 1] || ''),
      priority:      String(data.priority || orig[ML.PRIORITY - 1] || ''),
      description:   String(data.description  || orig[ML.DESCRIPTION  - 1] || ''),
      assignedTo:    String(data.assignedTo   || orig[ML.ASSIGNED_TO  - 1] || ''),
      estHours:      data.estHours || orig[ML.EST_HOURS - 1] || '',
      dateOpened:    String(orig[ML.DATE_OPENED - 1] || ''),
      addedBy:       String(orig[ML.ADDED_BY   - 1] || ''),
      updatedBy:     data.updatedBy || user.displayName,
      problemType:   String(data.problemType || orig[ML.PROBLEM_TYPE - 1] || ''),
      lineNo:        String(data.lineNo || orig[ML.LINE_NO - 1] || ''),
      notes:         data.notes || ''
    });

    appendToTicketHistory_(tn, TH_EVENTS.MOVED_TO_OPEN, 'WAITING', 'OPEN',
      data.updatedBy || user.displayName,
      'Approved by manager' + (data.assignedTo ? ' — assigned to ' + data.assignedTo : ''));

    var ss = getBoundSS_();
    removeTicketFromSheet_(ss, SH.WAITING, tn);

    var ticketData = _buildTicketDataFromMl_(orig, data);
    ticketData.priority  = data.priority  || String(orig[ML.PRIORITY - 1] || '');
    ticketData.assignedTo= data.assignedTo|| String(orig[ML.ASSIGNED_TO - 1] || '');
    ticketData.estHours  = data.estHours  || orig[ML.EST_HOURS - 1] || '';
    writeTicketToSheet_(ss, SH.OPEN, tn, ticketData, 'OPEN', dept, now, data.updatedBy || user.displayName);
    _updateTicketInSheets_(ss, tn, { status: 'OPEN', priority: ticketData.priority,
      assignedTo: ticketData.assignedTo, estHours: ticketData.estHours,
      updatedBy: data.updatedBy || user.displayName }, now);

    return { success: true, ticketNo: tn, status: 'OPEN' };
  } catch (e) {
    Logger.log('approveTicket error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  completeTicket — OPEN → PENDING VERIFICATION
//  Records work summary, actual hours, and optional temp-fix flag.
// ═══════════════════════════════════════════════════════════════════════════════

function completeTicket(data) {
  requireManager_();
  var user = getCurrentUserInfo();
  var now  = new Date();
  var tn   = String(data.ticketNo || '').trim();
  if (!tn) return { success: false, error: 'ticketNo required' };

  try {
    var orig   = getOriginalMlRow_(tn) || {};
    var latest = getLatestMlRow_(tn)   || orig;
    var dept = normalizeDept(String(orig[ML.DEPT - 1] || data.dept || ''));

    appendToMasterLog_({
      ticketNo:      tn,
      now:           now,
      action:        ML_ACTIONS.MANAGER_ACTION + ' — WORK COMPLETE',
      status:        'PENDING VERIFICATION',
      dept:          dept,
      buildingZone:  String(orig[ML.BUILDING_ZONE  - 1] || ''),
      equipType:     String(orig[ML.EQUIP_TYPE     - 1] || ''),
      equipCode:     String(orig[ML.EQUIP_CODE     - 1] || ''),
      specificEquip: String(orig[ML.SPECIFIC_EQUIP - 1] || ''),
      downtimeType:  String(orig[ML.DOWNTIME_TYPE  - 1] || ''),
      priority:      String(latest[ML.PRIORITY     - 1] || orig[ML.PRIORITY - 1] || ''),
      description:   String(orig[ML.DESCRIPTION    - 1] || ''),
      assignedTo:    String(data.assignedTo || latest[ML.ASSIGNED_TO - 1] || ''),
      estHours:      latest[ML.EST_HOURS - 1] || '',
      actualHours:   data.actualHours || '',
      dateOpened:    String(orig[ML.DATE_OPENED - 1] || ''),
      dateCompleted: formatDateStr_(now),
      addedBy:       String(orig[ML.ADDED_BY - 1] || ''),
      updatedBy:     data.updatedBy || user.displayName,
      workSummary:   data.workSummary || '',
      correctiveAct: data.correctiveAct || '',
      rootCause:     data.rootCause || '',
      fixType:       data.fixType || '',
      tempFixFlag:   !!data.tempFixFlag,
      problemType:   String(orig[ML.PROBLEM_TYPE - 1] || ''),
      lineNo:        String(orig[ML.LINE_NO - 1] || ''),
      notes:         data.notes || ''
    });

    appendToTicketHistory_(tn, TH_EVENTS.PENDING_VERIFY, 'OPEN', 'PENDING VERIFICATION',
      data.updatedBy || user.displayName,
      'Work complete — awaiting verification' +
        (data.fixType ? ' | Fix type: ' + data.fixType : '') +
        (data.tempFixFlag ? ' | TEMP FIX flagged' : ''));

    var ss = getBoundSS_();
    _updateTicketInSheets_(ss, tn, {
      status:        'PENDING VERIFICATION',
      actualHours:   data.actualHours || '',
      fixType:       data.fixType || '',
      tempFixFlag:   data.tempFixFlag ? 'Y' : undefined,
      updatedBy:     data.updatedBy || user.displayName
    }, now);

    if (data.tempFixFlag) {
      _logTempFix_(ss, tn, data, orig, now);
    }

    return { success: true, ticketNo: tn, status: 'PENDING VERIFICATION' };
  } catch (e) {
    Logger.log('completeTicket error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  verifyAndCloseTicket — PENDING VERIFICATION → CLOSED
// ═══════════════════════════════════════════════════════════════════════════════

function verifyAndCloseTicket(data) {
  requireManager_();
  var user = getCurrentUserInfo();
  var now  = new Date();
  var tn   = String(data.ticketNo || '').trim();
  if (!tn) return { success: false, error: 'ticketNo required' };

  try {
    var orig   = getOriginalMlRow_(tn) || {};
    var latest = getLatestMlRow_(tn)   || orig;
    var dept = normalizeDept(String(orig[ML.DEPT - 1] || data.dept || ''));

    appendToMasterLog_({
      ticketNo:      tn,
      now:           now,
      action:        ML_ACTIONS.MANAGER_VERIFIED,
      status:        'CLOSED',
      dept:          dept,
      buildingZone:  String(orig[ML.BUILDING_ZONE  - 1] || ''),
      equipType:     String(orig[ML.EQUIP_TYPE     - 1] || ''),
      equipCode:     String(orig[ML.EQUIP_CODE     - 1] || ''),
      specificEquip: String(orig[ML.SPECIFIC_EQUIP - 1] || ''),
      downtimeType:  String(orig[ML.DOWNTIME_TYPE  - 1] || ''),
      priority:      String(latest[ML.PRIORITY     - 1] || orig[ML.PRIORITY - 1] || ''),
      description:   String(orig[ML.DESCRIPTION    - 1] || ''),
      assignedTo:    String(latest[ML.ASSIGNED_TO  - 1] || ''),
      actualHours:   latest[ML.ACTUAL_HOURS - 1] || '',
      dateOpened:    String(orig[ML.DATE_OPENED    - 1] || ''),
      dateCompleted: String(latest[ML.DATE_COMPLETED - 1] || ''),
      dateClosed:    formatDateStr_(now),
      workSummary:   String(latest[ML.WORK_SUMMARY   - 1] || ''),
      correctiveAct: String(latest[ML.CORRECTIVE_ACT - 1] || ''),
      rootCause:     String(latest[ML.ROOT_CAUSE     - 1] || ''),
      fixType:       String(latest[ML.FIX_TYPE       - 1] || ''),
      tempFixFlag:   String(latest[ML.TEMP_FIX_FLAG  - 1] || '') === 'Y',
      partsNeeded:   String(latest[ML.PARTS_NEEDED   - 1] || '') === 'Y',
      verifiedBy:    data.verifiedBy || user.displayName,
      verifiedDate:  formatDateStr_(now),
      addedBy:       String(orig[ML.ADDED_BY - 1] || ''),
      updatedBy:     data.verifiedBy || user.displayName,
      problemType:   String(orig[ML.PROBLEM_TYPE - 1] || ''),
      lineNo:        String(orig[ML.LINE_NO - 1] || ''),
      notes:         data.notes || '',
      sqfChecklist:  data.sqfChecklist || '',
      photoUrl:      String(orig[ML.PHOTO_URL - 1] || '')
    });

    appendToTicketHistory_(tn, TH_EVENTS.VERIFIED, 'PENDING VERIFICATION', 'CLOSED',
      data.verifiedBy || user.displayName, 'Verified by ' + (data.verifiedBy || user.displayName));
    appendToTicketHistory_(tn, TH_EVENTS.CLOSED, 'PENDING VERIFICATION', 'CLOSED',
      data.verifiedBy || user.displayName, data.notes || '');

    var ss = getBoundSS_();
    var closedData = _buildTicketDataFromMl_(latest, {
      verifiedBy:  data.verifiedBy || user.displayName,
      updatedBy:   data.verifiedBy || user.displayName,
      notes:       data.notes || ''
    });
    _moveTicketToClosed_(ss, tn, closedData, now);
    _updateTicketInSheets_(ss, tn, {
      status:       'CLOSED',
      verifiedBy:   data.verifiedBy || user.displayName,
      verifiedDate: formatDateStr_(now),
      updatedBy:    data.verifiedBy || user.displayName
    }, now);

    // Optional: clear linked temp fix record(s) when permanent repair is confirmed
    if (data.clearTempFix) {
      var clearedBy = data.verifiedBy || user.displayName;
      var tfNotes   = data.tempFixNotes || 'Cleared at ticket close';
      var tfCleared = _clearTempFixForTicket_(ss, tn, clearedBy, tfNotes, now);
      if (tfCleared > 0) {
        appendToMasterLog_({
          ticketNo:  tn,
          now:       now,
          action:    ML_ACTIONS.MANAGER_ACTION + ' — TEMP FIX CLEARED',
          status:    'CLOSED',
          dept:      dept,
          updatedBy: clearedBy,
          notes:     tfNotes
        });
        appendToTicketHistory_(tn, TH_EVENTS.TEMP_FIX_CLEARED, 'CLOSED', 'CLOSED',
          clearedBy, tfNotes);
      }
    }

    return { success: true, ticketNo: tn, status: 'CLOSED', tempFixCleared: !!(data.clearTempFix) };
  } catch (e) {
    Logger.log('verifyAndCloseTicket error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  voidTicket — any active status → VOIDED
// ═══════════════════════════════════════════════════════════════════════════════

function voidTicket(data) {
  requireManager_();
  var user = getCurrentUserInfo();
  var now  = new Date();
  var tn   = String(data.ticketNo || '').trim();
  if (!tn) return { success: false, error: 'ticketNo required' };

  try {
    var orig = getOriginalMlRow_(tn) || {};
    var prev = getLatestMlRow_(tn)   || orig;
    var prevStatus = String(prev[ML.STATUS - 1] || 'OPEN').toUpperCase();
    var dept = normalizeDept(String(orig[ML.DEPT - 1] || data.dept || ''));

    appendToMasterLog_({
      ticketNo:  tn,
      now:       now,
      action:    ML_ACTIONS.VOIDED,
      status:    'VOIDED',
      dept:      dept,
      buildingZone:  String(orig[ML.BUILDING_ZONE  - 1] || ''),
      equipType:     String(orig[ML.EQUIP_TYPE     - 1] || ''),
      equipCode:     String(orig[ML.EQUIP_CODE     - 1] || ''),
      specificEquip: String(orig[ML.SPECIFIC_EQUIP - 1] || ''),
      description:   String(orig[ML.DESCRIPTION    - 1] || ''),
      addedBy:       String(orig[ML.ADDED_BY       - 1] || ''),
      updatedBy:     data.updatedBy || user.displayName,
      problemType:   String(orig[ML.PROBLEM_TYPE   - 1] || ''),
      lineNo:        String(orig[ML.LINE_NO        - 1] || ''),
      notes:         data.reason || data.notes || ''
    });

    appendToTicketHistory_(tn, TH_EVENTS.VOIDED, prevStatus, 'VOIDED',
      data.updatedBy || user.displayName, data.reason || '');

    var ss = getBoundSS_();
    removeTicketFromSheet_(ss, SH.WAITING, tn);
    removeTicketFromSheet_(ss, SH.OPEN,    tn);
    _updateTicketInSheets_(ss, tn, { status: 'VOIDED', updatedBy: data.updatedBy || user.displayName }, now);

    return { success: true, ticketNo: tn, status: 'VOIDED' };
  } catch (e) {
    Logger.log('voidTicket error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  assignTicket — sets assignedTo + estHours on any open ticket
// ═══════════════════════════════════════════════════════════════════════════════

function assignTicket(data) {
  requireManager_();
  var user = getCurrentUserInfo();
  var now  = new Date();
  var tn   = String(data.ticketNo || '').trim();
  if (!tn) return { success: false, error: 'ticketNo required' };

  try {
    var prev   = getLatestMlRow_(tn) || {};
    var status = String(prev[ML.STATUS - 1] || 'OPEN').toUpperCase();
    var dept   = normalizeDept(String(prev[ML.DEPT - 1] || ''));

    appendToMasterLog_({
      ticketNo:  tn,
      now:       now,
      action:    ML_ACTIONS.REASSIGNED,
      status:    status,
      dept:      dept,
      assignedTo:data.assignedTo || '',
      estHours:  data.estHours   || prev[ML.EST_HOURS - 1] || '',
      updatedBy: data.updatedBy  || user.displayName,
      notes:     data.notes      || ''
    });

    appendToTicketHistory_(tn, TH_EVENTS.ASSIGNED, status, status,
      data.updatedBy || user.displayName,
      'Assigned to ' + (data.assignedTo || '—') +
        (data.estHours ? ' | Est hours: ' + data.estHours : ''));

    var ss = getBoundSS_();
    _updateTicketInSheets_(ss, tn, {
      assignedTo: data.assignedTo || '',
      estHours:   data.estHours   || '',
      updatedBy:  data.updatedBy  || user.displayName
    }, now);

    return { success: true, ticketNo: tn };
  } catch (e) {
    Logger.log('assignTicket error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  requestParts — logs parts to 🔩 Parts Needed; sets partsNeeded flag.
//  Available to TECH+.  Managers may also transition ticket to PENDING PARTS
//  by passing setStatus: 'PENDING PARTS' (only valid when current status is OPEN).
// ═══════════════════════════════════════════════════════════════════════════════

function requestParts(data) {
  var user = requireRole_(ROLES.TECH);
  var now  = new Date();
  var tn   = String(data.ticketNo || '').trim();
  if (!tn) return { success: false, error: 'ticketNo required' };

  var validParts = (data.partsList || []).filter(function(p) {
    return String(p.desc || '').trim() !== '';
  });
  if (validParts.length === 0) return { success: false, error: 'At least one part description is required' };

  var isManager = user.isManager || user.isAdmin;

  try {
    var orig   = getOriginalMlRow_(tn) || {};
    var latest = getLatestMlRow_(tn)   || orig;
    var dept   = normalizeDept(String(orig[ML.DEPT - 1] || ''));
    var equipCode     = String(orig[ML.EQUIP_CODE     - 1] || '');
    var specificEquip = String(orig[ML.SPECIFIC_EQUIP - 1] || '');
    var prevStatus    = String(latest[ML.STATUS - 1] || '').trim().toUpperCase();

    var newStatus = prevStatus;
    if (isManager && data.setStatus === 'PENDING PARTS' && prevStatus === 'OPEN') {
      newStatus = 'PENDING PARTS';
    }

    var enriched = validParts.map(function(p) {
      return { desc: String(p.desc).trim(), equipCode: equipCode, specificEquip: specificEquip, notes: String(p.notes || '').trim() };
    });

    logPartsNeeded_(tn, dept, enriched, user.displayName, now);

    var partSummary = enriched.map(function(p) { return p.desc; }).join(', ');

    appendToMasterLog_({
      ticketNo:      tn,
      now:           now,
      action:        'PARTS REQUESTED',
      status:        newStatus,
      dept:          dept,
      buildingZone:  String(orig[ML.BUILDING_ZONE  - 1] || ''),
      equipType:     String(orig[ML.EQUIP_TYPE     - 1] || ''),
      equipCode:     equipCode,
      specificEquip: specificEquip,
      downtimeType:  String(orig[ML.DOWNTIME_TYPE  - 1] || ''),
      description:   String(orig[ML.DESCRIPTION    - 1] || ''),
      priority:      String(latest[ML.PRIORITY     - 1] || ''),
      assignedTo:    String(latest[ML.ASSIGNED_TO  - 1] || ''),
      partsNeeded:   true,
      dateOpened:    String(orig[ML.DATE_OPENED  - 1] || ''),
      addedBy:       String(orig[ML.ADDED_BY     - 1] || ''),
      updatedBy:     user.displayName,
      problemType:   String(orig[ML.PROBLEM_TYPE - 1] || ''),
      lineNo:        String(orig[ML.LINE_NO       - 1] || ''),
      notes:         (data.notes ? data.notes + ' | ' : '') + enriched.length + ' part(s): ' + partSummary
    });

    appendToTicketHistory_(tn, TH_EVENTS.PARTS_REQUESTED, prevStatus, newStatus,
      user.displayName,
      enriched.length + ' part(s) requested: ' + partSummary);

    var ss = getBoundSS_();
    _updateTicketInSheets_(ss, tn, {
      partsNeeded: 'Y',
      status:      newStatus,
      updatedBy:   user.displayName
    }, now);

    sendPartsNeededEmail_(tn, {
      dept:          dept,
      specificEquip: specificEquip,
      equipCode:     equipCode,
      addedBy:       user.displayName,
      partsList:     enriched
    });

    return { success: true, ticketNo: tn, partsLogged: enriched.length, status: newStatus };
  } catch (e) {
    Logger.log('requestParts error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  updateTicket — add notes / change mid-workflow state
//  Techs: notes only.  Managers: notes + status/priority/assignedTo/estHours.
//  Valid manager status transitions: any of {OPEN, ON HOLD, PENDING PARTS}.
// ═══════════════════════════════════════════════════════════════════════════════

function updateTicket(data) {
  var user = requireRole_(ROLES.TECH);
  var now  = new Date();
  var tn   = String(data.ticketNo || '').trim();
  if (!tn) return { success: false, error: 'ticketNo required' };

  var isManager = user.isManager || user.isAdmin;

  try {
    var orig   = getOriginalMlRow_(tn) || {};
    var latest = getLatestMlRow_(tn)   || orig;
    var dept   = normalizeDept(String(orig[ML.DEPT - 1] || ''));
    var prevStatus = String(latest[ML.STATUS - 1] || '').trim().toUpperCase();

    var MID_STATUSES = ['OPEN', 'ON HOLD', 'PENDING PARTS'];
    var newStatus = prevStatus;
    if (isManager && data.status) {
      var s = data.status.trim().toUpperCase();
      if (MID_STATUSES.indexOf(s) >= 0) newStatus = s;
    }

    var prevPriority = String(latest[ML.PRIORITY    - 1] || '');
    var prevAssigned = String(latest[ML.ASSIGNED_TO - 1] || '');
    var prevEst      = latest[ML.EST_HOURS - 1] || '';

    var newPriority = isManager && data.priority  ? String(data.priority)  : prevPriority;
    var newAssigned = isManager && data.assignedTo !== undefined ? String(data.assignedTo) : prevAssigned;
    var newEstHours = isManager && data.estHours  !== undefined ? data.estHours             : prevEst;

    appendToMasterLog_({
      ticketNo:      tn,
      now:           now,
      action:        ML_ACTIONS.UPDATED,
      status:        newStatus,
      dept:          dept,
      buildingZone:  String(orig[ML.BUILDING_ZONE  - 1] || ''),
      equipType:     String(orig[ML.EQUIP_TYPE     - 1] || ''),
      equipCode:     String(orig[ML.EQUIP_CODE     - 1] || ''),
      specificEquip: String(orig[ML.SPECIFIC_EQUIP - 1] || ''),
      downtimeType:  String(orig[ML.DOWNTIME_TYPE  - 1] || ''),
      description:   String(orig[ML.DESCRIPTION    - 1] || ''),
      priority:      newPriority,
      assignedTo:    newAssigned,
      estHours:      newEstHours,
      dateOpened:    String(orig[ML.DATE_OPENED  - 1] || ''),
      addedBy:       String(orig[ML.ADDED_BY     - 1] || ''),
      updatedBy:     user.displayName,
      problemType:   String(orig[ML.PROBLEM_TYPE - 1] || ''),
      lineNo:        String(orig[ML.LINE_NO       - 1] || ''),
      notes:         data.notes || ''
    });

    var changes = [];
    if (data.notes) changes.push(data.notes);
    if (newStatus   !== prevStatus)   changes.push('Status: ' + prevStatus + ' → ' + newStatus);
    if (newPriority !== prevPriority) changes.push('Priority → ' + newPriority);
    if (newAssigned !== prevAssigned) changes.push('Assigned → ' + (newAssigned || '—'));

    appendToTicketHistory_(tn, TH_EVENTS.UPDATED, prevStatus, newStatus,
      user.displayName, changes.join(' | '));

    var ss = getBoundSS_();
    var sheetUpdates = { status: newStatus, updatedBy: user.displayName };
    if (newPriority)    sheetUpdates.priority   = newPriority;
    if (isManager) {
      sheetUpdates.assignedTo = newAssigned;
      sheetUpdates.estHours   = newEstHours;
    }
    _updateTicketInSheets_(ss, tn, sheetUpdates, now);

    return { success: true, ticketNo: tn, status: newStatus };
  } catch (e) {
    Logger.log('updateTicket error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  flagTempFix — logs a temp-fix entry; updates flag in all active sheets
// ═══════════════════════════════════════════════════════════════════════════════

function flagTempFix(data) {
  requireManager_();
  var user = getCurrentUserInfo();
  var now  = new Date();
  var tn   = String(data.ticketNo || '').trim();
  if (!tn) return { success: false, error: 'ticketNo required' };

  try {
    var orig = getOriginalMlRow_(tn) || {};
    var prev = getLatestMlRow_(tn)   || orig;
    var status = String(prev[ML.STATUS - 1] || 'OPEN').toUpperCase();
    var dept   = normalizeDept(String(orig[ML.DEPT - 1] || ''));

    appendToMasterLog_({
      ticketNo:    tn,
      now:         now,
      action:      ML_ACTIONS.MANAGER_ACTION + ' — TEMP FIX FLAGGED',
      status:      status,
      dept:        dept,
      equipCode:   String(orig[ML.EQUIP_CODE     - 1] || ''),
      specificEquip:String(orig[ML.SPECIFIC_EQUIP- 1] || ''),
      description: String(orig[ML.DESCRIPTION    - 1] || ''),
      tempFixFlag: true,
      updatedBy:   data.updatedBy || user.displayName,
      notes:       data.tempFixDesc || data.notes || ''
    });

    appendToTicketHistory_(tn, TH_EVENTS.TEMP_FIX, status, status,
      data.updatedBy || user.displayName,
      'Temp fix flagged — ' + (data.tempFixDesc || ''));

    var ss = getBoundSS_();
    _logTempFix_(ss, tn, data, orig, now);
    _updateTicketInSheets_(ss, tn, { tempFixFlag: 'Y', updatedBy: data.updatedBy || user.displayName }, now);

    return { success: true, ticketNo: tn };
  } catch (e) {
    Logger.log('flagTempFix error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  transferTicket — reroutes ticket to a different dept tracker
// ═══════════════════════════════════════════════════════════════════════════════

function transferTicket(data) {
  requireManager_();
  var user = getCurrentUserInfo();
  var now  = new Date();
  var tn   = String(data.ticketNo || '').trim();
  if (!tn) return { success: false, error: 'ticketNo required' };

  try {
    var orig     = getOriginalMlRow_(tn) || {};
    var prev     = getLatestMlRow_(tn)   || orig;
    var fromDept = normalizeDept(String(prev[ML.DEPT - 1] || data.fromDept || ''));
    var toDept   = normalizeDept(String(data.toDept   || ''));
    var status   = String(prev[ML.STATUS - 1] || 'OPEN').toUpperCase();
    if (!toDept)   return { success: false, error: 'toDept required' };

    appendToMasterLog_({
      ticketNo:  tn,
      now:       now,
      action:    ML_ACTIONS.DEPT_TRANSFER,
      status:    status,
      dept:      toDept,
      buildingZone:  String(orig[ML.BUILDING_ZONE  - 1] || ''),
      equipType:     String(orig[ML.EQUIP_TYPE     - 1] || ''),
      equipCode:     String(orig[ML.EQUIP_CODE     - 1] || ''),
      specificEquip: String(orig[ML.SPECIFIC_EQUIP - 1] || ''),
      description:   String(orig[ML.DESCRIPTION    - 1] || ''),
      assignedTo:    String(prev[ML.ASSIGNED_TO    - 1] || ''),
      updatedBy:     data.updatedBy || user.displayName,
      problemType:   String(orig[ML.PROBLEM_TYPE   - 1] || ''),
      lineNo:        String(orig[ML.LINE_NO        - 1] || ''),
      notes:         data.reason || ''
    });

    appendToTicketHistory_(tn, TH_EVENTS.TRANSFERRED, fromDept, toDept,
      data.updatedBy || user.displayName,
      'Transferred: ' + fromDept + ' → ' + toDept + (data.reason ? ' | ' + data.reason : ''));

    var ss         = getBoundSS_();
    var oldTracker = getTrackerForDept(fromDept, '', '');
    var newTracker = getTrackerForDept(toDept,   '', '');
    if (oldTracker !== newTracker) {
      removeTicketFromSheet_(ss, oldTracker, tn);
      var td = _buildTicketDataFromMl_(orig, { dept: toDept, updatedBy: data.updatedBy || user.displayName });
      td.dept = toDept;
      writeTicketToSheet_(ss, newTracker, tn, td, status, toDept, now, data.updatedBy || user.displayName);
    }

    // Notify both dept managers; track send status in Transfer Log
    var emailSent = 'N';
    try {
      sendTransferNotification_(tn, {
        fromDept:      fromDept,
        toDept:        toDept,
        updatedBy:     data.updatedBy || user.displayName,
        reason:        data.reason || '',
        specificEquip: String(orig[ML.SPECIFIC_EQUIP - 1] || ''),
        equipCode:     String(orig[ML.EQUIP_CODE     - 1] || ''),
        equipType:     String(orig[ML.EQUIP_TYPE     - 1] || ''),
        description:   String(orig[ML.DESCRIPTION    - 1] || '')
      });
      emailSent = 'Y';
    } catch (eEmail) {
      Logger.log('transferTicket/sendTransferNotification_ error: ' + eEmail.message);
    }

    var tlSh = ss.getSheetByName(SH.TRANSFER_LOG);
    if (tlSh) {
      tlSh.appendRow([
        'TRF-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMddHHmmss'),
        tn,
        formatTimestamp_(now),
        fromDept,
        toDept,
        data.updatedBy || user.displayName,
        data.reason || '',
        emailSent
      ]);
    }

    return { success: true, ticketNo: tn, fromDept: fromDept, toDept: toDept };
  } catch (e) {
    Logger.log('transferTicket error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Sheet manipulation helpers
// ═══════════════════════════════════════════════════════════════════════════════

// Removes a ticket row from a queue or tracker sheet.
function removeTicketFromSheet_(ss, sheetName, ticketNo) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 1) return;
  var startRow = isTrackerSheet_(sheetName) ? TRACKER_PRIO_START : QUEUE_FROZEN + 1;
  if (sh.getLastRow() < startRow) return;
  var rowToDelete = findTicketRowInSheet_(sh, ticketNo, startRow);
  if (rowToDelete > 0) sh.deleteRow(rowToDelete);
}

// Updates status / key fields across OPEN queue, WAITING queue, and dept tracker.
function _updateTicketInSheets_(ss, ticketNo, updates, now) {
  var orig    = getOriginalMlRow_(ticketNo);
  var dept    = orig ? normalizeDept(String(orig[ML.DEPT - 1] || '')) : '';
  var tracker = getTrackerForDept(dept,
    orig ? String(orig[ML.PROBLEM_TYPE - 1] || '') : '',
    orig ? String(orig[ML.EQUIP_TYPE   - 1] || '') : '');

  [SH.OPEN, SH.WAITING, tracker].forEach(function(shName) {
    if (!shName) return;
    var sh = ss.getSheetByName(shName);
    if (!sh || sh.getLastRow() < 1) return;
    var startRow = isTrackerSheet_(shName) ? TRACKER_PRIO_START : QUEUE_FROZEN + 1;
    var row = findTicketRowInSheet_(sh, ticketNo, startRow);
    if (row < 0) return;
    var base = TK_DATA_COL - 1; // offset: col index = base + TK.field
    if (updates.status)      sh.getRange(row, base + TK.STATUS).setValue(updates.status);
    if (updates.priority)    sh.getRange(row, base + TK.PRIORITY).setValue(updates.priority);
    if (updates.assignedTo !== undefined) sh.getRange(row, base + TK.ASSIGNED_TO).setValue(updates.assignedTo);
    if (updates.estHours   !== undefined) sh.getRange(row, base + TK.EST_HOURS).setValue(updates.estHours);
    if (updates.actualHours !== undefined) sh.getRange(row, base + TK.ACTUAL_HOURS).setValue(updates.actualHours);
    if (updates.fixType)     sh.getRange(row, base + TK.FIX_TYPE).setValue(updates.fixType);
    if (updates.tempFixFlag) sh.getRange(row, base + TK.TEMP_FIX_FLAG).setValue(updates.tempFixFlag);
    if (updates.partsNeeded) sh.getRange(row, base + TK.PARTS_NEEDED).setValue('Y');
    if (updates.verifiedBy)  sh.getRange(row, base + TK.VERIFIED_BY).setValue(updates.verifiedBy);
    if (updates.verifiedDate)sh.getRange(row, base + TK.VERIFIED_DATE).setValue(updates.verifiedDate);
    if (updates.updatedBy)   sh.getRange(row, base + TK.UPDATED_BY).setValue(updates.updatedBy);
    sh.getRange(row, base + TK.LAST_UPDATED).setValue(formatTimestamp_(now));
  });
}

// Appends a row to the Closed Tickets sheet and removes it from Open queue.
function _moveTicketToClosed_(ss, ticketNo, data, now) {
  var closedSh = ss.getSheetByName(SH.CLOSED);
  if (!closedSh) return;
  var tkRow = buildTkRow_(ticketNo, data, 'CLOSED', data.dept || '', now, data.updatedBy || '');
  tkRow[TK.STATUS       - 1] = 'CLOSED';
  tkRow[TK.VERIFIED_BY  - 1] = data.verifiedBy  || '';
  tkRow[TK.VERIFIED_DATE- 1] = data.verifiedBy  ? formatDateStr_(now) : '';
  tkRow[TK.ACTUAL_HOURS - 1] = data.actualHours || '';
  tkRow[TK.UPDATED_BY   - 1] = data.updatedBy   || data.verifiedBy || '';
  // Ensure we never write into the frozen header rows.
  var nextRow = Math.max(closedSh.getLastRow() + 1, QUEUE_FROZEN + 1);
  closedSh.getRange(nextRow, TK_DATA_COL, 1, TK_COLS).setValues([tkRow]);
  // Write EMRL columns immediately after TK data (cols 28–37).
  populateEMRL_(closedSh, nextRow, data, now);
  removeTicketFromSheet_(ss, SH.OPEN, ticketNo);
}

// Writes the 10 EMRL columns for a newly closed row.
// closedSh  — the ✅ Closed Tickets sheet
// rowNum    — the 1-based sheet row just written by _moveTicketToClosed_
// data      — ticket data object (same as passed to _moveTicketToClosed_)
// now       — Date used as repair date / CA date default
function populateEMRL_(closedSh, rowNum, data, now) {
  var repairDate   = data.dateCompleted ? data.dateCompleted : formatDateStr_(now);
  var partsUsed    = String(data.workSummary || '').indexOf('Parts:') === 0
                     ? data.workSummary
                     : (data.partsUsed || '');
  var rootCause    = String(data.rootCause    || '');
  var correctiveAct= String(data.correctiveAct|| '');
  var preventiveAct= String(data.preventiveAct|| '');
  var caDate       = data.caDate || repairDate;
  var capaRequired = rootCause || correctiveAct ? 'YES' : 'NO';
  var clearanceChk = 'PENDING';
  var hadTempFix   = (data.tempFixFlag === true || String(data.tempFixFlag || '') === 'Y') ? 'Y' : 'N';
  var tfResolvedDate = String(data.tfResolvedDate || '');

  var emrlRow = [
    repairDate, partsUsed, rootCause, correctiveAct,
    preventiveAct, caDate, capaRequired, clearanceChk,
    hadTempFix, tfResolvedDate
  ];
  // EMRL columns start at sheet column TK_DATA_COL + TK_COLS = 28
  closedSh.getRange(rowNum, TK_DATA_COL + TK_COLS, 1, EMRL_COLS).setValues([emrlRow]);
}

// Appends a row to the Temp Fix Monitor sheet.
function _logTempFix_(ss, ticketNo, data, orig, now) {
  var sh = ss.getSheetByName(SH.TEMP_FIX);
  if (!sh) return;
  var cfg   = getConfig();
  var freq  = parseInt(cfg['Monitoring Frequency'] || '7', 10);
  var nextDue = new Date(now.getTime() + freq * 24 * 60 * 60 * 1000);
  sh.appendRow([
    'TF-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMddHHmmss'),
    ticketNo,
    String(orig ? orig[ML.EQUIP_CODE     - 1] : data.equipCode     || ''),
    String(orig ? orig[ML.SPECIFIC_EQUIP - 1] : data.specificEquip || ''),
    String(orig ? orig[ML.DEPT           - 1] : data.dept          || ''),
    String(orig ? orig[ML.BUILDING_ZONE  - 1] : data.buildingZone  || ''),
    formatDateStr_(now),
    String(orig ? orig[ML.DESCRIPTION    - 1] : data.description   || ''),
    data.tempFixDesc || data.workSummary || '',
    freq,
    '',
    formatDateStr_(nextDue),
    'ACTIVE',
    data.updatedBy || data.addedBy || '',
    '', '', data.notes || ''
  ]);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function _buildTicketDataFromMl_(mlRow, overrides) {
  overrides = overrides || {};
  if (!mlRow) return overrides;
  return {
    dept:          overrides.dept          || String(mlRow[ML.DEPT           - 1] || ''),
    buildingZone:  overrides.buildingZone  || String(mlRow[ML.BUILDING_ZONE  - 1] || ''),
    equipType:     overrides.equipType     || String(mlRow[ML.EQUIP_TYPE     - 1] || ''),
    equipCode:     overrides.equipCode     || String(mlRow[ML.EQUIP_CODE     - 1] || ''),
    specificEquip: overrides.specificEquip || String(mlRow[ML.SPECIFIC_EQUIP - 1] || ''),
    equipDesc:     overrides.equipDesc     || String(mlRow[ML.SPECIFIC_EQUIP - 1] || ''),
    downtimeType:  overrides.downtimeType  || String(mlRow[ML.DOWNTIME_TYPE  - 1] || ''),
    description:   overrides.description  || String(mlRow[ML.DESCRIPTION    - 1] || ''),
    problemDesc:   overrides.problemDesc  || String(mlRow[ML.DESCRIPTION    - 1] || ''),
    priority:      overrides.priority     || String(mlRow[ML.PRIORITY       - 1] || ''),
    assignedTo:    overrides.assignedTo   || String(mlRow[ML.ASSIGNED_TO    - 1] || ''),
    estHours:      overrides.estHours  !== undefined ? overrides.estHours : (mlRow[ML.EST_HOURS  - 1] || ''),
    actualHours:   overrides.actualHours !== undefined ? overrides.actualHours : (mlRow[ML.ACTUAL_HOURS - 1] || ''),
    dateOpened:    overrides.dateOpened   || mlRow[ML.DATE_OPENED    - 1] || '',
    workSummary:   overrides.workSummary  || String(mlRow[ML.WORK_SUMMARY   - 1] || ''),
    correctiveAct: overrides.correctiveAct|| String(mlRow[ML.CORRECTIVE_ACT - 1] || ''),
    fixType:       overrides.fixType      || String(mlRow[ML.FIX_TYPE       - 1] || ''),
    tempFixFlag:   overrides.tempFixFlag  !== undefined ? overrides.tempFixFlag : (String(mlRow[ML.TEMP_FIX_FLAG - 1] || '') === 'Y'),
    partsNeeded:   String(mlRow[ML.PARTS_NEEDED  - 1] || '') === 'Y',
    addedBy:       overrides.addedBy      || String(mlRow[ML.ADDED_BY      - 1] || ''),
    updatedBy:     overrides.updatedBy    || String(mlRow[ML.UPDATED_BY    - 1] || ''),
    notes:         overrides.notes        || String(mlRow[ML.NOTES         - 1] || ''),
    problemType:   overrides.problemType  || String(mlRow[ML.PROBLEM_TYPE  - 1] || ''),
    lineNo:        overrides.lineNo       || String(mlRow[ML.LINE_NO       - 1] || ''),
    verifiedBy:    overrides.verifiedBy   || String(mlRow[ML.VERIFIED_BY   - 1] || '')
  };
}

// Clears all non-CLEARED temp fix rows for a given ticket.
// Returns the count of rows cleared.
function _clearTempFixForTicket_(ss, ticketNo, clearedBy, notes, now) {
  var sh = ss.getSheetByName(SH.TEMP_FIX);
  if (!sh || sh.getLastRow() <= HIST_HEADER_ROW) return 0;
  var startRow = HIST_HEADER_ROW + 1;
  var numRows  = sh.getLastRow() - HIST_HEADER_ROW;
  var data     = sh.getRange(startRow, 1, numRows, TF_COLS).getValues();
  var cleared  = 0;
  var dateStr  = formatDateStr_(now);
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][TF.TICKET_NO - 1] || '').trim() !== ticketNo) continue;
    var status = String(data[i][TF.STATUS - 1] || '').trim().toUpperCase();
    if (status === 'CLEARED') continue;
    var sheetRow = startRow + i;
    sh.getRange(sheetRow, TF.STATUS).setValue('CLEARED');
    sh.getRange(sheetRow, TF.CLEARED_BY).setValue(clearedBy);
    sh.getRange(sheetRow, TF.CLEARED_DATE).setValue(dateStr);
    if (notes) sh.getRange(sheetRow, TF.NOTES).setValue(notes);
    cleared++;
  }
  return cleared;
}
