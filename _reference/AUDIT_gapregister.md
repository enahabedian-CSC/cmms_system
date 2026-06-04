# AUDIT — Feature & Logic Gap Register: Izzy vs Ours

**Date:** 2026-06-03  
**Branch:** `claude/gracious-ritchie-PY1hQ`  
**Status:** Phase 1b/c — READ-ONLY audit. No app code changed.  
**Gap model:** SMALL (≤2 files, no audit-log writes, no dept mapping) = auto-build after stating spec. BIG (>2 files OR audit-log writes OR dept mapping OR new tab/data model) = STOP, workshop with user.

---

## Legend

| Decision | Meaning |
|----------|---------|
| **PORT** | Replicate Izzy's logic exactly in our system |
| **ADAPT** | Replicate the intent with changes to fit our architecture |
| **SKIP** | Deliberately not porting; reason given |
| **DEFER** | Valid gap but out of scope for this pass |
| **DONE** | Already equivalent or better in our system |

---

## Section A — New Ticket Form

### A1 — Department dropdown: Sage names vs canonical names

| | Izzy | Ours |
|--|------|------|
| Source | `Object.keys(getDeptMapping_()).sort()` — Sage names from Dept Map sheet | `DEPT_TRACKERS.map(dt=>dt.dept)` — hardcoded canonical names |
| Display | `"METAL — 001"` (Sage name + accounting code) | `"METALS"` (canonical name only) |
| DEPT_CODES object | Defined; passed to form as `deptCodes` | Absent from form data |

**Decision: BIG — PORT (Phase 3, workshop first)**  
Changing the department dropdown changes what `data.dept` the server receives, which flows into ticket # generation, ML writes, tracker routing, and equipment cascade — all audit-trail-adjacent. Requires careful coordination. Flagged for Phase 3 workshop.

**Interim:** Current UX (canonical names) is functionally correct for routing. Techs who know only Sage names may be confused; document in user guide until Phase 3.

---

### A2 — Equipment cascade: cross-group key aggregation

| | Izzy | Ours |
|--|------|------|
| Logic | `onDeptChange()` aggregates all hierarchy keys resolving to the same group | `_sfCascadeDept_()` does direct `hier[dv]` lookup |
| Robustness | Works even if equipment is keyed under "METAL" while form shows "METAL" | Fails silently if hierarchy key ≠ form dept name |

**Decision: SMALL — PORT (Phase 3, within 2 files)**  
Only touches `frontend/partials/submit-ticket.html` and no audit log. Can auto-build after spec confirmation. Depends on A1 being workshopped first because the exact lookup key changes if the form switches to Sage names.

**Spec (pending A1 decision):** In `_sfCascadeDept_()`, replace direct `hier[dv]` with a group-resolution scan: collect all keys `k` in `hier` where `normalizeDeptClient_(k) === normalizeDeptClient_(dv)`, merge their type entries, populate the type dropdown. Mirrors Izzy's `onDeptChange()` lines ~220-250 exactly.

---

### A3 — Equipment cascade: client-side `getDeptGroupClient_()` fallback

| | Izzy | Ours |
|--|------|------|
| Logic | Hard-coded emergency fallback map (METAL→METALS, M/S→MACHINE SHOP, …) | Absent |

**Decision: SMALL — PORT alongside A2**  
The fallback prevents cascade failure if the server-side Dept Map is momentarily empty. No audit log impact. Will be included when A2 is built.

---

### A4 — Parts table on New Ticket form

| | Izzy | Ours |
|--|------|------|
| Fields | Part ID/No, Part Description, Qty, UOM (dropdown), Notes per row | Absent from New Ticket form |
| UOM options | EA, LB, FT, GAL, BOX, SET, ROLL, PKG | N/A |
| Server write | `logPartsNeeded_()` appends rows to PARTS_NEEDED sheet | N/A |
| Email | `sendPartsNeededEmail_()` on submit | N/A |

**Decision: BIG — PORT (Phase 3, workshop first)**  
Adds new rows to PARTS_NEEDED (a data-model write); touches both the frontend form and `TicketSubmission.gs`. Requires workshopping the parts schema to confirm it matches our PARTS_NEEDED tab layout before building.

---

### A5 — Photo / image link field

| | Izzy | Ours |
|--|------|------|
| Approach | `uploadPhotoToDrive` server function + `<input type="file">` in AddTicket.html | Absent from Submit Ticket form |
| Storage | Google Drive; Drive URL written to ML.NOTES or a dedicated photo field | N/A |

**Decision: BIG — PORT (Phase 3, workshop first)**  
Touches `TicketSubmission.gs` (Drive upload function), the ML row write (where does the URL land?), and the frontend. Need to confirm which ML column holds photo links before building.

---

### A6 — Routing banner / preview

| | Izzy | Ours |
|--|------|------|
| Logic | `updateRoutingBanner()` + `getClientTrackerName_()` in AddTicket.html; mirrors server rules client-side using `FD.routingRules` | Absent |

**Decision: SMALL — PORT (Phase 3)**  
Only touches the Submit Ticket HTML partial; no server writes. Routing rules are already passed in `getSubmitFormData()` return value (or can be added). Requires A1/A2 decisions first to know which dept names are in play.

---

### A7 — Priority lock (tech vs manager/admin)

| | Izzy | Ours |
|--|------|------|
| Behaviour | `buildPriorityField(role)`: tech sees read-only display; manager/admin sees dropdown | Submit Ticket form has priority dropdown visible to all roles |

**Decision: SMALL — ADAPT (Phase 3)**  
`getCurrentUserInfo()` is already available via `_sfData`. Adding a read-only display for tech role is a purely frontend change (≤1 file). Low complexity, no audit impact.

---

### A8 — Downtime type field

| | Izzy | Ours |
|--|------|------|
| Options | PLANNED / UNPLANNED | Same |

**Decision: DONE**

---

### A9 — Line number field

| | Izzy | Ours |
|--|------|------|
| Presence | Yes — written to ML.LINE_NO | Yes — present in form and ML |

**Decision: DONE**

---

## Section B — Ticket Lifecycle

### B1 — CRITICAL bypass (skip Waiting Queue)

| | Izzy | Ours |
|--|------|------|
| Logic | `isCritical = priority === 'CRITICAL'`; initial status = 'OPEN', written to Open sheet directly | Identical |

**Decision: DONE**

---

### B2 — Status flow

| | Izzy | Ours |
|--|------|------|
| States | WAITING → OPEN → COMPLETE / PENDING VERIFICATION → CLOSED | Identical |
| VOID | `voidTicket()` marks with reason | Present in our `TicketLifecycle.gs` |

**Decision: DONE**

---

### B3 — Tracker re-routing on dept/problemType change

| | Izzy | Ours |
|--|------|------|
| Logic | `updateTicket()` detects `trackerChanged`, calls `removeTicketFromSheet_` + `writeTicketToTrackerSheet_` | Present in `TicketLifecycle.gs` |

**Decision: DONE**

---

### B4 — WAITING → OPEN hydration (backfill from ML)

| | Izzy | Ours |
|--|------|------|
| Logic | On approval, `getOriginalTicketData_()` fills missing fields from the creation ML row | Present — `_updateTicketInSheets_()` handles this |

**Decision: DONE**

---

### B5 — SQF verification checklist (3-item)

| | Izzy | Ours |
|--|------|------|
| Fields | Verification checklist written to ML col 36 (VERIFICATION_CHECKLIST) | ML has 35 cols; no dedicated checklist column |
| Server validation | `managerVerifyTicket()` checks all 3 items server-side | Our verify path does not have this check |

**Decision: BIG — PORT (Phase 3, workshop first)**  
Adding col 36 to ML is an audit-log schema change — highest regression risk. Must workshop: (a) whether the checklist text goes in the existing NOTES col or a new col, (b) impact on all downstream ML readers.

---

### B6 — Equipment Hold Tag on ticket creation

| | Izzy | Ours |
|--|------|------|
| Logic | `logEquipHoldTag_()` called from `addNewTicket()` when `equipTagStatus` is set | `_logEquipHoldTag_()` present in `TicketLifecycle.gs` |

**Decision: DONE** (verify field name alignment when implementing A4/A5)

---

## Section C — Equipment Hold Log

### C1 — Status indicators

| | Izzy | Ours |
|--|------|------|
| Display | Text badges in the Hold Log panel | Emoji colored squares (🟥🟨🟩) |

**Decision: SMALL — FIX (Phase 2, auto-build)**  
≤1 file, no audit writes. Replace emoji squares with CSS dot/pill/badge indicators. Spec: use `<span class="status-dot status-{class}">` with CSS classes `status-active` (red), `status-monitoring` (amber), `status-cleared` (green), `status-inactive` (grey).

---

## Section D — Tech Work Board

### D1 — "Assign Tech" control on Work Board

| | Izzy | Ours |
|--|------|------|
| Presence | Not present on the Tech Work Board (assignment is a manager action on the Manager Review Board) | Present — visible to managers on the Tech Work Board |

**Decision: SMALL — REMOVE (Phase 2, auto-build)**  
≤1 file (`frontend/partials/tech-work-board.html`), no audit writes. Remove the assign-tech UI element from the Tech Work Board. Assignment remains available on the Manager Review Board.

---

## Section E — Update Ticket Form

### E1 — Department dropdown format on Update form

| | Izzy | Ours |
|--|------|------|
| Source for list | `Object.keys(deptMapping).sort()` — Sage names | `departments: DEPT_TRACKERS.map(...)` — canonical names |

**Decision: DEFER (linked to A1)**  
Same issue as A1. Resolve in Phase 3 workshop.

---

### E2 — Equipment type dropdown on Update form

| | Izzy | Ours |
|--|------|------|
| Source | `getAllDataLists()['Equipment Types']` | Same |

**Decision: DONE**

---

### E3 — Parts status update from Update form

| | Izzy | Ours |
|--|------|------|
| Fields | Parts status dropdown on update form | Present |

**Decision: DONE**

---

## Section F — Manager Review Board

### F1 — `deptCodes` passed to Manager Review Board

| | Izzy | Ours |
|--|------|------|
| `getManagerReviewBoardData()` returns | `deptCodes: DEPT_CODES` + `deptMapping` + `systemDepts` | Our equivalent not yet audited in detail |

**Decision: DEFER (linked to A1)**  
Once A1 is workshopped, the dept representation on the Manager Review Board will be consistent.

---

### F2 — Manager verify: SQF checklist enforcement

See B5 above.

---

### F3 — Manager approve / verify flow

| | Izzy | Ours |
|--|------|------|
| Functions | `managerApproveTicket()`, `managerVerifyTicket()`, `managerUpdatePartStatus()` | Equivalent functions in `TicketLifecycle.gs` |

**Decision: DONE** (checklist is the remaining delta — see B5)

---

## Section G — Equipment Cache

### G1 — Cache population method

| | Izzy | Ours |
|--|------|------|
| Method | IMPORTRANGE formula in cell A4 of cache sheet; `refreshEquipCache()` clears and resets the formula | `SpreadsheetApp.openById()` — reads the source sheet programmatically |

**Decision: ADAPT — DONE**  
Our approach is equivalent in result and avoids IMPORTRANGE quota issues. Deliberate design choice. No change needed.

---

### G2 — Column header mismatch handling

| | Izzy | Ours |
|--|------|------|
| Behaviour | No flexible header mapper; relies on exact column positions | `_EQUIP_COL_MAPPINGS_` with extensive name variants; fixed filter (commit `1e92c9f`) |

**Decision: DONE** (our approach is more robust than Izzy's)

---

### G3 — Equipment hierarchy: normalization vs raw dept

See AUDIT_mapping.md §3 / §4. Our normalization is correct in intent; robustness depends on Dept Map being populated (A2 fix closes the remaining gap).

---

## Section H — EMRL (Equipment Maintenance Record Log)

### H1 — EMRL tab on Closed Tickets

| | Izzy | Ours |
|--|------|------|
| Columns | 10 extra cols appended to Closed Tickets: Repair Date, Parts Used, Root Cause, Corrective Action, Preventive Action, CA Date, CAPA Required, Clearance Checklist, Had Temp Fix, TF Resolved Date | Present — `backend/TicketLifecycle.gs` has EMRL writes |

**Decision: DONE** (verify column count alignment separately if issues arise)

---

### H2 — `searchEMRL()` — searchable closed tickets

| | Izzy | Ours |
|--|------|------|
| Function | `searchEMRL(query)` in `EMRL.js` | Not audited in detail |

**Decision: DEFER** — functional parity check for Phase 3 if search is reported missing.

---

## Section I — Access Control

### I1 — Role model

| | Izzy | Ours |
|--|------|------|
| Roles | admin, manager, other (no TECH role) | NOACCESS, TECH, MANAGER, ADMIN |
| Domain rule | No @cscmfg.com auto-upgrade | @cscmfg.com domain → minimum TECH |

**Decision: ADAPT — DONE**  
Our TECH role is an intentional addition for SQF traceability. No change needed. Our `Auth.gs` is more expressive than Izzy's access control.

---

### I2 — Admin email fallback

| | Izzy | Ours |
|--|------|------|
| `getAdminEmails_()` | Fallback hardcoded to `['izuniga@cscmfg.com']` | Reads from Config; no hardcoded fallback |

**Decision: SKIP — no action**  
Hardcoding Izzy's email in our system would be incorrect. Our approach (fail gracefully if no admin emails configured) is correct.

---

## Section J — Notifications

### J1 — New ticket manager notification

| | Izzy | Ours |
|--|------|------|
| Function | `sendNewTicketManagerNotification()` — full HTML email with ticket details | Present in `TicketLifecycle.gs` |

**Decision: DONE**

---

### J2 — Temp fix due date reminders

| | Izzy | Ours |
|--|------|------|
| Triggers | Daily at 6am; `checkTempFixDueDates()` → `sendTempFixDueReminders()` + `sendTempFixPastDueAlerts()` | Present in `TicketLifecycle.gs`; trigger setup may differ |

**Decision: DONE** (verify trigger is set if email reminders are not firing)

---

### J3 — Parts needed email

| | Izzy | Ours |
|--|------|------|
| Function | `sendPartsNeededEmail_()` — simple email on ticket create when parts checked | Present |

**Decision: DONE**

---

## Section K — Reporting / KPIs

### K1 — Dashboard tab

| | Izzy | Ours |
|--|------|------|
| KPIs | Open tickets, closed this month, avg resolution time, dept breakdown, aging (0-3d, 4-7d, 8-14d, 15+d), trend analysis by month, tech summary | Audited in `Dashboard.js`; our `Dashboard.gs` has equivalent functions |

**Decision: DONE** (functional parity; cosmetic differences acceptable)

---

### K2 — MTTR (Mean Time To Repair)

| | Izzy | Ours |
|--|------|------|
| Calculation | Computed from ML `DATE_OPENED` vs `DATE_COMPLETED` | Present in dashboard logic |

**Decision: DONE** (verify formula if MTTR is reported as zero or missing)

---

### K3 — Inventory tab with KPIs

| | Izzy | Ours |
|--|------|------|
| Presence | No dedicated Inventory tab in Izzy's system | Not present in ours either |

**Decision: DEFER — Phase 3 BIG**  
This is a net-new feature (not a port). Requires workshopping the data model: what does "Inventory" mean in this context (equipment register view? parts stock?), how does it integrate with Equipment Hold Log, what KPIs are needed. No source to transcribe — must define from user requirements.

---

## Section L — External Ticket Sync

### L1 — `syncExternalTickets()`

| | Izzy | Ours |
|--|------|------|
| Logic | `syncExternalTickets()` reads external SS, dedupes by ticket #, normalizes dept via `getDeptGroup_()`, routes to correct tracker | Present — equivalent logic in our `TicketSync.gs` or `Config.gs` |

**Decision: DONE** (Ticket migration from Izzy's live system is explicitly out of scope)

---

## Section M — System Settings Panel

### M1 — Tech Directory tab

| | Izzy | Ours |
|--|------|------|
| Sheet | `👷 Tech Directory` — Name, Email, Dept, Manager Name, Active | Present |
| Admin UI | Settings Panel has Tech Directory table | Present |

**Decision: DONE**

---

### M2 — Dept Mapping UI in Settings

| | Izzy | Ours |
|--|------|------|
| Admin UI | Settings Panel has Dept Mapping table | Present — `saveDeptMapping()` in our `SystemSettings.gs` |

**Decision: DONE** (Note: user must populate DEPT_MAP sheet with Sage→canonical rows to resolve cascade gap — this is an admin action, not a code gap)

---

### M3 — Routing Override Rules UI

| | Izzy | Ours |
|--|------|------|
| Admin UI | Settings Panel has Routing Rules editor | Present |

**Decision: DONE**

---

### M4 — SQF Documents list in Settings

| | Izzy | Ours |
|--|------|------|
| Field | `sqfDocuments` array in system settings | Present in `SystemSettings.gs` |

**Decision: DONE**

---

## Section N — Monthly Backup

### N1 — `runMonthlyBackup()` — CSV export to Drive

| | Izzy | Ours |
|--|------|------|
| Logic | Exports 7 sheets to Drive as CSV; emails admins; trigger on 28th of month | Not audited — need to verify presence |

**Decision: DEFER** — low priority; verify presence separately. If absent, it is a SMALL addition (≤2 files, no audit writes).

---

## Section O — Temp Fix Inspection

### O1 — `showTempFixInspection()` + `submitTempFixInspection()`

| | Izzy | Ours |
|--|------|------|
| Logic | Full inspection checklist modal; outcome = CLEAR or CONTINUE; inserts INSPECTION row below parent in TF sheet | Present in `TicketLifecycle.gs` |

**Decision: DONE** (verify INSPECTION row insertion logic matches if issues arise)

---

## Summary — Phase 3 Workshop Queue

These gaps are confirmed BIG and need design discussion before build:

| ID | Gap | Why BIG |
|----|-----|---------|
| A1 | Dept dropdown: Sage names + accounting codes | Changes form data schema; ML write impact |
| A4 | Parts table on New Ticket form | New rows to PARTS_NEEDED; touches 2+ files |
| A5 | Photo / image link field | Drive upload + ML column assignment |
| B5 | SQF verification checklist (ML col 36) | Audit-log schema change — highest risk |
| K3 | Inventory tab with KPIs | Net-new feature; no source to transcribe |

---

## Summary — Phase 2 Auto-Build Queue

These gaps are confirmed SMALL and will be built after Phase 1 approval:

| ID | Gap | Files | Notes |
|----|-----|-------|-------|
| C1 | Equipment Hold Log emoji status → professional indicators | `frontend/partials/admin.html` or hold-log partial | CSS only |
| D1 | Remove "Assign Tech" from Tech Work Board | `frontend/partials/tech-work-board.html` | Remove element |

---

## Summary — Phase 3 Port Queue (SMALL, after A1 workshop)

| ID | Gap | Files |
|----|-----|-------|
| A2 | Equipment cascade cross-group key aggregation | `frontend/partials/submit-ticket.html` |
| A3 | Client-side `getDeptGroupClient_()` fallback | Same file as A2 |
| A6 | Routing banner on Submit Ticket form | `frontend/partials/submit-ticket.html` |
| A7 | Priority lock for tech role | `frontend/partials/submit-ticket.html` |
