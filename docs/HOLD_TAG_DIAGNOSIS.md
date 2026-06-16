# HOLD_TAG_DIAGNOSIS.md

**Round:** SQF Workstream & Regression-Restore — branch `Claude-changes` — Date: 2026-06-16
**Artifact:** Equipment Quality Hold Tag (FRM-029-002), auditor-approved SQF tag.
**Goal of this doc:** state exactly *why* the CMMS web app is not picking up Izzy's auditor-approved hold tag. **No fix applied.**

---

## 1. What Izzy's reference has (read-only, do not modify)

- **`_reference/izzy_current/EquipmentHoldTag.html`** — full auditor-approved dialog (≈900 lines):
  - **Issue Tag** tab — equipment-selection cascade, tag type (Red/Yellow/Orange), reason/identified-risk capture, equipment-info block.
  - **Clear Tag** tab — manager-only release (release date, released by, disposition).
  - **Print** screen — physical hold-tag layout for printing.
- **Backend in `_reference/izzy_current/ServiceReportBackened.js`:** `getEquipHoldTagFormData()` (~line 358), `submitEquipmentHoldTag()` (~line 682), `getActiveTagsForClearing()`, `clearEquipmentTag()`.
- The auditor-approved **fields** (the "ON HOLD — not to be used…" banner, date placed, hold authority, unique tag # + reference #, color, equipment ID/description, release block) match the SQF Reference Master FRM-029-002 field spec (clauses 2.3.1–2.3.5, 2.6.3).

## 2. What the web app has

- **Backend — PRESENT and functional** (`backend/MonitoringViews.gs`):
  - `getEquipHoldItems()` — `:171` — reads `🏷️ Equipment Hold Log` (data read path **works**).
  - `issueEquipHoldTag()` — `:233` — writes the hold log + Master Log (`ML_ACTIONS.EQUIP_TAGGED`).
  - `clearEquipTag()` — `:305` — clears status, logs `EQUIP_CLEARED`.
- **Frontend — DEGRADED, not the auditor form:**
  - `_tdIssueTag_()` — `frontend/partials/ticket-detail.html:645` — a **small inline modal** that captures **only `tagType` + `reason`** (`:654–655`), then calls `issueEquipHoldTag()` (`:668`).
  - **No `EquipmentHoldTag.html`** exists anywhere under `frontend/` or `frontend/partials/` (confirmed by file listing).
  - **No printable hold-tag template**, no clear-tag manager UI, no equipment-info block, no doc-control.

## 3. ROOT CAUSE

**The auditor-approved hold-tag FORM was never ported to the web app.** This is a *partial-port* defect, not a broken include or schema mismatch:

| Layer | State | Evidence |
|---|---|---|
| Data schema (`🏷️ Equipment Hold Log`, EHL) | ✅ aligned with reference | `Config.gs` SH.EQUIP_HOLD_LOG; `getEquipHoldItems` reads it |
| Read path | ✅ works | `MonitoringViews.gs:171` |
| Write/issue/clear backend | ✅ present | `MonitoringViews.gs:233,305` |
| **Auditor-approved HTML form** | ❌ **never created** | no `EquipmentHoldTag.html` under `frontend/` |
| **Printable tag (through PDF engine)** | ❌ **never wired** | no hold-tag print path; see `SERVICE_REPORT_REGRESSION.md` re: PDF engine |
| Frontend capture | ⚠️ stripped to tagType+reason | `ticket-detail.html:645–668` |

**Precise statement:** the web app "doesn't pick up" the hold tag because the rich, auditor-approved `EquipmentHoldTag.html` (issue → print → clear, with all FRM-029-002 fields) from `_reference/izzy_current/` was replaced during the web-app rebuild by a minimal two-field inline modal, and the **printable tag was never wired to the PDF engine**. The data layer is fine; the *presentation/print* layer is missing.

## 4. What the build will need (step 4 — STOP-and-workshop, NOT done here)
- Port Izzy's auditor-approved fields verbatim (do not alter them).
- Add only the doc-control triplet: **FRM-029-002 / Rev 0 / Rev Date 6/15/26**.
- Wire printing through the **existing PDF engine** (see regression doc — engine currently lives only in Izzy's reference `Code.js:2279–2288`; **this needs Michael's decision**, raised in `SERVICE_REPORT_REGRESSION.md`).
- Surface Equipment Hold Log as the FRM-029-001 register view.
