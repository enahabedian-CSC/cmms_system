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

### Navigation must close every open panel — register new modals/overlays
`navigate(pageId)` in `frontend/index.html` calls `_closeAllPanels_()` first, which
runs down the `_PANEL_CLOSERS_` list to close every known slide-over/detail-panel/modal
before switching pages. **This is the recurring bug**: a slide-over panel (e.g. the
Equipment Inventory detail view) stays visually open on top of the new page after
clicking a nav item — the page underneath *did* switch, but the overlay is still
covering it, so it looks like nothing happened until the user manually clicks "Back".
This has recurred every time a new overlay/modal was added without wiring it into the
central close routine — it is **not** a per-screen bug, it's a missing registration.

**Whenever you add a new modal, slide-over, or detail overlay:**
- Give it a dedicated close function (e.g. `_xyzCloseDetail_()`).
- Add that function's name (as a string) to `_PANEL_CLOSERS_` in `frontend/index.html`.
- If the element is a **static, always-in-DOM** modal (defined once in `index.html`,
  toggled via `style.display` or a class — not rebuilt via `innerHTML` each time it
  opens), add `data-static="1"` to its root element so the generic
  `.td-modal-backdrop` / `.modal-backdrop` DOM-removal sweep in `_closeAllPanels_()`
  skips it (that sweep deletes matching elements from the DOM entirely — fine for
  dynamically-rendered modals that get rebuilt next time, but it would permanently
  destroy a static modal with no code path to recreate it).
- Do NOT rely on the page-switch alone to hide it — overlays are `position:fixed` and
  render on top of whatever page is active underneath.
