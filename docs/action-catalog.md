# CMMS Action Catalog

> **Purpose:** One row per mutation in the system. Every Phase 5 server function that changes sheet state must trace back to an entry here. "Side effects" are mandatory — omitting a dual-write (Ticket History + Master Log) or an email listed here is a regression.
>
> **Invariant:** Every action in the STATE-CHANGE category must write to **both** `📜 Ticket History` AND `🗄️ Master Log`. No exceptions.
>
> **Column definitions:**
> - **Trigger** — what initiates the action (UI button, time-driven trigger, sheet onEdit, external call)
> - **Authorized Role** — roles from `👔 Manager Access` (Technician / Manager / Admin); read from sheet at call time — never hard-coded
> - **Inputs** — fields received by the function and any validation rules
> - **Outputs** — tabs written and which columns are touched
> - **Side Effects** — audit entries (ML + TH), emails fired, status transitions, cascading writes
> - **Legacy Ref** — `file:function` in `/legacy-apps-script/`

---

## Category: Ticket Creation

### 1. addNewTicket — Internal Submission

| Field | Value |
|-------|-------|
| **Trigger** | UI form submit (Technician submits new ticket) |
| **Authorized Role** | Any authenticated @cscmfg.com user |
| **Inputs** | `dept` (required, must resolve via `📋 Dept Map`), `problemType` (required), `equipType`, `specificEquip`, `description` (required, non-empty), `priority` (`NORMAL`/`CRITICAL`), `requestedBy`, `location`, `submittedBy` (from Session) |
| **Outputs — 🗄️ Master Log** | Append 1 row: all 35 ML columns; `ML.ACTION = 'TICKET CREATED'`; `ML.STATUS` = `WAITING` (non-CRITICAL) or `OPEN` (CRITICAL) |
| **Outputs — 📜 Ticket History** | Append 1 row: `TH.TICKET_NO`, `TH.EVENT_TYPE = 'CREATED'`, `TH.ACTOR`, `TH.TIMESTAMP`, `TH.NOTES = description` |
| **Outputs — 🎫 Ticket Queue** | Append 1 row (non-CRITICAL only); all TK columns; `TK.STATUS = 'WAITING'` |
| **Outputs — Dept Tracker sheet** | Append 1 row in OPEN section (row 30+) for CRITICAL only; `TK.STATUS = 'OPEN'` |
| **Side Effects** | Generates ticket number via `generateTicketNumber(dept)`; generates hist ID via `generateHistId()`; fires `sendNewTicketManagerNotification()` for non-CRITICAL tickets only (CRITICAL skips email) |
| **Status Transition** | `null → WAITING` (non-CRITICAL) or `null → OPEN` (CRITICAL) |
| **Legacy Ref** | `CodeCoreUpdates.js:addNewTicket` |

---

### 2. syncExternalTickets — External Import

| Field | Value |
|-------|-------|
| **Trigger** | Time-driven trigger (hourly via `runHourlySync()`); also callable manually by Admin |
| **Authorized Role** | System trigger (no user role check); manual call: Admin only |
| **Inputs** | Reads from external sheet `1F4-...` (read-only); polls all rows; idempotency key = ticket number column |
| **Outputs — 🗄️ Master Log** | Append 1 row per new external ticket: `ML.ACTION = 'EXTERNAL TICKET IMPORTED'`; `ML.SOURCE = 'EXTERNAL'` |
| **Outputs — 📜 Ticket History** | Append 1 row per new ticket: `TH.EVENT_TYPE = 'CREATED'`, `TH.NOTES = 'Imported from external source'` |
| **Outputs — 🎫 Ticket Queue** | Append 1 row per new ticket; `TK.STATUS = 'WAITING'` |
| **Side Effects** | Idempotent — builds `existingNos` map before writing; no duplicates; no email sent on import; dept normalization applied via `getDeptMapping_()` |
| **Status Transition** | `null → WAITING` |
| **Legacy Ref** | `Code.js:syncExternalTickets` |

---

## Category: Ticket State Changes

### 3. updateTicket — General Update

| Field | Value |
|-------|-------|
| **Trigger** | UI form submit (Technician or Manager updates open ticket) |
| **Authorized Role** | Technician (own dept), Manager (owned depts), Admin (any) |
| **Inputs** | `ticketNo` (required, must exist), `status`, `assignedTo`, `notes`, `priority`, `tempFixExpiry` (if temp fix applied), `partsNeeded` (boolean), `partsList` |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION` = one of `['STATUS UPDATED', 'ASSIGNED', 'NOTE ADDED', 'PRIORITY CHANGED', 'TEMP FIX APPLIED', 'PARTS REQUESTED']` depending on changed fields |
| **Outputs — 📜 Ticket History** | Append 1 row per field changed: `TH.EVENT_TYPE = 'UPDATED'`, `TH.FIELD_CHANGED`, `TH.OLD_VALUE`, `TH.NEW_VALUE` |
| **Outputs — Active tracker sheet** | Update existing row in-place: only columns that changed |
| **Outputs — 🔧 Temp Fix Monitor** | Append row if `tempFixExpiry` set; `TF.STATUS = 'ACTIVE'` |
| **Outputs — 🔩 Parts Needed** | Append row if `partsNeeded = true`; `PN.STATUS = 'PENDING'` |
| **Side Effects** | Re-routes ticket to different tracker if `dept` or `problemType` changed (calls `getTrackerForDept()`); fires `sendPartsNeededEmail_()` if parts requested; fires `sendTempFixDueReminders()` schedule set |
| **Status Transition** | Any → Any (caller-controlled; validated against allowed transitions) |
| **Legacy Ref** | `CodeCoreUpdates.js:updateTicket` |

---

### 4. managerApproveTicket — Manager Approval

| Field | Value |
|-------|-------|
| **Trigger** | Manager Review Board UI — "Approve" button |
| **Authorized Role** | Manager (dept match), Admin |
| **Inputs** | `ticketNo` (required), `approvingManager` (from Session), `targetDept`, `assignedTo`, `notes` |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'MANAGER APPROVED'`; `ML.STATUS = 'OPEN'` |
| **Outputs — 📜 Ticket History** | Append 1 row: `TH.EVENT_TYPE = 'APPROVED'`, `TH.ACTOR = approvingManager` |
| **Outputs — 🎫 Ticket Queue** | Remove row (delete or move to appropriate tracker) |
| **Outputs — Dept Tracker sheet** | Append row in OPEN section (row 30+); `TK.STATUS = 'OPEN'` |
| **Side Effects** | None (no email on approval per legacy code) |
| **Status Transition** | `WAITING → OPEN` |
| **Legacy Ref** | `ManagerReviewBoardServer.js:managerApproveTicket` |

---

### 5. managerVerifyTicket — Manager Verification / Close

| Field | Value |
|-------|-------|
| **Trigger** | Manager Review Board UI — "Verify & Close" button |
| **Authorized Role** | Manager (dept match), Admin |
| **Inputs** | `ticketNo` (required), `verifyingManager` (from Session), `closeNotes`, `serviceReportRef` |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'MANAGER VERIFIED — CLOSED'`; `ML.STATUS = 'CLOSED'` |
| **Outputs — 📜 Ticket History** | Append 1 row: `TH.EVENT_TYPE = 'CLOSED'`, `TH.ACTOR = verifyingManager` |
| **Outputs — Active tracker sheet** | Remove row from OPEN section |
| **Outputs — 🗂️ Closed Tickets** | Append row with `TK.STATUS = 'CLOSED'`; `TK.CLOSED_DATE = now()` |
| **Side Effects** | Calls `greyOutClosedTickets_()` to format closed row; clears temp fix monitor entry if exists; no email on close |
| **Status Transition** | `OPEN → CLOSED` |
| **Legacy Ref** | `ManagerReviewBoardServer.js:managerVerifyTicket` |

---

### 6. managerReassignTicket — Ticket Reassignment

| Field | Value |
|-------|-------|
| **Trigger** | Manager Review Board UI — "Reassign" button |
| **Authorized Role** | Manager (any dept), Admin |
| **Inputs** | `ticketNo` (required), `newDept` (required, must resolve via `📋 Dept Map`), `newAssignee`, `reassignNotes`, `reassigningManager` (from Session) |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'REASSIGNED'`; `ML.DEPT = newDept` |
| **Outputs — 📜 Ticket History** | Append 1 row: `TH.EVENT_TYPE = 'REASSIGNED'`, `TH.OLD_VALUE = oldDept`, `TH.NEW_VALUE = newDept` |
| **Outputs — Source tracker sheet** | Remove row from old tracker |
| **Outputs — Target tracker sheet** | Append row in OPEN section of new dept tracker |
| **Side Effects** | Known bug in legacy: searches from row 5 — new code must search from correct data start row (row 8+ for trackers, row 7+ for queue); fires `sendTransferNotification_()` email |
| **Status Transition** | `OPEN → OPEN` (dept changes, status unchanged) |
| **Legacy Ref** | `ManagerReviewBoardServer.js:managerReassignTicket` |

---

### 7. voidTicket — Void / Cancel Ticket

| Field | Value |
|-------|-------|
| **Trigger** | Admin UI — "Void Ticket" action |
| **Authorized Role** | Manager, Admin |
| **Inputs** | `ticketNo` (required), `voidReason` (required, non-empty), `voidedBy` (from Session) |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'VOIDED'`; `ML.STATUS = 'VOID'` |
| **Outputs — 📜 Ticket History** | Append 1 row: `TH.EVENT_TYPE = 'VOIDED'`, `TH.NOTES = voidReason` |
| **Outputs — Active sheet (Queue or Tracker)** | Remove row |
| **Outputs — 🗂️ Closed Tickets** | Append row with `TK.STATUS = 'VOID'` |
| **Side Effects** | No email; clears temp fix / parts needed entries for this ticket |
| **Status Transition** | `WAITING|OPEN → VOID` |
| **Legacy Ref** | `CodeCoreUpdates.js:voidTicket` |

---

### 8. editClosedTicket — Post-Close Edit

| Field | Value |
|-------|-------|
| **Trigger** | Admin UI — edit action on a closed/voided ticket |
| **Authorized Role** | Admin only |
| **Inputs** | `ticketNo` (required), `fieldName` (required), `newValue` (required), `editReason` (required), `editedBy` (from Session) |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'ADMIN EDIT — POST CLOSE'`; records old + new value |
| **Outputs — 📜 Ticket History** | Append 1 row: `TH.EVENT_TYPE = 'EDITED'`, `TH.FIELD_CHANGED`, `TH.OLD_VALUE`, `TH.NEW_VALUE`, `TH.NOTES = editReason` |
| **Outputs — 🗂️ Closed Tickets** | Update row in-place for the changed field only |
| **Side Effects** | No email; no status transition — ticket remains CLOSED/VOID |
| **Status Transition** | None (closed ticket stays closed) |
| **Legacy Ref** | `Code.js` (partial implementation, no dedicated function — inferred from `updateTicket` admin path) |

---

## Category: Equipment Hold

### 9. submitEquipmentHoldTag — Tag Equipment Out of Service

| Field | Value |
|-------|-------|
| **Trigger** | UI form submit (Technician or Manager tags equipment) |
| **Authorized Role** | Technician (own dept), Manager, Admin |
| **Inputs** | `equipId` (required, must exist in Equipment Register), `tagType` (`RED`/`YELLOW`), `reason` (required), `taggedBy` (from Session), `linkedTicketNo` (optional), `estimatedClearDate` |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'EQUIPMENT TAGGED'`; `ML.EQUIP_ID`, `ML.TAG_TYPE` |
| **Outputs — 📜 Ticket History** | Append 1 row on linked ticket (if any): `TH.EVENT_TYPE = 'EQUIP TAGGED'` |
| **Outputs — 🔴 Equip Hold Log** | Append 1 row: all 14 EHL columns; `EHL.STATUS = 'TAGGED'` |
| **Side Effects** | **MUST NOT write to Equipment Register `1dlqp8j...`** (write violation in legacy `writeToExternalHoldRegister_()` — new code omits this entirely); no email in legacy; consider adding email in new build per user decision |
| **Status Transition** | Equipment: `ACTIVE → TAGGED` (tracked in Equip Hold Log, not Equipment Register) |
| **Legacy Ref** | `Code.js:writeToExternalHoldRegister_` (VIOLATION — new code must not replicate this) |

---

### 10. clearEquipmentTag — Green Tag / Clear Equipment

| Field | Value |
|-------|-------|
| **Trigger** | UI action — Manager or Admin clears hold tag |
| **Authorized Role** | Manager (dept match), Admin |
| **Inputs** | `equipId` (required), `tagRowId` (required, identifies EHL row), `clearNotes` (required), `clearedBy` (from Session), `clearDate` |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'EQUIPMENT CLEARED'`; `ML.EQUIP_ID` |
| **Outputs — 📜 Ticket History** | Append 1 row on linked ticket (if any): `TH.EVENT_TYPE = 'EQUIP CLEARED'` |
| **Outputs — 🔴 Equip Hold Log** | Update existing row: `EHL.STATUS = 'CLEARED'`; `EHL.CLEAR_DATE`, `EHL.CLEARED_BY`, `EHL.CLEAR_NOTES` |
| **Side Effects** | Returns equipment to service — triggers recheck of any active temp-fix linked to this equipment |
| **Status Transition** | Equipment: `TAGGED → CLEARED` |
| **Legacy Ref** | `ManagerReviewBoardServer.js:getActiveEquipmentTags_` (read side); write side inferred from EHL schema |

---

## Category: Inspections and Reports

### 11. submitTempFixInspection — Temp Fix Check-In

| Field | Value |
|-------|-------|
| **Trigger** | UI form submit (Technician periodic check on temp fix) |
| **Authorized Role** | Technician (own dept), Manager, Admin |
| **Inputs** | `ticketNo` (required), `tempFixStatus` (`STILL ACTIVE`/`RESOLVED`/`ESCALATED`), `inspectionNotes` (required), `inspectedBy` (from Session), `newExpiryDate` (if extending) |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'TEMP FIX INSPECTED'` |
| **Outputs — 📜 Ticket History** | Append 1 row: `TH.EVENT_TYPE = 'TEMP FIX CHECK'`, `TH.NOTES = inspectionNotes` |
| **Outputs — 🔧 Temp Fix Monitor** | Update existing row: `TF.LAST_INSPECTION`, `TF.STATUS`; if extended, update `TF.EXPIRY_DATE` |
| **Side Effects** | If `RESOLVED`: triggers close-out flow on parent ticket (calls `managerVerifyTicket` or queues for review); if `ESCALATED`: changes priority to CRITICAL |
| **Status Transition** | Temp Fix: `ACTIVE → ACTIVE|RESOLVED|ESCALATED` |
| **Legacy Ref** | `Code.js:sendTempFixDueReminders`, `Code.js:sendTempFixPastDueAlerts` (email side); form server inferred from `TF` schema |

---

### 12. submitServiceReport — Service Report Creation

| Field | Value |
|-------|-------|
| **Trigger** | UI form submit (Technician submits completed work report) |
| **Authorized Role** | Technician (own dept), Manager, Admin |
| **Inputs** | `ticketNo` (required), `workPerformed` (required), `techName` (from Session), `laborHours`, `partsUsed`, `correctiveAction`, `rootCause`, `reportDate` |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'SERVICE REPORT SUBMITTED'` |
| **Outputs — 📜 Ticket History** | Append 1 row: `TH.EVENT_TYPE = 'REPORT SUBMITTED'` |
| **Outputs — 📋 Report Database** | Append 1 row: all RDB columns (schema undefined in legacy — new code must define) |
| **Side Effects** | Queues ticket for manager verification; no email in legacy (manager sees in Review Board) |
| **Status Transition** | Ticket: `OPEN → PENDING VERIFICATION` (new status — must add to state machine) |
| **Legacy Ref** | `ServiceReportBackened.js:getReviewTicketFormData` (BROKEN — uses dot notation on string-key config object) |

---

### 13. managerVerifyReport — Manager Accepts Service Report

| Field | Value |
|-------|-------|
| **Trigger** | Manager Review Board UI — "Accept Report" action |
| **Authorized Role** | Manager (dept match), Admin |
| **Inputs** | `reportId` (required), `ticketNo` (required), `verifyingManager` (from Session), `verifyNotes` |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'REPORT VERIFIED'` |
| **Outputs — 📜 Ticket History** | Append 1 row: `TH.EVENT_TYPE = 'REPORT ACCEPTED'` |
| **Outputs — 📋 Report Database** | Update row: `RDB.VERIFIED_BY`, `RDB.VERIFIED_DATE`, `RDB.STATUS = 'ACCEPTED'` |
| **Side Effects** | Triggers `managerVerifyTicket` to fully close the ticket |
| **Status Transition** | Report: `SUBMITTED → ACCEPTED`; Ticket: `PENDING VERIFICATION → CLOSED` |
| **Legacy Ref** | `ServiceReportBackened.js:getReviewTicketFormData` (partial) |

---

## Category: Parts Management

### 14. addPartToClosedTicket — Post-Close Parts Addition

| Field | Value |
|-------|-------|
| **Trigger** | UI action — Manager or Admin adds parts record to closed ticket |
| **Authorized Role** | Manager, Admin |
| **Inputs** | `ticketNo` (required, must be CLOSED), `partNumber` (required), `partDescription`, `quantity`, `cost`, `addedBy` (from Session) |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'PART ADDED — POST CLOSE'` |
| **Outputs — 📜 Ticket History** | Append 1 row: `TH.EVENT_TYPE = 'PART ADDED'` |
| **Outputs — 🔩 Parts Needed** | Append row: all 12 PN columns; `PN.STATUS = 'SOURCED'` |
| **Side Effects** | No email; no status change on ticket |
| **Status Transition** | None |
| **Legacy Ref** | `CodeCoreUpdates.js:updateTicket` (parts path, inferred) |

---

### 15. managerUpdatePartStatus — Parts Order Status

| Field | Value |
|-------|-------|
| **Trigger** | Manager UI — parts management screen |
| **Authorized Role** | Manager (dept match), Admin |
| **Inputs** | `partRowId` (required), `newStatus` (`PENDING`/`ORDERED`/`RECEIVED`/`INSTALLED`), `updatedBy` (from Session), `notes` |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'PARTS STATUS UPDATED'` |
| **Outputs — 📜 Ticket History** | Append 1 row on linked ticket: `TH.EVENT_TYPE = 'PARTS UPDATE'` |
| **Outputs — 🔩 Parts Needed** | Update row: `PN.STATUS`, `PN.LAST_UPDATED`, `PN.NOTES` |
| **Side Effects** | Fires `sendPartsNeededEmail_()` on `RECEIVED` status (notify requesting tech); NOTE: legacy email is a stub — must implement full template |
| **Status Transition** | Parts: `PENDING → ORDERED → RECEIVED → INSTALLED` |
| **Legacy Ref** | `Code.js:sendPartsNeededEmail_` (STUB — body is placeholder HTML) |

---

## Category: Transfer and Transfer Log

### 16. logTicketTransfer — Department Transfer

| Field | Value |
|-------|-------|
| **Trigger** | Internal call from `updateTicket` or `managerReassignTicket` when dept changes |
| **Authorized Role** | Called internally — inherits caller's role check |
| **Inputs** | `ticketNo`, `fromDept`, `toDept`, `transferredBy`, `transferReason`, `timestamp` |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'DEPT TRANSFER'`; `ML.DEPT = toDept` |
| **Outputs — 📜 Ticket History** | Append 1 row: `TH.EVENT_TYPE = 'TRANSFERRED'`, `TH.OLD_VALUE = fromDept`, `TH.NEW_VALUE = toDept` |
| **Outputs — 📦 Transfer Log** | Append 1 row: all 8 TL columns |
| **Side Effects** | Fires `sendTransferNotification_()` email to receiving dept manager |
| **Status Transition** | None on ticket status; dept field changes |
| **Legacy Ref** | `Code.js:logTicketTransfer_`, `Code.js:sendTransferNotification_` |

---

## Category: Administrative / Batch Operations

### 17. executeMonthRollover — Monthly Archive

| Field | Value |
|-------|-------|
| **Trigger** | Time-driven trigger (1st of month) or Admin manual trigger |
| **Authorized Role** | Admin only (or system trigger) |
| **Inputs** | No user inputs; reads current month closed tickets from `🗂️ Closed Tickets` |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'MONTH ROLLOVER'`; records ticket count archived |
| **Outputs — 📜 Ticket History** | No per-ticket history entry (batch operation) |
| **Outputs — Monthly archive tab** | Create or append to tab named `YYYY-MM Closed` (or similar); copies all CLOSED rows |
| **Outputs — 🗂️ Closed Tickets** | Optionally clears rows older than N months |
| **Side Effects** | `getMonthRolloverData()` in legacy is BROKEN (dot notation bug on config) — new code must fix |
| **Status Transition** | None (archival only) |
| **Legacy Ref** | `ServiceReportBackened.js:getMonthRolloverData` (BROKEN) |

---

### 18. runMonthlyBackup — Data Backup

| Field | Value |
|-------|-------|
| **Trigger** | Time-driven trigger (monthly) |
| **Authorized Role** | System trigger only |
| **Inputs** | None; reads all tabs from bound spreadsheet |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'MONTHLY BACKUP COMPLETED'` |
| **Outputs — Google Drive** | Creates backup copy of spreadsheet in configured Drive folder |
| **Side Effects** | No email; no sheet mutations beyond ML log entry |
| **Status Transition** | None |
| **Legacy Ref** | `Setup.js` (inferred from `setupTriggers_()` trigger list) |

---

## Category: Background / Automated

### 19. checkTempFixDueDates — Temp Fix Expiry Monitor

| Field | Value |
|-------|-------|
| **Trigger** | Time-driven trigger (daily via `runHourlySync()` or dedicated daily trigger) |
| **Authorized Role** | System trigger only |
| **Inputs** | None; reads `🔧 Temp Fix Monitor` for rows where `TF.EXPIRY_DATE <= today` |
| **Outputs — 🗄️ Master Log** | Append 1 row per alert sent: `ML.ACTION = 'TEMP FIX REMINDER SENT'` or `'TEMP FIX PAST DUE ALERT'` |
| **Outputs — 📜 Ticket History** | Append 1 row per alerted ticket: `TH.EVENT_TYPE = 'TEMP FIX ALERT'` |
| **Outputs — 🔧 Temp Fix Monitor** | Update `TF.LAST_ALERT_DATE` per row where alert sent |
| **Side Effects** | Fires `sendTempFixDueReminders()` (due soon — full HTML email to assigned tech + manager); fires `sendTempFixPastDueAlerts()` (overdue — full HTML email, escalation tone) |
| **Status Transition** | None (alert only; does not change ticket status) |
| **Legacy Ref** | `Code.js:sendTempFixDueReminders`, `Code.js:sendTempFixPastDueAlerts` |

---

### 20. onEdit — Direct Tracker Sheet Edit

| Field | Value |
|-------|-------|
| **Trigger** | `onEdit(e)` installable trigger — fires on any direct cell edit in any Tracker or Queue sheet |
| **Authorized Role** | Any user with sheet edit access (cannot enforce app-level roles in onEdit) |
| **Inputs** | `e.range` (edited cell), `e.oldValue`, `e.value`, `e.user.email` |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'DIRECT EDIT — {FIELD_NAME}'`; records old + new value, editor email |
| **Outputs — 📜 Ticket History** | Append 1 row: `TH.EVENT_TYPE = 'DIRECT EDIT'`, `TH.FIELD_CHANGED`, `TH.OLD_VALUE`, `TH.NEW_VALUE` |
| **Side Effects** | No email; purely an audit capture — does NOT prevent the edit (sheet-level protection is separate) |
| **Status Transition** | None (records what happened, does not enforce rules) |
| **Legacy Ref** | `CodeCoreUpdates.js:onEdit` |

---

## Category: Data Sync

### 21. syncEquipInventoryCache — Equipment Cache Refresh

| Field | Value |
|-------|-------|
| **Trigger** | Time-driven trigger (hourly via `runHourlySync()`) |
| **Authorized Role** | System trigger only |
| **Inputs** | None; reads Equipment Register `1dlqp8j...` via `SpreadsheetApp.openById()` (READ ONLY — never write) |
| **Outputs — ⚙️ Equip Inventory Cache** | Overwrites tab contents with fresh equipment list |
| **Outputs — 🗄️ Master Log** | Append 1 row: `ML.ACTION = 'EQUIP CACHE REFRESHED'` |
| **Side Effects** | Replaces legacy IMPORTRANGE formula (which is broken on copy sheet); no email; no Ticket History entry (not a ticket action) |
| **Status Transition** | None |
| **Legacy Ref** | `Code.js:syncEquipHoldLog_` (EMPTY STUB — new code implements this) |

---

## Appendix A: Email Trigger Map

| Email Function | Fires On | Recipient(s) | Template Status |
|----------------|----------|--------------|-----------------|
| `sendNewTicketManagerNotification()` | `addNewTicket` (non-CRITICAL only) | Dept manager(s) from `👔 Manager Access` | Full HTML — preserve verbatim |
| `sendTransferNotification_()` | `logTicketTransfer_` | Receiving dept manager | Full HTML — preserve verbatim |
| `sendTempFixDueReminders()` | `checkTempFixDueDates` (due soon) | Assigned tech + dept manager | Full HTML — preserve verbatim |
| `sendTempFixPastDueAlerts()` | `checkTempFixDueDates` (overdue) | Assigned tech + dept manager + admin | Full HTML — preserve verbatim |
| `sendPartsNeededEmail_()` | `managerUpdatePartStatus` (RECEIVED) | Requesting technician | **STUB — must implement full template** |

---

## Appendix B: State Machine Summary

```
                    addNewTicket                updateTicket
null ──────────────────────────────────────────────────────────►
  ├── CRITICAL  ───────────────────────────────────────► OPEN ──► (see below)
  └── non-CRITICAL ──────────────────────────────────► WAITING
                                                          │
                                              managerApproveTicket
                                                          │
                                                          ▼
                                                        OPEN
                                                          │
                         ┌────────────────────────────────┤
                         │                                │
                 submitServiceReport           updateTicket (temp fix)
                         │                                │
                         ▼                                ▼
               PENDING VERIFICATION              OPEN (+ TF entry)
                         │
                 managerVerifyReport
                         │
                         ▼                   voidTicket
                       CLOSED ◄─────────────────────────── any
                                                          │
                                                         VOID
```

---

## Appendix C: Dual-Write Verification Checklist

Every action in the STATE-CHANGE categories above must include both of the following before returning to caller:

- [ ] `appendToMasterLog_(ticketNo, action, status, actor, notes, ...)` called
- [ ] `appendToTicketHistory_(ticketNo, eventType, actor, fieldChanged, oldVal, newVal, notes)` called

If either call throws, the entire action must roll back (or at minimum log the partial failure). In new Phase 5 code, wrap both writes in a `try/catch` that surfaces the error to the UI rather than silently swallowing it.
