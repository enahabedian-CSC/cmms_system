# Deployment Guide — CSC CMMS

This project has **three independently deployable pieces**. Knowing which is which
is the difference between "the deploy is broken" and "a one-time setup step was
skipped." Read this before touching deploys.

| Piece | Lives in | Deploys to | How |
| --- | --- | --- | --- |
| **Frontend** (the app UI) | `frontend/**` | GitHub Pages | Auto, via `.github/workflows/deploy-pages.yml` on push to `main` |
| **Worker** (the live backend/API) | `cloudflare-worker/**` | Cloudflare Workers | Auto, via `.github/workflows/deploy-worker.yml` on push to `main` — **requires secrets (below)** |
| **Apps Script** (legacy/secondary backend) | `backend/**` | Google Apps Script | Manual, via `deploy.ps1` (`clasp push`) |

The **frontend talks to the Worker**, not to Apps Script. The Worker URL is
**hard-coded** in `frontend/index.html`:

```js
var WORKER_URL = 'https://cmms-worker.<subdomain>.workers.dev';
```

Whoever owns that Cloudflare subdomain owns the live backend. To move the backend
to a different account, you deploy a Worker there and update this one line.

---

## 1. Fix the Cloudflare auto-deploy (the missing secrets)

**Symptom:** every run of "Deploy Cloudflare Worker" fails.
**Cause:** the workflow authenticates with GitHub **repository secrets**, and those
were never added. The job runs on GitHub's own Linux runners and installs Wrangler
itself — **no PC, no local Wrangler login is involved.** The actual error is:

```
✘ [ERROR] In a non-interactive environment, it's necessary to set a
  CLOUDFLARE_API_TOKEN environment variable for wrangler to work.
```

It is empty because the secret does not exist. This is a **one-time, no-terminal
fix in the GitHub web UI:**

1. In Cloudflare → **My Profile → API Tokens → Create Token**. Use the
   **"Edit Cloudflare Workers"** template (or a custom token with
   **Account → Workers Scripts → Edit**). Copy the token value.
2. Get your **Account ID** from the Cloudflare dashboard (right sidebar / URL).
3. In GitHub → **Settings → Secrets and variables → Actions → New repository
   secret**, add both:
   - `CLOUDFLARE_API_TOKEN` = the token from step 1
   - `CLOUDFLARE_ACCOUNT_ID` = the account ID from step 2
4. Re-run the failed workflow (**Actions** tab → failed run → **Re-run jobs**),
   or push any change under `cloudflare-worker/`. It will go green.

After this, **every push to `main` that touches the Worker deploys automatically.**
No manual `wrangler deploy`, and no dependency on any one person's machine being
set up. That is the entire point of the workflow — until the secrets are added it
simply isn't finished.

> These two CI secrets are **not** the same as the Worker's *runtime* secrets
> (section 3). The CI secrets let GitHub deploy; the runtime secrets let the
> deployed Worker reach Google. Runtime secrets persist on the Worker across
> deploys and do **not** need to be re-entered in GitHub.

---

## 2. Deploy the Worker manually (fallback)

Anyone with the runtime secrets already set on the Worker can deploy from a
terminal authenticated to the right Cloudflare account:

```bash
cd cloudflare-worker
npx wrangler deploy
```

This is the path used today. It works, but it ties deploys to one person — section 1
removes that dependency.

---

## 3. Worker runtime secrets (what the backend needs to run)

The Worker reads these at runtime (confirmed from `worker.js`). Set each with
`wrangler secret put <NAME>` against the target Worker:

| Name | What it is | Where to get it |
| --- | --- | --- |
| `SPREADSHEET_ID` | The CMMS Google Sheet ID | The long string between `/d/` and `/edit` in the Sheet URL |
| `GOOGLE_SA_EMAIL` | Service-account identity | `client_email` in the service-account JSON key |
| `GOOGLE_SA_PRIVATE_KEY` | Service-account key | `private_key` in the JSON key — paste the **full** PEM, incl. `-----BEGIN/END-----` |
| `ALLOWED_ORIGIN` | CORS allow-list | Your GitHub Pages origin, e.g. `https://<org>.github.io` |
| `PHOTO_FOLDER_ID` | Drive folder for ticket photos | Google Drive folder ID; **share that folder with `GOOGLE_SA_EMAIL`** |

`APP_VERSION` is a plain var in `wrangler.toml` (`[vars]`), not a secret.

---

## 4. Stand up your **own** test Worker from scratch

Use this to validate the whole pipeline on a Cloudflare account you control,
**without touching the production Worker.** Once it works, you can confidently
ask the production-account owner to add the section-1 secrets (or hand them this
doc).

### 4a. Prerequisites
- A Cloudflare account (free tier is fine for Workers).
- Node.js installed; Wrangler comes via `npx` (no global install needed).
- A **Google service account** with access to the data (see 4b).

### 4b. Google service account
1. In Google Cloud Console → **IAM & Admin → Service Accounts → Create**.
2. Create a **JSON key** for it; you'll use `client_email` and `private_key`.
3. **Share the CMMS Google Sheet** with the service account's `client_email`
   (Viewer is enough for read; Editor if your test writes tickets).
4. **Share the Drive photo folder** with the same email (Editor, for uploads).
   - To test fully in isolation, make a **copy of the Sheet** and a throwaway
     Drive folder, and point your test Worker at those IDs instead of production.

### 4c. Deploy your Worker
```bash
cd cloudflare-worker

# log in to YOUR Cloudflare account
npx wrangler login

# give it a distinct name so it can't collide with production
#   edit wrangler.toml →  name = "cmms-worker-test"

# set the runtime secrets (section 3) on your worker
npx wrangler secret put SPREADSHEET_ID
npx wrangler secret put GOOGLE_SA_EMAIL
npx wrangler secret put GOOGLE_SA_PRIVATE_KEY
npx wrangler secret put ALLOWED_ORIGIN          # your test frontend origin
npx wrangler secret put PHOTO_FOLDER_ID

# deploy
npx wrangler deploy
```
Wrangler prints your URL, e.g. `https://cmms-worker-test.<your-subdomain>.workers.dev`.

### 4d. Smoke-test it
`/api/version` needs no auth and no Google access — it proves the Worker is live:
```bash
curl https://cmms-worker-test.<your-subdomain>.workers.dev/api/version
# → {"version":"3.01"}
```
Then test an authenticated, data-backed route (proves the service account works):
```bash
curl -H "X-User-Email: mjmarrujo@cscmfg.com" \
  https://cmms-worker-test.<your-subdomain>.workers.dev/api/me
```

### 4e. Point a frontend at your test Worker
Temporarily change `WORKER_URL` in `frontend/index.html` to your test URL and open
the app locally. **Don't commit that change to `main`** — it would repoint
production. Revert it (or test on a throwaway branch) when done.

### 4f. Hand-off
Once your test Worker serves the app correctly, the production setup is identical:
add the section-1 CI secrets to the repo (or run `wrangler deploy` against the
production account), and the auto-deploy is done.

---

## 5. The Apps Script path (`deploy.ps1`)

`deploy.ps1` is **not** a Worker deploy. It bumps `APP_VERSION` in
`backend/Version.gs`, commits it, and runs `clasp push --force` to deploy the
**Apps Script** backend. It requires `clasp` installed and logged in locally.
Keep it distinct from the Worker pipeline — confusing the two is what makes
"the deploy" seem mysteriously broken.

---

## Quick reference

| I want to… | Do this |
| --- | --- |
| Make Worker auto-deploy work | Add `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repo secrets (§1) |
| Deploy the Worker right now | `cd cloudflare-worker && npx wrangler deploy` (§2) |
| Change a Worker secret | `wrangler secret put <NAME>` (§3) |
| Test on my own account | §4 |
| Deploy the Apps Script backend | `./deploy.ps1` (§5) |
| Move the backend to a new account | Deploy a Worker there, update `WORKER_URL` in `frontend/index.html` |
