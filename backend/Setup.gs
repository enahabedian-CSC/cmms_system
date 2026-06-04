// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Setup.gs — CSC CMMS v5.0                                               ║
// ║  One-time and idempotent setup functions.  Safe to re-run at any time.  ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  runSetup
//  Admin-only.  Creates any missing sheet tabs, installs time-based triggers.
//  Safe to call multiple times — all operations are idempotent.
// ═══════════════════════════════════════════════════════════════════════════════

function runSetup() {
  requireAdmin_();
  var results = [];

  try { createPmSheets_();       results.push('PM sheets: OK');       } catch (e) { results.push('PM sheets: ERROR — ' + e.message); }
  try { installTriggers_();      results.push('Triggers: OK');        } catch (e) { results.push('Triggers: ERROR — ' + e.message); }
  try { ensureConfigRows_();     results.push('Config rows: OK');     } catch (e) { results.push('Config rows: ERROR — ' + e.message); }
  try { setupEmrlHeaders_();     results.push('EMRL headers: OK');    } catch (e) { results.push('EMRL headers: ERROR — ' + e.message); }
  try { ensureRptDbSheet_();    results.push('Report DB sheet: OK'); } catch (e) { results.push('Report DB sheet: ERROR — ' + e.message); }

  Logger.log('runSetup results:\n' + results.join('\n'));
  return { success: true, results: results };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  createPmSheets_
//  Creates the three PM forward-design sheets if they don't already exist.
//  v1 deliverable: schema only, no UI.
// ═══════════════════════════════════════════════════════════════════════════════

function createPmSheets_() {
  var ss   = getBoundSS_();
  var tabs = [
    { name: SH.PM_SCHEDULES,   headers: PM_SCHED_HEADERS   },
    { name: SH.PM_CHECKLIST,   headers: PM_CHECKLIST_HEADERS},
    { name: SH.PM_RECURRENCES, headers: PM_RECURRENCE_HEADERS}
  ];

  tabs.forEach(function(tab) {
    if (!ss.getSheetByName(tab.name)) {
      var sh = ss.insertSheet(tab.name);
      sh.getRange(1, 1, 1, tab.headers.length).setValues([tab.headers]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, tab.headers.length)
        .setBackground('#E8EAED')
        .setFontWeight('bold')
        .setFontSize(10);
      Logger.log('Created sheet: ' + tab.name);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  installTriggers_
//  Creates hourly and daily time-based triggers (idempotent — removes
//  duplicates before installing).
// ═══════════════════════════════════════════════════════════════════════════════

function installTriggers_() {
  var existing = ScriptApp.getProjectTriggers();

  // Remove any existing triggers for our managed functions to avoid duplicates.
  var managed = ['runHourlySync', 'runDailyEmailAlerts', 'runMonthlyBackup'];
  existing.forEach(function(t) {
    if (managed.indexOf(t.getHandlerFunction()) >= 0) {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Hourly: equipment cache refresh + external ticket sync
  ScriptApp.newTrigger('runHourlySync')
    .timeBased()
    .everyHours(1)
    .create();

  // Daily at 7 AM: temp fix reminders + past-due alerts
  ScriptApp.newTrigger('runDailyEmailAlerts')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

  // Monthly at 02:00 on the 1st: Drive backup export
  ScriptApp.newTrigger('runMonthlyBackup')
    .timeBased()
    .onMonthDay(1)
    .atHour(2)
    .create();

  Logger.log('installTriggers_: installed runHourlySync + runDailyEmailAlerts + runMonthlyBackup');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ensureConfigRows_
//  Adds any missing configuration keys to ⚙️ Configuration.
//  Existing values are never overwritten.
// ═══════════════════════════════════════════════════════════════════════════════

function ensureConfigRows_() {
  var sh = getBoundSS_().getSheetByName(SH.CONFIG);
  if (!sh) return;

  var required = [
    { key: 'System Admins',          default: '' },
    { key: 'Backup Drive Folder ID', default: '' },
    { key: 'Monitoring Frequency',   default: '7' },
    { key: 'System Version',         default: '5.0' },
    { key: 'Izzy Sync Enabled',      default: 'Y'   }
  ];

  // Read existing keys from col C rows 2–30
  var existing = {};
  sh.getRange('C2:C30').getValues().forEach(function(r, i) {
    var k = String(r[0] || '').trim();
    if (k) existing[k] = i + 2; // 1-based row
  });

  var nextFreeRow = 2;
  while (sh.getRange(nextFreeRow, 3).getValue() !== '') nextFreeRow++;

  required.forEach(function(item) {
    if (!existing[item.key]) {
      sh.getRange(nextFreeRow, 3).setValue(item.key);
      sh.getRange(nextFreeRow, 4).setValue(item.default);
      nextFreeRow++;
      Logger.log('ensureConfigRows_: added key "' + item.key + '"');
    }
  });
}
