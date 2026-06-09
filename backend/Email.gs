// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Email.gs — CSC CMMS v5.0                                               ║
// ║  All outbound email notifications.  Recipients are always resolved     ║
// ║  from live config data — no hard-coded addresses anywhere in this file. ║
// ║  BUG FIX: sendTempFixPastDueAlerts / sendTempFixDueReminders now use   ║
// ║  getManagersForDept_() as primary + config-driven fallbacks.           ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Replaces the stub in TicketSubmission.gs.  Called from addNewTicket() for
// non-CRITICAL tickets and from syncExternalTickets() for all imports.
function sendNewTicketManagerNotification_(ticketNo, emailData) {
  try {
    var dept        = normalizeDept(String(emailData.dept     || ''));
    var source      = String(emailData.source      || 'INTERNAL');
    var equip       = String(emailData.specificEquip || emailData.equipDesc || '');
    var equipCode   = String(emailData.equipCode   || '');
    var equipType   = String(emailData.equipType   || '');
    var description = String(emailData.description || emailData.problemDesc || '');
    var addedBy     = String(emailData.addedBy     || '');
    var lineNo      = String(emailData.lineNo      || '');
    var downtimeType= String(emailData.downtimeType|| '');
    var dateOpened  = emailData.dateOpened
      ? (emailData.dateOpened instanceof Date
          ? formatDateStr_(emailData.dateOpened)
          : String(emailData.dateOpened))
      : formatDateStr_(new Date());

    var tz    = Session.getScriptTimeZone();
    var tsStr = Utilities.formatDate(new Date(), tz, 'MM/dd/yyyy · hh:mm a');

    var recipients = _emailRecipients_(dept);
    if (!recipients) {
      Logger.log('sendNewTicketManagerNotification_: no recipients for ' + ticketNo);
      return;
    }

    var sourceLabel = source === 'EXTERNAL' ? 'External' : 'Internal';
    var sourceColor = source === 'EXTERNAL' ? '#1565C0' : '#616161';
    var sourceBg    = source === 'EXTERNAL' ? '#E3F2FD' : '#F5F5F5';

    var subject = '📋 Manager Action Required | New Ticket ' + ticketNo + ' | ' + dept;

    var htmlBody =
      '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#2A2A2A;padding:14px 20px;display:flex;align-items:center;gap:10px;">' +
        '<div style="background:#EF6C00;width:5px;height:40px;border-radius:3px;flex-shrink:0;"></div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:15px;font-weight:bold;color:#FFD700;letter-spacing:.4px;">⚡ MAINTENANCE TRACKER</div>' +
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">Container Supply Co. — Garden Grove, CA</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:10px;color:#9E9E9E;">New Ticket Notification</div>' +
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">' + tsStr + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#0D47A1;padding:12px 20px;display:flex;align-items:center;gap:12px;">' +
        '<div style="font-size:20px;">📋</div>' +
        '<div>' +
          '<div style="font-size:13px;font-weight:bold;color:#fff;">Manager Action Required</div>' +
          '<div style="font-size:11px;color:#90CAF9;margin-top:2px;">A new ticket has been submitted and is waiting for your review</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#1B2A3C;padding:10px 20px;display:flex;gap:24px;flex-wrap:wrap;">' +
        '<div>' +
          '<div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Ticket #</div>' +
          '<div style="font-size:18px;font-weight:bold;color:#FFD700;font-family:monospace;">' + esc_(ticketNo) + '</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Department</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#ECEFF1;">' + esc_(dept) + '</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Status</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#F9A825;">Waiting Queue</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Source</div>' +
          '<div style="font-size:13px;font-weight:bold;background:' + sourceBg + ';color:' + sourceColor + ';padding:2px 8px;border-radius:3px;display:inline-block;">' + sourceLabel + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="padding:18px 20px;background:#fff;">' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">' +
        '<tr><td colspan="2" style="padding:0 0 8px 0;"><div style="font-size:10px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;">Ticket Information</div></td></tr>' +
        '<tr><td style="padding:5px 0;color:#9E9E9E;width:140px;">Submitted By</td><td style="padding:5px 0;color:#2A2A2A;font-weight:bold;">' + esc_(addedBy) + '</td></tr>' +
        '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;">Date Opened</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(dateOpened) + '</td></tr>' +
        '<tr><td style="padding:5px 0;color:#9E9E9E;">Downtime Type</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(downtimeType) + '</td></tr>' +
      '</table>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">' +
        '<tr><td colspan="2" style="padding:0 0 8px 0;"><div style="font-size:10px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;">Equipment</div></td></tr>' +
        '<tr><td style="padding:5px 0;color:#9E9E9E;width:140px;">Equipment Type</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(equipType) + '</td></tr>' +
        '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;">Equipment</td><td style="padding:5px 0;color:#2A2A2A;font-weight:bold;">' + esc_(equip) + '</td></tr>' +
        '<tr><td style="padding:5px 0;color:#9E9E9E;">Equipment Code</td><td style="padding:5px 0;font-family:monospace;font-weight:bold;color:#2A2A2A;">' + esc_(equipCode || '—') + '</td></tr>' +
        (lineNo ? '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;">Line #</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(lineNo) + '</td></tr>' : '') +
      '</table>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">' +
        '<tr><td colspan="2" style="padding:0 0 8px 0;"><div style="font-size:10px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;">Problem</div></td></tr>' +
        '<tr><td style="padding:5px 0;color:#9E9E9E;width:140px;vertical-align:top;">Description</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(description) + '</td></tr>' +
      '</table>' +
      '<div style="background:#E8EAF6;border:1px solid #C5CAE9;border-radius:5px;padding:12px 14px;">' +
        '<div style="font-size:11px;font-weight:bold;color:#1A237E;margin-bottom:6px;">Action Required</div>' +
        '<div style="font-size:11px;color:#3C4A6E;line-height:1.7;">This ticket is sitting in the <strong>Waiting Queue</strong> and requires your approval before work can begin. Please set a priority, assign a technician, and approve it for open work.</div>' +
      '</div>' +
      '</div>' +
      '<div style="background:#F5F5F5;border-top:1px solid #E0E0E0;padding:10px 20px;text-align:center;">' +
        '<div style="font-size:10px;color:#9E9E9E;">Container Supply Co. — Maintenance Tracker v5.0 &nbsp;&middot;&nbsp; Garden Grove, CA</div>' +
        '<div style="font-size:10px;color:#B0B0B0;margin-top:3px;">This is an automated notification. Do not reply to this email.</div>' +
      '</div>' +
      '</div>';

    MailApp.sendEmail({ to: recipients, name: 'CSC Maintenance Tracker', subject: subject, htmlBody: htmlBody });
    Logger.log('sendNewTicketManagerNotification_: sent for ' + ticketNo + ' to ' + recipients);
  } catch (e) {
    Logger.log('sendNewTicketManagerNotification_ error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  sendTempFixDueReminders — inspection due TOMORROW (called from daily trigger)
// ═══════════════════════════════════════════════════════════════════════════════

function sendTempFixDueReminders() {
  var ss = getBoundSS_();
  var sh = ss.getSheetByName(SH.TEMP_FIX);
  if (!sh || sh.getLastRow() < 2) return;

  var tz          = Session.getScriptTimeZone();
  var today       = new Date();
  var tomorrow    = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  var tomorrowStr = Utilities.formatDate(tomorrow, tz, 'MM/dd/yyyy');
  var data        = sh.getRange(2, 1, sh.getLastRow() - 1, TF_COLS).getValues();

  data.forEach(function(r) {
    var status  = String(r[TF.STATUS    - 1] || '').toUpperCase().trim();
    var nextDue = r[TF.NEXT_DUE - 1];
    if (status === 'CLEARED' || status === 'INACTIVE' || status === 'PAST DUE') return;
    if (!nextDue) return;
    if (Utilities.formatDate(new Date(nextDue), tz, 'MM/dd/yyyy') !== tomorrowStr) return;

    var dept        = String(r[TF.DEPT           - 1] || '');
    var ticketNo    = String(r[TF.TICKET_NO      - 1] || '');
    var equip       = String(r[TF.SPECIFIC_EQUIP - 1] || '');
    var equipCode   = String(r[TF.EQUIP_CODE     - 1] || '');
    var description = String(r[TF.DESCRIPTION    - 1] || '');
    var tempFixDesc = String(r[TF.TEMP_FIX_DESC  - 1] || '');
    var flaggedBy   = String(r[TF.FLAGGED_BY     - 1] || '');
    var dateFlagged = formatDateStr_(r[TF.DATE_FLAGGED - 1]);

    var recipients = _emailRecipients_(dept);
    if (!recipients) return;

    var subject = '⚠️ Temp Fix Inspection Due Tomorrow | ' + ticketNo + ' | ' + equip;
    var body =
      '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#2A2A2A;padding:14px 20px;display:flex;align-items:center;gap:10px;">' +
        '<div style="background:#EF6C00;width:5px;height:40px;border-radius:3px;flex-shrink:0;"></div>' +
        '<div>' +
          '<div style="font-size:15px;font-weight:bold;color:#FFD700;">⚡ MAINTENANCE TRACKER</div>' +
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">Container Supply Co. — Garden Grove, CA</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#F57F17;padding:10px 20px;">' +
        '<div style="font-size:13px;font-weight:bold;color:#fff;">⚠️ Temp Fix Inspection Due Tomorrow — ' + tomorrowStr + '</div>' +
      '</div>' +
      '<div style="background:#1B2A3C;padding:10px 20px;display:flex;gap:24px;flex-wrap:wrap;">' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Ticket #</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#FFD700;font-family:monospace;">' + esc_(ticketNo) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Department</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#ECEFF1;">' + esc_(dept) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Due Date</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#F9A825;">' + tomorrowStr + '</div></div>' +
      '</div>' +
      '<div style="padding:18px 20px;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
          '<tr><td style="padding:5px 0;color:#9E9E9E;width:140px;">Equipment</td><td style="padding:5px 0;color:#2A2A2A;font-weight:bold;">' + esc_(equip) + '</td></tr>' +
          '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;">Equipment Code</td><td style="padding:5px 0;font-family:monospace;font-weight:bold;">' + esc_(equipCode) + '</td></tr>' +
          '<tr><td style="padding:5px 0;color:#9E9E9E;">Problem Description</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(description) + '</td></tr>' +
          '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;">Temp Fix Applied</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(tempFixDesc) + '</td></tr>' +
          '<tr><td style="padding:5px 0;color:#9E9E9E;">Date Flagged</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(dateFlagged) + '</td></tr>' +
          '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;">Flagged By</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(flaggedBy) + '</td></tr>' +
        '</table>' +
        '<div style="background:#FFF3E0;border-left:4px solid #EF6C00;border-radius:0 4px 4px 0;padding:10px 14px;margin-top:16px;">' +
          '<div style="font-size:11px;font-weight:bold;color:#E64A19;margin-bottom:3px;">Action Required</div>' +
          '<div style="font-size:11px;color:#2A2A2A;line-height:1.6;">Please ensure a technician inspects this equipment tomorrow and logs the inspection using the <strong>Temp Fix Inspection Checklist</strong> in the Maintenance Tracker.</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#F5F5F5;border-top:1px solid #E0E0E0;padding:10px 20px;text-align:center;">' +
        '<div style="font-size:10px;color:#9E9E9E;">CSC Maintenance Tracker v5.0 — Automated Notification. Do not reply.</div>' +
      '</div></div>';

    try {
      MailApp.sendEmail({ to: recipients, name: 'CSC Maintenance Tracker', subject: subject, htmlBody: body });
    } catch (e) {
      Logger.log('sendTempFixDueReminders error for ' + ticketNo + ': ' + e.message);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  sendTempFixPastDueAlerts — BUG FIX: was sending to all ADMIN_EMAILS;
//  now uses getManagersForDept_() primary, with config-driven fallback.
// ═══════════════════════════════════════════════════════════════════════════════

function sendTempFixPastDueAlerts() {
  var ss = getBoundSS_();
  var sh = ss.getSheetByName(SH.TEMP_FIX);
  if (!sh || sh.getLastRow() < 2) return;

  var tz   = Session.getScriptTimeZone();
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, TF_COLS).getValues();

  data.forEach(function(r) {
    var status = String(r[TF.STATUS - 1] || '').toUpperCase().trim();
    if (status !== 'PAST DUE') return;

    var dept        = String(r[TF.DEPT           - 1] || '');
    var ticketNo    = String(r[TF.TICKET_NO      - 1] || '');
    var equip       = String(r[TF.SPECIFIC_EQUIP - 1] || '');
    var equipCode   = String(r[TF.EQUIP_CODE     - 1] || '');
    var description = String(r[TF.DESCRIPTION    - 1] || '');
    var tempFixDesc = String(r[TF.TEMP_FIX_DESC  - 1] || '');
    var flaggedBy   = String(r[TF.FLAGGED_BY     - 1] || '');
    var dateFlagged = formatDateStr_(r[TF.DATE_FLAGGED - 1]);
    var nextDue     = formatDateStr_(r[TF.NEXT_DUE     - 1]);

    var recipients = _emailRecipients_(dept);
    if (!recipients) return;

    var subject = '🔴 Temp Fix PAST DUE — Inspection Required | ' + ticketNo + ' | ' + equip;
    var body =
      '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#2A2A2A;padding:14px 20px;display:flex;align-items:center;gap:10px;">' +
        '<div style="background:#EF6C00;width:5px;height:40px;border-radius:3px;flex-shrink:0;"></div>' +
        '<div>' +
          '<div style="font-size:15px;font-weight:bold;color:#FFD700;">⚡ MAINTENANCE TRACKER</div>' +
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">Container Supply Co. — Garden Grove, CA</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#C62828;padding:10px 20px;">' +
        '<div style="font-size:13px;font-weight:bold;color:#fff;">🔴 Temp Fix Inspection PAST DUE — Immediate Action Required</div>' +
      '</div>' +
      '<div style="background:#1B2A3C;padding:10px 20px;display:flex;gap:24px;flex-wrap:wrap;">' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Ticket #</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#FFD700;font-family:monospace;">' + esc_(ticketNo) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Department</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#ECEFF1;">' + esc_(dept) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Was Due</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#FFCDD2;">' + esc_(nextDue) + '</div></div>' +
      '</div>' +
      '<div style="padding:18px 20px;background:#fff;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
          '<tr><td style="padding:6px 0;color:#9E9E9E;width:140px;vertical-align:top;">Equipment</td><td style="padding:6px 0;color:#2A2A2A;font-weight:bold;">' + esc_(equip) + '</td></tr>' +
          '<tr style="background:#FAFAFA;"><td style="padding:6px 0;color:#9E9E9E;">Equipment Code</td><td style="padding:6px 0;font-family:monospace;font-weight:bold;color:#2A2A2A;">' + esc_(equipCode) + '</td></tr>' +
          '<tr><td style="padding:6px 0;color:#9E9E9E;vertical-align:top;">Problem Description</td><td style="padding:6px 0;color:#2A2A2A;">' + esc_(description) + '</td></tr>' +
          '<tr style="background:#FAFAFA;"><td style="padding:6px 0;color:#9E9E9E;vertical-align:top;">Temp Fix Applied</td><td style="padding:6px 0;color:#2A2A2A;">' + esc_(tempFixDesc) + '</td></tr>' +
          '<tr><td style="padding:6px 0;color:#9E9E9E;">Date Flagged</td><td style="padding:6px 0;color:#2A2A2A;">' + esc_(dateFlagged) + '</td></tr>' +
          '<tr style="background:#FAFAFA;"><td style="padding:6px 0;color:#9E9E9E;">Flagged By</td><td style="padding:6px 0;color:#2A2A2A;">' + esc_(flaggedBy) + '</td></tr>' +
        '</table>' +
        '<div style="background:#FFCDD2;border-left:4px solid #C62828;border-radius:0 4px 4px 0;padding:10px 14px;margin-top:16px;">' +
          '<div style="font-size:11px;font-weight:bold;color:#B71C1C;margin-bottom:3px;">Immediate Action Required</div>' +
          '<div style="font-size:11px;color:#7F0000;line-height:1.6;">This temp fix inspection is <strong>overdue</strong>. Please assign a technician to inspect this equipment today and log the inspection in the Maintenance Tracker.</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#F5F5F5;border-top:1px solid #E0E0E0;padding:10px 20px;text-align:center;">' +
        '<div style="font-size:10px;color:#9E9E9E;">CSC Maintenance Tracker v5.0 — Automated Notification. Do not reply.</div>' +
      '</div></div>';

    try {
      MailApp.sendEmail({ to: recipients, name: 'CSC Maintenance Tracker', subject: subject, htmlBody: body });
      Logger.log('sendTempFixPastDueAlerts: sent for ' + ticketNo + ' to ' + recipients);
    } catch (e) {
      Logger.log('sendTempFixPastDueAlerts error for ' + ticketNo + ': ' + e.message);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  sendPartsNeededEmail_ — notifies dept managers when parts are logged
// ═══════════════════════════════════════════════════════════════════════════════

function sendPartsNeededEmail_(ticketNo, data) {
  try {
    var dept    = normalizeDept(String(data.dept || ''));
    var recipients = _emailRecipients_(dept);
    if (!recipients) return;

    var equip   = String(data.specificEquip || data.equipDesc || '');
    var code    = String(data.equipCode    || '');
    var addedBy = String(data.addedBy      || '');
    var partCount = data.partsList ? data.partsList.length : 0;

    var subject = '🔩 Parts Needed | ' + ticketNo + ' | ' + (equip || dept);
    var partsRows = '';
    if (data.partsList && data.partsList.length > 0) {
      data.partsList.forEach(function(p, idx) {
        var bg = idx % 2 === 0 ? '#FAFAFA' : '#FFFFFF';
        partsRows += '<tr style="background:' + bg + ';">' +
          '<td style="padding:5px 8px;color:#2A2A2A;">' + esc_(String(p.desc || p.partDesc || '')) + '</td>' +
          '<td style="padding:5px 8px;color:#9E9E9E;font-family:monospace;">' + esc_(String(p.equipCode || code)) + '</td>' +
          '<td style="padding:5px 8px;color:#9E9E9E;">' + esc_(String(p.notes || '')) + '</td>' +
          '</tr>';
      });
    }

    var htmlBody =
      '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#2A2A2A;padding:14px 20px;">' +
        '<div style="font-size:15px;font-weight:bold;color:#FFD700;">⚡ MAINTENANCE TRACKER</div>' +
        '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">Container Supply Co. — Parts Request Notification</div>' +
      '</div>' +
      '<div style="background:#4A148C;padding:10px 20px;">' +
        '<div style="font-size:13px;font-weight:bold;color:#fff;">🔩 ' + partCount + ' Part(s) Requested for Ticket ' + esc_(ticketNo) + '</div>' +
      '</div>' +
      '<div style="background:#1B2A3C;padding:10px 20px;display:flex;gap:24px;flex-wrap:wrap;">' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Ticket #</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#FFD700;font-family:monospace;">' + esc_(ticketNo) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Department</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#ECEFF1;">' + esc_(dept) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Requested By</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#ECEFF1;">' + esc_(addedBy) + '</div></div>' +
      '</div>' +
      '<div style="padding:18px 20px;background:#fff;">' +
        '<div style="font-size:11px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;margin-bottom:10px;">Equipment</div>' +
        '<p style="font-size:12px;margin:0 0 16px 0;"><strong>' + esc_(equip) + '</strong>' + (code ? ' <span style="font-family:monospace;color:#616161;">(' + esc_(code) + ')</span>' : '') + '</p>' +
        '<div style="font-size:11px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;margin-bottom:8px;">Parts List</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
          '<thead><tr style="background:#EDE7F6;">' +
            '<th style="padding:6px 8px;text-align:left;color:#4A148C;font-weight:600;">Part Description</th>' +
            '<th style="padding:6px 8px;text-align:left;color:#4A148C;font-weight:600;">Equip Code</th>' +
            '<th style="padding:6px 8px;text-align:left;color:#4A148C;font-weight:600;">Notes</th>' +
          '</tr></thead>' +
          '<tbody>' + partsRows + '</tbody>' +
        '</table>' +
      '</div>' +
      '<div style="background:#F5F5F5;border-top:1px solid #E0E0E0;padding:10px 20px;text-align:center;">' +
        '<div style="font-size:10px;color:#9E9E9E;">CSC Maintenance Tracker v5.0 — Automated Notification. Do not reply.</div>' +
      '</div></div>';

    MailApp.sendEmail({ to: recipients, name: 'CSC Maintenance Tracker', subject: subject, htmlBody: htmlBody });
    Logger.log('sendPartsNeededEmail_: sent for ' + ticketNo + ' to ' + recipients);
  } catch (e) {
    Logger.log('sendPartsNeededEmail_ error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  sendTransferNotification_ — HTML email to both from-dept and to-dept managers
//  when a ticket is transferred between departments.
//  Called from transferTicket() in TicketLifecycle.gs.
// ═══════════════════════════════════════════════════════════════════════════════

function sendTransferNotification_(ticketNo, data) {
  try {
    var fromDept    = String(data.fromDept    || '');
    var toDept      = String(data.toDept      || '');
    var updatedBy   = String(data.updatedBy   || '');
    var reason      = String(data.reason      || '');
    var equip       = String(data.specificEquip || data.equip || '');
    var equipCode   = String(data.equipCode   || '');
    var equipType   = String(data.equipType   || '');
    var description = String(data.description || '');

    // Recipients: union of both dept manager lists (deduplicated)
    var fromRecips = getManagersForDept_(fromDept);
    var toRecips   = getManagersForDept_(toDept);
    var allEmails  = {};
    fromRecips.concat(toRecips).forEach(function(e) { if (e) allEmails[e.toLowerCase().trim()] = true; });
    var recipients = Object.keys(allEmails).join(', ');

    // Fallback: all managers → admins
    if (!recipients) {
      var all = [];
      try { getManagerConfig().forEach(function(m) { if (m.managerEmail) all.push(m.managerEmail.trim()); }); } catch(e2) {}
      recipients = all.length > 0 ? all.join(', ') : getAdminEmails().join(', ');
    }
    if (!recipients) { Logger.log('sendTransferNotification_: no recipients for ' + ticketNo); return; }

    var tz    = Session.getScriptTimeZone();
    var tsStr = Utilities.formatDate(new Date(), tz, 'MM/dd/yyyy · hh:mm a');

    var subject = '🔀 Ticket Transferred | ' + ticketNo + ' | ' + fromDept + ' → ' + toDept;

    var htmlBody =
      '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#2A2A2A;padding:14px 20px;display:flex;align-items:center;gap:10px;">' +
        '<div style="background:#EF6C00;width:5px;height:40px;border-radius:3px;flex-shrink:0;"></div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:15px;font-weight:bold;color:#FFD700;letter-spacing:.4px;">⚡ MAINTENANCE TRACKER</div>' +
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">Container Supply Co. — Garden Grove, CA</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:10px;color:#9E9E9E;">Transfer Notification</div>' +
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">' + tsStr + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#1565C0;padding:12px 20px;display:flex;align-items:center;gap:12px;">' +
        '<div style="font-size:20px;">🔀</div>' +
        '<div>' +
          '<div style="font-size:13px;font-weight:bold;color:#fff;">Ticket Transferred Between Departments</div>' +
          '<div style="font-size:11px;color:#90CAF9;margin-top:2px;">This ticket has been reassigned and will appear in the new department\'s tracker</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#1B2A3C;padding:10px 20px;display:flex;gap:24px;flex-wrap:wrap;">' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Ticket #</div>' +
          '<div style="font-size:18px;font-weight:bold;color:#FFD700;font-family:monospace;">' + esc_(ticketNo) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">From</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#FFCDD2;">' + esc_(fromDept) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">To</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#C8E6C9;">' + esc_(toDept) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">By</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#ECEFF1;">' + esc_(updatedBy) + '</div></div>' +
      '</div>' +
      '<div style="padding:18px 20px;background:#fff;">' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">' +
        '<tr><td colspan="2" style="padding:0 0 8px 0;"><div style="font-size:10px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;">Equipment</div></td></tr>' +
        '<tr><td style="padding:5px 0;color:#9E9E9E;width:140px;">Equipment Type</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(equipType) + '</td></tr>' +
        '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;">Equipment</td><td style="padding:5px 0;color:#2A2A2A;font-weight:bold;">' + esc_(equip || '—') + '</td></tr>' +
        '<tr><td style="padding:5px 0;color:#9E9E9E;">Equipment Code</td><td style="padding:5px 0;font-family:monospace;font-weight:bold;color:#2A2A2A;">' + esc_(equipCode || '—') + '</td></tr>' +
      '</table>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">' +
        '<tr><td colspan="2" style="padding:0 0 8px 0;"><div style="font-size:10px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;">Problem</div></td></tr>' +
        '<tr><td style="padding:5px 0;color:#9E9E9E;width:140px;vertical-align:top;">Description</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(description) + '</td></tr>' +
      '</table>' +
      (reason ?
        '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">' +
        '<tr><td colspan="2" style="padding:0 0 8px 0;"><div style="font-size:10px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;">Transfer Reason</div></td></tr>' +
        '<tr><td style="padding:5px 0;color:#2A2A2A;" colspan="2">' + esc_(reason) + '</td></tr>' +
        '</table>' : '') +
      '<div style="background:#E3F2FD;border:1px solid #90CAF9;border-radius:5px;padding:12px 14px;">' +
        '<div style="font-size:11px;font-weight:bold;color:#0D47A1;margin-bottom:6px;">Action for ' + esc_(toDept) + ' Manager</div>' +
        '<div style="font-size:11px;color:#1565C0;line-height:1.7;">This ticket is now in your department\'s tracker. Please review it, assign a technician, and set a priority.</div>' +
      '</div>' +
      '</div>' +
      '<div style="background:#F5F5F5;border-top:1px solid #E0E0E0;padding:10px 20px;text-align:center;">' +
        '<div style="font-size:10px;color:#9E9E9E;">Container Supply Co. — Maintenance Tracker v5.0 · Garden Grove, CA</div>' +
        '<div style="font-size:10px;color:#B0B0B0;margin-top:3px;">This is an automated notification. Do not reply to this email.</div>' +
      '</div>' +
      '</div>';

    MailApp.sendEmail({ to: recipients, name: 'CSC Maintenance Tracker', subject: subject, htmlBody: htmlBody });
    Logger.log('sendTransferNotification_: sent for ' + ticketNo + ' (' + fromDept + '→' + toDept + ') to ' + recipients);
  } catch (e) {
    Logger.log('sendTransferNotification_ error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  sendJointRequestEmail_ — notifies receiving dept manager of a joint request
//  Called from transferTicket() when a primary manager clicks "Attach Dept".
// ═══════════════════════════════════════════════════════════════════════════════

function sendJointRequestEmail_(ticketNo, data) {
  try {
    var fromDept    = String(data.fromDept    || '');
    var toDept      = String(data.toDept      || '');
    var requestedBy = String(data.requestedBy || '');
    var reason      = String(data.reason      || '');
    var equip       = String(data.specificEquip || '');
    var equipCode   = String(data.equipCode   || '');
    var description = String(data.description || '');
    var status      = String(data.status      || '');

    // Receive: to-dept managers get the request
    var toMgrs = getManagersForDept_(toDept);
    // Also cc from-dept managers so they know it was sent
    var fromMgrs = getManagersForDept_(fromDept);
    var toRecip  = toMgrs.join(', ');
    var allRecip = toMgrs.concat(fromMgrs).filter(function(e, i, a) { return a.indexOf(e) === i; }).join(', ');
    if (!toRecip) {
      Logger.log('sendJointRequestEmail_: no to-dept recipients for ' + ticketNo);
      return;
    }

    var tz    = Session.getScriptTimeZone();
    var tsStr = Utilities.formatDate(new Date(), tz, 'MM/dd/yyyy · hh:mm a');

    var subject = '🔗 Joint Ticket Request | ' + ticketNo + ' | Action Required by ' + toDept;

    var htmlBody =
      '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#2A2A2A;padding:14px 20px;display:flex;align-items:center;gap:10px;">' +
        '<div style="background:#7B1FA2;width:5px;height:40px;border-radius:3px;flex-shrink:0;"></div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:15px;font-weight:bold;color:#FFD700;letter-spacing:.4px;">⚡ MAINTENANCE TRACKER</div>' +
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">Container Supply Co. — Garden Grove, CA</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:10px;color:#9E9E9E;">Joint Request Notification</div>' +
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">' + tsStr + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#4A148C;padding:12px 20px;display:flex;align-items:center;gap:12px;">' +
        '<div style="font-size:20px;">🔗</div>' +
        '<div>' +
          '<div style="font-size:13px;font-weight:bold;color:#fff;">Joint Ticket Request — Action Required</div>' +
          '<div style="font-size:11px;color:#CE93D8;margin-top:2px;">' + esc_(fromDept) + ' is requesting your department (' + esc_(toDept) + ') to join a ticket</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#1B2A3C;padding:10px 20px;display:flex;gap:24px;flex-wrap:wrap;">' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Ticket #</div>' +
             '<div style="font-size:18px;font-weight:bold;color:#FFD700;font-family:monospace;">' + esc_(ticketNo) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">From Dept</div>' +
             '<div style="font-size:13px;font-weight:bold;color:#ECEFF1;">' + esc_(fromDept) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Requesting Dept</div>' +
             '<div style="font-size:13px;font-weight:bold;color:#CE93D8;">' + esc_(toDept) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Status</div>' +
             '<div style="font-size:13px;font-weight:bold;color:#F9A825;">' + esc_(status) + '</div></div>' +
      '</div>' +
      '<div style="padding:16px 20px;background:#fff;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:12.5px;">' +
          '<tr><td style="padding:5px 0;color:#616161;width:130px;">Equipment</td>' +
              '<td style="padding:5px 0;font-weight:600;">' + esc_(equip || '—') + (equipCode ? ' <span style="color:#9E9E9E;">(' + esc_(equipCode) + ')</span>' : '') + '</td></tr>' +
          '<tr><td style="padding:5px 0;color:#616161;">Problem</td>' +
              '<td style="padding:5px 0;">' + esc_(description || '—') + '</td></tr>' +
          (reason ? '<tr><td style="padding:5px 0;color:#616161;">Reason</td>' +
              '<td style="padding:5px 0;font-style:italic;">' + esc_(reason) + '</td></tr>' : '') +
          '<tr><td style="padding:5px 0;color:#616161;">Requested By</td>' +
              '<td style="padding:5px 0;">' + esc_(requestedBy) + '</td></tr>' +
        '</table>' +
        '<div style="margin-top:14px;padding:12px 14px;background:#F3E5F5;border-left:4px solid #7B1FA2;border-radius:4px;">' +
          '<div style="font-size:12px;font-weight:bold;color:#4A148C;margin-bottom:4px;">Action Required</div>' +
          '<div style="font-size:11.5px;color:#616161;">Log into the Maintenance Tracker, find ticket <strong>' + esc_(ticketNo) + '</strong>, and click <strong>Accept</strong> or <strong>Reject</strong> to respond to this request. Accepting will add your department to this ticket and it will appear in your Joint Tickets view.</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#F5F5F5;padding:10px 20px;border-top:1px solid #E0E0E0;">' +
        '<div style="font-size:10px;color:#B0B0B0;">This is an automated notification. Do not reply to this email.</div>' +
      '</div>' +
      '</div>';

    MailApp.sendEmail({ to: allRecip, name: 'CSC Maintenance Tracker', subject: subject, htmlBody: htmlBody });
    Logger.log('sendJointRequestEmail_: sent for ' + ticketNo + ' (' + fromDept + '→' + toDept + ')');
  } catch (e) {
    Logger.log('sendJointRequestEmail_ error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  sendJointResponseEmail_ — notifies primary dept manager of accept/reject
//  Called from confirmJointRequest() and rejectJointRequest().
// ═══════════════════════════════════════════════════════════════════════════════

function sendJointResponseEmail_(ticketNo, data) {
  try {
    var fromDept       = String(data.fromDept       || '');
    var confirmingDept = String(data.confirmingDept || '');
    var accepted       = !!data.accepted;
    var reason         = String(data.reason         || '');
    var respondedBy    = String(data.respondedBy    || '');
    var equip          = String(data.specificEquip  || '');
    var description    = String(data.description    || '');

    // Notify the primary dept managers
    var recipients = _emailRecipients_(fromDept);
    if (!recipients) {
      Logger.log('sendJointResponseEmail_: no recipients for primary dept ' + fromDept);
      return;
    }

    var tz      = Session.getScriptTimeZone();
    var tsStr   = Utilities.formatDate(new Date(), tz, 'MM/dd/yyyy · hh:mm a');
    var outcome = accepted ? 'Accepted ✅' : 'Rejected ❌';
    var accentColor = accepted ? '#2E7D32' : '#C62828';
    var accentLight = accepted ? '#E8F5E9' : '#FFEBEE';
    var accentBorder= accepted ? '#2E7D32' : '#C62828';

    var subject = (accepted ? '✅' : '❌') + ' Joint Request ' + (accepted ? 'Accepted' : 'Rejected') +
                  ' | ' + ticketNo + ' | ' + confirmingDept;

    var htmlBody =
      '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#2A2A2A;padding:14px 20px;display:flex;align-items:center;gap:10px;">' +
        '<div style="background:' + accentColor + ';width:5px;height:40px;border-radius:3px;flex-shrink:0;"></div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:15px;font-weight:bold;color:#FFD700;letter-spacing:.4px;">⚡ MAINTENANCE TRACKER</div>' +
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">Container Supply Co. — Garden Grove, CA</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:10px;color:#9E9E9E;">Joint Request Response</div>' +
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">' + tsStr + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:' + accentColor + ';padding:12px 20px;display:flex;align-items:center;gap:12px;">' +
        '<div style="font-size:20px;">' + (accepted ? '✅' : '❌') + '</div>' +
        '<div>' +
          '<div style="font-size:13px;font-weight:bold;color:#fff;">Joint Request ' + (accepted ? 'Accepted' : 'Rejected') + '</div>' +
          '<div style="font-size:11px;color:rgba(255,255,255,.8);margin-top:2px;">' + esc_(confirmingDept) + ' has ' + (accepted ? 'accepted' : 'rejected') + ' the joint attachment request</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#1B2A3C;padding:10px 20px;display:flex;gap:24px;flex-wrap:wrap;">' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Ticket #</div>' +
             '<div style="font-size:18px;font-weight:bold;color:#FFD700;font-family:monospace;">' + esc_(ticketNo) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Your Dept</div>' +
             '<div style="font-size:13px;font-weight:bold;color:#ECEFF1;">' + esc_(fromDept) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Response From</div>' +
             '<div style="font-size:13px;font-weight:bold;color:#ECEFF1;">' + esc_(confirmingDept) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Outcome</div>' +
             '<div style="font-size:13px;font-weight:bold;color:' + (accepted ? '#A5D6A7' : '#EF9A9A') + ';">' + outcome + '</div></div>' +
      '</div>' +
      '<div style="padding:16px 20px;background:#fff;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:12.5px;">' +
          '<tr><td style="padding:5px 0;color:#616161;width:130px;">Equipment</td>' +
              '<td style="padding:5px 0;font-weight:600;">' + esc_(equip || '—') + '</td></tr>' +
          '<tr><td style="padding:5px 0;color:#616161;">Problem</td>' +
              '<td style="padding:5px 0;">' + esc_(description || '—') + '</td></tr>' +
          '<tr><td style="padding:5px 0;color:#616161;">Responded By</td>' +
              '<td style="padding:5px 0;">' + esc_(respondedBy) + '</td></tr>' +
          (!accepted && reason ? '<tr><td style="padding:5px 0;color:#616161;">Reason</td>' +
              '<td style="padding:5px 0;font-style:italic;">' + esc_(reason) + '</td></tr>' : '') +
        '</table>' +
        '<div style="margin-top:14px;padding:12px 14px;background:' + accentLight + ';border-left:4px solid ' + accentBorder + ';border-radius:4px;">' +
          '<div style="font-size:11.5px;color:#333;">' +
            (accepted
              ? confirmingDept + ' is now attached to ticket ' + ticketNo + '. They will appear in the Joint Tickets view and will be required to sign off before the ticket can be closed.'
              : confirmingDept + ' declined to join ticket ' + ticketNo + (reason ? ': "' + esc_(reason) + '"' : '.') + ' You may try attaching a different department if needed.') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#F5F5F5;padding:10px 20px;border-top:1px solid #E0E0E0;">' +
        '<div style="font-size:10px;color:#B0B0B0;">This is an automated notification. Do not reply to this email.</div>' +
      '</div>' +
      '</div>';

    MailApp.sendEmail({ to: recipients, name: 'CSC Maintenance Tracker', subject: subject, htmlBody: htmlBody });
    Logger.log('sendJointResponseEmail_: sent for ' + ticketNo + ' (' + confirmingDept + ' → ' + (accepted ? 'accepted' : 'rejected') + ')');
  } catch (e) {
    Logger.log('sendJointResponseEmail_ error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  sendTicketCompleteEmail_ — C07
//  Fires when a manager marks work complete (completeTicket → PENDING VERIFICATION).
//  Notifies the dept managers that the ticket is ready for their verification.
//  Called from TicketLifecycle.gs::completeTicket() after both log writes succeed.
// ═══════════════════════════════════════════════════════════════════════════════

function sendTicketCompleteEmail_(ticketNo, data) {
  try {
    var dept        = normalizeDept(String(data.dept         || ''));
    var equip       = String(data.specificEquip || data.equipDesc || '');
    var equipCode   = String(data.equipCode     || '');
    var description = String(data.description   || '');
    var completedBy = String(data.completedBy   || data.updatedBy || '');
    var corrective  = String(data.correctiveAct || '');
    var rootCause   = String(data.rootCause     || '');
    var prevAction  = String(data.preventiveAct || '');

    var tz    = Session.getScriptTimeZone();
    var tsStr = Utilities.formatDate(new Date(), tz, 'MM/dd/yyyy · hh:mm a');

    var recipients = _emailRecipients_(dept);
    if (!recipients) {
      Logger.log('sendTicketCompleteEmail_: no recipients for ' + ticketNo);
      return;
    }

    var subject = '✅ Work Complete — Ready for Verification | ' + ticketNo + ' | ' + dept;

    var htmlBody =
      '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#2A2A2A;padding:14px 20px;display:flex;align-items:center;gap:10px;">' +
        '<div style="background:#EF6C00;width:5px;height:40px;border-radius:3px;flex-shrink:0;"></div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:15px;font-weight:bold;color:#FFD700;letter-spacing:.4px;">⚡ MAINTENANCE TRACKER</div>' +
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">Container Supply Co. — Garden Grove, CA</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:10px;color:#9E9E9E;">Work Complete Notification</div>' +
          '<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">' + tsStr + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#1B5E20;padding:12px 20px;display:flex;align-items:center;gap:12px;">' +
        '<div style="font-size:20px;">✅</div>' +
        '<div>' +
          '<div style="font-size:13px;font-weight:bold;color:#fff;">Work Complete — Verification Required</div>' +
          '<div style="font-size:11px;color:#A5D6A7;margin-top:2px;">Ticket ' + esc_(ticketNo) + ' has been marked complete and is awaiting your verification</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#1B2A3C;padding:10px 20px;display:flex;gap:24px;flex-wrap:wrap;">' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Ticket #</div>' +
          '<div style="font-size:18px;font-weight:bold;color:#FFD700;font-family:monospace;">' + esc_(ticketNo) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Department</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#ECEFF1;">' + esc_(dept) + '</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Status</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#A5D6A7;">Pending Verification</div></div>' +
        '<div><div style="font-size:9px;color:#5C6BC0;text-transform:uppercase;letter-spacing:.6px;">Completed By</div>' +
          '<div style="font-size:13px;font-weight:bold;color:#ECEFF1;">' + esc_(completedBy) + '</div></div>' +
      '</div>' +
      '<div style="padding:18px 20px;background:#fff;">' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">' +
        '<tr><td colspan="2" style="padding:0 0 8px 0;"><div style="font-size:10px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;">Equipment</div></td></tr>' +
        (equip ? '<tr><td style="padding:5px 0;color:#9E9E9E;width:140px;">Equipment</td><td style="padding:5px 0;color:#2A2A2A;font-weight:bold;">' + esc_(equip) + '</td></tr>' : '') +
        (equipCode ? '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;">Equipment Code</td><td style="padding:5px 0;font-family:monospace;font-weight:bold;">' + esc_(equipCode) + '</td></tr>' : '') +
        (description ? '<tr><td style="padding:5px 0;color:#9E9E9E;vertical-align:top;">Problem</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(description) + '</td></tr>' : '') +
      '</table>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">' +
        '<tr><td colspan="2" style="padding:0 0 8px 0;"><div style="font-size:10px;font-weight:bold;color:#616161;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #F0F0F0;padding-bottom:5px;">CAPA / Work Summary</div></td></tr>' +
        (corrective ? '<tr><td style="padding:5px 0;color:#9E9E9E;width:140px;vertical-align:top;">Corrective Action</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(corrective) + '</td></tr>' : '') +
        (rootCause  ? '<tr style="background:#FAFAFA;"><td style="padding:5px 0;color:#9E9E9E;vertical-align:top;">Root Cause</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(rootCause) + '</td></tr>' : '') +
        (prevAction ? '<tr><td style="padding:5px 0;color:#9E9E9E;vertical-align:top;">Preventive Action</td><td style="padding:5px 0;color:#2A2A2A;">' + esc_(prevAction) + '</td></tr>' : '') +
      '</table>' +
      '<div style="background:#E8F5E9;border:1px solid #C8E6C9;border-radius:5px;padding:12px 14px;">' +
        '<div style="font-size:11px;font-weight:bold;color:#1B5E20;margin-bottom:6px;">Action Required</div>' +
        '<div style="font-size:11px;color:#2E7D32;line-height:1.7;">Open the Maintenance Tracker and go to <strong>Open Tickets</strong> to find this ticket. ' +
          'Review the CAPA, confirm the repair, and click <strong>Verify &amp; Close</strong> to complete the audit trail.</div>' +
      '</div>' +
      '</div>' +
      '<div style="background:#F5F5F5;border-top:1px solid #E0E0E0;padding:10px 20px;text-align:center;">' +
        '<div style="font-size:10px;color:#9E9E9E;">Container Supply Co. — Maintenance Tracker v5.0 &nbsp;&middot;&nbsp; Garden Grove, CA</div>' +
        '<div style="font-size:10px;color:#B0B0B0;margin-top:3px;">This is an automated notification. Do not reply to this email.</div>' +
      '</div>' +
      '</div>';

    MailApp.sendEmail({ to: recipients, name: 'CSC Maintenance Tracker', subject: subject, htmlBody: htmlBody });
    Logger.log('sendTicketCompleteEmail_: sent for ' + ticketNo + ' to ' + recipients);
  } catch (e) {
    Logger.log('sendTicketCompleteEmail_ error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  runDailyEmailAlerts — time-trigger entry point (daily)
// ═══════════════════════════════════════════════════════════════════════════════

function runDailyEmailAlerts() {
  try { sendTempFixDueReminders();  } catch (e) { Logger.log('runDailyEmailAlerts/reminders: ' + e.message); }
  try { sendTempFixPastDueAlerts(); } catch (e) { Logger.log('runDailyEmailAlerts/pastDue: '   + e.message); }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

// Resolves email recipients: dept managers first, all managers fallback, admins last.
// Returns comma-separated string or '' if none found.
function _emailRecipients_(dept) {
  var primary = getManagersForDept_(dept).join(', ');
  if (primary) return primary;

  var allMgrs = [];
  try {
    getManagerConfig().forEach(function(m) {
      if (m.managerEmail) allMgrs.push(m.managerEmail.trim());
    });
  } catch (e) { Logger.log('_emailRecipients_ manager fallback error: ' + e.message); }
  if (allMgrs.length > 0) return allMgrs.join(', ');

  return getAdminEmails().join(', ');
}

function esc_(v) {
  return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
