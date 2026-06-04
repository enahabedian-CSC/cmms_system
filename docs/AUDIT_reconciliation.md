# AUDIT_reconciliation.md
## Gap Analysis — Izzy's Reference vs. Our Deployed System
### CSC CMMS — Code-Derived Audit · June 2026

Legend for "Build size":
- **XS** — < 1 day; config or thin wrapper
- **S** — 1–2 days; isolated new function or small UI element
- **M** — 3–5 days; new screen or significant backend module
- **L** — 1–2 weeks; full subsystem
- **XL** — 2+ weeks; multi-file, cross-cutting feature

---

## Section 1 — Backend Capabilities

| Capability | Present in Izzy (file) | Present in Ours? | Gap Description | Recommendation | Build Size |
|---|---|---|---|---|---|
| EMRL data population on ticket close | EMRL.js `populateEMRL_()` | **NO** | When a ticket is moved to Closed, Izzy appends 10 additional columns (cols 28–37) to the Closed Tickets row: Repair Date, Parts Used, Root Cause, Corrective Action, Preventive Action, CA Date, CAPA Required, Clearance Checklist, Had Temp Fix, TF Resolved Date. Our `_moveTicketToClosed_()` does not do this. | Implement `populateEMRL_()` equivalent that fires from `verifyAndCloseTicket()` / `_moveTicketToClosed_()`. Pull data from ML, Parts Needed, Temp Fix. This is required for SQF 13.2.8 compliance. | **L** |
| EMRL search / Maintenance Repair Record (FRM-030-003) | EMRL.js `searchEMRL()`, `openMaintenanceRepairRecord()` | **NO** | No way for managers to search or view the EMRL columns. Izzy had a full modal dialog (MaintenanceRepairRecord.html) with searchable results across ticket, equipment, dept, and date range. | Build `getEMRLData(params)` backend + Reports page section or dedicated modal. Required for SQF audit readiness. | **L** |
| EMRL — Closed Tickets column structure | EMRL.js `rebuildClosedTab_()` | **NO** | Our Closed Tickets sheet has TK cols 1–27 only. EMRL needs cols 28–37 with proper headers and section-banded formatting. | Run a one-time sheet setup function to add cols 28–37 with correct headers before enabling populateEMRL_(). | **S** |
| Archive closed tickets | EMRL.js `executeArchive()` | **NO** | Izzy had a full archive flow: filter by year/dept, preview rows, move to Archive tab. We have an Archive tab (created in setup) but no functions to populate it. | Build `executeArchive()` + simple admin UI option. Low urgency but needed for multi-year operation. | **M** |
| Service Report creation + Report Database | ManagerReviewBoardServer.js `managerVerifyReport()`, `saveServiceReport()` | **NO** | Izzy had a Service Report form (ServiceReport.html, FRM-040-002) that techs/managers fill out; stored in Report Database tab. Manager Review Board showed unverified reports as a dedicated tab. We have a Report Database tab in our sheet but no code reads or writes it. | Design service report data model; implement `saveServiceReport()` + `getServiceReportData()` + verification flow. Required for FRM-040-002 compliance. | **L** |
| Equipment Hold Tag issuance (FRM-029-002) | ServiceReportBackened.js `showEquipHoldTag()`; EquipmentHoldTag.html | **PARTIAL** | We have `getEquipHoldItems()` and `clearEquipTag()` to manage existing tags. We can create tags from `verifyAndCloseTicket()` data path. However there is no standalone "Issue Hold Tag" function or printable FRM-029-002 form that a manager can open for an arbitrary ticket or ad-hoc hold. | Add `issueEquipHoldTag(data)` server function + ticket-detail UI button + printable HTML template. Medium urgency. | **M** |
| Monthly backup to Drive (CSV) | Code.js `runMonthlyBackup()` | **NO** | Izzy exported Master Log, Closed Tickets, Parts Needed, Temp Fix as CSV files to a Drive folder each month. We have no Drive write operations at all. | Implement `runMonthlyBackup()` using `DriveApp.getFolderById()` (prefer config-driven folder ID) + CSV generation per sheet. Low urgency if Sheets native export is acceptable. | **S** |
| Temp Fix PAST DUE recipient scoping bug fix | Izzy's `sendTempFixPastDueAlerts()` sent to ALL admin emails regardless of dept | **FIXED in ours** | Our Email.gs uses `_emailRecipients_(dept)` for both reminders and past-due alerts, correctly scoping to dept managers first. Izzy had a noted bug. | No action needed — ours is better. | — |
| Equipment cache via IMPORTRANGE | EquipCache.js `setupEquipInventoryCache()` | **REPLACED** | Izzy used an IMPORTRANGE formula placed in a cell. Our EquipRegistry.gs uses `SpreadsheetApp.openById()` on a schedule, which is more reliable and removes formula dependency. | No action needed — ours is better. Document the change for ops team. | — |
| Equipment code backfill | EquipCodeLookup.js `backfillExternalEquipCodes()` | **NO** | Izzy had a utility to fix missing equip codes in Waiting Queue and tracker sheets for externally-synced tickets. Our ExternalSync.gs calls `lookupEquipmentCode_()` at import time, but a backfill utility doesn't exist for fixing historical data. | Implement `backfillEquipCodes()` admin utility. Low urgency; run once after historical import. | **XS** |
| Dept transfer email notification | Code.js `sendTransferNotification_()` | **PARTIAL** | Our `transferTicket()` writes the Transfer Log and dual-writes ML + History, but does NOT call any email notification on transfer. Izzy had HTML email to both from-dept and to-dept manager email lists. | Add `sendTransferNotification_()` call inside `transferTicket()`. Recipients from `getManagersForDept_()` for both depts. | **S** |
| Manager Review Board — unified multi-tab view | ManagerReviewBoardServer.js, ManagerReviewBoard.html | **PARTIAL** | Izzy had one modal with tabs: waiting, pending verify, open, parts, equipment tags, service reports, closed. We have the same data via separate pages (waiting queue, open tickets, monitoring pages) but no single unified dashboard view. | The current multi-page navigation is arguably better UX. Gap is primarily the "Service Reports" tab (no service report system yet). Low priority for the board UI itself. | **M** |
| Tech Work Board in spreadsheet UI | ManagerReviewBoardServer.js `showTechWorkBoard()` | **REPLACED** | Izzy's tech board was a modal dialog from the spreadsheet menu. Ours is a full web app page (`tech-work-board` page via `getTechWorkBoardData()`). | No action needed. Web app version is superior. | — |
| Month Rollover — clear dept trackers | Code.js (via ManagerReviewBoardServer rollover logic) | **PRESENT** | Our `monthlyRollover()` in AdminViews.gs correctly removes CLOSED/VOIDED rows from Priority Watch List (rows 8–27 clear-in-place) and All Open Tickets (rows 30+ delete bottom-to-top). | No gap. | — |
| Routing override rules (configurable JSON) | Code.js `getTrackerForDept()` + SystemSettings.js | **PRESENT** | Our Config.gs has `getTrackerForDept()` with identical routing logic and Config-stored JSON override rules. | No gap. | — |
| CRITICAL bypass | Code.js `addNewTicket()` | **PRESENT** | Our `addNewTicket()` implements CRITICAL bypass (skip WAITING → go straight to OPEN). | No gap. | — |
| Dual-write invariant (ML + Ticket History) | Code.js multiple functions | **PRESENT and ENFORCED** | All lifecycle functions in our codebase call both `appendToMasterLog_()` and `appendToTicketHistory_()`. Neither is optional per code comments. | No gap. Actually stronger enforcement than Izzy's code. | — |

---

## Section 2 — Frontend / UI Capabilities

| Capability | Present in Izzy (file) | Present in Ours? | Gap Description | Recommendation | Build Size |
|---|---|---|---|---|---|
| Submit Ticket form (3-step with live preview) | AddTicket.html | **PRESENT** | Our submit-ticket.html has a 3-step form with live preview, priority card grid, cascade selectors, heads-up panel with `getEquipQuickStats()`. Ours is notably more polished than Izzy's. | No gap. | — |
| Ticket list / queue views | (implied via modal board) | **PRESENT** | Our ticket-list.html provides waiting/open/tracker queue pages with search, priority/status filter, tracker KPI bar, Priority Watch List section. | No gap. | — |
| Ticket detail + actions | UpdateTicket.html | **PRESENT and ENHANCED** | Our ticket-detail.html is a slide-over overlay with full lifecycle action buttons (approve, complete, verify+close, void, assign, temp fix, transfer, request parts, update), work summary, verification section, ticket history timeline. More complete than Izzy's UpdateTicket.html. | No gap. | — |
| Temp Fix Monitor page | TempFixInspection.html (modal) | **PRESENT and ENHANCED** | Our monitoring.html provides a full-page temp fix monitor with KPI band, days-to-inspect computed column, inspect/clear actions. Izzy had a simpler modal. | No gap. | — |
| Equipment Hold Log page | (displayed in Review Board) | **PRESENT** | Our monitoring.html has a dedicated Equipment Hold page with KPI band and clear-tag action. | No gap. | — |
| Parts Needed — Kanban board | (list in Review Board) | **PRESENT and ENHANCED** | Our monitoring.html has a Kanban-style board (Pending → Ordered → Received / Cancelled) with advance/cancel actions. Izzy had a simple list. | No gap. | — |
| Reports page | Reporting sheet (in-spreadsheet) | **PRESENT and ENHANCED** | Our reports.html has a full manager-scoped report with dept cards, problem type bar chart, trend SVG chart, ticket table with search, and print/PDF export via `window.print()`. Izzy's reporting was a sheet-based dashboard. | No gap for basic reporting. EMRL/SQF compliance reporting is missing (tied to EMRL gap above). | **L** (for EMRL reports) |
| Admin — Configuration view | SettingsPanel.html | **PARTIAL** | Our admin.html config view is read-only (directs to "Edit in Sheet"). Izzy's SettingsPanel.html had in-panel editing of all config fields, manager access rows, data lists, dept mapping, tech directory, routing rules, SQF documents. | For now, "Edit in Sheet" is acceptable and lower risk. If in-app editing is desired, this is a large form to build. Low priority. | **L** |
| Admin — Equipment Cache diagnostics | SettingsPanel.html (basic) | **PRESENT and ENHANCED** | Our admin-equip page shows column mapping diagnostics, per-dept item counts with match/mismatch status, warnings for missing config keys, and a "Refresh Cache Now" button. More detailed than Izzy's. | No gap. | — |
| Dashboard — sheet-based KPI cards | Dashboard.js, Dashboard sheet | **REPLACED** | Izzy built a formatted Google Sheet dashboard with charts and tables. Our web app home page provides equivalent KPIs + attention items + hold tags + trend chart in browser. | No gap. Ours is better for a web app. No need to maintain a sheet dashboard. | — |
| Dashboard — trend analysis (recurring equip, chronic equip, avg time to close, hotspots) | Dashboard.js `buildTrendAnalysisTables_()` | **PARTIAL** | Our dashboard shows opened/closed trend by month. It does NOT show: recurring equipment hotspots, problem type frequency ranking, building/zone hotspots, average time to close. Our Reports page shows problem type breakdown. The rest are absent. | Add `getEquipHotspots()` and `getAvgTimeToClose()` functions + Reports page sections. Medium priority for SQF trend analysis requirements. | **M** |
| SQF Documents configuration | SystemSettings.js `parseSqfDocuments_()` | **NO** | Izzy stored a JSON list of SQF Documents in Config and displayed it in SettingsPanel. Our system has no equivalent. | If SQF document list needs to be tracked in the system, add config key + admin display. Low urgency unless SQF audit requires it. | **S** |
| Notification Rules configuration | SystemSettings.js `parseNotifRules_()` | **NO** | Izzy had a JSON notification rules config field. Our email logic is hardcoded to dept managers → all managers → admins. | Our current fallback chain is robust. Configurable notification rules are nice-to-have. Low priority. | **M** |
| Month Rollover form | MonthRollover.html | **PARTIAL** | Izzy had a modal showing month stats before rollover. Our ticket-list.html has a "Roll Up Closed" button per tracker sheet that calls `monthlyRollover()` directly with a confirm dialog. No pre-rollover stats summary shown. | Add a pre-rollover stats summary to the confirm dialog. Low priority. | **XS** |
| Service Report form (FRM-040-002) | ServiceReport.html | **NO** | No service report form in our frontend. This is the second half of the EMRL gap. | Build after EMRL backend is complete. | **M** |

---

## Section 3 — Data Structure / Schema Differences

| Item | Izzy's Implementation | Our Implementation | Impact |
|---|---|---|---|
| Master Log column count | 36 cols (includes VERIFICATION_CHECKLIST at col 36) | 35 cols (no VERIFICATION_CHECKLIST) | Minor; verification status captured in VERIFIED_BY/VERIFIED_DATE cols 29–30. Low impact. |
| Admin email config key | `'Admin Emails'` in Config | `'System Admins'` in Config | If migrating a live Izzy spreadsheet to our codebase, the config key must be updated or a migration script run. |
| Admin email fallback | Hardcoded `['izuniga@cscmfg.com']` fallback in Accesscontrol.js | No hardcoded fallback; returns empty if not set | Our version fails silently if 'System Admins' is not configured. Add validation warning to admin diagnostic. |
| Equipment cache mechanism | IMPORTRANGE formula in cell | Scheduled SpreadsheetApp.openById() | Our approach is more reliable, avoids IMPORTRANGE quota issues, and provides detailed diagnostics. |
| Closed Tickets — EMRL columns | Cols 28–37 appended by code | Not present | Blocking gap for SQF compliance. |
| DEPT_CODES in generateTicketNumber | Single legacy code map (METAL='001', etc.) | INTERNAL_DEPT_CODES (canonical names → EL/MS/FAC/PL/MTL/LTH) + LEGACY_DEPT_CODES for backcompat | Our dual-map approach handles both modern and historical ticket numbers. |
| 'FACILTIIES' typo in Dept Map | Not explicitly handled | getDeptMapping_() hardcodes correction | Our code is more robust against this known data quality issue. |
| Tracker sheet structure — Priority Watch List rows | Rows 8–27 | TRACKER_PRIO_START / TRACKER_PRIO_END constants (same rows) | Identical. |
| Tracker sheet structure — Open Tickets start row | Row 30 | TRACKER_OPEN_START constant (same) | Identical. |

---

## Section 4 — Summary Priority Matrix

### Must-Have (SQF Compliance)
1. **EMRL column population on close** (L) — Without this, Closed Tickets lack FRM-030-002 data fields.
2. **EMRL search / Maintenance Repair Record UI** (L) — Auditors need to query this data.
3. **Closed Tickets sheet schema update** (S) — Prerequisite for both items above.
4. **Service Report form FRM-040-002** (M+L backend) — Required for work signoff trail.

### High Priority (Operations Quality)
5. **Dept transfer email notification** (S) — Currently a silent operation; managers of receiving dept have no awareness.
6. **Equipment Hold Tag issuance** (M) — Can currently clear tags but not issue them from the web app.
7. **Recurring equipment / avg-time-to-close analytics** (M) — Valuable for SQF trend reporting.

### Medium Priority (Completeness)
8. **Archive closed tickets** (M) — Needed for multi-year cleanup.
9. **Monthly Drive backup** (S) — Disaster recovery / data export.
10. **Equipment code backfill utility** (XS) — One-time fix for historical import data.

### Low Priority / Nice-to-Have
11. **In-app config editing** (L) — Current "Edit in Sheet" approach is acceptable.
12. **Configurable notification rules** (M) — Current fallback chain is robust.
13. **SQF Documents config display** (S) — Audit documentation only.
14. **Month rollover stats preview** (XS) — UX polish.

---

*End of AUDIT_reconciliation.md*
