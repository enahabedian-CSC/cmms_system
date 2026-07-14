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

## Recommended architecture for the rebuild
1. Read `DATA Hours` (Costs 2024) — real dates, real hours, per job#.
2. Read `FRM-030-001 Equipment Inventory` (Equipment Register) once, build a Job# → Department map (canonical CMMS dept names).
3. Attribute every `DATA Hours` row to a department via that map — this covers **every** department in one pass, not just Machine Shop.
4. Read `DATA Material` and attribute via its own Dept code column (already working — see `COST_DEPT_CODE_MAP` in `worker.js`, though it should be re-keyed to match the canonical dept list from step 2 instead of the partial guesses made this round).
5. This unlocks real date-range filtering and the Monthly Cost Trend chart on the Cost Reports page — which the summary "Costs" tabs structurally cannot support (no date column).
6. Cost Reports' department list (`_CR_DEPTS_` in `cost-reports.html`, currently 6 hardcoded depts with sample hourly rates) should be reconciled against the real canonical department list rather than assumed.

## State of code as of this write-up
- `feat/pm-dept-scoping` — merged (PM dept segmentation, downtime comparison report, equipment downtime KPI tiles, stuck-overlay nav fix). Live.
- `feat/cost-report-all-depts` — **uncommitted, superseded by this finding.** It wired the 5 "Costs" summary tabs directly (per Michael's column descriptions before this deeper investigation). Given those tabs are semi-annual snapshots with bespoke pivots, this branch should probably be discarded/redone against DATA Hours + DATA Material + the Equipment Register instead, not merged as-is.
- `COST_SPREADSHEET_ID` secret is set (Edward). The Equipment Register spreadsheet ID would need its own secret (or reuse of an existing one, if the Worker already has an Equipment Register ID configured from the legacy equip-cache feature — worth checking `env` for an existing var before adding a new one).
- Downtime Duration (ML col 42) is manual-entry-only, added in Workshop 4 (`a4b92ec`, 2026-06-09, "C16"), optional field, no auto-calculation — confirmed with Michael this stays manual, no fallback from ticket timestamps.
