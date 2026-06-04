// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Backup.gs — CSC CMMS v5.0                                              ║
// ║  Monthly Drive backup: exports four core sheets as CSV files to the     ║
// ║  folder specified in ⚙️ Configuration → 'Backup Drive Folder ID'.      ║
// ║  Triggered monthly at 02:00.  Safe to run manually at any time.        ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  runMonthlyBackup
//  Exports Master Log, Closed Tickets, Parts Needed, and Temp Fix Monitor
//  as CSV files to the configured Drive backup folder.
//  Each file is named: CMMS_{SheetLabel}_{YYYY-MM}.csv
//  An audit row is appended to Master Log on completion.
// ═══════════════════════════════════════════════════════════════════════════════

function runMonthlyBackup() {
  var cfg      = getConfig();
  var folderId = String(cfg['Backup Drive Folder ID'] || '').trim();
  if (!folderId) {
    Logger.log('runMonthlyBackup: Backup Drive Folder ID not configured — skipping');
    return;
  }

  var folder;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (e) {
    Logger.log('runMonthlyBackup: cannot open folder ' + folderId + ' — ' + e.message);
    return;
  }

  var ss       = getBoundSS_();
  var now      = new Date();
  var monthTag = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');

  var targets = [
    { shName: SH.MASTER_LOG,  label: 'MasterLog'      },
    { shName: SH.CLOSED,      label: 'ClosedTickets'   },
    { shName: SH.PARTS_NEEDED,label: 'PartsNeeded'     },
    { shName: SH.TEMP_FIX,    label: 'TempFixMonitor'  }
  ];

  var exported = [];
  var failed   = [];

  targets.forEach(function(t) {
    try {
      var sh = ss.getSheetByName(t.shName);
      if (!sh || sh.getLastRow() < 1) {
        failed.push(t.label + ' (sheet not found or empty)');
        return;
      }
      var numRows = sh.getLastRow();
      var numCols = sh.getLastColumn();
      var data    = sh.getRange(1, 1, numRows, numCols).getValues();
      var csv     = _buildCsv_(data);
      var fname   = 'CMMS_' + t.label + '_' + monthTag + '.csv';

      // Delete any existing file with the same name in this folder (avoid duplicates).
      var existing = folder.getFilesByName(fname);
      while (existing.hasNext()) { existing.next().setTrashed(true); }

      folder.createFile(fname, csv, MimeType.CSV);
      exported.push(fname);
    } catch (e) {
      failed.push(t.label + ' (' + e.message + ')');
      Logger.log('runMonthlyBackup export error [' + t.label + ']: ' + e.message);
    }
  });

  var summary = 'Exported: ' + exported.join(', ') + (failed.length ? ' | Failed: ' + failed.join(', ') : '');
  Logger.log('runMonthlyBackup: ' + summary);

  // Audit row in Master Log.
  try {
    appendToMasterLog_({
      ticketNo:  '',
      now:       now,
      action:    ML_ACTIONS.MONTHLY_BACKUP,
      status:    '',
      dept:      '',
      updatedBy: 'SYSTEM',
      notes:     summary
    });
  } catch (e) {
    Logger.log('runMonthlyBackup audit row error: ' + e.message);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _buildCsv_(data) {
  return data.map(function(row) {
    return row.map(function(cell) {
      var s = cell instanceof Date
        ? Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
        : String(cell == null ? '' : cell);
      // Escape: wrap in quotes if value contains comma, quote, or newline.
      if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
        s = '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(',');
  }).join('\r\n');
}
