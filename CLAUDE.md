# CMMS System — project notes

## Architecture
- **Backend:** `cloudflare-worker/worker.js` (Cloudflare Worker → Google Sheets via REST API). This is the only live backend.
- **Frontend:** `frontend/index.html` + `frontend/partials/*.html`, assembled at deploy time by `.github/workflows/deploy-pages.yml` (which inlines the `<?!= include_('...') ?>` partial tags).
- There is no Google Apps Script in the live system; legacy GAS was removed.

## Conventions

### Version bumping — ALWAYS bump the version on every change
Whenever making changes that get deployed (worker and/or frontend), **increment the
app version to the next number in sequence** before pushing / opening a PR.

- **Single source of truth:** `cloudflare-worker/wrangler.toml` → `[vars] APP_VERSION`.
- Bump the patch number by one (e.g. `3.07` → `3.08`); roll the minor when it's a
  larger release (e.g. `3.99` → `4.00`).
- Do this as part of the same change set so the deployed `/api/version` reflects it.
