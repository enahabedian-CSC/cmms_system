# Gap Report — Round 7 Step 0 Discovery
**Container Supply Co. CMMS — Google Apps Script**
**Produced:** 2026-06-08
**Reference old (Axis A baseline):** commit `c5d262b` — "snapshot of Izzy's live Apps Script 20260603"
**Reference new (Axis A head):** commit `6494fdc` — "reclone izzy current codebase" (current files on disk)
**Copy app:** `backend/*.gs` + `frontend/` (CMMS v5.0)

---

## Axis A — What Changed in Izzy's Codebase Between c5d262b and 6494fdc

### A1. Master Log — Column 22 Renamed

**Old (`c5d262b`):** `WORK_SUMMARY:22`
**New (`6494fdc`):** `PREVENTIVE_ACT:22`  — `WORK_SUMMARY` is **gone** from the ML object entirely.

`ML_COLS` remains 36 in both. The header array at col 22 changes from `'Work Summary'` to `'Preventive Action'`.

Impact: any code that wrote free-text work summaries into ML col 22 will silently write into a field now named Preventive Action. WORK_SUMMARY is not re-added at any other column.

### A2. AddTicket.html — Client-Side Form Validation Added

Two new JavaScript functions:
- `validateForm()` — iterates required fields, calls `markError(id)` for each empty one, returns `false` if any fail (blocks submission)
- `clearFieldError(id)` — removes `.input-error` / `.field-error` CSS classes on focus

Old version had no client-side validation guard before `google.script.run` call.

### A3. New Outbound Emails

Two new server-side email functions added to `Code.js`:
- `sendPartsNeededEmail_(ticketNo, data)` — fires when a ticket transitions to PENDING PARTS status; notifies parts/procurement contacts.
- `sendTicketCompleteEmail_(ticketNo, data)` — fires when a tech marks a ticket COMPLETE; email body includes the `preventiveAction` field (`data.preventiveAction || '—'`) and directs the manager to open the Manager Review Board to verify.

`sendTicketCompleteEmail_` is called at the bottom of the `updateTicket()` function when `newStatus === 'COMPLETE'`.

### A4. `preventiveAction` Field Propagated Through Ticket Data

`getTicketsForForm_()` now returns `preventiveAction: String(best[ML.PREVENTIVE_ACT-1]||'')` in the ticket object returned to UpdateTicket.html.

`updateTicket()` now writes: `mlRow[ML.PREVENTIVE_ACT-1] = data.preventiveAction || ''`

### A5. EMRL.js — New Closed Tab Column Architecture (CS_ constants)

The new version replaces the Closed Tickets tab layout. The old layout used the same 26 TK columns + 10 EMRL appended columns (cols 28–37). The new version defines a completely re-ordered 31-column structure with named `CS_*` constants:

| CS Const | Col | Field |
|---|---|---|
| CS_TICKET_NO | 2 | Ticket # |
| CS_STATUS | 3 | Ticket Status |
| CS_PRIORITY | 4 | Priority |
| CS_DEPT | 5 | Department |
| CS_BUILDING_ZONE | 6 | Building / Zone |
| CS_EQUIP_TYPE | 7 | Equipment Type |
| CS_EQUIP_CODE | 8 | Equip Code |
| CS_SPECIFIC_EQUIP | 9 | Equipment Description |
| CS_DOWNTIME_TYPE | 10 | Downtime Type |
| CS_ADDED_BY | 11 | Added By |
| CS_DATE_OPENED | 12 | Date Opened |
| CS_PROBLEM_TYPE | 13 | Problem Type |
| CS_DESCRIPTION | 14 | Problem Description |
| CS_LINE_NO | 15 | Line # |
| CS_EST_HOURS | 16 | Est Hrs |
| CS_ACTUAL_HOURS | 17 | Act Hrs |
| CS_REPAIR_COMPLETE | 18 | Repair Complete (Y) |
| CS_COMPLETED_BY | 19 | Completed By |
| CS_REPAIR_DATE | 20 | Repair Date |
| CS_PARTS_USED | 21 | Parts Used |
| CS_CORRECTIVE | 22 | Corrective Action |
| CS_CAPA_REQ | 23 | CAPA Required |
| CS_ROOT_CAUSE | 24 | Root Cause |
| CS_PREVENTIVE | 25 | Preventive Action |
| CS_CHECKLIST | 26 | Verification Checklist |
| CS_VERIFIED_BY | 27 | Verified By |
| CS_VERIFIED_DATE | 28 | Verified Date |
| CS_NOTES | 29 | Notes |
| *(cols 30–31 present but unnamed)* | 30–31 | — |

The old EMRL variable block (`EMRL_COL_START`, `EMRL_REPAIR_DATE`, etc.) is retained as "LEGACY EMRL OFFSET CONSTANTS — kept for reference only."

### A6. New Functions: `migrateClosedTab_()`, `runMigrateClosedTab()`, `runRebuildClosedTab()`

- `migrateClosedTab_()` — reads existing Closed Tickets rows in the old TK 26-col format and rewrites them into the new CS 31-col layout.
- `runMigrateClosedTab()` — public entry point (menu-callable) for `migrateClosedTab_()`.
- `runRebuildClosedTab()` — public entry point that calls `rebuildClosedTab_()` (full rebuild from ML).

### A7. EMRL_EXTRA_COLS Block Comment Changed

The old `EMRL_EXTRA_HEADERS` array and `EMRL_EXTRA_COLS = 10` remain in the new version but the block header comment changes from "EMRL COLUMN INDICES" to "LEGACY EMRL OFFSET CONSTANTS — kept for reference only."

### A8. Verification Checklist — 3 Items, Server-Side Enforced (no change in Axis A)

The 3-item checklist (`'Work completed satisfactorily'`, `'Area cleaned and safe'`, `'No food safety risk identified'`) was already present in the old version. No change in Axis A. Axis B gap noted below.

---

## Axis B — Izzy New vs. Copy App Divergences

### B1. Status String for "Awaiting Manager Verification" ⚠️ CRITICAL

| System | Status string used after tech marks work done |
|---|---|
| Izzy (new) | `'COMPLETE'` |
| Copy app | `'PENDING VERIFICATION'` |

In Izzy's system, `'COMPLETE'` is the state that signals work is done and is awaiting manager closure. The Manager Review Board's `pendingVerify` bucket is `getTicketsForBoard_(['COMPLETE'])`. In the copy app, `TicketLifecycle.gs:completeTicket()` writes `status: 'PENDING VERIFICATION'`. The copy app's `Reports.gs` uses `activeStatuses = { 'PENDING VERIFICATION': 1, ... }`, meaning it treats `'PENDING VERIFICATION'` as an active open ticket.

Any data exchange or comparison between systems on this status will fail silently.

### B2. ML Column Count: 36 (Izzy) vs. 37 (Copy App)

| System | ML cols | Extra column |
|---|---|---|
| Izzy new | 36 | None beyond VERIFICATION_CHECKLIST:36 |
| Copy app | 37 | `PHOTO_URL:37` added |

### B3. ML Col 22: PREVENTIVE_ACT (Izzy new) vs. WORK_SUMMARY (Copy App) ⚠️ CRITICAL

| System | Col 22 |
|---|---|
| Izzy new | `PREVENTIVE_ACT:22` |
| Copy app | `WORK_SUMMARY:22` |

The copy app retains `WORK_SUMMARY:22`. Izzy has dropped WORK_SUMMARY from the ML object altogether and replaced it with PREVENTIVE_ACT. Data imported via IzzySync would store Preventive Action content in a field the copy app calls Work Summary.

### B4. ML Vocabulary Object `ML_ACTIONS` — Copy App Only

The copy app defines `var ML_ACTIONS = { TICKET_CREATED: 'TICKET CREATED', MANAGER_ACTION: 'MANAGER ACTION', MANAGER_VERIFIED: 'MANAGER VERIFIED — CLOSED', VOIDED: 'VOIDED', ... }`. Izzy writes raw string literals into the ACTION column. String values are mostly identical; the constant object is a copy-app improvement over Izzy.

### B5. TH_EVENTS — Copy App Has Extended Vocabulary

Copy app `TH_EVENTS` adds: `VOIDED`, `TAG_CLEARED`, `TEMP_FIX_CLEARED`, `TEMP_FIX_INSPECT`, `REROUTED`, `DIRECT_EDIT`, `SERVICE_REPORT`, `PENDING_VERIFY`. Izzy's TH_EVENTS is a subset (12 events vs. the copy's 20).

### B6. PM Forward-Design Tabs — Copy App Only

Copy app `Config.gs` defines `SH.PM_SCHEDULES`, `SH.PM_CHECKLIST`, `SH.PM_RECURRENCES`. Izzy has no PM tabs. These are schema placeholders with no live UI.

### B7. System Version: '3.0' (Izzy) vs. '5.0' (Copy App)

`Setup.js` config key `'System Version'` is `'3.0'` in Izzy. Copy app `Config.gs` sets `'5.0'`.

### B8. Admin Email Resolution

| System | Source |
|---|---|
| Izzy | Hardcoded fallback: `['izuniga@cscmfg.com']` in `Accesscontrol.js` if Config blank |
| Copy app | Reads from `'System Admins'` config key (no hardcoded fallback) |

### B9. Copy App Has `voidTicket()` / `VOIDED` Status; Izzy Does Not

Izzy has no `voidTicket()` function and no `'VOIDED'` status string.

### B10. `completeTicket()` Caller — Who Can Complete a Ticket

In Izzy, the tech calls `updateTicket()` with `newStatus:'COMPLETE'`; there is no separate `completeTicket()` function. In the copy app, `completeTicket()` is a discrete function gated by `requireManager_()`. This means in the copy app a manager must explicitly mark work complete, whereas in Izzy a tech can do it through `updateTicket()`.

### B11. Verification Checklist Not Enforced Server-Side in Copy App

Izzy's `managerVerifyTicket()` throws if any of the 3 required items is missing from the checklist string. The copy app's `verifyAndCloseTicket()` accepts the field but applies no server-side validation — CLOSED transition can proceed with an empty checklist.

### B12. No Manager Notification Email in Copy App

`sendTicketCompleteEmail_()` and `sendPartsNeededEmail_()` are absent from the copy app.

### B13. Chronic Equipment Threshold — 3 (Izzy) vs. Not Implemented (Copy App)

Izzy's `Dashboard.js` flags equipment at `if(tix.length >= 3)` (3+ tickets in 90 days). The copy app has no server-side chronic equipment detection implemented.

---

## Axis C — 16-Item Compliance Checklist (Proposed Changes vs. Izzy's Code)

| # | Change | Izzy New Implementation | Copy App | Gap / Build Direction |
|---|---|---|---|---|
| C01 | Joint tickets (multi-dept) | **Not implemented.** Departments are mutually exclusive in ticket routing. No joint-dept membership field in ML or TK. | Not implemented | NEW concept — must add and document in FIELD_MAPPING.md |
| C02 | All-managers view access | Manager Review Board shows all tickets; no dept filter on view | View-all exists via Manager Review Board | Match in concept |
| C03 | Transfer confirmation | Transfer fires without confirmation dialog in UpdateTicket.html | No explicit confirmation step | Add confirmation step — copy app improvement |
| C04 | Review gate | Two gates: WAITING→OPEN (`managerApproveTicket`) and COMPLETE→CLOSED (`managerVerifyTicket`). Tech sets `'COMPLETE'`; manager verifies. | Single gate `verifyAndCloseTicket`; tech cannot self-complete | Restore Izzy's flow: tech can mark COMPLETE via `updateTicket()`; see REVIEW_GATE_FINDING.md |
| C05 | CAPA on all tickets | Izzy writes Root Cause + Preventive Action on all ticket closures regardless of priority. No priority gate in `managerVerifyTicket`. | CAPA fields exist; enforcement scope unclear | Conform: remove any priority gate; require both fields on all closures |
| C06 | Verification checklist | **3 items** (not 4): "Work completed satisfactorily" / "Area cleaned and safe" / "No food safety risk identified". Server-side enforced. | Accepts `sqfChecklist` field; no server enforcement | ⚠️ SEE FLAG BELOW — item count and text diverge from the brief |
| C07 | Completion banner | `sendTicketCompleteEmail_()` fires to managers; no in-app banner defined in Izzy's HTML | None | Email exists in Izzy; in-app bell/banner are copy-app additions |
| C08 | Temp-fix tightening | `TempFixInspection.html` exists for temp fix monitoring; no permanent-fix plan/date requirement found in Izzy | Temp fix flag exists; no plan/date enforcement | NEW requirement — Izzy lacks this; add and document |
| C09 | Predictive-insights threshold | `if(tix.length >= 3)` in `_reference/izzy_current/Dashboard.js` — already at 3 | Not implemented in copy app backend | Implement at 3; already Izzy's value |
| C10 | Logo (not base64) | Izzy uses **base64** in `MaintenanceRepairRecord.html` line ~158: `var LOGO_B64 = 'iVBOR...'` | Unknown; base64 was attempted | ⚠️ SEE FLAG BELOW — Izzy uses base64; brief says don't. Confirm approach with Michael |
| C11 | Service report / maintenance form conformance | `ServiceReport.html` + `MaintenanceRepairRecord.html` define field sets. See FIELD_MAPPING.md for exact fields. | `backend/ServiceReport.gs` exists | Adopt Izzy's field set per Axis C diff |
| C12 | Maintenance Repair Log header banner | Not present in Izzy's EMRL.js or frontend. | Not present | NEW — copy-app addition; not a conformance item |
| C13 | Hold-tag PDF | `EquipmentHoldTag.html` present in Izzy. Colors: Red / Yellow / Orange (no Green). Green is NOT present in Izzy's hold tag. | Hold tag exists | ⚠️ SEE FLAG BELOW — Green tag not found in Izzy; brief says manager-only Green. Confirm. |
| C14 | Version number | `'System Version': '3.0'` in Izzy config. No auto-increment mechanism. | Version '5.0' in Config.gs | NEW — auto-increment on deploy; copy-app addition |
| C15 | Closed Tickets vs. Reports mismatch | Izzy's Reports queries ML for `STATUS === 'CLOSED'`; Closed Tickets tab is populated by `moveTicketToClosed_()`. Both source from ML. | Reports.gs and EMRL.gs both exist; copy app uses `'PENDING VERIFICATION'` as active status | Likely source of mismatch: status string `'PENDING VERIFICATION'` vs `'CLOSED'`; validate before fixing |
| C16 | Unplanned downtime duration | **Not captured** as a duration field. `DOWNTIME_TYPE` distinguishes planned/unplanned but no duration column exists in Izzy ML. | Not captured | NEW — add and document in FIELD_MAPPING.md |

---

## Flags for Michael (require decision before build)

### FLAG-1 — Verification Checklist Item Count and Text
**Brief (Change 6):** "Four items: tools removed, sanitation done, work completed, name + date."
**Izzy's actual implementation:** THREE items with different text:
- "Work completed satisfactorily"
- "Area cleaned and safe"
- "No food safety risk identified"

These are NOT the same items the brief specifies. **Decision needed:** Do we use Izzy's 3 items verbatim (conformance), use the 4 items from the brief (deviation), or a hybrid? This affects the SQF audit trail directly. Do not build Change 6 without Michael's answer.

### FLAG-2 — Logo Embedding Method
**Brief (Change 10):** "Do not use base64 — it has been unreliable."
**Izzy's actual implementation:** Izzy uses base64 in `MaintenanceRepairRecord.html` line ~158.

If we conform to Izzy's code (base64), we contradict the brief. If we use Drive URL/blob (brief's preference), we diverge from Izzy. **Decision needed:** which takes precedence?

### FLAG-3 — Green Hold Tag
**Brief (Change 13):** "Tag colors Red / Yellow / Orange / Green per FRM-029-001; manager-only Green."
**Izzy's `EquipmentHoldTag.html`:** Only Red, Yellow, Orange found. No Green tag in Izzy's code.

**Decision needed:** Is Green a new addition this round (not from Izzy)? If so, document as NEW in FIELD_MAPPING.md.

### FLAG-4 — FRM-003-003 on Maintenance Repair Record
The Maintenance Repair Record carries form number `FRM-003-003`, which breaks the `FRM-030-xxx` series. This is used verbatim in the code. **Do not change it** — flagged here for Michael to confirm with Izzy whether this is intentional or an error in her numbering.

---

## Summary of Critical Gaps for Round 7

1. **Status string mismatch** — `'COMPLETE'` (Izzy) vs. `'PENDING VERIFICATION'` (copy). Decision needed before any status-related work.
2. **ML col 22 semantic collision** — `PREVENTIVE_ACT` (Izzy new) vs. `WORK_SUMMARY` (copy). Must resolve before IzzySync can import correctly.
3. **Verification checklist not enforced** — server-side guard must be added; item text must be confirmed (Flag-1).
4. **Manager notification email absent** — must implement `sendTicketCompleteEmail_()` equivalent.
5. **Closed Tickets tab layout incompatible** — Izzy new uses 31-col CS_ layout; copy uses 37-col EMRL layout. Workshop required.
6. **4 items that are genuinely new** (no Izzy equivalent): joint-ticket membership, temp-fix plan/date, unplanned downtime duration, Green hold tag (pending Flag-3 answer).
