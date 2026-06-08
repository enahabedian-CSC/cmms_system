# Schema Diff — Column-by-Column Comparison
**Round 7 Step 0 | Container Supply Co. CMMS**
**Produced:** 2026-06-08

Three schemas compared:
- **Izzy Old** = commit `c5d262b`
- **Izzy New** = commit `6494fdc` (current files on disk)
- **Copy App** = `backend/Config.gs` (CMMS v5.0)

---

## 1. Master Log (ML) — 36/37 Columns

| Col | Izzy Old | Izzy New | Copy App | Notes |
|-----|----------|----------|----------|-------|
| 1 | ROW_ID | ROW_ID | ROW_ID | Match |
| 2 | TICKET_NO | TICKET_NO | TICKET_NO | Match |
| 3 | TIMESTAMP | TIMESTAMP | TIMESTAMP | Match |
| 4 | ACTION | ACTION | ACTION | Match |
| 5 | STATUS | STATUS | STATUS | Match; **status string values differ — see table below** |
| 6 | DEPT | DEPT | DEPT | Match |
| 7 | BUILDING_ZONE | BUILDING_ZONE | BUILDING_ZONE | Match |
| 8 | EQUIP_TYPE | EQUIP_TYPE | EQUIP_TYPE | Match |
| 9 | EQUIP_CODE | EQUIP_CODE | EQUIP_CODE | Match |
| 10 | SPECIFIC_EQUIP | SPECIFIC_EQUIP | SPECIFIC_EQUIP | Match |
| 11 | DOWNTIME_TYPE | DOWNTIME_TYPE | DOWNTIME_TYPE | Match |
| 12 | PRIORITY | PRIORITY | PRIORITY | Match |
| 13 | DESCRIPTION | DESCRIPTION | DESCRIPTION | Match |
| 14 | ASSIGNED_TO | ASSIGNED_TO | ASSIGNED_TO | Match |
| 15 | EST_HOURS | EST_HOURS | EST_HOURS | Match |
| 16 | ACTUAL_HOURS | ACTUAL_HOURS | ACTUAL_HOURS | Match |
| 17 | DATE_OPENED | DATE_OPENED | DATE_OPENED | Match |
| 18 | DATE_COMPLETED | DATE_COMPLETED | DATE_COMPLETED | Match |
| 19 | DATE_CLOSED | DATE_CLOSED | DATE_CLOSED | Match |
| 20 | CORRECTIVE_ACT | CORRECTIVE_ACT | CORRECTIVE_ACT | Match |
| 21 | ROOT_CAUSE | ROOT_CAUSE | ROOT_CAUSE | Match |
| **22** | **WORK_SUMMARY** | **PREVENTIVE_ACT** | **WORK_SUMMARY** | **⚠️ BREAKING — Izzy new renamed; copy app keeps old name** |
| 23 | FIX_TYPE | FIX_TYPE | FIX_TYPE | Match |
| 24 | TEMP_FIX_FLAG | TEMP_FIX_FLAG | TEMP_FIX_FLAG | Match |
| 25 | PARTS_NEEDED | PARTS_NEEDED | PARTS_NEEDED | Match |
| 26 | PARTS_STATUS | PARTS_STATUS | PARTS_STATUS | Match |
| 27 | EQUIP_TAG_STATUS | EQUIP_TAG_STATUS | EQUIP_TAG_STATUS | Match |
| 28 | VERIFIED_BY | VERIFIED_BY | VERIFIED_BY | Match |
| 29 | VERIFIED_DATE | VERIFIED_DATE | VERIFIED_DATE | Match |
| 30 | ADDED_BY | ADDED_BY | ADDED_BY | Match |
| 31 | UPDATED_BY | UPDATED_BY | UPDATED_BY | Match |
| 32 | NOTES | NOTES | NOTES | Match |
| 33 | PROBLEM_TYPE | PROBLEM_TYPE | PROBLEM_TYPE | Match |
| 34 | TRACKER_GROUP | TRACKER_GROUP | TRACKER_GROUP | Match |
| 35 | LINE_NO | LINE_NO | LINE_NO | Match |
| 36 | VERIFICATION_CHECKLIST | VERIFICATION_CHECKLIST | VERIFICATION_CHECKLIST | Match |
| **37** | *(absent)* | *(absent)* | **PHOTO_URL** | Copy app only — NEW |

**ML_COLS:** Izzy old = 36, Izzy new = 36, Copy app = 37

### ML Status String Values (col 5)

| Status | Izzy Old | Izzy New | Copy App | Notes |
|--------|----------|----------|----------|-------|
| `'WAITING'` | Yes | Yes | Yes | Match |
| `'OPEN'` | Yes | Yes | Yes | Match |
| `'COMPLETE'` | Yes | Yes | Legacy read only | Izzy's canonical post-work state |
| `'PENDING VERIFICATION'` | No | No | Yes (written) | Copy app's name for same state — mismatch |
| `'CLOSED'` | Yes | Yes | Yes | Match |
| `'IN PROGRESS'` | Yes | Yes | Not written | Izzy has it; copy does not write it |
| `'ON HOLD'` | Yes | Yes | Yes | Match |
| `'PENDING PARTS'` | Yes | Yes | Yes | Match |
| `'IN REVIEW'` | Yes | Yes | Not written | Izzy only |
| `'VOIDED'` | No | No | Yes | Copy app only |

---

## 2. Tracker / Queue (TK) — 26 Columns

Identical in all three versions. No divergence.

| Col | Name |
|-----|------|
| 1 | TICKET_NO |
| 2 | STATUS |
| 3 | PRIORITY |
| 4 | DEPT |
| 5 | BUILDING_ZONE |
| 6 | EQUIP_TYPE |
| 7 | EQUIP_CODE |
| 8 | SPECIFIC_EQUIP |
| 9 | DOWNTIME_TYPE |
| 10 | PROBLEM_TYPE |
| 11 | DESCRIPTION |
| 12 | LINE_NO |
| 13 | ASSIGNED_TO |
| 14 | EST_HOURS |
| 15 | ACTUAL_HOURS |
| 16 | DATE_OPENED |
| 17 | LAST_UPDATED |
| 18 | FIX_TYPE |
| 19 | TEMP_FIX_FLAG |
| 20 | PARTS_NEEDED |
| 21 | PARTS_STATUS |
| 22 | VERIFIED_BY |
| 23 | VERIFIED_DATE |
| 24 | ADDED_BY |
| 25 | UPDATED_BY |
| 26 | NOTES |

---

## 3. EMRL / Closed Tickets — Three Incompatible Layouts

### Izzy Old — EMRL appended to TK (cols 28–37, total 37 cols)

| Sheet Col | Field | EMRL Constant |
|-----------|-------|---------------|
| 1–26 | TK columns (26) | — |
| 27 | *(row marker / gap)* | — |
| 28 | Repair Date | EMRL_REPAIR_DATE |
| 29 | Parts Used | EMRL_PARTS_USED |
| 30 | Root Cause | EMRL_ROOT_CAUSE |
| 31 | Corrective Action | EMRL_CORRECTIVE |
| 32 | Preventive Action | EMRL_PREVENTIVE |
| 33 | CA Date | EMRL_CA_DATE |
| 34 | CAPA Required | EMRL_CAPA_REQ |
| 35 | Clearance Checklist | EMRL_CLEARANCE_CHK |
| 36 | Had Temp Fix | EMRL_HAD_TEMP_FIX |
| 37 | TF Resolved Date | EMRL_TF_RESOLVED |

### Izzy New — CS_ 31-column restructured layout

Old EMRL constants deprecated ("LEGACY EMRL OFFSET CONSTANTS — kept for reference only").

| Sheet Col | CS Constant | Header |
|-----------|-------------|--------|
| 1 | *(row marker)* | # |
| 2 | CS_TICKET_NO | Ticket # |
| 3 | CS_STATUS | Ticket Status |
| 4 | CS_PRIORITY | Priority |
| 5 | CS_DEPT | Department |
| 6 | CS_BUILDING_ZONE | Building / Zone |
| 7 | CS_EQUIP_TYPE | Equipment Type |
| 8 | CS_EQUIP_CODE | Equip Code |
| 9 | CS_SPECIFIC_EQUIP | Equipment Description |
| 10 | CS_DOWNTIME_TYPE | Downtime Type |
| 11 | CS_ADDED_BY | Added By |
| 12 | CS_DATE_OPENED | Date Opened |
| 13 | CS_PROBLEM_TYPE | Problem Type |
| 14 | CS_DESCRIPTION | Problem Description |
| 15 | CS_LINE_NO | Line # |
| 16 | CS_EST_HOURS | Est Hrs |
| 17 | CS_ACTUAL_HOURS | Act Hrs |
| 18 | CS_REPAIR_COMPLETE | Repair Complete |
| 19 | CS_COMPLETED_BY | Completed By |
| 20 | CS_REPAIR_DATE | Repair Date |
| 21 | CS_PARTS_USED | Parts Used |
| 22 | CS_CORRECTIVE | Corrective Action |
| 23 | CS_CAPA_REQ | CAPA Required |
| 24 | CS_ROOT_CAUSE | Root Cause |
| 25 | CS_PREVENTIVE | Preventive Action |
| 26 | CS_CHECKLIST | Verification Checklist |
| 27 | CS_VERIFIED_BY | Verified By |
| 28 | CS_VERIFIED_DATE | Verified Date |
| 29 | CS_NOTES | Notes |
| 30–31 | *(unnamed)* | — |

### Copy App — EMRL object (cols 28–37)

**Identical to Izzy Old.** The copy app's `backend/EMRL.gs` defines:

```javascript
var EMRL = {
  REPAIR_DATE:28, PARTS_USED:29, ROOT_CAUSE:30, CORRECTIVE_ACT:31,
  PREVENTIVE_ACT:32, CA_DATE:33, CAPA_REQUIRED:34, CLEARANCE_CHK:35,
  HAD_TEMP_FIX:36, TF_RESOLVED_DATE:37
};
```

**The copy app's Closed Tickets layout matches Izzy OLD, not Izzy NEW.** Running Izzy's `migrateClosedTab_()` on the copy sheet would corrupt data. Decision needed on whether to stay on Izzy Old layout or migrate to Izzy New CS_ layout.

---

## 4. Report Database (RDB) — 27 Columns

Identical between Izzy new and copy app. No divergence.

| Col | Name | Notes |
|-----|------|-------|
| 1 | REPORT_ID | |
| 2 | TICKET_NO | |
| 3 | DATE | |
| 4 | DEPT | |
| 5 | BUILDING_ZONE | |
| 6 | EQUIP_TYPE | |
| 7 | EQUIP_CODE | |
| 8 | SPECIFIC_EQUIP | |
| 9 | PROBLEM_DESC | |
| 10 | ROOT_CAUSE | |
| 11 | CORRECTIVE_ACT | |
| 12 | PREVENTIVE_ACT | Already present here in both systems |
| 13 | WORK_SUMMARY | Also present here; RDB has both PREVENTIVE_ACT and WORK_SUMMARY |
| 14 | FIX_TYPE | |
| 15 | TEMP_FIX_FLAG | |
| 16 | PARTS_USED | |
| 17 | LABOR_HOURS | |
| 18 | ADDED_BY | |
| 19 | COMPLETED_BY | |
| 20 | VERIFIED_BY | |
| 21 | VERIFIED_DATE | |
| 22 | UPDATED_BY | |
| 23 | PRIORITY | |
| 24 | DOWNTIME_TYPE | |
| 25 | IMAGE_LINKS | |
| 26 | PDF_LINK | |
| 27 | NOTES | |

---

## 5. Ticket History (TH) — 8 Columns

Identical in all versions.

| Col | Name |
|-----|------|
| 1 | HIST_ID |
| 2 | TICKET_NO |
| 3 | TIMESTAMP |
| 4 | EVENT_TYPE |
| 5 | STATUS_FROM |
| 6 | STATUS_TO |
| 7 | PERFORMED_BY |
| 8 | NOTES |

### TH_EVENTS Vocabulary

| Event | Izzy New | Copy App |
|-------|----------|----------|
| CREATED | Yes | Yes |
| UPDATED | Yes | Yes |
| ASSIGNED | Yes | Yes |
| COMPLETED | Yes | Yes |
| VERIFIED | Yes | Yes |
| CLOSED | Yes | Yes |
| EQUIPMENT TAGGED | Yes | Yes |
| PARTS REQUESTED | Yes | Yes |
| PARTS UPDATED | Yes | Yes |
| TEMP FIX FLAGGED | Yes | Yes |
| MOVED TO WAITING | Yes | Yes |
| MOVED TO OPEN | Yes | Yes |
| VOIDED | **No** | **Yes** — copy app only |
| TAG CLEARED | **No** | **Yes** — copy app only |
| TEMP FIX CLEARED | **No** | **Yes** — copy app only |
| TEMP FIX INSPECTED | **No** | **Yes** — copy app only |
| REROUTED | **No** | **Yes** — copy app only |
| DIRECT EDIT | **No** | **Yes** — copy app only |
| Service Report | **No** | **Yes** — copy app only |
| PENDING VERIFICATION | **No** | **Yes** — copy app only |

New events required this round (not yet in either system):
- MAKE JOINT (Change 1) — NEW; flag if a new event name is unavoidable
- DEPT SIGNED OFF (Change 1) — NEW
- TRANSFER CONFIRMED (Change 3) — confirm exact name from legacy vocabulary

---

## 6. Other Tables — No Divergence

| Table | Cols | Status |
|-------|------|--------|
| TF (Temp Fix Monitor) | 18 | Identical in all three |
| PN (Parts Needed) | 12 | Identical in all three |
| EHL (Equipment Hold Log) | 14 | Identical in all three |
| TL (Transfer Log) | 8 | Identical in all three |

---

## 7. New Fields Required This Round

Fields that do not exist in Izzy or copy app and must be added and documented in FIELD_MAPPING.md:

| Field | Purpose | Change # | Add to Tab(s) | Izzy Has? |
|-------|---------|---------|---------------|-----------|
| JOINT_DEPTS | Comma-separated list of attached departments | 1 | ML, TK | No — NEW |
| JOINT_SIGNOFFS | JSON of per-dept sign-off timestamps/actors | 1 | ML | No — NEW |
| PERM_FIX_PLAN | Description of planned permanent fix | 8 | ML, TF | No — NEW |
| PERM_FIX_DATE | Target date for permanent fix | 8 | ML, TF | No — NEW |
| DOWNTIME_DURATION | Minutes of unplanned downtime | 16 | ML | No — NEW |

Fields present in Izzy that the copy app needs to add or reconcile:

| Field | Izzy location | Copy App location | Action |
|-------|--------------|-------------------|--------|
| PREVENTIVE_ACT | ML col 22 | Absent from ML (col 22 = WORK_SUMMARY) | Add PREVENTIVE_ACT to ML; decide col position |
| sendTicketCompleteEmail_ | Code.js function | Absent | Implement equivalent |
| sendPartsNeededEmail_ | Code.js function | Absent | Implement equivalent |
| Server-side checklist guard | managerVerifyTicket() | Absent in verifyAndCloseTicket() | Add; pending FLAG-1 decision |
