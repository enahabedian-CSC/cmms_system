# AUDIT — Department Mapping Logic: Izzy vs Ours

**Date:** 2026-06-03  
**Branch:** `claude/gracious-ritchie-PY1hQ`  
**Status:** Phase 1a — READ-ONLY audit. No app code changed.

---

## 1. Izzy's Mapping System — Full Transcription

### 1.1 Data Model

Izzy maintains **two layers** of dept identity:

| Layer | What it is | Example values |
|-------|-----------|---------------|
| **Source dept** (Sage / accounting) | The raw dept name as Sage / the external form knows it | METAL, PLASTIC, PLASTIC DEC, LITHO, M/S, S/R, QA |
| **System dept** (canonical operational) | The dept the tracker + routing engine uses | METALS, PLASTICS, ELECTRICAL, FACILITIES, MACHINE SHOP, LITHO |

The bridge between them is the **Dept Map** sheet (col A = source, col B = system).

---

### 1.2 `DEPT_CODES` — Sage accounting codes

**Source:** `_reference/izzy_current/Code.js` lines 1701-1712

```javascript
// Accounting codes — used in ticket # format MT-{code}-{YYMMDD}-{seq}
var DEPT_CODES = {
  'METAL':       '001',
  'PLASTIC':     '003',
  'LITHO':       '004',
  'PLASTIC DEC': '006',
  'QA':          '007',
  'M/S':         '008',
  'S/R':         '009',
  'SALES':       '030',
  'G&A':         '031'
};

// Reverse lookup — given code '003', returns 'PLASTIC'
var DEPT_CODE_TO_NAME = {
  '001':'METAL','003':'PLASTIC','004':'LITHO','006':'PLASTIC DEC',
  '007':'QA','008':'M/S','009':'S/R','030':'SALES','031':'G&A'
};
```

**Purpose:**  
- Ticket number generation: `MT-{deptCode}-{YYMMDD}-{seq}` (e.g., `MT-001-261125-003`)  
- Dept dropdown display format: `dept + ' — ' + code` (e.g., `"METAL — 001"`)  
- Reverse-lookup when a ticket was created under a canonical system name (METALS → back to METAL → '001')

---

### 1.3 `getDeptMapping_()` — Runtime sheet reader

**Source:** `_reference/izzy_current/Code.js` lines ~86-100

```javascript
var _deptMappingCache = null;

function getDeptMapping_() {
  if (_deptMappingCache) return _deptMappingCache;
  try {
    var ss  = SpreadsheetApp.getActiveSpreadsheet();
    var sh  = ss.getSheetByName(SH.DEPT_MAP);
    if (!sh || sh.getLastRow() < 2) return {};   // ← returns EMPTY object; no hardcoded defaults
    var data = sh.getRange(2, 1, sh.getLastRow()-1, 2).getValues();
    var map  = {};
    data.forEach(function(r) {
      var src  = String(r[0] || '').trim().toUpperCase();
      var dest = String(r[1] || '').trim().toUpperCase();
      if (src && dest) map[src] = dest;
    });
    _deptMappingCache = map;
    return map;
  } catch(e) {
    Logger.log('getDeptMapping_ error: ' + e.message);
    return {};
  }
}
```

**Key behaviour:**  
- Reads live from the `DEPT_MAP` sheet every cold start (module-level cache, resets per script execution)  
- **No hardcoded defaults** — if the sheet is missing or empty, returns `{}`  
- Keys are Sage source dept names (METAL, PLASTIC…); values are canonical system depts (METALS, PLASTICS…)
- The returned map's `Object.keys()` is the list Izzy uses for the **department dropdown** on the New Ticket form

---

### 1.4 `getDeptGroup_(dept)` — Single-dept lookup

**Source:** `_reference/izzy_current/Code.js` ~line 105

```javascript
function getDeptGroup_(dept) {
  var d   = String(dept || '').trim().toUpperCase();
  var map = getDeptMapping_();
  return map[d] || d;   // passthrough: if not in map, return the raw string
}
```

**Passthrough fallback:** If `dept` is already a canonical system name (METALS, ELECTRICAL, …) and is not a key in the Dept Map, the raw string is returned unchanged. This is intentional — canonical names route themselves.

---

### 1.5 `getTrackerForDept(dept, problemType, equipType)` — Full routing

**Source:** `_reference/izzy_current/Code.js` lines 1730-1777

```javascript
function getTrackerForDept(dept, problemType, equipType) {
  var mapping = getDeptMapping_();
  var d   = String(dept || '').toUpperCase().trim();
  var dg  = mapping[d] || d;                          // Step 1: Dept Map lookup
  var pt  = String(problemType || '').toUpperCase().trim();
  var et  = String(equipType   || '').toUpperCase().trim();

  // Step 2: Routing Override Rules from Configuration tab
  var cfg   = getConfig();
  var rules = [];
  try { rules = JSON.parse(cfg['Routing Override Rules'] || '[]'); } catch(e) { rules = []; }
  if (!rules.length) {
    rules = [
      { keyword:'ELECTRICAL', matchOn:'PROBLEM_TYPE', routeTo:'ELECTRICAL' },
      { keyword:'FACILITY',   matchOn:'EQUIP_DESC',   routeTo:'FACILITIES' }
    ];
  }

  // Step 3: First matching rule wins
  for (var r = 0; r < rules.length; r++) {
    var rule     = rules[r];
    var kw       = String(rule.keyword || '').toUpperCase().trim();
    if (!kw) continue;
    var haystack = String(rule.matchOn || '').toUpperCase() === 'EQUIP_DESC' ? et : pt;
    if (haystack.indexOf(kw) > -1) {
      var dest = String(rule.routeTo || '').toUpperCase();
      if (dest === 'ELECTRICAL')   return SH.TRACKER_EL;
      if (dest === 'FACILITIES')   return SH.TRACKER_FAC;
      if (dest === 'MACHINE SHOP') return SH.TRACKER_MS;
      if (dest === 'METALS')       return SH.TRACKER_MTL;
      if (dest === 'PLASTICS')     return SH.TRACKER_PL;
      if (dest === 'LITHO')        return SH.TRACKER_LTH;
    }
  }

  // Step 4: Route on mapped system dept
  if (dg === 'METALS')       return SH.TRACKER_MTL;
  if (dg === 'PLASTICS')     return SH.TRACKER_PL;
  if (dg === 'LITHO')        return SH.TRACKER_LTH;
  if (dg === 'ELECTRICAL')   return SH.TRACKER_EL;
  if (dg === 'FACILITIES')   return SH.TRACKER_FAC;
  if (dg === 'MACHINE SHOP') return SH.TRACKER_MS;

  // Step 5: Unknown dept — default to Machine Shop
  return SH.TRACKER_MS;
}
```

**Routing priority (in order):**
1. Dept Map lookup (source → system)
2. Routing Override Rules (keyword match in problem type or equipment type/desc)
3. Canonical system dept name lookup
4. Fallback: Machine Shop

---

### 1.6 `generateTicketNumber(dept)` — Two-pass dept code lookup

**Source:** `_reference/izzy_current/Code.js` lines 1807-1851

```javascript
function generateTicketNumber(dept) {
  var deptUp   = String(dept || '').toUpperCase().trim();
  var deptCode = '000';

  // Pass 1: direct lookup in DEPT_CODES (works if dept is a Sage source name)
  Object.keys(DEPT_CODES).forEach(function(key) {
    if (key.toUpperCase() === deptUp) deptCode = DEPT_CODES[key];
  });

  // Pass 2: reverse through Dept Map (works if dept is a canonical system name)
  if (deptCode === '000') {
    var mapping = getDeptMapping_();
    Object.keys(mapping).forEach(function(src) {
      if (mapping[src] === deptUp) {          // e.g. mapping['METAL'] === 'METALS'
        Object.keys(DEPT_CODES).forEach(function(key) {
          if (key.toUpperCase() === src) deptCode = DEPT_CODES[key];
        });
      }
    });
  }
  // Format: MT-{deptCode}-{YYMMDD}-{seq}
}
```

**Effect:** A ticket submitted under "METALS" (system dept) reverse-maps through Dept Map to find "METAL" → code "001" → ticket number `MT-001-…`. If no dept code is found, uses `'000'`.

---

### 1.7 `getAddTicketFormData()` — What the New Ticket form receives

**Source:** `_reference/izzy_current/Code.js` lines 1863-1908

```javascript
function getAddTicketFormData() {
  var deptMapping = getDeptMapping_();
  var departments = Object.keys(deptMapping).sort();   // ← Sage source dept names
  return {
    departments:  departments,
    deptCodes:    DEPT_CODES,       // {METAL:'001', PLASTIC:'003', ...}
    deptMapping:  deptMapping,      // {METAL:'METALS', PLASTIC:'PLASTICS', ...}
    equipHierarchy: getEquipmentHierarchy(),  // keyed by raw e.dept (no normalization)
    // ... other fields
  };
}
```

**Department dropdown format (from AddTicket.html):**

```javascript
// AddTicket.html — onDeptChange helper
var code = FD.deptCodes[dept] || '';
option.text = code ? dept + ' — ' + code : dept;
// Result: "METAL — 001", "PLASTIC — 003", "M/S — 008"
```

---

### 1.8 Client-side group resolution — `getDeptGroupClient_()` and `onDeptChange()`

**Source:** `_reference/izzy_current/AddTicket.html` lines ~200-260

```javascript
// AddTicket.html — client-side dept→group mapper
// FD.deptMapping is passed from server (the full Dept Map)
var DEPT_MAPPING = FD.deptMapping || {};

function getDeptGroupClient_(dept) {
  var d = String(dept || '').toUpperCase().trim();
  if (DEPT_MAPPING[d]) return DEPT_MAPPING[d];
  // Hard-coded emergency fallback (server Dept Map is authoritative)
  var fallback = {
    'METAL':'METALS',   'PLASTIC':'PLASTICS',  'PLASTIC DEC':'PLASTICS',
    'LITHO':'LITHO',    'M/S':'MACHINE SHOP',  'S/R':'FACILITIES',
    'QA':'FACILITIES',
    // Identity mappings (already canonical)
    'METALS':'METALS',  'PLASTICS':'PLASTICS',  'ELECTRICAL':'ELECTRICAL',
    'MACHINE SHOP':'MACHINE SHOP',  'FACILITIES':'FACILITIES'
  };
  return fallback[d] || d;
}

function onDeptChange() {
  var hier      = FD.equipHierarchy || {};
  var dept      = document.getElementById('fd-dept').value;   // e.g. 'METAL'
  var deptGroup = getDeptGroupClient_(dept);                   // e.g. 'METALS'
  var dUp       = dept.toUpperCase();

  // CRITICAL: collect ALL hierarchy keys that resolve to the same group
  var hierKeys = [];
  Object.keys(hier).forEach(function(k) {
    if (getDeptGroupClient_(k) === deptGroup) hierKeys.push(k);
    else if (k.toUpperCase() === dUp && hierKeys.indexOf(k) < 0) hierKeys.push(k);
  });

  // Aggregate equipment types across all matching hierarchy keys
  var types = {};
  hierKeys.forEach(function(k) {
    Object.keys(hier[k] || {}).forEach(function(t) { types[t] = true; });
  });

  // Populate equipType dropdown from collected types
  // ...
}
```

**Effect:** If the hierarchy has equipment under both "METAL" and "METALS" (two different keys), `onDeptChange()` merges them — the tech sees all METALS-group equipment regardless of which key name was used in the register.

---

### 1.9 `getEquipmentHierarchy()` — How equipment is grouped

**Source:** `_reference/izzy_current/EquipCache.js` (Izzy's code uses IMPORTRANGE + similar grouping)  
**Izzy's behaviour:** Groups equipment by `e.dept` (raw value from cache, no normalization). If the Equipment Register says "METAL" the hierarchy key is "METAL". The client's `onDeptChange()` handles cross-key resolution.

---

## 2. Our System — Current Implementation

### 2.1 `getDeptMapping_()` — Hardcoded defaults + sheet

**Source:** `backend/Config.gs` (full file)

```javascript
function getDeptMapping_() {
  var map = {
    // Hardcoded baseline — always present even if DEPT_MAP sheet is empty
    'ELECTRICAL':'ELECTRICAL', 'FACILITIES':'FACILITIES', 'LITHO':'LITHO',
    'MACHINE SHOP':'MACHINE SHOP', 'METALS':'METALS', 'PLASTICS':'PLASTICS',
    'FACILTIIES':'FACILITIES'   // hardcoded typo-fix for one Manager Access row
  };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SH.DEPT_MAP);
    if (sh && sh.getLastRow() >= 2) {
      sh.getRange(2, 1, sh.getLastRow()-1, 2).getValues().forEach(function(r) {
        var src  = String(r[0] || '').trim().toUpperCase();
        var dest = String(r[1] || '').trim().toUpperCase();
        if (src && dest) map[src] = dest;
      });
    }
  } catch(e) { Logger.log('getDeptMapping_ error: ' + e.message); }
  return map;
}
```

**Key delta:** Hardcoded defaults mean the system never returns `{}` — it always has 6 canonical identity mappings plus the typo-fix. But those defaults map canonical names to themselves, not Sage names to canonical names.

### 2.2 `getTrackerForDept()` — Same logic, same Machine Shop fallback

**Source:** `backend/Config.gs`

Our implementation matches Izzy's step for step (Dept Map → Routing Override Rules → canonical name check → Machine Shop fallback). Functionally identical.

### 2.3 No `DEPT_CODES` object

We have two separate objects instead:
- `INTERNAL_DEPT_CODES`: `{'ELECTRICAL':'EL','MACHINE SHOP':'MS', ...}` — tracker abbreviations, not accounting codes
- `LEGACY_DEPT_CODES`: `{'METAL':'001','PLASTIC':'003', ...}` — equivalent to Izzy's `DEPT_CODES`, but not used by ticket number generation or the form

Our `generateTicketNumber()` doesn't use Sage accounting codes at all; ticket numbers use a different format.

### 2.4 `getAddTicketFormData()` — Returns canonical dept names

**Source:** `backend/TicketSubmission.gs`

```javascript
departments: DEPT_TRACKERS.map(function(dt) { return dt.dept; })
// Returns: ['ELECTRICAL','FACILITIES','LITHO','MACHINE SHOP','METALS','PLASTICS']
```

Our form dropdown shows canonical system dept names, not Sage names. No `deptCodes` field is returned — there is no `dept — code` display format.

### 2.5 `getEquipmentHierarchy()` — Normalizes dept during grouping

**Source:** `backend/EquipRegistry.gs`

```javascript
function getEquipmentHierarchy() {
  var equip = getEquipmentFromInventory();
  var hierarchy = {};
  equip.forEach(function(e) {
    var dept  = normalizeDept(e.dept) || 'UNASSIGNED';   // ← normalizes here
    var eType = e.eType || 'GENERAL';
    if (!hierarchy[dept]) hierarchy[dept] = {};
    if (!hierarchy[dept][eType]) hierarchy[dept][eType] = [];
    hierarchy[dept][eType].push(e);
  });
  return hierarchy;
}
```

`normalizeDept()` calls `getDeptMapping_()`. If the Equipment Register uses "METAL" and the DEPT_MAP sheet has `METAL → METALS`, the hierarchy key becomes "METALS". If DEPT_MAP doesn't have that mapping, `normalizeDept("METAL")` returns "METAL" (passthrough) — and the form's `_sfCascadeDept_()` won't find it under "METALS".

### 2.6 `_sfCascadeDept_()` — Direct key lookup, no cross-group resolution

**Source:** `frontend/partials/submit-ticket.html`

```javascript
function _sfCascadeDept_() {
  var hier = _sfData && _sfData.equipHierarchy;
  var dv   = document.getElementById('sf-dept').value;  // canonical name, e.g. 'METALS'
  if (!hier || !hier[dv] || Object.keys(hier[dv]).length === 0) {
    // No equipment for this dept — show message, keep select disabled
    return;
  }
  // Only populates if hier['METALS'] exists exactly
}
```

No cross-group key aggregation. Unlike Izzy's `onDeptChange()`, this does not collect equipment from hierarchy keys that group-resolve to the same canonical name.

---

## 3. Delta Table

| Aspect | Izzy's System | Our System | Impact |
|--------|--------------|-----------|--------|
| Department dropdown shows | Sage names + accounting code (`METAL — 001`) | Canonical system names (`METALS`) | Different UX; techs used to Sage names may not recognise options |
| `getDeptMapping_()` when sheet is empty | Returns `{}` (no defaults) | Returns 6 hardcoded canonical identity mappings | Our system silently "works" even without a Dept Map sheet; Izzy's fails loudly |
| Dept Map keys | Sage names (METAL, PLASTIC…) | Sage names if populated by admin; identity-mapped canonical names if using defaults | If DEPT_MAP only has identity rows, Sage-named equipment never maps |
| `DEPT_CODES` | Defined (`{'METAL':'001',…}`); used in ticket # and dropdown display | Two partial equivalents (`INTERNAL_DEPT_CODES`, `LEGACY_DEPT_CODES`); neither used the same way | Ticket number format is different; no `dept — code` display |
| Equipment hierarchy grouping | Raw `e.dept` (no normalization) | `normalizeDept(e.dept)` (Dept Map lookup) | If DEPT_MAP maps METAL→METALS, our hierarchy key is "METALS" (correct for our form); Izzy's is "METAL" (needs client resolution) |
| Cascade dept → equipment | Cross-group key aggregation: collects equipment from all hierarchy keys resolving to the same group | Direct key lookup: `hier[dv]` only | If any mismatch exists between form dept name and hierarchy key, our cascade silently finds nothing |
| Typo fix | None hardcoded | `'FACILTIIES':'FACILITIES'` hardcoded | Low risk; should be in Dept Map sheet instead |

---

## 4. Root Cause of "Equipment Dropdown Disabled" — Phase 1d Report

**Current state (as of commit `1e92c9f`):**

Root Cause A (silent filter wipeout) is fixed. Equipment rows are no longer discarded wholesale when column headers don't match.

**Remaining gap:**

If the Equipment Register's `dept` column contains Sage source names (e.g., "METAL", "PLASTIC") and the DEPT_MAP sheet does not have rows mapping those names to canonical system names (METALS, PLASTICS), then:

1. `getEquipmentHierarchy()` calls `normalizeDept("METAL")`, which calls `getDeptMapping_()`.
2. Our `getDeptMapping_()` returns its hardcoded defaults (canonical identity mappings only — no Sage-to-canonical mappings unless someone added them to the sheet).
3. `normalizeDept("METAL")` finds no entry for "METAL" → returns "METAL" (passthrough).
4. The hierarchy key is "METAL", not "METALS".
5. The form's department dropdown shows "METALS" (from `DEPT_TRACKERS`).
6. `_sfCascadeDept_()` looks for `hier["METALS"]` → undefined → cascade stays disabled.

**Diagnosis files and lines:**
- `backend/EquipRegistry.gs` — `getEquipmentHierarchy()` (normalizeDept call is correct in intent, fails in practice if Dept Map is incomplete)
- `backend/Config.gs` — `getDeptMapping_()` (hardcoded defaults are canonical identity only; Sage→canonical mappings must be populated in the DEPT_MAP sheet)
- `frontend/partials/submit-ticket.html` — `_sfCascadeDept_()` (direct key lookup; would benefit from cross-group resolution like Izzy's `onDeptChange()`)

**This is a two-part fix needed (Phase 3 scope, BIG):**

1. **Data fix (config):** Populate the DEPT_MAP sheet with Sage→canonical mappings (METAL→METALS, PLASTIC→PLASTICS, etc.). This is an admin action, not a code change.

2. **Code fix (optional, defensive):** Add cross-group key aggregation to `_sfCascadeDept_()` mirroring Izzy's `onDeptChange()`. Even if the Dept Map is incomplete, the cascade would still find equipment by group-resolving all hierarchy keys against the selected canonical dept name.

The data fix alone resolves the issue for a correctly-maintained Dept Map. The code fix makes the system robust against future Dept Map gaps.
