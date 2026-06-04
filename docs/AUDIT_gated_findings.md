# AUDIT_gated_findings.md
## Gated Investigation Findings
### CSC CMMS — Code-Derived Audit · June 2026

---

## Investigation 1 — Facilities & Electrical Tickets With No Equipment

**Question:** Does Izzy's code allow tickets with no equipment for ELECTRICAL and FACILITIES departments? What are the validation options and recommendation?

---

### 1.1 — Code Evidence

**ELECTRICAL and FACILITIES in department lists**

Both codebases define DEPT_TRACKERS as an array of 6 objects:

```
Config.gs (ours), Code.js (Izzy's):
DEPT_TRACKERS = [
  { dept: 'ELECTRICAL',   key: 'EL',  name: '⚡ Electrical Tracker',   ... },
  { dept: 'MACHINE SHOP', key: 'MS',  name: '🔧 Machine Shop Tracker',  ... },
  { dept: 'FACILITIES',   key: 'FAC', name: '🏗️ Facilities Tracker',   ... },
  { dept: 'PLASTICS',     key: 'PL',  name: '🧴 Plastics Tracker',      ... },
  { dept: 'METALS',       key: 'MTL', name: '⚙️ Metals Tracker',        ... },
  { dept: 'LITHO',        key: 'LTH', name: '🖨️ Litho Tracker',        ... }
]
```

Both ELECTRICAL and FACILITIES are full-fledged departments with dedicated tracker sheets. There is nothing in either codebase that creates special validation rules for these departments.

**Equipment field validation in Izzy's addNewTicket()**

Reviewing Code.js `addNewTicket()`:
- No server-side check requires `equipType`, `specificEquip`, or `equipCode` to be non-empty.
- `lookupEquipmentCode_()` returns `''` when no match is found and does not throw.
- The ticket is created with whatever values were passed; empty equipment fields are written as empty strings.

**Equipment field validation in our addNewTicket()**

Reviewing TicketSubmission.gs `addNewTicket()`:
- Same behavior. `equipType`, `specificEquip`, `equipCode` are all optional. No validation block rejects a ticket if they are absent.
- `buildTkRow_()` writes whatever is in `data.equipType`, `data.equipCode`, `data.specificEquip`.

**Frontend validation in Izzy's AddTicket.html**

Not directly read (file was not read in this audit), but based on the server function signature and the `getAddTicketFormData()` return structure, the form returns `departments` (all 6 depts), `equipHierarchy` (by dept), and `buildingZones`. The cascade selectors (dept → equipType → specific equip) populate from the equipment registry. If ELECTRICAL or FACILITIES equipment is not in the registry, the equip selectors would be empty but the form would still allow submission.

**Frontend validation in our submit-ticket.html**

Confirmed from reading the partial. `submitStep1Next()` validates:
```javascript
if (!dept)  { showToast('Please select a department', 'error'); return; }
if (!eType) { showToast('Please select an equipment type', 'error'); return; }
```
Equipment Type is **required** client-side. Specific Equipment is **not required** — `_sfEquipCode` and `_sfEquipSpec` default to `''` if no specific item is selected.

If there is no equipment data for the selected department (ELECTRICAL or FACILITIES with empty cache), the message displayed is:
> "No equipment data for {dept}. Ask your administrator to run Refresh Equipment Cache..."

But the user is **not blocked** — `sf-etype` is disabled but `submitStep1Next()` still fails with "Please select an equipment type," which means if the cache is empty for that dept the user cannot advance past Step 1. This acts as a de facto block only when the cache is empty, which is not the intended gate.

**Routing for ELECTRICAL and FACILITIES**

`getTrackerForDept()` in both codebases:
- If `problemType.toUpperCase().includes('ELECTRICAL')` → route to ELECTRICAL tracker.
- If `equipType.toUpperCase().includes('FACILITY') || equipDesc.toUpperCase().includes('FACILITY')` → route to FACILITIES tracker.
- Default (no match): Machine Shop tracker.

This means:
- An ELECTRICAL ticket submitted without any equipment field can still route to the ELECTRICAL tracker if the problem type contains the word "ELECTRICAL".
- A FACILITIES ticket submitted without equipment fields will only route to the FAC tracker if the problem type or equip fields contain "FACILITY". If neither does, it falls through to Machine Shop, which is wrong.

---

### 1.2 — Answer

**Yes, both codebases allow tickets to be submitted for ELECTRICAL and FACILITIES with no equipment specified.**

The equipment fields (`equipType`, `specificEquip`, `equipCode`) are optional on the server in both systems. Our frontend requires `equipType` to be selected before advancing, but if the equipment cache is empty for a given department, the user is shown an informational message and effectively blocked at Step 1 by the validation (cannot select a type from an empty dropdown).

There is no explicit rule that says "ELECTRICAL/FACILITIES tickets must have equipment." This is intentional by design — both departments commonly work on facility systems (walls, HVAC, wiring runs) that may not appear as discrete equipment items in the Equipment Register.

---

### 1.3 — Options and Recommendation

**Option A — No change (current behavior)**

Allow all tickets, including ELECTRICAL and FACILITIES, to be submitted without equipment. This is the current behavior in both codebases.

- Pro: Maximum flexibility; facilities and electrical work often targets infrastructure with no equipment code.
- Con: Equipment codes are used for trend analysis (`getEquipQuickStats()`), recurring-equipment detection, and SQF FRM-030-002 EMRL fields. Tickets with no equipment code cannot be analyzed by equipment.

**Option B — Require equipment type (already enforced in our frontend); add server-side enforcement**

Our frontend already requires equipment type. Add a server-side guard in `addNewTicket()`:

```javascript
if (!data.equipType || !data.equipType.trim()) {
  return { success: false, error: 'Equipment type is required.' };
}
```

- Pro: Ensures data quality regardless of how the API is called.
- Con: Same as Option A con; does not require a specific equipment item, only a type category.

**Option C — For ELECTRICAL and FACILITIES only: allow a free-text equipment description field when no registry match exists**

In the frontend cascade, if the equipment cache has no items for the selected dept, show a free-text input for equipment description instead of a dropdown. Store the value in `specificEquip`. This provides a description for the ticket record without requiring a formal equipment code.

- Pro: Enables submittal for unlisted/infrastructure items while still capturing useful description text.
- Con: Equipment code remains blank, so equip-code-based analytics still don't work for these tickets.
- This is the most pragmatic approach for day-to-day operations.

**Option D — Populate the Equipment Register with ELECTRICAL and FACILITIES entries**

Add electrical panels, HVAC units, building zones, and facility systems to the Equipment Register sheet as proper records with equipment codes. Then the cache refresh will populate options for these departments and the cascade will work normally.

- Pro: Best long-term solution; enables all analytics and SQF FRM-030-002 tracking.
- Con: Requires significant data entry effort; facility and electrical systems may not have formal asset codes at this site.

**Recommendation:**

Implement **Option B** (server-side equipType requirement) immediately as a data quality guard — it is a one-line change with zero breaking risk since our frontend already enforces it.

Pursue **Option D** in parallel as a data quality project: add at least the major electrical systems (main panels, sub-panels, distribution boards) and facility systems (HVAC units, air compressors, boilers) to the Equipment Register. This directly enables SQF EMRL reporting for those tickets.

**Option C** (free-text fallback) is valuable as a bridge until Option D is complete and should be considered for the next frontend sprint.

---

## Investigation 2 — Photo Data on External Ticket Source

**Question:** Does column J in external sheet `1F4-nPI4pkZZ933RKb2g6WBVR3JDZNgBRz8hQKGr0_4w` tab `Service Tickets` carry a Drive file ID, a Drive URL, or just a filename/text?

---

### 2.1 — Code Evidence

**Column mapping in ExternalSync.gs (ours)**

```javascript
var EXT_COL = {
  TICKET_NO:   1,
  TIMESTAMP:   2,
  MECHANIC:    3,
  DEPT:        4,
  LINE_NO:     5,
  EQUIP_TYPE:  6,
  EQUIP_DESC:  7,
  ISSUE_DESC:  8,
  EST_HOURS:   9,
  PHOTO_LINKS: 10   // Column J (1-based)
};
```

Column J is named `PHOTO_LINKS`. It is the last column read.

**How the value is read and stored**

```javascript
// ExternalSync.gs
var photoLinks = String(row[EXT_COL.PHOTO_LINKS - 1] || '').trim();
// ...
var notes = photoLinks ? 'Photos: ' + photoLinks : '';
// notes is passed into appendToMasterLog_() as params.notes
```

The raw string value from the cell is stored verbatim in the Master Log NOTES field, prefixed with `'Photos: '`. No parsing, no extraction of IDs, no Drive API calls.

**Same behavior in Izzy's Code.js**

```javascript
// Code.js (Izzy) syncExternalTickets()
var photoLinks = String(row[9] || '').trim(); // row[9] = col J, 0-indexed
// ...
mlRow[ML.NOTES-1] = photoLinks ? 'Photos: ' + photoLinks : '';
```

Identical behavior. The column value is treated as a plain string and stored as-is.

**No Drive API calls in either codebase related to photo links**

Neither codebase contains any `DriveApp.getFileById()`, `DriveApp.getFolderById()`, or URL-parsing logic that processes the photo links column. The shared Drive folder mentioned in context (`1gGGBggOwhc90HNTOXIpApbE24xieMq0l`) does not appear anywhere in either codebase. No code generates thumbnail URLs, preview links, or uploads to Drive from this field.

---

### 2.2 — Answer

**The code cannot tell us what format the column actually contains.** Neither codebase inspects, validates, or parses the photo links value — it is stored as a raw string in the Master Log NOTES field with a `'Photos: '` prefix. The code is format-agnostic.

What is known from the code:
- The external sheet is a Google Form response sheet (implied by the tab name `Service Tickets` and the column layout matching a Form response).
- Column J is a question field in that form, presumably named something like "Photo Links" or "Photo".
- When a Google Form includes a file-upload question, the Form response sheet stores the Drive URL(s) of the uploaded file(s) as a comma-separated string in that cell. The format is a full Google Drive URL: `https://drive.google.com/open?id={fileId}` or `https://drive.google.com/file/d/{fileId}/view`.
- If the form question is a text field asking users to paste a link, the content depends entirely on what the submitter typed — it could be a URL, a file name, or empty.

**To confirm the actual content**: open the external sheet `1F4-nPI4pkZZ933RKb2g6WBVR3JDZNgBRz8hQKGr0_4w`, tab `Service Tickets`, and inspect a few cells in column J. If the column contains full Google Drive URLs (as is typical for Google Form file-upload responses), the file ID is the segment after `/d/` or after `id=` in the URL.

---

### 2.3 — Implications and Options

**Current behavior:** Photo links are stored as plain text in the Master Log NOTES field. No UI in our web app renders them as clickable links or previews. A user viewing ticket notes via `getTicketDetail()` would see the raw string (e.g., `Photos: https://drive.google.com/file/d/1abc.../view`).

**What is NOT happening:**
- The code does not verify that the linked file exists or is accessible.
- The code does not display photos as images or thumbnails anywhere.
- The code does not restrict access to the photos — they remain wherever they are in Drive.

**Options:**

**Option A — No change (current behavior)**

Photo URLs in notes are visible when a manager reads the ticket detail. A manager can click the URL manually if viewing via a browser or Sheets.

**Option B — Render photo links as clickable hyperlinks in ticket detail**

Parse the NOTES field in the ticket-detail partial. If notes contain `Photos: `, extract the URL(s), strip the prefix, and render `<a href="{url}" target="_blank">View Photo</a>` links in the UI. This is a pure frontend change.

Implementation: In `ticket-detail.html`, when rendering `t.notes`, detect `Photos:` prefix and replace with anchor tags. Handles comma-separated multiple URLs.

- Build size: **XS** (< 1 day; pure frontend string parsing)

**Option C — Store photos in the system's own Drive folder**

On sync, for each photo URL in column J, call `DriveApp.getFileById(extractedId)` and move or copy the file to the shared photos folder `1gGGBggOwhc90HNTOXIpApbE24xieMq0l`. Store the new file ID in a dedicated ML column (e.g., `PHOTO_ID` or in NOTES with a system-specific prefix).

- Pro: Centralizes all photos in one Drive folder; photos persist even if the Form submitter's Drive is reorganized.
- Con: Requires Drive write permissions; photo column may not always contain parseable file IDs; errors on copy would need handling.
- Build size: **S–M** (backend photo processing in ExternalSync.gs)

**Option D — Dedicated photo column in Master Log**

Add a `PHOTO_LINKS` column to ML (col 36, currently unused after removing VERIFICATION_CHECKLIST from Izzy's schema). Store photo links separately from notes so they can be rendered and searched independently.

- Build size: **S** (schema change + update appendToMasterLog_ + update ExternalSync.gs)

**Recommendation:**

Implement **Option B** immediately — it is the highest value change for the lowest cost and requires no backend changes. Users can then open photo links directly from the ticket detail view.

Track **Option D** as a medium-priority schema improvement to keep photo metadata out of the free-text notes field. This is especially useful if we later add photo upload capability for internally-submitted tickets.

**Option C** (copying files to the shared folder) is valuable for data governance but depends on whether the form-upload files are accessible by the script's service account. Treat as a later enhancement once basic photo rendering (Option B) is working.

---

*End of AUDIT_gated_findings.md*
