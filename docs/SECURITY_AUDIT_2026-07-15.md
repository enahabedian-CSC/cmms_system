# SECURITY_AUDIT_2026-07-15.md
## CMMS Security Review — Code-Derived Audit · July 2026

Full pass over the live production system: `cloudflare-worker/worker.js` (backend), `frontend/index.html` + all `frontend/partials/*.html` (frontend), `.github/workflows/*.yml` (CI/CD), and repo tracking for leaked secrets.

**Bottom line:** Findings #1 and #2 mean the deployed system currently has **no real access control at all** — anyone with the Worker's URL can act as any user, including an admin, without a password. Everything else compounds that once someone's in.

---

## Summary Table

| # | Severity | Finding | Where | Status |
|---|----------|---------|-------|--------|
| 1 | 🔴 Critical | Auth is a client-supplied, unverified `X-User-Email` header — full authentication bypass | `worker.js:4328`, `resolveUser()` `worker.js:473-525`, `index.html:1124-1127` | Open |
| 2 | 🔴 Critical | `/api/tablet/*` endpoints have zero identity check of any kind | `worker.js:4407-4411` | Open |
| 3 | 🟠 High | Cross-department IDOR — managers can void/edit/read other departments' tickets | `worker.js:2557,2571,2586,2647,2711,2729,2819,2855,2935,1524,1613,1658` | Open |
| 4 | 🟠 High | Stored XSS via unvalidated `javascript:` URL in ticket photo links | `ticket-detail.html:1632-1644`, write path `1667-1680` | Open |
| 5 | 🟡 Medium | Google Sheets formula injection via `USER_ENTERED` write mode on unsanitized text fields | `worker.js:957-985` (`appendSheetRow`/`writeSheetCells`) | Open |
| 6 | 🟡 Medium | Inconsistent single-quote escaping in `onclick="...('value')"` handlers (latent XSS) | `index.html:732-734` (`esc()`), dozens of call sites | Open |
| 7 | 🟡 Medium | Internal/upstream error text leaked directly to API callers | `worker.js:4413-4416`, `428`, `970`, `984`, `1909-1911`, `382` | Open |
| 8 | 🟢 Low | Photo upload endpoint has no file type/size validation | `worker.js:1868-1925` (`handleUploadPhoto`) | Open |
| 9 | 🟢 Low | Cloudflare account file (account ID + admin email) committed to git | `cloudflare-worker/.wrangler/cache/wrangler-account.json` | Open |

**Suggested fix order:** #1 → #2 → #3 → #4 → #5 → #9 (later fixes are low-value until the auth model is real).

---

## 1 · 🔴 Critical — Authentication is a client-asserted header with no cryptographic verification

**Plain English:** When you sign in with Google, the app reads your email off your Google sign-in and just tells the server "trust me, I'm bob@cscmfg.com." The server never checks that this claim is true — it never verifies you actually logged into Google as that person. Anyone on the internet, without a password or a Google account, can send one web request claiming to be an admin's email and the server treats them as that admin: read every ticket, void tickets, edit cost reports, add/remove technicians, everything.

**Technical detail:**
- `frontend/index.html:1124-1127` — the Google sign-in JWT is decoded **client-side only**; only the `email` field is kept, the signed token itself is discarded and never sent to the server.
- `cloudflare-worker/worker.js:4328` — `const userEmail = request.headers.get('X-User-Email') || '';` — taken at face value, zero cryptographic verification.
- `resolveUser()` (`worker.js:473-525`) uses that unverified email to look up admin/manager/tech status from the Config sheet and grants privileges accordingly.
- **Proof of exploit** — works from any HTTP client, no browser/CORS restriction applies:
  ```
  curl -H "X-User-Email: <any admin's email>" https://<worker-url>/api/admin/view?view=access
  ```
- Every "admin-only" UI gate (`admin.html`, nav menu, etc.) is cosmetic — the server enforces nothing.

**Fix:** Verify the Google ID token's signature server-side (Google publishes JWKS at `https://www.googleapis.com/oauth2/v3/certs`). Issue the app's own short-lived signed session token/cookie afterward so later requests don't need the raw Google token re-sent.

---

## 2 · 🔴 Critical — Tablet endpoints have no identity check whatsoever

**Plain English:** A separate set of API routes for shop-floor tablets doesn't even do the (broken) email trick above — it doesn't check who's calling at all. Anyone can pull the full maintenance board for every department, or mark any ticket "complete," reassign it, or rewrite its root-cause/corrective-action notes, just by guessing a ticket number (predictable format like `MT-002-260715-001`).

**Technical detail:** `worker.js:4407-4411` registers `/api/tablet/board`, `/api/tablet/assign`, `/api/tablet/status`, `/api/tablet/complete`, etc. with no call to `resolveUser()` — confirmed by the code's own comment: *"Tablet endpoints (no email auth — uses tech name from POST body)"*.

**Fix:** Give tablets a real credential (per-device shared secret or short-lived token issued at login) and check it server-side before any read/write.

---

## 3 · 🟠 High — Managers can act on other departments' tickets (IDOR)

**Plain English:** Even for a legitimately logged-in manager, several actions (voiding, reassigning, editing description/root cause, issuing hold tags, etc.) don't check whether the target ticket actually belongs to that manager's department. A Sales manager could void or rewrite an Electrical department ticket. Similar actions elsewhere in the same file *do* check this correctly, so this reads as an oversight in specific handlers, not an intentional design choice.

**Technical detail:** Missing `allowed(user, dept)` checks in:
`handleVoidTicket` (2557), `handleAssignTicket` (2571), `handleFlagTempFix` (2586), `handleTransferTicket` (2647), `handleUpdateTicket` (2711), `handleEditTicketFields` (2729), `handleIssueHoldTag` (2819), `handleServiceReport` (2855), `handleDeptSignOff` (2935), `handleTicketDetail` (1524), `handleClosedTickets` (1613), `handleEquipTicketHistory` (1658) — all `cloudflare-worker/worker.js`.
Compare to the correctly-scoped `handleJointAssign` / `handleCompleteTicket` / `handleVerifyClose`.

**Fix:** Add the same department-ownership check to each listed handler.

---

## 4 · 🟠 High — Malicious photo link runs code in a manager's browser (stored XSS)

**Plain English:** When a "photo" is attached to a ticket, the app trusts whatever link is given and turns it into a clickable thumbnail. If that link starts with `javascript:` instead of a real web address, clicking it runs attacker code in the browser of whoever clicks it — e.g., a manager reviewing the ticket.

**Technical detail:** `frontend/partials/ticket-detail.html:1632-1644` builds `<a href="...">` directly from the stored `photoUrl` with only HTML-escaping (`esc()`), no scheme validation. Combined with Finding #1, an attacker doesn't need a real account — they can call `/api/tickets/add-photo` directly.

**Fix:** Server-side, only accept photo URLs matching the Google Drive domain (`https://drive.google.com/...`). Client-side, refuse to render any href that isn't `https:`.

---

## 5 · 🟡 Medium — Google Sheets formula injection

**Plain English:** Ticket descriptions, notes, and similar free-text fields get written straight into the underlying Google Sheet in a mode that treats text starting with `=`, `+`, `-`, or `@` as a live formula, not plain text. A ticket description like `=IMPORTXML(...)` becomes a live formula the moment an admin opens the spreadsheet directly — capable of silently exfiltrating other cells/tabs to an external server, or presenting a phishing link disguised as a normal cell.

**Technical detail:** `appendSheetRow`/`writeSheetCells` (`worker.js:957-985`) use `valueInputOption: 'USER_ENTERED'`; no field (`description`, `notes`, `correctiveAct`, `rootCause`, etc.) is sanitized before being written.

**Fix:** Before writing any user-supplied string, if it starts with `=`, `+`, `-`, or `@`, prefix it with a `'` so Sheets stores it as plain text.

---

## 6 · 🟡 Medium — Inconsistent quote-escaping (latent XSS)

**Plain English:** The shared HTML-escaping helper doesn't escape apostrophes. In dozens of places, values are embedded inside `onclick="...('value')"` JavaScript snippets — if a value ever contains an apostrophe, it can break out of that snippet and inject script. Current values (ticket numbers, equipment codes) don't normally contain apostrophes, so it isn't provably exploitable today — but two other files in the same codebase already had to patch around this exact issue, confirming it's a known, real risk that wasn't applied everywhere.

**Technical detail:** `esc()` (`index.html:732-734`) doesn't escape `'`. Inconsistently applied across `ticket-list.html`, `monitoring.html`, `equipment-inventory.html`, `pm-master.html`, `pm-packets.html`, vs. the correctly-patched `submit-ticket.html`/`admin.html` (which chain `.replace(/'/g, "\\'")`).

**Fix:** Apply `.replace(/'/g, "\\'")` everywhere this pattern is used, or better, replace inline `onclick="..."` string-built handlers with `data-*` attributes + `addEventListener`, removing the bug class entirely.

---

## 7 · 🟡 Medium — Error messages leak internal details

**Plain English:** When something goes wrong talking to Google's backend, the raw error text — including internal spreadsheet tab names and Google's own error messages — is sent straight back to whoever made the request, instead of a generic "something went wrong."

**Technical detail:** `worker.js:4413-4416` returns `jsonResponse({ error: e.message }, 500)` directly; errors thrown in `readSheet` (428), `writeSheetCells`/`appendSheetRow` (970, 984), `handleUploadPhoto` (1909-1911), and `getAccessToken` (382) embed raw upstream text.

**Fix:** Log detailed errors server-side (Cloudflare Worker logs); return a generic message to the client.

---

## 8 · 🟢 Low — Photo uploads aren't validated

No check on file type, extension, or size before uploading to Google Drive (`worker.js:1868-1925`, `handleUploadPhoto`). Low real-world risk since the Worker doesn't serve the files itself, but worth adding a basic allowlist/size cap.

---

## 9 · 🟢 Low — Cloudflare account file committed to git

`cloudflare-worker/.wrangler/cache/wrangler-account.json` is tracked in the repository (confirmed via `git ls-files`) and contains a Cloudflare account ID and an admin's email address. Not a credential by itself, but it's PII that shouldn't be public. Already excluded going forward by `.gitignore` — just needs `git rm --cached` since `.gitignore` doesn't retroactively untrack already-committed files.

---

## Not exploitable / checked, no findings

- **CORS:** `ALLOWED_ORIGIN` is a fixed env value, not reflected from the request — not a classic origin-reflection bypass, though moot given Finding #1 (non-browser clients bypass CORS entirely).
- **SSRF / eval / dynamic fetch:** No occurrences of `eval`, `new Function`, or `fetch()` targets built from user-controlled hostnames; all outbound calls target hardcoded Google API domains or admin-gated server-side config.
- **JWT signing** (`signRS256`/`pemToDer`, `worker.js:386-417`): correct implementation (RSASSA-PKCS1-v1_5/SHA-256 via WebCrypto); key never logged or returned.
- **Secrets:** no hardcoded API keys/passwords found in `worker.js` or `wrangler.toml`; secrets are properly set via `wrangler secret put`.
- **Open redirect / postMessage / iframe:** not present anywhere in the reviewed frontend files.
- **Broad `innerHTML` usage:** the rest of the frontend consistently escapes API-sourced strings via `esc()` before insertion — a well-disciplined codebase apart from Findings #4 and #6.
- **Rate limiting:** none implemented (only a pass-through of Google's own 429s) — a defense-in-depth gap, not a standalone exploitable vulnerability given #1/#2 are far more severe.
