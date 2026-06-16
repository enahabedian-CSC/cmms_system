# DATA_FLOW_MAP.md — Keystone #1

**Round:** SQF Workstream & Regression-Restore
**Branch:** `Claude-changes`
**Date:** 2026-06-16
**Method:** Read of `backend/*.gs` and `frontend/` against the deployed app's own configuration model (`Config.gs`). No application code written. Live sheet `1yyqt0…` not opened by me.

> **Scope reminder:** This round's only read/write target is the copy sheet `13LInKnHNCHN__4x2CuXjGgHDEFBec8zJh03YdXtW5DI` ("Michael's Maintenance Tracker"). The app reaches the copy sheet exclusively through `getBoundSS_()` (`Config.gs:377`) — the bound spreadsheet of the script. **No write in the codebase targets any spreadsheet other than the bound copy sheet.** Verified below.

---

## 1. WRITE TARGETS — every write lands on the bound copy sheet

All writes go through `getBoundSS_()` (the bound copy sheet). There is **no `SpreadsheetApp.openById(...)` followed by a write** anywhere in `backend/`. The three `openById` calls in the codebase (Section 4) are **read-only external pulls**.

| Tab (SH constant) | Writer function | File:line | Write method | Audit-log fired |
|---|---|---|---|---|
| `🗄️ Master Log` (SH.MASTER_LOG) | `appendToMasterLog_` | `Utilities.gs:109–158` (append at `:157`) | `appendRow` | — (this *is* the log) |
| `📜 Ticket History` (SH.TICKET_HIST) | `appendToTicketHistory_` | `Utilities.gs:160–173` (append at `:163`) | — (this *is* the log) |
| `⏳ Waiting Queue` / `📂 Open Tickets` / `📋 Tracker — *` | `writeTicketToSheet_` | `TicketSubmission.gs:152–180` (`:179`) | via caller |
| same queues/trackers (in-place edit) | `_updateTicketInSheets_` | `TicketLifecycle.gs:1000–1028` | via caller |
| `✅ Closed Tickets` (SH.CLOSED) | `_moveTicketToClosed_` | `TicketLifecycle.gs:1032–1040` (`:1038`) | via `verifyAndCloseTicket` |
| `🔧 Temp Fix Monitor` (SH.TEMP_FIX) | `_logTempFix_` / `inspectTempFix` / `clearTempFix` | `TicketLifecycle.gs:1079–1102`, `MonitoringViews.gs:93–95,141–143` | via caller |
| `🔩 Parts Needed` (SH.PARTS_NEEDED) | `logPartsNeeded_` | `TicketSubmission.gs:213–230` (`:228`) | via caller |
| `📋 Transfer Log` (SH.TRANSFER_LOG) | `transferTicket` (inline) | `TicketLifecycle.gs:709–721` (`:711`) | yes |
| `🏷️ Equipment Hold Log` (SH.EQUIP_HOLD_LOG) | `issueEquipHoldTag` / `clearEquipTag` | `MonitoringViews.gs:233`, `:305` | yes (`EQUIP_TAGGED` / `EQUIP_CLEARED`) |
| `⚙️ Equip Inventory Cache` (SH.EQUIP_CACHE) | `refreshEquipCache` | `EquipRegistry.gs:19–98` (`:60`) | `EQUIP_CACHE_REFRESH` |
| `⚙️ Configuration` (SH.CONFIG) | `setConfigValue` | `Config.gs:413–424` (`:419`) | — |
| `📁 Backup folder (Drive, CSV)` | `runMonthlyBackup`-style writer | `Backup.gs:26,63` | — (CSV export, **not** the service-report PDF path) |

### Dual-audit invariant — CONFIRMED
Every state-change action calls **both** `appendToMasterLog_` and `appendToTicketHistory_` inside one try/catch. Verified callers (Master Log line / Ticket History line):

`addNewTicket` (`TicketSubmission.gs:77`/`:101`) · `approveTicket` (`TicketLifecycle.gs:24`/`:47`) · `completeTicket` (`:99`/`:131`) · `verifyAndCloseTicket` (`:215`/`:250`) · `voidTicket` (`:313`/`:331`) · `assignTicket` (`:362`/`:374`) · `requestParts` (`:433`/`:456`) · `updateTicket` (`:517`/`:546`) · `flagTempFix` (`:590`/`:606`) · `transferTicket` (`:664`/`:684`) · `confirmJointRequest` (`:781`/`:798`) · `rejectJointRequest` (`:866`/`:883`) · `deptSignOff` (`:959`/`:971`) · `syncExternalTickets` (`ExternalSync.gs:94`/`:118`) · `syncFromIzzySheet_` (`IzzySync.gs:178`/`:219`) · `inspectTempFix` (`MonitoringViews.gs:98`/`:107`).

**One asymmetry to note (not a violation, documented):** `clearTempFix` (`MonitoringViews.gs:146`) writes Master Log but **not** Ticket History. Surfaced here per Operating Principle #3 ("divergences are documented, never invented"). Decision deferred to build phase.

---

## 2. AUDIT-LOG EVENT VOCABULARY (legacy, from `Config.gs`)

- **`TH_EVENTS`** (Ticket History) — `Config.gs:209–237`. Strings include: `CREATED`, `UPDATED`, `ASSIGNED`, `COMPLETED`, `VERIFIED`, `CLOSED`, `VOIDED`, `EQUIPMENT TAGGED`, `TAG CLEARED`, `PARTS REQUESTED`, `PARTS UPDATED`, `TEMP FIX FLAGGED`, `TEMP FIX CLEARED`, `TEMP FIX INSPECTED`, `MOVED TO WAITING`, `MOVED TO OPEN`, `TRANSFERRED`, `REROUTED`, `DIRECT EDIT`, `Service Report`, `PENDING VERIFICATION`, `MAKE JOINT`, `DEPT SIGNED OFF`, `TRANSFER CONFIRMED`, `JOINT REQUEST`, `JOINT REQUEST REJECTED`.
- **`ML_ACTIONS`** (Master Log) — `Config.gs:240–272`. Strings include: `TICKET_CREATED`, `TICKET_CREATED_CRIT`, `EXTERNAL_IMPORT`, `UPDATED`, `MANAGER_VERIFIED`, `REASSIGNED`, `VOIDED`, `SERVICE_REPORT`, `REPORT_VERIFIED`, `EQUIP_TAGGED`, `EQUIP_CLEARED`, `TEMP_FIX_INSPECTED`, `EQUIP_CACHE_REFRESH`, `IZZY_IMPORT`, `MAKE_JOINT`, `DEPT_SIGNOFF`, `TRANSFER_CONFIRMED`, `JOINT_REQUEST`, `JOINT_REQUEST_REJECTED`, plus others.

**Rule for this round:** new SQF/dashboard work reuses these constants. Any genuinely new event must be added to `Config.gs` and flagged in the build spec — never inlined as a string literal.

---

## 3. READ SOURCES

| What it renders | Function | File:line | Source tab/sheet |
|---|---|---|---|
| Waiting / Open / Tracker queues | `getQueueTickets` → `_mergeAndFilter_` | `TicketQueries.gs:14–42, 305–414` | `🗄️ Master Log` (collapsed last-write-wins) |
| Ticket detail + **history timeline** | `getTicketDetail` | `TicketQueries.gs:49–152` | `🗄️ Master Log` (`:58`) + **`📜 Ticket History`** (`:131–145`) |
| **Closed Tickets tab** | `getClosedTickets` | `TicketQueries.gs:239–301` | **`✅ Closed Tickets`** physical sheet (CS_ 29-col), **NOT** Master Log — see `SERVICE_REPORT_REGRESSION.md` / R3 |
| Equipment ticket history | `getEquipTicketHistory` | `TicketQueries.gs:160–212` | `🗄️ Master Log` |
| Dashboard KPI counts | `getDashboardCounts` | `Dashboard.gs:14–91` | `🗄️ Master Log` + `🔧 Temp Fix Monitor` + `🔩 Parts Needed` |
| Dashboard panels | `getDashboardPanels` | `Dashboard.gs:~117+` | `🗄️ Master Log` (attention items, open tickets, hold tags) |
| Temp Fix Monitor | `getTempFixItems` | `MonitoringViews.gs:12–66` | `🔧 Temp Fix Monitor` |
| Equipment Hold Log | `getEquipHoldItems` | `MonitoringViews.gs:171` | `🏷️ Equipment Hold Log` |
| Equipment dropdowns/hierarchy | `getEquipmentFromInventory` | `EquipRegistry.gs:106–134` | `⚙️ Equip Inventory Cache`, fallback `⚙️ Equipment Inventory` |

**Confirmations requested by the prompt:**
- **Ticket History reads from `📜 Ticket History`** — ✅ confirmed (`TicketQueries.gs:131–145`).
- **Master Log render** — surfaced via `getQueueTickets`/`getTicketDetail`/`getDashboardCounts`; columns indexed by the `ML` map in `Config.gs`. It is the source of truth for all live queues.

---

## 4. EXTERNAL READS (hourly poll) — and ONE flag

All external sources are pulled read-only via `runHourlySync()` (`EquipRegistry.gs:535`). None are written to.

| Source | ID | File:line | Notes |
|---|---|---|---|
| Equipment Register | `1dlqp8jEMxxNYkIhr30tWK1yuC6FFlYTFU8Eq6EXeIps` | `Config.gs:14`; fallback `EquipRegistry.gs:310` | read-only cache refresh |
| External Tickets (tech app) | `1F4-nPI4pkZZ933RKb2g6WBVR3JDZNgBRz8hQKGr0_4w` | `Config.gs:15` | read-only import |
| **Izzy's LIVE sheet** | **`1yyqt0HiHejtjP3cVccL9r2YCGsMM6kjKdxt3t9Omxj4`** | **`Config.gs:16`, read by `syncFromIzzySheet_` (`IzzySync.gs:32–265`)** | **⚠️ FLAG — see below** |
| Edward's Parts sheet | from config key `Parts Source URL` | `PartsSync.gs:40–61` | read-only import |

### ⚠️ FLAG A — the deployed app polls Izzy's LIVE sheet
The round charter says Izzy's live sheet `1yyqt0…` is **OFF-LIMITS (no read, no write)** for *this round's development work*. That instruction governs **me**. Separately, the **deployed app itself** reads `1yyqt0…` hourly via `syncFromIzzySheet_` (`IzzySync.gs:40,43`) when `Izzy Sync Enabled = Y`. This is the deployed app's *current configured behavior*, surfaced here for your awareness/decision. I did not open that sheet. **No action taken; raising for your call** on whether Izzy-sync should be on during this round.

### ⚠️ FLAG B — hard-coded IDs in `.gs`
`Config.gs:14–16` and `EquipRegistry.gs:310` hold hard-coded external sheet IDs. Acceptance criteria forbid hard-coded IDs in `.gs`. These are **external read sources, not the write target**, and the copy-sheet rule (writes via `getBoundSS_` only) is satisfied. Recommendation: migrate these three IDs to config tabs in a later cleanup; **not** in scope for the regression/SQF build unless you direct it. Raising, not fixing.

**No hard-coded ID anywhere points at a write target other than the copy sheet.** ✅

---

## 5. CONFIG MODEL (runtime, from copy-sheet tabs)

- `getConfig()` — `Config.gs:392–407`, reads `⚙️ Configuration` C2:D30 (cached).
- `getManagerConfig()` — `Config.gs:533–561`, reads `👔 Manager Access` (the **only** permissions authority).
- `getDeptMapping_()` — `Config.gs:435–465`, `📋 Dept Map`.
- `getTechDirectory()` — `Config.gs:591–630`, `👷 Tech Directory` (fallback `📋 Data Lists`).
- `getAllDataLists()` — `Config.gs:652–677`, `📋 Data Lists` (priorities, problem types, building/zone, downtime types).
- Doc-control values read from `⚙️ Configuration`: `Doc No (Ticket Form)`, `Doc No (Service Report)`, `Revision`, `Company Name` (see `SQF_COVERAGE_MATRIX.md` §Doc-control).

---

## 6. POST-BUILD RE-RUN
Per acceptance criteria, this map will be re-verified after the build to confirm no write lands anywhere but `13LInK…`. Today's baseline: **all writes already scoped to the bound copy sheet.**
