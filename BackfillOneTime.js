// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  BACKFILL_ONETIME.gs                                                    ║
// ║  One-time fix — restores missing equipment data in Open Tickets,        ║
// ║  Waiting Queue, and all Dept Trackers from the Master Log.              ║
// ║  RUN ONCE then delete this file.                                        ║
// ╚══════════════════════════════════════════════════════════════════════════╝

function backfillAllMissingEquipmentData() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var mlSh = ss.getSheetByName(SH.MASTER_LOG);
  if (!mlSh || mlSh.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('Master Log not found or empty. Aborting.');
    return;
  }

  // ── Step 1: Build a lookup map from Master Log ──
  // For each ticket number, grab the FIRST (creation) row — that has the
  // most complete equipment data.
  var mlData = mlSh.getRange(2, 1, mlSh.getLastRow()-1, ML_COLS).getValues();
  var ticketMap = {};
  mlData.forEach(function(row) {
    var tn = String(row[ML.TICKET_NO-1] || '').trim();
    if (!tn) return;
    // Only store the first occurrence (original creation row)
    if (!ticketMap[tn]) {
      ticketMap[tn] = {
        dept:          String(row[ML.DEPT-1]           || ''),
        buildingZone:  String(row[ML.BUILDING_ZONE-1]  || ''),
        equipType:     String(row[ML.EQUIP_TYPE-1]     || ''),
        equipCode:     String(row[ML.EQUIP_CODE-1]     || ''),
        specificEquip: String(row[ML.SPECIFIC_EQUIP-1] || ''),
        downtimeType:  String(row[ML.DOWNTIME_TYPE-1]  || ''),
        description:   String(row[ML.DESCRIPTION-1]    || ''),
        priority:      String(row[ML.PRIORITY-1]       || ''),
        addedBy:       String(row[ML.ADDED_BY-1]       || ''),
        problemType:   String(row[ML.PROBLEM_TYPE-1]   || ''),
        estHours:      row[ML.EST_HOURS-1]             || ''
      };
    }
  });

  var totalFixed = 0;

  // ── Step 2: Fix each sheet ──
  var sheetsToFix = [
    { name: SH.WAITING, isTracker: false },
    { name: SH.OPEN,    isTracker: false },
    { name: SH.CLOSED,  isTracker: false }
  ];
  DEPT_TRACKERS.forEach(function(dt) {
    sheetsToFix.push({ name: dt.name, isTracker: true });
  });

  sheetsToFix.forEach(function(sheetDef) {
    var sh = ss.getSheetByName(sheetDef.name);
    if (!sh) { Logger.log('Sheet not found: ' + sheetDef.name); return; }

    var startRow = sheetDef.isTracker ? TRACKER_PRIO_START : QUEUE_FROZEN + 1;
    if (sh.getLastRow() < startRow) return;

    var numRows = sh.getLastRow() - startRow + 1;
    var data    = sh.getRange(startRow, TK_DATA_COL, numRows, TK_COLS).getValues();
    var fixed   = 0;

    data.forEach(function(row, i) {
      var tn = String(row[TK.TICKET_NO-1] || '').trim();
      if (!tn) return; // skip empty / banner rows

      var orig = ticketMap[tn];
      if (!orig) {
        Logger.log('No Master Log entry for ticket: ' + tn + ' on sheet: ' + sheetDef.name);
        return;
      }

      var rowNum  = startRow + i;
      var changed = false;

      // Map of TK column index → master log field name
      // Only fills in if the cell is currently blank
      var fieldsToCheck = [
        { tkCol: TK.EQUIP_TYPE,    value: orig.equipType     },
        { tkCol: TK.EQUIP_CODE,    value: orig.equipCode     },
        { tkCol: TK.SPECIFIC_EQUIP,value: orig.specificEquip },
        { tkCol: TK.DOWNTIME_TYPE, value: orig.downtimeType  },
        { tkCol: TK.DESCRIPTION,   value: orig.description   },
        { tkCol: TK.BUILDING_ZONE, value: orig.buildingZone  },
        { tkCol: TK.DEPT,          value: orig.dept          },
        { tkCol: TK.PRIORITY,      value: orig.priority      },
        { tkCol: TK.ADDED_BY,      value: orig.addedBy       },
        { tkCol: TK.PROBLEM_TYPE,  value: orig.problemType   },
        { tkCol: TK.EST_HOURS,     value: orig.estHours      }
      ];

      fieldsToCheck.forEach(function(field) {
        var currentVal = String(row[field.tkCol - 1] || '').trim();
        // Only write if cell is blank AND we have a value from ML
        if (!currentVal && field.value) {
          // Sheet column = TK col + 1 (because col A is the grey margin)
          sh.getRange(rowNum, field.tkCol + 1).setValue(field.value);
          changed = true;
        }
      });

      // Re-apply priority color if we filled in priority
      if (changed) {
        var priority = orig.priority ||
          String(sh.getRange(rowNum, TK.PRIORITY + 1).getValue() || '');
        if (priority) applyPriorityRowColor_(sh, rowNum, priority);
        fixed++;
      }
    });

    Logger.log(sheetDef.name + ': fixed ' + fixed + ' row(s)');
    totalFixed += fixed;
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(
    '✅ Backfill complete — ' + totalFixed + ' row(s) updated across all sheets.',
    '🔧 Backfill', 8
  );
  Logger.log('BACKFILL COMPLETE — Total rows fixed: ' + totalFixed);
  SpreadsheetApp.getUi().alert(
    '✅ Backfill Complete!\n\n' + totalFixed + ' rows updated.\n\nCheck the Apps Script logs (View → Logs) for a sheet-by-sheet breakdown.\n\nYou can now delete Backfill_OneTime.gs.'
  );
}