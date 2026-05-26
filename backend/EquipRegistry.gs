// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EquipRegistry.gs — CSC CMMS v5.0                                       ║
// ║  Equipment inventory cache.  Replaces the legacy IMPORTRANGE approach  ║
// ║  with a scheduled SpreadsheetApp.openById() pull.                       ║
// ║  The Equipment Register is READ-ONLY — this file never writes to it.   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Cache tab layout (maintained for compatibility with legacy column mapper):
//   Rows 1-3 : title / instructions / spacer  (untouched by refresh)
//   Row 4    : headers from Equipment Register source sheet
//   Row 5+   : data rows

// ═══════════════════════════════════════════════════════════════════════════════
//  refreshEquipCache
//  Pulls fresh equipment data from the Equipment Register into the cache tab.
//  Called by runHourlySync (time trigger) and manually from Admin screen.
// ═══════════════════════════════════════════════════════════════════════════════

function refreshEquipCache() {
  try {
    var tabName = getConfigValue('Equipment Inventory Tab Name');
    if (!tabName) throw new Error('"Equipment Inventory Tab Name" not set in ⚙️ Configuration');

    var srcSS = SpreadsheetApp.openById(EXT_SHEET_IDS.EQUIP_REGISTER);
    var srcSh = srcSS.getSheetByName(tabName);
    if (!srcSh) throw new Error('Tab "' + tabName + '" not found in Equipment Register');

    var srcLastRow = srcSh.getLastRow();
    var srcLastCol = srcSh.getLastColumn();
    if (srcLastRow < 2 || srcLastCol < 1) {
      Logger.log('refreshEquipCache: source sheet appears empty');
      return { success: true, rows: 0 };
    }

    var srcData = srcSh.getRange(1, 1, srcLastRow, srcLastCol).getValues();

    var cacheSh = getBoundSS_().getSheetByName(SH.EQUIP_CACHE);
    if (!cacheSh) throw new Error(SH.EQUIP_CACHE + ' tab not found in bound sheet');

    // Clear rows 4+ and rewrite (rows 1-3 are preserved meta rows)
    var clearStart = 4;
    var existingRows = cacheSh.getLastRow();
    if (existingRows >= clearStart) {
      cacheSh.getRange(clearStart, 1, existingRows - clearStart + 1, cacheSh.getLastColumn() || srcLastCol)
        .clearContent();
    }
    cacheSh.getRange(clearStart, 1, srcData.length, srcLastCol).setValues(srcData);

    // Log system action to Master Log (no ticket number — system event)
    var mlSh = getBoundSS_().getSheetByName(SH.MASTER_LOG);
    if (mlSh) {
      var row = new Array(ML_COLS).fill('');
      row[ML.ROW_ID    - 1] = generateRowId();
      row[ML.TICKET_NO - 1] = 'SYSTEM';
      row[ML.TIMESTAMP - 1] = formatTimestamp_(new Date());
      row[ML.ACTION    - 1] = ML_ACTIONS.EQUIP_CACHE_REFRESH;
      row[ML.STATUS    - 1] = 'SYSTEM';
      row[ML.NOTES     - 1] = 'Rows cached: ' + (srcLastRow - 1);
      mlSh.appendRow(row);
    }

    setConfigValue('Equip Cache Last Refreshed', formatTimestamp_(new Date()));
    return { success: true, rows: srcLastRow - 1 };
  } catch (e) {
    Logger.log('refreshEquipCache error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  getEquipmentFromInventory
//  Reads the cache tab using a flexible column header mapper (same as legacy).
//  Falls back to ⚙️ Equipment Inventory local tab if cache is empty.
// ═══════════════════════════════════════════════════════════════════════════════

function getEquipmentFromInventory() {
  var ss      = getBoundSS_();
  var cacheSh = ss.getSheetByName(SH.EQUIP_CACHE);
  if (cacheSh && cacheSh.getLastRow() > 4) {
    var cached = getEquipmentFromCache_(cacheSh);
    if (cached.length > 0) return cached;
  }
  // Fallback: local Equipment Inventory tab
  var localSh = ss.getSheetByName(SH.EQUIP_INV);
  if (!localSh || localSh.getLastRow() < 2) return [];
  var data = localSh.getRange(2, 1, localSh.getLastRow() - 1, 6).getValues();
  return data
    .filter(function(r) {
      var code = String(r[3] || '').trim();
      var spec = String(r[4] || '').trim();
      var stat = String(r[5] || '').trim().toUpperCase();
      return (code || spec) && stat !== 'INACTIVE';
    })
    .map(function(r) {
      return {
        dept:     String(r[0] || '').trim() || 'UNASSIGNED',
        group:    String(r[1] || '').trim(),
        eType:    String(r[2] || '').trim() || 'GENERAL',
        code:     String(r[3] || '').trim(),
        specific: String(r[4] || '').trim(),
        status:   String(r[5] || '').trim() || 'ACTIVE'
      };
    });
}

// Reads cache tab with flexible column header mapping.
function getEquipmentFromCache_(cacheSh) {
  var lastRow = cacheSh.getLastRow();
  var lastCol = cacheSh.getLastColumn();
  if (lastRow < 5 || lastCol < 1) return [];

  var headers = cacheSh.getRange(4, 1, 1, lastCol).getValues()[0]
    .map(function(h) { return String(h || '').trim().toLowerCase(); });

  var colMap   = {};
  var mappings = {
    dept:     ['department','dept','dept.'],
    deptCode: ['dept code','department code','dept #','dept no','dept no.','dept number','department #'],
    group:    ['group','category','equipment group','line #','line#','line number','line'],
    eType:    ['equipment type','equip type','type'],
    code:     ['equipment code','equip code','code','asset code','job #','job no','id','job number','job no.'],
    specific: ['specific equipment','equipment name','name','description','asset name','equipment description'],
    status:   ['status','active','state']
  };
  Object.keys(mappings).forEach(function(key) {
    for (var i = 0; i < headers.length; i++) {
      if (mappings[key].indexOf(headers[i]) >= 0) { colMap[key] = i; break; }
    }
  });

  var data = cacheSh.getRange(5, 1, lastRow - 4, lastCol).getValues();
  return data
    .filter(function(r) {
      var code = colMap.code     !== undefined ? String(r[colMap.code]     || '').trim() : '';
      var spec = colMap.specific !== undefined ? String(r[colMap.specific] || '').trim() : '';
      var stat = colMap.status   !== undefined ? String(r[colMap.status]   || '').trim().toUpperCase() : 'ACTIVE';
      return (code || spec) && stat !== 'INACTIVE' && stat !== '';
    })
    .map(function(r) {
      function col(k) { return colMap[k] !== undefined ? String(r[colMap[k]] || '').trim() : ''; }
      return {
        dept:     col('dept')     || 'UNASSIGNED',
        deptCode: col('deptCode'),
        group:    col('group'),
        eType:    col('eType')    || 'GENERAL',
        code:     col('code'),
        specific: col('specific'),
        status:   col('status')   || 'ACTIVE'
      };
    });
}

// Returns { dept: { eType: [{ code, specific, status, deptCode, group }] } }
function getEquipmentHierarchy() {
  var equip     = getEquipmentFromInventory();
  var hierarchy = {};
  equip.forEach(function(e) {
    var dept  = normalizeDept(e.dept) || 'UNASSIGNED';
    var eType = e.eType || 'GENERAL';
    if (!hierarchy[dept])        hierarchy[dept]        = {};
    if (!hierarchy[dept][eType]) hierarchy[dept][eType] = [];
    hierarchy[dept][eType].push(e);
  });
  return hierarchy;
}

// Returns flat array of equipment items for cascade lookups.
function getEquipmentFlatList() {
  return getEquipmentFromInventory().map(function(e) {
    return {
      dept:     normalizeDept(e.dept),
      deptCode: e.deptCode,
      group:    e.group,
      eType:    e.eType,
      code:     e.code,
      specific: e.specific
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  runHourlySync
//  Time-driven trigger handler.  Step 5 adds syncExternalTickets() here.
// ═══════════════════════════════════════════════════════════════════════════════

function runHourlySync() {
  try { refreshEquipCache(); }      catch (e) { Logger.log('runHourlySync/equip: '   + e.message); }
  // syncExternalTickets() added in Step 5
}
