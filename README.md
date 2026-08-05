# CSC Maintenance Console (CMMS)

A plant-floor maintenance ticketing and equipment-management system. It covers
the full ticket lifecycle (submit → queue → approve → complete → verify-close),
Preventive Maintenance (PM) scheduling with automatic daily generation, parts
tracking, joint-department sign-off on shared equipment, Temp-Fix and Hold-Tag
(EHL) monitoring, cost and downtime reporting, a tablet kiosk board, and
SQF food-safety compliance fields (post-repair clearance checks — tools
removed, area clean, QA required).

## Architecture

- **Backend:** [`cloudflare-worker/worker.js`](cloudflare-worker/worker.js) —
  a Cloudflare Worker that talks to Google Sheets via the Sheets REST API
  (authenticated with a Google service-account JWT). This is the only live
  backend — there is no database and no ORM.
- **Frontend:** [`frontend/index.html`](frontend/index.html) plus
  [`frontend/partials/*.html`](frontend/partials/). Plain HTML/CSS/JS — no
  build tooling or framework. At deploy time, `<?!= include_('partials/x') ?>`
  tags in `index.html` are replaced with the contents of the referenced
  partial file (see [Local development](#local-development) below).

See [`CLAUDE.md`](CLAUDE.md) for conventions that apply when working in this
repo — in particular the version-bump rule and the panel-closer registration
rule for new modals/overlays.

## Repo structure

| Path | Purpose |
|---|---|
| `cloudflare-worker/` | Live backend — `worker.js` and `wrangler.toml` |
| `frontend/` | Live frontend — `index.html`, `partials/`, `assets/` |
| `.github/workflows/` | CI/CD — see [Deployment](#deployment) |
| `design/` | React/HTML UI mockups — design reference only, not live code |
| `frontend-mockup/` | An older standalone static mockup — not live code |
| `docs/` | Historical audit/discovery/diagnosis notes from past development work |
| `gas/Email.gs` | Google Apps Script for daily email alerts (e.g. overdue temp-fixes). Not wired into the Worker or CI — it has to be manually pasted into the Sheet's bound Apps Script editor to run. **Status unconfirmed**: emails are still going out, but it's unverified whether the currently-deployed copy matches what's in this repo. Needs review. |
| `build.py` | Local equivalent of the CI partial-inlining step (see below) |

## Deployment

Two independent GitHub Actions workflows, each triggered by a push to `main`
(path-filtered) or manual dispatch:

- [`deploy-pages.yml`](.github/workflows/deploy-pages.yml) — on changes under
  `frontend/**`, inlines the partial tags into `index.html` and publishes
  `frontend/` to GitHub Pages.
- [`deploy-worker.yml`](.github/workflows/deploy-worker.yml) — on changes
  under `cloudflare-worker/**`, runs `npx wrangler@latest deploy` from
  `cloudflare-worker/`, authenticated with the `CLOUDFLARE_API_TOKEN` repo
  secret.

## Local development

There's no `package.json` — nothing to `npm install`.

To preview the frontend partial-inlining locally:

```
python3 build.py
```

This overwrites `frontend/index.html` in place (same behavior as the CI
step), so `git checkout frontend/index.html` afterward if you were just
previewing rather than intentionally committing the inlined output.

There's currently no local-serving setup for the Worker (e.g. `wrangler
dev`) — Worker changes are validated by deploying via CI.

## Versioning

The single source of truth for the app version is `[vars] APP_VERSION` in
[`cloudflare-worker/wrangler.toml`](cloudflare-worker/wrangler.toml)
(currently `4.38`), served live at `/api/version`. Per `CLAUDE.md`, bump it
by one patch version for a normal change (e.g. `4.38` → `4.39`) or roll the
minor version for a larger release (e.g. `4.99` → `5.00`), as part of the
same change set.

## Configuration / secrets

The Worker requires the following secrets, set with `wrangler secret put
<NAME>` (see comments in `wrangler.toml` for details on where each value
comes from):

- `SPREADSHEET_ID`
- `GOOGLE_SA_EMAIL`
- `GOOGLE_SA_PRIVATE_KEY`
- `ALLOWED_ORIGIN`
- `PHOTO_FOLDER_ID`
- `COST_SPREADSHEET_ID`

CI also requires a `CLOUDFLARE_API_TOKEN` GitHub Actions repository secret
for the Worker deploy workflow.

There's no `.env.example` or `.dev.vars.example` in the repo yet — the
values above are documented only as comments in `wrangler.toml`.
