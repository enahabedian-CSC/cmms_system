# CMMS Audit & Diagnosis — 2026-06-22

**For:** Michael (mjmarrujo@cscmfg.com)
**Branch:** `claude/modest-hypatia-euhem0`
**Method:** audit → diagnose → act (per your instruction). This document is the audit + diagnosis. Only one code change is included in this pass (admin self-grant); everything else is staged behind the decisions in §10.

---

## 0. The single most important finding (read this first)

**Most of what you reported as "broken" is already fixed in the code on `main` — you are testing a deployment that does not contain that code.** This is a *deployment/branch-coherence* problem far more than a "build it" problem.

Concretely, three different things deploy from three different places:

| Layer | What it is | How it deploys | Source of truth today |
|---|---|---|---|
| **Frontend** (`frontend/`) | The HTML UI you click | GitHub Pages, automatically, on push to `frontend/**` | **BOTH `main` AND `EdwardsTestBranch`** (see `.github/workflows/deploy-pages.yml:5`) |
| **GAS backend** (`backend/*.gs`) | Data/logic in Google Apps Script | **Manual** `clasp push` (`deploy.ps1`) — *no CI* | whoever ran clasp last |
| **Cloudflare Worker** (`cloudflare-worker/worker.js`) | The bridge the frontend `fetch()`es | Manual `wrangler deploy` | Edward |

### Why your fixes "don't work"
1. **The Pages deploy races.** `deploy-pages.yml` triggers on pushes to *both* `main` and `EdwardsTestBranch`, into the *same* Pages site, with `concurrency: pages, cancel-in-progress: true`. **Whoever pushed `frontend/**` last wins.** If Edward pushed his branch's frontend after the last `main` deploy, the *live* UI is Edward's frontend — and Edward's branch is missing the recent `main` fixes (service-report scroll/print, SR autopopulate, SQF clearance — see §2/§5).
2. **The GAS backend is never auto-deployed.** Even when `main`'s frontend is live, the `.gs` changes only reach the app when someone runs `deploy.ps1` (`clasp push`). Backend-side fixes silently don't take effect until that happens.
3. **This working branch (`claude/modest-hypatia-euhem0`) is not in the deploy list at all** — so anything I commit here is invisible to the live app until it's merged to `main` (frontend) and `clasp push`ed (backend).

**Implication:** before we add a single new field, we should make the pipeline coherent, or we'll keep "fixing" things that never reach you. This is decision **D1** in §10.

---

## 1. Is Edward's branch "more up to date"? — No: it has *diverged*

`EdwardsTestBranch` is **not ahead of** `main`; the two have split. Each has work the other lacks.

**Only on `EdwardsTestBranch` (newer there):**
- `78b490f` convert all `google.script.run` calls to `fetch()` Worker endpoints
- `3bf6a9d` photo upload & capture on ticket submission
- `78ea8fc` sortable ticket lists/tables
- `60629fc` build equipment hierarchy from the Equipment Inventory Cache
- `0bbbacd` **equipment cache refresh w/ external register integration** ← the machine-cache work you want
- `efcec94` CI: deploy Pages on `EdwardsTestBranch`

**Only on `main` (newer there):**
- `6b4bf54` **Fix service report scroll/print, hold-tag color print, SR autopopulate**, dashboard/history correctness
- `4c0b146` temp-fix SQF detail view, dashboard review KPIs, layered SR doc refs, Izzy import guard
- `c0fef2b` system-wide unique open count
- `86524b7` new-ticket equipment dropdown from cache
- `9a2bdfe` Active-Tickets CSV export

**Verdict:** Edward's branch holds the newer **Worker + equipment-cache + photo** work; `main` holds the newer **service-report + SQF + dashboard** work. Neither is a superset. They must be **merged**, not chosen. That merge is the crux of the "machine cache" item *and* the "service report can't generate" item simultaneously — which is why D1 matters.

---

## 2. Service Report "can't scroll / can't generate" — already fixed on `main`

On `main` (and this branch), `frontend/partials/ticket-detail.html` already has:
- **Scroll:** `.td-modal { max-height:90vh; overflow-y:auto; }` (`:68`) — the modal scrolls.
- **Print/"generate":** `body.printing-sr .td-modal { overflow:visible; max-height:none; }` (`:84`) + `window.print()` path; per `docs/SERVICE_REPORT_REGRESSION.md`, "generate" = print-at-will (no Drive PDF — your 6/16 decision).
- **Autopopulate:** every field uses a `v(savedKey, ticketValue)` helper that pre-fills from existing ticket data, e.g. `v('correctiveAct', t.correctiveAct)`, `v('rootCause', t.rootCause)` (`:773–804`). The CAPA data **does** carry over.

**Edward's branch lacks the autopopulate** — his `_srYN_(...)` clearance rows are called with **no pre-fill argument** (`ticket-detail.html:745–748` on his branch) vs. `main`'s `_srYN_('sr-clr-complete', '…', false, v('clrRepairComplete', defComplete))`. So if the live site is serving Edward's frontend, you'd see exactly your symptoms: a static-feeling modal and no autopopulation.

**Diagnosis:** the service-report fix is a *deployment* problem, not a code problem. Resolved by D1.

> If, after `main`'s frontend is confirmed live, the modal *still* won't scroll on your machine, the next suspect is a CSS conflict from the inlined partials at build time — but the code is correct as written.

---

## 3. Admin — where it's coded, and the change made

- **Single source of truth:** `backend/Auth.gs` → `getCurrentUserInfo()` sets `isAdmin = getAdminEmails().indexOf(email) > -1` (`:22–23`). Role gating everywhere keys off this (`requireAdmin_`, frontend `USER.role === 'admin'` at `index.html:303`).
- **`getAdminEmails()`** (`backend/Config.gs:610`) reads the `⚙️ Configuration` sheet, key **`System Admins`** (comma-separated). There is **no hard-coded admin** in the current system (the legacy `ADMIN_EMAILS` array in `legacy-apps-script/Accesscontrol.js:8` is *not* used by the live `backend/`).
- **The "invisible config tab" you expected is real:** the admin nav section (Configuration / Manager Access / Dept Map / **Equipment Cache**) is rendered only when `isAdmin` (`index.html:357–364`). The **Equipment Cache** page (`admin-equip`) already exists (`frontend/partials/admin.html:133–329`) with a **"Refresh Cache Now"** button → `POST /api/admin/equip-cache/refresh`. So your instinct was exactly right: **becoming admin unlocks the equipment-cache tab.**

**Change made (this branch):** `getAdminEmails()` now unions the sheet value with a code-level guaranteed-admin list containing **`mjmarrujo@cscmfg.com`** (`Config.gs:609–630`). You are an admin even if the sheet is blank/edited. (Cleaner long-term: also add yourself to the `System Admins` row in `⚙️ Configuration` so it's visible to others; the code list is the can't-get-locked-out safety net.)

⚠️ **This only takes effect once the `backend/` is `clasp push`ed** (no CI for GAS — see §0). And the Equipment-Cache *refresh button* calls the **Worker** endpoint, which is Edward's domain (§4).

---

## 4. Machine / Equipment Cache — split ownership, defer the Worker to Edward

- **Admin UI:** exists on `main` (`admin.html` `admin-equip`). ✅
- **GAS side:** `EquipRegistry.gs` / cache readers exist. ✅
- **The connect/refresh path:** the button hits the **Worker** (`/api/admin/equip-cache/refresh`), and Edward's `0bbbacd` ("equipment cache refresh … external register integration") and `60629fc` ("equipment hierarchy from cache") are exactly this. Per your instruction, **leave the Worker to Edward.**

**So "I can't add/connect machine cache" = (a) you weren't admin (fixed in §3), and (b) the Worker endpoint that does the refresh is Edward's in-flight work.** Action: get admin live, confirm with Edward that `/api/admin/equip-cache/*` is deployed on the Worker, then the tab works end-to-end. No Worker edits from me.

---

## 5. SQF compliance — 1:1 map (CMMS ↔ SQF ↔ your Google Sheet)

Good news: a detailed coverage matrix already exists at **`docs/SQF_COVERAGE_MATRIX.md`** and most build items were completed on the `Claude-changes` round and are present in `main`'s code today. Below is the consolidated 1:1 map plus the **true remaining gaps** (verified against current code, not the old doc claims).

### 5a. Document-level map

| SQF doc # | SQF name (your nomenclature) | CMMS location | Code status on `main` | Real gap |
|---|---|---|---|---|
| FRM-030-001 | Master Equipment Register | Equipment Inventory | `EquipRegistry.gs` | ok |
| FRM-030-002 | **Maintenance Repair Log** | Closed Tickets tab | header stamped `closed-tickets.html:73`; reads Master Log | ✅ code ok — *needs Ingrid's approval (process, not code)* |
| FRM-030-003 | **Maintenance Repair Record** | Service Report modal → print | doc# corrected to `FRM-030-003`, clearance block + restricted-activity + facility sign-off present (`ticket-detail.html:766–870`) | ✅ code ok (deployment-gated) |
| (embedded) | **Maintenance Repair Clearance** | Post-Repair Clearance block in 030-003 | present (`ticket-detail.html:791–804`) | ✅ |
| FRM-029-002 | **Equipment Quality Hold Tag** | Hold-tag modal/print | ported; you marked "gtg" | ✅ |
| FRM-029-001 | **Non-Conforming Equipment Register** | Equipment Hold Log | backend read/write (`MonitoringViews.gs`); register *view/fields* partial | ⚠️ register view fields incomplete |
| (unnumbered) | **Temporary Repair Log** / Maint. Activity | Temp Fix Monitor | backend `inspect/clearTempFix` exist; some SQF fields missing | ⚠️ see §6 |
| FRM-017-001/-002 | CAPA Form / Register | Quality system | link-only — **do not author** | n/a |

### 5b. The concrete, code-level SQF gaps that remain (verified today)

1. **Verification gate not enforced server-side (real).** `verifyAndCloseTicket` (`TicketLifecycle.gs:177`) accepts `sqfChecklist` but only stores it (`:246`) — **a ticket can be closed with zero checklist items ticked.** SQF 13.2.8 intends the checklist to be a hard gate. (See §7.)
2. **Sanitation missing from "Mark Work Complete" (your item).** Sanitation/food-safety only lives in the Service Report clearance block. The **Mark Work Complete** modal (`_tdComplete_`, `ticket-detail.html:397–435`) captures CAPA + hours + downtime but **no sanitation/food-safety confirmation**, and the **Verify & Close** checklist items (`:465–472`) are *"Work summary documented / Root cause identified / Corrective action verified"* — which **do not include the SQF food-safety/sanitation item** ("Area cleaned & sanitized, no food-safety risk"). This is the gap you flagged. Fixing it = align the checklist to the SQF food-safety set + enforce it (D2).
3. **Temp Fix Monitor missing fields (§6).**
4. **FRM-029-001 register view** — surfaced backend, but the dedicated register fields (hold authority, tag #, disposition/release block) aren't all exposed in a view.

### 5c. Field-by-field (FRM-030-003) — already conformant on `main`
Asset ID+location ✅, dept ✅, priority ✅, problem desc ✅, work performed ✅, corrective action ✅, technician ✅, restricted-activity flag ✅, post-repair clearance (complete/tools/clean+sanitized/QA-required) ✅, facility-contact sign-off ✅. Service-date & recommendations now in the modal too. The matrix's old "❌" rows for these are **stale** — they were closed on the `Claude-changes` round.

**To finish your 1:1 against the live Google Sheet** (`1WZOuC5…`, the Field Specifications tab), I need read access to that sheet to diff field names verbatim — see D3. The Drive MCP is connected; if you share/confirm access I can pull the exact field list and produce a literal column-for-column reconciliation table.

---

## 6. Temp Fix Monitor (visual + operational checklist) — partial

- **Backend exists:** `MonitoringViews.gs` `getTempFixItems` (`:12`), `inspectTempFix` (`:80`), `clearTempFix` (`:130`); a temp-fix SQF detail view was added in `4c0b146`.
- **Missing per SQF (`SQF_COVERAGE_MATRIX.md §D`):** permanent-fix plan / WO reference (2.10.4), user-entered **expected completion date**, **no-improvised-materials confirmation** (2.10.7), **product-risk confirmation** (2.10.1), and the weekly follow-up review log.
- **Your "visual and operational checklist"** maps to the Izzy `TempFixInspection.html` inspection workflow, which was never fully ported into the web app's inspection UI. Izzy's reference is at `_reference/izzy_current/TempFixInspection.html` — that's the model to port from.

---

## 7. The Gates (sequenced approval) — double-checked

Two gates, both manager-only (`requireManager_()`), implemented in `TicketLifecycle.gs`:
- **Gate 1 — Intake:** `approveTicket` WAITING → OPEN (`:13`). ✅ sound.
- **Gate 2 — Verification:** `verifyAndCloseTicket` PENDING VERIFICATION → CLOSED (`:177`). **Checklist NOT enforced** (stores but doesn't require — `:246`). The server should reject closure unless the required SQF items are present, matching Izzy's `managerVerifyTicket` (`_reference/izzy_current/ManagerReviewBoardServer.js`) which throws if the checklist is incomplete.
- Joint-dept sign-off exists (`deptSignOff`, `:927`) and is gated on PENDING VERIFICATION — good.

**Open decision (FLAG-1, never resolved):** which checklist items are the canonical gate? Izzy's 3 are food-safety-worded: *"Work completed satisfactorily / Area cleaned and safe / No food safety risk identified."* The web app currently shows 3 *different* items. This is exactly where the **sanitation** item belongs. → decision **D2**.

---

## 8. Maintenance Repair Log — needs Ingrid's approval (not code)
FRM-030-002 framing is in code and correct. Your note ("need to get it approved by Ingrid") is a process gate, not an engineering task. No code action; flagging so it isn't lost.

---

## 9. Filtering under Reports
You want the same filtering that exists under Tickets to also appear under Reports. `frontend/partials/reports.html` currently has the EMRL/CSV export but not the ticket-list filter controls (`ticket-list.html` has them). This is a self-contained frontend port — low risk, no Worker, no schema. Staged behind D1 (so it actually deploys).

---

## 10. Decisions I need from you (these change what I build next)

- **D1 — Pipeline coherence (the keystone).** The Pages workflow deploys *both* `main` and `EdwardsTestBranch` to one site (they clobber each other), and GAS never auto-deploys. How do you want to resolve? (Recommended: pick ONE deploy branch, merge Edward's Worker/cache/photo work and `main`'s SQF/SR work together, and add a GAS-deploy step or a manual clasp checklist.) This determines whether anything I build reaches you.
- **D2 — SQF verification checklist items.** Adopt Izzy's food-safety 3 ("Work completed satisfactorily / Area cleaned & sanitized — no food-safety risk / No food-safety risk identified"), keep the current 3, or a 4-item hybrid? And: enforce server-side (block close if incomplete)? This unblocks the sanitation-in-complete fix and the Gate-2 fix.
- **D3 — Google Sheet access** (`1WZOuC5…`). Confirm I can read the Field Specifications tab so I can produce the literal column-for-column reconciliation you asked for.
- **D4 — Edward coordination on schema.** Any new persisted field (e.g., a sanitation Y/N on completion, temp-fix permanent-plan/completion-date) touches the data layer the Worker reads. To avoid the "two people changing the worker" collision you're worried about, I'll keep all my changes to `backend/*.gs` + `frontend/` and **not touch `worker.js`** — but new fields still need Edward to surface them through the Worker. Confirm that division of labor.

---

## 11. What I did in this pass
- Added `mjmarrujo@cscmfg.com` as a guaranteed admin in `backend/Config.gs` (`getAdminEmails`). Takes effect after the next `clasp push` of `backend/`.
- Produced this audit/diagnosis.

Everything else is staged behind D1–D4 so we don't create rework against Edward's Worker.
