# SQF / Certification Field — Backend Storage Map

_Where each recently-added certification field is collected, stored, returned, and
displayed in the **live** stack (Cloudflare Worker `cloudflare-worker/worker.js`
→ Google Sheets). The legacy Apps Script `backend/*.gs` files have been removed and
are **not** part of any data path._

Sheets are referenced by the `SH` map (`worker.js:68`). Column numbers are 1-based
and come from the `ML` / `TF` / `PN` / `EHL` schema constants at the top of
`worker.js`.

---

## TL;DR — the CAPA # question

**The "CAPA #" column in Equipment Hold (Monitoring) is fully wired and deployed.**

| Stage | Location |
|-------|----------|
| Collected | `ticket-detail.html` → **Issue Hold Tag** modal, input `#tag-capa` (sends `capaRef`) |
| Endpoint | `POST /api/monitoring/hold-tags/issue` → `handleIssueHoldTag` |
| Stored | **Equipment Hold Log** sheet (`🏷️ Equipment Hold Log`), **column 16** (`EHL.CAPA_REF`), written at `worker.js:~1996` |
| Returned | `GET /api/monitoring/hold-tags` → `handleEhl`, `worker.js:970` (`capaRef`) |
| Displayed | `monitoring.html:531` (`esc(t.capaRef || '—')`) |

So the column shows blank only because:
1. **Pre-existing tag rows predate column 16** — tags issued before the NCR
   register was added (`3fa1bf2`) have no value there, and
2. no new tag has been issued **with** a CAPA value entered.

Both resolve with data, not code — issue a new hold tag and type a CAPA # in the
modal and it will appear. (`appendSheetRow` appends to `{sheet}!A1:append`, which
auto-extends the row to column 16, so no sheet-structure change is needed.)

No frontend field, backend column, or worker change is required for CAPA #.

---

## Equipment Hold Log — Non-Conforming Equipment Register (FRM-029-001 / FRM-029-002)

Sheet: `🏷️ Equipment Hold Log`. Schema: `EHL` (`worker.js:50`). Columns 15–19 are
the certification additions (additive — older 14-column rows stay valid).

| Field | Col | Collected | Stored by | Returned by |
|-------|-----|-----------|-----------|-------------|
| `holdRef` (NCR ref) | 15 | auto-generated (`NCR-…`) | `handleIssueHoldTag` | `handleEhl:969` |
| `capaRef` (CAPA #) | 16 | Issue Hold Tag `#tag-capa` | `handleIssueHoldTag` | `handleEhl:970` |
| `disposition` | 17 | Release/Clear modal `#ehl-disposition` | `handleEhlClear:1003` | `handleEhl:971` |
| `authorizedBy` | 18 | Release/Clear modal `#ehl-authorized` | `handleEhlClear:1004` | `handleEhl:972` |
| `whatDone` | 19 | Release/Clear modal `#ehl-whatdone` | `handleEhlClear:1005` | `handleEhl:973` |

> Note: the **dashboard attention widget** read path (`A6:N`, `worker.js:486`) is
> intentionally truncated at column N — it never displays CAPA/NCR fields, so the
> truncation is harmless. The Equipment Hold *table* uses `handleEhl` (`A6:S`),
> which returns all 19 columns.

---

## Master Log — CAPA, clearance, permanent-fix (SQF 13.2.8 / 2.14.3)

Sheet: `🗄️ Master Log`. Schema: `ML` (`worker.js:16`). Append-only; on read the
worker collapses rows per ticket with "latest non-empty wins."

| Field | Col | Collected (Mark Work Complete unless noted) | Returned by `handleTicketDetail` |
|-------|-----|--------|--------|
| `correctiveAct` | 20 | `#mc-corrective` (required) | ✅ |
| `rootCause` | 21 | `#mc-root` (required) | ✅ |
| `preventiveAct` | 22 | `#mc-summary` (required) | ✅ |
| `fixType` | 23 | `#mc-fix` | ✅ |
| `permFixPlan` | 40 | CAPA pencil / temp-fix flow | ✅ |
| `permFixDate` | 41 | CAPA pencil | ✅ |
| `downtimeDuration` | 42 | `#mc-downtime` | ✅ |
| `clrToolsRemoved` | 44 | `#mc-clr-tools` (required, SQF 2.14.3) | ✅ |
| `clrAreaClean` | 45 | Verify & Close | ✅ |
| `clrQaRequired` | 46 | Verify & Close | ✅ |

Joint-ticket fields live in `ML` cols 38 (`JOINT_DEPTS`), 39 (`JOINT_SIGNOFFS`),
43 (`PENDING_JOINT_DEPTS`) and are wired end-to-end.

---

## Temp Fix Monitor — SQF temporary-fix controls (Maintenance Program 030)

Sheet: `🔧 Temp Fix Monitor`. Schema: `TF` (`worker.js:34`). Cols 18–22 are the
cert additions.

| Field | Col | Returned by `handleTempFixDetail` |
|-------|-----|--------|
| `reasonTemporary` | 18 | ✅ |
| `permFixPlan` | 19 | ✅ |
| `expectedCompletion` | 20 | ✅ |
| `noImprovised` | 21 | ✅ |
| `productRiskOk` | 22 | ✅ |

---

## Service Report — Maintenance Repair Record (FRM-030-003)

Two destinations, by design:

1. **Master Log** gets the audit subset (`handleServiceReport:2016`): corrective
   action, root cause, preventive action, fix type, labor hours → `actualHours`.
2. **`📝 Report Database` (RPT_DB)** gets the full record — 23 columns written at
   `worker.js:2025` and read back for form pre-fill by `handleGetServiceReport`
   (`A2:W`, `worker.js:2054`).

RPT_DB-only fields (pre-fill works; **lost only if the RPT_DB tab is absent**):
`completedBy`, `laborHours`, `serviceDate`, `partsUsed`, `recommendations`,
`clrRepairComplete`, `facilityContact`, `facilityContactDate`, `restrictedActivity`.

> ⚠️ **Hardening candidate:** `handleServiceReport` wraps the RPT_DB append in a
> `try/catch` that silently swallows a missing-sheet error (`worker.js:2037`). If
> RPT_DB does not exist, those nine fields vanish with no warning. Recommend either
> auto-creating RPT_DB or surfacing the failure. (Not a CAPA issue.)

---

## How to verify the live deployment matches this map

- Worker version is exposed as `APP_VERSION` (`wrangler.toml`, currently `3.06`).
  The NCR/CAPA commit `3fa1bf2` is an ancestor of the 3.06 bump, so the deployed
  worker includes columns 15–19.
- If a cert field reads blank in the deployed app but this map says it is wired,
  the cause is almost always (a) legacy rows that predate the column, or (b) the
  value was never entered — not a code gap.
