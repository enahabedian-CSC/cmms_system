// ╔══════════════════════════════════════════════════════════════════════╗
// ║  Email.gs — CMMS Email Notification System                           ║
// ║  Paste this file into the Google Sheet's Apps Script editor.         ║
// ║  Extensions → Apps Script → New file → Email.gs                     ║
// ╚══════════════════════════════════════════════════════════════════════╝

// ── Sheet names (must match tab names exactly) ────────────────────────────────
var SH_EMAIL = {
  TEMP_FIX:       '🔧 Temp Fix Monitor',
  PARTS_NEEDED:   '🔩 Parts Needed',
  MASTER_LOG:     '🗄️ Master Log',
  MANAGER_ACCESS: '👔 Manager Access',
  CONFIG:         '⚙️ Configuration',
};

// ── Column maps (1-based, matching worker.js) ─────────────────────────────────

// Master Log
var ML_E = {
  ROW_ID:2, TICKET_NO:2, TIMESTAMP:3, ACTION:4,
  STATUS:5, DEPT:6, EQUIP_CODE:9, SPECIFIC_EQUIP:10,
  PRIORITY:12, DESCRIPTION:13, ASSIGNED_TO:14,
  DATE_OPENED:17, ADDED_BY:30,
};

// Temp Fix Monitor — data starts at row 6 (rows 1-5 are title/header)
var TF_E = {
  TEMP_ID:1, TICKET_NO:2, EQUIP_CODE:3, SPECIFIC_EQUIP:4,
  DEPT:5, BUILDING_ZONE:6, DATE_FLAGGED:7, DESCRIPTION:8,
  TEMP_FIX_DESC:9, FREQ_DAYS:10, LAST_INSPECTED:11, NEXT_DUE:12,
  STATUS:13, FLAGGED_BY:14, PERM_FIX_PLAN:19, EXPECTED_COMPLETION:20,
};
var TF_DATA_ROW = 6; // first data row in Temp Fix Monitor
var TF_COLS     = 20;

// Parts Needed — data starts at row 6
var PN_E = {
  PART_ID:1, PART_DESC:2, TICKET_NO:3, EQUIP_CODE:4,
  SPECIFIC_EQUIP:5, DEPT:6, DATE_REQUESTED:7, PARTS_STATUS:8,
  DATE_ORDERED:9, DATE_RECEIVED:10, ORDERED_BY:11, NOTES:12,
};
var PN_DATA_ROW = 6;
var PN_COLS     = 12;

// Manager Access — data starts at row 4
// Col A=Name, B=?, C=Email, D=TeamEmails, E=MainDepts, F=HiddenDepts, G=Announcement
var MA_DATA_ROW  = 4;
var MA_COL_NAME  = 1; // A
var MA_COL_EMAIL = 3; // C
var MA_COL_DEPTS = 5; // E (main depts, comma-separated)

// Config — key at col C, value at col D, rows 2-50
var CFG_ROW_START = 2;
var CFG_COL_KEY   = 3; // C
var CFG_COL_VAL   = 4; // D

// ── Core helpers ──────────────────────────────────────────────────────────────

function esc_(v) {
  return String(v || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _fmtDate_(d) {
  if (!(d instanceof Date) || isNaN(d)) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'MM/dd/yyyy');
}

function _getConfig_() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName(SH_EMAIL.CONFIG);
  if (!sh) return {};
  var rows = sh.getRange(CFG_ROW_START, CFG_COL_KEY, 50, 2).getValues();
  var cfg  = {};
  rows.forEach(function(r) {
    if (r[0]) cfg[String(r[0]).trim()] = String(r[1] || '');
  });
  return cfg;
}

// Resolves email recipients for a given department.
// Returns an array of email address strings.
// Priority: dept managers → admin list from Config.
function _emailRecipients_(dept) {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName(SH_EMAIL.MANAGER_ACCESS);
  var cfg = _getConfig_();

  var adminList = String(cfg['System Admins'] || '')
    .split(',').map(function(e) { return e.trim().toLowerCase(); }).filter(Boolean);

  if (!sh) return adminList;

  var lastRow = sh.getLastRow();
  if (lastRow < MA_DATA_ROW) return adminList;

  var numRows = lastRow - MA_DATA_ROW + 1;
  var rows    = sh.getRange(MA_DATA_ROW, 1, numRows, 6).getValues();

  var deptUpper  = String(dept || '').toUpperCase().trim();
  var recipients = [];

  rows.forEach(function(r) {
    var email = String(r[MA_COL_EMAIL - 1] || '').trim().toLowerCase();
    if (!email || email.indexOf('@') < 0) return;
    var depts = String(r[MA_COL_DEPTS - 1] || '').split(',')
      .map(function(d) { return d.trim().toUpperCase(); }).filter(Boolean);
    if (depts.indexOf(deptUpper) >= 0) recipients.push(email);
  });

  return recipients.length ? recipients : adminList;
}

// ── Email layout helpers ──────────────────────────────────────────────────────

function _htmlHeader_(title, subtitle) {
  return [
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f7fa;padding:20px;">',
    '<div style="background:#1a2332;color:#fff;padding:18px 24px;border-radius:8px 8px 0 0;">',
      '<div style="font-size:11px;opacity:.6;letter-spacing:.8px;text-transform:uppercase;margin-bottom:4px;">',
        'Container Supply Co. &nbsp;·&nbsp; Maintenance Management System',
      '</div>',
      '<div style="font-size:20px;font-weight:700;">' + title + '</div>',
      (subtitle
        ? '<div style="font-size:13px;margin-top:4px;opacity:.8;">' + esc_(subtitle) + '</div>'
        : ''),
    '</div>',
    '<div style="background:#fff;border:1px solid #e0e4ea;border-top:none;border-radius:0 0 8px 8px;padding:24px;">',
  ].join('');
}

function _htmlFooter_() {
  return [
    '</div>',
    '<div style="text-align:center;font-size:11px;color:#9aa3b0;margin-top:14px;padding-bottom:8px;">',
      'CSC Maintenance System &nbsp;·&nbsp; Garden Grove, CA',
      '<br>This is an automated notification &mdash; do not reply to this email.',
    '</div>',
    '</div>',
  ].join('');
}

// Single label/value row for a detail table.
function _row_(label, value) {
  if (value === null || value === undefined || value === '') return '';
  return '<tr>' +
    '<td style="padding:7px 14px 7px 0;font-size:12px;color:#6B7280;white-space:nowrap;vertical-align:top;width:130px;">' + label + '</td>' +
    '<td style="padding:7px 0;font-size:13px;color:#111827;font-weight:500;">' + esc_(value) + '</td>' +
    '</tr>';
}

function _detailTable_(rows) {
  var inner = rows.map(function(r) { return _row_(r[0], r[1]); }).join('');
  return '<table style="width:100%;border-collapse:collapse;margin:16px 0;">' + inner + '</table>';
}

function _callout_(color, borderColor, text) {
  return '<div style="margin:18px 0;padding:12px 16px;background:' + color + ';border-left:4px solid ' + borderColor + ';border-radius:4px;font-size:13px;">' + text + '</div>';
}

// ── New Ticket Notification ───────────────────────────────────────────────────
// Called from addNewTicket() and syncExternalTickets() in TicketSubmission.gs.
// emailData: { dept, specificEquip, equipCode, priority, problemType,
//              description, addedBy, dateOpened, source ('INTERNAL'|'EXTERNAL') }

function sendNewTicketManagerNotification_(ticketNo, emailData) {
  var dept = String(emailData.dept || '').toUpperCase().trim();
  var to   = _emailRecipients_(dept);
  if (!to.length) {
    Logger.log('sendNewTicketManagerNotification_: no recipients for dept=' + dept);
    return;
  }

  var isExternal = String(emailData.source || '').toUpperCase() === 'EXTERNAL';
  var badge = isExternal
    ? '<span style="background:#DBEAFE;color:#1D4ED8;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.3px;">EXTERNAL SUBMISSION</span>'
    : '<span style="background:#D1FAE5;color:#065F46;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.3px;">INTERNAL TICKET</span>';

  var html = _htmlHeader_('📋 Manager Action Required', 'New Ticket Opened — ' + ticketNo) +
    '<p style="margin:0 0 16px 0;">' + badge + '</p>' +
    _detailTable_([
      ['Ticket No.',    ticketNo],
      ['Department',   dept],
      ['Equipment',    emailData.specificEquip || emailData.equipCode],
      ['Priority',     emailData.priority],
      ['Problem Type', emailData.problemType],
      ['Description',  emailData.description],
      ['Submitted By', emailData.addedBy],
      ['Date Opened',  emailData.dateOpened],
    ]) +
    _callout_('#FFFBEB', '#F59E0B',
      '<strong>Action required:</strong> Review this ticket in the CMMS and assign it to a technician.') +
    _htmlFooter_();

  MailApp.sendEmail({
    to:       to.join(','),
    subject:  '📋 Manager Action Required | New Ticket ' + ticketNo + ' | ' + dept,
    htmlBody: html,
  });
  Logger.log('sendNewTicketManagerNotification_: sent for ' + ticketNo + ' to ' + to.join(', '));
}

// ── Temp Fix — Due Tomorrow Reminder ─────────────────────────────────────────
// Fires for every ACTIVE temp fix whose NEXT_DUE is exactly tomorrow.

function sendTempFixDueReminders() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName(SH_EMAIL.TEMP_FIX);
  if (!sh) { Logger.log('sendTempFixDueReminders: sheet not found'); return; }

  var lastRow = sh.getLastRow();
  if (lastRow < TF_DATA_ROW) return;

  var today    = new Date(); today.setHours(0, 0, 0, 0);
  var tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  var numRows = lastRow - TF_DATA_ROW + 1;
  var rows    = sh.getRange(TF_DATA_ROW, 1, numRows, TF_COLS).getValues();

  rows.forEach(function(r) {
    var tempId = String(r[TF_E.TEMP_ID - 1] || '').trim();
    var status = String(r[TF_E.STATUS  - 1] || '').toUpperCase().trim();
    if (!tempId || status !== 'ACTIVE') return;

    var nextDue = r[TF_E.NEXT_DUE - 1];
    if (!(nextDue instanceof Date) || isNaN(nextDue)) return;
    var due = new Date(nextDue); due.setHours(0, 0, 0, 0);
    if (due.getTime() !== tomorrow.getTime()) return;

    var dept     = String(r[TF_E.DEPT         - 1] || '').trim();
    var equip    = String(r[TF_E.SPECIFIC_EQUIP - 1] || r[TF_E.EQUIP_CODE - 1] || '').trim();
    var ticketNo = String(r[TF_E.TICKET_NO    - 1] || '').trim();
    var to       = _emailRecipients_(dept);
    if (!to.length) return;

    var expectedComp = r[TF_E.EXPECTED_COMPLETION - 1];

    var html = _htmlHeader_('⚠️ Temp Fix Inspection Due Tomorrow', dept + (equip ? ' · ' + equip : '')) +
      _callout_('#FFFBEB', '#F59E0B',
        'A temporary repair is due for re-inspection <strong>tomorrow</strong>. ' +
        'Log into the CMMS Temp Fix Monitor to record the outcome.') +
      _detailTable_([
        ['Temp Fix ID',   tempId],
        ['Ticket No.',    ticketNo],
        ['Department',    dept],
        ['Equipment',     equip],
        ['Description',   String(r[TF_E.TEMP_FIX_DESC - 1] || '')],
        ['Inspection Due', _fmtDate_(nextDue)],
        ['Perm Fix Plan', String(r[TF_E.PERM_FIX_PLAN - 1] || '')],
        ['Target Completion', _fmtDate_(expectedComp instanceof Date ? expectedComp : null)],
      ]) +
      _callout_('#F0FDF4', '#22C55E',
        'Use the <strong>Inspect</strong> button on the Temp Fix Monitor to record the inspection and reset the clock, ' +
        'or <strong>Clear</strong> if the permanent fix has been completed.') +
      _htmlFooter_();

    MailApp.sendEmail({
      to:       to.join(','),
      subject:  '⚠️ Temp Fix Inspection Due Tomorrow | ' + ticketNo + ' | ' + equip,
      htmlBody: html,
    });
    Logger.log('sendTempFixDueReminders: sent for ' + tempId + ' (' + ticketNo + ') to ' + to.join(', '));
  });
}

// ── Temp Fix — Past Due Alert ─────────────────────────────────────────────────
// Fires every day for ACTIVE or PAST DUE temp fixes whose NEXT_DUE has passed.

function sendTempFixPastDueAlerts() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName(SH_EMAIL.TEMP_FIX);
  if (!sh) { Logger.log('sendTempFixPastDueAlerts: sheet not found'); return; }

  var lastRow = sh.getLastRow();
  if (lastRow < TF_DATA_ROW) return;

  var today = new Date(); today.setHours(0, 0, 0, 0);

  var numRows = lastRow - TF_DATA_ROW + 1;
  var rows    = sh.getRange(TF_DATA_ROW, 1, numRows, TF_COLS).getValues();

  rows.forEach(function(r) {
    var tempId = String(r[TF_E.TEMP_ID - 1] || '').trim();
    var status = String(r[TF_E.STATUS  - 1] || '').toUpperCase().trim();
    if (!tempId) return;
    if (status !== 'ACTIVE' && status !== 'PAST DUE') return;

    var nextDue = r[TF_E.NEXT_DUE - 1];
    if (!(nextDue instanceof Date) || isNaN(nextDue)) return;
    var due = new Date(nextDue); due.setHours(0, 0, 0, 0);
    if (due.getTime() >= today.getTime()) return; // not past due yet

    var dept     = String(r[TF_E.DEPT          - 1] || '').trim();
    var equip    = String(r[TF_E.SPECIFIC_EQUIP - 1] || r[TF_E.EQUIP_CODE - 1] || '').trim();
    var ticketNo = String(r[TF_E.TICKET_NO     - 1] || '').trim();
    var daysOver = Math.floor((today.getTime() - due.getTime()) / 86400000);
    var to       = _emailRecipients_(dept);
    if (!to.length) return;

    var expectedComp = r[TF_E.EXPECTED_COMPLETION - 1];

    var html = _htmlHeader_('🔴 Temp Fix PAST DUE — Inspection Required', dept + (equip ? ' · ' + equip : '')) +
      _callout_('#FEF2F2', '#EF4444',
        'A temporary repair is <strong>' + daysOver + ' day' + (daysOver !== 1 ? 's' : '') + ' PAST DUE</strong> for inspection. ' +
        'Immediate action is required per <strong>Maintenance Program 030</strong> and <strong>SQF 2.10 (Temporary Repairs)</strong>.') +
      _detailTable_([
        ['Temp Fix ID',   tempId],
        ['Ticket No.',    ticketNo],
        ['Department',    dept],
        ['Equipment',     equip],
        ['Description',   String(r[TF_E.TEMP_FIX_DESC - 1] || '')],
        ['Was Due',       _fmtDate_(nextDue)],
        ['Days Overdue',  String(daysOver)],
        ['Perm Fix Plan', String(r[TF_E.PERM_FIX_PLAN - 1] || '')],
        ['Target Completion', _fmtDate_(expectedComp instanceof Date ? expectedComp : null)],
      ]) +
      _callout_('#FEF2F2', '#EF4444',
        '<strong>Action required:</strong> Open the CMMS Temp Fix Monitor and record an inspection immediately. ' +
        'If the permanent fix is complete, click <strong>Clear</strong> to remove from monitoring.') +
      _htmlFooter_();

    MailApp.sendEmail({
      to:       to.join(','),
      subject:  '🔴 Temp Fix PAST DUE — Inspection Required | ' + ticketNo + ' | ' + equip,
      htmlBody: html,
    });
    Logger.log('sendTempFixPastDueAlerts: sent for ' + tempId + ' (' + ticketNo + ') — ' + daysOver + ' days over');
  });
}

// ── Parts Needed Notification ─────────────────────────────────────────────────
// Called from requestParts() in TicketActions.gs.
// data: { dept, specificEquip, equipCode, priority, requestedBy, parts[] }
// parts[]: [{ partDesc, notes }]

function sendPartsNeededEmail_(ticketNo, data) {
  var dept = String(data.dept || '').toUpperCase().trim();
  var to   = _emailRecipients_(dept);
  if (!to.length) {
    Logger.log('sendPartsNeededEmail_: no recipients for dept=' + dept);
    return;
  }

  var equip = data.specificEquip || data.equipCode || '';

  // Build parts rows table
  var partsHtml = '';
  var parts = data.parts || [];
  if (parts.length) {
    partsHtml = parts.map(function(p, i) {
      var bg = i % 2 === 0 ? '#fff' : '#F9FAFB';
      return '<tr style="background:' + bg + ';">' +
        '<td style="padding:8px 12px;font-size:12.5px;border-bottom:1px solid #E5E7EB;">' + esc_(p.partDesc || p.partId || '') + '</td>' +
        '<td style="padding:8px 12px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB;">' + esc_(p.notes || '') + '</td>' +
        '</tr>';
    }).join('');
  } else {
    partsHtml = '<tr><td colspan="2" style="padding:10px 12px;font-size:12px;color:#6B7280;font-style:italic;">See ticket notes for parts details.</td></tr>';
  }

  var html = _htmlHeader_('🔩 Parts Needed', 'Ticket ' + ticketNo + (equip ? ' — ' + equip : '')) +
    _detailTable_([
      ['Ticket No.',   ticketNo],
      ['Department',   dept],
      ['Equipment',    equip],
      ['Priority',     data.priority],
      ['Requested By', data.requestedBy],
    ]) +
    '<div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.7px;margin:20px 0 8px 0;">Parts Required</div>' +
    '<table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;">' +
      '<thead><tr style="background:#F3F4F6;">' +
        '<th style="padding:8px 12px;font-size:11px;text-align:left;color:#374151;font-weight:600;">Part / Description</th>' +
        '<th style="padding:8px 12px;font-size:11px;text-align:left;color:#374151;font-weight:600;">Notes</th>' +
      '</tr></thead>' +
      '<tbody>' + partsHtml + '</tbody>' +
    '</table>' +
    _callout_('#EDE9FE', '#7C3AED',
      '<strong>Action required:</strong> Review the parts request in the CMMS Parts Needed monitor. ' +
      'Update the status to <strong>Ordered</strong> once the parts have been placed, and <strong>Received</strong> when they arrive.') +
    _htmlFooter_();

  MailApp.sendEmail({
    to:       to.join(','),
    subject:  '🔩 Parts Needed | ' + ticketNo + ' | ' + equip,
    htmlBody: html,
  });
  Logger.log('sendPartsNeededEmail_: sent for ' + ticketNo + ' to ' + to.join(', '));
}

// ── Daily trigger handler ─────────────────────────────────────────────────────
// Install this as a time-driven trigger: daily at 7:00 AM.
// In Apps Script: Triggers → + Add Trigger → runDailyEmailAlerts → Time-driven → Day timer → 7am-8am

function runDailyEmailAlerts() {
  Logger.log('runDailyEmailAlerts: starting ' + new Date());
  sendTempFixDueReminders();
  sendTempFixPastDueAlerts();
  Logger.log('runDailyEmailAlerts: complete');
}

// ── Trigger installer ─────────────────────────────────────────────────────────
// Run this ONCE from the Apps Script editor to install the daily 7 AM trigger.
// Only needs to be run again if triggers are cleared/reset.

function installEmailTrigger_() {
  // Remove any existing runDailyEmailAlerts triggers first to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'runDailyEmailAlerts') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('runDailyEmailAlerts')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();
  Logger.log('installEmailTrigger_: daily 7AM trigger installed for runDailyEmailAlerts');
}
