# Cost Reports — data source findings (2026-07-14)

Investigation notes from wiring `cost-reports.html` to real data. Captures what
was learned about the two source spreadsheets so a future session doesn't have
to re-derive it. **Conclusion: rebuild `handleCostData()` on raw data + the
Equipment Register's Job→Dept mapping — do not use the summary "Costs" tabs.**

## Spreadsheet 1 — "Costs 2024" (`1_RSX-9cddHOhTb16g6NC96Z_09YQFBA58WjQ5AT9N6o`)
Owned by `dchoye@cscmfg.com`. Already set as the `COST_SPREADSHEET_ID` secret.

| Tab (exact name) | What it is | Columns |
|---|---|---|
| `DATA Hours` | **Raw labor log, ALL departments mixed together, 6,273 rows.** Two blocks: cols A-D = 2025-to-present, cols O-R = 2022-2025 (same shape, no header on the second block). Together = full history. | A=Date (serial), B=Job#, C=Hours, D=Name (mechanic — "not important for reports" per a note in the sheet) |
| `DATA Material` | Raw material-cost log, ALL departments, keyed by Dept code directly (reliable on every row). | A=Date, B=Job, C=Acct, D=Dept code, E=Combined, F=Amount |
| `JOBS` | Job# → **15 idiosyncratic categories** (Metal Mfg, Slitter, Press, Dies, Plastic, Metal Dec, Plastic Dec, Machine Shop [only 3 codes: 500-502], Trucks/Lifts, Golf Cart 1/2, Support Equip, Rental Bldg, CSC Bldg, QA). **Do not use this legend** — see Spreadsheet 2 below for the mapping that actually matches CMMS's department taxonomy. |
| `DEPT` | Dept code → name: 001 Metal, 003 Plastic, 004 Litho, 006 Plastic Deco, 007 QA, 008 M/S, 009 S/R, 030 Sales, 031 G&A. Matches CMMS canonical depts. |
| `VEHICLES`, `ACCOUNTS` | Not yet investigated — likely more legends (vehicle IDs, chart-of-accounts codes referenced by DATA Material's Acct column). |
| `Machine Shop Hours` | **Misleading name — actually contains Plastic Manufacturing equipment-type breakdown data**, not Machine Shop data. Don't use. |
| `CSC Building Costs`, `PLASTIC MFG COSTS`, `Forklift Cost`, `Plant Maintenance Costs`, `INJECTION MOLD COSTS` | **Semi-Annual Report snapshots** (each literally headed "Semi-Annual Report 2026" with a Start/End Date row) — not live data, and each does its own **bespoke pivot**, not a simple per-department sum: Forklift Cost splits by which *other* dept each forklift served; Plant Maintenance Costs aggregates several JOBS categories in a custom way; Plastic Mfg Costs breaks down by machine referencing ranged/comma-separated job codes (`"322, 323, 324..."`, `"348-399"`). Real header row is **row 7**, not row 1 (rows 1-6 are title/date-range banner). Replicating these exactly would mean reverse-engineering 5 different one-off formulas. **Not recommended as a data source.** |

## Spreadsheet 2 — Equipment Inventory Control Register (`1dlqp8jEMxxNYkIhr30tWK1yuC6FFlYTFU8Eq6EXeIps`)
**This is the same Equipment Register already used elsewhere in the CMMS** (Equipment Inventory page / equip cache). This is the correct legend to use.

| Tab | Columns |
|---|---|
| `FRM-030-001 Equipment Inventory` | **A=Job Number, B=Department, C=Line#, D=Equipment Type, E=Equipment Description, F=Dept Code, G=Status**, H=Installation Date, I=Retired Date, J=Notes, K=Physical Location. Department names here (Metal, Electrical, Plastic, Litho, Plastic Dec, ...) are the **same canonical depts already used everywhere else in CMMS** — this is the mapping to join `DATA Hours` job numbers against, not the Costs-2024 `JOBS` tab. |
| `Departments` | Dept Code → Department Name → Description, canonical reference copy. |
| `Job Number List`, `Buildings`, `Accounts`, `Po Log` | Not yet investigated. |

## What was actually built (2026-07-14, second pass)

The canonical-CMMS-department approach above was **not** what Michael wanted: he wants
Cost Reports organized by the tabs as they already appear (Plastic Mfg, Injection Mold,
Forklift, CSC Building, Machine Shop, Plant Maintenance) — not collapsed into the
9-department taxonomy used elsewhere in CMMS. Reading every formula in the 5 summary
tabs (via a downloaded snapshot, not just the visible cell values) surfaced a much
clearer picture than either the "use the tabs as-is" or "rebuild by canonical dept"
options originally on the table:

1. **Every dollar figure in every summary tab is a simple, fully-replicable formula** —
   `SUMIFS(DATA Hours, date range, job# in {list}) × $28.39/hr` for labor, and the same
   pattern against `DATA Material` for material cost. No hidden pivots. This meant the
   rebuild could recompute everything from `DATA Hours` + `DATA Material` directly,
   without ever touching the summary tabs' own (partially buggy) precomputed columns.
2. **"Plant Maintenance Costs" is not a peer department tab** — its 9 rows are a clean,
   non-overlapping partition of essentially every job# in the workbook (395 unique jobs
   across 9 buckets, zero overlap, confirmed programmatically). That total **is** the
   whole-company total. It became the Cost Reports "Overview."
3. Plastic Mfg Costs + Injection Mold Costs are both finer breakdowns of Plant
   Maintenance's single "Plastic Manuf." bucket (by machine vs. by mold); Forklift Cost
   is a partial breakdown of "Trucks, Lifts & Autos"; CSC Building Costs is a full
   breakdown of "Buildings." These became drill-down views nested under their parent
   Overview bucket, not separate additive categories (summing all 6 tabs would have
   multiply-counted almost everything).
4. **"Machine Shop Hours" is misleadingly named** — its real header is "Plastic
   Manufacturing," and its ~40 lines (across 7 sections: Plastic Manufacturing, Metal
   Manufacturing, Metal Decorating, Shipping, Automobiles/Buildings/Customer Equipment,
   Plastic Decorating, Building Support Equipment) are an hours-only, no-$ breakdown of
   **every hour the Machine Shop crew logged, by which department's equipment they
   serviced** — not a Machine Shop-only log. Per Michael: "Machine Shop works across the
   board so their display should be across the board." This tab's job-code partition
   became `MACHINE_SHOP_SECTIONS` in `worker.js`, now with real $ added, as a single
   unified "where did the Machine Shop's time and money go" view — merging what used to
   be split across an unrelated cost line (jobs 500-502 only) and this separate
   hours-only tab.
5. Several verified copy/paste bugs in the source formulas were fixed rather than
   replicated: mismatched job#s between a row's Hours and Material formulas (Plastic
   Mfg's "Machine #10", Plant Maintenance's "Trks. Lifts Autos"), a hardcoded $0
   material cost (Forklift unit #29), and material formulas pointing at a different
   building's job# entirely (CSC Building's "Metal Deco. Building" / "Rental Building").

Implemented in `handleCostData()` in `worker.js` — see the architecture comment directly
above that function for the full bucket/asset job-code reference. `cost-reports.html`
now renders: an Overview of the 9 Plant Maintenance buckets, drill-downs into
Plastic Mfg/Injection Mold (under "Plastic Manufacturing"), Forklift (under "Trucks,
Lifts & Autos"), and CSC Building (under "Buildings"), and a dedicated cross-department
Machine Shop view. Real date-range filtering (`dateFrom`/`dateTo` query params) now
works, unlike the original summary tabs which had no date column to filter on.

**Known limitation carried over intentionally:** `DATA Hours` also has a legacy
2022-2024 block in columns O–R (different shape, no header) that none of the original
summary-tab formulas ever read either. This rebuild matches that prior behavior and
reads only the primary A–D block (2025-present) — worth addressing in a future pass if
older history needs to show up in Cost Reports.

## State of code as of this second write-up

- `feat/pm-dept-scoping` — merged (PM dept segmentation, downtime comparison report, equipment downtime KPI tiles, stuck-overlay nav fix). Live.
- `feat/cost-report-all-depts` — this branch, now rebuilt per the "what was actually built" section above. `worker.js`'s `handleCostData()` and `frontend/partials/cost-reports.html` were both rewritten; `wrangler.toml` `APP_VERSION` bumped to 3.89.
- `COST_SPREADSHEET_ID` secret is set (Edward). The Equipment Register spreadsheet is **no longer needed** for Cost Reports — the canonical-CMMS-department approach was superseded by the tab-parity approach above.
- Downtime Duration (ML col 42) is manual-entry-only, added in Workshop 4 (`a4b92ec`, 2026-06-09, "C16"), optional field, no auto-calculation — confirmed with Michael this stays manual, no fallback from ticket timestamps.
