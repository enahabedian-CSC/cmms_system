// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  TicketSubmission.gs — CSC CMMS v5.0                                    ║
// ║  New internal ticket creation — Step 4.                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  getAddTicketFormData
//  Returns all dropdown data and equipment hierarchy needed to render the
//  three-step submission form.  Any @cscmfg.com user may call this.
// ═══════════════════════════════════════════════════════════════════════════════

function getAddTicketFormData() {
  var user  = getCurrentUserInfo();
  if (user.role === ROLES.NOACCESS) throw new Error('UNAUTHORIZED');

  var cfg   = getConfig();
  var lists = getAllDataLists();

  // All roles see all departments on submission.
  // Managers naturally select their own dept; nothing prevents submitting
  // a ticket for another dept (e.g. reporting a problem in a different area).
  var departments = DEPT_TRACKERS.map(function(dt) { return dt.dept; });

  var routingRules = [];
  try { routingRules = JSON.parse(getConfigValue('Routing Override Rules') || '[]'); } catch (e) { routingRules = []; }
  if (!routingRules.length) {
    routingRules = [
      { keyword: 'ELECTRICAL', matchOn: 'PROBLEM_TYPE', routeTo: 'ELECTRICAL' },
      { keyword: 'FACILITY',   matchOn: 'EQUIP_DESC',   routeTo: 'FACILITIES' }
    ];
  }

  return {
    companyName:    String(cfg['Company Name']          || 'Container Supply Co.'),
    docNo:          String(cfg['Doc No (Ticket Form)']  || 'FRM-030-004'),
    revision:       String(cfg['Revision']              || '0'),
    departments:    departments,
    equipHierarchy: getEquipmentHierarchy(),
    buildingZones:  lists['Building / Zone'] || [],
    priorities:     lists['Priorities']      || ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    problemTypes:   lists['Problem Types']   || [],
    downtimeTypes:  lists['Downtime Types']  || ['PLANNED', 'UNPLANNED'],
    peopleList:     getPeopleList_(),
    userDisplayName: user.displayName,
    userOwnedDepts:  user.ownedDepts,
    userIsManager:   !!(user.isManager || user.role === ROLES.ADMIN),
    routingRules:    routingRules,
    deptMapping:     getDeptMapping_()
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  addNewTicket
//  Invariant: writes to Master Log AND Ticket History before returning.
//  CRITICAL tickets bypass the Waiting Queue → OPEN + dept tracker directly.
//  Non-CRITICAL → WAITING + dept tracker; manager notification email sent.
// ═══════════════════════════════════════════════════════════════════════════════

function addNewTicket(data) {
  var user = getCurrentUserInfo();
  if (user.role === ROLES.NOACCESS) throw new Error('UNAUTHORIZED');

  if (!String(data.equipType || '').trim()) {
    return { success: false, error: 'Equipment type or description is required.' };
  }

  try {
    var now        = new Date();
    var dept       = normalizeDept(data.dept || '');
    var isCritical = String(data.priority || '').toUpperCase() === 'CRITICAL';
    var status     = isCritical ? 'OPEN' : 'WAITING';
    var tracker    = getTrackerForDept(dept, data.problemType, data.equipType);
    var ticketNo   = generateTicketNumber(dept);
    var addedBy    = data.addedBy || user.displayName || user.email;

    // ── MANDATORY: Master Log write ───────────────────────────────────────
    appendToMasterLog_({
      ticketNo:      ticketNo,
      now:           now,
      action:        isCritical ? ML_ACTIONS.TICKET_CREATED_CRIT : ML_ACTIONS.TICKET_CREATED,
      status:        status,
      dept:          dept,
      buildingZone:  data.buildingZone  || '',
      equipType:     data.equipType     || '',
      equipCode:     data.equipCode     || '',
      specificEquip: data.specificEquip || data.equipDesc || '',
      downtimeType:  data.downtimeType  || '',
      priority:      data.priority      || '',
      description:   data.description   || data.problemDesc || '',
      observations:  data.observations  || '',
      problemType:   data.problemType   || '',
      lineNo:        data.lineNo        || '',
      addedBy:       addedBy,
      updatedBy:     addedBy,
      partsNeeded:   data.partsNeeded   || false,
      dateOpened:    isCritical ? formatDateStr_(now) : '',
      photoUrl:      data.photoUrl      || ''
    });

    // ── MANDATORY: Ticket History write ──────────────────────────────────
    appendToTicketHistory_(
      ticketNo,
      TH_EVENTS.CREATED,
      '',
      status,
      addedBy,
      isCritical
        ? 'Critical — bypassed waiting queue → ' + tracker
        : 'Created → Waiting Queue | Tracker: ' + tracker
    );

    // ── Queue / tracker sheet writes ──────────────────────────────────────
    var ss        = getBoundSS_();
    var destQueue = isCritical ? SH.OPEN : SH.WAITING;
    writeTicketToSheet_(ss, destQueue, ticketNo, data, status, dept, now, addedBy);
    writeTicketToSheet_(ss, tracker,   ticketNo, data, status, dept, now, addedBy);

    // ── Optional: log parts needed ────────────────────────────────────────
    if (data.partsNeeded && data.partsList && data.partsList.length > 0) {
      logPartsNeeded_(ticketNo, dept, data.partsList, addedBy, now);
    }

    // ── Email notification (non-CRITICAL only) — Email.gs / Step 8 ───────
    if (!isCritical) {
      sendNewTicketManagerNotification_(ticketNo, {
        dept:          dept,
        source:        'INTERNAL',
        specificEquip: data.specificEquip || data.equipDesc || '',
        equipCode:     data.equipCode     || '',
        equipType:     data.equipType     || '',
        description:   data.description   || data.problemDesc || '',
        addedBy:       addedBy,
        lineNo:        data.lineNo        || '',
        downtimeType:  data.downtimeType  || '',
        dateOpened:    formatDateStr_(now)
      });
    }

    return { success: true, ticketNo: ticketNo, status: status, tracker: tracker };
  } catch (e) {
    Logger.log('addNewTicket error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  writeTicketToSheet_
//  Builds a TK row and inserts it into the correct section of a tracker or
//  queue sheet.  Matches the legacy writeTicketToTrackerSheet_ logic exactly.
// ═══════════════════════════════════════════════════════════════════════════════

function writeTicketToSheet_(ss, sheetName, ticketNo, data, status, dept, now, addedBy) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh) { Logger.log('writeTicketToSheet_: not found: ' + sheetName); return; }

  var tkRow = buildTkRow_(ticketNo, data, status, dept, now, addedBy);

  var isDeptTracker = isTrackerSheet_(sheetName);
  var isPriority    = ['CRITICAL', 'HIGH'].indexOf(String(data.priority || '').toUpperCase()) >= 0;

  var sectionStart, sectionEnd;
  if (isDeptTracker) {
    sectionStart = isPriority ? TRACKER_PRIO_START : TRACKER_OPEN_START;
    sectionEnd   = isPriority ? TRACKER_PRIO_END   : sh.getLastRow() + 300;
  } else {
    sectionStart = QUEUE_FROZEN + 1;
    sectionEnd   = sh.getLastRow() + 300;
  }

  var nextRow = -1;
  var maxScan = Math.max(sectionEnd, sectionStart + 300);
  for (var r = sectionStart; r <= maxScan; r++) {
    if (isDeptTracker && (r === TRACKER_OPEN_BANNER || r === TRACKER_OPEN_HDR)) continue;
    var val = sh.getRange(r, TK_DATA_COL).getValue();
    if (!val || String(val).trim() === '') { nextRow = r; break; }
  }
  if (nextRow < 0) nextRow = sh.getLastRow() + 1;

  sh.getRange(nextRow, TK_DATA_COL, 1, TK_COLS).setValues([tkRow]);
}

function buildTkRow_(ticketNo, data, status, dept, now, addedBy) {
  var row = new Array(TK_COLS).fill('');
  row[TK.TICKET_NO      - 1] = ticketNo;
  row[TK.STATUS         - 1] = status;
  row[TK.PRIORITY       - 1] = data.priority      || '';
  row[TK.DEPT           - 1] = dept               || normalizeDept(data.dept || '');
  row[TK.BUILDING_ZONE  - 1] = normalizeBuildingZone(data.buildingZone || '');
  row[TK.EQUIP_TYPE     - 1] = data.equipType     || '';
  row[TK.EQUIP_CODE     - 1] = data.equipCode     || '';
  row[TK.SPECIFIC_EQUIP - 1] = data.specificEquip || data.equipDesc || '';
  row[TK.DOWNTIME_TYPE  - 1] = data.downtimeType  || '';
  row[TK.PROBLEM_TYPE   - 1] = data.problemType   || '';
  row[TK.DESCRIPTION    - 1] = data.description   || data.problemDesc || '';
  row[TK.LINE_NO        - 1] = data.lineNo        || '';
  row[TK.ASSIGNED_TO    - 1] = data.assignedTo    || '';
  row[TK.EST_HOURS      - 1] = data.estHours      || '';
  row[TK.DATE_OPENED    - 1] = formatTimestamp_(now);
  row[TK.LAST_UPDATED   - 1] = formatTimestamp_(now);
  row[TK.FIX_TYPE       - 1] = data.fixType       || '';
  row[TK.TEMP_FIX_FLAG  - 1] = data.tempFixFlag   ? 'Y' : 'N';
  row[TK.PARTS_NEEDED   - 1] = data.partsNeeded   ? 'Y' : 'N';
  row[TK.ADDED_BY       - 1] = addedBy            || '';
  row[TK.UPDATED_BY     - 1] = addedBy            || '';
  row[TK.NOTES          - 1] = buildNotesField_(data.observations, data.notes);
  return row;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  logPartsNeeded_
// ═══════════════════════════════════════════════════════════════════════════════

function logPartsNeeded_(ticketNo, dept, partsList, requestedBy, now) {
  var sh = getBoundSS_().getSheetByName(SH.PARTS_NEEDED);
  if (!sh) return;
  partsList.forEach(function(p) {
    var row = new Array(PN_COLS).fill('');
    row[PN.PART_ID        - 1] = 'PN-' + generateRowId();
    row[PN.PART_DESC      - 1] = String(p.desc || p.partDesc || '').trim();
    row[PN.TICKET_NO      - 1] = ticketNo;
    row[PN.EQUIP_CODE     - 1] = String(p.equipCode || '').trim();
    row[PN.SPECIFIC_EQUIP - 1] = String(p.specificEquip || '').trim();
    row[PN.DEPT           - 1] = dept;
    row[PN.DATE_REQUESTED - 1] = formatDateStr_(now);
    row[PN.PARTS_STATUS   - 1] = 'PENDING';
    row[PN.ORDERED_BY     - 1] = requestedBy || '';
    row[PN.NOTES          - 1] = String(p.notes || '').trim();
    sh.appendRow(row);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  getPeopleList_
//  Combined technicians + managers for "Added By" dropdown.
// ═══════════════════════════════════════════════════════════════════════════════

function getPeopleList_() {
  var techs   = getDataList('Technicians') || [];
  var techSet = {};
  techs.forEach(function(t) { techSet[t.toLowerCase().trim()] = true; });
  var result  = techs.slice();
  getManagerConfig().forEach(function(m) {
    var name = (m.managerName || '').trim();
    if (name && !techSet[name.toLowerCase().trim()]) result.push(name);
  });
  return result;
}

// sendNewTicketManagerNotification_ is implemented in Email.gs.
