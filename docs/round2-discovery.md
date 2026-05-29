# Round 2 Discovery Audit — CSC CMMS v5.0

**Branch:** `claude/peaceful-johnson-KN73v`  
**Snapshot:** `backup/pre-round2-20260529` (pushed — known-good restore point)  
**Date:** 2026-05-29  
**Status:** REVIEW COMPLETE (2026-05-29) — Q1/Q2/Q4/Q6 answered; Q3 partially answered; Q5 deferred. Fix code proceeding.

---

## 0. Pre-flight Checks

| Check | Result |
|---|---|
| Current branch | `claude/peaceful-johnson-KN73v` |
| Working tree | Clean — nothing uncommitted |
| Backup branch | `backup/pre-round2-20260529` pushed to origin |
| clasp scriptId (`.clasp.json`) | `1MZXV02jKQMZINVB_gV5sXayKccMGMTt9F7l64o-TmnI86dsbpGn9dLhz` (dev/copy script — confirmed ≠ live production ID) |
| Live production sheet in code | `Config.gs` explicitly says live IDs (`1yyqt0HiH...`, `1wLnVe...`) "are NEVER read from, written to, or referenced anywhere in new code." Dev work is safe. |
| `.jsx` files in `design/` | React mockups — design reference only, not production code |

---

## 1. Repo Orientation — File Map

### Backend (`.gs` files in `backend/`)

| File | Owns |
|---|---|
| `Config.gs` | All sheet-name constants, column indices, dept mapping, tech directory, manager access reader, data-list reader — single source of truth |
| `Auth.gs` | SSO identity resolution, role assignment (`ROLES`), `requireRole_` guards |
| `WebApp.gs` | `doGet()` entry point, `include_()` template helper |
| `TicketSubmission.gs` | `addNewTicket()` — internal ticket creation, `writeTicketToSheet_`, `buildTkRow_`, `logPartsNeeded_` |
| `TicketLifecycle.gs` | All state transitions: approve, complete, verifyAndClose, void, assign, flagTempFix, transfer; sheet-manipulation helpers (`removeTicketFromSheet_`, `_updateTicketInSheets_`, `_moveTicketToClosed_`, `_logTempFix_`) |
| `TicketQueries.gs` | Read-only: `getQueueTickets`, `getTicketDetail`, `getClosedTickets`, `_mergeAndFilter_` |
| `MonitoringViews.gs` | Temp Fix Monitor, Equipment Hold Log, Parts Needed — read + update |
| `Dashboard.gs` | `getDashboardCounts()`, `getDashboardTrend()` — home KPI aggregation |
| `Reports.gs` | `getReportData()` — dept-level stats for the Reports tab |
| `ExternalSync.gs` | `syncExternalTickets()` — polls external Google Form response sheet |
| `EquipRegistry.gs` | Equipment cache refresh, `getEquipmentHierarchy()`, `getEquipmentFlatList()` |
| `Email.gs` | `sendNewTicketManagerNotification_()` and temp-fix alert emails |
| `AdminViews.gs` | `getAdminViewData(view)` — read-only admin panel data; no sheet writes from code |
| `Setup.gs` | One-time sheet setup scaffolding |
| `Utilities.gs` | ID generators, timestamp formatters, `appendToMasterLog_()`, `appendToTicketHistory_()`, `getLatestMlRow_()`, `getOriginalMlRow_()`, `findTicketRowInSheet_()` |

### Frontend (partials in `frontend/`)

| File | Screen / PAGES registered |
|---|---|
| `frontend/index.html` | App shell: sidebar, topbar, nav, `navigate()`, home page, init |
| `frontend/partials/submit-ticket.html` | `PAGES['submit']` — 3-step ticket form |
| `frontend/partials/ticket-list.html` | `PAGES['waiting']`, `PAGES['open']`, `PAGES['tracker-{dept}']` (all 6) |
| `frontend/partials/ticket-detail.html` | `openTicketDetail()` slide-over overlay + lifecycle action modals |
| `frontend/partials/monitoring.html` | `PAGES['tempfix']`, `PAGES['equipment-hold']`, `PAGES['parts']` |
| `frontend/partials/closed-tickets.html` | `PAGES['closed']` |
| `frontend/partials/reports.html` | `PAGES['reports']` |
| `frontend/partials/admin.html` | `PAGES['admin-config']`, `PAGES['admin-access']`, `PAGES['admin-deptmap']` |
| `frontend/access-denied.html` | Access-denied / lock page |

### Design mockup → Production file

| Mockup | Maps to production |
|---|---|
| `shell.jsx` — Sidebar/nav with expandable sub-sections | `frontend/index.html` `buildNav()` + CSS |
| `01-login.jsx` | `frontend/access-denied.html` |
| `02-home.jsx` | `frontend/index.html` home PAGES renderer + `Dashboard.gs` |
| `03-tickets-lists.jsx` | `frontend/partials/ticket-list.html` + `TicketQueries.gs` |
| `04-ticket-detail.jsx` | `frontend/partials/ticket-detail.html` + `TicketLifecycle.gs` |
| `05-submit.jsx` | `frontend/partials/submit-ticket.html` + `TicketSubmission.gs` |
| `06-tracker.jsx` | `frontend/partials/ticket-list.html` (tracker mode) + `TicketQueries.gs` |
| `07-closed-tempfix.jsx` | `frontend/partials/closed-tickets.html` + `frontend/partials/monitoring.html` |
| `08-parts-equipment.jsx` | `frontend/partials/monitoring.html` (parts + equip-hold) |
| `09-reports.jsx` | `frontend/partials/reports.html` + `Reports.gs` |
| `10-admin.jsx` | `frontend/partials/admin.html` + `AdminViews.gs` |

---

## 2. Bug 1 — Nav Sections / Accordion Behavior

### Actual production behavior
`buildNav()` in `frontend/index.html` renders a **flat nav** — all items are top-level `nav-item` elements grouped under non-interactive `nav-section-label` headers. There are **no collapsible sub-sections, no expand/collapse toggles, and no accordion state**.

The 6 dept-tracker items are all rendered as individual flat nav items. The nav is scrollable via `.sidebar-nav{overflow-y:auto}`.

### What the mockup shows
`design/shell.jsx` has a React accordion: "Tickets", "Trackers", "Equipment", "Admin" sections each have sub-items that expand/collapse. `openSec` state tracks which section is open. The bug in the *mockup design* is `setOpenSec({ ...openSec, [n.id]: !open })` — spreading the old state means multiple sections can be open simultaneously; clicking section B doesn't close section A.

### Root cause
**The production nav has no expandable sections.** The reported bug — "opening one nav section, then another, leaves the first open" — describes behavior that does not yet exist in production. This is a **missing feature**, not a regression.

### What needs to be built (Bug 1 fix)
Implement accordion sub-sections in `buildNav()` matching the mockup's groupings:
- **Tickets** sub-items: Waiting Queue, Open Tickets, Closed Tickets
- **Dept Trackers** sub-items: (owned depts, scoped per user role)
- **Monitoring** sub-items: Temp Fix Monitor, Equipment Hold, Parts Needed
- **Reports** (flat item — managers only)
- **Admin** sub-items: Configuration, Access & Roles, Dept Map (admins only)
- **PM** (greyed-out placeholder)

Accordion rule: opening a section closes all others (only one open at a time). Active sub-item keeps its parent section open.

### ⚠️ No backend impact. Frontend only.

---

## 3. Bug 2 — Horizontal Overflow / No Scroll

### Root cause — confirmed in code
All four table-wrapper elements share the same CSS pattern: **`overflow:hidden`**.

```css
/* ticket-list.html */   .tl-table-wrap { overflow: hidden; }
/* monitoring.html */    .mon-table-wrap { overflow: hidden; }
/* reports.html */       .rpt-table-wrap { overflow: hidden; }
/* closed-tickets.html */.ct-table-wrap  { overflow: hidden; }
```

`overflow:hidden` clips any table content that extends beyond the wrapper's bounds. The outer `.content{overflow:auto}` can scroll the page body, but the actual table content is clipped — it cannot scroll within the wrapper, and the clipped content cannot scroll out since the wrapper doesn't grow to accommodate it.

Wide tables that will overflow at ~1024–1280px:
- **Ticket list** (8 cols): borderline
- **Monitoring — Temp Fix** (10 cols): will overflow
- **Monitoring — Parts Needed** (10 cols): will overflow
- **Reports** (10 cols): will overflow
- **Closed Tickets** (9 cols): borderline

### Fix (CSS only)
Change `overflow:hidden` → `overflow-x:auto` on all four wrappers. One surgical change per wrapper.

### ⚠️ No backend impact. CSS only.

---

## 4. Bug 3 — Tickets Appear Only Under Metals (CRITICAL — gates KPI wiring)

### How department is written on ticket creation

**Internal tickets** (`addNewTicket`):
1. User selects a dept from a dropdown populated by `DEPT_TRACKERS.map(dt => dt.dept)` → always a canonical name (METALS, PLASTICS, etc.)
2. `dept = normalizeDept(data.dept)` — passes through the dept map; since it's already canonical, maps to itself
3. `appendToMasterLog_({dept: dept})` — stores canonical name
4. `getTrackerForDept(dept, ...)` — resolves tracker correctly

**External tickets** (`syncExternalTickets`):
1. `deptRaw` comes from column D of the external Google Form response sheet
2. External form values match `LEGACY_DEPT_CODES` keys: `"METAL"`, `"PLASTIC"`, `"LITHO"`, `"M/S"`, `"PLASTIC DEC"`, etc.
3. `dept = normalizeDept(deptRaw)` — looks up in the dept map
4. If the Dept Map entry exists → canonical name; if not → raw value stored as-is

### How the Dept Map normalizer works (`getDeptMapping_`)

```javascript
var map = {
  'ELECTRICAL':   'ELECTRICAL',   // hardcoded identity
  'FACILITIES':   'FACILITIES',   // hardcoded identity
  'LITHO':        'LITHO',        // hardcoded identity
  'MACHINE SHOP': 'MACHINE SHOP', // hardcoded identity
  'METALS':       'METALS',       // hardcoded identity
  'PLASTICS':     'PLASTICS',     // hardcoded identity
  'FACILTIIES':   'FACILITIES'    // typo correction
};
// then overlays entries from 📋 Dept Map sheet (col A → col B)
```

Note: `'METAL'` (external form value) is NOT in the hardcoded map. Only `'METALS'` is. So `normalizeDept('METAL')` = `'METAL'` (unmapped pass-through) **unless** the Dept Map sheet has a `METAL → METALS` entry.

### How the tracker filter reads back

`getQueueTickets('tracker', {dept: 'METALS'})` → `deptFilter = normalizeDept('METALS')` = `'METALS'` → filters ML where `dept === 'METALS'`.

### ✅ RESOLVED (2026-05-29) — NOT a code bug for new tickets

**Confirmed Dept Map sheet contents:**

| External value (form) | → Canonical |
|---|---|
| G&A | MACHINE SHOP |
| LITHO | LITHO |
| M/S | MACHINE SHOP |
| METAL | METALS |
| PLASTIC | PLASTICS |
| PLASTIC DEC | PLASTICS |
| QA | MACHINE SHOP |
| S/R | MACHINE SHOP |
| SALES | MACHINE SHOP |

`getDeptMapping_()` overlays these sheet entries on top of the hardcoded identity map. Since `METAL → METALS`, `PLASTIC → PLASTICS`, and `M/S → MACHINE SHOP` are in the sheet, `normalizeDept()` is working correctly for **all new external tickets**.

**Remaining risk — historical ML rows:** The legacy `backfillTrackerGroup.js` script exists in the codebase, confirming that TRACKER_GROUP was not always set correctly in early import batches. Any ML rows written before the Dept Map was fully populated may have `TRACKER_GROUP = 'METAL'` instead of `'METALS'`. This makes those tickets invisible in the Metals tracker query. A one-time `repairTrackerGroup()` function should be added to `AdminViews.gs` (admin-only, append-audit-entry, non-destructive to other columns) for the operator to run once. **This is a data-repair operation, not a ongoing code fix.**

### ⚠️ No code change needed in `Config.gs`. Add `repairTrackerGroup()` to `AdminViews.gs`.

---

## 5. Gap 6 — Master Log Integrity (CRITICAL — gates KPI wiring)

### The append-only invariant: PRESENT and CORRECT

`appendToMasterLog_()` in `Utilities.gs` always calls `sh.appendRow(row)` — it never finds-and-overwrites an existing row. Every state change writes a NEW row. The dual-write invariant (ML + Ticket History together) is enforced by every lifecycle function via `try/catch` that surfaces partial failures.

The merge logic in `getTicketDetail()` and `_mergeAndFilter_()` correctly builds the "best" view of a ticket by iterating all ML rows for a ticket and taking the last non-empty value for each column. This means the **display is always correct**.

### The partial bug: mutable fields regress in lifecycle ML rows

The bug is in how `completeTicket` and `verifyAndCloseTicket` read prior state. Both call `getOriginalMlRow_()` (first ML row) rather than a merged view for **mutable fields** that can change after creation.

**Scenario that triggers data loss in a COMPLETE/CLOSED audit row:**

1. Ticket created (ML row 1): `assignedTo = ''`, `estHours = ''`
2. Tech assigned via `assignTicket` (ML row 2): `assignedTo = 'John Smith'`, `estHours = '4'`
3. Work completed via `completeTicket` (ML row 3): reads `orig[ML.ASSIGNED_TO - 1]` = `''` (row 1 value) — **assignedTo is blank in the COMPLETE row**, even though John Smith was assigned
4. Ticket closed via `verifyAndCloseTicket` (ML row 4): reads `orig[ML.ACTUAL_HOURS - 1]` = `''` — **actualHours blank** even though completeTicket set them

Affected functions and their `getOriginalMlRow_` reads of mutable fields:

| Function | Mutable field(s) using `orig` | Bug |
|---|---|---|
| `completeTicket` | `assignedTo` (frontend doesn't pass it) | COMPLETE row may have blank assignee |
| `verifyAndCloseTicket` | `assignedTo`, `actualHours`, `workSummary`, `correctiveAct`, `rootCause`, `fixType` | CLOSED row may have blank/stale values for work fields |

`dateOpened` and `addedBy` are intentionally read from `orig` — they're immutable. That is correct.

### Gap 6 verdict: **PARTIALLY FIXED**

- ✅ Append-only (never overwrites): confirmed present
- ✅ Dual-write invariant: confirmed present in all lifecycle functions
- ✅ Display reads (getTicketDetail, getQueueTickets): correctly merge all rows, always show latest values
- ❌ COMPLETE ML row: may show blank `assignedTo` if tech was assigned post-creation
- ❌ CLOSED ML row: may show blank `assignedTo`, `actualHours`, `workSummary`, `correctiveAct`, `rootCause`, `fixType` if those were set in later ML rows (not in row 1)

### Fix

In `completeTicket` and `verifyAndCloseTicket`, replace `getOriginalMlRow_` with a merged "best" row for mutable fields. Specifically:

```javascript
// Instead of:
var orig = getOriginalMlRow_(tn) || {};
// Use:
var orig     = getOriginalMlRow_(tn) || {};
var latest   = getLatestMlRow_(tn)   || orig;
// Then use orig for immutable fields (dateOpened, addedBy, description, equipment)
// and latest for mutable fields (assignedTo, estHours, actualHours, workSummary,
//   correctiveAct, rootCause, fixType, tempFixFlag)
```

This ensures each lifecycle row captures the full current state, making each ML row a complete standalone record rather than requiring merge to read it correctly.

---

## 6. Tech → Department Association

### Current state

`getTechDirectory()` in `Config.gs` reads from the `📋 Data Lists` tab, column header `'TECHNICIANS'`. It returns a **flat array of name strings only** — no email, no department.

The comment in the code is explicit:
> "The prompt references a '👷 Tech Directory' tab that does not yet exist in the sheet. This function reads Data Lists until that tab is added."

The `getPeopleList_()` function (used in ticket submission and detail view) combines this tech list with manager names — again, no dept association.

### What is missing

- No `tech → department` mapping exists anywhere in data or code
- No tech email column (needed for SSO-based "current tech" lookup on the Tech Work Board)
- No `getTechsForDept(dept)` function

### Proposed minimal data addition

Add a new sheet tab `👷 Tech Directory` with columns:

| Column | Header | Notes |
|---|---|---|
| A | `Tech Name` | Display name, matches legacy Data Lists values |
| B | `Email` | `@cscmfg.com` — used for SSO identity match |
| C | `Department` | Canonical dept name from DEPT_TRACKERS |
| D | `Active` | Y/N — soft-disable without deleting |

Update `getTechDirectory()` to read from this tab when it exists, fall back to the old flat Data Lists list if not. Add `getTechsForDept(dept)` returning `[{name, email}]` for the given dept.

**⚠️ Requires the actual tech roster to be populated in the sheet by the operator before 5a/5b can be verified end-to-end.**

---

## 7. KPI Data Sources (F1–F5)

### F1 — Manager Home KPIs

**Status: ✅ WIRED to real Sheet data**

`getDashboardCounts()` and `getDashboardTrend()` in `Dashboard.gs` both read from the Master Log and are correctly dept-scoped to the caller's owned departments. The home page calls both asynchronously on load.

| KPI Card | Backend source | Notes |
|---|---|---|
| Open Tickets | ML, statuses OPEN/PENDING PARTS/ON HOLD/PENDING VERIFICATION | ✅ |
| Waiting | ML, status WAITING | ✅ |
| Critical | ML, OPEN-category + CRITICAL priority | ✅ |
| Temp Fix Active | Temp Fix Monitor tab, ACTIVE or PAST DUE | ✅ |
| Closed (30 days) | ML, CLOSED/COMPLETE + dateClosed within 30 days | ✅ |
| Parts Pending | Parts Needed tab, PENDING or ORDERED status | ✅ |

**Caveat:** Accuracy of "Open", "Critical", "Closed" KPIs depends on Bug 3 being fixed first (unmapped external dept values cause those tickets to be excluded from dept-scoped counts).

### F2 — Department Tracker KPIs

**Status: ❌ NOT IMPLEMENTED**

The tracker view (`PAGES['tracker-{dept}']`) currently renders a flat ticket list only. The mockup `06-tracker.jsx` shows a KPI summary row at the top (Total, Open, Critical, High, Pending Parts, On Hold, Complete, Waiting) plus a recurring-equipment panel and a trend chart.

| KPI | Source data | Notes |
|---|---|---|
| Total / Open / Waiting / Critical / High / Pending Parts / On Hold / Complete | ML (dept filter) | Data EXISTS — needs new aggregation function `getDeptTrackerKpis(dept)` |
| Recurring equipment panel | ML (grouping by equipCode, counting recurrences) | Data EXISTS — needs grouping logic |
| Dept trend chart | ML (filtered by dept + month buckets) | `getDashboardTrend()` exists but is not dept-filtered; needs `opts.dept` param |

These need to be built: backend `getDeptTrackerKpis(dept)` + frontend KPI row in `ticket-list.html` tracker mode.

### F3 — Temp Fix Monitor KPIs

**Status: ❌ NOT IMPLEMENTED (table exists; no KPI row)**

The `getTempFixItems()` function returns full rows. The frontend renders a table. No KPI summary row.

| KPI | Source data | Notes |
|---|---|---|
| Active temp fixes | TF sheet, count of ACTIVE status | Data EXISTS |
| Past due | TF sheet, count of PAST DUE status | Data EXISTS |
| Inspected on schedule (%) | TF sheet, compare LAST_INSPECTED + FREQ_DAYS vs today | Data EXISTS — calculation needed |
| Converted to permanent | TF sheet (CLEARED rows) + ML (fixType = 'Permanent') | Data EXISTS — cross-reference needed |

Need: backend `getTempFixKpis()` + frontend KPI banner in monitoring.html.

### F4 — Equipment Hold Log KPIs

**Status: ❌ NOT IMPLEMENTED (table exists; no KPI row)**

| KPI | Source data | Notes |
|---|---|---|
| Active tags (total) | EHL sheet, non-CLEARED rows | Data EXISTS |
| By tag color (Red/Yellow/Orange/Green) | EHL.TAG_TYPE column | **⚠️ CONFIRM: what values are stored in TAG_TYPE in the live data?** FRM-029-001 defines Red/Yellow/Orange/Green tag types. If TAG_TYPE stores these color strings, data exists. If it stores something else (e.g., "HOLD", "DANGER"), the color breakdown can't be derived without a mapping. |

Need: backend `getEquipHoldKpis()` + frontend KPI banner in monitoring.html.

**✅ TAG_TYPE vocabulary confirmed (2026-05-29):** Legacy `Code.js` line 335 confirms: `tagTypes = ['Red — Out of Service', 'Yellow — Use with Caution']`. EHL.TAG_TYPE stores these exact strings. Color breakdown KPIs: Red = Out of Service count, Yellow = Use with Caution count. Green Tag is the *clearing action* (not a stored type). No blocker.

### F5 — Reports Screen

**Status: ⚠️ PARTIALLY WIRED**

| Panel | Status | Notes |
|---|---|---|
| Dept summary cards (Open/Waiting/Closed/Critical/Temp Fixes/Labor Hours) | ✅ Wired | `getReportData()` → `rpt-summary` |
| Ticket detail table | ✅ Wired | `getReportData()` → `rpt-tbody` |
| Trend/Throughput chart | ❌ Not on reports page | `getDashboardTrend()` exists but only used on home page. Add `opts.dept` filter + wire to reports. |
| Problem-type breakdown | ❌ Not implemented | Source: ML.PROBLEM_TYPE — data exists, aggregation needed |
| Building/zone heatmap | ❌ Not implemented | Source: ML.BUILDING_ZONE — data exists, aggregation needed |
| Spend rollups | ❌ Not implemented | Labor hours exist (ML.ACTUAL_HOURS); **no cost/dollar data exists anywhere** — wire hours only, flag spend as pending |
| SQF compliance pack | ❌ Not implemented | Partial data: temp fix compliance (TF sheet), ticket lifecycle (Ticket History). Full SQF pack would need explicit compliance status fields not currently in the data model. |

**Recommendation:** Wire trend, problem-type, and building-zone panels (data exists). Leave spend rollups as labor-hours only with a "$/cost data not yet available" placeholder. Leave SQF compliance pack as a clearly-marked stub.

---

## 8. Questions — Status

| # | Question | Status | Answer |
|---|---|---|---|
| Q1 | Dept Map sheet contents | ✅ ANSWERED | Full map confirmed — see Bug 3 section above |
| Q2 | External form dept values | ✅ ANSWERED | Match LEGACY_DEPT_CODES keys exactly (METAL, PLASTIC, M/S, LITHO, etc.) |
| Q3 | Tech roster + dept associations | ⚠️ PARTIAL | No static dept-tech mapping exists in legacy system. Legacy uses flat Technicians list. `👷 Tech Directory` tab must be built from scratch; operator must populate. Proceeding with schema + code; end-to-end test blocked until sheet is populated. |
| Q4 | Equipment Hold Tag TYPE vocabulary | ✅ ANSWERED | `"Red — Out of Service"` and `"Yellow — Use with Caution"` — from legacy Code.js. Green Tag = clearing action, not a stored type value. |
| Q5 | Temp Fix Inspection result vocabulary (Program 030) | ⏸ DEFERRED | Operator does not know yet. Gap 7 inspection result field deferred until confirmed. |
| Q6 | Verify & Close → Temp Fix transition rule | ✅ ANSWERED | Requires manager sign-off (verify the work). The close flow prompts manager. When closing, the system should ask whether to also clear any linked temp fix — manager decides. |

---

## 9. Commit Sequence (per Section 10 of task brief)

| Step | Item | Status |
|---|---|---|
| 1 | `docs/round2-discovery.md` | ✅ Committed |
| 2 | Bug 3 (dept repair utility) | 🟡 Code fix = `repairTrackerGroup()` in AdminViews — ready to implement |
| 3 | Gap 6 fix (`TicketLifecycle.gs`) | 🟡 Ready |
| 4 | Bug 1 (nav accordion) | 🟡 Ready |
| 5 | Bug 2 (overflow CSS) | 🟡 Ready |
| 6 | Tech Directory tab + 5a filtered picker | 🟡 Schema ready; operator must populate data |
| 7 | 5b Tech Work Board | 🟡 Ready after 6 |
| 8 | Gap 2 Update Ticket + Gap 3 embedded parts | 🟡 Ready |
| 9 | Gap 7 Temp Fix Inspection | ⏸ Awaiting Q5 (result vocabulary) |
| 10 | Gap 8 Verify & Close gate | 🟡 Ready (Q6 answered: manager prompt with temp-fix option) |
| 11 | Gap 5 Monthly Rollover | 🟡 Ready |
| 12 | F1–F5 KPI wiring | 🟡 Unblocked once steps 2–3 complete |
| 13 | Regression pass → merge to main | ⏸ Final |
