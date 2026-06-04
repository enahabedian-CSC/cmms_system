# AUDIT_enumeration.md
## Complete Function-by-Function Enumeration — Both Codebases
### CSC CMMS — Code-Derived Audit · June 2026

---

## PART A — CODEBASE A: IZZY'S FROZEN REFERENCE
### `/home/user/cmms_system/_reference/izzy_current/`

---

### A.1 — Every Server Function

#### Code.js

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `onOpen()` | Installs menu, enforces tab visibility | — | SpreadsheetApp UI menu |
| `buildMenu_()` | Constructs custom menu items | — | UI menu |
| `enforceTabVisibility()` | No-op; tab hiding commented out | — | — |
| `getConfig()` | Returns all config key→value pairs | Config tab cols C, D | — |
| `setConfigValue(key, val)` | Sets one config row | Config tab | Config tab col D |
| `getDataList(name)` | Returns one named list from Data Validation tab | Data Validation tab | — |
| `getAllDataLists()` | Returns all lists | Data Validation tab | — |
| `getDeptMapping_()` | Reads source→dest dept map, caches result | Dept Map tab cols A, B | In-memory cache |
| `getDeptGroup_(dept)` | Normalizes raw dept string via mapping | Dept Map (via getDeptMapping_) | — |
| `getEquipmentFromInventory()` | Reads equip list from Equip Cache or Equip Inventory fallback | Equip Cache tab or Equipment Inventory tab | — |
| `getEquipmentFromCache_(cacheSh)` | Flexible header-mapped reader for cache tab | Equip Cache row 4 (headers), rows 5+ (data) | — |
| `getEquipmentHierarchy()` | Builds dept → type → [items] hierarchy | via getEquipmentFromInventory() | — |
| `getEquipmentFlatList()` | Returns flat array of equip items | via getEquipmentFromInventory() | — |
| `generateTicketNumber(dept)` | Generates MT-{code}-{YYMMDD}-{seq} | Master Log col TICKET_NO | — |
| `addNewTicket(data)` | Creates new ticket; CRITICAL bypass | Equip Cache, Config, Master Log (seq) | Master Log, Waiting Queue, Dept Tracker, optionally Open Tickets; calls sendNewTicketManagerNotification() |
| `writeTicketToSheet_(sh, row, data)` | Writes 26-col TK row to a tracker sheet | — | Dept Tracker sheet |
| `buildTkRow_(data, ticketNo, dept)` | Builds 26-col TK array | — | — |
| `logPartsNeeded_(ticketNo, data)` | Appends row to Parts Needed | — | Parts Needed tab |
| `updateTicket(data)` | Status transitions; re-routing; WAITING→OPEN hydration | Master Log, Waiting Queue, Open Tickets, Dept Tracker | Master Log (append), Waiting Queue, Open Tickets, Dept Tracker, Transfer Log |
| `moveTicketFromWaitingToOpen_()` | Copies waiting row to Open Tickets | Waiting Queue | Open Tickets tab |
| `moveTicketToClosed_()` | Moves ticket to Closed Tickets tab; calls populateEMRL_ | Open Tickets, Master Log | Closed Tickets tab |
| `editClosedTicket(data)` | In-place edit of closed ticket + ML audit row | Closed Tickets | Closed Tickets, Master Log |
| `getTrackerForDept(dept, problemType, equipType)` | Routing logic with override rules | Config (routing rules JSON) | — |
| `syncExternalTickets()` | Reads external Google Form response sheet; imports new rows | External sheet `1F4-nPI4pkZZ...` tab `Service Tickets` cols 1–10 | Master Log, Waiting Queue, Dept Tracker |
| `manualSyncExternalTickets()` | Admin-called wrapper for syncExternalTickets | — | (via syncExternalTickets) |
| `backfillMissingEquipCodes_()` | Fixes blank equip codes on sync | Equip Cache | Master Log, Waiting Queue, Tracker sheets |
| `checkTempFixDueDates()` | Daily trigger handler | Temp Fix Monitor | Temp Fix Monitor (PAST DUE updates) |
| `sendTempFixDueReminders()` | Emails dept managers for due-tomorrow temp fixes | Temp Fix Monitor | MailApp |
| `sendTempFixPastDueAlerts()` | Emails on PAST DUE temp fixes | Temp Fix Monitor | MailApp |
| `sendTransferNotification_(fromDept, toDept, data)` | HTML email on dept transfer | Config (manager emails) | MailApp |
| `sendNewTicketManagerNotification(ticketNo, emailData)` | HTML email on new ticket (non-CRITICAL) | Config (manager emails) | MailApp |
| `runMonthlyBackup()` | Exports key sheets as CSV to Drive | Master Log, Closed Tickets, Parts Needed, Temp Fix | Drive folder "CSC Maintenance System Backups/{date}/" |
| `runHourlySync()` | Time-trigger handler; refreshEquipCache + syncExternalTickets | — | (via called functions) |

#### Dashboard.js

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `buildDashboard()` | Entry point; calls buildDashboardSheet_ and refreshDashboardData_ | — | Dashboard sheet (via called functions) |
| `buildDashboardSheet_(ss)` | Constructs full Dashboard sheet layout with KPI cards, tables, charts | — | Dashboard sheet |
| `refreshDashboardData_(ss)` | Populates dashboard data from Master Log | Master Log, Closed Tickets, Temp Fix, Parts Needed | Dashboard sheet cells |
| `buildDeptDrillDownSheet_(ss)` | Builds Dept Drill-Down sheet with dept filter dropdown | — | Dept Drill-Down sheet |
| `buildTrendAnalysisTables_(ss, sheet, startRow)` | Monthly ticket stats by dept (recurring equip, chronic equip, problem type frequency, building/zone hotspots, avg time to close) | Master Log | Sheet cells at startRow+ |

#### Setup.js

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `initialSetup()` | Creates all sheet tabs, sets order, installs triggers | — | All sheet tabs |
| `buildConfigSheet_()` | Creates Config tab | — | Config tab |
| `buildDataListsSheet_()` | Creates Data Lists tab | — | Data Lists tab |
| `buildEquipmentInventorySheet_()` | Creates Equipment Inventory tab | — | Equip Inventory tab |
| `buildEquipCacheSheet_()` | Creates Equip Cache tab | — | Equip Cache tab |
| `buildMasterLogSheet_()` | Creates Master Log tab | — | Master Log tab |
| `buildTicketHistorySheet_()` | Creates Ticket History tab | — | Ticket History tab |
| `buildTransferLogSheet_()` | Creates Transfer Log tab | — | Transfer Log tab |
| `buildWaitingQueueSheet_()` | Creates Waiting Queue tab | — | Waiting Queue tab |
| `buildOpenTicketsSheet_()` | Creates Open Tickets tab | — | Open Tickets tab |
| `buildClosedTicketsSheet_()` | Creates Closed Tickets tab with EMRL columns 28–37 | — | Closed Tickets tab |
| `buildDeptTrackerSheet_(key, name)` | Creates one dept tracker sheet | — | One dept tracker tab |
| `buildTempFixSheet_()` | Creates Temp Fix Monitor tab | — | Temp Fix tab |
| `buildPartsNeededSheet_()` | Creates Parts Needed tab | — | Parts Needed tab |
| `buildEquipHoldLogSheet_()` | Creates Equipment Hold Log tab | — | Equip Hold Log tab |
| `buildReportingSheet_()` | Creates Reporting sheet | — | Reporting tab |
| `buildReportDatabaseSheet_()` | Creates Report Database tab | — | Report Database tab |
| `buildArchiveSheet_()` | Creates Archive tab | — | Archive tab |
| `setupTriggers_()` | Installs checkTempFixDueDates (daily 6am) + runHourlySync (hourly/5min) | — | ScriptApp triggers |

#### SystemSettings.js

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `openSystemSettings()` | Role-checks (admin or manager), opens modal dialog | Manager Access (via getCurrentUserInfo) | SpreadsheetApp UI |
| `getSystemSettingsData()` | Returns full settings payload | Config, Manager Access, Data Lists, Dept Map, Tech Directory | — |
| `saveSystemSettings(data)` | Admin-only: saves all config values | — | Config tab |
| `saveManagerAccess(rows)` | Admin-only: overwrites Manager Access tab | — | Manager Access tab |
| `getDataListForEdit(listName)` | Wrapper for getDataList | Data Validation tab | — |
| `saveDataList(listName, items)` | Admin-only: overwrites one list column | — | Data Validation tab |
| `settingsRefreshDashboard()` | Calls buildDashboard() | — | Dashboard sheet |
| `settingsSyncEquipment()` | Calls syncEquipmentInventory() | — | Equip Cache |
| `saveDeptMapping(rows)` | Admin-only: writes dept map rows | — | Dept Map tab |
| `parseRoutingRules_(json)` | Parses routing rules JSON; default: ELECTRICAL→EL, FACILITY→FAC | — | — |
| `parseNotifRules_(json)` | Parses notification rules JSON | — | — |
| `parseSqfDocuments_(json)` | Parses SQF Documents JSON | — | — |
| `getTechDirectory_()` | Reads Tech Directory tab | Tech Directory tab (cols 1–5) | — |
| `saveTechDirectory(rows)` | Admin-only: overwrites Tech Directory | — | Tech Directory tab |

#### ServiceReportBackened.js

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `showEquipHoldTag(ticketNo)` | Opens Equipment Hold Tag modal | — | SpreadsheetApp UI |
| `getMonthRolloverData()` | Returns month summary stats | Master Log, Temp Fix, Parts Needed | — |
| `assignTicketToTech(data)` | Sets assignedTo; calls updateTicket | — | (via updateTicket) |
| `getOpenTicketsList_()` | Returns non-CLOSED tickets from Master Log | Master Log cols 1–ML_COLS | — |

#### ManagerReviewBoardServer.js

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `openManagerReviewBoard()` | Manager/admin only; opens large modal | — | SpreadsheetApp UI |
| `showTechWorkBoard()` | Opens Tech Work Board modal | — | SpreadsheetApp UI |
| `getManagerReviewBoardData()` | Returns waitingTickets, pendingVerify, openTickets, partsNeeded, equipmentTags, serviceReports (unverified), closedTickets | Master Log, Parts Needed, Equip Hold Log, Report Database, Closed Tickets | — |
| `getTicketsForBoard_(statuses)` | Reads ML, merges rows, applies dept routing | Master Log | — |
| `managerApproveTicket(data)` | WAITING→OPEN; handles dept transfer; creates equip tag; logs history | Waiting Queue, Master Log | Open Tickets, Dept Tracker, Master Log, Equip Hold Log, Transfer Log, Ticket History |
| `moveTicketFromWaitingToOpen_()` | Copies waiting row to Open sheet | Waiting Queue | Open Tickets |
| `managerVerifyTicket(data)` | SQF checklist validation (3 items required); PENDING VERIFY→CLOSED | Pending Verification list, Master Log | Closed Tickets, Master Log, Ticket History |
| `managerUpdatePartStatus(data)` | Updates parts status in Parts Needed tab | Parts Needed | Parts Needed |
| `managerVerifyReport(data)` | Sets verified_by + verified_date in Report Database | — | Report Database |
| `getTechWorkBoardData()` | Returns all non-closed tickets for tech board | Master Log | — |
| `getTicketHistory(ticketNo)` | Returns history rows for a ticket | Ticket History tab | — |

#### EMRL.js

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `openMaintenanceRepairRecord()` | Opens FRM-030-003 modal | — | SpreadsheetApp UI |
| `getEMRLFormData()` | Returns list of depts with closed tickets | Closed Tickets tab | — |
| `searchEMRL(params)` | Searches Closed Tickets by ticket, equip, dept, date range; returns TK + EMRL cols | Closed Tickets tab (cols 1–37) | — |
| `populateEMRL_(ticketNo)` | Writes 10 EMRL columns (28–37) by pulling from ML, RPT_DB, Parts Needed, Temp Fix | Master Log, Report Database, Parts Needed, Temp Fix | Closed Tickets tab cols 28–37 |
| `rebuildClosedTab_()` | Rebuilds Closed Tickets header with section bands | — | Closed Tickets tab header rows |
| `getArchiveFormData()` | Returns years/depts available for archive | Closed Tickets tab | — |
| `getClosedTicketsForArchive()` | Returns filtered closed tickets for archive preview | Closed Tickets tab | — |
| `executeArchive()` | Moves closed tickets to Archive tab | Closed Tickets tab | Archive tab, Closed Tickets tab |

#### EquipCodeLookup.js

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `lookupEquipmentCode_(dept, equipType, equipDesc)` | 5-step lookup: dept filter → reverse Dept Map → all → type filter → exact desc match | Equip Cache (via getEquipmentFromInventory) | — |
| `backfillExternalEquipCodes()` | Fixes blank equip codes in Waiting Queue and tracker sheets | Waiting Queue, Dept Tracker sheets | Waiting Queue, Dept Tracker sheets |

#### EquipCache.js

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `setupEquipInventoryCache()` | Places IMPORTRANGE formula at A4 of Equip Cache tab | Config (source URL) | Equip Cache tab A4 |
| `refreshEquipCache()` | Clears and resets IMPORTRANGE formula | — | Equip Cache tab A4 |
| `getEquipCacheStatus()` | Returns status and row count | Equip Cache tab | — |

#### Accesscontrol.js

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `getAdminEmails_()` | Returns admin emails from Config; fallback to hardcoded `['izuniga@cscmfg.com']` | Config tab | — |
| `getManagerConfig()` | Reads Manager Access tab; col A=Name, B=blank, C=Email, D=TeamEmails, E=OwnedDepts | Manager Access tab rows 4+ | — |
| `getCurrentUserInfo()` | Returns {email, isAdmin, isManager, authorizedTabs} | Manager Access, Config | — |
| `enforceTabVisibility()` | No-op — tab hiding commented out | — | — |

---

### A.2 — Every Entry Point and Trigger

| Type | Name | Handler | Schedule/Trigger |
|---|---|---|---|
| Simple trigger | `onOpen` | `onOpen()` in Code.js | Spreadsheet open |
| Time-based trigger | Hourly sync | `runHourlySync()` in Code.js | Every 1 hour (or every 5 min, per Setup.js comment) |
| Time-based trigger | Daily temp fix check | `checkTempFixDueDates()` in Code.js | Daily at 6 AM |
| Menu item | "New Ticket" | `showNewTicketForm()` → HtmlService modal | Manual user click |
| Menu item | "Update Ticket" | `showUpdateTicketForm()` → HtmlService modal | Manual user click |
| Menu item | "Manager Review Board" | `openManagerReviewBoard()` | Manual user click |
| Menu item | "Tech Work Board" | `showTechWorkBoard()` | Manual user click |
| Menu item | "Equipment Hold Tag" | `showEquipHoldTag()` | Manual user click |
| Menu item | "Maintenance Repair Record" | `openMaintenanceRepairRecord()` | Manual user click |
| Menu item | "System Settings" | `openSystemSettings()` | Manual user click |
| Menu item | "Sync External Tickets" | `manualSyncExternalTickets()` | Manual admin click |
| Menu item | "Refresh Dashboard" | `buildDashboard()` | Manual user click |
| Menu item | "Run Month Rollover" | `showMonthRollover()` | Manual user click |

---

### A.3 — Every HtmlService Route / Template

All templates are modal dialogs opened via `SpreadsheetApp.getUi().showModalDialog()`.

| Template File | Opened By | Width×Height | Client → Server Calls |
|---|---|---|---|
| `AddTicket.html` | Menu "New Ticket" | Not specified | `getAddTicketFormData()`, `addNewTicket()` |
| `UpdateTicket.html` | Menu "Update Ticket" / board actions | Not specified | `getTicketForUpdate()`, `updateTicket()`, `managerApproveTicket()`, `managerVerifyTicket()` |
| `ManagerReviewBoard.html` | `openManagerReviewBoard()` | 1400×900 | `getManagerReviewBoardData()`, `managerApproveTicket()`, `managerVerifyTicket()`, `managerUpdatePartStatus()`, `managerVerifyReport()` |
| `TechWorkBoard.html` | `showTechWorkBoard()` | 1200×800 | `getTechWorkBoardData()`, `assignTicketToTech()` |
| `ServiceReport.html` | From ManagerReviewBoard | Not specified | `getServiceReportData()`, `saveServiceReport()` |
| `MaintenanceRepairRecord.html` | `openMaintenanceRepairRecord()` | Not specified | `getEMRLFormData()`, `searchEMRL()` |
| `EquipmentHoldTag.html` | `showEquipHoldTag()` | 720×760 | `getEquipHoldTagData()`, `saveEquipHoldTag()` |
| `SettingsPanel.html` | `openSystemSettings()` | 1300×980 | `getSystemSettingsData()`, `saveSystemSettings()`, `saveManagerAccess()`, `saveDataList()`, `saveDeptMapping()`, `saveTechDirectory()`, `settingsRefreshDashboard()`, `settingsSyncEquipment()` |
| `TempFixInspection.html` | From menu/board | Not specified | `getTempFixInspectionData()`, `submitTempFixInspection()` |
| `MonthRollover.html` | Menu "Run Month Rollover" | Not specified | `getMonthRolloverData()` |
| `ArchiveClosedTickets.html` | Menu or Settings | Not specified | `getArchiveFormData()`, `getClosedTicketsForArchive()`, `executeArchive()` |

---

### A.4 — Every Sheet Read/Write

| Sheet Tab | Read By | Written By | Key Columns |
|---|---|---|---|
| Config (⚙️ Configuration) | `getConfig()`, `getConfigValue()` | `setConfigValue()`, `saveSystemSettings()`, `ensureConfigRows_()` | C=Key, D=Value |
| Data Validation | `getDataList()`, `getAllDataLists()` | `saveDataList()` | Row 1=headers (list names), rows 2+=values |
| Master Log | All ticket functions, dashboard, monitoring | `addNewTicket()`, `updateTicket()`, `syncExternalTickets()`, all manager actions | 35+ cols (TICKET_NO, TIMESTAMP, ACTION, STATUS, DEPT, …, NOTES, TRACKER_GROUP, LINE_NO) |
| Ticket History | `getTicketHistory()` | All state-change functions | 8 cols: histId, ticketNo, timestamp, eventType, statusFrom, statusTo, performedBy, notes |
| Waiting Queue | `getManagerReviewBoardData()`, `updateTicket()` | `addNewTicket()`, `managerApproveTicket()` | TK layout (26 cols), data at row 5+ |
| Open Tickets | `getOpenTicketsList_()`, board data | `moveTicketFromWaitingToOpen_()`, `updateTicket()` | TK layout |
| Closed Tickets | `searchEMRL()`, `getClosedTicketsForArchive()` | `moveTicketToClosed_()`, `populateEMRL_()`, `editClosedTicket()` | TK cols 1–27 + EMRL cols 28–37 |
| Dept Trackers (6 sheets) | Board data, `getOpenTicketsList_()` | `addNewTicket()`, `updateTicket()`, `managerApproveTicket()` | TK layout; rows 1–7 header/banner, rows 8–27 Priority Watch List, rows 30+ Open Tickets |
| Temp Fix Monitor | `checkTempFixDueDates()`, `getManagerReviewBoardData()` | `updateTicket()` (flagged), `checkTempFixDueDates()` | TF_COLS: TEMP_ID, TICKET_NO, STATUS, DEPT, NEXT_DUE, etc. |
| Parts Needed | `getManagerReviewBoardData()`, `managerUpdatePartStatus()` | `logPartsNeeded_()` | PN_COLS: PART_ID, TICKET_NO, STATUS, etc. |
| Equipment Hold Log | `getManagerReviewBoardData()` | `managerApproveTicket()` (when equip tag option) | EHL_COLS: TAG_ID, TICKET_NO, EQUIP_CODE, etc. |
| Transfer Log | — | `updateTicket()` (on dept transfer) | TL_COLS: TR_ID, timestamp, ticket, from, to, reason, by |
| Report Database | `getManagerReviewBoardData()` | `saveServiceReport()` | RPT_DB_COLS (service report fields + verified) |
| Dept Map | `getDeptMapping_()` | `saveDeptMapping()` | Col A=source, B=destination |
| Tech Directory (👷) | `getTechDirectory_()` | `saveTechDirectory()` | Cols: name, email, dept, managerName, active |
| Manager Access | `getManagerConfig()` | `saveManagerAccess()` | Row 4+: A=name, B=blank, C=email, D=teamEmails, E=ownedDepts |
| Equip Cache | `getEquipmentFromCache_()` | `setupEquipInventoryCache()`, `refreshEquipCache()` | Row 4=headers, rows 5+=data (via IMPORTRANGE) |
| Equipment Inventory | `getEquipmentFromInventory()` (fallback) | Manual / legacy | Cols 1–6: dept, group, eType, code, specific, status |
| Archive | — | `executeArchive()` | Closed ticket rows moved from Closed Tickets |
| Dashboard | — | `buildDashboard()`, `refreshDashboardData_()` | Formatted KPI/chart data (sheet-based display) |
| Reporting | — | (setup only) | Summary reporting sheet |

---

### A.5 — Every Drive Interaction

| Function | Drive API | Purpose |
|---|---|---|
| `runMonthlyBackup()` in Code.js | `DriveApp.getFoldersByName()`, `.createFolder()`, `.createFile()` | Creates CSV backups under "CSC Maintenance System Backups/{date}/" |
| `setupEquipInventoryCache()` in EquipCache.js | `SpreadsheetApp.openById()` (IMPORTRANGE formula, not DriveApp) | IMPORTRANGE references external Equipment Register |
| External ticket sync in Code.js | `SpreadsheetApp.openById('1F4-nPI4pkZZ...')` | Reads external Form response sheet |

---

### A.6 — Every Email Send

| Function | Trigger | Recipients | Subject Template | Content |
|---|---|---|---|---|
| `sendNewTicketManagerNotification()` | `addNewTicket()` for non-CRITICAL, `syncExternalTickets()` for all imports | Dept managers via Config | `📋 Manager Action Required | New Ticket {ticketNo} | {dept}` | HTML: ticket details, equipment, problem, action required |
| `sendTransferNotification_()` | `updateTicket()` on dept transfer | From-dept managers + to-dept managers | Not confirmed (estimated: "Ticket Transferred") | HTML: transfer details |
| `sendTempFixDueReminders()` | Daily trigger (via `checkTempFixDueDates()`) | Dept managers | `⚠️ Temp Fix Inspection Due Tomorrow | {ticketNo} | {equip}` | HTML: temp fix details, due date |
| `sendTempFixPastDueAlerts()` | Daily trigger | Admin emails (not scoped to dept in Izzy's version) | `🔴 Temp Fix PAST DUE — Inspection Required | {ticketNo} | {equip}` | HTML: overdue temp fix details |

---

### A.7 — Every Document / Report / PDF Generation

| Item | Function | Format | Content |
|---|---|---|---|
| Monthly CSV Backup | `runMonthlyBackup()` | CSV files in Drive | Master Log, Closed Tickets, Parts Needed, Temp Fix — one CSV per sheet |
| Equipment Hold Tag (FRM-029-002) | `showEquipHoldTag()` → EquipmentHoldTag.html | HtmlService modal (printable) | Tag ID, ticket, equip, reason, date, tag type |
| Maintenance Repair Record (FRM-030-003) | `openMaintenanceRepairRecord()` → MaintenanceRepairRecord.html | HtmlService modal (printable) | EMRL search results: ticket, repair, CAPA data |
| Service Report | `ServiceReport.html` | HtmlService modal (printable) | Ticket work summary, parts, sign-off |
| Dashboard sheet | `buildDashboard()` | Sheet (formatted in-spreadsheet) | KPI cards, trend tables, dept breakdown, aging |

---

### A.8 — Every Form / Template / Information Generator

| Template | Form Reference | Fields |
|---|---|---|
| Add Ticket (AddTicket.html) | FRM-030-001 (implied) | dept, equipType, specificEquip, equipCode, buildingZone, lineNo, priority, problemType, downtimeType, description, observations, addedBy, partsNeeded |
| Update Ticket (UpdateTicket.html) | — | ticketNo, status, priority, assignedTo, estHours, notes; manager additional: workSummary, correctiveAct, rootCause, fixType, actualHours, verifiedBy |
| Service Report (ServiceReport.html) | FRM-040-002 | ticket, work summary, parts used, sign-off, doc number, revision |
| Equipment Hold Tag (EquipmentHoldTag.html) | FRM-029-002 | ticketNo, tagType, equipCode, equipDesc, reason, taggedBy, dateTagged |
| Maintenance Repair Record (MaintenanceRepairRecord.html) | FRM-030-003 | Searchable; shows EMRL cols: repair date, parts, root cause, corrective action, preventive action, CA date, CAPA required, clearance checklist, had temp fix, TF resolved date |
| Settings Panel (SettingsPanel.html) | — | All config fields, manager access rows, data lists, dept mapping, tech directory, routing rules, SQF documents |
| Temp Fix Inspection (TempFixInspection.html) | Maintenance Program 030 | tempId, inspectedBy, inspectionDate, notes, checklist items |
| Month Rollover (MonthRollover.html) | — | Read-only summary of month stats; no data entry |
| Archive Closed Tickets (ArchiveClosedTickets.html) | — | Year/dept filter for archive selection |

---

### A.9 — Every Computed Metric / KPI

| Metric | Computed In | Source Data |
|---|---|---|
| Total Tickets | `buildDashboard()`, `getManagerReviewBoardData()` | Master Log — count of distinct ticketNo |
| Open Tickets | Dashboard, Review Board | Master Log — status IN (OPEN, PENDING PARTS, ON HOLD, IN REVIEW) |
| Waiting Review | Dashboard | Master Log — status = WAITING |
| Critical Open | Dashboard | Master Log — status open AND priority = CRITICAL |
| Closed Tickets | Dashboard | Master Log — status = CLOSED |
| Temp Fix Active | `buildDashboard()` | Temp Fix Monitor — status IN (ACTIVE, PAST DUE) |
| Pending Parts | `getMonthRolloverData()` | Parts Needed — status != RECEIVED |
| Avg Time to Close | `buildTrendAnalysisTables_()` | Master Log — DATE_CLOSED minus DATE_OPENED |
| Problem Type Frequency | `buildTrendAnalysisTables_()` | Master Log — count by PROBLEM_TYPE |
| Recurring Equipment | `buildTrendAnalysisTables_()` | Master Log — count by EQUIP_CODE |
| Monthly Ticket Stats by Dept | `buildTrendAnalysisTables_()` | Master Log — monthly opened/closed per dept |
| Building/Zone Hotspots | `buildTrendAnalysisTables_()` | Master Log — count by BUILDING_ZONE |

---
---

## PART B — CODEBASE B: OUR DEPLOYED SYSTEM
### `/home/user/cmms_system/backend/` + `/home/user/cmms_system/frontend/`

---

### B.1 — Every Server Function

#### Config.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `getConfig()` | Returns all Config tab key→value pairs | Config tab C2:D30 | — |
| `getConfigValue(key)` | Returns single config value | Config tab | — |
| `setConfigValue(key, val)` | Writes single config value | Config tab | Config tab |
| `getBoundSS_()` | Returns bound spreadsheet; caches result | — | — |
| `getDeptMapping_()` | Reads Dept Map + hardcoded identity mappings; handles 'FACILTIIES' typo | Dept Map tab | In-memory cache |
| `normalizeDept(raw)` | Normalizes raw dept string via getDeptMapping_() | Dept Map (via getDeptMapping_) | — |
| `getTrackerForDept(dept, problemType, equipType)` | Routing logic; override rules from Config JSON | Config | — |
| `getManagerConfig()` | Reads Manager Access tab; normalizes ownedDepts; lowercases emails | Manager Access tab rows 4+ | — |
| `getManagersForDept_(dept)` | Returns email list for a given dept | Manager Access | — |
| `getAdminEmails()` | Reads 'System Admins' config key; no hardcoded fallback | Config | — |
| `getTechDirectory()` | Reads Tech Directory tab; fallback to Data Lists 'Technicians' column | Tech Directory tab, Data Lists | — |
| `getTechsForDept(dept)` | Filters techs by dept; fallback to all techs | Tech Directory | — |

#### WebApp.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `doGet(e)` | Only public entry point; routes NOACCESS → access-denied; others → index | getCurrentUserInfo(), getConfig() | HtmlService output |
| `include_(filename)` | Template include helper for server-side HTML includes | — | — |

#### Auth.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `getCurrentUserInfo()` | Returns {email, displayName, initials, role, isAdmin, isManager, ownedDepts, teamEmails} | Session, Manager Access (via getManagerConfig), Config | — |
| `requireRole_(minRole)` | Throws UNAUTHORIZED if role insufficient | getCurrentUserInfo() | — |
| `requireAdmin_()` | Calls requireRole_(ROLES.ADMIN) | — | — |
| `requireManager_()` | Calls requireRole_(ROLES.MANAGER) | — | — |
| `requireDeptAccess_(dept)` | Throws if user is not admin and doesn't own dept | getCurrentUserInfo() | — |

#### TicketSubmission.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `getAddTicketFormData()` | Returns departments, equipHierarchy, buildingZones, priorities, problemTypes, downtimeTypes, peopleList, userDisplayName, userOwnedDepts | Config, Data Lists, Equip Cache, Manager Access, Tech Directory | — |
| `addNewTicket(data)` | Creates ticket; CRITICAL bypass; dual-write invariant; sends manager notification | Config, Equip Cache, Master Log (for seq) | Master Log, Ticket History, Dept Tracker; optionally Waiting Queue; calls sendNewTicketManagerNotification_() |
| `writeTicketToSheet_(sh, rowIdx, data, ticketNo, dept)` | Writes TK row to a tracker sheet | — | Dept Tracker sheet |
| `buildTkRow_(data, ticketNo, dept, now, tz)` | Builds 26-col TK array | — | — |
| `buildNotesField_(observations, notes)` | `Observations: {x} | Notes: {y}` pattern | — | — |
| `logPartsNeeded_(ticketNo, data)` | Appends to Parts Needed | — | Parts Needed tab |
| `getPeopleList_()` | Returns techs + managers (no role suffix) | Data Lists, Manager Access | — |

#### ExternalSync.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `syncExternalTickets()` | Reads external Google Form response sheet; EXT_COL layout (cols 1–10, col 10 = PHOTO_LINKS); imports new rows | External sheet `1F4-nPI4pkZZ...` tab `Service Tickets` | Master Log, Ticket History, Dept Tracker, Waiting Queue; photo links stored in ML NOTES as `'Photos: ' + photoLinks` |
| `manualSyncExternalTickets()` | requireAdmin_() guard then calls syncExternalTickets() | — | (via syncExternalTickets) |
| `lookupEquipmentCode_(dept, equipType, equipDesc)` | 5-step equip code lookup; uses getEquipmentFlatList() | Equip Cache | — |

#### TicketLifecycle.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `approveTicket(data)` | WAITING→OPEN; requireManager_(); dual-write | Master Log, Waiting Queue | Master Log, Ticket History, Waiting Queue (remove), Open Tickets, Dept Tracker |
| `completeTicket(data)` | OPEN→PENDING VERIFICATION; requireManager_(); logs temp fix if flagged | Master Log | Master Log, Ticket History; calls _logTempFix_() if tempFixFlag |
| `verifyAndCloseTicket(data)` | PENDING VERIFICATION→CLOSED; dual-write; optional clearTempFix | Master Log | Master Log, Ticket History, Closed Tickets; calls _moveTicketToClosed_() |
| `voidTicket(data)` | Any→VOIDED; requireManager_(); removes from WAITING and OPEN | Waiting Queue, Open Tickets | Master Log, Ticket History, Waiting Queue (remove), Open Tickets (remove), Dept Tracker (remove) |
| `assignTicket(data)` | Sets assignedTo + estHours; requireManager_(); dual-write | Master Log | Master Log, Ticket History, Dept Tracker |
| `requestParts(data)` | TECH+ accessible; optional PENDING PARTS status; sends email | Master Log | Master Log, Ticket History, Parts Needed; calls sendPartsNeededEmail_() |
| `updateTicket(data)` | Techs: notes only; Managers: notes + status/priority/assignedTo | Master Log | Master Log, Ticket History, Dept Tracker |
| `flagTempFix(data)` | Logs to Temp Fix Monitor; dual-write | Master Log | Master Log, Ticket History, Temp Fix Monitor |
| `transferTicket(data)` | Moves ticket between dept trackers; requireManager_() | Master Log | Master Log, Ticket History, Transfer Log, Dept Tracker (both) |
| `_updateTicketInSheets_(ticketNo, fields)` | Updates Dept Tracker and Open Tickets rows in-place | Dept Tracker, Open Tickets | Dept Tracker, Open Tickets |
| `_moveTicketToClosed_(ticketNo, data)` | Appends to Closed Tickets; removes from Open Tickets + Tracker | Open Tickets, Dept Tracker, Master Log | Closed Tickets, Open Tickets (remove), Dept Tracker (remove) |
| `_logTempFix_(ticketNo, data)` | Appends row to Temp Fix Monitor | — | Temp Fix Monitor |
| `_clearTempFixForTicket_(ticketNo, clearedBy, notes)` | Marks temp fix CLEARED in Temp Fix Monitor | Temp Fix Monitor | Temp Fix Monitor |

#### TicketQueries.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `getQueueTickets(queueType, opts)` | requireRole_(TECH); reads ML; supports dept scoping; status filters by queueType ('waiting', 'open', 'tracker') | Master Log | — |
| `getTicketDetail(ticketNo)` | requireRole_(TECH); merges all ML rows + ticket history; returns ticket + history + techs | Master Log, Ticket History | — |
| `getClosedTickets(opts)` | requireManager_(); reads Closed Tickets sheet; dept-scoped; supports search + limit | Closed Tickets tab | — |
| `_mergeAndFilter_(data, statuses, deptFilter, limit)` | Merge ML rows per ticket (last non-empty wins), apply filters, sort by priority then date | — | — |

#### AdminViews.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `getAdminViewData(view)` | requireAdmin_(); returns data for 'config', 'access', 'deptmap', or 'techdir' views | Config tab, Manager Access, Dept Map tab, Tech Directory | — |
| `repairTrackerGroup()` | Admin utility: re-normalizes TRACKER_GROUP (col 34) on all ML rows | Master Log, Dept Map | Master Log col 34 |
| `setupTechDirectoryTab()` | Admin utility: creates Tech Directory tab if absent | — | New Tech Directory tab |
| `getTechWorkBoardData()` | requireRole_(TECH); returns active tickets scoped to user | Master Log | — |
| `monthlyRollover(data)` | requireManager_(); removes CLOSED/VOIDED rows from dept tracker sheets; ML audit row per dept | Dept Tracker sheets | Dept Tracker sheets, Master Log |

#### Dashboard.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `getDashboardCounts()` | requireManager_(); returns open/waiting/critical/tempFixActive/closedRecent/partsPending/closedThisWeek counts scoped to user's depts | Master Log, Temp Fix, Parts Needed | — |
| `getDashboardPanels()` | requireManager_(); returns attentionItems, openTickets (up to 10), holdTags; scoped to user's depts | Master Log, Temp Fix Monitor, Equip Hold Log | — |
| `getDashboardTrend(monthCount)` | requireManager_(); returns last N months opened vs closed counts | Master Log | — |
| `getEquipQuickStats(equipCode)` | requireManager_(); returns last 60d ticket count, topProbType, lastDate for a given equip code | Master Log | — |

#### Email.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `sendNewTicketManagerNotification_(ticketNo, emailData)` | Sends HTML new-ticket notification; source label INTERNAL or EXTERNAL | Config (via _emailRecipients_) | MailApp |
| `sendTempFixDueReminders()` | Due-tomorrow inspection reminder per active temp fix | Temp Fix Monitor | MailApp |
| `sendTempFixPastDueAlerts()` | PAST DUE alert per past-due temp fix; uses dept-scoped recipients (bug fix vs. Izzy) | Temp Fix Monitor | MailApp |
| `sendPartsNeededEmail_(ticketNo, data)` | Parts request notification to dept managers | Config (via _emailRecipients_) | MailApp |
| `runDailyEmailAlerts()` | Time-trigger handler: calls sendTempFixDueReminders + sendTempFixPastDueAlerts | — | (via called functions) |
| `_emailRecipients_(dept)` | Resolves recipients: dept managers → all managers → admins | Manager Access, Config | — |
| `esc_(v)` | HTML escaping helper | — | — |

#### EquipRegistry.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `refreshEquipCache()` | Pulls fresh equipment data from Equipment Register via SpreadsheetApp.openById(); writes to Equip Cache rows 4+; logs to ML | External Equipment Register (ID from Config or fallback `EXT_SHEET_IDS.EQUIP_REGISTER`) | Equip Cache tab rows 4+, Master Log (SYSTEM action row), Config ('Equip Cache Last Refreshed') |
| `getEquipmentFromInventory()` | Reads Equip Cache tab; fallback to local Equip Inventory tab | Equip Cache tab, Equip Inventory tab | — |
| `getEquipmentFromCache_(cacheSh)` | Flexible column-header mapper; reads rows 5+ | Equip Cache (headers row 4, data rows 5+) | — |
| `getEquipmentHierarchy()` | Returns dept → type → [items] hierarchy | via getEquipmentFromInventory() | — |
| `getEquipmentFlatList()` | Returns flat array of equip items with normalizeDept applied | via getEquipmentFromInventory() | — |
| `getEquipCacheStatus()` | requireAdmin_(); returns cache diagnostics: lastRefreshed, cacheRows, parsedItemCount, deptSummary, rawHeaders, mappedCols, unmappedHdrs, configTabName, configSheetUrl, resolvedSheetId, canonicalDepts | Equip Cache tab, Config | — |
| `getEquipRegisterSheetId_()` | Resolves Equipment Register sheet ID from Config with multiple key name candidates + URL scan fallback | Config | — |
| `_buildEquipColMap_(lowerHeaders)` | Builds colIndex map from headers using `_EQUIP_COL_MAPPINGS_` | — | — |
| `_findSourceHeaderRow_(srcData)` | Scans first 10 rows to find real header row | — | — |
| `runHourlySync()` | Time-trigger handler: refreshEquipCache() + syncExternalTickets() | — | (via called functions) |

#### MonitoringViews.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `getTempFixItems(opts)` | requireManager_(); returns Temp Fix Monitor rows scoped to user's depts; opts.includeCleared | Temp Fix Monitor | — |
| `inspectTempFix(data)` | requireManager_(); records inspection: updates LAST_INSPECTED, calculates NEXT_DUE, status→ACTIVE; dual-write | Temp Fix Monitor | Temp Fix Monitor, Master Log, Ticket History |
| `clearTempFix(data)` | requireManager_(); sets status→CLEARED, clearedBy, clearedDate; dual-write | Temp Fix Monitor | Temp Fix Monitor, Master Log, Ticket History |
| `getEquipHoldItems(opts)` | requireManager_(); returns Equipment Hold Log rows; opts.includeCleared | Equipment Hold Log | — |
| `clearEquipTag(data)` | requireManager_(); sets EQUIP_STATUS→CLEARED; dual-write | Equipment Hold Log | Equipment Hold Log, Master Log, Ticket History |
| `getPartsItems(opts)` | requireRole_(TECH); returns Parts Needed rows; opts.statusFilter | Parts Needed | — |
| `updatePartsStatus(data)` | requireManager_(); updates part status; timestamps ORDERED/RECEIVED dates; dual-write | Parts Needed | Parts Needed, Master Log, Ticket History |
| `_findMonitorRow_(sh, id, startRow)` | Scans col 1 for a given ID; returns 1-based row or -1 | Sheet col 1 | — |

#### Reports.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `getReportData(opts)` | requireManager_(); returns dept-level summary stats + filtered ticket list; opts: daysBack (1–365, default 30), dept | Master Log | — |

#### Setup.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `runSetup()` | requireAdmin_(); creates PM sheets, installs triggers, ensures config rows; idempotent | — | PM sheets, ScriptApp triggers, Config tab |
| `createPmSheets_()` | Creates PM_SCHEDULES, PM_CHECKLIST, PM_RECURRENCES tabs if absent | — | 3 PM sheet tabs |
| `installTriggers_()` | Removes existing managed triggers; installs runHourlySync (hourly) + runDailyEmailAlerts (daily 7AM) | ScriptApp.getProjectTriggers() | ScriptApp triggers |
| `ensureConfigRows_()` | Adds missing Config keys without overwriting existing | Config tab C2:C30 | Config tab |

#### Utilities.gs

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `generateRowId()` | Returns 8-char uppercase UUID segment | — | — |
| `generateHistId()` | Returns `H-YYYYMMddHHmmss` | — | — |
| `generateTempFixId()` | Returns `TF-YYYYMMddHHmmss` | — | — |
| `generateTagId()` | Returns `TAG-YYYYMMddHHmmss` | — | — |
| `generateTransferId()` | Returns `TR-YYYYMMddHHmmss` | — | — |
| `generateReportId()` | Returns `RPT-YYYYMMddHHmmss` | — | — |
| `generateTicketNumber(dept)` | Generates MT-{code}-{YYMMDD}-{seq}; uses INTERNAL_DEPT_CODES; fallback to LEGACY_DEPT_CODES | Master Log col TICKET_NO | — |
| `formatTimestamp_(d)` | Returns `MM/dd/yyyy HH:mm:ss` | — | — |
| `formatDateStr_(d)` | Returns `MM/dd/yyyy` | — | — |
| `normalizeBuildingZone(raw)` | Fixes 'Buidling' typo | — | — |
| `appendToMasterLog_(params)` | Appends 35-col row to Master Log | — | Master Log |
| `appendToTicketHistory_(ticketNo, eventType, statusFrom, statusTo, performedBy, notes)` | Appends 8-col row to Ticket History | — | Ticket History |
| `buildNotesField_(observations, notes)` | Builds `Observations: {x} | Notes: {y}` string | — | — |
| `getLatestMlRow_(ticketNo)` | Returns last ML row for a ticket | Master Log | — |
| `getOriginalMlRow_(ticketNo)` | Returns first ML row for a ticket | Master Log | — |
| `findTicketRowInSheet_(sh, ticketNo, startRow)` | Scans TK_DATA_COL for ticketNo; returns 1-based row | Sheet TK_DATA_COL | — |

---

### B.2 — Every Entry Point and Trigger

| Type | Name | Handler | Schedule |
|---|---|---|---|
| Web app entry | HTTP GET | `doGet(e)` in WebApp.gs | Every user page load |
| Time-based trigger | Hourly sync | `runHourlySync()` in EquipRegistry.gs | Every 1 hour |
| Time-based trigger | Daily alerts | `runDailyEmailAlerts()` in Email.gs | Daily at 7 AM |
| Admin callable | Manual equip refresh | `refreshEquipCache()` via admin UI | On demand |
| Admin callable | Manual ticket sync | `manualSyncExternalTickets()` via admin UI | On demand |
| Admin callable | Setup | `runSetup()` via admin UI | On demand |

---

### B.3 — Every HtmlService Route / Template

The deployed system is a single-page web application. There is only one top-level route.

| Template / Partial | Route / Trigger | Client → Server Calls |
|---|---|---|
| `index.html` (shell) | `doGet(e)` for all authenticated users | Injects `USER`, `COMPANY` via scriptlet |
| `access-denied.html` | `doGet(e)` when role = NOACCESS | None |
| `partials/submit-ticket.html` | Navigate to `submit` page | `getAddTicketFormData()`, `addNewTicket()`, `getEquipQuickStats()` |
| `partials/ticket-list.html` | Navigate to `waiting`, `open`, `tracker-{dept}` pages | `getQueueTickets()`, `monthlyRollover()` |
| `partials/ticket-detail.html` | `openTicketDetail(ticketNo)` from any list | `getTicketDetail()`, `approveTicket()`, `completeTicket()`, `verifyAndCloseTicket()`, `voidTicket()`, `assignTicket()`, `requestParts()`, `updateTicket()`, `flagTempFix()`, `transferTicket()` |
| `partials/closed-tickets.html` | Navigate to `closed` page | `getClosedTickets()` |
| `partials/tech-work-board.html` | Navigate to `tech-board` page | `getTechWorkBoardData()` |
| `partials/monitoring.html` | Navigate to `tempfix`, `equipment-hold`, `parts` pages | `getTempFixItems()`, `inspectTempFix()`, `clearTempFix()`, `getEquipHoldItems()`, `clearEquipTag()`, `getPartsItems()`, `updatePartsStatus()` |
| `partials/reports.html` | Navigate to `reports` page | `getReportData()`, `getDashboardTrend()` |
| `partials/admin.html` | Navigate to `admin-config`, `admin-access`, `admin-deptmap`, `admin-equip` pages | `getAdminViewData()`, `getEquipCacheStatus()`, `refreshEquipCache()` |

---

### B.4 — Every Sheet Read/Write

Same underlying sheet structure as Codebase A. Key differences noted below.

| Sheet Tab | Notable Differences vs. Izzy |
|---|---|
| Master Log | 35 columns (Izzy had 36 including VERIFICATION_CHECKLIST); TRACKER_GROUP = col 34, LINE_NO = col 35 |
| Closed Tickets | No EMRL columns 28–37 appended by code (EMRL subsystem not present in our codebase) |
| Config | Key 'System Admins' used (Izzy used 'Admin Emails'); 'System Version' key added; additional: 'Equipment Register Sheet URL', 'Equipment Inventory Tab Name', 'Equip Cache Last Refreshed' |
| PM Sheets | PM_SCHEDULES, PM_CHECKLIST, PM_RECURRENCES tabs exist (forward design, no UI) |
| Report Database | Not read by any function in our codebase |
| Dept Map | Same structure; our getDeptMapping_() adds hardcoded identity entries + 'FACILTIIES' typo fix |

---

### B.5 — Every Drive Interaction

| Function | Drive API | Purpose |
|---|---|---|
| `refreshEquipCache()` in EquipRegistry.gs | `SpreadsheetApp.openById(sheetId)` | Opens external Equipment Register to pull cache |
| `syncExternalTickets()` in ExternalSync.gs | `SpreadsheetApp.openById('1F4-nPI4pkZZ...')` | Opens external Form response sheet to sync tickets |
| No monthly CSV backup | — | Not implemented in our codebase |

---

### B.6 — Every Email Send

| Function | Trigger | Recipients | Subject | Content |
|---|---|---|---|---|
| `sendNewTicketManagerNotification_()` | `addNewTicket()` (non-CRITICAL), `syncExternalTickets()` | `_emailRecipients_(dept)`: dept managers → all managers → admins | `📋 Manager Action Required | New Ticket {ticketNo} | {dept}` | HTML: ticket details, source badge (INTERNAL/EXTERNAL), equipment, action required |
| `sendTempFixDueReminders()` | `runDailyEmailAlerts()` daily at 7AM | `_emailRecipients_(dept)` per temp fix | `⚠️ Temp Fix Inspection Due Tomorrow | {ticketNo} | {equip}` | HTML: temp fix details |
| `sendTempFixPastDueAlerts()` | `runDailyEmailAlerts()` daily | `_emailRecipients_(dept)` per past-due temp fix | `🔴 Temp Fix PAST DUE — Inspection Required | {ticketNo} | {equip}` | HTML: overdue details |
| `sendPartsNeededEmail_()` | `requestParts()` | `_emailRecipients_(dept)` | `🔩 Parts Needed | {ticketNo} | {equip}` | HTML: parts list table |

---

### B.7 — Every Document / Report / PDF Generation

| Item | Function | Format |
|---|---|---|
| Ticket Activity Report | `getReportData()` + `partials/reports.html` | In-browser report; Print / Export PDF via `window.print()` |
| No CSV backup | — | Not implemented |
| No Equipment Hold Tag PDF | — | Not implemented (Izzy had FRM-029-002 modal) |
| No Maintenance Repair Record PDF | — | Not implemented (Izzy had FRM-030-003 modal via EMRL.js) |
| No Service Report PDF | — | Not implemented (Izzy had ServiceReport.html) |

---

### B.8 — Every Form / Template / Information Generator

| Page / Partial | Form Reference | Fields / Sections |
|---|---|---|
| Submit Ticket (submit-ticket.html) | FRM-030-001 (per sub-title in UI) | 3-step: Step 1: dept, equipType, specificEquip, buildingZone, lineNo; Step 2: priority (card grid), problemType, downtimeType, description, observations, addedBy, partsNeeded checkbox; Step 3: review |
| Ticket Detail (ticket-detail.html) | — | View: all ticket fields, work summary, verification, history; Actions: approve, complete, verify+close, void, assign, tempfix, transfer, request parts, update |
| Closed Tickets (closed-tickets.html) | — | Search, filter by dept; click → ticket detail |
| Monitoring — Temp Fix (monitoring.html) | Maintenance Program 030 | Inspect (records date, notes), Clear (with notes) |
| Monitoring — Equipment Hold (monitoring.html) | — | Clear Tag (with notes) |
| Monitoring — Parts (monitoring.html) | — | Kanban board: Pending → Ordered → Received / Cancelled |
| Reports (reports.html) | — | Period selector (30/60/90/180/365 days), search, dept summary cards, ticket table, problem type breakdown bar chart, trend chart |
| Admin — Config (admin.html) | — | Read-only; "Edit in Sheet" button links to Config tab |
| Admin — Access (admin.html) | — | Read-only; manager table; "Edit in Sheet" link |
| Admin — Dept Map (admin.html) | — | Read-only; source → canonical table; "Edit in Sheet" link |
| Admin — Equipment Cache (admin.html) | — | Cache status, column mapping diagnostics, per-dept item counts; "Refresh Cache Now" button |
| Tech Work Board (tech-work-board.html) | — | Manager: all open tickets grouped by tech; Tech: only own assigned tickets |

---

### B.9 — Every Computed Metric / KPI

| Metric | Computed In | Source Data |
|---|---|---|
| Open | `getDashboardCounts()` | Master Log — status IN (OPEN, PENDING PARTS, ON HOLD, PENDING VERIFICATION) |
| Waiting | `getDashboardCounts()` | Master Log — status = WAITING |
| Critical | `getDashboardCounts()` | Master Log — status open AND priority = CRITICAL |
| Closed Recent (30 days) | `getDashboardCounts()` | Master Log — status CLOSED AND dateClosed >= 30d ago |
| Closed This Week | `getDashboardCounts()` | Master Log — status CLOSED AND dateClosed >= last Monday |
| Temp Fix Active | `getDashboardCounts()` | Temp Fix Monitor — status IN (ACTIVE, PAST DUE) |
| Parts Pending | `getDashboardCounts()` | Parts Needed — status IN (PENDING, ORDERED) |
| Dept Summary (open/waiting/closed/critical/tempFix/totalHours) | `getReportData()` | Master Log per dept |
| Problem Type Breakdown | `partials/reports.html` analytics | tickets array — count by problemType |
| Activity Trend (opened vs closed by month) | `getDashboardTrend()` | Master Log — first-seen date (opened), DATE_CLOSED (closed) |
| Equipment 60-day Ticket Count + Top Problem Type | `getEquipQuickStats()` | Master Log — by EQUIP_CODE, last 60 days |
| Tracker KPI bar | `partials/ticket-list.html _tlKpiBar_()` | Tickets array — total, open, critical, high, pending parts, on hold, pending verify, unassigned |
| Temp Fix KPI bar | `partials/monitoring.html _tfKpiBar_()` | Temp fix items — total, past due, active |
| Equipment Hold KPI bar | `partials/monitoring.html _ehlKpiBar_()` | Hold items — total, red/yellow/orange tags |

---

*End of AUDIT_enumeration.md*
