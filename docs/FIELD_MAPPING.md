# Field Mapping — Izzy-Schema Adapter Contract
**Round 7 Step 0 | Container Supply Co. CMMS**
**Produced:** 2026-06-08

This document defines the exact field-by-field translation at every boundary where data crosses between Izzy's canonical system and the copy app. The primary boundary is `IzzySync.gs` which reads from Izzy's live tracker (read-only) and writes into the copy sheet.

**Security note:** Izzy's live sheet `1yyqt0HiHejtjP3cVccL9r2YCGsMM6kjKdxt3t9Omxj4` is **never written to**. All mappings below describe copy-app ← Izzy reads only.

---

## Adapter Zones

| Zone | Direction | File |
|------|-----------|------|
| Zone 1: ML Row | Izzy ML → Copy ML | `IzzySync.gs` |
| Zone 2: Tracker Row | Izzy Tracker → Copy Tracker | `IzzySync.gs` |
| Zone 3: EMRL/Closed | Izzy Closed → Copy Closed | `IzzySync.gs` |
| Zone 4: Forms Outbound | Copy server → HTML forms | `TicketQueries.gs`, `TicketLifecycle.gs` |

---

## Zone 1: Master Log Row Adapter

| Izzy Col | Izzy Field | Copy Col | Copy Field | Rule |
|----------|-----------|----------|-----------|------|
| 1 | ROW_ID | 1 | ROW_ID | Direct copy |
| 2 | TICKET_NO | 2 | TICKET_NO | Direct copy |
| 3 | TIMESTAMP | 3 | TIMESTAMP | Direct copy |
| 4 | ACTION | 4 | ACTION | Direct copy |
| 5 | STATUS | 5 | STATUS | **Translate** — see Status Translation Table below |
| 6 | DEPT | 6 | DEPT | Direct copy; normalize via `normalizeDept()` |
| 7 | BUILDING_ZONE | 7 | BUILDING_ZONE | Direct copy |
| 8 | EQUIP_TYPE | 8 | EQUIP_TYPE | Direct copy |
| 9 | EQUIP_CODE | 9 | EQUIP_CODE | Direct copy |
| 10 | SPECIFIC_EQUIP | 10 | SPECIFIC_EQUIP | Direct copy |
| 11 | DOWNTIME_TYPE | 11 | DOWNTIME_TYPE | Direct copy |
| 12 | PRIORITY | 12 | PRIORITY | Direct copy; validate against PRIORITY_CONFIG |
| 13 | DESCRIPTION | 13 | DESCRIPTION | Direct copy |
| 14 | ASSIGNED_TO | 14 | ASSIGNED_TO | Direct copy |
| 15 | EST_HOURS | 15 | EST_HOURS | Direct copy |
| 16 | ACTUAL_HOURS | 16 | ACTUAL_HOURS | Direct copy |
| 17 | DATE_OPENED | 17 | DATE_OPENED | Direct copy; ensure `MM/DD/YYYY` format |
| 18 | DATE_COMPLETED | 18 | DATE_COMPLETED | Direct copy |
| 19 | DATE_CLOSED | 19 | DATE_CLOSED | Direct copy |
| 20 | CORRECTIVE_ACT | 20 | CORRECTIVE_ACT | Direct copy |
| 21 | ROOT_CAUSE | 21 | ROOT_CAUSE | Direct copy |
| **22** | **PREVENTIVE_ACT** | **22** | **WORK_SUMMARY** | **⚠️ CONFLICT — see Note A below** |
| 23 | FIX_TYPE | 23 | FIX_TYPE | Direct copy |
| 24 | TEMP_FIX_FLAG | 24 | TEMP_FIX_FLAG | Direct copy |
| 25 | PARTS_NEEDED | 25 | PARTS_NEEDED | Direct copy |
| 26 | PARTS_STATUS | 26 | PARTS_STATUS | Direct copy |
| 27 | EQUIP_TAG_STATUS | 27 | EQUIP_TAG_STATUS | Direct copy |
| 28 | VERIFIED_BY | 28 | VERIFIED_BY | Direct copy |
| 29 | VERIFIED_DATE | 29 | VERIFIED_DATE | Direct copy |
| 30 | ADDED_BY | 30 | ADDED_BY | Direct copy |
| 31 | UPDATED_BY | 31 | UPDATED_BY | Direct copy |
| 32 | NOTES | 32 | NOTES | Direct copy |
| 33 | PROBLEM_TYPE | 33 | PROBLEM_TYPE | Direct copy |
| 34 | TRACKER_GROUP | 34 | TRACKER_GROUP | Direct copy |
| 35 | LINE_NO | 35 | LINE_NO | Direct copy |
| 36 | VERIFICATION_CHECKLIST | 36 | VERIFICATION_CHECKLIST | Direct copy |
| *(absent)* | — | 37 | PHOTO_URL | Set to `''` when reading from Izzy |

### Note A — Col 22 Conflict Resolution

**Problem:** Izzy new ML col 22 = `PREVENTIVE_ACT`. Copy app ML col 22 = `WORK_SUMMARY`. When IzzySync reads Izzy row col 22, it contains Preventive Action data; the copy app stores it in WORK_SUMMARY — wrong.

**Resolution options (decision needed before build):**

| Option | Description | Recommendation |
|--------|-------------|----------------|
| **Option 1** (preferred) | Add `PREVENTIVE_ACT` as copy ML col 38; shift PHOTO_URL to col 39; ML_COLS = 39. IzzySync maps Izzy col 22 → copy `ML.PREVENTIVE_ACT`. Copy `ML.WORK_SUMMARY` set to `''` on Izzy sync rows. | Best — preserves both fields, no data loss |
| Option 2 (minimal) | Read Izzy col 22, prefix as `[PREV_ACT: {value}]`, append to copy `ML.NOTES`. | Lossy; not recommended |
| Option 3 (discard) | Set copy col 22 to `''` when syncing from Izzy. | Loses all Preventive Action data — not acceptable for SQF |

### Status Translation Table

| Izzy STATUS value | Copy App equivalent | Translation at IzzySync boundary |
|-------------------|--------------------|---------------------------------|
| `'WAITING'` | `'WAITING'` | Pass through |
| `'OPEN'` | `'OPEN'` | Pass through |
| `'COMPLETE'` | `'PENDING VERIFICATION'` | Translate if copy keeps PV string; OR adopt `'COMPLETE'` and pass through |
| `'CLOSED'` | `'CLOSED'` | Pass through |
| `'IN PROGRESS'` | `'OPEN'` | Translate (copy has no IN PROGRESS) |
| `'ON HOLD'` | `'ON HOLD'` | Pass through |
| `'PENDING PARTS'` | `'PENDING PARTS'` | Pass through |
| `'IN REVIEW'` | `'OPEN'` | Translate (copy has no IN REVIEW) |

---

## Zone 2: Tracker Row Adapter

All 26 TK columns are identical. No structural translation required.

| Field | Rule |
|-------|------|
| TK.STATUS (col 2) | Apply same status translation as Zone 1 |
| TK.DEPT (col 4) | Run through `normalizeDept()` |
| TK.PRIORITY (col 3) | Validate: must be `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW` |

---

## Zone 3: EMRL / Closed Tickets Row Adapter

**The copy app's Closed Tickets layout matches Izzy Old (37-col EMRL). Izzy New uses the 31-col CS_ layout.** IzzySync must detect which layout the source is using.

### Detection Heuristic (run on first read of Izzy Closed tab header row)
- Column 18 header = `'Fix Type'` → old EMRL layout (37-col)
- Column 18 header = `'Repair Complete'` → new CS_ layout (31-col)

### Old EMRL Layout (Izzy Old → Copy)
All 37 columns map 1:1. No translation needed (layouts identical).

### New CS_ Layout (Izzy New → Copy EMRL)

| Izzy CS Col | CS Constant | Maps to Copy EMRL/TK Col | Copy Field | Notes |
|-------------|-------------|--------------------------|-----------|-------|
| 2 | CS_TICKET_NO | TK col 1 | TICKET_NO | |
| 3 | CS_STATUS | TK col 2 | STATUS | Apply status translation |
| 4 | CS_PRIORITY | TK col 3 | PRIORITY | |
| 5 | CS_DEPT | TK col 4 | DEPT | |
| 6 | CS_BUILDING_ZONE | TK col 5 | BUILDING_ZONE | |
| 7 | CS_EQUIP_TYPE | TK col 6 | EQUIP_TYPE | |
| 8 | CS_EQUIP_CODE | TK col 7 | EQUIP_CODE | |
| 9 | CS_SPECIFIC_EQUIP | TK col 8 | SPECIFIC_EQUIP | |
| 10 | CS_DOWNTIME_TYPE | TK col 9 | DOWNTIME_TYPE | |
| 11 | CS_ADDED_BY | TK col 24 | ADDED_BY | Position shift |
| 12 | CS_DATE_OPENED | TK col 16 | DATE_OPENED | Position shift |
| 13 | CS_PROBLEM_TYPE | TK col 10 | PROBLEM_TYPE | Position shift |
| 14 | CS_DESCRIPTION | TK col 11 | DESCRIPTION | Position shift |
| 15 | CS_LINE_NO | TK col 12 | LINE_NO | Position shift |
| 16 | CS_EST_HOURS | TK col 14 | EST_HOURS | Position shift |
| 17 | CS_ACTUAL_HOURS | TK col 15 | ACTUAL_HOURS | Position shift |
| 18 | CS_REPAIR_COMPLETE | *(no equiv)* | — | Drop or append to NOTES |
| 20 | CS_REPAIR_DATE | EMRL col 28 | REPAIR_DATE | |
| 21 | CS_PARTS_USED | EMRL col 29 | PARTS_USED | |
| 22 | CS_CORRECTIVE | EMRL col 31 | CORRECTIVE_ACT | |
| 23 | CS_CAPA_REQ | EMRL col 34 | CAPA_REQUIRED | |
| 24 | CS_ROOT_CAUSE | EMRL col 30 | ROOT_CAUSE | |
| 25 | CS_PREVENTIVE | EMRL col 32 | PREVENTIVE_ACT | |
| 26 | CS_CHECKLIST | EMRL col 35 | CLEARANCE_CHK | |
| 27 | CS_VERIFIED_BY | TK col 22 | VERIFIED_BY | |
| 28 | CS_VERIFIED_DATE | TK col 23 | VERIFIED_DATE | |
| 29 | CS_NOTES | TK col 26 | NOTES | |

Cols 30–31 in CS_ layout: drop.

---

## Zone 4: Form Data Object — Ticket Object Properties

| JS Property | Source ML Col | Izzy Col Name | Notes |
|-------------|---------------|---------------|-------|
| `ticketNo` | 2 | TICKET_NO | |
| `status` | 5 | STATUS | Apply status translation |
| `dept` | 6 | DEPT | |
| `buildingZone` | 7 | BUILDING_ZONE | |
| `equipType` | 8 | EQUIP_TYPE | |
| `equipCode` | 9 | EQUIP_CODE | |
| `specificEquip` | 10 | SPECIFIC_EQUIP | |
| `downtimeType` | 11 | DOWNTIME_TYPE | |
| `priority` | 12 | PRIORITY | |
| `description` | 13 | DESCRIPTION | |
| `assignedTo` | 14 | ASSIGNED_TO | |
| `estHours` | 15 | EST_HOURS | |
| `actualHours` | 16 | ACTUAL_HOURS | |
| `dateOpened` | 17 | DATE_OPENED | |
| `dateCompleted` | 18 | DATE_COMPLETED | |
| `dateClosed` | 19 | DATE_CLOSED | |
| `correctiveAct` | 20 | CORRECTIVE_ACT | |
| `rootCause` | 21 | ROOT_CAUSE | |
| `preventiveAction` | 22 (Izzy) / TBD (copy) | PREVENTIVE_ACT | **Pending Note A decision** |
| `workSummary` | 22 (copy only) | WORK_SUMMARY | Copy app only; Izzy dropped this field from ML |
| `fixType` | 23 | FIX_TYPE | |
| `tempFixFlag` | 24 | TEMP_FIX_FLAG | |
| `partsNeeded` | 25 | PARTS_NEEDED | |
| `partsStatus` | 26 | PARTS_STATUS | |
| `equipTagStatus` | 27 | EQUIP_TAG_STATUS | |
| `verifiedBy` | 28 | VERIFIED_BY | |
| `verifiedDate` | 29 | VERIFIED_DATE | |
| `addedBy` | 30 | ADDED_BY | |
| `updatedBy` | 31 | UPDATED_BY | |
| `notes` | 32 | NOTES | |
| `problemType` | 33 | PROBLEM_TYPE | |
| `trackerGroup` | 34 | TRACKER_GROUP | |
| `lineNo` | 35 | LINE_NO | |
| `verificationChecklist` | 36 | VERIFICATION_CHECKLIST | |
| `photoUrl` | 37 (copy only) | PHOTO_URL | Copy app only; absent from Izzy |

---

## New Fields — This Round (not in Izzy; require documentation)

| Field | JS Property | Add to Tab(s) | Proposed Col | Justification | Change # |
|-------|-------------|---------------|-------------|---------------|---------|
| JOINT_DEPTS | `jointDepts` | ML, TK | TBD (append to ML) | Multi-dept joint ticket membership; Izzy has no equivalent | 1 |
| JOINT_SIGNOFFS | `jointSignoffs` | ML | TBD (append to ML) | Per-dept sign-off actor/timestamp JSON; Izzy has no equivalent | 1 |
| PERM_FIX_PLAN | `permFixPlan` | ML, TF | TBD (append to TF, add to ML) | Permanent fix plan required when temp fix flagged | 8 |
| PERM_FIX_DATE | `permFixDate` | ML, TF | TBD (append to TF, add to ML) | Target date for permanent fix | 8 |
| DOWNTIME_DURATION | `downtimeDuration` | ML | TBD (append to ML) | Minutes of unplanned downtime; data capture only this round | 16 |

---

## Verification Checklist Enforcement Contract

**Server-side guard required before any CLOSED transition.** Items to validate are pending FLAG-1 decision in GAP_REPORT.md.

**Izzy's actual items (what Izzy enforces):**
```javascript
var required = [
  'Work completed satisfactorily',
  'Area cleaned and safe',
  'No food safety risk identified'
];
```

**Brief's specified items (what Change 6 describes — 4 items):**
- Tools removed
- Sanitation done
- Work completed
- Name + date

These are different. Michael must confirm which set to enforce. The copy app implementation of this guard must wait for that answer.

Validation logic (server-side, once items are confirmed):
```javascript
var checklistStr = String(data.sqfChecklist || data.verificationChecklist || '');
if (!required.every(function(item){ return checklistStr.indexOf(item) >= 0; })) {
  return { success: false, error: 'Verification checklist incomplete — all required items must be confirmed before closing.' };
}
```

---

## Priority Constant Contract

Both systems use identical priority key strings:

| Key | Color | Priority Order |
|-----|-------|----------------|
| `'CRITICAL'` | `#B71C1C` | 1 (highest) |
| `'HIGH'` | `#E64A19` | 2 |
| `'MEDIUM'` | `#F9A825` | 3 |
| `'LOW'` | `#1565C0` | 4 (note: blue, not green — changed per "ITEM 7B" in Izzy's Code.js) |

---

## Ticket Number Format Contract

Format: `{DEPT_CODE}-{YYYYMM}-{NNNN}`

| Dept | Code |
|------|------|
| ELECTRICAL | EL |
| MACHINE SHOP | MS |
| FACILITIES | FAC |
| PLASTICS | PL |
| METALS | MTL |
| LITHO | LTH |

Both systems use `generateTicketNumber(dept, date)` with identical logic. External import tickets from Izzy's system retain their original numbers for idempotency.
