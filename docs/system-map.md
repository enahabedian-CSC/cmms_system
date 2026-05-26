# CMMS System Map — Legacy Audit
**Phase 5 Step 0 | Container Supply Co. — Garden Grove, CA**
**Produced:** 2026-05-26 | **Branch:** claude/brave-lamport-nfGfP

---

## 1. File Inventory

| File | Purpose |
|---|---|
| `Code.js` | Core backbone: color/layout constants, sheet name registry (`SH`), column maps (`ML`, `TK`, `TH`, `TF`, `PN`, `EHL`, `TL`), menu, form launchers, config helpers, data list helpers, equipment inventory, ID generators, history logger, ticket transfer, equipment tag functions, external sync (`syncExternalTickets`), monthly backup, temp fix monitoring, new ticket email, closed ticket edit. **1,592 lines — largest file.** |
| `CodeCoreUpdates.js` | v3.1 update layer: `getTrackerForDept`, ticket number generator (`generateTicketNumber`), `addNewTicket`, `updateTicket`, `writeTicketToTrackerSheet_`, `voidTicket`, `onEdit`, priority/closed row styling. **Also redefines** `DEPT_CODES`, `getAddTicketFormData`, `greyOutClosedTickets_` (conflicts — see §10). |
| `Accesscontrol.js` | Auth: `getManagerConfig`, `getTeamEmailsForManager`, `getCurrentUserInfo`, `enforceTabVisibility`. **ADMIN_EMAILS hard-coded** (4 emails). |
| `Setup.js` | Sheet builders for all 20+ tabs, trigger setup, column/row helpers. Calls `TF_HEADERS`, `PN_HEADERS`, `EHL_HEADERS`, `RDB_HEADERS`, `TL_HEADERS` — **none of these are defined anywhere** (ReferenceError if `initialSetup` runs). |
| `Dashboard.js` | `buildDashboardSheet_` (layout-only), `buildDeptDrillDownSheet_`, `refreshDashboardData_` (populates KPIs, trend analysis), `buildTrendAnalysisTables_`. |
| `EquipCache.js` | `setupEquipInventoryCache` (places IMPORTRANGE formula at A4 of cache tab), `refreshEquipCache`, `getEquipCacheStatus`. |
| `EquipmentCodeLookup.js` | `lookupEquipmentCode_` (dept+type+desc → code), `backfillExternalEquipCodes` (one-time backfill). |
| `ManagerReviewBoardServer.js` | Server functions for Manager Review Board dialog: `openManagerReviewBoard`, `getManagerReviewBoardData`, `getTicketsForBoard_`, `managerApproveTicket`, `managerVerifyTicket`, `managerReassignTicket`, `managerUpdatePartStatus`, `managerVerifyReport`, `getTechWorkBoardData`, `getTicketHistory`, `moveTicketFromWaitingToOpen_`. |
| `ServiceReportBackened.js` | Service Report and Equipment Hold Tag form functions, `submitServiceReport`, `generateReportNo_`, `getWaitingTicketsList_`, `getOpenTicketsList_`, `updateMasterLogField_`, `assignTicketToTech`, `logEquipHoldTag` (wrapper). |
| `SystemSettings.js` | Settings panel server: `openSystemSettings`, `getSystemSettingsData`, `saveSystemSettings`, `saveManagerAccess`, `saveDataList`, `saveDeptMapping`, `parseRoutingRules_`. |
| `BackfillOneTime.js` | **One-time script** — backfills missing equipment data from Master Log into tracker sheets. Comment says "RUN ONCE then delete." Dead in production. |
| `backfillTrackerGroup.js` | **One-time script** — backfills `Tracker Group` (ML col 34) on all Master Log rows. Dead in production. |
| `AddTicket.html` | New ticket submission form (3-step: equipment cascade → ticket details → confirm). ~31 KB. |
| `UpdateTicket.html` | Update/close/void/verify ticket form with manager actions sidebar. ~57 KB. |
| `ManagerReviewBoard.html` | Full manager review board dialog (waiting queue, open tickets, parts, hold tags, reports, closed edits). ~69 KB. |
| `EquipmentHoldTag.html` | Equipment hold tag form (Red/Yellow tag + clear existing tags). ~45 KB. |
| `ServiceReport.html` | Service report form (FRM-040-002). ~25 KB. |
| `SettingsPanel.html` | Admin settings panel (company config, manager access, data lists, dept map, routing rules). ~74 KB. |
| `TechWorkBoard.html` | Tech-facing ticket list (read-only + self-assign). ~21 KB. |
| `TempFixInspection.html` | Temp fix inspection checklist (continue monitoring or clear). ~22 KB. |
| `MonthRollover.html` | Month rollover confirmation dialog. ~7 KB. |

---

## 2. Runtime Entry Points

### 2a. Menu — `onOpen()` (`Code.js:168`)
Registers the `⚡ Maintenance` spreadsheet menu; calls `enforceTabVisibility()` (no-op stub).

| Menu Item | Handler |
|---|---|
| Open Dashboard | `goToDashboard` |
| Add New Ticket | `showAddTicket` → `AddTicket.html` modal |
| Update Ticket | `showUpdateTicket` → `UpdateTicket.html` modal |
| Service Report | `showServiceReport` → `ServiceReport.html` modal |
| Print Equipment Hold Tag | `showEquipHoldTag` → `EquipmentHoldTag.html` modal |
| Close Month & Start New | `showMonthRollover` → `MonthRollover.html` modal |
| Temp Fix Inspection | `showTempFixInspection` → `TempFixInspection.html` modal |
| Refresh Dashboard | `buildDashboard` |
| Manager Review Board | `openManagerReviewBoard` → `ManagerReviewBoard.html` modal |
| System Settings | `openSystemSettings` → `SettingsPanel.html` modal |

### 2b. Time-Driven Triggers (`Code.js:1448`, `Setup.js:561`)

| Trigger Function | Registered Cadence | What It Does |
|---|---|---|
| `runHourlySync` | **CONFLICT**: Setup.js sets every 1 hour; Code.js sets every 5 minutes. Last-installed wins. | Calls `syncExternalTickets()` + `syncEquipHoldLog_()` (stub — does nothing) |
| `checkTempFixDueDates` | Daily at 6 AM | Marks PAST DUE rows; calls `sendTempFixDueReminders` and `sendTempFixPastDueAlerts` |
| `runMonthlyBackup` | 28th of each month at 1 AM (must be set manually via `setupBackupTrigger_`) | CSV backup of 7 key sheets + external tickets sheet to Drive; confirmation email to ADMIN_EMAILS |

### 2c. `onEdit(e)` (`CodeCoreUpdates.js:402`)
Fires on any cell edit. Relevant paths:
- **Dept Drill-Down D4 changed** → `buildTrendAnalysisTables_`
- **Tracker sheet, non-header row, tracked field** (STATUS, PRIORITY, ASSIGNED_TO, PARTS_STATUS, VERIFIED_BY, NOTES): writes to Master Log with action `DIRECT EDIT — {FIELD}`, logs to Ticket History. If STATUS → CLOSED, moves to Closed sheet. If VERIFIED_BY set while status=COMPLETE → auto-close.

### 2d. No `doGet`, `doPost`, or `onFormSubmit` defined
The legacy system is a **Sheets-bound app** (modal dialogs), not a standalone web app. There is no `doGet`/`doPost` entry point. The Phase 5 new build will add `doGet()` as the web app entry point.

---

## 3. Entity Model

### 3a. Ticket (canonical fields across all sheets)

**Master Log** — `SH.MASTER_LOG` (35 columns, ML object)
| Col | Field | Notes |
|---|---|---|
| 1 | Row ID | UUID fragment (8 chars) — unique per ML row, not per ticket |
| 2 | Ticket # | `MT-{deptCode}-{YYMMDD}-{seq}` |
| 3 | Timestamp | `MM/dd/yyyy HH:mm:ss` |
| 4 | Action | Event vocabulary (see §5) |
| 5 | Status | WAITING / OPEN / PENDING PARTS / ON HOLD / COMPLETE / CLOSED / VOID |
| 6 | Department | Normalized internal dept name |
| 7 | Building / Zone | Free text |
| 8 | Equipment Type | From equipment hierarchy |
| 9 | Equipment Code | From equipment inventory |
| 10 | Equipment Description | Specific equipment name |
| 11 | Downtime Type | PLANNED / UNPLANNED |
| 12 | Priority | LOW / MEDIUM / HIGH / CRITICAL |
| 13 | Description | Problem description |
| 14 | Assigned To | Tech name |
| 15 | Est Hours | Numeric |
| 16 | Actual Hours | Numeric |
| 17 | Date Opened | `MM/dd/yyyy` |
| 18 | Date Completed | `MM/dd/yyyy` |
| 19 | Date Closed | `MM/dd/yyyy` |
| 20 | Corrective Action | Free text |
| 21 | Root Cause | Free text |
| 22 | Work Summary | Free text |
| 23 | Fix Type | Temporary / Permanent |
| 24 | Temp Fix Flag | Y / N |
| 25 | Parts Needed Flag | Y / N |
| 26 | Parts Status | REQUESTED / ORDERED / RECEIVED / etc. |
| 27 | Equip Tag Status | Tag color string or blank |
| 28 | Verified By | Manager name/email |
| 29 | Verified Date | `MM/dd/yyyy` |
| 30 | Added By | Person who created ticket |
| 31 | Updated By | Last person to modify |
| 32 | Notes | Combined `Observations: {obs} | Notes: {notes}` pattern |
| 33 | Problem Type | Categorical |
| 34 | Tracker Group | Normalized dept (derived from dept map) |
| 35 | Line # | Production line number |

**Tracker sheets / Waiting Queue / Open Tickets / Closed Tickets** — `TK` object (26 cols, col B onward — col A is a 24px grey margin)
Subset of ML fields: Ticket # → Line # (same fields, no Row ID, no audit fields). `DATE_OPENED` and `LAST_UPDATED` are timestamps.

**Ticket History** — `TH` object (8 cols)
`History ID | Ticket # | Timestamp | Event Type | Status From | Status To | Performed By | Notes`

### 3b. Supporting Entities

**Temp Fix Monitor** — `TF` (17 cols): TempID, Ticket#, Equip Code, Specific Equip, Dept, Building/Zone, Date Flagged, Description, Temp Fix Desc, Freq Days, Last Inspected, Next Due, Status (ACTIVE/PAST DUE/CLEARED), Flagged By, Cleared By, Cleared Date, Notes.

**Parts Needed** — `PN` (12 cols): Part ID, Part Desc, Ticket#, Equip Code, Specific Equip, Dept, Date Requested, Parts Status, Date Ordered, Date Received, Ordered By, Notes.

**Equipment Hold Log** — `EHL` (14 cols): Tag ID, Ticket#, Equip Code, Specific Equip, Dept, Building/Zone, Tag Type, Date Tagged, Tagged By, Reason, Equip Status (TAGGED/CLEARED/ACTIVE), Cleared By, Cleared Date, Notes.

**Transfer Log** — `TL` (8 cols): Transfer ID, Ticket#, Timestamp, From Dept, To Dept, Transferred By, Reason, Email Sent (Y/N).

**Report Database** — `RDB` (27 cols): Report ID, Ticket#, Date, Dept, Building/Zone, Equip Type, Equip Code, Specific Equip, Problem Desc, Root Cause, Corrective Act, Preventive Act, Work Summary, Fix Type, Temp Fix Flag, Parts Used, Labor Hours, Added By, Completed By, Verified By, Verified Date, Updated By, Priority, Downtime Type, Image Links, PDF Link, Notes.

### 3c. Sheet Drift vs. Code Expectation

| Observation | Impact |
|---|---|
| `⚙️ Equip Inventory Cache` uses IMPORTRANGE formula at A4 — auth does not transfer on copy | Equipment cascade will be empty until re-authorized; `getEquipmentFromCache_` will fall through to `⚙️ Equipment Inventory` local tab (which is intentionally empty per Setup.js comment) |
| `📋 Dept Map` missing `ELECTRICAL` and `FACILITIES` identity rows | `getDeptGroup_` returns normalized dept correctly for external codes but ELECTRICAL and FACILITIES tickets submitted with their canonical names pass through untouched (no entry to look up against). Works but creates a data gap in the map tab. |
| `👔 Manager Access` row for Arnel Nagel has typo `Faciltiies` (col E) | `getManagersForDept_('FACILITIES')` will not return Arnel's email — he won't receive FACILITIES notifications. **Must normalize in code read layer.** |
| `📊System Dashboard` (no space) tab potentially exists alongside `📊 System Dashboard` | Code only references the spaced version (`SH.DASH`). The no-space tab is invisible to the code — orphaned. Confirmed by the prompt. |

---

## 4. Ticket State Machine

### 4a. States
`WAITING` → `OPEN` → `COMPLETE` → `CLOSED`
`WAITING` → `CLOSED` (manager can close directly from review)
`OPEN` → `ON HOLD` / `PENDING PARTS` (status updates, no dedicated function)
`OPEN` → `VOID` (via `voidTicket`)
Any active → `VOID` (manager/admin only)

### 4b. Transitions

| Transition | Function | Authorized | Notes |
|---|---|---|---|
| → WAITING (new internal) | `addNewTicket` | Any authenticated user | Via AddTicket form |
| → OPEN (critical bypass) | `addNewTicket` | Any authenticated user | CRITICAL priority skips waiting queue; goes directly to Open Tickets + dept tracker |
| → WAITING (external import) | `syncExternalTickets` | System (time trigger) | Polls external sheet `1F4-...`; idempotent by ticket# |
| WAITING → OPEN | `managerApproveTicket`, `reviewTicket`, `updateTicket` | Manager/Admin | Manager sets priority + assigns tech |
| WAITING → CLOSED | `reviewTicket` | Manager/Admin | LOW/MEDIUM only, with corrective action + verified by |
| OPEN → COMPLETE | `updateTicket` | Any (via Update Ticket form) | Logs `COMPLETED` event |
| COMPLETE → CLOSED | `managerVerifyTicket`, `onEdit` (VERIFIED_BY set) | Manager/Admin | Verified By + manager sign-off |
| Any active → VOID | `voidTicket` | Manager/Admin only | Requires void reason; moves to Closed sheet with VOID status |
| Any active → CLOSED (direct edit) | `onEdit` (STATUS column) | Manager direct-editing tracker sheet | Logs `DIRECT EDIT — STATUS` to Master Log |
| Tracker re-route | `updateTicket` (dept/problemType change) | Any | `UPDATED + REROUTED` action; logs `REROUTED` to Ticket History; sends transfer notification |

### 4c. Priority Bypass Rule
**CRITICAL priority → initial status = OPEN** (bypasses Waiting Queue entirely). Written to `📂 Open Tickets` and dept tracker Priority Watch List section. Manager notification email is NOT sent for CRITICAL tickets (code at `CodeCoreUpdates.js:154-188` explicitly skips `sendNewTicketManagerNotification` when `isCritical`).

---

## 5. Audit Log Event Vocabularies

### 5a. Master Log — ACTION field
| Action Value | Source Function | Notes |
|---|---|---|
| `TICKET CREATED` | `addNewTicket` | Normal priority |
| `TICKET CREATED — CRITICAL (bypass)` | `addNewTicket` | CRITICAL only |
| `EXTERNAL IMPORT` | `syncExternalTickets` | External sync |
| `UPDATED` | `updateTicket` | Status update without re-route |
| `UPDATED + REROUTED` | `updateTicket` | Dept/problem type change |
| `REROUTED` | (logged to TH, not ML action field) | — |
| `MANAGER REVIEW` | `reviewTicket` | From MonthRollover-adjacent review flow |
| `MANAGER ACTION — {STATUS}` | `managerApproveTicket` | e.g. `MANAGER ACTION — OPEN` |
| `MANAGER VERIFIED — CLOSED` | `managerVerifyTicket` | — |
| `REASSIGNED` | `managerReassignTicket` | — |
| `DIRECT EDIT — {FIELD}` | `onEdit` | Direct tracker sheet edit |
| `VOIDED` | `voidTicket` | — |
| `CLOSED TICKET EDIT` | `editClosedTicket` | Post-closure amendment |

### 5b. Ticket History — EVENT_TYPE field (`TH_EVENTS`)
| Event | Constant | Source |
|---|---|---|
| `CREATED` | `TH_EVENTS.CREATED` | `addNewTicket`, `syncExternalTickets` |
| `UPDATED` | `TH_EVENTS.UPDATED` | `updateTicket`, `editClosedTicket` |
| `ASSIGNED` | `TH_EVENTS.ASSIGNED` | `onEdit` (ASSIGNED_TO), `managerReassignTicket` |
| `COMPLETED` | `TH_EVENTS.COMPLETED` | `updateTicket` (status→COMPLETE) |
| `VERIFIED` | `TH_EVENTS.VERIFIED` | Not explicitly used in current code — defined but orphaned |
| `CLOSED` | `TH_EVENTS.CLOSED` | Multiple paths |
| `EQUIPMENT TAGGED` | `TH_EVENTS.TAGGED` | `logEquipHoldTag_` |
| `PARTS REQUESTED` | `TH_EVENTS.PARTS_REQUESTED` | `logPartsNeeded_`, `addPartToClosedTicket` |
| `PARTS UPDATED` | `TH_EVENTS.PARTS_UPDATED` | Defined but **never called** — dead |
| `TEMP FIX FLAGGED` | `TH_EVENTS.TEMP_FIX` | `logTempFix_` |
| `MOVED TO WAITING` | `TH_EVENTS.MOVED_TO_WAITING` | Defined but **never called** — dead |
| `MOVED TO OPEN` | `TH_EVENTS.MOVED_TO_OPEN` | `reviewTicket` (non-closed path) |
| `TRANSFERRED` | Hard-coded string | `logTicketTransfer_` |
| `REROUTED` | Hard-coded string | `updateTicket` (tracker-changed path) |
| `DIRECT EDIT` | Hard-coded string | `onEdit` |
| `VOIDED` | Hard-coded string | `voidTicket` |
| `Service Report` | Hard-coded string | `submitServiceReport` |
| `TAG CLEARED` | Hard-coded string | `clearEquipmentTag` |
| `TEMP FIX CLEARED` | Hard-coded string | `submitTempFixInspection` (CLEAR outcome) |
| `TEMP FIX INSPECTED` | Hard-coded string | `submitTempFixInspection` (CONTINUE outcome) |

**⚠️ Vocabulary divergence:** ML `ACTION` field and TH `EVENT_TYPE` field use overlapping but distinct string sets. Many TH events have no ML counterpart (e.g., `EQUIPMENT TAGGED` appears in TH but ML only gets it if `logEquipHoldTag_` also appends a row, which it does NOT — the hold tag is logged to TH but the ML entry for the same ticket does NOT include a `TAGGED` action row). The new system must reconcile this.

---

## 6. Email Automation

All emails sent via `MailApp.sendEmail(...)`. No GmailApp usage.

| Email | Subject Pattern | Recipients | Trigger | Source | Template Quality |
|---|---|---|---|---|---|
| New ticket (waiting queue) | `📋 Manager Action Required | New Ticket {ticketNo} | {dept}` | Dept managers (from Manager Access col E); fallback all managers; fallback ADMIN_EMAILS | `addNewTicket` (non-CRITICAL only), `syncExternalTickets` | Full HTML template — polished |
| Ticket transfer | `🔄 Ticket Transfer | {ticketNo} | {fromDept} → {toDept}` | Both sending and receiving dept managers; fallback `Manager Email(s)` config | `logTicketTransfer_` (called from `updateTicket`, `managerApproveTicket`) | Full HTML template — polished |
| Temp fix due tomorrow | `⚠️ Temp Fix Inspection Due Tomorrow | {ticketNo} | {equip}` | Dept managers; fallback ADMIN_EMAILS | `sendTempFixDueReminders` (daily trigger) | Full HTML template — polished |
| Temp fix past due | `🔴 Temp Fix PAST DUE — Inspection Required | {ticketNo} | {equip}` | Dept managers; fallback ADMIN_EMAILS | `sendTempFixPastDueAlerts` (daily trigger) | Full HTML template — polished |
| Parts needed | `Parts Needed | {ticketNo} | {equipCode} — {specificEquip}` | `Manager Email(s)` config field only | `sendPartsNeededEmail_` (called from `addNewTicket` when partsNeeded=true) | **⚠️ STUB — `<p>Parts needed for ticket {ticketNo}</p>` only** — no template |
| Monthly backup | `📦 Monthly Backup Complete — {stamp}` | ADMIN_EMAILS (hard-coded) | `runMonthlyBackup` (28th of month) | — | Basic HTML |

**Email not sent for:**
- CRITICAL ticket creation (bypass logic explicitly skips `sendNewTicketManagerNotification`)
- Manager verify/close
- Equipment tag issued (no email on tag creation)
- Equipment tag cleared

---

## 7. External Integrations

### 7a. External Ticket Source (poll — inbound)
- **Sheet ID:** `1F4-nPI4pkZZ933RKb2g6WBVR3JDZNgBRz8hQKGr0_4w`
- **Tab:** `Service Tickets`
- **Function:** `syncExternalTickets()` (`Code.js:872`)
- **Cadence:** Time trigger on `runHourlySync` — **conflict: Setup.js=every 1 hour, Code.js=every 5 minutes**
- **Idempotency:** Builds `existingNos` map from Master Log ticket numbers at runtime; skips rows whose ticket# is already present. **⚠️ If Master Log is large, this is an O(n) scan per sync.**
- **Column mapping (source sheet cols 1–10):** `ticketNo | timestamp | mechanic | deptRaw | lineNo | equipType | equipDesc | issueDesc | hoursHint | photoLinks`
- **Dept normalization:** `getDeptGroup_(deptRaw)` — uses `📋 Dept Map` + routing override rules
- **Writes to:** Master Log (action=`EXTERNAL IMPORT`, status=`WAITING`), `⏳ Waiting Queue`, dept tracker sheet
- **Post-import:** calls `sendNewTicketManagerNotification` and logs to Ticket History with `CREATED` event

### 7b. Equipment Register (read — outbound)
- **Sheet ID:** `1dlqp8jEMxxNYkIhr30tWK1yuC6FFlYTFU8Eq6EXeIps`
- **Tab for inventory:** configured in `Equipment Inventory Tab Name` config key
- **Tab for hold register:** `FRM-029-001 Equipment Hold Register` (config key: `Equipment Hold Register Tab Name`)
- **Read method:** Currently IMPORTRANGE formula at `⚙️ Equip Inventory Cache` row A4 (placed by `setupEquipInventoryCache`). **IMPORTRANGE auth does not transfer on copy — will return #REF! until manually re-authorized.**
- **⚠️ WRITE VIOLATION:** `writeToExternalHoldRegister_()` (`Code.js:664`) and `updateExternalHoldRegisterClear_()` (`Code.js:665`) both **write** to the `FRM-029-001 Equipment Hold Register` tab on this sheet. This violates Invariant #10 (Equipment Register is read-only). Must be removed from new code. The writes replicate hold tag data to the external register; this functionality must be re-evaluated with the owner.

---

## 8. Configuration Constants

All config read from `⚙️ Configuration` tab cols C (key) and D (value), rows 2–30.

| Key | Default (from Setup.js) | Used By |
|---|---|---|
| Company Name | Container Supply Co. | All email headers, form titles |
| Location | Garden Grove, CA | All email headers, form titles |
| Doc No (Ticket Form) | FRM-040-001 | AddTicket, UpdateTicket forms |
| Doc No (Service Report) | FRM-040-002 | ServiceReport form |
| Doc No (Hold Tag) | FRM-029-002 | EquipmentHoldTag form |
| Revision | 0 | All forms |
| Equipment List Source URL | `1dlqp8j...` URL | `syncEquipmentInventory`, `setupEquipInventoryCache` |
| Equipment Inventory Tab Name | (blank — prompted at setup) | `setupEquipInventoryCache` |
| Equipment Hold Register URL | `1dlqp8j...` URL | `writeToExternalHoldRegister_`, `updateExternalHoldRegisterClear_` |
| Equipment Hold Register Tab Name | FRM-029-001 Equipment Hold Register | same |
| PM System URL | (blank) | Nav panel (external link) |
| Manager Email(s) | (blank) | Parts needed email fallback, transfer fallback |
| External Ticket Source URL | `1F4-...` URL | `syncExternalTickets` |
| External Ticket Tab Name | Service Tickets | `syncExternalTickets` |
| External Sync Enabled | Y | Guards `syncExternalTickets` |
| Monitoring Frequency | 7 | `logTempFix_` (days between temp fix inspections) |
| Current Month | (dynamic) | Month rollover, nav panel, tracker headers |
| Month Status | OPEN | Month rollover |
| Last Rollover Date | (blank) | Month rollover |
| System Version | 3.0 | Informational |
| Routing Override Rules | (blank — JSON) | `getTrackerForDept` keyword routing |

**Hard-coded values (NOT in Configuration — must be migrated or noted):**
| Value | Location | Risk |
|---|---|---|
| `ADMIN_EMAILS` array (4 emails) | `Accesscontrol.js:8-13` | Must change code to add/remove admins |
| External ticket sheet ID `1F4-...` | `Code.js:1076` (monthly backup) | Backup always pulls from this ID regardless of config |
| Equipment Register sheet ID `1dlqp8j...` | Not hard-coded in .gs; extracted at runtime from config URL via regex — safe |
| Live standalone script ID `1wLnVe...` | `config/.clasp.json` | **Must update to new bound script before first push** |

---

## 9. Dead Code

| Item | Location | Reason |
|---|---|---|
| `enforceTabVisibility()` | `Accesscontrol.js:105-107` | Empty function — does nothing |
| `syncEquipHoldLog_()` | `Code.js:1451` | Empty function — called by `runHourlySync` but does nothing |
| `showNavPanel()` | `Code.js:194` | Not reachable from any menu item in current `onOpen` |
| `showReviewTicket()` | `Code.js:216` | No menu item; `ReviewTicket.html` not present in file set |
| `TH_EVENTS.VERIFIED` | `Code.js:155` | Defined but never used in any function call |
| `TH_EVENTS.PARTS_UPDATED` | `Code.js:155` | Defined but never called |
| `TH_EVENTS.MOVED_TO_WAITING` | `Code.js:155` | Defined but never called |
| `BackfillOneTime.js` (entire file) | — | Comment: "RUN ONCE then delete." Already run in production. |
| `backfillTrackerGroup.js` (entire file) | — | Same — one-time backfill, already run. |
| `testGetTickets()` / `testUpdateFormData()` | `Code.js:1455-1467` | Test functions exposed to script runtime |
| `getReviewTicketFormData()` in `ServiceReportBackened.js:45` | — | Calls `cfg.companyName` (wrong — `getConfig()` returns a plain object with string keys like `cfg['Company Name']`, not dot notation). Would throw if called. |
| `getEquipHoldTagData()` in `ServiceReportBackened.js:61` | — | Same dot-notation bug on `cfg` object. Would throw if called. |
| `getMonthRolloverData()` in `ServiceReportBackened.js:78` | — | Same dot-notation bug (`cfg.companyName`, `cfg.currentMonth`). |

---

## 10. Tribal Knowledge (undocumented rules in code)

| Rule | Where Encoded |
|---|---|
| CRITICAL priority bypasses the Waiting Queue and goes directly to Open | `CodeCoreUpdates.js:154` — `isCritical` branch |
| Department routing uses a two-pass system: (1) dept map lookup, then (2) keyword rules on problemType/equipType. Keyword rules can override the dept mapping. | `CodeCoreUpdates.js:17-56` |
| External tickets always land as UNPLANNED downtime with no priority set — manager must set priority during review | `syncExternalTickets` default values |
| Tracker sheet has two visually separated sections: rows 8-27 (Priority Watch List — CRITICAL/HIGH) and rows 30+ (All Open Tickets). Ticket placement depends on priority at submission time, not updated priority. Priority escalation does reposition via `removeTicketFromSheet_` + `writeTicketToTrackerSheet_`. | `CodeCoreUpdates.js:239-260` |
| Month rollover closes COMPLETE and CLOSED tickets from tracker sheets, carries forward all other statuses. Does NOT touch Master Log or Ticket History. | `Code.js:476-482` |
| Service reports write to the `📝 Report Database` but do NOT write a new row to Master Log — they only update `WORK_SUMMARY` and `ACTUAL_HOURS` fields on the latest ML row for that ticket. | `ServiceReportBackened.js:189-193` |
| Green tags can only be issued by managers — enforced in `EquipmentHoldTag.html` UI, not in server code. The form checks `isManager` flag but the server function `clearEquipmentTag` does not re-validate role. | `Code.js:662-663` |
| `getTicketsForBoard_` uses the **last** ML row for status but the **first** ML row for description (first non-empty). This is intentional: status evolves, but the original description is preserved. | `ManagerReviewBoardServer.js:113-148` |
| Notes field on Master Log uses `Observations: {obs} | Notes: {notes}` concatenation pattern. Parsed on read by regex in `getTicketsForForm_`. | `CodeCoreUpdates.js:306-312` |

---

## 11. Known Issues — Verification Against Code

| Issue | Finding |
|---|---|
| **H-ID timestamp bug** (`H-MMDDYYYY` instead of `H-YYYYMMDDHHMMSS`) | `generateHistId()` at `Code.js:293` currently generates `H-yyyyMMddHHmmss` — CORRECT format. However, historical data in the live sheet may contain old-format IDs from before this was fixed. New system must use the correct format exclusively. |
| **"Buidling" typo** in Building/Zone strings | Not found in `.gs` code. Typo may exist in actual sheet data (submitted values from old forms). Normalization layer should strip/correct on read from Master Log. |
| **Duplicate `📊System Dashboard` tab (no space)** | `SH.DASH` in `Code.js:51` correctly uses space: `'📊 System Dashboard'`. The no-space variant is not referenced in code — it's a stale sheet tab in the live spreadsheet. New build should not create it. |
| **Divergent event vocabularies** | Confirmed — see §5b. ML ACTION and TH EVENT_TYPE are distinct, overlapping vocabularies. Canonical set is documented in §5a/§5b. New build must maintain both vocabularies consistently. |
| **`TF_HEADERS`, `PN_HEADERS`, `EHL_HEADERS`, `RDB_HEADERS`, `TL_HEADERS` undefined** | **Critical bug in `Setup.js`.** `buildTempFixSheet_`, `buildPartsNeededSheet_`, `buildEquipHoldLogSheet_`, `buildReportDatabaseSheet_`, `buildTransferLogSheet_` all reference these undefined arrays — `initialSetup()` will throw a `ReferenceError`. These constants are likely in the live script but missing from the cloned set. New build must define them explicitly. |
| **Duplicate `DEPT_CODES`, `getAddTicketFormData`, `greyOutClosedTickets_`** | Defined in both `Code.js` and `CodeCoreUpdates.js`. In Apps Script, last-loaded file wins. Behavior is correct but fragile — remove duplicates in new code. |
| **Trigger frequency conflict** | `setupTriggers_` defined in BOTH `Setup.js` (hourly) and `Code.js` (every 5 minutes). Last-installed trigger wins. Both purge all existing triggers before setting new ones — so the last `setupTriggers_` called determines the actual cadence. In new code: standardize at one canonical location. |
| **ADMIN_EMAILS hard-coded** | `Accesscontrol.js:8-13`. New code must read admin list from Manager Access tab or Configuration. |
| **`managerReassignTicket` row offset bug** | Searches from row 5 (`sh.getRange(5, TK.TICKET_NO, sh.getLastRow() - 4, 1)`). Tracker data starts at row 8 (TRACKER_PRIO_START) and queue data starts at row 7 (QUEUE_FROZEN+1=7). Rows 5-6 are column headers — this would read header rows as data. Low risk (ticket numbers won't match) but wasteful and confusing. |
| **`writeToExternalHoldRegister_` write violation** | Writes hold tag data to `1dlqp8j...` (Equipment Register). Violates Invariant #10. Must be removed from new code. Owner must decide if the external hold register sync should be replaced with a different mechanism. |
| **`sendPartsNeededEmail_` stub** | Sends a one-line HTML stub, not a polished template. Functional issue — managers won't get useful information. New build must implement a full template. |
| **Doc number inconsistency** | Config key `Doc No (Ticket Form)` defaults to `FRM-040-001` in code. Section 5d of the Phase 5 prompt mentions `FRM-030-00X` as an unfinished placeholder in the copy sheet. The code default is `FRM-040-001`. Verify against the actual copy sheet `⚙️ Configuration` tab. |
| **`getReviewTicketFormData`, `getEquipHoldTagData`, `getMonthRolloverData` in `ServiceReportBackened.js`** | All use `cfg.companyName` dot notation on a plain-object config — would throw `TypeError: Cannot read property 'companyName' of undefined` since `getConfig()` returns `cfg['Company Name']`. These functions appear to be legacy stubs never called from HTML. |

---

## 12. Sheet Tab Inventory (from code references)

| Tab Name | Purpose | Notes |
|---|---|---|
| `📊 System Dashboard` | KPI cards + trend analysis | Uses Sheet formulas + `refreshDashboardData_` |
| `🔍 Dept Drill-Down` | Per-dept analytics with department slicer | onEdit D4 triggers trend rebuild |
| `⏳ Waiting Queue` | Tickets pending manager review | QUEUE_FROZEN=6 |
| `📂 Open Tickets` | Approved active tickets | QUEUE_FROZEN=6 |
| `✅ Closed Tickets` | Verified and closed | QUEUE_FROZEN=6 |
| `📋 Tracker — Electrical` | Dept tracker (2-section layout) | TRACKER_FROZEN=5, data@8+ |
| `📋 Tracker — Machine Shop` | Dept tracker | |
| `📋 Tracker — Facilities` | Dept tracker | |
| `📋 Tracker — Plastics` | Dept tracker | |
| `📋 Tracker — Metals` | Dept tracker | |
| `📋 Tracker — Litho` | Dept tracker | |
| `🔧 Temp Fix Monitor` | Active temp fixes | Header@row 5 |
| `📜 Ticket History` | Per-ticket audit trail | Header@row 5 |
| `🔩 Parts Needed` | Parts lifecycle | Header@row 5 |
| `🏷️ Equipment Hold Log` | Hold tags (all colors) | Header@row 5 |
| `📈 Reporting` | Placeholder ("UNDER DEVELOPMENT") | |
| `👷 Tech Work Board` | Tech-facing view | Not a tab — modal dialog |
| `📝 Report Database` | Service report records | 27 cols |
| `🗄️ Master Log` | Full audit log (35 cols, append-only) | SQF primary evidence |
| `⚙️ Equipment Inventory` | Local fallback; primary is IMPORTRANGE cache | |
| `⚙️ Equip Inventory Cache` | IMPORTRANGE from Equipment Register | Hidden; auth required |
| `📋 Data Lists` | Dropdown values (technicians, depts, etc.) | 12 columns |
| `⚙️ Configuration` | Runtime config key→value | Read by `getConfig()` |
| `📋 Transfer Log` | Department transfer audit | Hidden |
| `🗃️ Archive` | SQF archive | Hidden |
| `📋 Workflow` | Navigation placeholder | Static text only |
| `👔 Manager Access` | Manager→dept mapping (CANONICAL) | Read by `getManagerConfig()` |

**Tabs referenced in prompt but NOT in `SH` registry:**
- `📊System Dashboard` (no space) — stale orphan tab
- `👷 Tech Directory` — referenced in prompt §5e but no code reads it by this name; closest is `📋 Data Lists` Technicians column

---

*End of system-map.md*
