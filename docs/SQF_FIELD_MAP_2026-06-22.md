# SQF Field Map & Work-Order — 2026-06-22

**For:** Michael (mjmarrujo@cscmfg.com)
**Source of truth:** SQF Reference Master `1WZOuC5…` → *Field Specifications* tab (read live 6/22).
**Mapped against:** the **Cloudflare Worker** (`cloudflare-worker/worker.js`) — the live backend for the GitHub Pages app — and the live Google Sheets it writes.

> ### Architecture truth (this changes the plan)
> The **GitHub Pages app talks to the Worker**, and the **Worker writes directly to the Sheets** via a service account. It does **not** call the GAS `backend/*.gs` code. Therefore:
> 1. **Admin** in the Pages app is decided by the Worker reading the `System Admins` value from the `⚙️ Configuration` tab (`worker.js:181, :220`). The GAS `getAdminEmails()` I edited only affects the *legacy in-sheet* app. **To be admin in Pages: add your email to the `System Admins` config cell** (see §1). No deploy needed — the Worker reads it live.
> 2. Any **new persisted field** in the Pages app must be added in **`worker.js`** (Edward's file). The schema columns added previously in `backend/*.gs` (RDB cols 34–40, TF cols 18–22) are **inert for Pages** unless the Worker writes them too.
> 3. **Good news:** the Worker *already* writes much of the SQF set. The remaining work splits cleanly into **frontend-only (mine)** and **Worker (Edward)** — itemized per field below.

Legend: ✅ live in Worker · ⚠️ partial · ❌ not persisted by Worker · **FE** = frontend capture gap (mine) · **WK** = Worker write gap (Edward)

---

## 1. Admin access — the actual fix for the Pages app

**Where "admin" is defined for Pages:** data, not code — the `⚙️ Configuration` tab, key column `System Admins` (Worker reads `config['System Admins']`, splits on commas, checks your email).

**To make yourself admin (no deploy, instant on next login):**
1. Open the maintenance spreadsheet the Worker is bound to (the `SPREADSHEET_ID` in `cloudflare-worker/wrangler.toml`).
2. Go to the **`⚙️ Configuration`** tab.
3. Find the row whose **key (col C)** is `System Admins`.
4. In the **value (col D)**, append `, mjmarrujo@cscmfg.com` to whatever's there.
5. Reload the app → you're admin → the **Equipment Cache** tab (and Configuration / Manager Access / Dept Map) appears.

*(If you want the in-sheet legacy app to also recognize you, that's the `getAdminEmails()` change I already pushed — but Pages only needs the config cell above.)*

---

## 2. FRM-030-003 — Maintenance Repair Record (CMMS Service Report)
Worker writer: `handleServiceReport` (`worker.js:1678`); reader/autopopulate: `handleGetServiceReport` (`:1715`). Frontend: `_tdServiceReport_` modal (`ticket-detail.html:760+`).

| SQF field (Field Spec) | R/C | Clause | Live system location | Status |
|---|---|---|---|---|
| Record / Work-Order ID | R | implied | Ticket # | ✅ |
| Asset ID + physical location | R | 2.16.2/2.2.4 | equipCode + buildingZone | ✅ |
| Department | R | implied | dept | ✅ |
| Date of service | R | 2.16.2 | `sr-service-date` → serviceDate | ✅ |
| Priority code | R | 2.10.4/2.2.4.15 | from ticket | ✅ |
| Problem / fault description | R | implied | description | ✅ |
| Work performed | R | 2.16.2 | workSummary | ✅ |
| Corrective actions | R | 2.16.2 | correctiveAct | ✅ |
| Parts ordered | C | 2.10.4 | partsUsed (free text) | ⚠️ free-text, not itemized |
| Recommendations | C | 2.16.2 | recommendations | ✅ |
| Technician / service provider | R | 2.16.2 | completedBy | ✅ |
| Restricted-activity flag | C | 2.4.1 | `sr-restricted` → restrictedActivity | ✅ |
| Post-Repair Clearance block | R | 2.14.3 | see §3 | ✅ |
| Facility-contact signature + date | R | 2.14.4 | facilityContact / facilityContactDate | ✅ |

**Verdict:** FRM-030-003 is **fully persisted by the Worker today.** The user-reported "can't scroll / can't generate / doesn't autopopulate" is a **deployment** problem (live site is serving Edward's frontend, which lacks `main`'s scroll-print CSS + the `v()` autopopulate). No new fields needed.

---

## 3. Maintenance Repair Clearance (embedded in FRM-030-003)
Worker persists these in `handleServiceReport` (`:1701–1703`).

| SQF field | R/C | Clause | Live location | Status |
|---|---|---|---|---|
| Asset ID + link to repair record | R | implied | ticketNo + equipCode | ✅ |
| Maintenance/Repair complete? Y/N | R | 2.14.3.1 | clrRepairComplete | ✅ |
| All tools removed? Y/N | R | 2.14.3.2 | clrToolsRemoved | ✅ |
| Area cleaned & sanitized, no residual lubricants? Y/N | R | 2.14.3.3 | clrAreaClean | ✅ |
| Sanitation/QA inspection required? | C | 2.13/2.4.1 | clrQaRequired | ✅ |
| Verification — name, signature, date | R | 2.14.4 | facilityContact / facilityContactDate | ✅ |

**Verdict:** ✅ complete in the Worker. (This is the sanitation capture that currently lives *only* in the Service Report — see §6 for porting the sanitation confirmation into the close gate per your decision.)

---

## 4. Maintenance Activity / Temporary Repair Log (CMMS Temp Fix Monitor)
Worker writer: `handleFlagTempFix` (`worker.js:1523`), schema `TF` cols 1–22.

| SQF field | R/C | Clause | Live location (TF col / body key) | Status |
|---|---|---|---|---|
| Entry ID | R | implied | TEMP_ID | ✅ |
| Asset ID + location | R | implied | EQUIP_CODE + BUILDING_ZONE | ✅ |
| Date temp repair made | R | 2.10.3 | DATE_FLAGGED | ✅ |
| Temporary-repair description | R | 2.10.3 | TEMP_FIX_DESC ← `tempFixDesc` | ✅ |
| Reason fix is temporary | R | 2.10.4 | REASON_TEMPORARY ← `reasonTemporary` | ⚠️ **FE** — Worker writes it, **frontend never collects it** |
| Permanent-fix plan / WO ref | R | 2.10.4 | PERM_FIX_PLAN ← `permFixPlan` | ⚠️ **FE** — Worker ready, frontend gap |
| Parts ordered | C | 2.10.4 | — | ❌ **WK+FE** |
| Priority | R | 2.10.4 | (from ticket; not on TF row) | ⚠️ |
| Expected completion date | R | Mike's tab | EXPECTED_COMPLETION ← `permFixDate` | ⚠️ **FE** — Worker ready, frontend gap |
| Weekly follow-up log (date, reviewer, status) | R | 2.10.5-.6 | LAST_INSPECTED only | ❌ **WK+FE** no structured review log |
| No improvised materials confirmed | R | 2.10.7 | NO_IMPROVISED ← `noImprovised` | ⚠️ **FE** — Worker ready, frontend gap |
| Product-risk confirmation | R | 2.10.1 | PRODUCT_RISK_OK ← `productRiskOk` | ⚠️ **FE** — Worker ready, frontend gap |
| Downtime (planned/unplanned, duration) | C | 2.17 | downtimeDuration on complete | ⚠️ partial |

**Verdict:** The **Worker already persists** reason-temporary, permanent-fix plan, expected-completion, no-improvised, and product-risk — but the **"Flag as Temp Fix" frontend only sends a checkbox** (`mc-tf` in `_tdComplete_`), so those fields are always blank. **This is a frontend-only fix (mine).** Only "parts ordered" and the structured "weekly follow-up review log" need Worker work (Edward). This is your **"Temp Fix Monitor — visual + operational checklist"** item.

---

## 5. FRM-029-001 — Non-Conforming Equipment Register (CMMS Equipment Hold Log)
Worker writer: `handleIssueHoldTag` (`worker.js:1646`), schema `EHL` 14 cols.

| SQF field | R/C | Clause | Live location | Status |
|---|---|---|---|---|
| Asset ID | R | 2.3 | EQUIP_CODE | ✅ |
| Date placed on hold | R | 2.3.2 | DATE_TAGGED | ✅ |
| Hold authority (who placed) | R | 2.3.3 | TAGGED_BY | ✅ |
| Hold tag # | R | 2.3.4 | TAG_ID | ✅ |
| **Hold reference #** | R | 2.3.4 | — | ❌ **WK+FE** |
| Tag color | R | 2.3.5 | TAG_TYPE | ⚠️ verify it encodes color |
| Reason / identified risk | R | 2.6.2 | REASON | ✅ |
| **Root-cause ref → CAPA (FRM-017-001)** | R | 2.4.2 | — | ❌ **WK+FE** |
| **Disposition decision + authorized by** | R | 2.5.2-.3 | — | ❌ **WK+FE** |
| Release date | R | 2.6.3.1 | CLEARED_DATE (on clear) | ✅ |
| Released by | R | 2.6.3.2 | CLEARED_BY (on clear) | ✅ |
| **What was done with equipment** | R | 2.6.3.3 | NOTES (unstructured) | ⚠️ **WK+FE** dedicate a field |

**Verdict:** This is the **biggest real gap.** Four fields are not persisted (hold reference #, CAPA ref, disposition+authorized-by, what-was-done) and there is **no register *view*** that presents the hold log as FRM-029-001. Needs **Worker (Edward) + frontend (me) + a new admin/monitoring register view.**

---

## 6. FRM-029-002 — Equipment Quality Hold Tag
You marked this **"gtg."** Fields (ON-HOLD text, date, authority, tag#, color, equip ID, release block) are covered by the hold-tag modal + EHL. ✅ Reconcile the "two tags" question (Flag 5) with Quality — not an engineering task.

---

## 7. The sanitation-in-complete + gate decision (your D2: "work summary AND sanitation")
- **Mark Work Complete** (`_tdComplete_`) collects CAPA + hours + downtime but **no sanitation/food-safety item**.
- **Verify & Close** checklist = "Work summary documented / Root cause identified / Corrective action verified" — and the Worker (`handleVerifyClose`) **stores but does not enforce** it.
- **Plan (per your answer):** the close-gate checklist becomes **Work summary documented · Root cause identified · Corrective action verified · _Area cleaned & sanitized — no food-safety risk_** (adds sanitation alongside work summary). Frontend change is mine; **server-side enforcement** (block close if incomplete) is a Worker change (Edward) since `handleVerifyClose` is the live gate.

---

## 8. Work-order — who does what (designed to NOT collide with Edward's Worker edits)

**Mine — frontend-only, no Worker, no schema (safe to do on `claude/modest-hypatia-euhem0`):**
- F1. Temp-Fix capture form: add Reason-temporary, Permanent-fix plan, Expected-completion date, No-improvised-materials Y/N, Product-risk Y/N to the flag-temp-fix UI (Worker already persists them). → §4
- F2. Close-gate checklist: add the sanitation/food-safety item. → §7
- F3. Reports page: port the ticket-list filter controls under Reports. → your "filtering under reports"
- F4. NCR register *view* (read-only) presenting the hold log as FRM-029-001 (using fields that exist today; new fields show once Edward adds them).

**Edward — Worker (`worker.js`) write/enforce changes (hand him this doc as the spec):**
- W1. `handleVerifyClose`: enforce the SQF checklist (reject close if incomplete). → §7
- W2. `handleIssueHoldTag` + `EHL` schema: add hold-reference #, root-cause→CAPA ref, disposition + authorized-by, "what-was-done" (and a release/disposition update path). → §5
- W3. Temp-fix: add "parts ordered" + a structured weekly-review log. → §4
- W4. **Reconcile the Report Database schema** — the Worker writes a 23-col `rptRow` (`:1695`) whose order differs from the GAS `RDB` 40-col layout; align on one layout so both backends and any export agree. *(latent data bug)*

**Coordination rule to avoid rework:** I keep my edits to `frontend/` + (legacy) `backend/*.gs`; I do **not** touch `worker.js`. Because Edward also edits `frontend/partials/ticket-detail.html`, my frontend changes are best landed **after** you pull his branch into `main`, so we resolve one merge instead of two. That directly addresses your "don't make conflicting changes" concern.

---

## 9. Net state of your checklist (corrected against the live Worker)
| Your item | Reality |
|---|---|
| Filtering under reports | Frontend port (F3) — mine |
| Service report scroll + generate | **Already fixed on `main`; it's a deployment problem** (Edward's frontend is live) |
| Service report autopopulate | Worker `handleGetServiceReport` supports it; `main` frontend uses it — deployment problem |
| Machine cache connect | Need admin (§1) + Edward's Worker cache endpoints — UI already exists |
| Temp fix monitor (visual + operational checklist) | Worker persists most fields; **frontend capture missing (F1)** + Edward W3 |
| Double-check the gates | Gate 1 sound; **Gate 2 checklist not enforced** (Edward W1) |
| Make myself admin | **Config sheet `System Admins` cell (§1)** — not code, for Pages |
| Sanitation in mark-complete | F2 (frontend) + W1 (enforce) |
| Maintenance Repair Log (Ingrid) | Process approval, not code |
| Equipment Hold Tag | gtg ✅ |
| Temporary repair log | §4 |
| Non-Conforming Equipment Register | Biggest gap — §5 (W2 + F4) |
| Maintenance Repair Record / Clearance | ✅ fully persisted (§2/§3) |
