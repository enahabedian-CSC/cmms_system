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

### ✅ RESOLVED BY MICHAEL (2026-06-16)
> "No need for PDF to drive. I would just like the optionality to print at will. We do not need anything saved to drive."

**R1 is therefore NOT a PDF-engine task.** No Drive save, no port of `Code.js:2279–2288`. R1 scope collapses to:
1. Ensure the service report **renders and prints on demand** (browser print path — `window.print()` already exists at `reports.html:122`; confirm the service-report view has a working print affordance).
2. **Stamp the correct document-control header** so the printed output reads **FRM-030-003 / Rev 0 / 6/5/2026** (fix the `FRM-040-002` default at `ServiceReport.gs:44` + `ticket-detail.html:681`).

The PDF engine is untouched because it is not used. The earlier `git log` discrepancy (no PDF-to-Drive in history) is now moot — there is no Drive output to restore.

**Revised R1 verification:** open a service report → print affordance produces a printable/PDF-able view (OS/browser print dialog) → header reads **FRM-030-003 / Rev 0 / 6/5/2026**. (Supersedes the Section 9 R1 criterion's "saved to Drive" clause per Michael's instruction.)

## 3. Document-control header on the service report (must be corrected)
Independently of the PDF path, the service report currently stamps **`FRM-040-002`** (`ServiceReport.gs:44`, `ticket-detail.html:681`). Per the SQF Reference Master + Section 7 it must read **FRM-030-003 / Rev 0 / 6/5/2026**. The PASS criterion for R1 explicitly requires the header to read FRM-030-003 — so the header fix and the PDF wiring land together. (See `SQF_COVERAGE_MATRIX.md` §F.)

## 4. Engine-untouched guarantee
Whichever reading you pick, the engine's PDF-generation logic is copied/called **verbatim** — not modified or replaced — per Operating Principle #4 and the Section-10 prohibition.
