# CSC CMMS — Equipment Dropdown Disabled: Diagnosis & Fix

**Date:** 2026-06-02  
**Branch:** `claude/magical-bardeen-FdfYk`  
**Fix commit:** `1e92c9f`

---

## Production Files Involved

| File | Role |
|------|------|
| `backend/EquipRegistry.gs` | Cache read/write, column mapping, hierarchy builder |
| `frontend/partials/submit-ticket.html` | Submit Ticket form, cascade functions |
| `frontend/partials/admin.html` | Equipment Cache admin page (diagnostics) |

No other files were modified to fix this issue.

---

## Symptom Summary

1. Submit Ticket form: **Equipment Type** and **Equipment** dropdowns permanently grayed out regardless of department selection.
2. Admin → Equipment Cache: **"Refresh Equipment Cache"** reports "424 equipment records cached," yet every department row shows **"Not in cache"** in the per-dept status table.
3. Server call `getEquipmentHierarchy()` returns `{ }` (empty object) for every department.

---

## End-to-End Data Path

```
[Equipment Register Sheet]
        │
        ▼
refreshEquipCache()                     — writes rows to ⚙️ Equip Inventory Cache tab
        │
        ▼
getEquipmentFromCache_()                — reads cache, maps headers, filters rows
        │
        ▼
getEquipmentInventory()                 — groups raw rows into {dept, eType, code, specific}
        │
        ▼
getEquipmentHierarchy()                 — returns {DEPT: {eType: [{code, specific}]}}
        │
        ▼
getSubmitFormData()                     — bundles hierarchy into _sfData
        │
        ▼
_sfData.equipHierarchy (frontend)       — read by _sfCascadeDept_(), _sfCascadeEtype_()
        │
        ▼
sf-etype / sf-equip selects             — enabled only when hierarchy has entries
```

---

## Root Cause A — Silent Filter Wipeout (Primary Cause)

**File:** `backend/EquipRegistry.gs`  
**Function:** `getEquipmentFromCache_()`

### The broken filter (pre-fix)

```javascript
.filter(function(r) {
  var code = colMap.code     !== undefined ? String(r[colMap.code]     || '').trim() : '';
  var spec = colMap.specific !== undefined ? String(r[colMap.specific] || '').trim() : '';
  var stat = colMap.status   !== undefined ? String(r[colMap.status]   || '').trim().toUpperCase() : 'ACTIVE';
  return (code || spec) && stat !== 'INACTIVE' && stat !== '';
})
```

### Why every row was discarded

`colMap` is built by matching the cache sheet's row-4 headers against known column-name variants in `_EQUIP_COL_MAPPINGS_`. If the user's Equipment Register uses column names not present in those variants (e.g. the header for the equipment name column is "Short Text" or "Description" rather than any of the recognised variants), then:

- `colMap.code` → `undefined`
- `colMap.specific` → `undefined`

Both evaluate the ternary to `''`. The expression `('' || '')` is falsy. **Every one of the 424 rows is rejected.** The function returns `[]`. No error is thrown. The refresh call reports "424 records cached" (physical row count) while `getEquipmentInventory()` returns an empty array.

This is why the cache appeared full but every department showed "Not in cache": the rows were written correctly but could never be read back.

### The fixed filter (commit 1e92c9f)

```javascript
.filter(function(r) {
  var stat = colMap.status !== undefined
    ? String(r[colMap.status] || '').trim().toUpperCase() : 'ACTIVE';
  if (stat === 'INACTIVE') return false;

  // Only apply the code/specific requirement if at least one column was recognised
  if (colMap.code !== undefined || colMap.specific !== undefined) {
    var code = colMap.code     !== undefined ? String(r[colMap.code]     || '').trim() : '';
    var spec = colMap.specific !== undefined ? String(r[colMap.specific] || '').trim() : '';
    return !!(code || spec);
  }

  // Neither column recognised — accept any row that has at least one non-empty cell
  return r.some(function(cell) { return String(cell || '').trim() !== ''; });
})
```

**Effect:** Rows are no longer silently discarded when column headers don't match exactly. Unrecognised headers degrade gracefully instead of wiping out the entire result set.

---

## Root Cause B — Disabled Selects (Downstream Effect)

**File:** `frontend/partials/submit-ticket.html`  
**Function:** `_sfCascadeDept_()`

```javascript
function _sfCascadeDept_() {
  var hier = _sfData && _sfData.equipHierarchy;
  var dv   = document.getElementById('sf-dept').value;
  var eSel = document.getElementById('sf-etype');
  ...
  if (!hier || !hier[dv]) {
    // Show "no equipment data" message, keep eSel.disabled = true
    return;
  }
  eSel.disabled = false;   // ← never reached when hier is empty
  ...
}
```

Because Root Cause A caused `hier` to be `{}`, `hier[dv]` is always `undefined`. The `disabled` attribute is never cleared. The no-entry cursor appears because the OS renders a disabled `<select>` as non-interactive.

This is a **downstream effect**, not an independent bug. Once Root Cause A is resolved and `hier` contains real entries, B resolves automatically.

---

## What Was Not Changed

- PDF generation engine — untouched
- Master Log / Ticket History write paths — untouched
- `refreshEquipCache()` write logic — untouched (cache rows were written correctly)
- Spreadsheet IDs, email addresses, department names — no hard-coded values introduced
- Any existing `.gs` file other than `EquipRegistry.gs`
- Any existing `.html` file other than `submit-ticket.html` and `admin.html`

---

## Additional Fixes in the Same Commit

To prevent a future recurrence and surface mismatches immediately:

1. **`_EQUIP_COL_MAPPINGS_`** extracted as a module-level constant so the same mapping table is shared by both `_buildEquipColMap_()` (cache reader) and the admin diagnostics page.

2. **`getEquipCacheStatus()`** extended to return:
   - `rawHeaders` — exact header text from cache row 4
   - `mappedCols` — which fields were recognised and their column index
   - `unmappedHdrs` — headers that matched no field
   - `parsedItemCount` — rows surviving the filter (distinct from raw `cacheRows`)

3. **Admin → Equipment Cache page** now shows a **Column Header Mapping** table:
   - Green = field recognised and mapped to a header
   - Red = required field not found in cache headers
   - Unrecognised headers listed verbatim so they can be added to `_EQUIP_COL_MAPPINGS_` if needed

---

## Verification Plan

### Step 1 — Deploy
Push `1e92c9f` to the bound Apps Script project and publish a new deployment (or test via **Test deployment**).

### Step 2 — Confirm cache rows survive the filter
1. Open the web app → Admin → **Equipment Cache**.
2. Click **Refresh Cache Now**.
3. After refresh completes, the status block should show:
   - `parsedItemCount` > 0 (should be close to 424 if all rows are valid)
   - Each department in the **Per-Dept Cache Status** table turns **green**

### Step 3 — Inspect Column Header Mapping
On the same page, scroll to **Column Header Mapping**:
- If any required field (Dept, Equipment Type, Equipment Name) is **red**, its column header in the Equipment Register does not match any recognised variant.
- Copy the exact header text shown in **Raw headers from cache row 4** and add it to the appropriate list in `_EQUIP_COL_MAPPINGS_` in `EquipRegistry.gs`, then re-run Step 2.

### Step 4 — Submit Ticket cascade
1. Navigate to Submit Ticket.
2. Select any department that has equipment.
3. **Equipment Type** dropdown should become enabled and populate with type options.
4. Select a type — **Equipment** dropdown should enable and populate.
5. Select an equipment item — preview card should show the equipment name and code.

### Step 5 — Edge cases
| Scenario | Expected behaviour |
|----------|--------------------|
| Department with no equipment in register | Inline message: "No equipment data for [DEPT]. Ask your administrator to run Refresh Equipment Cache." |
| Equipment with no status column in register | Treated as ACTIVE; row included |
| Equipment with STATUS = INACTIVE | Row excluded from dropdown |
| Changing department clears Equipment Type and Equipment selections | Confirmed by cascade reset logic |

---

## If Per-Dept Status Is Still Red After Deploy

The filter fix ensures rows are not silently discarded, but the per-dept grouping in `getEquipmentInventory()` still relies on the **Dept** column being recognised. If the dept column header is unrecognised, all rows will have `dept: ''` and no canonical department key will match.

Resolution: check **Raw headers from cache row 4** on the Equipment Cache admin page. Find which header corresponds to the department column and add it to the `dept` list in `_EQUIP_COL_MAPPINGS_`. One-line change, no structural impact.
