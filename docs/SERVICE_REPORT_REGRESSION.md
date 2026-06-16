# SERVICE_REPORT_REGRESSION.md

**Round:** SQF Workstream & Regression-Restore — branch `Claude-changes` — Date: 2026-06-16
**Symptom (R1):** the service report PDF will not print. Expected behavior: **render → print → save PDF to Google Drive.**
**Goal of this doc:** name what broke, diffed against last-known-good. **No fix applied.**

---

## 1. What the code does today

- **Frontend:** the service report is rendered as a modal in `frontend/partials/ticket-detail.html` (`:672–731`) and "printed" via the browser (`window.print()` in `frontend/partials/reports.html:122`). There is **no call that generates a PDF and saves it to Drive.**
- **Backend:** `backend/ServiceReport.gs` persists the report row to `📝 Report Database` (RDB). It **initializes a `PDF_LINK` column (`:303`) but never populates it.** There is **no `DriveApp` / `createFile` / `getAs('application/pdf')` code in `ServiceReport.gs` or anywhere in `backend/`** except `Backup.gs` (CSV backups — a different feature).

## 2. Git-history finding — the key, and a discrepancy to flag

I searched the **full history of `backend/`** for the PDF-to-Drive engine:

```
git log -p --all -S "Maintenance Reports" -- backend/        → no results
git log -p --all -S "createFile" -- backend/ServiceReport.gs backend/Reports.gs → no results
git log --oneline -- backend/ServiceReport.gs:
   7e1ca24  feat(Workshop 7 / C11): service report field-set conformance to Izzy
   3aa8193  Workshop 1: schema-conformance layer (Round 7)
   d7ea291  Phase 6 Service Report FRM-040-002 infrastructure   ← first appearance, INFRASTRUCTURE ONLY
```

**The render→print→save-PDF-to-Drive path has never existed in the web app's `backend/` history.** `ServiceReport.gs` was introduced (`d7ea291`) as **data infrastructure only** — fields/schema, no PDF engine. No later commit added or removed PDF generation.

The **real PDF engine does exist — but only in the reference/legacy code, not the web app:**
- `_reference/izzy_current/Code.js:2279–2288` — finds/creates the **"Maintenance Reports"** Drive folder, `createFile(blob)`, sets `ANYONE_WITH_LINK` sharing → returns the Drive URL. **This is "the existing PDF engine."**
- `legacy-apps-script/CodeCoreUpdates.js:385–394` — same engine.

### 🔴 DISCREPANCY TO RESOLVE WITH MICHAEL
The charter frames R1 as a **restore to last-known-good** with the instruction **"the PDF engine is not touched … generation goes through the existing engine."** But in the **web app's own git history there is no prior working PDF-to-Drive to restore** — it was never ported from Izzy's reference. So R1 is, in practice, **"port the call path to the existing (reference) PDF engine,"** not "revert a commit." Two readings, and I need your call:

- **(a)** "Existing PDF engine" = Izzy's reference `Code.js:2279–2288`. R1 = bring that engine's call path into the web app (engine logic copied intact, not redesigned), wire the service-report render to it, save to the "Maintenance Reports" Drive folder, stamp the correct header.
- **(b)** There was a *deployed* web-app version (outside this git repo / a `clasp` snapshot) that had PDF-to-Drive and regressed. If so, point me to it and I'll restore from there.

I will not start R1 until you confirm (a) or (b). **No code touched.**

## 3. Document-control header on the service report (must be corrected)
Independently of the PDF path, the service report currently stamps **`FRM-040-002`** (`ServiceReport.gs:44`, `ticket-detail.html:681`). Per the SQF Reference Master + Section 7 it must read **FRM-030-003 / Rev 0 / 6/5/2026**. The PASS criterion for R1 explicitly requires the header to read FRM-030-003 — so the header fix and the PDF wiring land together. (See `SQF_COVERAGE_MATRIX.md` §F.)

## 4. Engine-untouched guarantee
Whichever reading you pick, the engine's PDF-generation logic is copied/called **verbatim** — not modified or replaced — per Operating Principle #4 and the Section-10 prohibition.
