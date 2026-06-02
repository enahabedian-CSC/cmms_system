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
    if (!tabName) throw new Error(
      '"Equipment Inventory Tab Name" is not set in ⚙️ Configuration. ' +
      'Add a row with key "Equipment Inventory Tab Name" and the exact tab name from the Equipment Register.'
    );

    var sheetId = getEquipRegisterSheetId_();
    var srcSS = SpreadsheetApp.openById(sheetId);
    var srcSh = srcSS.getSheetByName(tabName);
    if (!srcSh) throw new Error(
      'Tab "' + tabName + '" not found in the Equipment Register spreadsheet. ' +
      'Verify the tab name in ⚙️ Configuration matches exactly (case-sensitive).'
    );

    var srcLastRow = srcSh.getLastRow();
    var srcLastCol = srcSh.getLastColumn();
    if (srcLastRow < 2 || srcLastCol < 1) {
      Logger.log('refreshEquipCache: source sheet appears empty, skipping write');
      return { success: true, rows: 0, warning: 'Source tab is empty — no equipment cached.' };
    }

    var srcData = srcSh.getRange(1, 1, srcLastRow, srcLastCol).getValues();

    // Find the real header row — skip title/logo rows that precede the column labels.
    // We scan the first 10 rows and pick the one with the most recognised header matches.
    // Falls back to the first row with ≥ 3 non-empty cells, then row 0.
    var headerRowIdx = _findSourceHeaderRow_(srcData);
    var relevantData = srcData.slice(headerRowIdx); // header row + data rows only

    var cacheSh = getBoundSS_().getSheetByName(SH.EQUIP_CACHE);
    if (!cacheSh) throw new Error(SH.EQUIP_CACHE + ' tab not found in bound sheet');

    // Clear rows 4+ and rewrite (rows 1-3 are preserved meta rows)
    var clearStart = 4;
    var existingRows = cacheSh.getLastRow();
    if (existingRows >= clearStart) {
      cacheSh.getRange(clearStart, 1, existingRows - clearStart + 1, cacheSh.getLastColumn() || srcLastCol)
        .clearContent();
    }
    cacheSh.getRange(clearStart, 1, relevantData.length, srcLastCol).setValues(relevantData);

    var dataRows = relevantData.length - 1; // minus the header row
    var now = new Date();

    // Log success to Master Log
    var mlSh = getBoundSS_().getSheetByName(SH.MASTER_LOG);
    if (mlSh) {
      var row = new Array(ML_COLS).fill('');
      row[ML.ROW_ID    - 1] = generateRowId();
      row[ML.TICKET_NO - 1] = 'SYSTEM';
      row[ML.TIMESTAMP - 1] = formatTimestamp_(now);
      row[ML.ACTION    - 1] = ML_ACTIONS.EQUIP_CACHE_REFRESH;
      row[ML.STATUS    - 1] = 'SYSTEM';
      row[ML.NOTES     - 1] = 'Rows cached: ' + dataRows + ' | Header at source row: ' + (headerRowIdx + 1) + ' | Tab: ' + tabName + ' | SheetID: ' + sheetId;
      mlSh.appendRow(row);
    }

    setConfigValue('Equip Cache Last Refreshed', formatTimestamp_(now));
    return { success: true, rows: dataRows };
  } catch (e) {
    Logger.log('refreshEquipCache error: ' + e.message);
    // Write failure to Master Log so admins can diagnose without checking script logs
    try {
      var mlSh2 = getBoundSS_().getSheetByName(SH.MASTER_LOG);
      if (mlSh2) {
        var errRow = new Array(ML_COLS).fill('');
        errRow[ML.ROW_ID    - 1] = generateRowId();
        errRow[ML.TICKET_NO - 1] = 'SYSTEM';
        errRow[ML.TIMESTAMP - 1] = formatTimestamp_(new Date());
        errRow[ML.ACTION    - 1] = 'EQUIP CACHE REFRESH FAILED';
        errRow[ML.STATUS    - 1] = 'ERROR';
        errRow[ML.NOTES     - 1] = e.message;
        mlSh2.appendRow(errRow);
      }
    } catch (logErr) { /* ignore secondary log failure */ }
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

// Shared column-header → field mapping.  Used by both getEquipmentFromCache_
// and getEquipCacheStatus (diagnostic).  Keys are field names; values are arrays
// of lowercase header strings that map to that field.
var _EQUIP_COL_MAPPINGS_ = {
  dept:     ['department','dept','dept.','department name','dept name',
             'area','division','plant','facility','location','cost center',
             'work center','workcenter','shop','building'],
  deptCode: ['dept code','department code','dept #','dept no','dept no.',
             'dept number','department #'],
  group:    ['group','equipment group','line #','line#','line number',
             'line','asset group','sub-type','subtype','sub type'],
  eType:    ['equipment type','equip type','type','asset type','machine type',
             'category','class','equipment class','asset class','object type',
             'machine class'],
  code:     ['equipment code','equip code','code','asset code',
             'job #','job no','job no.','job number',
             'id','asset id','asset #','asset no','asset no.','asset number',
             'machine code','machine #','machine id','machine no','machine no.',
             'equip id','equip #','equip no','equip no.','equip number',
             'equipment #','equipment id','equipment no','equipment no.',
             'equipment number','plant no','plant #','plant no.','no.','number',
             'serial','serial #','serial no','serial number'],
  specific: ['specific equipment','equipment name','name','description',
             'asset name','equipment description','machine name','equip name',
             'item','item name','equipment','machine','asset description',
             'short text','desc','long description','full name','title'],
  status:   ['status','active','state','asset status','equip status',
             'condition','in service','active/inactive']
};

// Reads cache tab with flexible column header mapping.
function getEquipmentFromCache_(cacheSh) {
  var lastRow = cacheSh.getLastRow();
  var lastCol = cacheSh.getLastColumn();
  if (lastRow < 5 || lastCol < 1) return [];

  var headers = cacheSh.getRange(4, 1, 1, lastCol).getValues()[0]
    .map(function(h) { return String(h || '').trim().toLowerCase(); });

  var colMap = _buildEquipColMap_(headers);

  var data = cacheSh.getRange(5, 1, lastRow - 4, lastCol).getValues();
  return data
    .filter(function(r) {
      var stat = colMap.status !== undefined
        ? String(r[colMap.status] || '').trim().toUpperCase()
        : 'ACTIVE';
      if (stat === 'INACTIVE') return false;

      // If code or specific columns were recognised, require at least one to be non-empty.
      // If NEITHER was recognised (headers didn't match), accept any non-empty row so we
      // don't silently discard all data due to an unrecognised column name.
      if (colMap.code !== undefined || colMap.specific !== undefined) {
        var code = colMap.code     !== undefined ? String(r[colMap.code]     || '').trim() : '';
        var spec = colMap.specific !== undefined ? String(r[colMap.specific] || '').trim() : '';
        return !!(code || spec);
      }
      return r.some(function(cell) { return String(cell || '').trim() !== ''; });
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

// Builds a colIndex map from lowercased headers using _EQUIP_COL_MAPPINGS_.
function _buildEquipColMap_(lowerHeaders) {
  var colMap = {};
  Object.keys(_EQUIP_COL_MAPPINGS_).forEach(function(key) {
    var variants = _EQUIP_COL_MAPPINGS_[key];
    for (var i = 0; i < lowerHeaders.length; i++) {
      if (variants.indexOf(lowerHeaders[i]) >= 0) { colMap[key] = i; break; }
    }
  });
  return colMap;
}

// Scans the first 10 source rows to find which row holds the real column headers.
// Returns the 0-based index of that row.
// Strategy: pick the row with the most matches against known column-name variants.
// Tie-break / fallback: first row with ≥ 3 non-empty cells.
// Final fallback: row 0 (preserves previous behaviour).
function _findSourceHeaderRow_(srcData) {
  var allVariants = [];
  Object.keys(_EQUIP_COL_MAPPINGS_).forEach(function(key) {
    allVariants = allVariants.concat(_EQUIP_COL_MAPPINGS_[key]);
  });

  var limit          = Math.min(10, srcData.length);
  var bestIdx        = -1;
  var bestCount      = 0;
  var firstMultiCell = -1;

  for (var i = 0; i < limit; i++) {
    var row      = srcData[i];
    var nonEmpty = 0;
    var matches  = 0;
    for (var c = 0; c < row.length; c++) {
      var lc = String(row[c] || '').trim().toLowerCase();
      if (!lc) continue;
      nonEmpty++;
      if (allVariants.indexOf(lc) >= 0) matches++;
    }
    if (matches > bestCount) { bestCount = matches; bestIdx = i; }
    if (firstMultiCell < 0 && nonEmpty >= 3) firstMultiCell = i;
  }

  if (bestIdx >= 0 && bestCount > 0) return bestIdx;
  if (firstMultiCell >= 0) return firstMultiCell;
  return 0;
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

// Returns the Equipment Register sheet ID from config (preferred) or the
// hard-coded fallback constant.
// Strategy: try several common key name variants first, then scan ALL config
// values for any Google Sheets URL — so whatever key name the admin used,
// it will be found automatically.
function getEquipRegisterSheetId_() {
  var CANDIDATES = [
    'Equipment Register Sheet URL',
    'Equipment List Source URL',
    'Equipment Register URL',
    'Equip Register URL',
    'Equipment Register Sheet ID',
    'Equipment Source URL'
  ];

  function extractId_(str) {
    if (!str) return '';
    var s = String(str).trim();
    var m = s.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (m) return m[1];
    if (s.indexOf('/') < 0 && s.length >= 25) return s;
    return '';
  }

  for (var i = 0; i < CANDIDATES.length; i++) {
    var id = extractId_(getConfigValue(CANDIDATES[i]));
    if (id) return id;
  }

  // Last resort: scan every config value for a Google Sheets URL
  var cfg = getConfig();
  var keys = Object.keys(cfg);
  for (var j = 0; j < keys.length; j++) {
    var val = String(cfg[keys[j]] || '').trim();
    if (val.indexOf('docs.google.com/spreadsheets') >= 0) {
      var id2 = extractId_(val);
      if (id2) return id2;
    }
  }

  return EXT_SHEET_IDS.EQUIP_REGISTER;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  getEquipCacheStatus
//  Returns cache health diagnostics for the admin Equipment Cache screen.
//  Admin-only.
// ═══════════════════════════════════════════════════════════════════════════════

function getEquipCacheStatus() {
  requireAdmin_();

  var ss      = getBoundSS_();
  var cacheSh = ss.getSheetByName(SH.EQUIP_CACHE);

  var cacheRows     = 0;
  var lastRefreshed = String(getConfigValue('Equip Cache Last Refreshed') || '').trim() || 'Never';

  if (cacheSh && cacheSh.getLastRow() > 4) {
    cacheRows = cacheSh.getLastRow() - 4; // row 4 = headers; rows 5+ = data
  }

  // ── Column-header diagnostics ──────────────────────────────────────────
  var rawHeaders  = [];
  var mappedCols  = {};   // field → actual header string that matched
  var unmappedHdrs= [];   // headers that matched no field
  if (cacheSh && cacheSh.getLastRow() >= 4 && cacheSh.getLastColumn() >= 1) {
    var hdrVals = cacheSh.getRange(4, 1, 1, cacheSh.getLastColumn()).getValues()[0];
    rawHeaders = hdrVals.map(function(h) { return String(h || '').trim(); })
                        .filter(function(h) { return h !== ''; });
    var lowerHdrs = rawHeaders.map(function(h) { return h.toLowerCase(); });
    var colMap = _buildEquipColMap_(lowerHdrs);
    Object.keys(_EQUIP_COL_MAPPINGS_).forEach(function(field) {
      if (colMap[field] !== undefined) {
        mappedCols[field] = rawHeaders[colMap[field]];
      }
    });
    lowerHdrs.forEach(function(h, i) {
      var matched = false;
      Object.keys(_EQUIP_COL_MAPPINGS_).forEach(function(field) {
        if (_EQUIP_COL_MAPPINGS_[field].indexOf(h) >= 0) matched = true;
      });
      if (!matched) unmappedHdrs.push(rawHeaders[i]);
    });
  }

  // ── Parse count (after filter) ─────────────────────────────────────────
  var parsedItems = getEquipmentFromInventory();
  var parsedItemCount = parsedItems.length;

  // ── Hierarchy summary ──────────────────────────────────────────────────
  var hierarchy  = getEquipmentHierarchy();
  var deptKeys   = Object.keys(hierarchy);
  var deptSummary = deptKeys.map(function(d) {
    var types = Object.keys(hierarchy[d]).length;
    var items = 0;
    Object.keys(hierarchy[d]).forEach(function(t) { items += hierarchy[d][t].length; });
    return { dept: d, types: types, items: items };
  });

  var resolvedId = getEquipRegisterSheetId_();
  var foundUrl = '';
  var cfg = getConfig();
  Object.keys(cfg).forEach(function(k) {
    if (foundUrl) return;
    var v = String(cfg[k] || '').trim();
    if (v.indexOf('docs.google.com/spreadsheets') >= 0 && v.indexOf(resolvedId) >= 0) {
      foundUrl = k + ' = ' + v;
    }
  });

  return {
    lastRefreshed:    lastRefreshed,
    cacheRows:        cacheRows,
    parsedItemCount:  parsedItemCount,
    deptSummary:      deptSummary,
    rawHeaders:       rawHeaders,
    mappedCols:       mappedCols,
    unmappedHdrs:     unmappedHdrs,
    configTabName:    String(getConfigValue('Equipment Inventory Tab Name') || '').trim(),
    configSheetUrl:   foundUrl || (resolvedId === EXT_SHEET_IDS.EQUIP_REGISTER ? '(using fallback hard-coded ID)' : resolvedId),
    resolvedSheetId:  resolvedId,
    canonicalDepts:   DEPT_TRACKERS.map(function(dt) { return dt.dept; })
  };
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
  try { refreshEquipCache();   } catch (e) { Logger.log('runHourlySync/equip:   ' + e.message); }
  try { syncExternalTickets(); } catch (e) { Logger.log('runHourlySync/extSync: ' + e.message); }
}
