// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EMRL.gs — Equipment Maintenance Record Log                            ║
// ║  FRM-030-002 (Log Tab) · FRM-030-003 (Single Record Report)           ║
// ║  Container Supply Co. — Garden Grove, CA                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════
//  EMRL COLUMN INDICES (sheet column numbers, 1-based)
//  Col A  = row number marker
//  Col B  = TK col 1 (Ticket #) — TK_DATA_COL = 2
//  Cols B–AA = 26 standard TK columns
//  Cols AB onward = EMRL-only additions
// ═══════════════════════════════════════════════════════════════════════════

var EMRL_COL_START     = TK_DATA_COL + TK_COLS;  // = 28

// EMRL extra columns
var EMRL_REPAIR_DATE   = EMRL_COL_START;          // col 28
var EMRL_PARTS_USED    = EMRL_COL_START + 1;      // col 29
var EMRL_ROOT_CAUSE    = EMRL_COL_START + 2;      // col 30
var EMRL_CORRECTIVE    = EMRL_COL_START + 3;      // col 31
var EMRL_PREVENTIVE    = EMRL_COL_START + 4;      // col 32
var EMRL_CA_DATE       = EMRL_COL_START + 5;      // col 33
var EMRL_CAPA_REQ      = EMRL_COL_START + 6;      // col 34
var EMRL_CLEARANCE_CHK = EMRL_COL_START + 7;      // col 35
var EMRL_HAD_TEMP_FIX  = EMRL_COL_START + 8;      // col 36
var EMRL_TF_RESOLVED   = EMRL_COL_START + 9;      // col 37

var EMRL_EXTRA_COLS    = 10;
var EMRL_TOTAL_COLS    = TK_DATA_COL - 1 + TK_COLS + EMRL_EXTRA_COLS;

// ═══════════════════════════════════════════════════════════════════════════
//  EMRL EXTRA COLUMN HEADERS
// ═══════════════════════════════════════════════════════════════════════════
var EMRL_EXTRA_HEADERS = [
  'Repair Date',
  'Parts Used',
  'Root Cause',
  'Corrective Action',
  'Preventive Action',
  'CA Date',
  'CAPA Required',
  'Clearance Checklist',
  'Had Temp Fix',
  'TF Resolved Date'
];

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION COLOR TINTS — Updated layout per final design
//
//  IDENTITY        TK cols 1–10 + TK col 25 (Added By)      white/light gray
//  FAILURE DETAILS TK cols 11–15 (ProbType→EstHrs)          soft blue
//  REPAIR RECORD   TK cols 14,16,17,18,19,20 + EMRL 28–29   mid blue
//                  (AssignedTo, ActHrs, DateOpened, LastUpd,
//                   FixType, TempFix + RepairDate, PartsUsed)
//  SIGN-OFF        TK cols 22–26 (VerBy→Notes)               soft purple
//  CAPA            EMRL cols 30–34                            soft amber
//  CLEARANCE       EMRL col 35                                soft green
//  TEMP FIX        EMRL col 37 (TFResolved)                  soft orange
//
//  Columns NOT labelled (hidden/redundant per design decision):
//    TK col 17 (DateOpened — kept in Repair Record band)
//    TK col 18 (LastUpdated — removed from display)
//    EMRL col 33 (CA Date — removed)
//    EMRL col 36 (Had Temp Fix — removed)
// ═══════════════════════════════════════════════════════════════════════════

var EMRL_SECTION_BANDS = {
  identity: { bg:'#1B2A3C', fg:'#90CAF9', even:'#FFFFFF', odd:'#F7F7F7' },
  failure:  { bg:'#1A237E', fg:'#E3F2FD', even:'#EEF4FF', odd:'#E3EDFF' },
  repair:   { bg:'#0D47A1', fg:'#BBDEFB', even:'#E3F2FD', odd:'#D6EBFA' },
  signoff:  { bg:'#311B6B', fg:'#E8EAF6', even:'#F3F0FA', odd:'#EAE6F5' },
  capa:     { bg:'#4A2A00', fg:'#FFE0B2', even:'#FFFBEF', odd:'#FFF5D6' },
  clear:    { bg:'#1B4D2E', fg:'#C8E6C9', even:'#EDF7F0', odd:'#DFF0E3' },
  tempfix:  { bg:'#7B3100', fg:'#FFE0B2', even:'#FFF3E0', odd:'#FFE8C0' }
};


var EMRL_TINTS = {
  identity: { even: '#FFFFFF', odd: '#F7F7F7' },
  failure:  { even: '#EEF4FF', odd: '#E3EDFF' },
  repair:   { even: '#E3F2FD', odd: '#D6EBFA' },
  signoff:  { even: '#F3F0FA', odd: '#EAE6F5' },
  capa:     { even: '#FFFBEF', odd: '#FFF5D6' },
  clear:    { even: '#EDF7F0', odd: '#DFF0E3' },
  tempfix:  { even: '#FFF3E0', odd: '#FFE8C0' }
};

// TK column boundary markers (1-based TK index)
// Identity:       TK cols 1–10  (TicketNo → DowntimeType)
// Failure Details:TK cols 11–15 (ProblemType → EstHrs)
// Repair Record:  TK cols 14,16–20 (AssignedTo, ActHrs, DateOpened, LastUpd, FixType, TempFix)
// Sign-off:       TK cols 22–26 (VerifiedBy → Notes)
// (TK col 21 = PartsStatus, 20 = PartsNeeded — both removed from display but data stays)
// (TK col 25 = AddedBy moved to Identity visually — data col stays at TK 25)

// ═══════════════════════════════════════════════════════════════════════════
//  REBUILD CLOSED TAB
//  Updates section bands and color tinting only.
//  All existing data rows are preserved.
// ═══════════════════════════════════════════════════════════════════════════
function rebuildClosedTab_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SH.CLOSED);
  if (!sh) {
    SpreadsheetApp.getUi().alert('Closed Tickets tab not found.');
    return;
  }

  var NC = EMRL_TOTAL_COLS;

  // ── Ensure enough columns ──
  if (sh.getMaxColumns() < NC + 1) {
    sh.insertColumnsAfter(sh.getMaxColumns(), NC + 1 - sh.getMaxColumns());
  }

  // ── Clear header rows only (rows 1–QUEUE_FROZEN) ──
  sh.getRange(1, 1, QUEUE_FROZEN, sh.getMaxColumns()).clear().clearFormat();
  sh.clearConditionalFormatRules();

  // ── Tab appearance ──
  sh.setTabColor('#1A237E');
  sh.setHiddenGridlines(true);

  // ── Column widths ──
  sh.setColumnWidth(1, 30);
  var tkWidths = [
    120,150,72,90,150,120,88,160,90,  // TK 1–9   (cols 2–10)
    110,220,60,110,52,                 // TK 10–14 (cols 11–15)
    52,82,82,80,55,70,80,              // TK 15–21 (cols 16–22)
    110,82,110,110,180                 // TK 22–26 (cols 23–27)
  ];
  tkWidths.forEach(function(w, i) { sh.setColumnWidth(i + 2, w); });
  var emrlWidths = [88,180,180,200,180,82,60,200,55,82];
  emrlWidths.forEach(function(w, i) { sh.setColumnWidth(EMRL_COL_START + i, w); });

  // ── ROW 1 — Main blue banner ──
  sh.setRowHeight(1, 32);
  sh.getRange(1, 1, 1, NC + 1).merge()
    .setValue('Closed Tickets \u2014 Equipment Maintenance Record Log  \u00b7  FRM-030-002  \u00b7  Container Supply Co. \u2014 Garden Grove, CA')
    .setBackground('#1C4D8E')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('left')
    .setVerticalAlignment('middle');

  // ── ROW 2 — Subtitle bar ──
  sh.setRowHeight(2, 16);
  sh.getRange(2, 1, 1, NC + 1).merge()
    .setValue('SQF 13.2.8  \u00b7  Rev. 1  \u00b7  Manager verification required to close  \u00b7  Preserved permanently for audit trail')
    .setBackground('#FAFAFA')
    .setFontColor('#9E9E9E')
    .setFontSize(8)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setFontStyle('italic');

  // ── ROW 3 — Section band labels ──
  sh.setRowHeight(3, 18);

  function secBand(startCol, numCols, label, bg, fg) {
    var r = sh.getRange(3, startCol, 1, numCols);
    if (numCols > 1) r.merge();
    r.setValue(label)
     .setBackground(bg)
     .setFontColor(fg)
     .setFontWeight('bold')
     .setFontSize(8)
     .setHorizontalAlignment('left')
     .setVerticalAlignment('middle');
  }

  sh.getRange(3, 1).setBackground('#2A2A2A');

  // IDENTITY: cols 2–10 (TK 1–9)
  secBand(2,  9,  'TICKET IDENTITY',
          EMRL_SECTION_BANDS.identity.bg, EMRL_SECTION_BANDS.identity.fg);

  // FAILURE DETAILS: cols 11–15 (TK 10–14)
  secBand(11, 5,  'FAILURE DETAILS',
          EMRL_SECTION_BANDS.failure.bg,  EMRL_SECTION_BANDS.failure.fg);

  // REPAIR RECORD: cols 16–22 (TK 15–21)
  secBand(16, 7,  'REPAIR RECORD',
          EMRL_SECTION_BANDS.repair.bg,   EMRL_SECTION_BANDS.repair.fg);

  // SIGN-OFF & AUDIT: cols 23–27 (TK 22–26)
  secBand(23, 5,  'SIGN-OFF & AUDIT',
          EMRL_SECTION_BANDS.signoff.bg,  EMRL_SECTION_BANDS.signoff.fg);

  // EMRL REPAIR DATE + PARTS USED: cols 28–29
  secBand(EMRL_COL_START, 2, 'REPAIR RECORD',
          EMRL_SECTION_BANDS.repair.bg,   EMRL_SECTION_BANDS.repair.fg);

  // CAPA: cols 30–34
  secBand(EMRL_COL_START + 2, 5, 'CORRECTIVE & PREVENTIVE ACTION  \u00b7  SQF 13.2.8',
          EMRL_SECTION_BANDS.capa.bg,     EMRL_SECTION_BANDS.capa.fg);

  // POST-REPAIR CLEARANCE: col 35
  secBand(EMRL_COL_START + 7, 1, 'POST-REPAIR CLEARANCE  \u00b7  SQF 13.2.8.7',
          EMRL_SECTION_BANDS.clear.bg,    EMRL_SECTION_BANDS.clear.fg);

  // Col 36 (Had Temp Fix) — no label, neutral color
  sh.getRange(3, EMRL_COL_START + 8).setBackground('#3C3C3C');

  // TEMP FIX TRACKING: col 37
  secBand(EMRL_COL_START + 9, 1, 'TEMP FIX TRACKING',
          EMRL_SECTION_BANDS.tempfix.bg,  EMRL_SECTION_BANDS.tempfix.fg);

  // ── ROW 4 — Column headers ──
  sh.setRowHeight(4, 28);
  sh.getRange(4, 1)
    .setValue('#')
    .setBackground('#F0F0F0')
    .setFontColor('#999999')
    .setFontSize(8)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  var allHeaders = TK_HEADERS.concat(EMRL_EXTRA_HEADERS);
  sh.getRange(4, TK_DATA_COL, 1, allHeaders.length)
    .setValues([allHeaders])
    .setBackground('#F0F0F0')
    .setFontColor('#333333')
    .setFontWeight('bold')
    .setFontSize(9)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  // Section border accents on header row
  sh.getRange(4, 11)
    .setBorder(false, true, false, false, false, false,
               EMRL_SECTION_BANDS.failure.bg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.getRange(4, 16)
    .setBorder(false, true, false, false, false, false,
               EMRL_SECTION_BANDS.repair.bg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.getRange(4, 23)
    .setBorder(false, true, false, false, false, false,
               EMRL_SECTION_BANDS.signoff.bg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.getRange(4, EMRL_COL_START)
    .setBorder(false, true, false, false, false, false,
               EMRL_SECTION_BANDS.repair.bg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.getRange(4, EMRL_COL_START + 2)
    .setBorder(false, true, false, false, false, false,
               EMRL_SECTION_BANDS.capa.bg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.getRange(4, EMRL_COL_START + 7)
    .setBorder(false, true, false, false, false, false,
               EMRL_SECTION_BANDS.clear.bg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.getRange(4, EMRL_COL_START + 9)
    .setBorder(false, true, false, false, false, false,
               EMRL_SECTION_BANDS.tempfix.bg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // ── ROW 5 — Blue accent line ──
  sh.setRowHeight(5, 3);
  sh.getRange(5, 1, 1, NC + 1).merge().setBackground('#1C4D8E');

  // ── ROW 6 — Buffer ──
  sh.setRowHeight(6, 4);
  sh.getRange(6, 1, 1, NC + 1).setBackground('#FFFFFF');

  // ── Freeze rows only ──
  sh.setFrozenRows(QUEUE_FROZEN);

  // ── Re-apply row styles to existing data ──
  if (sh.getLastRow() > QUEUE_FROZEN) {
    applyEMRLRowStyles_(sh, QUEUE_FROZEN + 1, sh.getLastRow() - QUEUE_FROZEN);
  }

  SpreadsheetApp.getActiveSpreadsheet()
    .toast('Closed Tickets tab rebuilt.', '\ud83d\udccb EMRL', 4);
}

function applyEMRLRowStyles_(sh, startRow, numRows) {
  if (!numRows || numRows < 1) return;

  for (var i = 0; i < numRows; i++) {
    var row   = startRow + i;
    var isOdd = (i % 2 !== 0);
    var s     = EMRL_SECTION_BANDS;

    // ── Row number marker (col A) ──
    sh.getRange(row, 1)
      .setValue(i + 1)
      .setBackground(isOdd ? '#F0F0F0' : '#FAFAFA')
      .setFontColor('#BBBBBB')
      .setFontSize(8)
      .setHorizontalAlignment('center');

    // ── IDENTITY: cols 2–10 ──
    sh.getRange(row, 2, 1, 9)
      .setBackground(isOdd ? s.identity.odd : s.identity.even)
      .setFontColor('#2A2A2A').setFontSize(10).setVerticalAlignment('middle');

    // ── FAILURE DETAILS: cols 11–15 ──
    sh.getRange(row, 11, 1, 5)
      .setBackground(isOdd ? s.failure.odd : s.failure.even)
      .setFontColor('#2A2A2A').setFontSize(10).setVerticalAlignment('middle');

    // ── REPAIR RECORD: cols 16–22 ──
    sh.getRange(row, 16, 1, 7)
      .setBackground(isOdd ? s.repair.odd : s.repair.even)
      .setFontColor('#2A2A2A').setFontSize(10).setVerticalAlignment('middle');

    // ── SIGN-OFF & AUDIT: cols 23–27 ──
    sh.getRange(row, 23, 1, 5)
      .setBackground(isOdd ? s.signoff.odd : s.signoff.even)
      .setFontColor('#2A2A2A').setFontSize(10).setVerticalAlignment('middle');

    // ── EMRL REPAIR DATE + PARTS USED: cols 28–29 ──
    sh.getRange(row, EMRL_COL_START, 1, 2)
      .setBackground(isOdd ? s.repair.odd : s.repair.even)
      .setFontColor('#2A2A2A').setFontSize(10).setVerticalAlignment('middle');

    // ── CAPA: cols 30–34 ──
    sh.getRange(row, EMRL_COL_START + 2, 1, 5)
      .setBackground(isOdd ? s.capa.odd : s.capa.even)
      .setFontColor('#2A2A2A').setFontSize(10).setVerticalAlignment('middle');

    // ── POST-REPAIR CLEARANCE: col 35 ──
    sh.getRange(row, EMRL_COL_START + 7, 1, 1)
      .setBackground(isOdd ? s.clear.odd : s.clear.even)
      .setFontColor('#2A2A2A').setFontSize(10).setVerticalAlignment('middle');

    // ── Had Temp Fix col 36 — neutral, no section label ──
    sh.getRange(row, EMRL_COL_START + 8, 1, 1)
      .setBackground(isOdd ? '#F5F5F5' : '#FAFAFA')
      .setFontColor('#AAAAAA').setFontSize(10).setVerticalAlignment('middle');

    // ── TEMP FIX TRACKING: col 37 ──
    sh.getRange(row, EMRL_COL_START + 9, 1, 1)
      .setBackground(isOdd ? s.tempfix.odd : s.tempfix.even)
      .setFontColor('#2A2A2A').setFontSize(10).setVerticalAlignment('middle');

    // ── Thin bottom border ──
    sh.getRange(row, 1, 1, EMRL_TOTAL_COLS + 1)
      .setBorder(false, false, true, false, false, false,
                 '#E8E8E8', SpreadsheetApp.BorderStyle.SOLID);

    // ── Section left-border accents ──
    sh.getRange(row, 11)
      .setBorder(false, true, false, false, false, false,
                 s.failure.bg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sh.getRange(row, 16)
      .setBorder(false, true, false, false, false, false,
                 s.repair.bg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sh.getRange(row, 23)
      .setBorder(false, true, false, false, false, false,
                 s.signoff.bg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sh.getRange(row, EMRL_COL_START)
      .setBorder(false, true, false, false, false, false,
                 s.repair.bg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sh.getRange(row, EMRL_COL_START + 2)
      .setBorder(false, true, false, false, false, false,
                 s.capa.bg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sh.getRange(row, EMRL_COL_START + 7)
      .setBorder(false, true, false, false, false, false,
                 s.clear.bg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sh.getRange(row, EMRL_COL_START + 9)
      .setBorder(false, true, false, false, false, false,
                 s.tempfix.bg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

    // ── VOID row treatment ──
    var statusVal = String(sh.getRange(row, TK_DATA_COL + 1).getValue() || '').toUpperCase();
    if (statusVal === 'VOID') {
      sh.getRange(row, 2, 1, EMRL_TOTAL_COLS)
        .setFontColor('#BBBBBB')
        .setFontStyle('italic');
    }

    // ── Priority color accent ──
    var pCell = sh.getRange(row, TK_DATA_COL + 2);
    var pVal  = String(pCell.getValue() || '').toUpperCase();
    if (PRIORITY_CONFIG[pVal]) {
      pCell.setBackground(PRIORITY_CONFIG[pVal].lt)
           .setFontColor(PRIORITY_CONFIG[pVal].color)
           .setFontWeight('bold');
    }
  }
}





// ═══════════════════════════════════════════════════════════════════════════
//  POPULATE EMRL ROW
//  Called from moveTicketToClosed_() after the TK row is written
// ═══════════════════════════════════════════════════════════════════════════
function populateEMRL_(ticketNo) {
  try {
    var ss       = SpreadsheetApp.getActiveSpreadsheet();
    var closedSh = ss.getSheetByName(SH.CLOSED);
    if (!closedSh || closedSh.getLastRow() <= QUEUE_FROZEN) return;

    // Find the row for this ticket
    var ticketCol = closedSh.getRange(
      QUEUE_FROZEN + 1, TK_DATA_COL,
      closedSh.getLastRow() - QUEUE_FROZEN, 1
    ).getValues();
    var targetRow = -1;
    for (var i = ticketCol.length - 1; i >= 0; i--) {
      if (String(ticketCol[i][0]).trim() === ticketNo) {
        targetRow = QUEUE_FROZEN + 1 + i;
        break;
      }
    }
    if (targetRow < 0) return;

    // ── REPAIR DATE ──
    var repairDate = '';
    var mlSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH.MASTER_LOG);
    if (mlSh && mlSh.getLastRow() > 1) {
      var mlData = mlSh.getRange(2, 1, mlSh.getLastRow()-1, ML_COLS).getValues();
      mlData.forEach(function(r) {
        if (String(r[ML.TICKET_NO-1]).trim() !== ticketNo) return;
        var status = String(r[ML.STATUS-1] || '').toUpperCase();
        if (status === 'COMPLETE') {
          var ts = r[ML.TIMESTAMP-1];
          if (ts) repairDate = ts instanceof Date ? formatDateStr_(ts) : String(ts);
        }
      });
      if (!repairDate) {
        var dc = getMasterLogFieldForTicket_(ticketNo, ML.DATE_COMPLETED);
        if (dc) repairDate = dc instanceof Date ? formatDateStr_(dc) : String(dc);
      }
    }

    // ── PRIORITY ──
    var priority = String(getMasterLogFieldForTicket_(ticketNo, ML.PRIORITY) || '').toUpperCase();
    if (!priority) {
      priority = String(closedSh.getRange(targetRow, TK_DATA_COL + 2).getValue() || '').toUpperCase();
    }
    var capaRequired = (priority === 'HIGH' || priority === 'CRITICAL') ? 'Y' : 'N';

    // ── CORRECTIVE ACTION & ROOT CAUSE ──
    var correctiveAct = String(getMasterLogFieldForTicket_(ticketNo, ML.CORRECTIVE_ACT) || '');
    var rootCause     = String(getMasterLogFieldForTicket_(ticketNo, ML.ROOT_CAUSE)     || '');

    // ── PREVENTIVE ACTION ──
    var preventiveAct = '';
    var rdbSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH.RPT_DB);
    if (rdbSh && rdbSh.getLastRow() > 1) {
      var rdbData = rdbSh.getRange(2, 1, rdbSh.getLastRow()-1, RDB_COLS).getValues();
      for (var r = rdbData.length - 1; r >= 0; r--) {
        if (String(rdbData[r][RDB.TICKET_NO-1]).trim() === ticketNo) {
          preventiveAct = String(rdbData[r][RDB.PREVENTIVE_ACT-1] || '');
          break;
        }
      }
    }

    // ── CA DATE = same as repair date ──
    var caDate = repairDate;

    // ── CLEARANCE CHECKLIST ──
    var clearanceChk = String(getMasterLogFieldForTicket_(ticketNo, ML.VERIFICATION_CHECKLIST) || '');

    // ── TEMP FIX ──
    var hadTempFix = 'N';
    var tfResolved = '';
    var tfSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH.TEMP_FIX);
    if (tfSh && tfSh.getLastRow() > 1) {
      var tfData = tfSh.getRange(2, 1, tfSh.getLastRow()-1, TF_COLS).getValues();
      tfData.forEach(function(r) {
        if (String(r[TF.TICKET_NO-1]).trim() !== ticketNo) return;
        if (String(r[TF.ROW_TYPE-1] || '').toUpperCase() === 'INSPECTION') return;
        hadTempFix = 'Y';
        var cd = r[TF.CLEARED_DATE-1];
        if (cd) tfResolved = cd instanceof Date ? formatDateStr_(cd) : String(cd);
      });
    }

    // ── PARTS USED ──
    var partsUsed = '';
    var pnSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH.PARTS_NEEDED);
    if (pnSh && pnSh.getLastRow() > 1) {
      var pnData = pnSh.getRange(2, 1, pnSh.getLastRow()-1, PN_COLS).getValues();
      var partsList = [];
      pnData.forEach(function(r) {
        if (String(r[PN.TICKET_NO-1]).trim() !== ticketNo) return;
        var st = String(r[PN.PARTS_STATUS-1] || '').toUpperCase();
        if (st === 'RECEIVED' || st === 'USED') {
          var desc = String(r[PN.PART_DESC-1] || '').trim();
          if (desc) partsList.push(desc);
        }
      });
      partsUsed = partsList.join(' | ');
    }

    // ── Write the 10 EMRL columns (order must match EMRL_COL_START offsets) ──
    closedSh.getRange(targetRow, EMRL_COL_START, 1, EMRL_EXTRA_COLS).setValues([[
      repairDate,     // col 28 — Repair Date
      partsUsed,      // col 29 — Parts Used
      rootCause,      // col 30 — Root Cause
      correctiveAct,  // col 31 — Corrective Action
      preventiveAct,  // col 32 — Preventive Action
      caDate,         // col 33 — CA Date
      capaRequired,   // col 34 — CAPA Required
      clearanceChk,   // col 35 — Clearance Checklist
      hadTempFix,     // col 36 — Had Temp Fix
      tfResolved      // col 37 — TF Resolved Date
    ]]);

    // Apply row styling
    var rowIndex = targetRow - QUEUE_FROZEN - 1;
    applyEMRLRowStyles_(closedSh, targetRow, 1);
    closedSh.getRange(targetRow, 1).setValue(rowIndex + 1);

  } catch(e) {
    Logger.log('populateEMRL_ error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  BACKFILL SINGLE TICKET
// ═══════════════════════════════════════════════════════════════════════════
function backfillSingleTicket(ticketNo) {
  if (!ticketNo) {
    SpreadsheetApp.getUi().alert('Pass a ticket number e.g. backfillSingleTicket(\'MT-001-260505-003\')');
    return;
  }
  populateEMRL_(ticketNo);
  SpreadsheetApp.getActiveSpreadsheet()
    .toast('Backfilled: ' + ticketNo, '\ud83d\udccb EMRL', 4);
}

// ═══════════════════════════════════════════════════════════════════════════
//  PUBLIC RUNNERS
// ═══════════════════════════════════════════════════════════════════════════
function runRebuildClosedTab() {
  rebuildClosedTab_();
}

function checkClosedTab() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('✅ Closed Tickets');
  Logger.log('Total rows in Closed tab: ' + sh.getLastRow());
  Logger.log('Data starts at row: ' + (QUEUE_FROZEN + 1));
  if (sh.getLastRow() > QUEUE_FROZEN) {
    var lastRow = sh.getRange(sh.getLastRow(), 2).getValue();
    Logger.log('Last ticket in tab: ' + lastRow);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAINTENANCE REPAIR RECORD — LAUNCHER & SERVER FUNCTIONS
//  FRM-030-003
// ═══════════════════════════════════════════════════════════════════════════

function openMaintenanceRepairRecord() {
  var html = HtmlService.createHtmlOutputFromFile('MaintenanceRepairRecord')
    .setWidth(1200).setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, '\ud83d\udccb Maintenance Repair Record \u2014 FRM-030-003');
}

function getEMRLFormData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SH.CLOSED);
  var deptSet = {};

  if (sh && sh.getLastRow() > QUEUE_FROZEN) {
    var data = sh.getRange(
      QUEUE_FROZEN + 1, TK_DATA_COL,
      sh.getLastRow() - QUEUE_FROZEN, TK_COLS
    ).getValues();
    data.forEach(function(r) {
      var d = String(r[TK.DEPT - 1] || '').trim();
      if (d) deptSet[d] = true;
    });
  }

  return { depts: Object.keys(deptSet).sort() };
}

function searchEMRL(params) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SH.CLOSED);
    if (!sh || sh.getLastRow() <= QUEUE_FROZEN) return [];

    var data = sh.getRange(
      QUEUE_FROZEN + 1, TK_DATA_COL,
      sh.getLastRow() - QUEUE_FROZEN,
      TK_COLS + EMRL_EXTRA_COLS
    ).getValues();

    var ticket  = String(params.ticket  || '').trim().toUpperCase();
    var equip   = String(params.equip   || '').trim().toUpperCase();
    var dept    = String(params.dept    || '').trim().toUpperCase();
    var from    = params.from ? new Date(params.from) : null;
    var to      = params.to   ? new Date(params.to)   : null;
    if (to) to.setHours(23,59,59);

    var results = [];

    data.forEach(function(r) {
      var tn     = String(r[TK.TICKET_NO  - 1] || '').trim();
      var status = String(r[TK.STATUS     - 1] || '').toUpperCase();
      if (!tn || status === 'VOID') return;

      if (ticket && tn.toUpperCase().indexOf(ticket) < 0) return;
      if (equip) {
        var ec = String(r[TK.EQUIP_CODE     - 1] || '').toUpperCase();
        var es = String(r[TK.SPECIFIC_EQUIP - 1] || '').toUpperCase();
        if (ec.indexOf(equip) < 0 && es.indexOf(equip) < 0) return;
      }
      if (dept) {
        var d = String(r[TK.DEPT - 1] || '').toUpperCase();
        if (d.indexOf(dept) < 0) return;
      }

      var repairRaw = r[TK_COLS];
      if (repairRaw || r[TK.DATE_OPENED - 1]) {
        var dateVal = repairRaw || r[TK.DATE_OPENED - 1];
        var d = dateVal instanceof Date ? dateVal : new Date(dateVal);
        if (from && d < from) return;
        if (to   && d > to)   return;
      }

      var tz = Session.getScriptTimeZone();
      function fmt(v) {
        if (!v) return '';
        if (v instanceof Date) return Utilities.formatDate(v, tz, 'MM/dd/yyyy');
        return String(v);
      }

      results.push({
        ticketNo:         tn,
        status:           String(r[TK.STATUS          - 1] || ''),
        priority:         String(r[TK.PRIORITY        - 1] || ''),
        dept:             String(r[TK.DEPT            - 1] || ''),
        buildingZone:     String(r[TK.BUILDING_ZONE   - 1] || ''),
        equipType:        String(r[TK.EQUIP_TYPE      - 1] || ''),
        equipCode:        String(r[TK.EQUIP_CODE      - 1] || ''),
        specificEquip:    String(r[TK.SPECIFIC_EQUIP  - 1] || ''),
        downtimeType:     String(r[TK.DOWNTIME_TYPE   - 1] || ''),
        description:      String(r[TK.DESCRIPTION     - 1] || ''),
        assignedTo:       String(r[TK.ASSIGNED_TO     - 1] || ''),
        actualHours:      String(r[TK.ACTUAL_HOURS    - 1] || ''),
        dateOpened:       fmt(r[TK.DATE_OPENED        - 1]),
        fixType:          String(r[TK.FIX_TYPE        - 1] || ''),
        verifiedBy:       String(r[TK.VERIFIED_BY     - 1] || ''),
        verifiedDate:     fmt(r[TK.VERIFIED_DATE      - 1]),
        notes:            String(r[TK.NOTES           - 1] || ''),
        repairDate:       fmt(r[TK_COLS + 0]),
        partsUsed:        String(r[TK_COLS + 1] || ''),
        rootCause:        String(r[TK_COLS + 2] || ''),
        correctiveAction: String(r[TK_COLS + 3] || ''),
        preventiveAction: String(r[TK_COLS + 4] || ''),
        caDate:           fmt(r[TK_COLS + 5]),
        capaRequired:     String(r[TK_COLS + 6] || ''),
        clearanceChk:     String(r[TK_COLS + 7] || ''),
        hadTempFix:       String(r[TK_COLS + 8] || ''),
        tfResolved:       fmt(r[TK_COLS + 9])
      });
    });

    results.sort(function(a, b) {
      var da = new Date(a.repairDate || a.dateOpened || 0);
      var db = new Date(b.repairDate || b.dateOpened || 0);
      return db - da;
    });

    return results;

  } catch(e) {
    Logger.log('searchEMRL error: ' + e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ARCHIVE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getArchiveFormData() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = getConfig();
  var trackers = [];

  DEPT_TRACKERS.forEach(function(dt) {
    var sh = ss.getSheetByName(dt.name);
    if (!sh) return;
    var closedCount = 0;
    if (sh.getLastRow() >= TRACKER_PRIO_START) {
      var statusVals = sh.getRange(
        TRACKER_PRIO_START, TK.STATUS + 1,
        sh.getLastRow() - TRACKER_PRIO_START + 1, 1
      ).getValues();
      statusVals.forEach(function(r) {
        var s = String(r[0] || '').toUpperCase().trim();
        if (s === 'CLOSED') closedCount++;
      });
    }
    trackers.push({ sheetName: dt.name, dept: dt.dept, closedCount: closedCount });
  });

  return {
    companyName: cfg['Company Name'] || 'Container Supply Co.',
    location:    cfg['Location']     || 'Garden Grove, CA',
    trackers:    trackers
  };
}

function getClosedTicketsForArchive(sheetName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < TRACKER_PRIO_START) return [];

    var data = sh.getRange(
      TRACKER_PRIO_START, TK_DATA_COL,
      sh.getLastRow() - TRACKER_PRIO_START + 1, TK_COLS
    ).getValues();

    var tz = Session.getScriptTimeZone();
    var tickets = [];

    data.forEach(function(r) {
      var ticketNo = String(r[TK.TICKET_NO - 1] || '').trim();
      var status   = String(r[TK.STATUS   - 1] || '').toUpperCase().trim();
      if (!ticketNo || status !== 'CLOSED') return;

      var dateOpened = r[TK.DATE_OPENED - 1];
      var dateStr    = dateOpened instanceof Date
        ? Utilities.formatDate(dateOpened, tz, 'MM/dd/yyyy') : String(dateOpened || '');
      var monthKey   = dateOpened instanceof Date
        ? Utilities.formatDate(dateOpened, tz, 'yyyy-MM') : '';
      var monthLabel = dateOpened instanceof Date
        ? Utilities.formatDate(dateOpened, tz, 'MMMM yyyy') : '';

      tickets.push({
        ticketNo:     ticketNo,
        status:       String(r[TK.STATUS        - 1] || ''),
        priority:     String(r[TK.PRIORITY      - 1] || ''),
        dept:         String(r[TK.DEPT          - 1] || ''),
        equipType:    String(r[TK.EQUIP_TYPE    - 1] || ''),
        specificEquip:String(r[TK.SPECIFIC_EQUIP- 1] || ''),
        description:  String(r[TK.DESCRIPTION   - 1] || ''),
        dateOpened:   dateStr,
        monthKey:     monthKey,
        monthLabel:   monthLabel,
        verifiedBy:   String(r[TK.VERIFIED_BY   - 1] || '')
      });
    });

    tickets.sort(function(a, b) {
      return (b.dateOpened || '').localeCompare(a.dateOpened || '');
    });

    return tickets;

  } catch(e) {
    Logger.log('getClosedTicketsForArchive error: ' + e.message);
    return [];
  }
}

function executeArchive(data) {
  try {
    var ss       = SpreadsheetApp.getActiveSpreadsheet();
    var sourceSh = ss.getSheetByName(data.sheetName);
    if (!sourceSh) throw new Error('Tracker sheet not found: ' + data.sheetName);

    var archiveSh = ss.getSheetByName(SH.ARCHIVE);
    if (!archiveSh) throw new Error('Archive tab not found');

    var ticketNos = data.ticketNos || [];
    if (!ticketNos.length) return { success: false, error: 'No tickets selected.' };

    var tz    = Session.getScriptTimeZone();
    var now   = new Date();
    var stamp = Utilities.formatDate(now, tz, 'MM/dd/yyyy HH:mm:ss');

    if (archiveSh.getLastRow() < 1) {
      var archiveHeader = ['Archive ID','Archive Date','Archived By','Source Tracker',
        'Ticket #','Priority','Dept','Equipment','Description',
        'Date Opened','Verified By','Actual Hours','Fix Type','Notes'];
      archiveSh.getRange(1, 1, 1, archiveHeader.length)
        .setValues([archiveHeader])
        .setBackground('#3C3C3C').setFontColor('#FFD700')
        .setFontWeight('bold').setFontSize(9);
      archiveSh.setFrozenRows(1);
    }

    var startRow = TRACKER_PRIO_START;
    if (sourceSh.getLastRow() < startRow) return { success: true, archived: 0 };

    var ticketCol = sourceSh.getRange(
      startRow, TK_DATA_COL,
      sourceSh.getLastRow() - startRow + 1, 1
    ).getValues();

    var rowsToDelete = [];
    var archived     = 0;

    ticketCol.forEach(function(r, i) {
      var tn = String(r[0] || '').trim();
      if (!tn || ticketNos.indexOf(tn) < 0) return;
      var rowNum  = startRow + i;
      var rowData = sourceSh.getRange(rowNum, TK_DATA_COL, 1, TK_COLS).getValues()[0];

      var archiveRow = [
        'ARCH-' + Utilities.formatDate(now, tz, 'yyyyMMddHHmmss') + '-' + archived,
        stamp, 'System', data.dept || data.sheetName, tn,
        String(rowData[TK.PRIORITY      - 1] || ''),
        String(rowData[TK.DEPT          - 1] || ''),
        String(rowData[TK.SPECIFIC_EQUIP- 1] || rowData[TK.EQUIP_TYPE - 1] || ''),
        String(rowData[TK.DESCRIPTION   - 1] || ''),
        String(rowData[TK.DATE_OPENED   - 1] || ''),
        String(rowData[TK.VERIFIED_BY   - 1] || ''),
        String(rowData[TK.ACTUAL_HOURS  - 1] || ''),
        String(rowData[TK.FIX_TYPE      - 1] || ''),
        String(rowData[TK.NOTES         - 1] || '')
      ];

      archiveSh.appendRow(archiveRow);
      var archRowNum = archiveSh.getLastRow();
      archiveSh.getRange(archRowNum, 1, 1, archiveRow.length)
        .setBackground(archRowNum % 2 === 0 ? '#F9F9F9' : '#FFFFFF')
        .setFontSize(10);

      rowsToDelete.push(rowNum);
      archived++;
    });

    rowsToDelete.sort(function(a, b) { return b - a; });
    rowsToDelete.forEach(function(rowNum) { sourceSh.deleteRow(rowNum); });

    ticketNos.forEach(function(tn) {
      try {
        logTicketHistory(tn, 'ARCHIVED', 'CLOSED', 'ARCHIVED', 'Manager',
          'Archived from ' + (data.dept || data.sheetName) + ' tracker to Archive tab');
      } catch(e) { /* non-fatal */ }
    });

    return { success: true, archived: archived };

  } catch(e) {
    Logger.log('executeArchive error: ' + e.message);
    return { success: false, error: e.message };
  }
}

