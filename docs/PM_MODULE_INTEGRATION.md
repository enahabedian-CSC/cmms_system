# PM Module — repo integration

Two new partials add the Preventive Maintenance module to the console, matching
the existing `frontend/partials/*.html` conventions (scoped classes over the
shared `--*` tokens, `PAGES[...]` registry, `esc()`, `showToast()`,
`docLabel()`, `fp-*` filter chips, `pri-badge`, `loading-overlay`).

```
frontend/partials/pm-master.html    → PAGES['pm']          (title: PM Schedules)
frontend/partials/pm-packets.html   → PAGES['pm-packets']  (title: Machine PM Packets)
```

Both currently render from an embedded `window._PM_SAMPLE_` / `window._PM_PACKETS_`
dataset so they work in the shell today. Each has a `TODO(backend)` marker showing
exactly where to swap in a `fetch(WORKER_URL + '/api/pm/...')` once the endpoints exist.

---

## 1. Include the partials — `frontend/index.html`

Add two include tags alongside the others (after the `equipment-inventory` include):

```html
<?!= include_('frontend/partials/equipment-inventory') ?>
<?!= include_('frontend/partials/pm-master') ?>     <!-- NEW -->
<?!= include_('frontend/partials/pm-packets') ?>    <!-- NEW -->
<?!= include_('frontend/partials/admin') ?>
```

## 2. Enable the nav section — `getNavDef()` in `frontend/index.html`

Replace the disabled "Coming Soon" PM block:

```js
// PM — always last, always greyed out (no UI in v1)
nav.push({
  section: 'Preventive Maintenance', icon: 'pm',
  items: [
    { id: 'pm', label: 'PM Schedules', icon: 'pm', disabled: true,
      sublabel: 'Coming Soon' }
  ]
});
```

with the live two-item section:

```js
nav.push({
  section: 'Preventive Maintenance', icon: 'pm',
  items: [
    { id: 'pm',         label: 'Master PM',          icon: 'pm' },
    { id: 'pm-packets', label: 'Machine PM Packets', icon: 'pm' }
  ]
});
```

(Two items make `buildNav()` render it as a collapsible accordion, consistent with
Tickets / Monitoring. Gate behind `isManager` if PM should be manager-only.)

## 3. Add the packet title — `PAGE_TITLES` in `frontend/index.html`

`'pm'` is already mapped to `'PM Schedules'`. Add the packets entry:

```js
'pm':          'PM Schedules',
'pm-packets':  'Machine PM Packets',   // NEW
```

## 4. Version bump — `cloudflare-worker/wrangler.toml`

Per project convention, bump `[vars] APP_VERSION` to the next patch (e.g. `4.02 → 4.03`).

---

## Backend contract (WIRED — worker v3.85)

Live as of APP_VERSION 3.85. Data lives in two tabs (names overridable via the
`PM_SCHED_SHEET` / `PM_TICKETS_SHEET` env vars):

- **`PM Schedules`** (22 cols, A→V) — schedule definitions. Written by the intake
  form, read by the master view. List cells (parts/tools/safety) are newline-
  separated; task cells are one-per-line as `text ::: CHK-ref`. See the `PM`
  column map + `handlePmScheduleAdd()` in `cloudflare-worker/worker.js`.
- **`PM Tickets`** (7 cols, A→G) — generated PM work orders. Appended by
  `/api/pm/generate`, read into the master view's "Generated PM Tickets" tab.

Endpoints (all require a resolvable `X-User-Email`; `/snooze`, `/schedule/save`
and `/generate` require manager):

- `GET  /api/pm/schedules`      → `{ schedules:[…], tickets:[…] }`
- `POST /api/pm/schedules/add`  → intake form → append schedule (worker assigns
  `pmId`, `nextDue` from frequency, `status`, timestamps). `/api/pm/intake/add`
  is kept as a legacy alias.
- `POST /api/pm/snooze`         `{ schedId }` → Status→Snoozed, Next Due +1 cycle.
- `POST /api/pm/schedule/save`  `{ schedId, partsRegular, partsOrder, tasks }`.
- `POST /api/pm/generate`       `{ schedId }` → `{ ticketNo }` (logged in PM Tickets).

**`GET /api/pm/schedules`** → `{ schedules: [...], tickets: [...] }`

Schedule fields consumed by `pm-master.html`:
`id, asset, assetName, dept, type, freq, downtimeType, estDowntime, manpower,`
`priorityMode ('interval'|'explicit'), priority, leadDays, lastCompleted, nextDue,`
`status ('Active'|'Due Soon'|'Overdue'|'Snoozed'), partsRegular[], partsOrder[],`
`tasks[{t, ref}], tools[], safety[], history[{date, ticket, tech, result}]`

Generated-ticket fields: `ticketNo, schedId, date, status ('WAITING'|'OPEN'|'COMPLETE'), assigned, due`

**`GET /api/pm/packets`** → `[{ id, asset, assetName, dept, freq, window, due, items:[{label, type, ticket, done, by, date}] }]`

Suggested write endpoints (buttons are wired client-side today):
- `POST /api/pm/generate` `{ schedId }` → creates a `PM-###-YYMMDD-###` ticket in the Waiting Queue (same flow as regular `MT-` tickets, different prefix).
- `POST /api/pm/snooze` `{ schedId }` → defers one cycle.
- `POST /api/pm/schedule` `{ schedId, partsRegular, partsOrder, tasks }` → saves an edited definition.
- `POST /api/pm/packet-check` `{ packetId, ticket, done }` → toggles a packet checklist item.

**PM ticket generation model:** the backend holds recurring schedule definitions; a
cron/scheduled task creates a `PM-` ticket `leadDays` before `nextDue` (default 7).
Once created it flows into the normal ticket rotation. Priority defaults from the
interval (`Weekly→HIGH, Monthly/Quarterly→MEDIUM, 6-Month/Annual→LOW`) unless
`priorityMode==='explicit'` sets it manually.

**Doc control:** `docLabel('pmSchedule')` / `docLabel('pmPacket')` are used for the
form footers. `pmPacket` is now wired into the `DOC_CONTROL` payload from `/api/me`
(`worker.js` → `docControl.pmPacket`, real number **FRM-030-006 · Preventative
Maintenance Packet · Rev 0 · 7/16/2026**, Configuration-sheet overridable via
`Doc No (PM Packet)` / `Rev (PM Packet)` / `Rev Date (PM Packet)`). `pmSchedule`
remains unwired and still falls back to its placeholder `FRM-030-004`, which collides
with the real Ticket Form number — still an open item, out of scope for the PM
Packet numbering round.
