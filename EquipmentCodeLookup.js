// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EquipCodeLookup.gs                                                     ║
// ║  Looks up equipment codes for external tickets using                    ║
// ║  dept + equipment type + equipment description (exact match)            ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════
//  HELPER: Look up equipment code from inventory
//  Returns the equipment code (e.g. "003-353") or '' if no match found
// ═══════════════════════════════════════════════════════════════════════════
function lookupEquipmentCode_(dept, equipType, equipDesc) {
  var equip = getEquipmentFromInventory();
  if (!equip || equip.length === 0) return '';

  var deptNorm = String(dept      || '').toUpperCase().trim();
  var typNorm  = String(equipType || '').toUpperCase().trim();
  var descNorm = String(equipDesc || '').toUpperCase().trim();

  if (!descNorm) return '';

  // Step 1 — filter by dept (exact match against inventory dept)
  var byDept = equip.filter(function(e) {
    return String(e.dept || '').toUpperCase().trim() === deptNorm;
  });

  // Step 2 — if no dept match, try reverse-mapping through Dept Map
  if (byDept.length === 0) {
    var mapping = getDeptMapping_();
    Object.keys(mapping).forEach(function(src) {
      if (mapping[src] === deptNorm) {
        equip.forEach(function(e) {
          if (String(e.dept || '').toUpperCase().trim() === src) {
            byDept.push(e);
          }
        });
      }
    });
  }

  // Step 3 — fall back to all equipment if still nothing
  var pool = byDept.length > 0 ? byDept : equip;

  // Step 4 — filter by equipment type if provided
  if (typNorm) {
    var byType = pool.filter(function(e) {
      return String(e.eType || '').toUpperCase().trim() === typNorm;
    });
    if (byType.length > 0) pool = byType;
  }

  // Step 5 — exact description match (case-insensitive)
  var match = pool.filter(function(e) {
    return String(e.specific || '').toUpperCase().trim() === descNorm;
  });

  return match.length > 0 ? match[0].code : '';
}


// ═══════════════════════════════════════════════════════════════════════════
//  BACKFILL: Fix existing external tickets in Waiting Queue that are
//  missing their equipment code. Run once, then you're done.
// ═══════════════════════════════════════════════════════════════════════════
function backfillExternalEquipCodes() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sh   = ss.getSheetByName(SH.WAITING);
  if (!sh || sh.getLastRow() <= QUEUE_FROZEN) {
    SpreadsheetApp.getUi().alert('Waiting Queue is empty or not found.');
    return;
  }

  var startRow = QUEUE_FROZEN + 1;
  var numRows  = sh.getLastRow() - startRow + 1;
  var data     = sh.getRange(startRow, TK_DATA_COL, numRows, TK_COLS).getValues();

  var fixed = 0, skipped = 0, noMatch = 0;

  data.forEach(function(row, i) {
    var ticketNo  = String(row[TK.TICKET_NO   - 1] || '').trim();
    var equipCode = String(row[TK.EQUIP_CODE   - 1] || '').trim();

    if (!ticketNo)  { skipped++; return; }    // blank row
    if (equipCode)  { skipped++; return; }    // already has a code — leave it

    var dept      = String(row[TK.DEPT          - 1] || '').trim();
    var equipType = String(row[TK.EQUIP_TYPE     - 1] || '').trim();
    var equipDesc = String(row[TK.SPECIFIC_EQUIP - 1] || '').trim();

    var code = lookupEquipmentCode_(dept, equipType, equipDesc);

    if (code) {
      // Sheet column = TK col index + 1 (col A is the grey margin)
      sh.getRange(startRow + i, TK.EQUIP_CODE + 1).setValue(code);
      Logger.log('✅ ' + ticketNo + ' → ' + code);
      fixed++;
    } else {
      Logger.log('⚠️  No match: ' + ticketNo + ' | ' + dept + ' | ' + equipType + ' | ' + equipDesc);
      noMatch++;
    }
  });

  // Also update the dept tracker sheets for the same tickets
  var trackerSheets = DEPT_TRACKERS.map(function(dt) { return dt.name; });
  trackerSheets.forEach(function(shName) {
    var tsh = ss.getSheetByName(shName);
    if (!tsh || tsh.getLastRow() < TRACKER_PRIO_START) return;
    var numTRows = tsh.getLastRow() - TRACKER_PRIO_START + 1;
    var tData    = tsh.getRange(TRACKER_PRIO_START, TK_DATA_COL, numTRows, TK_COLS).getValues();
    tData.forEach(function(row, i) {
      var tn        = String(row[TK.TICKET_NO  - 1] || '').trim();
      var existing  = String(row[TK.EQUIP_CODE - 1] || '').trim();
      if (!tn || existing) return;
      var dept      = String(row[TK.DEPT          - 1] || '').trim();
      var equipType = String(row[TK.EQUIP_TYPE     - 1] || '').trim();
      var equipDesc = String(row[TK.SPECIFIC_EQUIP - 1] || '').trim();
      var code = lookupEquipmentCode_(dept, equipType, equipDesc);
      if (code) tsh.getRange(TRACKER_PRIO_START + i, TK.EQUIP_CODE + 1).setValue(code);
    });
  });

  var msg = '✅ Backfill complete!\n\n' +
    'Codes filled in: ' + fixed + '\n' +
    'No match found:  ' + noMatch + ' (left blank for manual entry)\n' +
    'Already had code / skipped: ' + skipped + '\n\n' +
    'Check Apps Script logs for the full ticket-by-ticket breakdown.';

  SpreadsheetApp.getActiveSpreadsheet()
    .toast('Done — ' + fixed + ' code(s) filled in, ' + noMatch + ' no match.', '🔧 Equip Code Backfill', 8);
  SpreadsheetApp.getUi().alert(msg);
}