# Worker changes — for Edward

**Context:** these are all the changes made to `cloudflare-worker/worker.js` (and the Worker deploy CI) on top of your work, with the reason for each. Your Worker code was **merged, not rewritten** — your cache/photo/admin/ticket logic is preserved. Everything below is additive or isolated. None of it is live until the Worker is deployed; you own the deploy and can optimize/preserve as you see fit.

All new sheet columns are **appended** (additive) so existing reads/rows stay valid.

---

## 1. Consolidation merge (PR #8)
When main and your branch were merged, I kept **your** equipment-cache subsystem (cacheData / A4:Z range / `buildEquipColIdx` / `deptMapping` / `handleRefreshEquipCache` / equipHierarchy → `{code, name}`) and your photo + reserve-id handlers verbatim. I only **added** three standalone read-only functions main had that your branch didn't, plus their routes:
- `handleTempFixDetail` — temp-fix SQF detail (joins TF row + ticket + parts + review history)
- `handleGetServiceReport` — returns the last saved service report so the form pre-fills
- `handleActiveTickets` — Active Tickets export for the Reports page
- Also adopted main's chronological sort in `handleTicketDetail` history.

## 2. Verify-&-Close gate enforcement — `handleVerifyClose`
Added a server-side guard: closing is rejected unless `body.sqfChecklist` contains all four SQF items (work summary, root cause, corrective action, **sanitation/food-safety**). SQF 2.13 / 2.14.3 / 13.2.8. ~6 lines near the top of the handler.

## 3. Non-Conforming Equipment Register, FRM-029-001
- **`EHL` schema +5 columns (15–19):** `HOLD_REF`, `CAPA_REF`, `DISPOSITION`, `AUTHORIZED_BY`, `WHAT_DONE`. Added `EHL_COLS = 19`.
- **`handleIssueHoldTag`:** row array is now `new Array(EHL_COLS)`; writes a unique hold reference # (`NCR-<ticket>-<ms>`) and `body.capaRef`.
- **`handleEhlClear`:** reads `A:S`; writes the release record — `DISPOSITION`, `AUTHORIZED_BY`, `WHAT_DONE` from the body.
- **`handleEhl`:** now reads `A6:S`, returns the 5 new fields, and accepts an `includeCleared` arg; route passes `?includeCleared=1` so the register can show released records.

## 4. Post-Repair Clearance at Mark Work Complete
- **`ML` schema +3 columns (44–46):** `CLR_TOOLS_REMOVED`, `CLR_AREA_CLEAN`, `CLR_QA_REQUIRED`.
- **`appendMasterLog`:** row array bumped `new Array(43)` → `new Array(46)`; writes the three clearance fields when present.
- **`handleCompleteTicket`:** passes `clrToolsRemoved / clrAreaClean / clrQaRequired` from the body.
- **`handleTicketDetail`:** Master Log read range `A2:AQ` → `A2:AT`; returns the three clearance fields (so the detail view and Service Report pre-fill can use them).
  - ⚠️ Note: `handleQueueTickets` / `mergeAndFilter` still read `A2:AQ` (they don't need clearance) — fine, but if you ever want clearance in list views, widen those too.

## 5. Worker auto-deploy CI — `.github/workflows/deploy-worker.yml` (new file)
Runs `wrangler deploy` (via `cloudflare/wrangler-action`) on push to `main` touching `cloudflare-worker/**`. Needs two repo secrets set once in the GitHub UI: `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit) and `CLOUDFLARE_ACCOUNT_ID`. Existing Worker runtime secrets in Cloudflare are untouched and persist. Optimize/replace this if you prefer your own deploy flow.

---

## ⚠️ Response-shape divergence to reconcile
main's Worker returns **bare arrays** for `/api/tickets/queue` and `/api/tickets/closed` (and the monitoring list endpoints). The currently-deployed Worker appears to **wrap** them in an object, which broke the list screens (`tickets.slice is not a function`). I made the **frontend tolerant of either shape** (`_asArray_` normalizer), so it works regardless — but you may want to settle on one canonical response shape for these endpoints. If you standardize on bare arrays (main's contract), no further frontend change is needed.

---

## New sheet columns to add headers for (optional, human-readability)
The Worker writes these positionally, so they work without headers, but for the sheets to read well:
- `🏷️ Equipment Hold Log` cols O–S: Hold Ref #, CAPA Ref, Disposition, Authorized By, What Was Done
- `🗄️ Master Log` cols AR–AT: Clr Tools Removed, Clr Area Cleaned, Clr QA Required
