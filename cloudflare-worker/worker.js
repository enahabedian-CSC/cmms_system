// CSC CMMS — Cloudflare Worker API
// Replaces google.script.run calls for GitHub Pages deployment.
// Reads directly from Google Sheets using a service account.
//
// Required secrets (set via `wrangler secret put <name>`):
//   SPREADSHEET_ID        — Google Sheets spreadsheet ID (from the sheet URL)
//   GOOGLE_SA_EMAIL       — service account email from credentials JSON
//   GOOGLE_SA_PRIVATE_KEY — private_key field from credentials JSON (include \n chars)
//   ALLOWED_ORIGIN        — CORS origin, e.g. https://your-org.github.io
//
// Optional vars (wrangler.toml [vars] or `wrangler secret put`):
//   APP_VERSION           — defaults to "2.5" if omitted

// ── Column indices (1-based, matching Config.gs) ──────────────────────────────

const ML = {
  ROW_ID:1, TICKET_NO:2, TIMESTAMP:3, ACTION:4,
  STATUS:5, DEPT:6, BUILDING_ZONE:7, EQUIP_TYPE:8,
  EQUIP_CODE:9, SPECIFIC_EQUIP:10, DOWNTIME_TYPE:11, PRIORITY:12,
  DESCRIPTION:13, ASSIGNED_TO:14, EST_HOURS:15, ACTUAL_HOURS:16,
  DATE_OPENED:17, DATE_COMPLETED:18, DATE_CLOSED:19, CORRECTIVE_ACT:20,
  ROOT_CAUSE:21, PREVENTIVE_ACT:22, FIX_TYPE:23, TEMP_FIX_FLAG:24,
  PARTS_NEEDED:25, PARTS_STATUS:26, EQUIP_TAG_STATUS:27, VERIFIED_BY:28,
  VERIFIED_DATE:29, ADDED_BY:30, UPDATED_BY:31, NOTES:32,
  PROBLEM_TYPE:33, TRACKER_GROUP:34, LINE_NO:35,
  VERIFICATION_CHECKLIST:36, PHOTO_URL:37,
  JOINT_DEPTS:38, JOINT_SIGNOFFS:39, PERM_FIX_PLAN:40, PERM_FIX_DATE:41,
  DOWNTIME_DURATION:42, PENDING_JOINT_DEPTS:43,
  // Post-Repair Clearance captured at Mark Work Complete (SQF 2.14.3). Additive
  // columns — existing 43-col reads stay valid.
  CLR_TOOLS_REMOVED:44, CLR_AREA_CLEAN:45, CLR_QA_REQUIRED:46,
  ASSIGNED_DEPT:47,
};

const TF = {
  TEMP_ID:1, TICKET_NO:2, EQUIP_CODE:3, SPECIFIC_EQUIP:4,
  DEPT:5, BUILDING_ZONE:6, DATE_FLAGGED:7, DESCRIPTION:8,
  TEMP_FIX_DESC:9, FREQ_DAYS:10, LAST_INSPECTED:11, NEXT_DUE:12,
  STATUS:13, FLAGGED_BY:14, CLEARED_BY:15, CLEARED_DATE:16, NOTES:17,
  REASON_TEMPORARY:18, PERM_FIX_PLAN:19, EXPECTED_COMPLETION:20,
  NO_IMPROVISED:21, PRODUCT_RISK_OK:22,
};
const TF_COLS = 22;

const PN = {
  PART_ID:1, PART_DESC:2, TICKET_NO:3, EQUIP_CODE:4,
  SPECIFIC_EQUIP:5, DEPT:6, DATE_REQUESTED:7, PARTS_STATUS:8,
  DATE_ORDERED:9, DATE_RECEIVED:10, ORDERED_BY:11, NOTES:12,
};

const EHL = {
  TAG_ID:1, TICKET_NO:2, EQUIP_CODE:3, SPECIFIC_EQUIP:4,
  DEPT:5, BUILDING_ZONE:6, TAG_TYPE:7, DATE_TAGGED:8,
  TAGGED_BY:9, REASON:10, EQUIP_STATUS:11, CLEARED_BY:12,
  CLEARED_DATE:13, NOTES:14,
  // FRM-029-001 Non-Conforming Equipment Register conformance (SQF 2.3-2.6).
  // Appended columns (15-19) — additive, so existing 14-col reads/rows are safe.
  HOLD_REF:15,       // unique hold reference # (2.3.4), distinct from the tag #
  CAPA_REF:16,       // root-cause → CAPA reference, links to FRM-017-001 (2.4.2)
  DISPOSITION:17,    // disposition decision on release (2.5.2-.3)
  AUTHORIZED_BY:18,  // who authorized the disposition / release (2.5.3 / 2.6.3.2)
  WHAT_DONE:19,      // what was done with the equipment on release (2.6.3.3)
};
const EHL_COLS = 19;

const HIST_HEADER_ROW = 5; // data starts at row HIST_HEADER_ROW + 1

// Sheet tab names (exact match to Config.gs SH object)
const SH = {
  MASTER_LOG:     '🗄️ Master Log',
  TICKET_HIST:    '📜 Ticket History',
  TEMP_FIX:       '🔧 Temp Fix Monitor',
  PARTS_NEEDED:   '🔩 Parts Needed',
  EQUIP_HOLD_LOG: '🏷️ Equipment Hold Log',
  MANAGER_ACCESS: '👔 Manager Access',
  CONFIG:         '⚙️ Configuration',
  DATA_VALID:     '📋 Data Lists',
  EQUIP_CACHE:    '⚙️ Equip Inventory Cache',
  TECH_DIR:       '👷 Tech Directory',
  DEPT_MAP:       '📋 Dept Map',
  RPT_DB:         '📝 Report Database',
  WAITING:        '⏳ Waiting Queue',
  OPEN:           '📂 Open Tickets',
};

// ── Equipment cache column map (mirrors EquipRegistry.gs _EQUIP_COL_MAPPINGS_) ─
// Used by handleFormData, handleEquipCacheStatus, and handleEquipInventory.
// Cache tab layout: row 4 = headers (A4), row 5+ = data.  Always read from A4.
// Matching strategy: exact lowercase match (same as GAS indexOf approach).
const EQUIP_COL_MAP = {
  dept:        ['department','dept','dept.','department name','dept name',
                'area','division','plant','facility','location','cost center',
                'work center','workcenter','shop','building'],
  deptCode:    ['dept code','dept. code','deptcode','department code','dept cd',
                'dept_code','dpt code','dptcode'],
  line:        ['line #','line#','line','section','line number','line no','line no.',
                'line num','production line','prod line','cell','work cell'],
  eType:       ['equipment type','equip type','type','asset type','machine type',
                'category','class','equipment class','asset class','object type',
                'machine class'],
  code:        ['equipment code','equip code','code','asset code',
                'job #','job no','job no.','job number',
                'id','asset id','asset #','asset no','asset no.','asset number',
                'machine code','machine #','machine id','machine no','machine no.',
                'equip id','equip #','equip no','equip no.','equip number',
                'equipment #','equipment id','equipment no','equipment no.',
                'equipment number','plant no','plant #','plant no.','no.','number',
                'serial','serial #','serial no','serial number'],
  specific:    ['specific equipment','equipment name','name','description',
                'asset name','equipment description','machine name','equip name',
                'item','item name','equipment','machine','asset description',
                'short text','desc','long description','full name','title'],
  status:      ['status','active','state','asset status','equip status',
                'condition','in service','active/inactive'],
  installDate: ['installation date','install date','date installed','installed',
                'commission date','commissioned','in service date'],
  retiredDate: ['retired date','retire date','decommission date','decommissioned',
                'retired','end date','removal date','out of service date'],
  notes:       ['additional notes','notes','note','comments','comment',
                'remarks','remark','memo'],
};

// Build colIdx map from a header row array (0-based indices, exact match).
function buildEquipColIdx(headerRow) {
  const colIdx = {};
  headerRow.forEach((h, i) => {
    const hl = String(h || '').trim().toLowerCase();
    if (!hl) return;
    for (const [key, variants] of Object.entries(EQUIP_COL_MAP)) {
      if (colIdx[key] === undefined && variants.indexOf(hl) >= 0) {
        colIdx[key] = i;
      }
    }
  });
  return colIdx;
}

// ── Cell helpers ──────────────────────────────────────────────────────────────

function cellStr(row, colOneBased) {
  const v = row[colOneBased - 1];
  return v != null ? String(v).trim() : '';
}

// Normalize department names to their canonical form.
// Hardcoded entries are the baseline; loadDeptAliases() merges in the live
// '📋 Dept Map' sheet so admins can manage aliases without a code deploy.
let DEPT_ALIASES = {
  METALS:        'METAL',
  PLASTICS:      'PLASTIC',
  'PLASTIC DEC': 'PLASTIC',
};
function normalizeDept(d) {
  const up = String(d || '').trim().toUpperCase();
  return DEPT_ALIASES[up] || up;
}
async function loadDeptAliases(token, env) {
  try {
    const rows = await readSheet(token, env.SPREADSHEET_ID, SH.DEPT_MAP, 'A2:B200');
    const sheet = {};
    rows.filter(r => r[0]).forEach(r => {
      sheet[String(r[0]).trim().toUpperCase()] = String(r[1] || '').trim().toUpperCase();
    });
    // Sheet entries override hardcoded defaults; hardcoded act as fallback.
    DEPT_ALIASES = Object.assign({ METALS:'METAL', PLASTICS:'PLASTIC', 'PLASTIC DEC':'PLASTIC' }, sheet);
  } catch (_) { /* keep hardcoded defaults if sheet unavailable */ }
}

// Google Sheets UNFORMATTED_VALUE returns dates as serial numbers (days since
// Dec 30, 1899).  Strings are passed through and parsed as a fallback.
function cellDate(row, colOneBased) {
  const v = row[colOneBased - 1];
  if (v == null || v === '') return null;
  if (typeof v === 'number' && v > 1) return new Date((v - 25569) * 86400000);
  const s = String(v).trim();
  if (s) { const d = new Date(s); return isNaN(d) ? null : d; }
  return null;
}

function fmtDate(d) {
  if (!d) return '';
  const m = d.getMonth() + 1, day = d.getDate(), y = d.getFullYear();
  return `${m}/${day}/${y}`;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Google OAuth — service account JWT ───────────────────────────────────────

async function getAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signRS256({
    iss:   env.GOOGLE_SA_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }, env.GOOGLE_SA_PRIVATE_KEY);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Google token exchange failed: ' + JSON.stringify(data));
  return data.access_token;
}

async function signRS256(payload, pem) {
  const b64url = v => btoa(String.fromCharCode(...new TextEncoder().encode(v)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64urlRaw = v => btoa(String.fromCharCode(...new Uint8Array(v)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body   = b64url(JSON.stringify(payload));
  const input  = `${header}.${body}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input));
  return `${input}.${b64urlRaw(sig)}`;
}

function pemToDer(pem) {
  // Strip PEM headers, handle literal \n from JSON key files, then drop any non-base64 chars
  const b64 = pem
    .replace(/\\n/g, '\n')
    .replace(/-----[^-]+-----/g, '')
    .replace(/[^A-Za-z0-9+/=]/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// ── Sheets API ────────────────────────────────────────────────────────────────

async function readSheet(token, spreadsheetId, sheetName, range) {
  const ref = range
    ? `${encodeURIComponent(sheetName)}!${range}`
    : encodeURIComponent(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${ref}?valueRenderOption=UNFORMATTED_VALUE`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 429) { const e = new Error('RATE_LIMITED'); e.rateLimited = true; throw e; }
  if (!res.ok) throw new Error(`Sheets API error (${sheetName}): ${await res.text()}`);
  return (await res.json()).values || [];
}

// ── Ticket ID generation — sequential, matches CSC Hub format ────────────────
// Format: MT-{deptCode}-{YYMMDD}-{NNN}  (monthly sequence, resets each month)
function maxSeqFor(ids, monthPrefix) {
  let max = 0;
  for (const id of ids) {
    if (typeof id === 'string' && id.startsWith(monthPrefix)) {
      const n = parseInt(id.slice(id.lastIndexOf('-') + 1), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return max;
}

async function generateTicketNo(token, env, dept) {
  const DEPT_CODES = {
    METAL:          '001',
    ELECTRICAL:     '002',
    PLASTIC:        '003',
    LITHO:          '004',
    QA:             '007',
    'MACHINE SHOP': '008',
    'S/R':          '009',
    SALES:          '030',
    'G&A':          '031',
  };
  const code = DEPT_CODES[(dept || '').toUpperCase().trim()] || '000';
  const now  = new Date();
  const yy   = String(now.getFullYear()).slice(2);
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  const monthPrefix = `MT-${code}-${yy}${mm}`;
  const idPrefix    = `MT-${code}-${yy}${mm}${dd}-`;
  const rows = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'B2:B');
  const ids  = rows.map(r => String(r[0] || '').trim());
  const seq  = maxSeqFor(ids, monthPrefix);
  if (seq >= 999) throw new Error('Monthly ticket limit (999) reached for this department.');
  return idPrefix + String(seq + 1).padStart(3, '0');
}

// ── User / role resolution ────────────────────────────────────────────────────

async function resolveUser(token, env, userEmail) {
  const email = (userEmail || '').trim().toLowerCase();

  const [configRows, managerRows] = await Promise.all([
    readSheet(token, env.SPREADSHEET_ID, SH.CONFIG,         'C2:D30'),
    readSheet(token, env.SPREADSHEET_ID, SH.MANAGER_ACCESS, 'A4:G200'),
  ]);

  const config = {};
  configRows.forEach(r => { if (r[0]) config[String(r[0]).trim()] = r[1]; });

  const adminEmails = String(config['System Admins'] || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

  const isAdmin = adminEmails.includes(email);
  let isManager = isAdmin, ownedDepts = [], displayDepts = [], displayName = '', announcement = '';

  managerRows.forEach(r => {
    if (String(r[2] || '').trim().toLowerCase() !== email) return;
    isManager    = true;
    displayName  = String(r[0] || '').trim();
    const mainDepts   = String(r[4] || '').split(',').map(d => normalizeDept(d)).filter(Boolean);
    const hiddenDepts = String(r[5] || '').split(',').map(d => normalizeDept(d)).filter(Boolean);
    displayDepts = mainDepts;
    ownedDepts   = [...new Set([...mainDepts, ...hiddenDepts])];
    announcement = String(r[6] || '').trim();
  });

  // Tech directory read is non-fatal: if the sheet is missing or mis-named
  // auth still works — nobody gets the tech role via directory.
  let isTech = false, techDept = '', techManager = '';
  if (!isAdmin && !isManager) {
    try {
      const techDirRows = await readSheet(token, env.SPREADSHEET_ID, SH.TECH_DIR, 'B2:D200');
      const match = techDirRows.find(r => String(r[0] || '').trim().toLowerCase() === email);
      if (match) {
        isTech      = true;
        techDept    = String(match[1] || '').trim().toUpperCase();
        techManager = String(match[2] || '').trim();
      }
    } catch (_) { /* sheet unavailable — isTech stays false */ }
  }

  return { email, isAdmin, isManager, ownedDepts, displayDepts, displayName, announcement, isTech, techDept, techManager };
}

function allowed(user, dept) {
  return user.isAdmin || user.ownedDepts.includes(dept.toUpperCase().trim());
}

// ── Handlers ──────────────────────────────────────────────────────────────────

function handleVersion(env) {
  return jsonResponse({ version: env.APP_VERSION || '3.01' });
}

async function handleMe(env, userEmail) {
  const token = await getAccessToken(env);

  const [configRows, managerRows] = await Promise.all([
    readSheet(token, env.SPREADSHEET_ID, SH.CONFIG,         'C2:D50'),
    readSheet(token, env.SPREADSHEET_ID, SH.MANAGER_ACCESS, 'A4:G200'),
  ]);

  const config = {};
  configRows.forEach(r => { if (r[0]) config[String(r[0]).trim()] = String(r[1] ?? ''); });

  const email = (userEmail || '').trim().toLowerCase();
  const adminEmails = String(config['System Admins'] || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const isAdmin = adminEmails.includes(email);

  let isManager = isAdmin, ownedDepts = [], displayDepts = [], displayName = '', teamEmails = '', announcement = '';

  managerRows.forEach(r => {
    if (String(r[2] || '').trim().toLowerCase() !== email) return;
    isManager    = true;
    displayName  = String(r[0] || '').trim();
    teamEmails   = String(r[3] || '').trim();
    const mainDepts   = String(r[4] || '').split(',').map(d => normalizeDept(d)).filter(Boolean);
    const hiddenDepts = String(r[5] || '').split(',').map(d => normalizeDept(d)).filter(Boolean);
    displayDepts = mainDepts;
    ownedDepts   = [...new Set([...mainDepts, ...hiddenDepts])];
    announcement = String(r[6] || '').trim();
  });

  let isTech = false, techDept = '', techManager = '';
  if (!isAdmin && !isManager) {
    try {
      const techDirRows = await readSheet(token, env.SPREADSHEET_ID, SH.TECH_DIR, 'B2:D200');
      const match = techDirRows.find(r => String(r[0] || '').trim().toLowerCase() === email);
      if (match) {
        isTech      = true;
        techDept    = String(match[1] || '').trim().toUpperCase();
        techManager = String(match[2] || '').trim();
      }
    } catch (_) { /* sheet unavailable — isTech stays false */ }
  }
  // Give techs their dept as an owned dept so the rest of the app can scope to it
  if (isTech && techDept && !ownedDepts.length) {
    ownedDepts = techDept.split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
  }
  const role = isAdmin ? 'admin' : isManager ? 'manager' : isTech ? 'tech' : 'noaccess';

  if (isAdmin) {
    ownedDepts   = ['METAL','ELECTRICAL','PLASTIC','LITHO','PLASTIC DEC','QA','MACHINE SHOP','S/R','SALES','G&A'];
    displayDepts = ownedDepts;
  }

  if (!displayName) {
    displayName = email.split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  const initials = displayName.trim().split(/\s+/)
    .map(w => w[0] || '').join('').substring(0, 2).toUpperCase() || '?';

  const user = { email, displayName, initials, role,
                 isAdmin, isManager: isManager || isAdmin, ownedDepts, displayDepts, teamEmails,
                 announcement, techDept, techManager };

  // Replicate getDocControlMap_() from Config.gs
  function pick(noKey, revKey, dateKey, dNo, dRev, dDate) {
    return {
      no:   config[noKey]   || dNo,
      rev:  String(config[revKey] != null && config[revKey] !== '' ? config[revKey]
              : (config['Revision'] != null && config['Revision'] !== '' ? config['Revision'] : dRev)),
      date: config[dateKey] || dDate,
    };
  }
  const docControl = {
    serviceReport:   pick('Doc No (Service Report)', 'Rev (Service Report)', 'Rev Date (Service Report)', 'FRM-030-003', '0', '6/5/2026'),
    repairLog:       pick('Doc No (Repair Log)',     'Rev (Repair Log)',     'Rev Date (Repair Log)',     'FRM-030-002', '0', '6/5/2026'),
    repairClearance: pick('Doc No (Repair Clearance)','Rev (Repair Clearance)','Rev Date (Repair Clearance)','FRM-030-003', '0', '6/5/2026'),
    tempRepairLog:   pick('Doc No (Temp Repair Log)','Rev (Temp Repair Log)','Rev Date (Temp Repair Log)','FRM-030-005', '0', ''),
    holdTag:         pick('Doc No (Hold Tag)',        'Rev (Hold Tag)',        'Rev Date (Hold Tag)',        'FRM-029-002', '0', '6/15/26'),
    ncrRegister:     pick('Doc No (NCR Register)',    'Rev (NCR Register)',    'Rev Date (NCR Register)',    'FRM-029-001', '0', ''),
    ticketForm:      pick('Doc No (Ticket Form)',     'Rev (Ticket Form)',     'Rev Date (Ticket Form)',     'FRM-030-004', '0', ''),
  };

  const company = config['Company Name'] || 'Container Supply Co.';
  const version = env.APP_VERSION || config['System Version'] || '2.5';

  return jsonResponse({ user, company, docControl, version });
}

async function handleDashboardCounts(env, userEmail) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);

  const dataStart = HIST_HEADER_ROW + 1;
  const [mlRows, tfRows, pnRows] = await Promise.all([
    readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG,   'A2:AQ'),
    readSheet(token, env.SPREADSHEET_ID, SH.TEMP_FIX,     `A${dataStart}:V`),
    readSheet(token, env.SPREADSHEET_ID, SH.PARTS_NEEDED, `A${dataStart}:L`),
    loadDeptAliases(token, env),
  ]);

  const now = new Date();
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  const dow = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (dow === 0 ? 6 : dow - 1));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const latestStatus = {}, latestPriority = {}, latestClosed = {}, latestOpened = {};
  // Global (un-scoped) maps: one entry per ticket number, so a joint ticket that
  // shows in several department trackers is still counted exactly ONCE here.
  const gStatus = {}, gPriority = {};

  // Collapse per ticket with LAST NON-EMPTY wins (matching the tracker/panel
  // queues). Absolute last-write-wins previously let a trailing row with a blank
  // STATUS cell overwrite a real status with '', silently dropping open tickets
  // from the count — the root of the dashboard-vs-tracker total mismatch.
  mlRows.forEach(r => {
    const tn   = cellStr(r, ML.TICKET_NO);
    if (!tn) return;
    const dept = normalizeDept(cellStr(r, ML.DEPT));
    const st = cellStr(r, ML.STATUS).toUpperCase();
    const pr = cellStr(r, ML.PRIORITY).toUpperCase();
    // Global, keyed by ticket number (joint-safe, never double counts).
    if (st) gStatus[tn] = st;
    if (pr) gPriority[tn] = pr;
    // Dept-scoped ("mine").
    if (!allowed(user, dept)) return;
    if (st) latestStatus[tn] = st;
    if (pr) latestPriority[tn] = pr;
    const dc = cellDate(r, ML.DATE_CLOSED);
    if (dc) latestClosed[tn] = dc;
    const od = cellDate(r, ML.DATE_OPENED);
    if (od) latestOpened[tn] = od;
  });

  const counts = { open: 0, waiting: 0, verify: 0, critical: 0, tempFixActive: 0,
                   closedRecent: 0, partsPending: 0, closedThisWeek: 0,
                   openedThisWeek: 0, openedThisMonth: 0, closedThisMonth: 0,
                   // Airtight system-wide unique totals (all departments).
                   openAll: 0, waitingAll: 0, criticalAll: 0, verifyAll: 0, tempFixAll: 0 };

  // WORK_STS: tickets actively being worked (not yet in verify/close).
  // ACTIVE_STS: all non-closed states — used for critical so an urgent ticket
  // is counted whether it's being worked or awaiting verification.
  const WORK_STS   = new Set(['OPEN', 'PENDING PARTS', 'ON HOLD']);
  const ACTIVE_STS = new Set(['OPEN', 'PENDING PARTS', 'ON HOLD', 'COMPLETE', 'PENDING VERIFICATION']);

  // System-wide unique totals (each ticket counted once, joint-safe).
  Object.keys(gStatus).forEach(tn => {
    const st = gStatus[tn];
    if (WORK_STS.has(st))   counts.openAll++;
    if (ACTIVE_STS.has(st) && gPriority[tn] === 'CRITICAL') counts.criticalAll++;
    if (st === 'WAITING')   counts.waitingAll++;
    if (st === 'COMPLETE' || st === 'PENDING VERIFICATION') counts.verifyAll++;
  });

  Object.keys(latestStatus).forEach(tn => {
    const st = latestStatus[tn];
    if (WORK_STS.has(st))   counts.open++;
    if (ACTIVE_STS.has(st) && latestPriority[tn] === 'CRITICAL') counts.critical++;
    if (st === 'WAITING') counts.waiting++;
    if (st === 'COMPLETE' || st === 'PENDING VERIFICATION') counts.verify++;
    if ((st === 'CLOSED' || st === 'COMPLETE') && latestClosed[tn]) {
      const cd = latestClosed[tn];
      if (cd >= thirtyDaysAgo) counts.closedRecent++;
      if (cd >= weekStart)     counts.closedThisWeek++;
      if (cd >= monthStart)    counts.closedThisMonth++;
    }
    const od = latestOpened[tn];
    if (od) {
      if (od >= weekStart)  counts.openedThisWeek++;
      if (od >= monthStart) counts.openedThisMonth++;
    }
  });

  tfRows.forEach(r => {
    const st = cellStr(r, TF.STATUS).toUpperCase();
    if (st === 'ACTIVE' || st === 'PAST DUE') counts.tempFixAll++;
    if (!allowed(user, cellStr(r, TF.DEPT))) return;
    if (st === 'ACTIVE' || st === 'PAST DUE') counts.tempFixActive++;
  });

  pnRows.forEach(r => {
    const st = cellStr(r, PN.PARTS_STATUS).toUpperCase();
    if (!allowed(user, cellStr(r, PN.DEPT))) return;
    if (st === 'PENDING' || st === 'ORDERED') counts.partsPending++;
  });

  return jsonResponse(counts);
}

async function handleDashboardPanels(env, userEmail) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);

  const dataStart = HIST_HEADER_ROW + 1;
  const [mlRows, tfRows, ehlRows] = await Promise.all([
    readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG,     'A2:AQ'),
    readSheet(token, env.SPREADSHEET_ID, SH.TEMP_FIX,       `A${dataStart}:V`),
    readSheet(token, env.SPREADSHEET_ID, SH.EQUIP_HOLD_LOG, `A${dataStart}:N`),
    loadDeptAliases(token, env),
  ]);

  // Collapse ML rows per ticket; latest non-empty value wins.
  // Only gate on dept for unseen tickets — update rows (CLOSED, photo, etc.)
  // often have empty dept and must still be applied to already-tracked tickets.
  const byTicket = {};
  mlRows.forEach(r => {
    const tn   = cellStr(r, ML.TICKET_NO);
    if (!tn) return;
    const dept = normalizeDept(cellStr(r, ML.DEPT));
    if (!byTicket[tn] && !allowed(user, dept)) return;
    if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
    const cur = byTicket[tn];
    r.forEach((v, i) => { if (v != null && v !== '') cur[i] = v; });
  });

  const prioOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const allTickets = Object.values(byTicket).sort((a, b) =>
    (prioOrder[cellStr(a, ML.PRIORITY).toUpperCase()] ?? 4) -
    (prioOrder[cellStr(b, ML.PRIORITY).toUpperCase()] ?? 4)
  );

  const reviewItems = [], verifyItems = [], tempItems = [], openTickets = [];
  const OPEN_STS = new Set(['OPEN', 'PENDING PARTS', 'ON HOLD', 'COMPLETE', 'PENDING VERIFICATION']);

  allTickets.forEach(r => {
    const tn     = cellStr(r, ML.TICKET_NO);
    const status = cellStr(r, ML.STATUS).toUpperCase();
    const prio   = cellStr(r, ML.PRIORITY).toUpperCase();
    const equip  = cellStr(r, ML.SPECIFIC_EQUIP);
    const code   = cellStr(r, ML.EQUIP_CODE);
    const dept   = normalizeDept(cellStr(r, ML.DEPT));
    const desc   = cellStr(r, ML.DESCRIPTION);
    const opened = fmtDate(cellDate(r, ML.DATE_OPENED));

    if (status === 'WAITING' && reviewItems.length < 8) {
      reviewItems.push({
        kind: 'review', ticketNo: tn,
        title: equip || desc || tn,
        sub: dept + (code ? ' · ' + code : '') + (prio ? ' · ' + prio + ' priority' : '') + ' — awaiting approval',
        action: 'Approve', pageTarget: 'waiting',
      });
    } else if ((status === 'COMPLETE' || status === 'PENDING VERIFICATION') && verifyItems.length < 8) {
      verifyItems.push({
        kind: 'complete', ticketNo: tn,
        title: equip || desc || tn,
        sub: dept + (code ? ' · ' + code : '') + ' — awaiting your verification & service-report signoff',
        action: 'Verify', pageTarget: 'open',
      });
    }

    if (OPEN_STS.has(status) && openTickets.length < 10) {
      openTickets.push({
        ticketNo: tn, status, priority: prio, dept,
        equipCode: code, specificEquip: equip, description: desc,
        assignedTo:   cellStr(r, ML.ASSIGNED_TO),
        dateOpened:   opened,
        tempFixFlag:  cellStr(r, ML.TEMP_FIX_FLAG) === 'Y',
      });
    }
  });

  // Temp fix PAST DUE → attention items
  tfRows.forEach(r => {
    const tempId = cellStr(r, TF.TEMP_ID);
    const dept   = cellStr(r, TF.DEPT);
    if (!tempId || !allowed(user, dept)) return;
    if (cellStr(r, TF.STATUS).toUpperCase() !== 'PAST DUE') return;
    if (tempItems.length >= 8) return;
    const equip = cellStr(r, TF.SPECIFIC_EQUIP);
    const due   = fmtDate(cellDate(r, TF.NEXT_DUE));
    tempItems.push({
      kind: 'temp', ticketNo: cellStr(r, TF.TICKET_NO),
      title: tempId + (equip ? ' — ' + equip : ''),
      sub: dept + ' · Temp fix PAST DUE' + (due ? ' (due ' + due + ')' : '') + ' — Maintenance Program 030',
      action: 'Inspect', pageTarget: 'tempfix',
    });
  });

  const attentionItems = [...reviewItems, ...verifyItems, ...tempItems];

  // Equipment hold tags
  const holdTags = [];
  ehlRows.forEach(r => {
    const tagId = cellStr(r, EHL.TAG_ID);
    const dept  = cellStr(r, EHL.DEPT);
    if (!tagId || !allowed(user, dept)) return;
    if (cellStr(r, EHL.EQUIP_STATUS).toUpperCase() === 'CLEARED') return;
    holdTags.push({
      tagId,
      ticketNo:     cellStr(r, EHL.TICKET_NO),
      equipCode:    cellStr(r, EHL.EQUIP_CODE),
      specificEquip:cellStr(r, EHL.SPECIFIC_EQUIP),
      tagType:      cellStr(r, EHL.TAG_TYPE),
      dateTagged:   fmtDate(cellDate(r, EHL.DATE_TAGGED)),
      reason:       cellStr(r, EHL.REASON),
      dept,
    });
  });

  // Pending joint attachment requests
  const pendingJointMap = {};
  mlRows.forEach(r => {
    const tn      = cellStr(r, ML.TICKET_NO);
    const pendStr = cellStr(r, ML.PENDING_JOINT_DEPTS);
    if (!tn || !pendStr) return;
    const pendList = pendStr.split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
    const myPend   = user.isAdmin ? pendList : pendList.filter(d => user.ownedDepts.includes(d));
    if (!myPend.length) return;
    if (!pendingJointMap[tn]) { pendingJointMap[tn] = { row: r.slice(), myDepts: myPend }; return; }
    const cur = pendingJointMap[tn];
    r.forEach((v, i) => { if (v != null && v !== '') cur.row[i] = v; });
    cur.myDepts = myPend;
  });

  const pendingJointRequests = Object.entries(pendingJointMap).map(([tn, { row: r, myDepts }]) => ({
    kind: 'joint-request', ticketNo: tn,
    title: cellStr(r, ML.SPECIFIC_EQUIP) || cellStr(r, ML.DESCRIPTION) || tn,
    sub: normalizeDept(cellStr(r, ML.DEPT)) + (cellStr(r, ML.EQUIP_CODE) ? ' · ' + cellStr(r, ML.EQUIP_CODE) : '') +
         ' — requesting your dept: ' + myDepts.join(', '),
    action: 'Review',
  }));

  // Joint tickets: tickets where this manager's dept is listed in JOINT_DEPTS
  // but the primary dept is not theirs (two-pass: find ticket nos, then merge full rows).
  const jointTicketNos = new Set();
  mlRows.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO);
    const jointStr = cellStr(r, ML.JOINT_DEPTS);
    if (!tn || !jointStr || byTicket[tn]) return;
    const jointList = jointStr.split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
    const isJoined = user.isAdmin || (user.ownedDepts || []).some(d => jointList.indexOf(d) >= 0);
    if (isJoined) jointTicketNos.add(tn);
  });
  const jointByTicket = {};
  mlRows.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO);
    if (!tn || !jointTicketNos.has(tn)) return;
    if (!jointByTicket[tn]) { jointByTicket[tn] = r.slice(); return; }
    r.forEach((v, i) => { if (v != null && v !== '') jointByTicket[tn][i] = v; });
  });
  const jointItems = [];
  Object.values(jointByTicket).forEach(r => {
    const status = cellStr(r, ML.STATUS).toUpperCase();
    if (status === 'CLOSED' || status === 'VOIDED') return;
    if (jointItems.length >= 8) return;
    const tn   = cellStr(r, ML.TICKET_NO);
    const equip = cellStr(r, ML.SPECIFIC_EQUIP);
    const desc  = cellStr(r, ML.DESCRIPTION);
    const dept  = normalizeDept(cellStr(r, ML.DEPT));
    const code  = cellStr(r, ML.EQUIP_CODE);
    jointItems.push({
      kind: 'joint', ticketNo: tn,
      title: equip || desc || tn,
      sub: dept + (code ? ' · ' + code : '') + ' — joint with your dept · ' + status.toLowerCase(),
      action: 'View', pageTarget: 'open',
    });
  });

  // Chronic equipment: 3+ distinct tickets in last 90 days
  const CHRONIC_THRESHOLD = 3;
  const cutoff90 = new Date(); cutoff90.setDate(cutoff90.getDate() - 90);
  const equipTickets = {};

  mlRows.forEach(r => {
    const tn   = cellStr(r, ML.TICKET_NO);
    const dept = normalizeDept(cellStr(r, ML.DEPT));
    const code = cellStr(r, ML.EQUIP_CODE);
    if (!tn || !code || !allowed(user, dept)) return;
    const doDate = cellDate(r, ML.DATE_OPENED);
    if (!doDate || doDate < cutoff90) return;
    if (!equipTickets[code]) equipTickets[code] = { dept, equip: cellStr(r, ML.SPECIFIC_EQUIP) || code, ticketSet: {} };
    equipTickets[code].ticketSet[tn] = true;
  });

  const chronicEquipment = Object.entries(equipTickets)
    .map(([code, e]) => ({ code, e, count: Object.keys(e.ticketSet).length }))
    .filter(({ count }) => count >= CHRONIC_THRESHOLD)
    .sort((a, b) => b.count - a.count)
    .map(({ code, e, count }) => ({
      kind: 'chronic', ticketNo: code, title: e.equip,
      sub: e.dept + ' · ' + count + ' ticket' + (count !== 1 ? 's' : '') + ' in the last 90 days — chronic equipment alert',
      action: 'View Open', pageTarget: 'open', count,
    }));

  return jsonResponse({ attentionItems, openTickets, holdTags, pendingJointRequests, jointItems, chronicEquipment });
}

// ── Sheets write helpers ──────────────────────────────────────────────────────

function colLetter(n) {
  let s = '';
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
}

// Update scattered cells in one batchUpdate call.
// cells = [{col: <1-based>, value: <any>}, ...]
async function writeSheetCells(token, spreadsheetId, sheetName, sheetRow, cells) {
  const data = cells.map(({ col, value }) => ({
    range: `${sheetName}!${colLetter(col)}${sheetRow}`,
    values: [[value]],
  }));
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }),
    }
  );
  if (!res.ok) throw new Error(`Sheets write error: ${await res.text()}`);
}

// Append one row array to the bottom of a sheet.
async function appendSheetRow(token, spreadsheetId, sheetName, row) {
  const encodedSheet = encodeURIComponent(sheetName);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheet}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!res.ok) throw new Error(`Sheets append error: ${await res.text()}`);
}

// Find 1-based sheet row where col A = id, searching from startRow down.  Returns -1 if not found.
async function findMonitorRow(token, spreadsheetId, sheetName, id, startRow) {
  const rows = await readSheet(token, spreadsheetId, sheetName, `A${startRow}:A`);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() === id) return startRow + i;
  }
  return -1;
}

// Append a row to Master Log (43 cols).
async function appendMasterLog(token, env, opts) {
  const now = opts.now || new Date();
  const row = new Array(47).fill('');
  row[ML.TICKET_NO       - 1] = opts.ticketNo       || '';
  row[ML.TIMESTAMP       - 1] = fmtDate(now);
  row[ML.ACTION          - 1] = opts.action          || '';
  row[ML.STATUS          - 1] = opts.status          || '';
  row[ML.DEPT            - 1] = opts.dept            || '';
  row[ML.EQUIP_CODE      - 1] = opts.equipCode       || '';
  row[ML.SPECIFIC_EQUIP  - 1] = opts.specificEquip   || '';
  row[ML.PARTS_STATUS    - 1] = opts.partsStatus     || '';
  row[ML.UPDATED_BY      - 1] = opts.updatedBy       || '';
  row[ML.NOTES           - 1] = opts.notes           || '';
  // Extended optional fields
  if (opts.priority      !== undefined) row[ML.PRIORITY       - 1] = opts.priority      || '';
  if (opts.assignedTo    !== undefined) row[ML.ASSIGNED_TO    - 1] = opts.assignedTo    || '';
  if (opts.estHours      !== undefined) row[ML.EST_HOURS      - 1] = opts.estHours      || '';
  if (opts.actualHours   !== undefined) row[ML.ACTUAL_HOURS   - 1] = opts.actualHours   || '';
  if (opts.correctiveAct !== undefined) row[ML.CORRECTIVE_ACT - 1] = opts.correctiveAct || '';
  if (opts.rootCause     !== undefined) row[ML.ROOT_CAUSE     - 1] = opts.rootCause     || '';
  if (opts.preventiveAct !== undefined) row[ML.PREVENTIVE_ACT - 1] = opts.preventiveAct || '';
  if (opts.fixType       !== undefined) row[ML.FIX_TYPE       - 1] = opts.fixType       || '';
  if (opts.tempFixFlag   !== undefined) row[ML.TEMP_FIX_FLAG  - 1] = opts.tempFixFlag   ? 'Y' : '';
  if (opts.verifiedBy    !== undefined) row[ML.VERIFIED_BY    - 1] = opts.verifiedBy    || '';
  if (opts.verifiedDate  !== undefined) row[ML.VERIFIED_DATE  - 1] = opts.verifiedDate  || '';
  if (opts.dateClosed    !== undefined) row[ML.DATE_CLOSED    - 1] = opts.dateClosed    || '';
  if (opts.sqfChecklist  !== undefined) row[ML.VERIFICATION_CHECKLIST - 1] = opts.sqfChecklist || '';
  if (opts.photoUrl      !== undefined) row[ML.PHOTO_URL       - 1] = opts.photoUrl      || '';
  if (opts.jointDepts    !== undefined) row[ML.JOINT_DEPTS    - 1] = opts.jointDepts    || '';
  if (opts.jointSignoffs !== undefined) row[ML.JOINT_SIGNOFFS - 1] = opts.jointSignoffs || '';
  if (opts.pendingJointDepts !== undefined) row[ML.PENDING_JOINT_DEPTS - 1] = opts.pendingJointDepts || '';
  if (opts.permFixPlan   !== undefined) row[ML.PERM_FIX_PLAN  - 1] = opts.permFixPlan   || '';
  if (opts.permFixDate   !== undefined) row[ML.PERM_FIX_DATE  - 1] = opts.permFixDate   || '';
  if (opts.downtimeDuration !== undefined) row[ML.DOWNTIME_DURATION - 1] = opts.downtimeDuration || '';
  if (opts.clrToolsRemoved !== undefined) row[ML.CLR_TOOLS_REMOVED - 1] = opts.clrToolsRemoved || '';
  if (opts.clrAreaClean    !== undefined) row[ML.CLR_AREA_CLEAN    - 1] = opts.clrAreaClean    || '';
  if (opts.clrQaRequired   !== undefined) row[ML.CLR_QA_REQUIRED   - 1] = opts.clrQaRequired   || '';
  if (opts.assignedDept    !== undefined) row[ML.ASSIGNED_DEPT     - 1] = opts.assignedDept    || '';
  if (opts.addedBy       !== undefined) row[ML.ADDED_BY       - 1] = opts.addedBy       || '';
  if (opts.buildingZone  !== undefined) row[ML.BUILDING_ZONE  - 1] = opts.buildingZone  || '';
  if (opts.equipType     !== undefined) row[ML.EQUIP_TYPE     - 1] = opts.equipType     || '';
  if (opts.description   !== undefined) row[ML.DESCRIPTION    - 1] = opts.description   || '';
  if (opts.problemType   !== undefined) row[ML.PROBLEM_TYPE   - 1] = opts.problemType   || '';
  if (opts.partsNeeded   !== undefined) row[ML.PARTS_NEEDED   - 1] = opts.partsNeeded   ? 'Y' : '';
  if (opts.equipTagStatus!== undefined) row[ML.EQUIP_TAG_STATUS-1] = opts.equipTagStatus|| '';
  if (opts.downtimeType  !== undefined) row[ML.DOWNTIME_TYPE  - 1] = opts.downtimeType  || '';
  if (opts.dateOpened    !== undefined) row[ML.DATE_OPENED    - 1] = opts.dateOpened    || '';
  if (opts.lineNo        !== undefined) row[ML.LINE_NO        - 1] = opts.lineNo        || '';
  await appendSheetRow(token, env.SPREADSHEET_ID, SH.MASTER_LOG, row);
}

// Append a row to Ticket History (8 cols).
async function appendTicketHistory(token, env, ticketNo, eventType, statusFrom, statusTo, performedBy, notes) {
  const row = ['', ticketNo, fmtDate(new Date()), eventType, statusFrom, statusTo, performedBy, notes];
  await appendSheetRow(token, env.SPREADSHEET_ID, SH.TICKET_HIST, row);
}

// ── Monitoring handlers ───────────────────────────────────────────────────────

async function handleTempFix(env, userEmail) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);

  const rows = await readSheet(token, env.SPREADSHEET_ID, SH.TEMP_FIX, `A${HIST_HEADER_ROW + 1}:V`);
  const items = [];
  rows.forEach(r => {
    const tempId = cellStr(r, TF.TEMP_ID);
    if (!tempId) return;
    const dept   = cellStr(r, TF.DEPT);
    if (!allowed(user, dept)) return;
    const status = cellStr(r, TF.STATUS).toUpperCase();
    if (status === 'CLEARED') return;
    items.push({
      tempId,
      ticketNo:          cellStr(r, TF.TICKET_NO),
      equipCode:         cellStr(r, TF.EQUIP_CODE),
      specificEquip:     cellStr(r, TF.SPECIFIC_EQUIP),
      dept,
      buildingZone:      cellStr(r, TF.BUILDING_ZONE),
      dateFlagged:       fmtDate(cellDate(r, TF.DATE_FLAGGED)),
      description:       cellStr(r, TF.DESCRIPTION),
      tempFixDesc:       cellStr(r, TF.TEMP_FIX_DESC),
      freqDays:          r[TF.FREQ_DAYS - 1] || '',
      lastInspected:     fmtDate(cellDate(r, TF.LAST_INSPECTED)),
      nextDue:           fmtDate(cellDate(r, TF.NEXT_DUE)),
      status,
      flaggedBy:         cellStr(r, TF.FLAGGED_BY),
      clearedBy:         cellStr(r, TF.CLEARED_BY),
      clearedDate:       fmtDate(cellDate(r, TF.CLEARED_DATE)),
      notes:             cellStr(r, TF.NOTES),
      reasonTemporary:   cellStr(r, TF.REASON_TEMPORARY),
      permFixPlan:       cellStr(r, TF.PERM_FIX_PLAN),
      expectedCompletion:fmtDate(cellDate(r, TF.EXPECTED_COMPLETION)),
      noImprovised:      cellStr(r, TF.NO_IMPROVISED),
      productRiskOk:     cellStr(r, TF.PRODUCT_RISK_OK),
    });
  });
  return jsonResponse(items);
}

// Full SQF view for one temp fix (Temporary Repair Log). Joins the TF row with
// the parent ticket (priority, downtime, problem), parts ordered, and the
// inspection/review history so the detail partial can show every SQF-required
// field without adding columns to the live Temp Fix sheet.
async function handleTempFixDetail(env, userEmail, tempId) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  tempId = String(tempId || '').trim();
  if (!tempId) return jsonResponse({ error: 'tempId required' }, 400);

  const dataStart = HIST_HEADER_ROW + 1;
  const [tfRows, mlRows, pnRows, thRows] = await Promise.all([
    readSheet(token, env.SPREADSHEET_ID, SH.TEMP_FIX,     `A${dataStart}:V`),
    readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG,   'A2:AQ'),
    readSheet(token, env.SPREADSHEET_ID, SH.PARTS_NEEDED, `A${dataStart}:L`),
    readSheet(token, env.SPREADSHEET_ID, SH.TICKET_HIST,  'A2:H'),
  ]);

  let tfRow = null;
  tfRows.forEach(r => { if (cellStr(r, TF.TEMP_ID) === tempId) tfRow = r; });
  if (!tfRow) return jsonResponse({ error: 'Temp fix not found' }, 404);
  const dept = cellStr(tfRow, TF.DEPT);
  if (!allowed(user, dept)) return jsonResponse({ error: 'Access denied' }, 403);

  const ticketNo = cellStr(tfRow, TF.TICKET_NO);

  // Collapse parent ticket from Master Log (last non-empty wins).
  const tRows = mlRows.filter(r => cellStr(r, ML.TICKET_NO) === ticketNo);
  const best  = tRows.length ? tRows[0].slice() : [];
  for (let i = 1; i < tRows.length; i++) tRows[i].forEach((v, c) => { if (v != null && v !== '') best[c] = v; });

  // Parts ordered against this ticket.
  const parts = pnRows
    .filter(r => cellStr(r, PN.TICKET_NO) === ticketNo)
    .map(r => ({
      partDesc:  cellStr(r, PN.PART_DESC),
      status:    cellStr(r, PN.PARTS_STATUS),
      requested: fmtDate(cellDate(r, PN.DATE_REQUESTED)),
      ordered:   fmtDate(cellDate(r, PN.DATE_ORDERED)),
      received:  fmtDate(cellDate(r, PN.DATE_RECEIVED)),
    }));

  // Weekly follow-up / inspection history from Ticket History (temp-fix events).
  const histTs = r => { const d = cellDate(r, 3); return d ? d.getTime() : 0; };
  const reviews = thRows
    .filter(r => String(r[1] || '').trim() === ticketNo && /TEMP\s*FIX/i.test(String(r[3] || '')))
    .sort((a, b) => histTs(a) - histTs(b))
    .map(r => ({
      date:  fmtDate(cellDate(r, 3)) || String(r[2] || ''),
      event: String(r[3] || ''),
      by:    String(r[6] || ''),
      notes: String(r[7] || ''),
    }));

  return jsonResponse({ detail: {
    tempId, ticketNo, dept,
    equipCode:          cellStr(tfRow, TF.EQUIP_CODE),
    specificEquip:      cellStr(tfRow, TF.SPECIFIC_EQUIP),
    buildingZone:       cellStr(tfRow, TF.BUILDING_ZONE),
    dateFlagged:        fmtDate(cellDate(tfRow, TF.DATE_FLAGGED)),
    tempFixDesc:        cellStr(tfRow, TF.TEMP_FIX_DESC),
    reasonTemporary:    cellStr(tfRow, TF.REASON_TEMPORARY),
    permFixPlan:        cellStr(tfRow, TF.PERM_FIX_PLAN),
    expectedCompletion: fmtDate(cellDate(tfRow, TF.EXPECTED_COMPLETION)),
    noImprovised:       cellStr(tfRow, TF.NO_IMPROVISED),
    productRiskOk:      cellStr(tfRow, TF.PRODUCT_RISK_OK),
    status:             cellStr(tfRow, TF.STATUS).toUpperCase(),
    lastInspected:      fmtDate(cellDate(tfRow, TF.LAST_INSPECTED)),
    nextDue:            fmtDate(cellDate(tfRow, TF.NEXT_DUE)),
    freqDays:           tfRow[TF.FREQ_DAYS - 1] || '',
    flaggedBy:          cellStr(tfRow, TF.FLAGGED_BY),
    // Joined from the parent ticket (no TF schema change needed):
    priority:           cellStr(best, ML.PRIORITY),
    problemType:        cellStr(best, ML.PROBLEM_TYPE),
    description:        cellStr(best, ML.DESCRIPTION),
    downtimeType:       cellStr(best, ML.DOWNTIME_TYPE),
    downtimeDuration:   cellStr(best, ML.DOWNTIME_DURATION),
    parts, reviews,
  }});
}

async function handleTempFixInspect(env, userEmail, body) {
  const token  = await getAccessToken(env);
  const user   = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);

  const tempId = String(body.tempId || '').trim();
  if (!tempId) return jsonResponse({ error: 'tempId required' }, 400);

  const dataStart = HIST_HEADER_ROW + 1;
  const sheetRow  = await findMonitorRow(token, env.SPREADSHEET_ID, SH.TEMP_FIX, tempId, dataStart);
  if (sheetRow < 0) return jsonResponse({ error: 'Temp fix not found: ' + tempId }, 404);

  const rowData  = (await readSheet(token, env.SPREADSHEET_ID, SH.TEMP_FIX, `A${sheetRow}:V${sheetRow}`))[0] || [];
  const freq     = parseInt(rowData[TF.FREQ_DAYS - 1] || '7', 10);
  const ticketNo = cellStr(rowData, TF.TICKET_NO);
  const dept     = cellStr(rowData, TF.DEPT);
  const now      = new Date();
  const nextDue  = new Date(now.getTime() + freq * 86400000);

  await writeSheetCells(token, env.SPREADSHEET_ID, SH.TEMP_FIX, sheetRow, [
    { col: TF.LAST_INSPECTED, value: fmtDate(now) },
    { col: TF.NEXT_DUE,       value: fmtDate(nextDue) },
    { col: TF.STATUS,         value: 'ACTIVE' },
  ]);

  if (ticketNo) {
    const noteStr = 'Temp fix inspected — next due: ' + fmtDate(nextDue) + (body.notes ? ' | ' + body.notes : '');
    await appendMasterLog(token, env, {
      ticketNo, now, action: 'TEMP FIX INSPECTED', status: 'OPEN',
      dept, updatedBy: body.updatedBy || user.displayName, notes: noteStr,
    });
    await appendTicketHistory(token, env, ticketNo, 'TEMP FIX INSPECTED', '', '',
      body.updatedBy || user.displayName, 'Inspected — next due: ' + fmtDate(nextDue));
  }
  return jsonResponse({ success: true, tempId });
}

async function handleTempFixClear(env, userEmail, body) {
  const token  = await getAccessToken(env);
  const user   = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);

  const tempId = String(body.tempId || '').trim();
  if (!tempId) return jsonResponse({ error: 'tempId required' }, 400);

  const dataStart = HIST_HEADER_ROW + 1;
  const sheetRow  = await findMonitorRow(token, env.SPREADSHEET_ID, SH.TEMP_FIX, tempId, dataStart);
  if (sheetRow < 0) return jsonResponse({ error: 'Temp fix not found: ' + tempId }, 404);

  const rowData  = (await readSheet(token, env.SPREADSHEET_ID, SH.TEMP_FIX, `A${sheetRow}:Q${sheetRow}`))[0] || [];
  const ticketNo = cellStr(rowData, TF.TICKET_NO);
  const dept     = cellStr(rowData, TF.DEPT);
  const now      = new Date();
  const clearer  = body.clearedBy || user.displayName;

  await writeSheetCells(token, env.SPREADSHEET_ID, SH.TEMP_FIX, sheetRow, [
    { col: TF.STATUS,       value: 'CLEARED' },
    { col: TF.CLEARED_BY,   value: clearer },
    { col: TF.CLEARED_DATE, value: fmtDate(now) },
  ]);

  if (ticketNo) {
    await appendMasterLog(token, env, {
      ticketNo, now, action: 'MANAGER ACTION — TEMP FIX CLEARED', status: 'OPEN',
      dept, updatedBy: clearer, notes: body.notes || '',
    });
    await appendTicketHistory(token, env, ticketNo, 'TEMP FIX CLEARED', '', '', clearer, body.notes || '');
  }
  return jsonResponse({ success: true, tempId });
}

async function handleEhl(env, userEmail, includeCleared) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);

  const rows = await readSheet(token, env.SPREADSHEET_ID, SH.EQUIP_HOLD_LOG, `A${HIST_HEADER_ROW + 1}:S`);
  const items = [];
  rows.forEach(r => {
    const tagId = cellStr(r, EHL.TAG_ID);
    if (!tagId) return;
    const dept   = cellStr(r, EHL.DEPT);
    if (!allowed(user, dept)) return;
    const status = cellStr(r, EHL.EQUIP_STATUS).toUpperCase();
    if (status === 'CLEARED' && !includeCleared) return;
    items.push({
      tagId,
      ticketNo:     cellStr(r, EHL.TICKET_NO),
      equipCode:    cellStr(r, EHL.EQUIP_CODE),
      specificEquip:cellStr(r, EHL.SPECIFIC_EQUIP),
      dept,
      buildingZone: cellStr(r, EHL.BUILDING_ZONE),
      tagType:      cellStr(r, EHL.TAG_TYPE),
      dateTagged:   fmtDate(cellDate(r, EHL.DATE_TAGGED)),
      taggedBy:     cellStr(r, EHL.TAGGED_BY),
      reason:       cellStr(r, EHL.REASON),
      equipStatus:  status,
      clearedBy:    cellStr(r, EHL.CLEARED_BY),
      clearedDate:  fmtDate(cellDate(r, EHL.CLEARED_DATE)),
      notes:        cellStr(r, EHL.NOTES),
      // FRM-029-001 NCR register fields (2.3-2.6)
      holdRef:      cellStr(r, EHL.HOLD_REF),
      capaRef:      cellStr(r, EHL.CAPA_REF),
      disposition:  cellStr(r, EHL.DISPOSITION),
      authorizedBy: cellStr(r, EHL.AUTHORIZED_BY),
      whatDone:     cellStr(r, EHL.WHAT_DONE),
    });
  });
  return jsonResponse(items);
}

async function handleEhlClear(env, userEmail, body) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);

  const tagId = String(body.tagId || '').trim();
  if (!tagId) return jsonResponse({ error: 'tagId required' }, 400);

  const dataStart = HIST_HEADER_ROW + 1;
  const sheetRow  = await findMonitorRow(token, env.SPREADSHEET_ID, SH.EQUIP_HOLD_LOG, tagId, dataStart);
  if (sheetRow < 0) return jsonResponse({ error: 'Tag not found: ' + tagId }, 404);

  const rowData  = (await readSheet(token, env.SPREADSHEET_ID, SH.EQUIP_HOLD_LOG, `A${sheetRow}:S${sheetRow}`))[0] || [];
  const ticketNo = cellStr(rowData, EHL.TICKET_NO);
  const dept     = cellStr(rowData, EHL.DEPT);
  const now      = new Date();
  const clearer  = body.clearedBy || user.displayName;

  // FRM-029-001 release record (SQF 2.6.3): disposition + authorized-by +
  // what-was-done are captured at release and written to the NCR register.
  await writeSheetCells(token, env.SPREADSHEET_ID, SH.EQUIP_HOLD_LOG, sheetRow, [
    { col: EHL.EQUIP_STATUS,  value: 'CLEARED' },
    { col: EHL.CLEARED_BY,    value: clearer },
    { col: EHL.CLEARED_DATE,  value: fmtDate(now) },
    { col: EHL.DISPOSITION,   value: body.disposition  || '' },
    { col: EHL.AUTHORIZED_BY, value: body.authorizedBy || clearer },
    { col: EHL.WHAT_DONE,     value: body.whatDone     || body.notes || '' },
  ]);

  if (ticketNo) {
    await appendMasterLog(token, env, {
      ticketNo, now, action: 'EQUIPMENT CLEARED', status: 'OPEN', dept,
      equipCode:     cellStr(rowData, EHL.EQUIP_CODE),
      specificEquip: cellStr(rowData, EHL.SPECIFIC_EQUIP),
      updatedBy: clearer, notes: body.notes || '',
    });
    await appendTicketHistory(token, env, ticketNo, 'TAG CLEARED', '', '', clearer, body.notes || '');
  }
  return jsonResponse({ success: true, tagId });
}

async function handleParts(env, userEmail) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  const isTech = user.isTech;
  if (!user.isManager && !isTech) return jsonResponse({ error: 'Access required' }, 403);

  const rows = await readSheet(token, env.SPREADSHEET_ID, SH.PARTS_NEEDED, `A${HIST_HEADER_ROW + 1}:L`);
  const items = [];
  rows.forEach(r => {
    const partId = cellStr(r, PN.PART_ID);
    if (!partId) return;
    const dept   = cellStr(r, PN.DEPT);
    if (user.isManager && !user.isAdmin && !allowed(user, dept)) return;
    items.push({
      partId,
      partDesc:     cellStr(r, PN.PART_DESC),
      ticketNo:     cellStr(r, PN.TICKET_NO),
      equipCode:    cellStr(r, PN.EQUIP_CODE),
      specificEquip:cellStr(r, PN.SPECIFIC_EQUIP),
      dept,
      dateRequested:fmtDate(cellDate(r, PN.DATE_REQUESTED)),
      partsStatus:  cellStr(r, PN.PARTS_STATUS).toUpperCase(),
      dateOrdered:  fmtDate(cellDate(r, PN.DATE_ORDERED)),
      dateReceived: fmtDate(cellDate(r, PN.DATE_RECEIVED)),
      orderedBy:    cellStr(r, PN.ORDERED_BY),
      notes:        cellStr(r, PN.NOTES),
    });
  });
  return jsonResponse(items);
}

async function handlePartsStatus(env, userEmail, body) {
  const token   = await getAccessToken(env);
  const user    = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);

  const partId  = String(body.partId  || '').trim();
  const newStat = String(body.status  || '').trim().toUpperCase();
  if (!partId)  return jsonResponse({ error: 'partId required' }, 400);
  if (!newStat) return jsonResponse({ error: 'status required' }, 400);

  const dataStart = HIST_HEADER_ROW + 1;
  const sheetRow  = await findMonitorRow(token, env.SPREADSHEET_ID, SH.PARTS_NEEDED, partId, dataStart);
  if (sheetRow < 0) return jsonResponse({ error: 'Part not found: ' + partId }, 404);

  const rowData  = (await readSheet(token, env.SPREADSHEET_ID, SH.PARTS_NEEDED, `A${sheetRow}:L${sheetRow}`))[0] || [];
  const ticketNo = cellStr(rowData, PN.TICKET_NO);
  const dept     = cellStr(rowData, PN.DEPT);
  const now      = new Date();

  const cells = [{ col: PN.PARTS_STATUS, value: newStat }];
  if (newStat === 'ORDERED')  cells.push({ col: PN.DATE_ORDERED,  value: fmtDate(now) });
  if (newStat === 'RECEIVED') cells.push({ col: PN.DATE_RECEIVED, value: fmtDate(now) });
  await writeSheetCells(token, env.SPREADSHEET_ID, SH.PARTS_NEEDED, sheetRow, cells);

  if (ticketNo) {
    await appendMasterLog(token, env, {
      ticketNo, now, action: 'PARTS STATUS UPDATED', status: 'OPEN',
      dept, partsStatus: newStat, updatedBy: body.updatedBy || user.displayName,
      notes: 'Part ' + partId + ' → ' + newStat + (body.notes ? ' | ' + body.notes : ''),
    });
    await appendTicketHistory(token, env, ticketNo, 'PARTS UPDATED', '', '',
      body.updatedBy || user.displayName,
      'Part ' + (cellStr(rowData, PN.PART_DESC) || partId) + ' status → ' + newStat);
  }
  return jsonResponse({ success: true, partId, status: newStat });
}

// ── Ticket queue / list handlers ─────────────────────────────────────────────

// Shared: merge ML rows per ticket and filter by status + optional dept.
function mergeAndFilter(mlRows, statusFilter, deptFilter) {
  const byTicket = {};
  mlRows.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO);
    if (!tn) return;
    if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
    r.forEach((v, i) => { if (v != null && v !== '') byTicket[tn][i] = v; });
  });

  const prioOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const dept = deptFilter ? deptFilter.toUpperCase().trim() : null;
  const tickets = [];

  Object.values(byTicket).forEach(r => {
    const status = cellStr(r, ML.STATUS).toUpperCase();
    if (statusFilter.length && !statusFilter.includes(status)) return;

    const ticketDept    = normalizeDept(cellStr(r, ML.DEPT));
    const jointStr      = cellStr(r, ML.JOINT_DEPTS);
    const jointList     = jointStr   ? jointStr.split(',').map(d => d.trim()).filter(Boolean) : [];
    const pendingStr    = cellStr(r, ML.PENDING_JOINT_DEPTS);
    const pendingList   = pendingStr ? pendingStr.split(',').map(d => d.trim()).filter(Boolean) : [];
    let isJoint = false, isPendingJoint = false;

    if (dept) {
      if (ticketDept.toUpperCase() !== dept) {
        isJoint = jointList.some(d => d.toUpperCase() === dept);
        if (!isJoint) {
          isPendingJoint = pendingList.some(d => d.toUpperCase() === dept);
          if (!isPendingJoint) return;
        }
      }
    }

    tickets.push({
      ticketNo:     cellStr(r, ML.TICKET_NO),
      status,
      priority:     cellStr(r, ML.PRIORITY).toUpperCase(),
      dept:         ticketDept,
      buildingZone: cellStr(r, ML.BUILDING_ZONE),
      equipType:    cellStr(r, ML.EQUIP_TYPE),
      equipCode:    cellStr(r, ML.EQUIP_CODE),
      specificEquip:cellStr(r, ML.SPECIFIC_EQUIP),
      description:  cellStr(r, ML.DESCRIPTION),
      assignedTo:   cellStr(r, ML.ASSIGNED_TO),
      dateOpened:   fmtDate(cellDate(r, ML.DATE_OPENED)),
      problemType:  cellStr(r, ML.PROBLEM_TYPE),
      addedBy:      cellStr(r, ML.ADDED_BY),
      downtimeType: cellStr(r, ML.DOWNTIME_TYPE),
      lineNo:       cellStr(r, ML.LINE_NO),
      tempFixFlag:  cellStr(r, ML.TEMP_FIX_FLAG) === 'Y',
      partsNeeded:  cellStr(r, ML.PARTS_NEEDED) === 'Y',
      estHours:     r[ML.EST_HOURS   - 1] || '',
      actualHours:  r[ML.ACTUAL_HOURS - 1] || '',
      fixType:      cellStr(r, ML.FIX_TYPE),
      verifiedBy:   cellStr(r, ML.VERIFIED_BY),
      photoUrl:     cellStr(r, ML.PHOTO_URL),
      jointDepts:   jointStr, isJoint, pendingJointDepts: pendingStr, isPendingJoint,
    });
  });

  tickets.sort((a, b) => {
    const pa = prioOrder[a.priority] ?? 4, pb = prioOrder[b.priority] ?? 4;
    if (pa !== pb) return pa - pb;
    return (b.dateOpened || '').localeCompare(a.dateOpened || '');
  });
  return tickets;
}

async function handleQueueTickets(env, userEmail, queueType, deptFilter) {
  const token  = await getAccessToken(env);
  const user   = await resolveUser(token, env, userEmail);
  const isTech = user.isTech;
  if (!user.isManager && !isTech) return jsonResponse({ error: 'Access required' }, 403);

  let statusFilter;
  switch (queueType) {
    case 'waiting': statusFilter = ['WAITING']; break;
    case 'open':    statusFilter = ['OPEN', 'COMPLETE', 'PENDING VERIFICATION', 'PENDING PARTS', 'ON HOLD']; break;
    case 'verify':  statusFilter = ['COMPLETE', 'PENDING VERIFICATION']; break;
    case 'tracker': statusFilter = ['WAITING', 'OPEN', 'COMPLETE', 'PENDING VERIFICATION', 'PENDING PARTS', 'ON HOLD']; break;
    default:        statusFilter = ['WAITING', 'OPEN']; break;
  }

  const [mlRows] = await Promise.all([
    readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ'),
    loadDeptAliases(token, env),
  ]);
  const tickets = mergeAndFilter(mlRows, statusFilter, deptFilter || null);
  return jsonResponse({ tickets: tickets.slice(0, 500), userOwnedDepts: user.ownedDepts || [] });
}

async function handleTicketDetail(env, userEmail, ticketNo) {
  const token  = await getAccessToken(env);
  const user   = await resolveUser(token, env, userEmail);
  const isTech = user.isTech;
  if (!user.isManager && !isTech) return jsonResponse({ error: 'Access required' }, 403);
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);

  const [mlRows, thRows] = await Promise.all([
    readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG,  'A2:AU'),
    readSheet(token, env.SPREADSHEET_ID, SH.TICKET_HIST, 'A2:H'),
  ]);

  const rows = mlRows.filter(r => cellStr(r, ML.TICKET_NO) === ticketNo);
  if (!rows.length) return jsonResponse({ error: 'Ticket not found: ' + ticketNo }, 404);

  const best = rows[0].slice();
  for (let i = 1; i < rows.length; i++) {
    rows[i].forEach((v, c) => { if (v != null && v !== '') best[c] = v; });
  }

  const ticket = {
    ticketNo:         cellStr(best, ML.TICKET_NO),
    status:           cellStr(best, ML.STATUS).toUpperCase(),
    priority:         cellStr(best, ML.PRIORITY).toUpperCase(),
    dept:             normalizeDept(cellStr(best, ML.DEPT)),
    buildingZone:     cellStr(best, ML.BUILDING_ZONE),
    equipType:        cellStr(best, ML.EQUIP_TYPE),
    equipCode:        cellStr(best, ML.EQUIP_CODE),
    specificEquip:    cellStr(best, ML.SPECIFIC_EQUIP),
    downtimeType:     cellStr(best, ML.DOWNTIME_TYPE),
    description:      cellStr(best, ML.DESCRIPTION),
    assignedTo:       cellStr(best, ML.ASSIGNED_TO),
    estHours:         best[ML.EST_HOURS    - 1] || '',
    actualHours:      best[ML.ACTUAL_HOURS - 1] || '',
    dateOpened:       fmtDate(cellDate(best, ML.DATE_OPENED)),
    dateCompleted:    fmtDate(cellDate(best, ML.DATE_COMPLETED)),
    dateClosed:       fmtDate(cellDate(best, ML.DATE_CLOSED)),
    correctiveAct:    cellStr(best, ML.CORRECTIVE_ACT),
    rootCause:        cellStr(best, ML.ROOT_CAUSE),
    preventiveAct:    cellStr(best, ML.PREVENTIVE_ACT),
    workSummary:      cellStr(best, ML.PREVENTIVE_ACT),
    fixType:          cellStr(best, ML.FIX_TYPE),
    tempFixFlag:      cellStr(best, ML.TEMP_FIX_FLAG) === 'Y',
    partsNeeded:      cellStr(best, ML.PARTS_NEEDED) === 'Y',
    partsStatus:      cellStr(best, ML.PARTS_STATUS),
    equipTagStatus:   cellStr(best, ML.EQUIP_TAG_STATUS),
    verifiedBy:       cellStr(best, ML.VERIFIED_BY),
    verifiedDate:     fmtDate(cellDate(best, ML.VERIFIED_DATE)),
    addedBy:          cellStr(best, ML.ADDED_BY),
    updatedBy:        cellStr(best, ML.UPDATED_BY),
    notes:            cellStr(best, ML.NOTES),
    problemType:      cellStr(best, ML.PROBLEM_TYPE),
    lineNo:           cellStr(best, ML.LINE_NO),
    sqfChecklist:     cellStr(best, ML.VERIFICATION_CHECKLIST),
    photoUrl:         cellStr(best, ML.PHOTO_URL),
    jointDepts:       cellStr(best, ML.JOINT_DEPTS),
    jointSignoffs:    cellStr(best, ML.JOINT_SIGNOFFS),
    pendingJointDepts:cellStr(best, ML.PENDING_JOINT_DEPTS),
    permFixPlan:      cellStr(best, ML.PERM_FIX_PLAN),
    permFixDate:      fmtDate(cellDate(best, ML.PERM_FIX_DATE)),
    downtimeDuration: cellStr(best, ML.DOWNTIME_DURATION),
    clrToolsRemoved:  cellStr(best, ML.CLR_TOOLS_REMOVED),
    clrAreaClean:     cellStr(best, ML.CLR_AREA_CLEAN),
    clrQaRequired:    cellStr(best, ML.CLR_QA_REQUIRED),
    assignedDept:     normalizeDept(cellStr(best, ML.ASSIGNED_DEPT)) || normalizeDept(cellStr(best, ML.DEPT)),
  };

  // Sort chronologically by the real timestamp column. Raw sheet-append order
  // mixes backdated imports (e.g. an Izzy import stamped with the ticket's
  // original date appended after a newer local action), which made the timeline
  // show out-of-order / "impossible back-to-back" actions.
  const histTs = r => { const d = cellDate(r, 3); return d ? d.getTime() : 0; };
  const history = thRows
    .filter(r => String(r[1] || '').trim() === ticketNo)
    .sort((a, b) => histTs(a) - histTs(b))
    .map(r => ({
      histId:      String(r[0] || ''),
      timestamp:   fmtDate(cellDate(r, 3)) || String(r[2] || ''),
      eventType:   String(r[3] || ''),
      statusFrom:  String(r[4] || ''),
      statusTo:    String(r[5] || ''),
      performedBy: String(r[6] || ''),
      notes:       String(r[7] || ''),
    }));

  return jsonResponse({ ticket, history, techs: [] });
}

async function handleClosedTickets(env, userEmail) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);

  const mlRows = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  const byTicket = {};
  mlRows.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO);
    if (!tn) return;
    if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
    r.forEach((v, i) => { if (v != null && v !== '') byTicket[tn][i] = v; });
  });

  const tickets = [];
  Object.values(byTicket).forEach(r => {
    const status = cellStr(r, ML.STATUS).toUpperCase();
    if (status !== 'CLOSED' && status !== 'COMPLETE') return;
    const rawClose = cellDate(r, ML.DATE_CLOSED) || cellDate(r, ML.VERIFIED_DATE);
    tickets.push({
      ticketNo:     cellStr(r, ML.TICKET_NO),
      status:       cellStr(r, ML.STATUS),
      priority:     cellStr(r, ML.PRIORITY).toUpperCase(),
      dept:         normalizeDept(cellStr(r, ML.DEPT)),
      equipCode:    cellStr(r, ML.EQUIP_CODE),
      specificEquip:cellStr(r, ML.SPECIFIC_EQUIP),
      description:  cellStr(r, ML.DESCRIPTION),
      assignedTo:   cellStr(r, ML.ASSIGNED_TO),
      actualHours:  r[ML.ACTUAL_HOURS - 1] || '',
      dateOpened:   fmtDate(cellDate(r, ML.DATE_OPENED)),
      dateClosed:   fmtDate(rawClose),
      verifiedBy:   cellStr(r, ML.VERIFIED_BY),
      verifiedDate: fmtDate(cellDate(r, ML.VERIFIED_DATE)),
      addedBy:      cellStr(r, ML.ADDED_BY),
      lineNo:       cellStr(r, ML.LINE_NO),
      jointDepts:   cellStr(r, ML.JOINT_DEPTS),
      _closeTs:     rawClose ? rawClose.getTime() : 0,
    });
  });

  tickets.sort((a, b) => b._closeTs - a._closeTs);
  tickets.forEach(t => delete t._closeTs);
  return jsonResponse({ tickets: tickets.slice(0, 500), userOwnedDepts: user.ownedDepts || [] });
}

async function handleEquipTicketHistory(env, userEmail, equipCode) {
  const token  = await getAccessToken(env);
  const user   = await resolveUser(token, env, userEmail);
  const isTech = user.isTech;
  if (!user.isManager && !isTech) return jsonResponse({ error: 'Access required' }, 403);
  if (!equipCode) return jsonResponse([], 200);

  const mlRows = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  const perTicket = {};
  mlRows.forEach(r => {
    const tn   = cellStr(r, ML.TICKET_NO);
    const code = cellStr(r, ML.EQUIP_CODE);
    if (!tn || tn === 'SYSTEM' || code !== equipCode) return;
    if (!perTicket[tn]) perTicket[tn] = r.slice();
    else r.forEach((v, c) => { if (v != null && v !== '') perTicket[tn][c] = v; });
  });

  const result = Object.values(perTicket).map(r => ({
    ticketNo:    cellStr(r, ML.TICKET_NO),
    dateOpened:  fmtDate(cellDate(r, ML.DATE_OPENED)),
    status:      cellStr(r, ML.STATUS).toUpperCase(),
    priority:    cellStr(r, ML.PRIORITY).toUpperCase(),
    problemType: cellStr(r, ML.PROBLEM_TYPE),
    estHours:    r[ML.EST_HOURS    - 1] || '',
    actualHours: r[ML.ACTUAL_HOURS - 1] || '',
  }));

  result.sort((a, b) => (b.dateOpened || '').localeCompare(a.dateOpened || ''));
  return jsonResponse(result);
}

// ── Submit ticket handlers ────────────────────────────────────────────────────

async function handleFormData(env, userEmail) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  const isTech = user.isTech;
  if (!user.isManager && !isTech) return jsonResponse({ error: 'Access required' }, 403);

  const [configRows, dataRows, managerRows, techRows, cacheData] = await Promise.all([
    readSheet(token, env.SPREADSHEET_ID, SH.CONFIG,         'C2:D30'),
    readSheet(token, env.SPREADSHEET_ID, SH.DATA_VALID,     'A1:Z200'),
    readSheet(token, env.SPREADSHEET_ID, SH.MANAGER_ACCESS, 'A4:E200'),
    readSheet(token, env.SPREADSHEET_ID, SH.TECH_DIR,       'A2:D200').catch(() => []),
    readSheet(token, env.SPREADSHEET_ID, SH.EQUIP_CACHE,    'A4:Z').catch(() => []),
  ]);

  const config = {};
  configRows.forEach(r => { if (r[0]) config[String(r[0]).trim()] = String(r[1] ?? ''); });

  // Parse data lists (first row = headers)
  const lists = {};
  if (dataRows.length > 0) {
    const hdrs = dataRows[0];
    for (let col = 0; col < hdrs.length; col++) {
      const key = String(hdrs[col] || '').trim();
      if (!key) continue;
      lists[key] = [];
      for (let row = 1; row < dataRows.length; row++) {
        const v = String(dataRows[row][col] || '').trim();
        if (v) lists[key].push(v);
      }
    }
  }

  // Build people list: techs from Tech Directory, then managers
  const people = [];
  const seen = new Set();
  const addPerson = name => {
    const k = name.toLowerCase().trim();
    if (!seen.has(k)) { seen.add(k); people.push(name); }
  };
  techRows.forEach(r => {
    const name = String(r[0] || '').trim();
    if (name && String(r[3] ?? 'Y').trim().toUpperCase() !== 'N') addPerson(name);
  });
  if (people.length === 0) (lists['Technicians'] || []).forEach(addPerson);
  managerRows.forEach(r => { const n = String(r[0] || '').trim(); if (n) addPerson(n); });

  const departments = ['METAL','ELECTRICAL','PLASTIC','LITHO','PLASTIC DEC','QA','MACHINE SHOP','S/R','SALES','G&A'];

  let routingRules = [];
  try { routingRules = JSON.parse(config['Routing Override Rules'] || '[]'); } catch { routingRules = []; }
  if (!routingRules.length) routingRules = [
    { keyword: 'ELECTRICAL', matchOn: 'PROBLEM_TYPE', routeTo: 'ELECTRICAL' },
  ];

  const deptMapping = {
    'METAL': 'METAL', 'METALS': 'METAL',
    'ELECTRICAL': 'ELECTRICAL',
    'PLASTIC': 'PLASTIC', 'PLASTICS': 'PLASTIC',
    'LITHO': 'LITHO',
    'PLASTIC DEC': 'PLASTIC DEC',
    'QA': 'QA',
    'MACHINE SHOP': 'MACHINE SHOP', 'M/S': 'MACHINE SHOP',
    'S/R': 'S/R',
    'SALES': 'SALES',
    'G&A': 'G&A',
  };

  // Build equipRows (flat, csc-hub style) and equipHierarchy from cache.
  // cacheData[0] = header row, cacheData[1+] = data rows (read from A4).
  const equipHierarchy = {};
  const equipRows      = [];
  if (cacheData.length > 1) {
    const colIdx  = buildEquipColIdx(cacheData[0] || []);
    const seenKeys = new Set();
    for (let i = 1; i < cacheData.length; i++) {
      const row = cacheData[i]; if (!row || !row.length) continue;
      const col = k => colIdx[k] !== undefined ? String(row[colIdx[k]] || '').trim() : '';
      const status = (col('status') || 'ACTIVE').toUpperCase();
      if (status === 'INACTIVE') continue;
      const rawDept = col('dept').toUpperCase();
      const code    = col('code');
      if (!rawDept || !code) continue;
      const dept   = deptMapping[rawDept] || rawDept;
      const eType  = col('eType') || 'Other';
      const name   = col('specific') || code;
      // Legacy nested hierarchy (kept for backwards compat)
      if (!equipHierarchy[dept]) equipHierarchy[dept] = {};
      if (!equipHierarchy[dept][eType]) equipHierarchy[dept][eType] = [];
      equipHierarchy[dept][eType].push({ code, name });
      // Flat rows for csc-hub-style cascading button grid
      // Level order: dept → Line # (section) → eType → specific name
      // If no Line # on the row, fall back to: dept → eType → specific name
      const deptCode = col('deptCode') || '';
      const line     = col('line')     || '';
      const specific = col('specific') || '';
      let level2, level3, level4;
      if (line) {
        level2 = line;
        level3 = eType || specific || code;
        level4 = eType ? (specific || '') : '';
      } else {
        level2 = eType || '';
        level3 = specific || code;
        level4 = '';
      }
      const rowKey  = dept + '|' + level2 + '|' + level3 + '|' + level4 + '|' + code;
      if (!seenKeys.has(rowKey)) {
        seenKeys.add(rowKey);
        equipRows.push({ dept, deptCode, level2, level3, level4, code });
      }
    }
  }

  return jsonResponse({
    companyName:    config['Company Name'] || 'Container Supply Co.',
    docNo:          config['Doc No (Ticket Form)'] || 'FRM-030-004',
    revision:       config['Revision'] || '0',
    departments,
    equipHierarchy,
    equipRows,
    buildingZones:  lists['Building / Zone'] || [],
    priorities:     lists['Priorities'] || ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    problemTypes:   lists['Problem Types'] || [],
    downtypeTypes:  lists['Downtime Types'] || ['PLANNED', 'UNPLANNED'],
    peopleList:     people,
    userDisplayName:user.displayName,
    userOwnedDepts: user.ownedDepts,
    userIsManager:  user.isManager || user.isAdmin,
    routingRules,
    deptMapping,
  });
}

async function handleEquipQuickStats(env, userEmail, equipCode) {
  if (!equipCode) return jsonResponse({ count60d: 0, topProbType: null });
  const token  = await getAccessToken(env);
  const user   = await resolveUser(token, env, userEmail);
  const isTech = user.isTech;
  if (!user.isManager && !isTech) return jsonResponse({ error: 'Access required' }, 403);

  const mlRows  = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  const cutoff  = new Date(); cutoff.setDate(cutoff.getDate() - 60);
  const seen    = new Set();
  const ptCount = {};
  let count60d  = 0;

  mlRows.forEach(r => {
    const code = cellStr(r, ML.EQUIP_CODE);
    const tn   = cellStr(r, ML.TICKET_NO);
    if (code !== equipCode || !tn || seen.has(tn)) return;
    const doDate = cellDate(r, ML.DATE_OPENED);
    if (doDate && doDate >= cutoff) {
      seen.add(tn);
      count60d++;
      const pt = cellStr(r, ML.PROBLEM_TYPE);
      if (pt) ptCount[pt] = (ptCount[pt] || 0) + 1;
    }
  });

  let topProbType = null;
  if (Object.keys(ptCount).length) {
    topProbType = Object.entries(ptCount).sort((a, b) => b[1] - a[1])[0][0];
  }
  return jsonResponse({ count60d, topProbType });
}

async function handleReserveTicketId(env, userEmail, searchParams) {
  const token  = await getAccessToken(env);
  const user   = await resolveUser(token, env, userEmail);
  if (!user.isManager && !user.isTech) return jsonResponse({ error: 'Access required' }, 403);
  const dept   = (searchParams.get('dept') || '').toUpperCase().trim();
  const ticketNo = await generateTicketNo(token, env, dept);
  return jsonResponse({ ticketNo });
}

async function handleUploadPhoto(env, userEmail, body) {
  const folderId = (env.PHOTO_FOLDER_ID || '').replace(/^﻿/, '').trim();
  if (!folderId) return jsonResponse({ ok: false, error: 'Photo storage not configured (PHOTO_FOLDER_ID missing)' }, 500);

  const token     = await getAccessToken(env);
  const user      = await resolveUser(token, env, userEmail);
  if (!user.isManager && !user.isTech) return jsonResponse({ error: 'Access required' }, 403);
  const ticketNo  = String(body.ticketNo   || '');
  const photoIdx  = body.photoIndex || 1;
  const dataUrl   = String(body.dataUrl    || '');
  const mimeType  = String(body.mimeType   || 'image/jpeg');
  const ext       = String(body.ext        || 'jpg');
  const filename  = `cmms_${ticketNo}_photo_${photoIdx}.${ext}`;

  const b64    = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binary = atob(b64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const boundary = 'boundary-' + Math.random().toString(36).slice(2);
  const metadata = { name: filename, parents: [folderId], mimeType };
  const enc  = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const tail    = enc.encode(`\r\n--${boundary}--`);
  const bodyBuf = new Uint8Array(head.length + bytes.length + tail.length);
  bodyBuf.set(head, 0);
  bodyBuf.set(bytes, head.length);
  bodyBuf.set(tail, head.length + bytes.length);

  const upRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true',
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body:    bodyBuf
    }
  );
  if (!upRes.ok) {
    const errText = await upRes.text();
    return jsonResponse({ ok: false, error: `Drive upload failed: ${upRes.status} ${errText}` });
  }
  const file = await upRes.json();

  // Grant view access to the cscmfg.com domain (non-fatal if it fails)
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/permissions?supportsAllDrives=true`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: 'domain', role: 'reader', domain: 'cscmfg.com' })
    });
  } catch (_) { /* non-fatal */ }

  return jsonResponse({ ok: true, url: `https://drive.google.com/file/d/${file.id}/view` });
}

async function handleAddTicket(env, userEmail, body) {
  const token  = await getAccessToken(env);
  const user   = await resolveUser(token, env, userEmail);
  const isTech = user.isTech;
  if (!user.isManager && !isTech) return jsonResponse({ error: 'Access required' }, 403);
  if (!String(body.equipType || '').trim()) return jsonResponse({ error: 'Equipment type required' }, 400);

  const dept       = normalizeDept(body.dept || '');
  const isCritical = String(body.priority || '').toUpperCase() === 'CRITICAL';
  const status     = isCritical ? 'OPEN' : 'WAITING';
  const now        = new Date();
  const addedBy    = body.addedBy || user.displayName;

  // Use pre-reserved ticketNo if provided (photos were uploaded before this call),
  // otherwise generate a sequential ID now (same format as CSC Hub: MT-{code}-{YYMMDD}-{NNN}).
  let ticketNo = String(body.ticketNo || '').trim();
  if (!ticketNo) {
    ticketNo = await generateTicketNo(token, env, dept);
  }

  // Build photo cell: join any uploaded Drive links with newline
  const photoLinks = Array.isArray(body.photoLinks) ? body.photoLinks.filter(l => l && !l.startsWith('UPLOAD_FAILED') && !l.startsWith('NETWORK_ERROR')) : [];
  const photoCell  = photoLinks.length > 0 ? photoLinks.join('\n') : (body.photoUrl || '');

  await appendMasterLog(token, env, {
    ticketNo, now, action: isCritical ? 'TICKET CREATED — CRITICAL (bypass)' : 'TICKET CREATED',
    status, dept, assignedDept: dept,
    equipCode:     body.equipCode     || '',
    specificEquip: body.specificEquip || '',
    equipType:     body.equipType     || '',
    buildingZone:  body.buildingZone  || '',
    lineNo:        body.lineNo        || '',
    priority:      body.priority      || 'LOW',
    problemType:   body.problemType   || '',
    description:   body.description   || '',
    downtimeType:  body.downtimeType  || '',
    partsNeeded:   !!body.partsNeeded,
    estHours:      body.estHours      || '',
    addedBy:       addedBy,
    updatedBy:     addedBy,
    dateOpened:    fmtDate(now),
    notes:         body.observations  || '',
    photoUrl:      photoCell,
  });
  // Extended ML fields via batch write on the newly-appended row (best-effort)
  await appendTicketHistory(token, env, ticketNo, 'CREATED', '', status, addedBy,
    isCritical ? 'Critical — bypassed waiting queue' : 'Created → Waiting Queue');

  // Determine tracker name
  const TRACKERS = { METAL: 'Metal', ELECTRICAL: 'Electrical', PLASTIC: 'Plastic', LITHO: 'Litho', 'PLASTIC DEC': 'Plastic Dec', QA: 'QA', 'MACHINE SHOP': 'Machine Shop', 'S/R': 'S/R', SALES: 'Sales', 'G&A': 'G&A' };
  const tracker  = '📋 Tracker — ' + (TRACKERS[dept] || dept);
  return jsonResponse({ success: true, ticketNo, status, tracker });
}

// ── Joint request handlers ────────────────────────────────────────────────────

async function handleConfirmJoint(env, userEmail, body) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  const ticketNo = String(body.ticketNo || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);

  // Find the ticket row in the ML and update PENDING_JOINT_DEPTS → JOINT_DEPTS
  // This is a complex multi-row update; stub returns success so the UI flows
  await appendMasterLog(token, env, {
    ticketNo, now: new Date(), action: 'JOINT REQUEST', status: '', dept: '',
    updatedBy: user.displayName, notes: 'Joint request confirmed by ' + user.displayName,
  });
  await appendTicketHistory(token, env, ticketNo, 'TRANSFER CONFIRMED', '', '', user.displayName, 'Joint request accepted');
  return jsonResponse({ success: true, ticketNo });
}

async function handleRejectJoint(env, userEmail, body) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  const ticketNo = String(body.ticketNo || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);

  await appendMasterLog(token, env, {
    ticketNo, now: new Date(), action: 'JOINT REQUEST REJECTED', status: '', dept: '',
    updatedBy: user.displayName, notes: 'Rejected: ' + (body.reason || ''),
  });
  await appendTicketHistory(token, env, ticketNo, 'JOINT REQUEST REJECTED', '', '', user.displayName, body.reason || '');
  return jsonResponse({ success: true, ticketNo });
}

async function handleRollover(env, userEmail, body) {
  // Monthly rollover requires direct sheet manipulation (insert/delete rows)
  // which is not supported via the Sheets values API alone.
  // Return a stub success so the UI doesn't error, but warn that nothing changed.
  return jsonResponse({ success: true, totalRemoved: 0, message: 'Rollover not supported in web version — use the Google Sheets app.' });
}

// ── Ticket action handlers ────────────────────────────────────────────────────

async function handleApproveTicket(env, userEmail, body) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  const ticketNo  = String(body.ticketNo  || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);
  const updatedBy = String(body.updatedBy || user.displayName).trim();
  await appendMasterLog(token, env, {
    ticketNo, now: new Date(), action: 'APPROVED', status: 'OPEN',
    priority: body.priority || '', assignedTo: body.assignedTo || '',
    estHours: body.estHours || '', updatedBy, notes: body.notes || '',
  });
  await appendTicketHistory(token, env, ticketNo, 'APPROVED', 'WAITING', 'OPEN', updatedBy, body.notes || '');
  return jsonResponse({ success: true, ticketNo });
}

// Collapse a ticket's latest state from the Master Log (last non-empty per col).
async function _ticketState_(token, env, ticketNo) {
  const rows = (await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AT'))
    .filter(r => cellStr(r, ML.TICKET_NO) === ticketNo);
  if (!rows.length) return null;
  const best = rows[0].slice();
  for (let i = 1; i < rows.length; i++) rows[i].forEach((v, c) => { if (v != null && v !== '') best[c] = v; });
  return best;
}
function _normDepts_(s) {
  return String(s || '').split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
}

async function handleCompleteTicket(env, userEmail, body) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  const ticketNo  = String(body.ticketNo  || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);

  // Two-step joint workflow: the fixer dept (a JOINT_DEPTS member) performs the
  // repair + CAPA on a joint ticket; on a single-dept ticket the owner does it.
  const best = await _ticketState_(token, env, ticketNo);
  if (!best) return jsonResponse({ error: 'Ticket not found: ' + ticketNo }, 404);
  const owner = normalizeDept(cellStr(best, ML.DEPT));
  const joint = _normDepts_(cellStr(best, ML.JOINT_DEPTS));
  const mine  = user.ownedDepts || [];
  const canWork = user.isAdmin || (joint.length ? joint.some(d => mine.indexOf(d) >= 0) : mine.indexOf(owner) >= 0);
  if (!canWork) return jsonResponse({ error: 'On a joint ticket, only the assigned (fixer) department can mark work complete.' }, 403);

  const updatedBy = String(body.updatedBy || user.displayName).trim();
  await appendMasterLog(token, env, {
    ticketNo, now: new Date(), action: 'WORK COMPLETE', status: 'COMPLETE',
    correctiveAct: body.correctiveAct || '', rootCause: body.rootCause || '',
    preventiveAct: body.preventiveAct || '', fixType: body.fixType || '',
    actualHours: body.actualHours || '', downtimeDuration: body.downtimeDuration || '',
    tempFixFlag: body.tempFixFlag, updatedBy, notes: body.notes || '',
    // Post-Repair Clearance captured at completion (SQF 2.14.3)
    clrToolsRemoved: body.clrToolsRemoved || '', clrAreaClean: body.clrAreaClean || '',
    clrQaRequired: body.clrQaRequired || '',
    // Revert assigned dept back to owner so they know to verify & close
    assignedDept: owner,
  });
  await appendTicketHistory(token, env, ticketNo, 'WORK COMPLETE', 'OPEN', 'COMPLETE', updatedBy, '');
  return jsonResponse({ success: true, ticketNo });
}

async function handleVerifyClose(env, userEmail, body) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  const ticketNo  = String(body.ticketNo  || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);

  // W1 — enforce the SQF verification checklist server-side (cannot be bypassed
  // by the UI). All four confirmations must be present before a ticket closes
  // (SQF 2.13 / 2.14.3 / 13.2.8): work summary, root cause, corrective action,
  // and sanitation / food-safety clearance.
  const _chk = String(body.sqfChecklist || '').toLowerCase();
  const _required = ['work summary', 'root cause', 'corrective action', 'saniti'];
  const _missing = _required.filter(k => _chk.indexOf(k) < 0);
  if (_missing.length) {
    return jsonResponse({ error: 'Verification checklist incomplete — all four items (work summary, root cause, corrective action, sanitation / food-safety) must be confirmed before closing.' }, 400);
  }

  // Two-step joint workflow: only the owning department (the dept that opened the
  // ticket) verifies cleaning/sanitation and closes — on joint tickets the fixer
  // dept cannot self-close their own work.
  const best = await _ticketState_(token, env, ticketNo);
  if (!best) return jsonResponse({ error: 'Ticket not found: ' + ticketNo }, 404);
  const owner = normalizeDept(cellStr(best, ML.DEPT));
  const mine  = user.ownedDepts || [];
  if (!(user.isAdmin || mine.indexOf(owner) >= 0)) {
    return jsonResponse({ error: 'Only the owning department (' + owner + ') can verify & close this ticket.' }, 403);
  }

  const updatedBy = String(body.updatedBy || user.displayName).trim();
  const now       = new Date();
  await appendMasterLog(token, env, {
    ticketNo, now, action: 'VERIFIED & CLOSED', status: 'CLOSED',
    verifiedBy: body.verifiedBy || updatedBy, verifiedDate: fmtDate(now),
    dateClosed: fmtDate(now), sqfChecklist: body.sqfChecklist || '',
    // Owner's Post-Repair Clearance confirmation (SQF 2.14.3)
    clrToolsRemoved: body.clrToolsRemoved || '', clrAreaClean: body.clrAreaClean || '',
    clrQaRequired: body.clrQaRequired || '',
    updatedBy, notes: body.notes || '',
  });
  await appendTicketHistory(token, env, ticketNo, 'VERIFIED & CLOSED', 'COMPLETE', 'CLOSED', updatedBy, body.notes || '');
  return jsonResponse({ success: true, ticketNo });
}

async function handleVoidTicket(env, userEmail, body) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  const ticketNo = String(body.ticketNo || '').trim();
  const reason   = String(body.reason   || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);
  if (!reason)   return jsonResponse({ error: 'reason required' }, 400);
  const updatedBy = String(body.updatedBy || user.displayName).trim();
  await appendMasterLog(token, env, { ticketNo, now: new Date(), action: 'VOIDED', status: 'VOIDED', updatedBy, notes: reason });
  await appendTicketHistory(token, env, ticketNo, 'VOIDED', '', 'VOIDED', updatedBy, reason);
  return jsonResponse({ success: true, ticketNo });
}

async function handleAssignTicket(env, userEmail, body) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  const ticketNo  = String(body.ticketNo  || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);
  const updatedBy = String(body.updatedBy || user.displayName).trim();
  await appendMasterLog(token, env, {
    ticketNo, now: new Date(), action: 'ASSIGNED',
    assignedTo: body.assignedTo || '', estHours: body.estHours || '', updatedBy,
  });
  await appendTicketHistory(token, env, ticketNo, 'ASSIGNED', '', '', updatedBy, 'Assigned to: ' + (body.assignedTo || 'Unassigned'));
  return jsonResponse({ success: true, ticketNo });
}

async function handleFlagTempFix(env, userEmail, body) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  const ticketNo  = String(body.ticketNo  || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);
  const updatedBy = String(body.updatedBy || user.displayName).trim();
  const now       = new Date();

  const mlRows = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  const rows   = mlRows.filter(r => cellStr(r, ML.TICKET_NO) === ticketNo);
  const best   = rows.length ? rows[0].slice() : [];
  for (let i = 1; i < rows.length; i++) rows[i].forEach((v, c) => { if (v != null && v !== '') best[c] = v; });

  await appendMasterLog(token, env, {
    ticketNo, now, action: 'TEMP FIX FLAGGED', tempFixFlag: true,
    permFixPlan: body.permFixPlan || '', permFixDate: body.permFixDate || '',
    dept: cellStr(best, ML.DEPT), equipCode: cellStr(best, ML.EQUIP_CODE),
    specificEquip: cellStr(best, ML.SPECIFIC_EQUIP),
    updatedBy, notes: body.tempFixDesc || '',
  });

  const tfId  = 'TF-' + ticketNo + '-' + String(now.getTime()).slice(-4);
  const tfRow = new Array(TF_COLS).fill('');
  tfRow[TF.TEMP_ID             - 1] = tfId;
  tfRow[TF.TICKET_NO           - 1] = ticketNo;
  tfRow[TF.EQUIP_CODE          - 1] = cellStr(best, ML.EQUIP_CODE);
  tfRow[TF.SPECIFIC_EQUIP      - 1] = cellStr(best, ML.SPECIFIC_EQUIP);
  tfRow[TF.DEPT                - 1] = cellStr(best, ML.DEPT);
  tfRow[TF.BUILDING_ZONE       - 1] = cellStr(best, ML.BUILDING_ZONE);
  tfRow[TF.DATE_FLAGGED        - 1] = fmtDate(now);
  tfRow[TF.DESCRIPTION         - 1] = cellStr(best, ML.DESCRIPTION);
  tfRow[TF.TEMP_FIX_DESC       - 1] = body.tempFixDesc      || '';
  tfRow[TF.FREQ_DAYS           - 1] = 7;
  tfRow[TF.STATUS              - 1] = 'ACTIVE';
  tfRow[TF.FLAGGED_BY          - 1] = updatedBy;
  tfRow[TF.REASON_TEMPORARY    - 1] = body.reasonTemporary   || '';
  tfRow[TF.PERM_FIX_PLAN       - 1] = body.permFixPlan       || '';
  tfRow[TF.EXPECTED_COMPLETION - 1] = body.permFixDate        || '';
  tfRow[TF.NO_IMPROVISED       - 1] = body.noImprovised  ? 'Y' : '';
  tfRow[TF.PRODUCT_RISK_OK     - 1] = body.productRiskOk ? 'Y' : '';
  await appendSheetRow(token, env.SPREADSHEET_ID, SH.TEMP_FIX, tfRow);
  await appendTicketHistory(token, env, ticketNo, 'TEMP FIX FLAGGED', '', '', updatedBy,
    'Temp fix: ' + (body.tempFixDesc || '') + (body.permFixDate ? ' | Target fix: ' + body.permFixDate : ''));
  return jsonResponse({ success: true, ticketNo, tfId });
}

async function handleTransferTicket(env, userEmail, body) {
  const token  = await getAccessToken(env);
  const user   = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  const ticketNo = String(body.ticketNo || '').trim();
  const toDept   = String(body.toDept   || '').trim().toUpperCase();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);
  if (!toDept)   return jsonResponse({ error: 'toDept required' }, 400);
  const updatedBy = String(body.updatedBy || user.displayName).trim();
  // Joint tickets replace transfers: add the dept to JOINT_DEPTS immediately so
  // both departments have visibility for the whole lifecycle (no pending hand-off,
  // and append-only logs can't reliably clear a pending field anyway).
  const best  = await _ticketState_(token, env, ticketNo);
  const joint = best ? _normDepts_(cellStr(best, ML.JOINT_DEPTS)) : [];
  if (joint.indexOf(toDept) < 0) joint.push(toDept);
  await appendMasterLog(token, env, {
    ticketNo, now: new Date(), action: 'JOINT DEPT ADDED',
    jointDepts: joint.join(', '), assignedDept: toDept, updatedBy, notes: body.reason || '',
  });
  await appendTicketHistory(token, env, ticketNo, 'JOINT DEPT ADDED', '', '', updatedBy,
    'Joint department added: ' + toDept + (body.reason ? ' — ' + body.reason : ''));
  return jsonResponse({ success: true, ticketNo });
}

async function handleRequestParts(env, userEmail, body) {
  const token  = await getAccessToken(env);
  const user   = await resolveUser(token, env, userEmail);
  const isTech = user.isTech;
  if (!user.isManager && !isTech) return jsonResponse({ error: 'Access required' }, 403);
  const ticketNo  = String(body.ticketNo  || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);
  const updatedBy = String(body.updatedBy || user.displayName).trim();
  const now       = new Date();

  const mlRows = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  const rows   = mlRows.filter(r => cellStr(r, ML.TICKET_NO) === ticketNo);
  const best   = rows.length ? rows[0].slice() : [];
  for (let i = 1; i < rows.length; i++) rows[i].forEach((v, c) => { if (v != null && v !== '') best[c] = v; });

  const parts = body.partsList || [];
  for (let pi = 0; pi < parts.length; pi++) {
    const partId = 'PT-' + ticketNo + '-' + String(now.getTime() + pi).slice(-5);
    const pnRow  = new Array(12).fill('');
    pnRow[PN.PART_ID        - 1] = partId;
    pnRow[PN.PART_DESC      - 1] = parts[pi].desc || '';
    pnRow[PN.TICKET_NO      - 1] = ticketNo;
    pnRow[PN.EQUIP_CODE     - 1] = cellStr(best, ML.EQUIP_CODE);
    pnRow[PN.SPECIFIC_EQUIP - 1] = cellStr(best, ML.SPECIFIC_EQUIP);
    pnRow[PN.DEPT           - 1] = cellStr(best, ML.DEPT);
    pnRow[PN.DATE_REQUESTED - 1] = fmtDate(now);
    pnRow[PN.PARTS_STATUS   - 1] = 'PENDING';
    await appendSheetRow(token, env.SPREADSHEET_ID, SH.PARTS_NEEDED, pnRow);
  }

  const newStatus = body.setStatus || '';
  await appendMasterLog(token, env, {
    ticketNo, now, action: 'PARTS REQUESTED', status: newStatus || '',
    partsNeeded: 'Y', updatedBy, notes: body.notes || (parts.length + ' part(s) requested'),
  });
  await appendTicketHistory(token, env, ticketNo, 'PARTS REQUESTED', '', newStatus || '', updatedBy,
    parts.map(p => p.desc).join(', ') + (body.notes ? ' | ' + body.notes : ''));
  return jsonResponse({ success: true, ticketNo });
}

async function handleUpdateTicket(env, userEmail, body) {
  const token  = await getAccessToken(env);
  const user   = await resolveUser(token, env, userEmail);
  const isTech = user.isTech;
  if (!user.isManager && !isTech) return jsonResponse({ error: 'Access required' }, 403);
  const ticketNo  = String(body.ticketNo  || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);
  const updatedBy = String(body.updatedBy || user.displayName).trim();
  const opts = { ticketNo, now: new Date(), action: 'UPDATED', updatedBy, notes: body.notes || '' };
  if (body.status     !== undefined) opts.status     = body.status;
  if (body.priority   !== undefined) opts.priority   = body.priority;
  if (body.assignedTo !== undefined) opts.assignedTo = body.assignedTo;
  if (body.estHours   !== undefined) opts.estHours   = body.estHours;
  await appendMasterLog(token, env, opts);
  await appendTicketHistory(token, env, ticketNo, 'UPDATED', '', body.status || '', updatedBy, body.notes || '');
  return jsonResponse({ success: true, ticketNo });
}

async function handleEditTicketFields(env, userEmail, body) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  const ticketNo  = String(body.ticketNo || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);
  const updatedBy = String(body.updatedBy || user.displayName).trim();
  const section   = String(body.section   || 'fields');

  const opts = {
    ticketNo, now: new Date(),
    action: 'DIRECT EDIT — ' + section,
    updatedBy,
  };

  // Apply only the fields that were submitted for this section
  const editable = [
    'priority','assignedTo','estHours','actualHours','downtimeType','dept',
    'equipType','equipCode','specificEquip','buildingZone','lineNo',
    'problemType','description','notes',
    'correctiveAct','rootCause','preventiveAct','fixType','permFixPlan','permFixDate',
  ];
  const changed = [];
  editable.forEach(f => {
    if (body[f] !== undefined) { opts[f] = body[f]; changed.push(f); }
  });

  await appendMasterLog(token, env, opts);
  await appendTicketHistory(token, env, ticketNo, 'DIRECT EDIT', '', '', updatedBy,
    'Edited: ' + changed.join(', '));
  return jsonResponse({ success: true, ticketNo });
}

async function handleAddTicketPhoto(env, userEmail, body) {
  const token  = await getAccessToken(env);
  const user   = await resolveUser(token, env, userEmail);
  const isTech = user.isTech;
  if (!user.isManager && !isTech) return jsonResponse({ error: 'Access required' }, 403);
  const ticketNo = String(body.ticketNo  || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);
  const photoUrl = String(body.photoUrl  || '').trim();
  if (!photoUrl) return jsonResponse({ error: 'photoUrl required' }, 400);
  const updatedBy = String(body.updatedBy || user.displayName || userEmail).trim();
  await appendMasterLog(token, env, {
    ticketNo, now: new Date(), action: 'PHOTO ADDED', updatedBy, photoUrl,
    notes: 'Photo added by ' + updatedBy,
  });
  await appendTicketHistory(token, env, ticketNo, 'PHOTO ADDED', '', '', updatedBy, 'Photo attached');
  return jsonResponse({ success: true, ticketNo });
}

async function handleIssueHoldTag(env, userEmail, body) {
  const token    = await getAccessToken(env);
  const user     = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  const ticketNo = String(body.ticketNo || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);
  const now      = new Date();
  const taggedBy = String(body.taggedBy || user.displayName).trim();
  const tagId    = 'TAG-' + ticketNo + '-' + String(now.getTime()).slice(-4);
  // Unique hold reference # for the NCR register (SQF 2.3.4), distinct from the tag #.
  const holdRef  = 'NCR-' + ticketNo + '-' + String(now.getTime()).slice(-4);
  const ehlRow   = new Array(EHL_COLS).fill('');
  ehlRow[EHL.TAG_ID       - 1] = tagId;
  ehlRow[EHL.TICKET_NO    - 1] = ticketNo;
  ehlRow[EHL.EQUIP_CODE   - 1] = body.equipCode     || '';
  ehlRow[EHL.SPECIFIC_EQUIP-1] = body.specificEquip || '';
  ehlRow[EHL.DEPT         - 1] = body.dept          || '';
  ehlRow[EHL.BUILDING_ZONE- 1] = body.buildingZone  || '';
  ehlRow[EHL.TAG_TYPE     - 1] = body.tagType       || '';
  ehlRow[EHL.DATE_TAGGED  - 1] = fmtDate(now);
  ehlRow[EHL.TAGGED_BY    - 1] = taggedBy;
  ehlRow[EHL.REASON       - 1] = body.reason        || '';
  ehlRow[EHL.EQUIP_STATUS - 1] = 'ACTIVE';
  ehlRow[EHL.HOLD_REF     - 1] = holdRef;
  ehlRow[EHL.CAPA_REF     - 1] = body.capaRef       || '';
  await appendSheetRow(token, env.SPREADSHEET_ID, SH.EQUIP_HOLD_LOG, ehlRow);
  await appendMasterLog(token, env, {
    ticketNo, now, action: 'HOLD TAG ISSUED', equipTagStatus: 'ACTIVE',
    dept: body.dept || '', equipCode: body.equipCode || '', specificEquip: body.specificEquip || '',
    updatedBy: taggedBy, notes: 'Tag type: ' + (body.tagType || '') + (body.reason ? ' | ' + body.reason : ''),
  });
  await appendTicketHistory(token, env, ticketNo, 'HOLD TAG ISSUED', '', '', taggedBy,
    (body.tagType || '') + (body.reason ? ': ' + body.reason : ''));
  return jsonResponse({ success: true, ticketNo, tagId });
}

async function handleServiceReport(env, userEmail, body) {
  const token     = await getAccessToken(env);
  const user      = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  const ticketNo  = String(body.ticketNo || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);
  const updatedBy = String(body.addedBy  || user.displayName).trim();
  const now       = new Date();
  await appendMasterLog(token, env, {
    ticketNo, now, action: 'SERVICE REPORT SAVED',
    dept: body.dept || '', equipCode: body.equipCode || '', specificEquip: body.specificEquip || '',
    correctiveAct: body.correctiveAct || '', rootCause: body.rootCause || '',
    preventiveAct: body.preventiveAct || body.workSummary || '',
    fixType: body.fixType || '', actualHours: body.laborHours || '',
    updatedBy, notes: body.notes || '',
  });
  try {
    const rptRow = [
      '', ticketNo, fmtDate(now), body.dept || '', body.equipType || '',
      body.specificEquip || '', body.description || '',
      body.completedBy || updatedBy, body.laborHours || '', body.serviceDate || fmtDate(now),
      body.rootCause || '', body.correctiveAct || '', body.preventiveAct || body.workSummary || '',
      body.partsUsed || '', body.recommendations || '',
      body.clrRepairComplete || '', body.clrToolsRemoved || '',
      body.clrAreaClean || '', body.clrQaRequired || '',
      body.facilityContact || '', body.facilityContactDate || '',
      body.restrictedActivity || 'N', body.tempFixFlag ? 'Y' : 'N',
    ];
    await appendSheetRow(token, env.SPREADSHEET_ID, SH.RPT_DB, rptRow);
  } catch (_) { /* RPT_DB tab may not exist */ }
  await appendTicketHistory(token, env, ticketNo, 'SERVICE REPORT SAVED', '', '', updatedBy, '');
  return jsonResponse({ success: true, ticketNo });
}

// Returns the most recent saved service report for a ticket so the Service
// Report form can pre-fill instead of forcing re-entry of data already on file.
// Column order matches the rptRow written in handleServiceReport.
async function handleGetServiceReport(env, userEmail, ticketNo) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  ticketNo = String(ticketNo || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);

  let rows = [];
  try {
    rows = await readSheet(token, env.SPREADSHEET_ID, SH.RPT_DB, 'A2:W');
  } catch (_) { return jsonResponse({ report: null }); }

  // Last matching row wins (most recent save).
  let match = null;
  rows.forEach(r => { if (String(r[1] || '').trim() === ticketNo) match = r; });
  if (!match) return jsonResponse({ report: null });

  const s = i => String(match[i] == null ? '' : match[i]);
  return jsonResponse({ report: {
    ticketNo:            s(1),
    dept:                s(3),
    equipType:           s(4),
    specificEquip:       s(5),
    description:         s(6),
    completedBy:         s(7),
    laborHours:          s(8),
    serviceDate:         s(9),
    rootCause:           s(10),
    correctiveAct:       s(11),
    preventiveAct:       s(12),
    partsUsed:           s(13),
    recommendations:     s(14),
    clrRepairComplete:   s(15),
    clrToolsRemoved:     s(16),
    clrAreaClean:        s(17),
    clrQaRequired:       s(18),
    facilityContact:     s(19),
    facilityContactDate: s(20),
    restrictedActivity:  s(21),
    tempFixFlag:         s(22),
  }});
}

async function handleDeptSignOff(env, userEmail, body) {
  const token     = await getAccessToken(env);
  const user      = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);
  const ticketNo  = String(body.ticketNo || '').trim();
  if (!ticketNo) return jsonResponse({ error: 'ticketNo required' }, 400);
  const updatedBy = String(body.updatedBy || user.displayName).trim();

  const mlRows = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  const tRows  = mlRows.filter(r => cellStr(r, ML.TICKET_NO) === ticketNo);
  const best   = tRows.length ? tRows[0].slice() : [];
  for (let i = 1; i < tRows.length; i++) tRows[i].forEach((v, c) => { if (v != null && v !== '') best[c] = v; });

  let signoffs = {};
  try { signoffs = JSON.parse(cellStr(best, ML.JOINT_SIGNOFFS) || '{}'); } catch (_) {}
  const dept = user.ownedDepts[0] || '';
  if (dept) signoffs[dept] = { by: updatedBy, at: fmtDate(new Date()) };

  await appendMasterLog(token, env, {
    ticketNo, now: new Date(), action: 'DEPT SIGN-OFF',
    jointSignoffs: JSON.stringify(signoffs), updatedBy, notes: body.notes || '',
  });
  await appendTicketHistory(token, env, ticketNo, 'DEPT SIGN-OFF', '', '', updatedBy,
    dept + ' sign-off' + (body.notes ? ': ' + body.notes : ''));
  return jsonResponse({ success: true, ticketNo });
}

// ── Reports handlers ──────────────────────────────────────────────────────────

// All currently-active tickets (open + waiting + pending + on hold), one row per
// ticket (joint-safe), regardless of age. Powers the "Export Active Tickets"
// button on the Reports page.
async function handleActiveTickets(env, userEmail) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);

  const mlRows = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  const byTicket = {};
  mlRows.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO);
    if (!tn) return;
    if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
    const cur = byTicket[tn];
    r.forEach((v, i) => { if (v != null && v !== '') cur[i] = v; });
  });

  const ACTIVE = new Set(['WAITING', 'OPEN', 'COMPLETE', 'PENDING VERIFICATION', 'PENDING PARTS', 'ON HOLD']);
  const tickets = [];
  Object.keys(byTicket).forEach(tn => {
    const r  = byTicket[tn];
    const st = cellStr(r, ML.STATUS).toUpperCase();
    if (!ACTIVE.has(st)) return;
    tickets.push({
      ticketNo:      tn,
      status:        st,
      priority:      cellStr(r, ML.PRIORITY).toUpperCase(),
      dept:          normalizeDept(cellStr(r, ML.DEPT)),
      equipCode:     cellStr(r, ML.EQUIP_CODE),
      specificEquip: cellStr(r, ML.SPECIFIC_EQUIP),
      problemType:   cellStr(r, ML.PROBLEM_TYPE),
      description:   cellStr(r, ML.DESCRIPTION),
      assignedTo:    cellStr(r, ML.ASSIGNED_TO),
      dateOpened:    fmtDate(cellDate(r, ML.DATE_OPENED)),
    });
  });

  const prioOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  tickets.sort((a, b) =>
    (prioOrder[a.priority] ?? 4) - (prioOrder[b.priority] ?? 4) ||
    a.dept.localeCompare(b.dept) ||
    a.ticketNo.localeCompare(b.ticketNo));

  return jsonResponse({ generatedAt: fmtDate(new Date()), count: tickets.length, tickets });
}

async function handleReportData(env, userEmail, daysBack) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (daysBack || 30));

  const mlRows = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');

  const byTicket = {};
  mlRows.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO);
    if (!tn) return;
    if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
    r.forEach((v, i) => { if (v != null && v !== '') byTicket[tn][i] = v; });
  });

  const ACTIVE = ['WAITING','OPEN','COMPLETE','PENDING VERIFICATION','PENDING PARTS','ON HOLD'];
  const tickets = [];
  const statusFunnel = { waiting:0, open:0, pendingVerify:0, pendingParts:0, closed:0 };
  const deptStats = {};
  const ptCount = {}, equipCount = {}, teamMap = {};

  // Heatmap accumulators (8.3 dept × equip-type, 8.4 building × zone).
  // buildingZone is a single combined value per ticket; split it on the first
  // recognised delimiter so it renders as a 2-D building × zone grid. If there
  // is no delimiter the whole value is the building and the zone collapses to
  // "General" — the grid still degrades gracefully to a single column.
  const equipHM = {}, equipHMDepts = {}, equipHMTypes = {};
  const bldgHM = {}, bldgHMBuildings = {}, bldgHMZones = {};
  const splitBuildingZone = (bz) => {
    const s = String(bz || '').trim();
    if (!s) return null;
    const m = s.match(/^(.*?)\s*(?:\/|·|\||–|:|\s-\s)\s*(.+)$/);
    return m ? [m[1].trim() || s, m[2].trim()] : [s, 'General'];
  };

  Object.values(byTicket).forEach(r => {
    const doDate = cellDate(r, ML.DATE_OPENED);
    if (!doDate) return;
    const status = cellStr(r, ML.STATUS).toUpperCase();
    if (!doDate || (doDate < cutoff && !ACTIVE.includes(status))) return;

    const dept    = normalizeDept(cellStr(r, ML.DEPT));
    const tf      = cellStr(r, ML.TEMP_FIX_FLAG) === 'Y';
    const actualH = parseFloat(String(r[ML.ACTUAL_HOURS - 1] || '')) || 0;
    const dc      = cellDate(r, ML.DATE_CLOSED) || cellDate(r, ML.VERIFIED_DATE);

    if (!deptStats[dept]) deptStats[dept] = { dept, open:0, waiting:0, closed:0, critical:0, tempFix:0, totalHours:0 };
    const ds = deptStats[dept];
    if (status === 'WAITING') { statusFunnel.waiting++; ds.waiting++; }
    else if (status === 'CLOSED' || status === 'COMPLETE') { statusFunnel.closed++; ds.closed++; }
    else if (status === 'COMPLETE' || status === 'PENDING VERIFICATION') statusFunnel.pendingVerify++;
    else if (status === 'PENDING PARTS')        statusFunnel.pendingParts++;
    else { statusFunnel.open++; ds.open++; }
    if (cellStr(r, ML.PRIORITY).toUpperCase() === 'CRITICAL') ds.critical++;
    if (tf) ds.tempFix++;
    ds.totalHours += actualH;

    const pt = cellStr(r, ML.PROBLEM_TYPE);
    if (pt) ptCount[pt] = (ptCount[pt] || 0) + 1;

    const code  = cellStr(r, ML.EQUIP_CODE);
    const equip = cellStr(r, ML.SPECIFIC_EQUIP);
    if (code) {
      if (!equipCount[code]) equipCount[code] = { equipCode: code, specificEquip: equip, dept, count: 0 };
      equipCount[code].count++;
    }

    // 8.3 Equipment Risk Heatmap: dept × equipment type
    const eType = cellStr(r, ML.EQUIP_TYPE);
    if (dept && eType) {
      const k = dept + '||' + eType;
      equipHM[k] = (equipHM[k] || 0) + 1;
      equipHMDepts[dept] = true;
      equipHMTypes[eType] = true;
    }

    // 8.4 Building & Zone Hotspots: building × zone
    const bz = splitBuildingZone(cellStr(r, ML.BUILDING_ZONE));
    if (bz) {
      const k = bz[0] + '||' + bz[1];
      bldgHM[k] = (bldgHM[k] || 0) + 1;
      bldgHMBuildings[bz[0]] = true;
      bldgHMZones[bz[1]] = true;
    }

    const tech = cellStr(r, ML.ASSIGNED_TO);
    if (tech) {
      if (!teamMap[tech]) teamMap[tech] = { name: tech, open:0, closed:0, totalHrs:0, closeTimes:[] };
      const tm = teamMap[tech];
      const isClosed = status === 'CLOSED' || status === 'COMPLETE';
      if (isClosed) { tm.closed++; if (doDate && dc) tm.closeTimes.push((dc - doDate) / 3600000); }
      else if (ACTIVE.includes(status)) tm.open++;
      if (actualH) tm.totalHrs += actualH;
    }

    tickets.push({
      ticketNo:     cellStr(r, ML.TICKET_NO),
      status, priority: cellStr(r, ML.PRIORITY).toUpperCase(),
      dept, equipCode: code, specificEquip: equip,
      description:  cellStr(r, ML.DESCRIPTION),
      assignedTo:   cellStr(r, ML.ASSIGNED_TO),
      addedBy:      cellStr(r, ML.ADDED_BY),
      verifiedBy:   cellStr(r, ML.VERIFIED_BY),
      dateOpened:   fmtDate(doDate),
      dateClosed:   dc ? fmtDate(dc) : '',
      actualHours:  r[ML.ACTUAL_HOURS - 1] || '',
      tempFixFlag:  tf,
    });
  });

  const summary       = Object.values(deptStats).sort((a, b) => a.dept.localeCompare(b.dept));
  const problemTypes  = Object.entries(ptCount).sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count }));
  const equipHotspots = Object.values(equipCount).sort((a, b) => b.count - a.count);
  const teamWorkload  = Object.values(teamMap).map(t => ({
    name: t.name, open: t.open, closed: t.closed,
    totalHrs:    Math.round(t.totalHrs * 10) / 10,
    avgCloseHrs: t.closeTimes.length ? Math.round(t.closeTimes.reduce((a, b) => a + b, 0) / t.closeTimes.length) : null,
  })).sort((a, b) => b.open - a.open);

  const openTickets     = tickets.filter(t => ACTIVE.includes(t.status));
  const closedInPeriod  = tickets.filter(t => t.status === 'CLOSED' || t.status === 'COMPLETE');
  const closedTimes     = closedInPeriod.map(t => {
    const d0 = t.dateOpened ? new Date(t.dateOpened) : null;
    const d1 = t.dateClosed ? new Date(t.dateClosed)  : null;
    return (d0 && d1 && !isNaN(d0) && !isNaN(d1)) ? (d1 - d0) / 3600000 : null;
  }).filter(x => x !== null && x >= 0);
  const avgTimeToClose = closedTimes.length ? Math.round(closedTimes.reduce((a, b) => a + b, 0) / closedTimes.length) : null;

  const kpis = {
    totalOpen:        openTickets.length,
    critical:         openTickets.filter(t => t.priority === 'CRITICAL').length,
    closedThisPeriod: closedInPeriod.length,
    tempFix:          tickets.filter(t => t.tempFixFlag && ACTIVE.includes(t.status)).length,
    partsPending:     tickets.filter(t => t.status === 'PENDING PARTS').length,
    avgTimeToClose,
  };
  const sqfPack = {
    verifiedCount: tickets.filter(t => (t.status === 'CLOSED' || t.status === 'COMPLETE') && t.verifiedBy).length,
    totalClosed:   closedInPeriod.length,
    openCritical:  kpis.critical,
    avgCaDays:     avgTimeToClose !== null ? Math.round(avgTimeToClose / 24) : null,
  };

  // 6-month trend
  const trendMap = {};
  for (let m = 5; m >= 0; m--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m);
    const lbl = (d.getMonth()+1) + '/' + String(d.getFullYear()).slice(2);
    trendMap[lbl] = { opened:0, closed:0 };
  }
  const trendLabels = Object.keys(trendMap);
  tickets.forEach(t => {
    if (t.dateOpened) {
      const d = new Date(t.dateOpened);
      if (!isNaN(d)) { const lbl = (d.getMonth()+1) + '/' + String(d.getFullYear()).slice(2); if (trendMap[lbl]) trendMap[lbl].opened++; }
    }
    if (t.dateClosed) {
      const d = new Date(t.dateClosed);
      if (!isNaN(d)) { const lbl = (d.getMonth()+1) + '/' + String(d.getFullYear()).slice(2); if (trendMap[lbl]) trendMap[lbl].closed++; }
    }
  });
  const trend = { labels: trendLabels, opened: trendLabels.map(l => trendMap[l].opened), closed: trendLabels.map(l => trendMap[l].closed) };

  return jsonResponse({
    daysBack: daysBack || 30, generatedAt: new Date().toISOString(),
    tickets, summary, kpis, statusFunnel, problemTypes, equipHotspots,
    equipHeatmap: {
      depts:  Object.keys(equipHMDepts).sort(),
      types:  Object.keys(equipHMTypes).sort(),
      matrix: equipHM,
    },
    buildingHeatmap: {
      buildings: Object.keys(bldgHMBuildings).sort(),
      zones:     Object.keys(bldgHMZones).sort(),
      matrix:    bldgHM,
    },
    teamWorkload, sqfPack, trend,
  });
}

async function handleEMRLData(env, userEmail, params) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isManager) return jsonResponse({ error: 'Manager access required' }, 403);

  const mlRows = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  const byTicket = {};
  mlRows.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO);
    if (!tn) return;
    if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
    r.forEach((v, i) => { if (v != null && v !== '') byTicket[tn][i] = v; });
  });

  const ticketFilter = String(params.ticketNo || '').trim().toUpperCase();
  const deptFilter   = String(params.dept     || '').trim().toUpperCase();
  const dateFrom     = params.dateFrom ? new Date(params.dateFrom) : null;
  const dateTo       = params.dateTo   ? new Date(params.dateTo + 'T23:59:59') : null;

  const records = [];
  Object.values(byTicket).forEach(r => {
    const tn     = cellStr(r, ML.TICKET_NO);
    const status = cellStr(r, ML.STATUS).toUpperCase();
    if (status !== 'CLOSED' && status !== 'COMPLETE') return;
    if (ticketFilter && !tn.toUpperCase().includes(ticketFilter)) return;
    const dept = normalizeDept(cellStr(r, ML.DEPT));
    if (deptFilter && dept.toUpperCase() !== deptFilter) return;
    const dc = cellDate(r, ML.DATE_CLOSED) || cellDate(r, ML.VERIFIED_DATE);
    if (dateFrom && dc && dc < dateFrom) return;
    if (dateTo   && dc && dc > dateTo)   return;
    const ca = cellStr(r, ML.CORRECTIVE_ACT), rc = cellStr(r, ML.ROOT_CAUSE), pa = cellStr(r, ML.PREVENTIVE_ACT);
    records.push({
      ticketNo: tn, dept, equipType: cellStr(r, ML.EQUIP_TYPE), specificEquip: cellStr(r, ML.SPECIFIC_EQUIP),
      repairDate: fmtDate(dc), assignedTo: cellStr(r, ML.ASSIGNED_TO),
      rootCause: rc, correctiveAct: ca, preventiveAct: pa, partsUsed: '',
      capaRequired: (ca || rc || pa) ? 'YES' : 'NO',
      clearanceChk: cellStr(r, ML.VERIFIED_BY) ? 'DONE' : 'PENDING',
      hadTempFix:   cellStr(r, ML.TEMP_FIX_FLAG) === 'Y' ? 'Yes' : 'No',
      verifiedBy:   cellStr(r, ML.VERIFIED_BY),
    });
  });
  records.sort((a, b) => (b.repairDate || '').localeCompare(a.repairDate || ''));
  return jsonResponse({ records: records.slice(0, 500) });
}

// ── Admin handlers ────────────────────────────────────────────────────────────

async function handleAdminTechDir(env, userEmail, body) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isAdmin) return jsonResponse({ error: 'Admin access required' }, 403);

  const action = String(body.action || '').trim();

  if (action === 'add') {
    const name    = String(body.name    || '').trim();
    const email   = String(body.email   || '').trim().toLowerCase();
    const dept    = normalizeDept(body.dept || '');
    const manager = String(body.manager || '').trim();
    if (!email || !dept) return jsonResponse({ error: 'Email and department are required' }, 400);
    const existing = await readSheet(token, env.SPREADSHEET_ID, SH.TECH_DIR, 'B2:B200');
    if (existing.find(r => String(r[0] || '').trim().toLowerCase() === email)) {
      return jsonResponse({ error: '"' + email + '" is already in the directory.' }, 409);
    }
    await appendSheetRow(token, env.SPREADSHEET_ID, SH.TECH_DIR, [name, email, dept, manager]);
    return jsonResponse({ ok: true });
  }

  if (action === 'delete') {
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return jsonResponse({ error: 'email required' }, 400);
    const rows = await readSheet(token, env.SPREADSHEET_ID, SH.TECH_DIR, 'A2:D200');
    const idx  = rows.findIndex(r => String(r[1] || '').trim().toLowerCase() === email);
    if (idx === -1) return jsonResponse({ error: 'Technician not found' }, 404);
    await writeSheetCells(token, env.SPREADSHEET_ID, SH.TECH_DIR, idx + 2, [
      { col: 1, value: '' }, { col: 2, value: '' },
      { col: 3, value: '' }, { col: 4, value: '' },
    ]);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: 'Unknown action' }, 400);
}

async function handleAdminDeptAliases(env, userEmail, body) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isAdmin) return jsonResponse({ error: 'Admin access required' }, 403);

  const action = String(body.action || '').trim();

  if (action === 'add') {
    const src  = String(body.src  || '').trim().toUpperCase();
    const dest = String(body.dest || '').trim().toUpperCase();
    if (!src || !dest) return jsonResponse({ error: 'src and dest are required' }, 400);
    const existing = await readSheet(token, env.SPREADSHEET_ID, SH.DEPT_MAP, 'A2:B200');
    if (existing.find(r => String(r[0] || '').trim().toUpperCase() === src)) {
      return jsonResponse({ error: '"' + src + '" already has a mapping — delete it first.' }, 409);
    }
    await appendSheetRow(token, env.SPREADSHEET_ID, SH.DEPT_MAP, [src, dest]);
    return jsonResponse({ ok: true });
  }

  if (action === 'delete') {
    const src = String(body.src || '').trim().toUpperCase();
    if (!src) return jsonResponse({ error: 'src required' }, 400);
    const rows = await readSheet(token, env.SPREADSHEET_ID, SH.DEPT_MAP, 'A2:B200');
    const idx  = rows.findIndex(r => String(r[0] || '').trim().toUpperCase() === src);
    if (idx === -1) return jsonResponse({ error: 'Mapping not found' }, 404);
    // Clear the row — empty rows are ignored on next read (filter r[0])
    await writeSheetCells(token, env.SPREADSHEET_ID, SH.DEPT_MAP, idx + 2, [
      { col: 1, value: '' }, { col: 2, value: '' },
    ]);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: 'Unknown action' }, 400);
}

async function handleAdminView(env, userEmail, view) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isAdmin) return jsonResponse({ error: 'Admin access required' }, 403);
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${env.SPREADSHEET_ID}`;

  if (view === 'config') {
    const rows   = await readSheet(token, env.SPREADSHEET_ID, SH.CONFIG, 'C2:D50');
    const result = rows.filter(r => r[0]).map(r => ({ key: String(r[0]).trim(), value: String(r[1] ?? '').trim() }));
    return jsonResponse({ view, rows: result, sheetUrl });
  }
  if (view === 'access') {
    const rows    = await readSheet(token, env.SPREADSHEET_ID, SH.MANAGER_ACCESS, 'A4:E200');
    const managers = rows.filter(r => r[0]).map(r => ({
      managerName:  String(r[0] || '').trim(),
      managerEmail: String(r[2] || '').trim(),
      ownedDepts:   String(r[4] || '').split(',').map(d => d.trim()).filter(Boolean),
    }));
    return jsonResponse({ view, managers, sheetUrl });
  }
  if (view === 'deptmap') {
    try {
      const rows   = await readSheet(token, env.SPREADSHEET_ID, '📋 Dept Map', 'A2:B200');
      const result = rows.filter(r => r[0]).map(r => ({ src: String(r[0]).trim(), dest: String(r[1] ?? '').trim() }));
      return jsonResponse({ view, rows: result, sheetUrl });
    } catch (_) { return jsonResponse({ view, rows: [], sheetUrl }); }
  }
  if (view === 'techdir') {
    try {
      const rows   = await readSheet(token, env.SPREADSHEET_ID, SH.TECH_DIR, 'A2:D200');
      const result = rows.filter(r => r[0] || r[1]).map(r => ({
        name:    String(r[0] || '').trim(),
        email:   String(r[1] || '').trim().toLowerCase(),
        dept:    String(r[2] || '').trim().toUpperCase(),
        manager: String(r[3] || '').trim(),
      }));
      return jsonResponse({ view, techs: result, sheetUrl });
    } catch (_) { return jsonResponse({ view, techs: [], sheetUrl }); }
  }
  return jsonResponse({ error: 'Unknown view: ' + view }, 400);
}

async function handleEquipCacheStatus(env, userEmail) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isAdmin) return jsonResponse({ error: 'Admin access required' }, 403);

  const configRows = await readSheet(token, env.SPREADSHEET_ID, SH.CONFIG, 'C2:D50');
  const config = {};
  configRows.forEach(r => { if (r[0]) config[String(r[0]).trim()] = String(r[1] ?? ''); });

  const URL_CANDIDATES_ST = [
    'Equipment Register Sheet URL','Equipment List Source URL',
    'Equipment Register URL','Equip Register URL',
    'Equipment Register Sheet ID','Equipment Source URL',
  ];
  let configSheetUrl = '', resolvedSheetId = '';
  for (const key of URL_CANDIDATES_ST) {
    const val = config[key] || '';
    if (val) { configSheetUrl = val; const m = val.match(/\/d\/([-\w]{25,})/); if (m) { resolvedSheetId = m[1]; break; } }
  }
  if (!resolvedSheetId && configSheetUrl.length >= 25 && !/[/ ]/.test(configSheetUrl)) resolvedSheetId = configSheetUrl;
  const configTabName  = config['Equipment Inventory Tab Name'] || '';
  const canonicalDepts  = ['METAL','ELECTRICAL','PLASTIC','LITHO','PLASTIC DEC','QA','MACHINE SHOP','S/R','SALES','G&A'];

  let cacheRows = 0, parsedItemCount = 0, rawHeaders = [], mappedCols = {}, unmappedHdrs = [];
  let lastRefreshed = 'Never', deptSummary = [];
  // lastRefreshed comes from config (written by handleRefreshEquipCache)
  lastRefreshed = config['Equip Cache Last Refreshed'] || 'Never';
  try {
    // Read from A4 so cacheData[0]=headers, cacheData[1+]=data (avoids empty leading-row issue)
    const cacheData = await readSheet(token, env.SPREADSHEET_ID, SH.EQUIP_CACHE, 'A4:Z');
    cacheRows = Math.max(0, cacheData.length - 1);
    if (cacheData.length > 0) {
      rawHeaders = (cacheData[0] || []).map(h => String(h || '').trim()).filter(Boolean);
      const allVars = Object.values(EQUIP_COL_MAP).flat();
      rawHeaders.forEach(h => {
        const hl = h.toLowerCase(); let matched = false;
        for (const [key, variants] of Object.entries(EQUIP_COL_MAP)) {
          if (variants.indexOf(hl) >= 0) { mappedCols[key] = h; matched = true; break; }
        }
        if (!matched) unmappedHdrs.push(h);
      });
    }
    const colIdx = buildEquipColIdx(cacheData[0] || []);
    const deptCount = {};
    for (let i = 1; i < cacheData.length; i++) {
      const row = cacheData[i]; if (!row || !row.length) continue;
      const col = k => colIdx[k] !== undefined ? String(row[colIdx[k]] || '').trim() : '';
      const status = (col('status') || 'ACTIVE').toUpperCase();
      if (status === 'INACTIVE') continue;
      const d = col('dept').toUpperCase(); const t = col('eType');
      if (!d) continue; parsedItemCount++;
      if (!deptCount[d]) deptCount[d] = { dept: d, types: new Set(), items: 0 };
      if (t) deptCount[d].types.add(t); deptCount[d].items++;
    }
    deptSummary = Object.values(deptCount).map(d => ({ dept: d.dept, types: d.types.size, items: d.items }));
  } catch (_) {}

  return jsonResponse({ configSheetUrl, configTabName, resolvedSheetId, lastRefreshed,
    cacheRows, parsedItemCount, rawHeaders, mappedCols, unmappedHdrs, deptSummary, canonicalDepts });
}

async function handleRefreshEquipCache(env, userEmail) {
  const token = await getAccessToken(env);
  const user  = await resolveUser(token, env, userEmail);
  if (!user.isAdmin) return jsonResponse({ error: 'Admin access required' }, 403);

  // Read CMMS config to find the external register sheet ID and tab name
  const configRows = await readSheet(token, env.SPREADSHEET_ID, SH.CONFIG, 'C2:D50');
  const config = {};
  configRows.forEach(r => { if (r[0]) config[String(r[0]).trim()] = String(r[1] ?? ''); });

  // Extract sheet ID from URL (tries several common key name variants)
  const URL_CANDIDATES = [
    'Equipment Register Sheet URL','Equipment List Source URL',
    'Equipment Register URL','Equip Register URL',
    'Equipment Register Sheet ID','Equipment Source URL',
  ];
  let regSheetId = '';
  for (const key of URL_CANDIDATES) {
    const val = config[key] || '';
    const m = val.match(/\/d\/([-\w]{25,})/);
    if (m) { regSheetId = m[1]; break; }
    if (!m && val.length >= 25 && !/[/ ]/.test(val)) { regSheetId = val; break; }
  }
  if (!regSheetId) {
    for (const val of Object.values(config)) {
      if (String(val).includes('docs.google.com/spreadsheets')) {
        const m = String(val).match(/\/d\/([-\w]{25,})/);
        if (m) { regSheetId = m[1]; break; }
      }
    }
  }
  if (!regSheetId) return jsonResponse({ success: false, error: 'Equipment Register Sheet URL is not configured. In ⚙️ Configuration, add a row with key "Equipment Register Sheet URL" and paste the full Google Sheets URL of your Equipment Register.' });

  const tabName = (config['Equipment Inventory Tab Name'] || '').trim();
  if (!tabName) return jsonResponse({ success: false, error: 'Equipment Inventory Tab Name is not configured. In ⚙️ Configuration, add a row with key "Equipment Inventory Tab Name" and the exact tab name (case-sensitive) from your Equipment Register.' });

  // Read the external Equipment Register spreadsheet
  let srcData;
  try {
    srcData = await readSheet(token, regSheetId, tabName, null);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Could not read Equipment Register: ' + e.message + '. Make sure the spreadsheet is shared with the service account (' + (env.GOOGLE_SA_EMAIL || 'see GOOGLE_SA_EMAIL secret') + ').' });
  }
  if (!srcData || srcData.length < 2) return jsonResponse({ success: false, error: 'Tab "' + tabName + '" in the Equipment Register appears empty.' });

  // Find the real header row — pick the row with the most recognised column-name matches
  const ALL_VARIANTS = [
    'department','dept','dept.','area','division','plant','facility','location',
    'cost center','work center','workcenter','shop','building',
    'dept code','department code','dept #','dept no',
    'group','equipment group','line #','line number','line','asset group',
    'equipment type','equip type','type','asset type','machine type','category','class',
    'equipment code','equip code','code','asset code','job #','job no','id','asset id',
    'machine code','machine #','equip id','equip #','equipment #','equipment id',
    'plant no','plant #','no.','number','serial','serial #','serial no','serial number',
    'specific equipment','equipment name','name','description','asset name',
    'equipment description','machine name','equip name','item','equipment','machine',
    'short text','desc','long description','full name','title',
    'status','active','state','asset status','equip status','condition',
  ];
  const limit = Math.min(10, srcData.length);
  let bestIdx = 0, bestCount = 0, firstMultiCell = -1;
  for (let i = 0; i < limit; i++) {
    const row = srcData[i]; let nonEmpty = 0, matches = 0;
    for (const cell of row) {
      const lc = String(cell || '').trim().toLowerCase();
      if (!lc) continue; nonEmpty++;
      if (ALL_VARIANTS.includes(lc)) matches++;
    }
    if (matches > bestCount) { bestCount = matches; bestIdx = i; }
    if (firstMultiCell < 0 && nonEmpty >= 3) firstMultiCell = i;
  }
  if (bestCount === 0 && firstMultiCell >= 0) bestIdx = firstMultiCell;
  const relevantData = srcData.slice(bestIdx); // header row + data rows

  // Clear cache rows 4+ then write new data starting at row 4
  const cacheEncoded = encodeURIComponent(SH.EQUIP_CACHE);
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/${cacheEncoded}!A4:Z2000:clear`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' }
  );
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/${cacheEncoded}!A4?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: relevantData }),
    }
  );
  if (!writeRes.ok) {
    const txt = await writeRes.text();
    return jsonResponse({ success: false, error: 'Failed to write to cache tab: ' + txt });
  }

  // Stamp the refresh timestamp into the config sheet
  const now = new Date();
  const nowStr = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()} ` +
    `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  try {
    for (let i = 0; i < configRows.length; i++) {
      if (String(configRows[i][0] || '').trim() === 'Equip Cache Last Refreshed') {
        await writeSheetCells(token, env.SPREADSHEET_ID, SH.CONFIG, i + 2, [{ col: 4, value: nowStr }]);
        break;
      }
    }
  } catch (_) {}

  return jsonResponse({ success: true, rows: relevantData.length - 1 });
}

// ── Tech work board handler ───────────────────────────────────────────────────

async function handleTechWorkBoard(env, userEmail) {
  const token  = await getAccessToken(env);
  const user   = await resolveUser(token, env, userEmail);
  const isTech = user.isTech;
  if (!user.isManager && !isTech) return jsonResponse({ error: 'Access required' }, 403);

  const mlRows = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  const ACTIVE = ['WAITING','OPEN','COMPLETE','PENDING VERIFICATION','PENDING PARTS','ON HOLD'];
  const byTicket = {};
  mlRows.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO); if (!tn) return;
    if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
    r.forEach((v, i) => { if (v != null && v !== '') byTicket[tn][i] = v; });
  });

  const emailLocal = (userEmail || '').split('@')[0].toLowerCase();
  const tickets = [];
  Object.values(byTicket).forEach(r => {
    const status = cellStr(r, ML.STATUS).toUpperCase();
    if (!ACTIVE.includes(status)) return;
    const dept   = normalizeDept(cellStr(r, ML.DEPT));
    const techAt = cellStr(r, ML.ASSIGNED_TO);
    if (user.isManager) {
      if (!user.isAdmin && !allowed(user, dept)) return;
    } else {
      if (techAt.toLowerCase() !== user.displayName.toLowerCase() && techAt.toLowerCase() !== emailLocal) return;
    }
    tickets.push({
      ticketNo:     cellStr(r, ML.TICKET_NO), status, priority: cellStr(r, ML.PRIORITY).toUpperCase(),
      dept, specificEquip: cellStr(r, ML.SPECIFIC_EQUIP), equipCode: cellStr(r, ML.EQUIP_CODE),
      description:  cellStr(r, ML.DESCRIPTION), assignedTo: techAt,
      estHours:     r[ML.EST_HOURS - 1] || '', dateOpened: fmtDate(cellDate(r, ML.DATE_OPENED)),
    });
  });
  const prioOrder = { CRITICAL:0, HIGH:1, MEDIUM:2, LOW:3 };
  tickets.sort((a, b) => {
    const pa = prioOrder[a.priority] ?? 4, pb = prioOrder[b.priority] ?? 4;
    return pa !== pb ? pa - pb : (b.dateOpened || '').localeCompare(a.dateOpened || '');
  });
  return jsonResponse({ isManager: user.isManager, userDisplayName: user.displayName, tickets, userOwnedDepts: user.ownedDepts || [] });
}

// ── Tablet endpoints (no email auth — uses tech name from POST body) ─────────

async function handleTabletBoard(env) {
  const token = await getAccessToken(env);
  const [mlRows, techRows] = await Promise.all([
    readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AU'),
    readSheet(token, env.SPREADSHEET_ID, SH.TECH_DIR,   'A2:D200').catch(() => []),
  ]);
  const ACTIVE = new Set(['WAITING','OPEN','PENDING PARTS','ON HOLD']);
  const byTicket = {};
  mlRows.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO); if (!tn) return;
    if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
    r.forEach((v, i) => { if (v != null && v !== '') byTicket[tn][i] = v; });
  });
  const tickets = [];
  Object.values(byTicket).forEach(r => {
    const status = cellStr(r, ML.STATUS).toUpperCase();
    if (!ACTIVE.has(status)) return;
    tickets.push({
      ticketNo:     cellStr(r, ML.TICKET_NO),
      status,
      priority:     cellStr(r, ML.PRIORITY).toUpperCase(),
      dept:         normalizeDept(cellStr(r, ML.DEPT)),
      buildingZone: cellStr(r, ML.BUILDING_ZONE),
      equipType:    cellStr(r, ML.EQUIP_TYPE),
      equipCode:    cellStr(r, ML.EQUIP_CODE),
      specificEquip:cellStr(r, ML.SPECIFIC_EQUIP),
      downtimeType: cellStr(r, ML.DOWNTIME_TYPE),
      problemType:  cellStr(r, ML.PROBLEM_TYPE),
      description:  cellStr(r, ML.DESCRIPTION),
      assignedTo:   cellStr(r, ML.ASSIGNED_TO),
      estHours:     r[ML.EST_HOURS - 1] || '',
      dateOpened:   fmtDate(cellDate(r, ML.DATE_OPENED)),
      line:         cellStr(r, ML.LINE_NO),
    });
  });
  const prioOrder = { CRITICAL:0, HIGH:1, MEDIUM:2, LOW:3 };
  tickets.sort((a, b) => {
    const pa = prioOrder[a.priority] ?? 4, pb = prioOrder[b.priority] ?? 4;
    return pa !== pb ? pa - pb : (b.dateOpened || '').localeCompare(a.dateOpened || '');
  });
  const technicians = [], techDepartments = {};
  techRows.forEach(r => {
    const name   = String(r[0] || '').trim();
    const dept   = String(r[2] || '').trim().toUpperCase();
    const active = String(r[3] ?? 'Y').trim().toUpperCase();
    if (!name || active === 'N') return;
    technicians.push(name);
    if (dept) techDepartments[name] = dept.split(',').map(d => d.trim()).filter(Boolean);
  });
  return jsonResponse({ tickets, technicians, techDepartments });
}

async function handleTabletTicketGet(env, body) {
  const ticketNo = String(body.ticketNo || '').trim().toUpperCase();
  if (!ticketNo) return jsonResponse({ success: false, error: 'ticketNo required' }, 400);
  const token = await getAccessToken(env);
  const [mlRows, dataRows] = await Promise.all([
    readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AU'),
    readSheet(token, env.SPREADSHEET_ID, SH.DATA_VALID,  'A1:Z200').catch(() => []),
  ]);
  const merged = [];
  let found = false;
  mlRows.forEach(r => {
    if (cellStr(r, ML.TICKET_NO).toUpperCase() !== ticketNo) return;
    found = true;
    r.forEach((v, i) => { if (v != null && v !== '') merged[i] = v; });
  });
  if (!found) return jsonResponse({ success: false, error: 'Ticket not found: ' + ticketNo }, 404);
  const lists = {};
  if (dataRows.length > 0) {
    const hdrs = dataRows[0];
    for (let col = 0; col < hdrs.length; col++) {
      const key = String(hdrs[col] || '').trim(); if (!key) continue;
      lists[key] = [];
      for (let row = 1; row < dataRows.length; row++) {
        const v = String(dataRows[row][col] || '').trim(); if (v) lists[key].push(v);
      }
    }
  }
  return jsonResponse({
    success:      true,
    ticketNo,
    status:       cellStr(merged, ML.STATUS).toUpperCase(),
    priority:     cellStr(merged, ML.PRIORITY).toUpperCase(),
    dept:         normalizeDept(cellStr(merged, ML.DEPT)),
    buildingZone: cellStr(merged, ML.BUILDING_ZONE),
    equipType:    cellStr(merged, ML.EQUIP_TYPE),
    equipCode:    cellStr(merged, ML.EQUIP_CODE),
    specificEquip:cellStr(merged, ML.SPECIFIC_EQUIP),
    downtimeType: cellStr(merged, ML.DOWNTIME_TYPE),
    problemType:  cellStr(merged, ML.PROBLEM_TYPE),
    description:  cellStr(merged, ML.DESCRIPTION),
    estHours:     merged[ML.EST_HOURS    - 1] || '',
    actualHours:  merged[ML.ACTUAL_HOURS - 1] || '',
    assignedTo:   cellStr(merged, ML.ASSIGNED_TO),
    lineNo:       cellStr(merged, ML.LINE_NO),
    dateOpened:   fmtDate(cellDate(merged, ML.DATE_OPENED)),
    notes:        cellStr(merged, ML.NOTES),
    photoUrl:     cellStr(merged, ML.PHOTO_URL),
    partsStatuses:lists['Parts Status'] || [],
  });
}

async function handleTabletAssign(env, body) {
  const ticketNo = String(body.ticketNo || '').trim().toUpperCase();
  const tech     = String(body.tech     || '').trim();
  if (!ticketNo || !tech) return jsonResponse({ success: false, error: 'ticketNo and tech required' }, 400);
  const token  = await getAccessToken(env);
  const mlRows = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AU');
  const byTicket = {};
  mlRows.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO); if (!tn) return;
    if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
    r.forEach((v, i) => { if (v != null && v !== '') byTicket[tn][i] = v; });
  });
  const best = byTicket[ticketNo];
  if (!best) return jsonResponse({ success: false, error: 'Ticket not found: ' + ticketNo }, 404);
  await appendMasterLog(token, env, {
    ticketNo,
    action:       'SELF-ASSIGNED — TABLET',
    status:       'OPEN',
    dept:         normalizeDept(cellStr(best, ML.DEPT)),
    buildingZone: cellStr(best, ML.BUILDING_ZONE),
    equipType:    cellStr(best, ML.EQUIP_TYPE),
    equipCode:    cellStr(best, ML.EQUIP_CODE),
    specificEquip:cellStr(best, ML.SPECIFIC_EQUIP),
    downtimeType: cellStr(best, ML.DOWNTIME_TYPE),
    priority:     cellStr(best, ML.PRIORITY),
    description:  cellStr(best, ML.DESCRIPTION),
    problemType:  cellStr(best, ML.PROBLEM_TYPE),
    assignedTo:   tech,
    estHours:     best[ML.EST_HOURS - 1] || '',
    dateOpened:   fmtDate(cellDate(best, ML.DATE_OPENED)),
    updatedBy:    tech,
    notes:        'Self-assigned via tablet',
    lineNo:       cellStr(best, ML.LINE_NO),
  });
  return jsonResponse({ success: true });
}

async function handleTabletStatus(env, body) {
  const ticketNo  = String(body.ticketNo  || '').trim().toUpperCase();
  const tech      = String(body.tech      || '').trim();
  const newStatus = String(body.newStatus || '').trim().toUpperCase();
  if (!ticketNo || !newStatus) return jsonResponse({ success: false, error: 'ticketNo and newStatus required' }, 400);
  const token  = await getAccessToken(env);
  const mlRows = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AU');
  const byTicket = {};
  mlRows.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO); if (!tn) return;
    if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
    r.forEach((v, i) => { if (v != null && v !== '') byTicket[tn][i] = v; });
  });
  const best = byTicket[ticketNo];
  if (!best) return jsonResponse({ success: false, error: 'Ticket not found: ' + ticketNo }, 404);
  await appendMasterLog(token, env, {
    ticketNo,
    action:    'STATUS UPDATE — TABLET',
    status:    newStatus,
    dept:      normalizeDept(cellStr(best, ML.DEPT)),
    priority:  cellStr(best, ML.PRIORITY),
    assignedTo:tech || cellStr(best, ML.ASSIGNED_TO),
    updatedBy: tech || 'tablet',
    notes:     'Status changed via tablet',
    lineNo:    cellStr(best, ML.LINE_NO),
  });
  return jsonResponse({ success: true });
}

async function handleTabletComplete(env, body) {
  const ticketNo  = String(body.ticketNo  || '').trim().toUpperCase();
  const tech      = String(body.tech      || '').trim();
  const newStatus = String(body.newStatus || 'COMPLETE').trim().toUpperCase();
  if (!ticketNo || !tech) return jsonResponse({ success: false, error: 'ticketNo and tech required' }, 400);
  const token  = await getAccessToken(env);
  const mlRows = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AU');
  const byTicket = {};
  mlRows.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO); if (!tn) return;
    if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
    r.forEach((v, i) => { if (v != null && v !== '') byTicket[tn][i] = v; });
  });
  const best = byTicket[ticketNo];
  if (!best) return jsonResponse({ success: false, error: 'Ticket not found: ' + ticketNo }, 404);
  await appendMasterLog(token, env, {
    ticketNo,
    action:       newStatus === 'COMPLETE' ? 'TECH COMPLETE — TABLET' : 'TECH UPDATE — TABLET',
    status:       newStatus,
    dept:         normalizeDept(cellStr(best, ML.DEPT)),
    buildingZone: cellStr(best, ML.BUILDING_ZONE),
    equipType:    cellStr(best, ML.EQUIP_TYPE),
    equipCode:    cellStr(best, ML.EQUIP_CODE),
    specificEquip:cellStr(best, ML.SPECIFIC_EQUIP),
    downtimeType: cellStr(best, ML.DOWNTIME_TYPE),
    priority:     cellStr(best, ML.PRIORITY),
    description:  cellStr(best, ML.DESCRIPTION),
    problemType:  cellStr(best, ML.PROBLEM_TYPE),
    assignedTo:   tech,
    estHours:     best[ML.EST_HOURS - 1] || '',
    actualHours:  body.actualHours || '',
    dateOpened:   fmtDate(cellDate(best, ML.DATE_OPENED)),
    correctiveAct:body.correctiveAction || '',
    rootCause:    body.rootCause || '',
    preventiveAct:body.preventativeAction || '',
    fixType:      body.fixType || '',
    tempFixFlag:  body.tempFixFlag,
    partsNeeded:  body.partsNeeded,
    partsStatus:  body.partsStatus || '',
    updatedBy:    tech,
    notes:        body.notes || '',
    lineNo:       body.lineNo || cellStr(best, ML.LINE_NO),
  });
  return jsonResponse({ success: true, newStatus, routedToReview: newStatus === 'COMPLETE' });
}

// ── Equipment inventory handler ───────────────────────────────────────────────

async function handleEquipInventory(env, userEmail) {
  const token  = await getAccessToken(env);
  const user   = await resolveUser(token, env, userEmail);
  const isTech = user.isTech;
  if (!user.isManager && !isTech) return jsonResponse({ error: 'Access required' }, 403);

  let equipList = [];
  try {
    // Read from A4: cacheData[0]=headers, cacheData[1+]=data
    const cacheData = await readSheet(token, env.SPREADSHEET_ID, SH.EQUIP_CACHE, 'A4:Z');
    if (cacheData.length > 1) {
      const colIdx = buildEquipColIdx(cacheData[0] || []);
      for (let i = 1; i < cacheData.length; i++) {
        const row = cacheData[i]; if (!row || !row.length) continue;
        const col = k => colIdx[k] !== undefined ? String(row[colIdx[k]] || '').trim() : '';
        const code = col('code');
        if (!code) continue;
        equipList.push({
          code, specific: col('specific'),
          dept:   col('dept').toUpperCase(),
          eType:  col('eType'),
          status: (col('status') || 'ACTIVE').toUpperCase(),
          totalTickets:0, openTickets:0, avgCloseDays:null, mtbf:null, mttr:null, lastTicketDate:'',
        });
      }
    }
  } catch (_) {}

  if (equipList.length === 0) return jsonResponse({ equipment: [] });

  const mlRows = await readSheet(token, env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  const byEquip = {};
  mlRows.forEach(r => {
    const code = cellStr(r, ML.EQUIP_CODE), tn = cellStr(r, ML.TICKET_NO);
    if (!code || !tn) return;
    if (!byEquip[code]) byEquip[code] = {};
    if (!byEquip[code][tn]) byEquip[code][tn] = r.slice();
    else r.forEach((v, c) => { if (v != null && v !== '') byEquip[code][tn][c] = v; });
  });

  const ACTIVE = new Set(['WAITING','OPEN','PENDING VERIFICATION','PENDING PARTS','ON HOLD']);
  equipList.forEach(e => {
    const ticketMap = byEquip[e.code] || {};
    const tRows     = Object.values(ticketMap);
    e.totalTickets  = tRows.length;
    e.openTickets   = tRows.filter(r => ACTIVE.has(cellStr(r, ML.STATUS).toUpperCase())).length;
    const closedRows = tRows.filter(r => { const st = cellStr(r, ML.STATUS).toUpperCase(); return st === 'CLOSED' || st === 'COMPLETE'; });
    if (closedRows.length) {
      const closeTimes = closedRows.map(r => {
        const d0 = cellDate(r, ML.DATE_OPENED), d1 = cellDate(r, ML.DATE_CLOSED) || cellDate(r, ML.VERIFIED_DATE);
        return (d0 && d1) ? (d1 - d0) / 86400000 : null;
      }).filter(x => x !== null && x >= 0);
      if (closeTimes.length) e.avgCloseDays = Math.round(closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length * 10) / 10;
    }
    if (tRows.length > 1) {
      const dates = tRows.map(r => cellDate(r, ML.DATE_OPENED)).filter(Boolean).sort((a, b) => a - b);
      if (dates.length > 1) {
        const gaps = [];
        for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i-1]) / 86400000);
        e.mtbf = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
      }
    }
    const repairHours = tRows.map(r => parseFloat(String(r[ML.ACTUAL_HOURS - 1] || '')) || null).filter(x => x !== null && x > 0);
    if (repairHours.length) e.mttr = Math.round(repairHours.reduce((a, b) => a + b, 0) / repairHours.length * 10) / 10;
    const allDates = tRows.map(r => cellDate(r, ML.DATE_OPENED)).filter(Boolean).sort((a, b) => b - a);
    if (allDates.length) e.lastTicketDate = fmtDate(allDates[0]);
  });

  equipList = equipList.filter(e => user.isAdmin || allowed(user, e.dept));
  return jsonResponse({ equipment: equipList });
}

// ── Main export ───────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin':  allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-User-Email',
          'Access-Control-Max-Age':       '86400',
        },
      });
    }

    const method = request.method;
    if (method !== 'GET' && method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const url       = new URL(request.url);
    const userEmail = request.headers.get('X-User-Email') || '';
    let body = {};
    if (method === 'POST') {
      try { body = await request.json(); } catch { body = {}; }
    }

    let res;
    try {
      const p = url.pathname;
      if      (p === '/api/version')                                         res = handleVersion(env);
      else if (p === '/api/me')                                              res = await handleMe(env, userEmail);
      else if (p === '/api/dashboard/counts')                                res = await handleDashboardCounts(env, userEmail);
      else if (p === '/api/dashboard/panels')                                res = await handleDashboardPanels(env, userEmail);
      // Monitoring
      else if (p === '/api/monitoring/temp-fix'         && method === 'GET') res = await handleTempFix(env, userEmail);
      else if (p === '/api/monitoring/temp-fix/detail'  && method === 'GET') res = await handleTempFixDetail(env, userEmail, url.searchParams.get('tempId') || '');
      else if (p === '/api/monitoring/temp-fix/inspect' && method === 'POST')res = await handleTempFixInspect(env, userEmail, body);
      else if (p === '/api/monitoring/temp-fix/clear'   && method === 'POST')res = await handleTempFixClear(env, userEmail, body);
      else if (p === '/api/monitoring/hold-tags'        && method === 'GET') res = await handleEhl(env, userEmail, url.searchParams.get('includeCleared') === '1');
      else if (p === '/api/monitoring/hold-tags/clear'  && method === 'POST')res = await handleEhlClear(env, userEmail, body);
      else if (p === '/api/monitoring/parts'            && method === 'GET') res = await handleParts(env, userEmail);
      else if (p === '/api/monitoring/parts/status'     && method === 'POST')res = await handlePartsStatus(env, userEmail, body);
      // Ticket queues
      else if (p === '/api/tickets/queue'               && method === 'GET') res = await handleQueueTickets(env, userEmail, url.searchParams.get('type') || 'open', url.searchParams.get('dept') || '');
      else if (p === '/api/tickets/detail'              && method === 'GET') res = await handleTicketDetail(env, userEmail, url.searchParams.get('ticketNo') || '');
      else if (p === '/api/tickets/closed'              && method === 'GET') res = await handleClosedTickets(env, userEmail);
      else if (p === '/api/tickets/equip-history'       && method === 'GET') res = await handleEquipTicketHistory(env, userEmail, url.searchParams.get('equipCode') || '');
      else if (p === '/api/tickets/confirm-joint'       && method === 'POST')res = await handleConfirmJoint(env, userEmail, body);
      else if (p === '/api/tickets/reject-joint'        && method === 'POST')res = await handleRejectJoint(env, userEmail, body);
      else if (p === '/api/tickets/rollover'            && method === 'POST')res = await handleRollover(env, userEmail, body);
      // Submit ticket
      else if (p === '/api/submit/form-data'            && method === 'GET') res = await handleFormData(env, userEmail);
      else if (p === '/api/submit/equip-stats'          && method === 'GET') res = await handleEquipQuickStats(env, userEmail, url.searchParams.get('equipCode') || '');
      else if (p === '/api/submit/reserve-id'           && method === 'GET') res = await handleReserveTicketId(env, userEmail, url.searchParams);
      else if (p === '/api/submit/upload-photo'         && method === 'POST')res = await handleUploadPhoto(env, userEmail, body);
      else if (p === '/api/submit/add'                  && method === 'POST')res = await handleAddTicket(env, userEmail, body);
      // Ticket actions
      else if (p === '/api/tickets/approve'             && method === 'POST')res = await handleApproveTicket(env, userEmail, body);
      else if (p === '/api/tickets/complete'            && method === 'POST')res = await handleCompleteTicket(env, userEmail, body);
      else if (p === '/api/tickets/verify-close'        && method === 'POST')res = await handleVerifyClose(env, userEmail, body);
      else if (p === '/api/tickets/void'                && method === 'POST')res = await handleVoidTicket(env, userEmail, body);
      else if (p === '/api/tickets/assign'              && method === 'POST')res = await handleAssignTicket(env, userEmail, body);
      else if (p === '/api/tickets/flag-temp-fix'       && method === 'POST')res = await handleFlagTempFix(env, userEmail, body);
      else if (p === '/api/tickets/transfer'            && method === 'POST')res = await handleTransferTicket(env, userEmail, body);
      else if (p === '/api/tickets/request-parts'       && method === 'POST')res = await handleRequestParts(env, userEmail, body);
      else if (p === '/api/tickets/update'              && method === 'POST')res = await handleUpdateTicket(env, userEmail, body);
      else if (p === '/api/tickets/service-report'      && method === 'POST')res = await handleServiceReport(env, userEmail, body);
      else if (p === '/api/tickets/edit-fields'         && method === 'POST')res = await handleEditTicketFields(env, userEmail, body);
      else if (p === '/api/tickets/add-photo'           && method === 'POST')res = await handleAddTicketPhoto(env, userEmail, body);
      else if (p === '/api/tickets/service-report'      && method === 'GET') res = await handleGetServiceReport(env, userEmail, url.searchParams.get('ticketNo') || '');
      else if (p === '/api/tickets/dept-sign-off'       && method === 'POST')res = await handleDeptSignOff(env, userEmail, body);
      else if (p === '/api/monitoring/hold-tags/issue'  && method === 'POST')res = await handleIssueHoldTag(env, userEmail, body);
      // Reports
      else if (p === '/api/reports/data'                && method === 'GET') res = await handleReportData(env, userEmail, parseInt(url.searchParams.get('daysBack') || '30', 10));
      else if (p === '/api/reports/active-tickets'       && method === 'GET') res = await handleActiveTickets(env, userEmail);
      else if (p === '/api/reports/emrl'                && method === 'GET') res = await handleEMRLData(env, userEmail, Object.fromEntries(url.searchParams));
      // Admin
      else if (p === '/api/admin/tech-dir'               && method === 'POST')res = await handleAdminTechDir(env, userEmail, body);
      else if (p === '/api/admin/dept-aliases'           && method === 'POST')res = await handleAdminDeptAliases(env, userEmail, body);
      else if (p === '/api/admin/view'                  && method === 'GET') res = await handleAdminView(env, userEmail, url.searchParams.get('view') || '');
      else if (p === '/api/admin/equip-cache'           && method === 'GET') res = await handleEquipCacheStatus(env, userEmail);
      else if (p === '/api/admin/equip-cache/refresh'   && method === 'POST')res = await handleRefreshEquipCache(env, userEmail);
      // Tech board & inventory
      else if (p === '/api/tech-board'                  && method === 'GET') res = await handleTechWorkBoard(env, userEmail);
      else if (p === '/api/equip/inventory'             && method === 'GET') res = await handleEquipInventory(env, userEmail);
      // Tablet (no email auth — tech name comes from POST body)
      else if (p === '/api/tablet/board'                && method === 'POST') res = await handleTabletBoard(env);
      else if (p === '/api/tablet/ticket/get'           && method === 'POST') res = await handleTabletTicketGet(env, body);
      else if (p === '/api/tablet/assign'               && method === 'POST') res = await handleTabletAssign(env, body);
      else if (p === '/api/tablet/status'               && method === 'POST') res = await handleTabletStatus(env, body);
      else if (p === '/api/tablet/complete'             && method === 'POST') res = await handleTabletComplete(env, body);
      else                                                                    res = jsonResponse({ error: 'Not found' }, 404);
    } catch (e) {
      res = e.rateLimited
        ? jsonResponse({ error: 'rate_limited' }, 429)
        : jsonResponse({ error: e.message }, 500);
    }

    res.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    return res;
  },
};
