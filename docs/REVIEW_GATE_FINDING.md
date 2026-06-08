# Review Gate Finding — Manager Review Business Logic
**Round 7 Step 0 | Container Supply Co. CMMS**
**Produced:** 2026-06-08
**Source of truth:** `_reference/izzy_current/ManagerReviewBoardServer.js` (commit 6494fdc)
**Copy app implementation:** `backend/TicketLifecycle.gs`

---

## Overview

The CMMS has **two distinct manager review gates**. Each controls a different stage of the ticket lifecycle. Both are implemented in Izzy's `ManagerReviewBoardServer.js` and called from `ManagerReviewBoard.html`. **There is no inline dashboard action for either gate — all review happens from the Manager Review Board dialog or the ticket detail.**

---

## Gate 1: Intake Review — WAITING → OPEN

### Purpose
New tickets land in the Waiting Queue (`⏳ Waiting Queue` tab) with status `'WAITING'`. A manager must review and approve each ticket before technicians can begin work. The manager sets priority, assigns a technician, confirms or changes the department, and may issue an equipment hold tag at this point.

The gate controls **work assignment** — tech cannot begin until a manager approves. It does NOT verify fix quality (that is Gate 2).

### Trigger
Any user creates a ticket via `AddTicket.html`. Ticket written to ML with `status: 'WAITING'`; row placed on Waiting Queue sheet.

### Review Location
Manager Review Board (`ManagerReviewBoard.html`, 2000×1900px modal opened via `openManagerReviewBoard()`). The `waitingTickets` bucket is populated by `getTicketsForBoard_(['WAITING'])`.

Per the build spec (Change 4): the copy app implements this from the ticket detail, not from a separate review-board screen. The Manager Review Board screen is **not copied over** — only the underlying gate logic.

### Server Function: `managerApproveTicket(data)` (Izzy) / `approveTicket(data)` (Copy)

**Actions performed:**
1. Appends new ML row: `ACTION: 'MANAGER ACTION — {newStatus}'`, `STATUS: 'OPEN'` (or chosen status).
2. Can set: `priority`, `assignedTo`, `dept`, `buildingZone`, `rootCause`, `correctiveAction`, `workSummary`, `downtimeType`, `observations`, `notes`.
3. If `dept` changed: calls `logTicketTransfer_()`, moves ticket to new dept's tracker.
4. If `equipTagStatus` set (Red/Yellow/Orange): calls `logEquipHoldTag_()`.
5. Calls `moveTicketFromWaitingToOpen_(ss, ticketNo, ...)` — physical sheet move.
6. Logs to Ticket History: `TH_EVENTS.MOVED_TO_OPEN`.

**Manager can also:**
- Keep in WAITING — sets `newStatus: 'WAITING'`; no sheet move, only ML row appended.
- Close directly from waiting — sets `newStatus: 'CLOSED'`; moves to Closed, sets `DATE_CLOSED`.

**There is no "reject" function.** Queue is managed by leaving in WAITING or direct CLOSED action.

### Physical Sheet Move — `moveTicketFromWaitingToOpen_(ss, ticketNo, updates, now)`
1. Finds ticket row on `⏳ Waiting Queue` by scanning col B for the ticket number.
2. Reads full 26-col TK row.
3. Updates `TK.STATUS` → `'OPEN'`; applies priority/assignedTo/notes/dept overrides from `updates`.
4. Appends row to `📂 Open Tickets` after frozen header rows.
5. Applies `applyDataRowBorders_()` and `applyPriorityRowColor_()`.
6. Deletes source row from Waiting Queue.

---

## Gate 2: Verification Review — COMPLETE → CLOSED

### Purpose
After a technician marks work as done, the ticket sits in a "pending close" state. A manager must verify that the work is acceptable, the area is safe, and there is no food safety risk before the ticket is permanently closed and the EMRL row is written.

The gate controls **fix verification** — it answers "was the work acceptable?" It does NOT control work assignment (that is Gate 1).

### Trigger

**Izzy:** Tech calls `updateTicket()` with `newStatus: 'COMPLETE'`. Writes `status: 'COMPLETE'` to ML and fires `sendTicketCompleteEmail_()` notifying managers.

**Copy app (current):** Manager (not tech) calls `completeTicket()` which writes `status: 'PENDING VERIFICATION'` to ML. No notification email.

**Key divergence:** In Izzy, `'COMPLETE'` = "work done, awaiting manager closure." In the copy app this state is called `'PENDING VERIFICATION'`. These values are not interchangeable.

### Review Location
Manager Review Board `pendingVerify` bucket populated by:
- **Izzy:** `getTicketsForBoard_(['COMPLETE'])`
- **Copy app:** must use `'PENDING VERIFICATION'` (or adopt Izzy's `'COMPLETE'` string — see decision needed below)

Per build spec (Change 4): review is performed from the **ticket detail only**, accessible by clicking through from the dashboard's awaiting category. No separate review-board screen in the copy app.

### Server Function: `managerVerifyTicket(data)` (Izzy) / `verifyAndCloseTicket(data)` (Copy)

#### Izzy — `managerVerifyTicket(data)` in `ManagerReviewBoardServer.js`

**Checklist enforcement (SQF 13.2.8 compliance):**
```javascript
var _chkItems = [
  'Work completed satisfactorily',
  'Area cleaned and safe',
  'No food safety risk identified'
];
var _chkResult = String(data.verificationChecklist || '');
var _allChecked = _chkItems.every(function(item){ return _chkResult.indexOf(item) >= 0; });
if (!_allChecked) {
  throw new Error('Verification checklist incomplete — all 3 items must be confirmed before closing.');
}
```

All three items must appear as substrings in the `verificationChecklist` string. Server-side — HTML UI cannot bypass it.

**Actions performed:**
1. Validates checklist (throws if incomplete).
2. Parses `verifiedDate` from ISO `YYYY-MM-DD` to `MM/DD/YYYY` (timezone-safe).
3. Appends ML row: `ACTION: 'MANAGER VERIFIED — CLOSED'`, `STATUS: 'CLOSED'`, writes `VERIFIED_BY`, `VERIFIED_DATE`, `DATE_CLOSED`, `ACTUAL_HOURS`, carries forward identity fields.
4. Calls `moveTicketToClosed_(ss, ticketNo, ...)` — physical sheet move from Open Tickets to Closed Tickets.
5. Writes EMRL row: `populateEMRL_()` fills EMRL-only columns (Repair Date, Parts Used, Root Cause, Corrective Action, Preventive Action, CAPA Required, Clearance Checklist, Had Temp Fix, TF Resolved Date).
6. Logs to Ticket History: `TH_EVENTS.VERIFIED` then `TH_EVENTS.CLOSED`.

#### Copy App — `verifyAndCloseTicket(data)` in `backend/TicketLifecycle.gs`

Accepts `sqfChecklist` field but does **not** enforce the 3-item string match server-side. The checklist value passes through to the ML row, but there is no `_allChecked` guard. CLOSED transition can proceed with empty or partial checklist.

**Must add:**
```javascript
var _required = ['Work completed satisfactorily','Area cleaned and safe','No food safety risk identified'];
var _chk = String(data.sqfChecklist || data.verificationChecklist || '');
if (!_required.every(function(item){ return _chk.indexOf(item) >= 0; })) {
  return { success: false, error: 'Verification checklist incomplete — all 3 items must be confirmed before closing.' };
}
```

Note: this is blocked on FLAG-1 in GAP_REPORT.md — the brief specifies 4 different items. Michael must confirm which item set to enforce.

---

## Gate 3: Service Report Verification (Secondary Gate — Independent)

`managerVerifyReport(data)` in `ManagerReviewBoardServer.js`:
- Verifies tech-submitted Service Report entries in the `📝 Report Database`.
- Marks the report as verified; writes `VERIFIED_BY`, `VERIFIED_DATE` to RPT_DB.
- Independent of the ticket close gate — a report can be verified separately from the ticket.

---

## State Machine (Izzy Canonical)

```
[TICKET CREATED]
        │
        ▼
   ┌─────────┐
   │ WAITING │  ← New tickets land here
   └────┬────┘
        │ managerApproveTicket() → OPEN
        │ managerApproveTicket() → CLOSED (direct close from waiting)
        ▼
   ┌────────┐
   │  OPEN  │  ← Technician works on ticket
   └────┬───┘
        │ updateTicket(newStatus:'COMPLETE')
        │   or ON HOLD / PENDING PARTS (no gate change)
        ▼
   ┌──────────┐
   │ COMPLETE │  ← "Awaiting manager verification" state in Izzy
   └────┬─────┘    (called 'PENDING VERIFICATION' in copy app — string must be reconciled)
        │ managerVerifyTicket() — requires 3-item checklist
        ▼
   ┌────────┐
   │ CLOSED │  ← Final state; row on Closed Tickets tab + EMRL populated
   └────────┘

Additional statuses reachable from OPEN (no gate function):
  → ON HOLD          (tech/manager update)
  → PENDING PARTS    (tech/manager update; triggers sendPartsNeededEmail_)
  → IN PROGRESS      (status refinement of OPEN — Izzy only)
  → IN REVIEW        (appears in getTicketsForForm_ filter — Izzy only)

Copy app adds (not in Izzy):
  → VOIDED           (voidTicket() from any active status)
  → PENDING VERIFICATION (copy app's name for COMPLETE)
```

---

## Access Control

`openManagerReviewBoard()` checks: `userInfo.isAdmin === true` OR any entry in `userInfo.authorizedTabs` has `role === 'manager'` or `role === 'admin'`.

**Izzy:** `managerApproveTicket()` and `managerVerifyTicket()` do NOT call an explicit `requireManager_()` guard — they rely on the dialog only being openable by managers.

**Copy app improvement:** `approveTicket()`, `completeTicket()`, and `verifyAndCloseTicket()` all call `requireManager_()` explicitly. Keep this.

---

## Decision Required Before Building Change 4

**Decision 1 — Status string:** Adopt Izzy's `'COMPLETE'` as the post-work status string, or keep `'PENDING VERIFICATION'` and translate at the IzzySync boundary?

Recommendation: adopt `'COMPLETE'` (conformance wins). Requires updating `TicketLifecycle.gs:completeTicket()`, all status filters in `Reports.gs`, `Dashboard.gs`, and UI display labels.

**Decision 2 — Who marks work complete:** In Izzy, the TECH calls `updateTicket()` to mark COMPLETE. In the copy app, the MANAGER calls `completeTicket()`. Which flow does Michael want?

Per the brief (Change 7): when the tech enters the Corrective Action, a banner pops saying the ticket is set to complete — this implies the TECH triggers the completion, matching Izzy's flow.

**Decision 3 — Checklist items:** See FLAG-1 in GAP_REPORT.md. Which 3 or 4 items do we enforce?

**Change 4 is blocked until all three decisions are answered.**
