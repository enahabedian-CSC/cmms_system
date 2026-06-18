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
//
// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
//   GET  /api/version            — app version
//   GET  /api/me                 — current user identity + doc control
//   GET  /api/dashboard/counts   — home KPI counts
//   GET  /api/dashboard/panels   — home attention panels
//   POST /api/rpc  { fn, args }  — google.script.run bridge for every screen.
//                                  READ functions are served; WRITE functions
//                                  fail safe (production sheet is not mutated by
//                                  this read-only deployment).
// ─────────────────────────────────────────────────────────────────────────────

// ── Column indices (1-based, matching backend/Config.gs) ─────────────────────

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
};
const ML_COLS = 43; // A:AQ

const TH = { HIST_ID:1, TICKET_NO:2, TIMESTAMP:3, EVENT_TYPE:4, STATUS_FROM:5, STATUS_TO:6, PERFORMED_BY:7, NOTES:8 };

const TF = {
  TEMP_ID:1, TICKET_NO:2, EQUIP_CODE:3, SPECIFIC_EQUIP:4,
  DEPT:5, BUILDING_ZONE:6, DATE_FLAGGED:7, DESCRIPTION:8,
  TEMP_FIX_DESC:9, FREQ_DAYS:10, LAST_INSPECTED:11, NEXT_DUE:12,
  STATUS:13, FLAGGED_BY:14, CLEARED_BY:15, CLEARED_DATE:16, NOTES:17,
  REASON_TEMPORARY:18, PERM_FIX_PLAN:19, EXPECTED_COMPLETION:20,
  NO_IMPROVISED:21, PRODUCT_RISK_OK:22,
};
const TF_COLS = 22; // A:V

const PN = {
  PART_ID:1, PART_DESC:2, TICKET_NO:3, EQUIP_CODE:4,
  SPECIFIC_EQUIP:5, DEPT:6, DATE_REQUESTED:7, PARTS_STATUS:8,
  DATE_ORDERED:9, DATE_RECEIVED:10, ORDERED_BY:11, NOTES:12,
};
const PN_COLS = 12; // A:L

const EHL = {
  TAG_ID:1, TICKET_NO:2, EQUIP_CODE:3, SPECIFIC_EQUIP:4,
  DEPT:5, BUILDING_ZONE:6, TAG_TYPE:7, DATE_TAGGED:8,
  TAGGED_BY:9, REASON:10, EQUIP_STATUS:11, CLEARED_BY:12,
  CLEARED_DATE:13, NOTES:14,
};
const EHL_COLS = 14; // A:N

// Closed Tickets — CS_ 29-col layout (backend/Config.gs CS)
const CS = {
  ROW_MARKER:1, TICKET_NO:2, STATUS:3, PRIORITY:4,
  DEPT:5, BUILDING_ZONE:6, EQUIP_TYPE:7, EQUIP_CODE:8,
  SPECIFIC_EQUIP:9, DOWNTIME_TYPE:10, ADDED_BY:11, DATE_OPENED:12,
  PROBLEM_TYPE:13, DESCRIPTION:14, LINE_NO:15, EST_HOURS:16,
  ACTUAL_HOURS:17, REPAIR_COMPLETE:18, COMPLETED_BY:19, REPAIR_DATE:20,
  PARTS_USED:21, CORRECTIVE:22, CAPA_REQ:23, ROOT_CAUSE:24,
  PREVENTIVE:25, CHECKLIST:26, VERIFIED_BY:27, VERIFIED_DATE:28, NOTES:29,
};
const CS_COLS = 29;
const QUEUE_FROZEN = 6; // Closed Tickets data starts at row 7

const HIST_HEADER_ROW = 5; // Temp Fix / Parts / Hold log: data starts at row 6

// Sheet tab names (exact match to backend/Config.gs SH object)
const SH = {
  MASTER_LOG:     '🗄️ Master Log',
  TICKET_HIST:    '📜 Ticket History',
  TEMP_FIX:       '🔧 Temp Fix Monitor',
  PARTS_NEEDED:   '🔩 Parts Needed',
  EQUIP_HOLD_LOG: '🏷️ Equipment Hold Log',
  MANAGER_ACCESS: '👔 Manager Access',
  CONFIG:         '⚙️ Configuration',
  DEPT_MAP:       '📋 Dept Map',
  DATA_VALID:     '📋 Data Lists',
  TECH_DIR:       '👷 Tech Directory',
  EQUIP_CACHE:    '⚙️ Equip Inventory Cache',
  EQUIP_INV:      '⚙️ Equipment Inventory',
  CLOSED:         '✅ Closed Tickets',
};

// Canonical departments + tracker sheet names (backend/Config.gs DEPT_TRACKERS)
const DEPT_TRACKERS = [
  { dept: 'ELECTRICAL' }, { dept: 'MACHINE SHOP' }, { dept: 'FACILITIES' },
  { dept: 'PLASTICS' },   { dept: 'METALS' },       { dept: 'LITHO' },
];
const ALL_DEPTS = DEPT_TRACKERS.map(d => d.dept);

const MANAGER_VERIFIED_ACTION = 'MANAGER VERIFIED — CLOSED';

// ── Cell / date helpers ──────────────────────────────────────────────────────

function cellStr(row, colOneBased) {
  const v = row[colOneBased - 1];
  return v != null ? String(v).trim() : '';
}

// Google Sheets UNFORMATTED_VALUE returns dates as serial numbers (days since
// Dec 30, 1899). The serial encodes wall-clock time, so we read it back with
// UTC getters (Workers run in UTC) to avoid any timezone drift.
function toDate(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && v > 1) return new Date(Math.round((v - 25569) * 86400000));
  const d = new Date(String(v));
  return isNaN(d) ? null : d;
}
function cellDate(row, colOneBased) { return toDate(row[colOneBased - 1]); }

const _p2 = n => String(n).padStart(2, '0');
function fmtDate(d) {
  if (!d) return '';
  return `${_p2(d.getUTCMonth() + 1)}/${_p2(d.getUTCDate())}/${d.getUTCFullYear()}`;
}
function fmtTs(d) {
  if (!d) return '';
  return `${_p2(d.getUTCMonth() + 1)}/${_p2(d.getUTCDate())}/${d.getUTCFullYear()} ${_p2(d.getUTCHours())}:${_p2(d.getUTCMinutes())}`;
}
// fmtDate from a raw cell value
function fmtCellDate(row, colOneBased) { return fmtDate(cellDate(row, colOneBased)); }

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
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
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
  const b64 = pem.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
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
  if (res.status === 400) return []; // missing tab / bad range → treat as empty
  if (!res.ok) throw new Error(`Sheets API error (${sheetName}): ${await res.text()}`);
  return (await res.json()).values || [];
}

// ── Config / dept-map / data-list readers (backend/Config.gs) ────────────────

async function getConfigMap(token, env) {
  const rows = await readSheet(token, env.SPREADSHEET_ID, SH.CONFIG, 'C2:D50');
  const cfg = {};
  rows.forEach(r => { if (r[0]) cfg[String(r[0]).trim()] = r[1]; });
  return cfg;
}
function configValue(cfg, key) {
  const v = cfg[key];
  return v != null ? String(v) : '';
}

async function getDeptMapping(token, env) {
  const map = {
    'ELECTRICAL': 'ELECTRICAL', 'FACILITIES': 'FACILITIES', 'LITHO': 'LITHO',
    'MACHINE SHOP': 'MACHINE SHOP', 'METALS': 'METALS', 'PLASTICS': 'PLASTICS',
    'FACILTIIES': 'FACILITIES',
  };
  const rows = await readSheet(token, env.SPREADSHEET_ID, SH.DEPT_MAP, 'A2:B');
  rows.forEach(r => {
    const src  = String(r[0] || '').trim().toUpperCase();
    const dest = String(r[1] || '').trim().toUpperCase();
    if (src && dest) map[src] = dest;
  });
  return map;
}
function normalizeDept(raw, map) {
  const d = String(raw || '').trim().toUpperCase();
  return (map && map[d]) || d;
}

async function getAllDataLists(token, env) {
  const rows = await readSheet(token, env.SPREADSHEET_ID, SH.DATA_VALID);
  if (!rows.length) return {};
  const hdrs = rows[0];
  const lists = {};
  hdrs.forEach((h, col) => {
    const key = String(h || '').trim();
    if (!key) return;
    lists[key] = rows.slice(1)
      .map(r => String(r[col] != null ? r[col] : '').trim())
      .filter(v => v !== '');
  });
  return lists;
}

// ── Equipment register (backend/EquipRegistry.gs) ────────────────────────────

const _EQUIP_COL_MAPPINGS_ = {
  dept:     ['department','dept','dept.','department name','dept name','area','division','plant','facility','location','cost center','work center','workcenter','shop','building'],
  deptCode: ['dept code','department code','dept #','dept no','dept no.','dept number','department #'],
  group:    ['group','equipment group','line #','line#','line number','line','asset group','sub-type','subtype','sub type'],
  eType:    ['equipment type','equip type','type','asset type','machine type','category','class','equipment class','asset class','object type','machine class'],
  code:     ['equipment code','equip code','code','asset code','job #','job no','job no.','job number','id','asset id','asset #','asset no','asset no.','asset number','machine code','machine #','machine id','machine no','machine no.','equip id','equip #','equip no','equip no.','equip number','equipment #','equipment id','equipment no','equipment no.','equipment number','plant no','plant #','plant no.','no.','number','serial','serial #','serial no','serial number'],
  specific: ['specific equipment','equipment name','name','description','asset name','equipment description','machine name','equip name','item','item name','equipment','machine','asset description','short text','desc','long description','full name','title'],
  status:   ['status','active','state','asset status','equip status','condition','in service','active/inactive'],
};
function buildEquipColMap(lowerHeaders) {
  const colMap = {};
  Object.keys(_EQUIP_COL_MAPPINGS_).forEach(key => {
    const variants = _EQUIP_COL_MAPPINGS_[key];
    for (let i = 0; i < lowerHeaders.length; i++) {
      if (variants.indexOf(lowerHeaders[i]) >= 0) { colMap[key] = i; break; }
    }
  });
  return colMap;
}

async function getEquipmentFromInventory(token, env) {
  // Prefer the cache tab (headers row 4, data row 5+, flexible columns).
  const cache = await readSheet(token, env.SPREADSHEET_ID, SH.EQUIP_CACHE);
  if (cache.length > 4) {
    const headers = (cache[3] || []).map(h => String(h || '').trim().toLowerCase());
    const colMap = buildEquipColMap(headers);
    const items = cache.slice(4).filter(r => {
      const stat = colMap.status !== undefined ? String(r[colMap.status] || '').trim().toUpperCase() : 'ACTIVE';
      if (stat === 'INACTIVE') return false;
      if (colMap.code !== undefined || colMap.specific !== undefined) {
        const code = colMap.code     !== undefined ? String(r[colMap.code]     || '').trim() : '';
        const spec = colMap.specific !== undefined ? String(r[colMap.specific] || '').trim() : '';
        return !!(code || spec);
      }
      return r.some(cell => String(cell || '').trim() !== '');
    }).map(r => {
      const col = k => (colMap[k] !== undefined ? String(r[colMap[k]] || '').trim() : '');
      return {
        dept:     col('dept')  || 'UNASSIGNED',
        deptCode: col('deptCode'),
        group:    col('group'),
        eType:    col('eType') || 'GENERAL',
        code:     col('code'),
        specific: col('specific'),
        status:   col('status') || 'ACTIVE',
      };
    });
    if (items.length > 0) return items;
  }
  // Fallback: local Equipment Inventory tab (cols A-F).
  const local = await readSheet(token, env.SPREADSHEET_ID, SH.EQUIP_INV, 'A2:F');
  return local.filter(r => {
    const code = String(r[3] || '').trim();
    const spec = String(r[4] || '').trim();
    const stat = String(r[5] || '').trim().toUpperCase();
    return (code || spec) && stat !== 'INACTIVE';
  }).map(r => ({
    dept:     String(r[0] || '').trim() || 'UNASSIGNED',
    group:    String(r[1] || '').trim(),
    eType:    String(r[2] || '').trim() || 'GENERAL',
    code:     String(r[3] || '').trim(),
    specific: String(r[4] || '').trim(),
    status:   String(r[5] || '').trim() || 'ACTIVE',
  }));
}

async function getEquipmentHierarchy(token, env, deptMap) {
  const equip = await getEquipmentFromInventory(token, env);
  const hierarchy = {};
  equip.forEach(e => {
    const dept  = normalizeDept(e.dept, deptMap) || 'UNASSIGNED';
    const eType = e.eType || 'GENERAL';
    if (!hierarchy[dept]) hierarchy[dept] = {};
    if (!hierarchy[dept][eType]) hierarchy[dept][eType] = [];
    hierarchy[dept][eType].push(e);
  });
  return hierarchy;
}

// ── Manager access / techs / people (backend/Config.gs) ──────────────────────

async function getManagerConfig(token, env, deptMap) {
  const rows = await readSheet(token, env.SPREADSHEET_ID, SH.MANAGER_ACCESS, 'A4:E200');
  const mgrs = [];
  rows.forEach(r => {
    const name  = String(r[0] || '').trim();
    const email = String(r[2] || '').trim().toLowerCase();
    if (!name && !email) return;
    const normDepts = String(r[4] || '').split(',')
      .map(d => normalizeDept(d.trim(), deptMap)).filter(d => d !== '');
    mgrs.push({ managerName: name, managerEmail: email, teamEmails: String(r[3] || '').trim(), ownedDepts: normDepts });
  });
  return mgrs;
}

async function getTechDirectory(token, env, deptMap) {
  const td = await readSheet(token, env.SPREADSHEET_ID, SH.TECH_DIR, 'A2:D');
  if (td.length) {
    return td.filter(r => String(r[0] || '').trim() !== '' &&
        String(r[3] !== undefined ? r[3] : 'Y').trim().toUpperCase() !== 'N')
      .map(r => ({ name: String(r[0] || '').trim(), email: String(r[1] || '').trim().toLowerCase(),
                   dept: normalizeDept(String(r[2] || '').trim(), deptMap), active: true }));
  }
  // Fallback: flat Technicians column in Data Lists
  const lists = await getAllDataLists(token, env);
  return (lists['Technicians'] || []).map(name => ({ name, email: '', dept: '', active: true }));
}

async function getTechsForDept(token, env, deptMap, dept) {
  const norm = normalizeDept(dept || '', deptMap);
  const all  = await getTechDirectory(token, env, deptMap);
  const hasDeptData = all.some(t => t.dept !== '');
  if (hasDeptData && norm) {
    const filtered = all.filter(t => t.dept === norm);
    return (filtered.length > 0 ? filtered : all).map(t => t.name);
  }
  return all.map(t => t.name);
}

async function getPeopleList(token, env, deptMap) {
  const lists = await getAllDataLists(token, env);
  const techs = lists['Technicians'] || [];
  const techSet = {};
  techs.forEach(t => { techSet[t.toLowerCase().trim()] = true; });
  const result = techs.slice();
  const mgrs = await getManagerConfig(token, env, deptMap);
  mgrs.forEach(m => {
    const name = (m.managerName || '').trim();
    if (name && !techSet[name.toLowerCase().trim()]) result.push(name);
  });
  return result;
}

// ── User / role resolution ────────────────────────────────────────────────────

async function resolveUser(token, env, userEmail) {
  const email = (userEmail || '').trim().toLowerCase();

  const [configRows, managerRows] = await Promise.all([
    readSheet(token, env.SPREADSHEET_ID, SH.CONFIG, 'C2:D50'),
    readSheet(token, env.SPREADSHEET_ID, SH.MANAGER_ACCESS, 'A4:E200'),
  ]);

  const config = {};
  configRows.forEach(r => { if (r[0]) config[String(r[0]).trim()] = r[1]; });

  const adminEmails = String(config['System Admins'] || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

  const isAdmin = adminEmails.includes(email);
  let isManager = isAdmin, ownedDepts = [], displayName = '';

  managerRows.forEach(r => {
    if (String(r[2] || '').trim().toLowerCase() !== email) return;
    isManager   = true;
    displayName = String(r[0] || '').trim();
    ownedDepts  = String(r[4] || '').split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
  });

  const domain     = email.split('@')[1] || '';
  const isCorpUser = domain === 'cscmfg.com';
  const role = isAdmin ? 'admin' : (isManager ? 'manager' : (isCorpUser ? 'tech' : 'noaccess'));

  if (isAdmin) ownedDepts = ALL_DEPTS.slice();

  if (!displayName) {
    displayName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  return { email, isAdmin, isManager: isManager || isAdmin, ownedDepts, displayName, role };
}

function allowed(user, dept) {
  return user.isAdmin || user.ownedDepts.includes(String(dept).toUpperCase().trim());
}
function requireTech(user)    { if (user.role === 'noaccess') throw new Error('UNAUTHORIZED'); }
function requireManager(user) { if (!user.isManager) throw new Error('Manager access required'); }
function requireAdmin(user)   { if (!user.isAdmin) throw new Error('Admin access required'); }

// ── Original GET handlers (unchanged behaviour) ──────────────────────────────

function handleVersion(env) {
  return jsonResponse({ version: env.APP_VERSION || '2.5' });
}

async function handleMe(env, userEmail) {
  const token = await getAccessToken(env);

  const [configRows, managerRows] = await Promise.all([
    readSheet(token, env.SPREADSHEET_ID, SH.CONFIG, 'C2:D50'),
    readSheet(token, env.SPREADSHEET_ID, SH.MANAGER_ACCESS, 'A4:E200'),
  ]);

  const config = {};
  configRows.forEach(r => { if (r[0]) config[String(r[0]).trim()] = String(r[1] ?? ''); });

  const email = (userEmail || '').trim().toLowerCase();
  const adminEmails = String(config['System Admins'] || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const isAdmin = adminEmails.includes(email);

  let isManager = isAdmin, ownedDepts = [], displayName = '', teamEmails = '';

  managerRows.forEach(r => {
    if (String(r[2] || '').trim().toLowerCase() !== email) return;
    isManager   = true;
    displayName = String(r[0] || '').trim();
    teamEmails  = String(r[3] || '').trim();
    ownedDepts  = String(r[4] || '').split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
  });

  const domain     = email.split('@')[1] || '';
  const isCorpUser = domain.toLowerCase() === 'cscmfg.com';
  const role = isAdmin ? 'admin' : isManager ? 'manager' : isCorpUser ? 'tech' : 'noaccess';

  if (isAdmin) ownedDepts = ALL_DEPTS.slice();

  if (!displayName) {
    displayName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  const initials = displayName.trim().split(/\s+/)
    .map(w => w[0] || '').join('').substring(0, 2).toUpperCase() || '?';

  const user = { email, displayName, initials, role, isAdmin, isManager: isManager || isAdmin, ownedDepts, teamEmails };

  function pick(noKey, revKey, dateKey, dNo, dRev, dDate) {
    return {
      no:   config[noKey] || dNo,
      rev:  String(config[revKey] != null && config[revKey] !== '' ? config[revKey]
              : (config['Revision'] != null && config['Revision'] !== '' ? config['Revision'] : dRev)),
      date: config[dateKey] || dDate,
    };
  }
  const docControl = {
    serviceReport: pick('Doc No (Service Report)', 'Rev (Service Report)', 'Rev Date (Service Report)', 'FRM-030-003', '0', '6/5/2026'),
    repairLog:     pick('Doc No (Repair Log)',     'Rev (Repair Log)',     'Rev Date (Repair Log)',     'FRM-030-002', '0', '6/5/2026'),
    holdTag:       pick('Doc No (Hold Tag)',        'Rev (Hold Tag)',        'Rev Date (Hold Tag)',        'FRM-029-002', '0', '6/15/26'),
    ncrRegister:   pick('Doc No (NCR Register)',    'Rev (NCR Register)',    'Rev Date (NCR Register)',    'FRM-029-001', '0', ''),
    ticketForm:    pick('Doc No (Ticket Form)',     'Rev (Ticket Form)',     'Rev Date (Ticket Form)',     'FRM-030-004', '0', ''),
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
  ]);

  const now = new Date();
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  const dow = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (dow === 0 ? 6 : dow - 1));

  const latestStatus = {}, latestPriority = {}, latestClosed = {};

  mlRows.forEach(r => {
    const tn   = cellStr(r, ML.TICKET_NO);
    const dept = cellStr(r, ML.DEPT);
    if (!tn || !allowed(user, dept)) return;
    latestStatus[tn]   = cellStr(r, ML.STATUS).toUpperCase();
    latestPriority[tn] = cellStr(r, ML.PRIORITY).toUpperCase();
    const dc = cellDate(r, ML.DATE_CLOSED);
    if (dc) latestClosed[tn] = dc;
  });

  const counts = { open: 0, waiting: 0, critical: 0, tempFixActive: 0,
                   closedRecent: 0, partsPending: 0, closedThisWeek: 0 };

  const OPEN_STS = new Set(['OPEN', 'PENDING PARTS', 'ON HOLD', 'PENDING VERIFICATION']);

  Object.keys(latestStatus).forEach(tn => {
    const st = latestStatus[tn];
    if (OPEN_STS.has(st)) { counts.open++; if (latestPriority[tn] === 'CRITICAL') counts.critical++; }
    if (st === 'WAITING') counts.waiting++;
    if ((st === 'CLOSED' || st === 'COMPLETE') && latestClosed[tn]) {
      const cd = latestClosed[tn];
      if (cd >= thirtyDaysAgo) counts.closedRecent++;
      if (cd >= weekStart)     counts.closedThisWeek++;
    }
  });

  tfRows.forEach(r => {
    const st = cellStr(r, TF.STATUS).toUpperCase();
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
  ]);

  const byTicket = {};
  mlRows.forEach(r => {
    const tn   = cellStr(r, ML.TICKET_NO);
    const dept = cellStr(r, ML.DEPT);
    if (!tn || !allowed(user, dept)) return;
    if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
    const cur = byTicket[tn];
    r.forEach((v, i) => { if (v != null && v !== '') cur[i] = v; });
  });

  const prioOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const allTickets = Object.values(byTicket).sort((a, b) =>
    (prioOrder[cellStr(a, ML.PRIORITY).toUpperCase()] ?? 4) -
    (prioOrder[cellStr(b, ML.PRIORITY).toUpperCase()] ?? 4)
  );

  const attentionItems = [], openTickets = [];
  const OPEN_STS = new Set(['OPEN', 'PENDING PARTS', 'ON HOLD', 'PENDING VERIFICATION']);

  allTickets.forEach(r => {
    const tn     = cellStr(r, ML.TICKET_NO);
    const status = cellStr(r, ML.STATUS).toUpperCase();
    const prio   = cellStr(r, ML.PRIORITY).toUpperCase();
    const equip  = cellStr(r, ML.SPECIFIC_EQUIP);
    const code   = cellStr(r, ML.EQUIP_CODE);
    const dept   = cellStr(r, ML.DEPT);
    const desc   = cellStr(r, ML.DESCRIPTION);
    const opened = fmtCellDate(r, ML.DATE_OPENED);

    if (status === 'WAITING' && attentionItems.length < 8) {
      attentionItems.push({
        kind: 'review', ticketNo: tn, title: equip || desc || tn,
        sub: dept + (code ? ' · ' + code : '') + (prio ? ' · ' + prio + ' priority' : '') + ' — awaiting approval',
        action: 'Approve', pageTarget: 'waiting',
      });
    } else if (status === 'PENDING VERIFICATION' && attentionItems.length < 8) {
      attentionItems.push({
        kind: 'complete', ticketNo: tn, title: equip || desc || tn,
        sub: dept + (code ? ' · ' + code : '') + ' — awaiting your verification & service-report signoff',
        action: 'Verify', pageTarget: 'open',
      });
    }

    if (OPEN_STS.has(status) && openTickets.length < 10) {
      openTickets.push({
        ticketNo: tn, status, priority: prio, dept,
        equipCode: code, specificEquip: equip, description: desc,
        assignedTo: cellStr(r, ML.ASSIGNED_TO), dateOpened: opened,
        tempFixFlag: cellStr(r, ML.TEMP_FIX_FLAG) === 'Y',
      });
    }
  });

  tfRows.forEach(r => {
    const tempId = cellStr(r, TF.TEMP_ID);
    const dept   = cellStr(r, TF.DEPT);
    if (!tempId || !allowed(user, dept)) return;
    if (cellStr(r, TF.STATUS).toUpperCase() !== 'PAST DUE') return;
    if (attentionItems.length >= 8) return;
    const equip = cellStr(r, TF.SPECIFIC_EQUIP);
    const due   = fmtCellDate(r, TF.NEXT_DUE);
    attentionItems.push({
      kind: 'temp', ticketNo: cellStr(r, TF.TICKET_NO),
      title: tempId + (equip ? ' — ' + equip : ''),
      sub: dept + ' · Temp fix PAST DUE' + (due ? ' (due ' + due + ')' : '') + ' — Maintenance Program 030',
      action: 'Inspect', pageTarget: 'tempfix',
    });
  });

  const holdTags = [];
  ehlRows.forEach(r => {
    const tagId = cellStr(r, EHL.TAG_ID);
    const dept  = cellStr(r, EHL.DEPT);
    if (!tagId || !allowed(user, dept)) return;
    if (cellStr(r, EHL.EQUIP_STATUS).toUpperCase() === 'CLEARED') return;
    holdTags.push({
      tagId, ticketNo: cellStr(r, EHL.TICKET_NO), equipCode: cellStr(r, EHL.EQUIP_CODE),
      specificEquip: cellStr(r, EHL.SPECIFIC_EQUIP), tagType: cellStr(r, EHL.TAG_TYPE),
      dateTagged: fmtCellDate(r, EHL.DATE_TAGGED), reason: cellStr(r, EHL.REASON), dept,
    });
  });

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
    sub: cellStr(r, ML.DEPT) + (cellStr(r, ML.EQUIP_CODE) ? ' · ' + cellStr(r, ML.EQUIP_CODE) : '') +
         ' — requesting your dept: ' + myDepts.join(', '),
    action: 'Review',
  }));

  const CHRONIC_THRESHOLD = 3;
  const cutoff90 = new Date(); cutoff90.setDate(cutoff90.getDate() - 90);
  const equipTickets = {};
  mlRows.forEach(r => {
    const tn   = cellStr(r, ML.TICKET_NO);
    const dept = cellStr(r, ML.DEPT);
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

  return jsonResponse({ attentionItems, openTickets, holdTags, pendingJointRequests, chronicEquipment });
}

// ── Shared ticket merge/filter (backend/TicketQueries.gs _mergeAndFilter_) ───

function mergeAndFilter(data, statusFilter, deptFilter, limit) {
  const rowsByTicket = {};
  for (let i = 0; i < data.length; i++) {
    const tn = cellStr(data[i], ML.TICKET_NO);
    if (!tn) continue;
    (rowsByTicket[tn] = rowsByTicket[tn] || []).push(data[i]);
  }

  const tickets = [];
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, '': 4 };

  for (const ticketId in rowsByTicket) {
    const rows = rowsByTicket[ticketId];
    const best = rows[0].slice();
    for (let r = 1; r < rows.length; r++) {
      rows[r].forEach((v, c) => { if (v !== '' && v != null) best[c] = v; });
    }

    const status = cellStr(best, ML.STATUS).toUpperCase();
    if (statusFilter && statusFilter.indexOf(status) < 0) continue;

    const dept = cellStr(best, ML.DEPT);
    const jointDeptsStr = cellStr(best, ML.JOINT_DEPTS);
    const jointDeptsList = jointDeptsStr ? jointDeptsStr.split(',').map(d => d.trim()).filter(Boolean) : [];
    const pendingJointDeptsStr = cellStr(best, ML.PENDING_JOINT_DEPTS);
    const pendingJointList = pendingJointDeptsStr ? pendingJointDeptsStr.split(',').map(d => d.trim()).filter(Boolean) : [];
    let isJoint = false, isPendingJoint = false;

    if (deptFilter) {
      const primaryMatch = Array.isArray(deptFilter) ? deptFilter.indexOf(dept) >= 0 : dept === deptFilter;
      if (!primaryMatch) {
        if (Array.isArray(deptFilter)) {
          for (const df of deptFilter) { if (jointDeptsList.indexOf(df) >= 0) { isJoint = true; break; } }
        } else {
          isJoint = jointDeptsList.indexOf(deptFilter) >= 0;
        }
        if (!isJoint) {
          if (Array.isArray(deptFilter)) {
            for (const df of deptFilter) { if (pendingJointList.indexOf(df) >= 0) { isPendingJoint = true; break; } }
          } else {
            isPendingJoint = pendingJointList.indexOf(deptFilter) >= 0;
          }
          if (!isPendingJoint) continue;
        }
      }
    }

    tickets.push({
      ticketNo:     cellStr(best, ML.TICKET_NO),
      status,
      priority:     cellStr(best, ML.PRIORITY).toUpperCase(),
      dept,
      buildingZone: cellStr(best, ML.BUILDING_ZONE),
      equipType:    cellStr(best, ML.EQUIP_TYPE),
      equipCode:    cellStr(best, ML.EQUIP_CODE),
      specificEquip:cellStr(best, ML.SPECIFIC_EQUIP),
      description:  cellStr(best, ML.DESCRIPTION),
      assignedTo:   cellStr(best, ML.ASSIGNED_TO),
      dateOpened:   fmtCellDate(best, ML.DATE_OPENED),
      problemType:  cellStr(best, ML.PROBLEM_TYPE),
      addedBy:      cellStr(best, ML.ADDED_BY),
      downtimeType: cellStr(best, ML.DOWNTIME_TYPE),
      lineNo:       cellStr(best, ML.LINE_NO),
      tempFixFlag:  cellStr(best, ML.TEMP_FIX_FLAG) === 'Y',
      partsNeeded:  cellStr(best, ML.PARTS_NEEDED) === 'Y',
      estHours:     best[ML.EST_HOURS - 1] || '',
      actualHours:  best[ML.ACTUAL_HOURS - 1] || '',
      fixType:      cellStr(best, ML.FIX_TYPE),
      verifiedBy:   cellStr(best, ML.VERIFIED_BY),
      jointDepts:   jointDeptsStr,
      isJoint,
      pendingJointDepts: pendingJointDeptsStr,
      isPendingJoint,
    });
  }

  tickets.sort((a, b) => {
    const pa = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 4;
    const pb = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 4;
    if (pa !== pb) return pa - pb;
    return (b.dateOpened || '').localeCompare(a.dateOpened || '');
  });

  return limit ? tickets.slice(0, limit) : tickets;
}

// ═══ RPC READ HANDLERS — faithful ports of backend/*.gs ══════════════════════

async function rpcGetQueueTickets(args, ctx) {
  requireTech(ctx.user);
  const queueType = args[0];
  const opts = args[1] || {};
  let statusFilter;
  switch (queueType) {
    case 'waiting': statusFilter = ['WAITING']; break;
    case 'open':    statusFilter = ['OPEN', 'PENDING VERIFICATION', 'PENDING PARTS', 'ON HOLD']; break;
    case 'tracker': statusFilter = ['WAITING', 'OPEN', 'PENDING VERIFICATION', 'PENDING PARTS', 'ON HOLD']; break;
    default:        statusFilter = ['WAITING', 'OPEN']; break;
  }
  let deptFilter = null;
  if (opts.dept) deptFilter = normalizeDept(opts.dept, ctx.deptMap);
  const data = await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  if (!data.length) return [];
  return mergeAndFilter(data, statusFilter, deptFilter, opts.limit || 500);
}

async function rpcGetTicketDetail(args, ctx) {
  requireTech(ctx.user);
  const ticketNo = args[0];
  if (!ticketNo) throw new Error('ticketNo required');

  const [allRows, thRows] = await Promise.all([
    readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ'),
    readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.TICKET_HIST, 'A2:H'),
  ]);

  const rows = allRows.filter(r => cellStr(r, ML.TICKET_NO) === String(ticketNo));
  if (rows.length === 0) throw new Error('Ticket not found: ' + ticketNo);

  const best = rows[0].slice();
  for (let i = 1; i < rows.length; i++) {
    rows[i].forEach((v, c) => { if (v !== '' && v != null) best[c] = v; });
  }

  const ticket = {
    ticketNo:      cellStr(best, ML.TICKET_NO),
    status:        cellStr(best, ML.STATUS).toUpperCase(),
    priority:      cellStr(best, ML.PRIORITY).toUpperCase(),
    dept:          cellStr(best, ML.DEPT),
    buildingZone:  cellStr(best, ML.BUILDING_ZONE),
    equipType:     cellStr(best, ML.EQUIP_TYPE),
    equipCode:     cellStr(best, ML.EQUIP_CODE),
    specificEquip: cellStr(best, ML.SPECIFIC_EQUIP),
    downtimeType:  cellStr(best, ML.DOWNTIME_TYPE),
    description:   cellStr(best, ML.DESCRIPTION),
    assignedTo:    cellStr(best, ML.ASSIGNED_TO),
    estHours:      best[ML.EST_HOURS - 1] || '',
    actualHours:   best[ML.ACTUAL_HOURS - 1] || '',
    dateOpened:    fmtCellDate(best, ML.DATE_OPENED),
    dateCompleted: fmtCellDate(best, ML.DATE_COMPLETED),
    dateClosed:    fmtCellDate(best, ML.DATE_CLOSED),
    correctiveAct: cellStr(best, ML.CORRECTIVE_ACT),
    rootCause:     cellStr(best, ML.ROOT_CAUSE),
    preventiveAct: cellStr(best, ML.PREVENTIVE_ACT),
    workSummary:   cellStr(best, ML.PREVENTIVE_ACT),
    fixType:       cellStr(best, ML.FIX_TYPE),
    tempFixFlag:   cellStr(best, ML.TEMP_FIX_FLAG) === 'Y',
    partsNeeded:   cellStr(best, ML.PARTS_NEEDED) === 'Y',
    partsStatus:   cellStr(best, ML.PARTS_STATUS),
    equipTagStatus:cellStr(best, ML.EQUIP_TAG_STATUS),
    verifiedBy:    cellStr(best, ML.VERIFIED_BY),
    verifiedDate:  fmtCellDate(best, ML.VERIFIED_DATE),
    addedBy:       cellStr(best, ML.ADDED_BY),
    updatedBy:     cellStr(best, ML.UPDATED_BY),
    notes:         cellStr(best, ML.NOTES),
    problemType:   cellStr(best, ML.PROBLEM_TYPE),
    lineNo:        cellStr(best, ML.LINE_NO),
    sqfChecklist:  cellStr(best, ML.VERIFICATION_CHECKLIST),
    photoUrl:      cellStr(best, ML.PHOTO_URL),
    jointDepts:        cellStr(best, ML.JOINT_DEPTS),
    jointSignoffs:     cellStr(best, ML.JOINT_SIGNOFFS),
    pendingJointDepts: cellStr(best, ML.PENDING_JOINT_DEPTS),
    permFixPlan:       cellStr(best, ML.PERM_FIX_PLAN),
    permFixDate:       fmtCellDate(best, ML.PERM_FIX_DATE),
    downtimeDuration:  cellStr(best, ML.DOWNTIME_DURATION),
  };

  const history = [];
  thRows.forEach(r => {
    if (String(r[TH.TICKET_NO - 1] || '').trim() !== String(ticketNo)) return;
    history.push({
      histId:      String(r[TH.HIST_ID - 1] || ''),
      timestamp:   fmtTs(toDate(r[TH.TIMESTAMP - 1])),
      eventType:   String(r[TH.EVENT_TYPE - 1] || ''),
      statusFrom:  String(r[TH.STATUS_FROM - 1] || ''),
      statusTo:    String(r[TH.STATUS_TO - 1] || ''),
      performedBy: String(r[TH.PERFORMED_BY - 1] || ''),
      notes:       String(r[TH.NOTES - 1] || ''),
    });
  });

  const techs = await getTechsForDept(ctx.token, ctx.env, ctx.deptMap, ticket.dept);
  return { ticket, history, techs };
}

async function rpcGetClosedTickets(args, ctx) {
  requireManager(ctx.user);
  const opts = args[0] || {};
  const data = await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  if (!data.length) return [];

  function tsOf(d) { return d ? d.getTime() : 0; }

  const byTicket = {};
  data.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO);
    if (!tn) return;
    if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
    r.forEach((v, c) => { if (v !== '' && v != null) byTicket[tn][c] = v; });
  });

  let tickets = [];
  Object.keys(byTicket).forEach(tn => {
    const r = byTicket[tn];
    const status = cellStr(r, ML.STATUS).toUpperCase();
    if (status !== 'CLOSED' && status !== 'COMPLETE') return;

    const dept = cellStr(r, ML.DEPT);
    if (opts.search) {
      const q = opts.search.toLowerCase();
      const haystack = (tn + ' ' + dept + ' ' + cellStr(r, ML.SPECIFIC_EQUIP) + ' ' +
        cellStr(r, ML.DESCRIPTION) + ' ' + cellStr(r, ML.ASSIGNED_TO) + ' ' + cellStr(r, ML.ADDED_BY)).toLowerCase();
      if (haystack.indexOf(q) < 0) return;
    }

    const rawClose = cellDate(r, ML.DATE_CLOSED) || cellDate(r, ML.VERIFIED_DATE);
    tickets.push({
      ticketNo: tn,
      status: cellStr(r, ML.STATUS),
      priority: cellStr(r, ML.PRIORITY).toUpperCase(),
      dept,
      equipCode: cellStr(r, ML.EQUIP_CODE),
      specificEquip: cellStr(r, ML.SPECIFIC_EQUIP),
      description: cellStr(r, ML.DESCRIPTION),
      assignedTo: cellStr(r, ML.ASSIGNED_TO),
      actualHours: r[ML.ACTUAL_HOURS - 1] || '',
      dateOpened: fmtCellDate(r, ML.DATE_OPENED),
      dateClosed: fmtDate(rawClose),
      lastUpdated: fmtCellDate(r, ML.VERIFIED_DATE),
      verifiedBy: cellStr(r, ML.VERIFIED_BY),
      verifiedDate: fmtCellDate(r, ML.VERIFIED_DATE),
      addedBy: cellStr(r, ML.ADDED_BY),
      lineNo: cellStr(r, ML.LINE_NO),
      _closeTs: tsOf(rawClose),
    });
  });

  tickets.sort((a, b) => b._closeTs - a._closeTs);
  tickets.forEach(t => { delete t._closeTs; });
  if (opts.limit) tickets = tickets.slice(0, opts.limit);
  return tickets;
}

async function rpcGetEquipTicketHistory(args, ctx) {
  requireTech(ctx.user);
  const equipCode = args[0];
  if (!equipCode) return [];
  const data = await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  if (!data.length) return [];

  const perTicket = {};
  data.forEach(row => {
    const tn   = cellStr(row, ML.TICKET_NO);
    const code = cellStr(row, ML.EQUIP_CODE);
    if (!tn || tn === 'SYSTEM' || code !== String(equipCode)) return;
    if (!perTicket[tn]) perTicket[tn] = row.slice();
    else row.forEach((v, c) => { if (v !== '' && v != null) perTicket[tn][c] = v; });
  });

  const result = Object.keys(perTicket).map(tn => {
    const r = perTicket[tn];
    return {
      ticketNo: tn,
      dateOpened: fmtCellDate(r, ML.DATE_OPENED),
      status: cellStr(r, ML.STATUS).toUpperCase(),
      priority: cellStr(r, ML.PRIORITY).toUpperCase(),
      problemType: cellStr(r, ML.PROBLEM_TYPE),
      estHours: r[ML.EST_HOURS - 1] || '',
      actualHours: r[ML.ACTUAL_HOURS - 1] || '',
    };
  });
  result.sort((a, b) => (b.dateOpened || '').localeCompare(a.dateOpened || ''));
  return result;
}

async function rpcGetTempFixItems(args, ctx) {
  requireManager(ctx.user);
  const opts = args[0] || {};
  const data = await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.TEMP_FIX, `A${HIST_HEADER_ROW + 1}:V`);
  const items = [];
  data.forEach(r => {
    const tempId = cellStr(r, TF.TEMP_ID);
    if (!tempId) return;
    const dept = cellStr(r, TF.DEPT);
    if (!ctx.user.isAdmin && ctx.user.ownedDepts.length > 0 && ctx.user.ownedDepts.indexOf(dept) < 0) return;
    const status = cellStr(r, TF.STATUS).toUpperCase();
    if (!opts.includeCleared && status === 'CLEARED') return;
    items.push({
      tempId, ticketNo: cellStr(r, TF.TICKET_NO), equipCode: cellStr(r, TF.EQUIP_CODE),
      specificEquip: cellStr(r, TF.SPECIFIC_EQUIP), dept, buildingZone: cellStr(r, TF.BUILDING_ZONE),
      dateFlagged: fmtCellDate(r, TF.DATE_FLAGGED), description: cellStr(r, TF.DESCRIPTION),
      tempFixDesc: cellStr(r, TF.TEMP_FIX_DESC), freqDays: r[TF.FREQ_DAYS - 1] || '',
      lastInspected: fmtCellDate(r, TF.LAST_INSPECTED), nextDue: fmtCellDate(r, TF.NEXT_DUE),
      status, flaggedBy: cellStr(r, TF.FLAGGED_BY), clearedBy: cellStr(r, TF.CLEARED_BY),
      clearedDate: fmtCellDate(r, TF.CLEARED_DATE), notes: cellStr(r, TF.NOTES),
      reasonTemporary: cellStr(r, TF.REASON_TEMPORARY), permFixPlan: cellStr(r, TF.PERM_FIX_PLAN),
      expectedCompletion: fmtCellDate(r, TF.EXPECTED_COMPLETION), noImprovised: cellStr(r, TF.NO_IMPROVISED),
      productRiskOk: cellStr(r, TF.PRODUCT_RISK_OK),
    });
  });
  return items;
}

async function rpcGetEquipHoldItems(args, ctx) {
  requireManager(ctx.user);
  const opts = args[0] || {};
  const data = await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.EQUIP_HOLD_LOG, `A${HIST_HEADER_ROW + 1}:N`);
  const items = [];
  data.forEach(r => {
    const tagId = cellStr(r, EHL.TAG_ID);
    if (!tagId) return;
    const dept = cellStr(r, EHL.DEPT);
    if (!ctx.user.isAdmin && ctx.user.ownedDepts.length > 0 && ctx.user.ownedDepts.indexOf(dept) < 0) return;
    const status = cellStr(r, EHL.EQUIP_STATUS).toUpperCase();
    if (!opts.includeCleared && status === 'CLEARED') return;
    items.push({
      tagId, ticketNo: cellStr(r, EHL.TICKET_NO), equipCode: cellStr(r, EHL.EQUIP_CODE),
      specificEquip: cellStr(r, EHL.SPECIFIC_EQUIP), dept, buildingZone: cellStr(r, EHL.BUILDING_ZONE),
      tagType: cellStr(r, EHL.TAG_TYPE), dateTagged: fmtCellDate(r, EHL.DATE_TAGGED),
      taggedBy: cellStr(r, EHL.TAGGED_BY), reason: cellStr(r, EHL.REASON), equipStatus: status,
      clearedBy: cellStr(r, EHL.CLEARED_BY), clearedDate: fmtCellDate(r, EHL.CLEARED_DATE), notes: cellStr(r, EHL.NOTES),
    });
  });
  return items;
}

async function rpcGetPartsItems(args, ctx) {
  requireTech(ctx.user);
  const opts = args[0] || {};
  const data = await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.PARTS_NEEDED, `A${HIST_HEADER_ROW + 1}:L`);
  const u = ctx.user;
  const items = [];
  data.forEach(r => {
    const partId = cellStr(r, PN.PART_ID);
    if (!partId) return;
    const dept = cellStr(r, PN.DEPT);
    if (!u.isAdmin && u.isManager && u.ownedDepts.length > 0 && u.ownedDepts.indexOf(dept) < 0) return;
    const status = cellStr(r, PN.PARTS_STATUS).toUpperCase();
    if (opts.statusFilter && status !== String(opts.statusFilter).toUpperCase()) return;
    items.push({
      partId, partDesc: cellStr(r, PN.PART_DESC), ticketNo: cellStr(r, PN.TICKET_NO),
      equipCode: cellStr(r, PN.EQUIP_CODE), specificEquip: cellStr(r, PN.SPECIFIC_EQUIP), dept,
      dateRequested: fmtCellDate(r, PN.DATE_REQUESTED), partsStatus: status,
      dateOrdered: fmtCellDate(r, PN.DATE_ORDERED), dateReceived: fmtCellDate(r, PN.DATE_RECEIVED),
      orderedBy: cellStr(r, PN.ORDERED_BY), notes: cellStr(r, PN.NOTES),
    });
  });
  return items;
}

async function rpcGetAddTicketFormData(args, ctx) {
  requireTech(ctx.user);
  const cfg = await getConfigMap(ctx.token, ctx.env);
  const lists = await getAllDataLists(ctx.token, ctx.env);

  let routingRules = [];
  try { routingRules = JSON.parse(configValue(cfg, 'Routing Override Rules') || '[]'); } catch (e) { routingRules = []; }
  if (!routingRules.length) {
    routingRules = [
      { keyword: 'ELECTRICAL', matchOn: 'PROBLEM_TYPE', routeTo: 'ELECTRICAL' },
      { keyword: 'FACILITY',   matchOn: 'EQUIP_DESC',   routeTo: 'FACILITIES' },
    ];
  }

  const hierarchy = await getEquipmentHierarchy(ctx.token, ctx.env, ctx.deptMap);
  const people    = await getPeopleList(ctx.token, ctx.env, ctx.deptMap);

  return {
    companyName:    String(cfg['Company Name'] || 'Container Supply Co.'),
    docNo:          String(cfg['Doc No (Ticket Form)'] || 'FRM-030-004'),
    revision:       String(cfg['Revision'] || '0'),
    departments:    ALL_DEPTS.slice(),
    equipHierarchy: hierarchy,
    buildingZones:  lists['Building / Zone'] || [],
    priorities:     lists['Priorities'] || ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    problemTypes:   lists['Problem Types'] || [],
    downtimeTypes:  lists['Downtime Types'] || ['PLANNED', 'UNPLANNED'],
    peopleList:     people,
    userDisplayName: ctx.user.displayName,
    userOwnedDepts:  ctx.user.ownedDepts,
    userIsManager:   ctx.user.isManager,
    routingRules,
    deptMapping:     ctx.deptMap,
  };
}

async function rpcGetEquipQuickStats(args, ctx) {
  const equipCode = args[0];
  if (!equipCode) return null;
  requireManager(ctx.user);
  const data = await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  if (!data.length) return { count60d: 0, topProbType: null, lastDate: null };

  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60);
  const byTicket = {};
  data.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO);
    const ec = cellStr(r, ML.EQUIP_CODE);
    if (!tn || ec.toUpperCase() !== String(equipCode).trim().toUpperCase()) return;
    if (!byTicket[tn]) { byTicket[tn] = r.slice(); return; }
    r.forEach((v, c) => { if (v !== '' && v != null) byTicket[tn][c] = v; });
  });

  let count60d = 0; const probTypes = {}; let lastDate = null;
  Object.keys(byTicket).forEach(tn => {
    const r = byTicket[tn];
    const d = cellDate(r, ML.DATE_OPENED);
    if (!d || d < cutoff) return;
    count60d++;
    const pt = cellStr(r, ML.PROBLEM_TYPE);
    if (pt) probTypes[pt] = (probTypes[pt] || 0) + 1;
    if (!lastDate || d > lastDate) lastDate = d;
  });

  let topProbType = null, maxCt = 0;
  Object.keys(probTypes).forEach(pt => { if (probTypes[pt] > maxCt) { maxCt = probTypes[pt]; topProbType = pt; } });
  return { count60d, topProbType, lastDate: lastDate ? fmtDate(lastDate) : null };
}

async function rpcGetTechWorkBoardData(args, ctx) {
  requireTech(ctx.user);
  const u = ctx.user;
  const data = await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  if (!data.length) return { tickets: [], userDisplayName: u.displayName, isManager: u.isManager };

  const activeStatuses = ['OPEN', 'PENDING VERIFICATION', 'PENDING PARTS', 'ON HOLD'];
  let deptFilter = null;
  if (!u.isAdmin && u.isManager && u.ownedDepts.length > 0) deptFilter = u.ownedDepts;

  let tickets = mergeAndFilter(data, activeStatuses, deptFilter, 500);
  if (!u.isManager && !u.isAdmin) {
    const myName = u.displayName.toLowerCase().trim();
    tickets = tickets.filter(t => t.assignedTo && t.assignedTo.toLowerCase().trim() === myName);
  }
  return { tickets, userDisplayName: u.displayName, isManager: u.isManager };
}

async function rpcGetAdminViewData(args, ctx) {
  requireAdmin(ctx.user);
  const view = args[0];
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${ctx.env.SPREADSHEET_ID}/edit`;

  if (view === 'config') {
    const rows = (await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.CONFIG, 'C2:D30'))
      .filter(r => String(r[0] || '').trim())
      .map(r => ({ key: String(r[0]).trim(), value: String(r[1] != null ? r[1] : '').trim() }));
    return { view: 'config', rows, sheetUrl, sheetTab: encodeURIComponent(SH.CONFIG) };
  }
  if (view === 'access') {
    const managers = await getManagerConfig(ctx.token, ctx.env, ctx.deptMap);
    return { view: 'access', managers, sheetUrl, sheetTab: encodeURIComponent(SH.MANAGER_ACCESS) };
  }
  if (view === 'deptmap') {
    const rows = (await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.DEPT_MAP, 'A2:B'))
      .filter(r => String(r[0] || '').trim())
      .map(r => ({ src: String(r[0]).trim(), dest: String(r[1] || '').trim() }));
    return { view: 'deptmap', rows, sheetUrl, sheetTab: encodeURIComponent(SH.DEPT_MAP) };
  }
  if (view === 'techdir') {
    const td = await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.TECH_DIR, 'A2:D');
    const rows = td.filter(r => String(r[0] || '').trim()).map(r => ({
      name: String(r[0]).trim(), email: String(r[1] || '').trim(), dept: String(r[2] || '').trim(),
      active: String(r[3] !== undefined ? r[3] : 'Y').trim().toUpperCase() !== 'N' ? 'Y' : 'N',
    }));
    return { view: 'techdir', rows, tabExists: td.length > 0, sheetUrl,
             sheetTab: td.length > 0 ? encodeURIComponent(SH.TECH_DIR) : '' };
  }
  return { view, rows: [], sheetUrl };
}

async function rpcGetEquipmentInventoryPageData(args, ctx) {
  requireTech(ctx.user);
  const equip = await getEquipmentFromInventory(ctx.token, ctx.env);
  const mlData = await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  const stats = {};

  if (mlData.length) {
    const perTicket = {};
    mlData.forEach(row => {
      const tn   = cellStr(row, ML.TICKET_NO);
      const code = cellStr(row, ML.EQUIP_CODE);
      const status = cellStr(row, ML.STATUS).toUpperCase();
      if (!tn || tn === 'SYSTEM' || !code) return;
      if (!perTicket[tn]) {
        perTicket[tn] = { code, latestStatus: status, dateOpened: cellDate(row, ML.DATE_OPENED),
                          dateClosed: cellDate(row, ML.DATE_CLOSED), actualHours: parseFloat(row[ML.ACTUAL_HOURS - 1]) || 0 };
      } else {
        if (code) perTicket[tn].code = code;
        if (status) perTicket[tn].latestStatus = status;
        const dc = cellDate(row, ML.DATE_CLOSED);
        if (dc) perTicket[tn].dateClosed = dc;
        const ah = parseFloat(row[ML.ACTUAL_HOURS - 1]) || 0;
        if (ah > perTicket[tn].actualHours) perTicket[tn].actualHours = ah;
      }
    });

    Object.keys(perTicket).forEach(tn => {
      const t = perTicket[tn];
      const code = t.code;
      if (!stats[code]) stats[code] = { total: 0, open: 0, closedCount: 0, totalCloseDays: 0,
                                        closedDates: [], closedActualHrs: [], lastOpenedMs: 0 };
      const s = stats[code];
      s.total++;
      const st = t.latestStatus;
      if (st === 'OPEN' || st === 'WAITING' || st === 'PENDING VERIFICATION' || st === 'PENDING PARTS') s.open++;
      const dOpen = t.dateOpened, dClosed = t.dateClosed;
      if (dOpen && dOpen.getTime() > s.lastOpenedMs) s.lastOpenedMs = dOpen.getTime();
      if (dOpen && dClosed && dClosed > dOpen) {
        s.totalCloseDays += (dClosed.getTime() - dOpen.getTime()) / 86400000;
        s.closedCount++;
        s.closedDates.push(dClosed.getTime());
        if (t.actualHours > 0) s.closedActualHrs.push(t.actualHours);
      }
    });
  }

  Object.keys(stats).forEach(code => {
    const s = stats[code];
    const dates = s.closedDates.slice().sort((a, b) => a - b);
    if (dates.length >= 2) {
      let gap = 0;
      for (let i = 1; i < dates.length; i++) gap += (dates[i] - dates[i - 1]) / 86400000;
      s.mtbf = Math.round(gap / (dates.length - 1));
    } else s.mtbf = null;
    s.mttr = s.closedActualHrs.length > 0
      ? Math.round((s.closedActualHrs.reduce((a, b) => a + b, 0) / s.closedActualHrs.length) * 10) / 10 : null;
    s.avgCloseDays = s.closedCount > 0 ? Math.round((s.totalCloseDays / s.closedCount) * 10) / 10 : null;
    s.lastTicketDate = s.lastOpenedMs ? fmtDate(new Date(s.lastOpenedMs)) : '—';
  });

  const equipList = equip.map(e => {
    const s = stats[e.code] || {};
    return {
      dept: e.dept, eType: e.eType, code: e.code, specific: e.specific, status: e.status || 'ACTIVE',
      totalTickets: s.total || 0, openTickets: s.open || 0,
      avgCloseDays: s.avgCloseDays != null ? s.avgCloseDays : null,
      mtbf: s.mtbf != null ? s.mtbf : null, mttr: s.mttr != null ? s.mttr : null,
      lastTicketDate: s.lastTicketDate || '—',
    };
  });

  return { equipment: equipList, userIsManager: ctx.user.isManager };
}

async function rpcGetEquipCacheStatus(args, ctx) {
  requireAdmin(ctx.user);
  const cfg = await getConfigMap(ctx.token, ctx.env);
  const cache = await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.EQUIP_CACHE);

  const cacheRows = cache.length > 4 ? cache.length - 4 : 0;
  const lastRefreshed = String(configValue(cfg, 'Equip Cache Last Refreshed') || '').trim() || 'Never';

  let rawHeaders = [], mappedCols = {}, unmappedHdrs = [];
  if (cache.length >= 4) {
    rawHeaders = (cache[3] || []).map(h => String(h || '').trim()).filter(h => h !== '');
    const lowerHdrs = rawHeaders.map(h => h.toLowerCase());
    const colMap = buildEquipColMap(lowerHdrs);
    Object.keys(_EQUIP_COL_MAPPINGS_).forEach(field => {
      if (colMap[field] !== undefined) mappedCols[field] = rawHeaders[colMap[field]];
    });
    lowerHdrs.forEach((h, i) => {
      let matched = false;
      Object.keys(_EQUIP_COL_MAPPINGS_).forEach(field => { if (_EQUIP_COL_MAPPINGS_[field].indexOf(h) >= 0) matched = true; });
      if (!matched) unmappedHdrs.push(rawHeaders[i]);
    });
  }

  const parsedItems = await getEquipmentFromInventory(ctx.token, ctx.env);
  const hierarchy = await getEquipmentHierarchy(ctx.token, ctx.env, ctx.deptMap);
  const deptSummary = Object.keys(hierarchy).map(d => {
    let items = 0;
    Object.keys(hierarchy[d]).forEach(t => { items += hierarchy[d][t].length; });
    return { dept: d, types: Object.keys(hierarchy[d]).length, items };
  });

  return {
    lastRefreshed, cacheRows, parsedItemCount: parsedItems.length, deptSummary,
    rawHeaders, mappedCols, unmappedHdrs,
    configTabName: String(configValue(cfg, 'Equipment Inventory Tab Name') || '').trim(),
    configSheetUrl: '(resolved by backend at refresh time)',
    resolvedSheetId: '(service-account managed)',
    canonicalDepts: ALL_DEPTS.slice(),
  };
}

async function rpcGetReportData(args, ctx) {
  requireManager(ctx.user);
  const opts = args[0] || {};
  const u = ctx.user;
  const daysBack = Math.min(Math.max(parseInt(opts.daysBack || 30, 10), 1), 365);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - daysBack);
  const trendCutoff = new Date(); trendCutoff.setDate(trendCutoff.getDate() - 84);

  let deptFilter = opts.dept ? normalizeDept(opts.dept, ctx.deptMap) : null;
  if (!deptFilter && !u.isAdmin && u.ownedDepts.length > 0) deptFilter = u.ownedDepts;

  const data = await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.MASTER_LOG, 'A2:AQ');
  if (!data.length) return emptyReport(daysBack);

  function weekKey(d) {
    const day = new Date(d); day.setUTCHours(0, 0, 0, 0);
    const dow = day.getUTCDay(); const diff = dow === 0 ? 6 : dow - 1;
    day.setUTCDate(day.getUTCDate() - diff);
    return `${_p2(day.getUTCMonth() + 1)}/${_p2(day.getUTCDate())}`;
  }

  const rowsByTicket = {};
  data.forEach(r => {
    const tn = cellStr(r, ML.TICKET_NO);
    const dept = cellStr(r, ML.DEPT);
    if (!tn) return;
    if (deptFilter) { if (Array.isArray(deptFilter) ? deptFilter.indexOf(dept) < 0 : dept !== deptFilter) return; }
    if (!rowsByTicket[tn]) rowsByTicket[tn] = { first: r, rows: [] };
    rowsByTicket[tn].rows.push(r);
  });

  const activeStatuses = { 'OPEN': 1, 'WAITING': 1, 'PENDING VERIFICATION': 1, 'PENDING PARTS': 1, 'ON HOLD': 1 };
  const deptStats = {}; const tickets = [];
  const kpis = { totalOpen: 0, critical: 0, avgTimeToCloseSum: 0, avgTimeToCloseCount: 0, tempFix: 0, partsPending: 0, closedThisPeriod: 0 };
  const statusFunnel = { waiting: 0, open: 0, pendingVerify: 0, pendingParts: 0, onHold: 0, closed: 0, voided: 0 };
  const trendOpened = {}, trendClosed = {};
  const equipCounts = {}, equipHeatmap = {}, buildingCounts = {}, problemCounts = {};
  const teamStats = {};

  for (const tn in rowsByTicket) {
    const entry = rowsByTicket[tn];
    const rows = entry.rows, firstR = entry.first;
    const best = rows[0].slice();
    for (let i = 1; i < rows.length; i++) rows[i].forEach((v, c) => { if (v !== '' && v != null) best[c] = v; });

    const status = cellStr(best, ML.STATUS).toUpperCase();
    const priority = cellStr(best, ML.PRIORITY).toUpperCase();
    const dept = cellStr(best, ML.DEPT);
    const equipCode = cellStr(best, ML.EQUIP_CODE);
    const equipType = cellStr(best, ML.EQUIP_TYPE);
    const specEquip = cellStr(best, ML.SPECIFIC_EQUIP);
    const bz = cellStr(best, ML.BUILDING_ZONE);
    const assignedTo = cellStr(best, ML.ASSIGNED_TO);
    const probType = cellStr(best, ML.PROBLEM_TYPE);
    const dateOpened = cellDate(firstR, ML.DATE_OPENED) || cellDate(firstR, ML.TIMESTAMP);
    const dateClosed = cellDate(best, ML.DATE_CLOSED);
    const actualHrs = parseFloat(best[ML.ACTUAL_HOURS - 1] || 0) || 0;
    const isTempFix = cellStr(best, ML.TEMP_FIX_FLAG) === 'Y';
    const partsY = cellStr(best, ML.PARTS_NEEDED) === 'Y';

    let inWindow = false;
    if (activeStatuses[status]) inWindow = true;
    else {
      if (dateClosed && dateClosed >= cutoff) inWindow = true;
      if (!inWindow && dateOpened && dateOpened >= cutoff) inWindow = true;
    }

    if (status === 'WAITING') statusFunnel.waiting++;
    else if (status === 'OPEN' || status === 'ON HOLD') statusFunnel.open++;
    else if (status === 'PENDING VERIFICATION') statusFunnel.pendingVerify++;
    else if (status === 'PENDING PARTS') statusFunnel.pendingParts++;
    else if (status === 'CLOSED' || status === 'COMPLETE') statusFunnel.closed++;
    else if (status === 'VOIDED') statusFunnel.voided++;

    if (dateOpened && dateOpened >= trendCutoff) { const wk = weekKey(dateOpened); trendOpened[wk] = (trendOpened[wk] || 0) + 1; }
    if (dateClosed && dateClosed >= trendCutoff) { const wkc = weekKey(dateClosed); trendClosed[wkc] = (trendClosed[wkc] || 0) + 1; }

    if (!inWindow) continue;

    if (!deptStats[dept]) deptStats[dept] = { dept, open: 0, waiting: 0, closed: 0, critical: 0, tempFix: 0, totalHours: 0 };
    if (activeStatuses[status]) {
      if (status !== 'WAITING') deptStats[dept].open++; else deptStats[dept].waiting++;
      if (priority === 'CRITICAL') deptStats[dept].critical++;
    }
    if (status === 'CLOSED' || status === 'COMPLETE') deptStats[dept].closed++;
    if (isTempFix) deptStats[dept].tempFix++;
    deptStats[dept].totalHours += actualHrs;

    if (activeStatuses[status]) {
      kpis.totalOpen++;
      if (priority === 'CRITICAL') kpis.critical++;
      if (isTempFix) kpis.tempFix++;
      if (partsY) kpis.partsPending++;
    }
    if ((status === 'CLOSED' || status === 'COMPLETE') && dateClosed) {
      kpis.closedThisPeriod++;
      if (dateOpened) {
        const hrs = (dateClosed.getTime() - dateOpened.getTime()) / 3600000;
        if (hrs >= 0) { kpis.avgTimeToCloseSum += hrs; kpis.avgTimeToCloseCount++; }
      }
    }

    if (equipCode) {
      const ek = equipCode + (specEquip ? '|' + specEquip : '');
      if (!equipCounts[ek]) equipCounts[ek] = { equipCode, specificEquip: specEquip, dept, count: 0 };
      equipCounts[ek].count++;
    }
    if (dept && equipType) { const hk = dept + '||' + equipType; equipHeatmap[hk] = (equipHeatmap[hk] || 0) + 1; }
    if (bz) buildingCounts[bz] = (buildingCounts[bz] || 0) + 1;
    if (probType) problemCounts[probType] = (problemCounts[probType] || 0) + 1;

    if (assignedTo) {
      if (!teamStats[assignedTo]) teamStats[assignedTo] = { name: assignedTo, open: 0, closed: 0, totalHrs: 0, closeTimeSum: 0, closeTimeCount: 0 };
      if (activeStatuses[status]) teamStats[assignedTo].open++;
      if (status === 'CLOSED' || status === 'COMPLETE') {
        teamStats[assignedTo].closed++;
        teamStats[assignedTo].totalHrs += actualHrs;
        if (dateOpened && dateClosed) {
          const ct = (dateClosed.getTime() - dateOpened.getTime()) / 3600000;
          if (ct >= 0) { teamStats[assignedTo].closeTimeSum += ct; teamStats[assignedTo].closeTimeCount++; }
        }
      }
    }

    tickets.push({
      ticketNo: tn, status, priority, dept, equipType, equipCode, specificEquip: specEquip,
      description: cellStr(best, ML.DESCRIPTION), assignedTo,
      dateOpened: fmtDate(dateOpened), dateClosed: fmtDate(dateClosed),
      actualHours: best[ML.ACTUAL_HOURS - 1] || '', fixType: cellStr(best, ML.FIX_TYPE),
      tempFixFlag: isTempFix, addedBy: cellStr(best, ML.ADDED_BY), problemType: probType,
    });
  }

  const summary = Object.keys(deptStats).map(d => {
    const s = deptStats[d]; s.totalHours = Math.round(s.totalHours * 10) / 10; return s;
  });
  summary.sort((a, b) => a.dept.localeCompare(b.dept));

  const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, '': 4 };
  tickets.sort((a, b) => {
    const pa = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 4;
    const pb = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 4;
    if (pa !== pb) return pa - pb;
    return (b.dateOpened || '').localeCompare(a.dateOpened || '');
  });

  const avgHrs = kpis.avgTimeToCloseCount > 0 ? Math.round(kpis.avgTimeToCloseSum / kpis.avgTimeToCloseCount * 10) / 10 : null;
  const kpisOut = { totalOpen: kpis.totalOpen, critical: kpis.critical, avgTimeToClose: avgHrs,
                    tempFix: kpis.tempFix, partsPending: kpis.partsPending, closedThisPeriod: kpis.closedThisPeriod };

  const trendLabels = [], trendOpArr = [], trendClArr = [];
  const tw = new Date();
  for (let w = 11; w >= 0; w--) {
    const wStart = new Date(tw); wStart.setDate(tw.getDate() - w * 7); wStart.setUTCHours(0, 0, 0, 0);
    const dow2 = wStart.getUTCDay(); const diff2 = dow2 === 0 ? 6 : dow2 - 1;
    wStart.setUTCDate(wStart.getUTCDate() - diff2);
    const lbl = `${_p2(wStart.getUTCMonth() + 1)}/${_p2(wStart.getUTCDate())}`;
    trendLabels.push(lbl); trendOpArr.push(trendOpened[lbl] || 0); trendClArr.push(trendClosed[lbl] || 0);
  }

  const equipHotspots = Object.keys(equipCounts).map(k => equipCounts[k]).sort((a, b) => b.count - a.count).slice(0, 10);

  const hDepts = [], hTypes = [], hMatrix = {};
  Object.keys(equipHeatmap).forEach(k => {
    const [d, t] = k.split('||');
    if (hDepts.indexOf(d) < 0) hDepts.push(d);
    if (hTypes.indexOf(t) < 0) hTypes.push(t);
    hMatrix[k] = equipHeatmap[k];
  });
  hDepts.sort();

  const bHeatmap = {};
  Object.keys(buildingCounts).forEach(bz => {
    const parts = bz.split(/[\/\-]/);
    const bldg = parts[0] ? parts[0].trim() : bz;
    const zone = parts[1] ? parts[1].trim() : 'General';
    const k2 = bldg + '||' + zone;
    bHeatmap[k2] = (bHeatmap[k2] || 0) + buildingCounts[bz];
  });
  const bBuildings = [], bZones = [];
  Object.keys(bHeatmap).forEach(k => {
    const p = k.split('||');
    if (bBuildings.indexOf(p[0]) < 0) bBuildings.push(p[0]);
    if (bZones.indexOf(p[1]) < 0) bZones.push(p[1]);
  });
  bBuildings.sort(); bZones.sort();

  const problemTypes = Object.keys(problemCounts).map(k => ({ type: k, count: problemCounts[k] }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  const teamWorkload = Object.keys(teamStats).map(name => {
    const ts = teamStats[name];
    return { name, open: ts.open, closed: ts.closed, totalHrs: Math.round(ts.totalHrs * 10) / 10,
             avgCloseHrs: ts.closeTimeCount > 0 ? Math.round(ts.closeTimeSum / ts.closeTimeCount * 10) / 10 : null };
  }).sort((a, b) => b.open - a.open);

  let sqfVerified = 0;
  data.forEach(r => {
    if (!cellStr(r, ML.TICKET_NO)) return;
    if (cellStr(r, ML.ACTION).toUpperCase() === MANAGER_VERIFIED_ACTION.toUpperCase()) {
      const ts2 = cellDate(r, ML.TIMESTAMP);
      if (ts2 && ts2 >= cutoff) sqfVerified++;
    }
  });

  return {
    summary, tickets, daysBack, generatedAt: fmtTs(new Date()), kpis: kpisOut, statusFunnel,
    trend: { labels: trendLabels, opened: trendOpArr, closed: trendClArr },
    deptVolume: summary.map(s => ({ dept: s.dept, count: s.open + s.waiting + s.closed })),
    equipHotspots, equipHeatmap: { depts: hDepts, types: hTypes, matrix: hMatrix },
    buildingHeatmap: { buildings: bBuildings, zones: bZones, matrix: bHeatmap },
    problemTypes, teamWorkload,
    sqfPack: { verifiedCount: sqfVerified, totalClosed: kpis.closedThisPeriod, openCritical: kpis.critical,
               avgCaDays: avgHrs !== null ? Math.round(avgHrs / 24 * 10) / 10 : null },
  };
}

async function rpcGetEMRLData(args, ctx) {
  requireTech(ctx.user);
  const params = args[0] || {};
  const filterTicket = String(params.ticketNo  || '').trim().toUpperCase();
  const filterDept   = String(params.dept      || '').trim().toUpperCase();
  const filterEquip  = String(params.equipType || '').trim().toUpperCase();
  const filterFrom   = params.dateFrom ? new Date(params.dateFrom) : null;
  let   filterTo     = params.dateTo   ? new Date(params.dateTo)   : null;
  if (filterTo) filterTo.setHours(23, 59, 59, 999);
  const limit = Math.min(parseInt(params.limit || '200', 10), 500);

  // CS_ rows start at col 1, data from row QUEUE_FROZEN+1.
  const all = await readSheet(ctx.token, ctx.env.SPREADSHEET_ID, SH.CLOSED, `A${QUEUE_FROZEN + 1}:AC`);
  const records = [];
  for (let i = 0; i < all.length && records.length < limit; i++) {
    const r = all[i];
    const ticketNo = cellStr(r, CS.TICKET_NO);
    if (!ticketNo) continue;
    const dept = cellStr(r, CS.DEPT);
    const equipType = cellStr(r, CS.EQUIP_TYPE);
    const repairDate = cellDate(r, CS.REPAIR_DATE);

    if (filterTicket && ticketNo.toUpperCase().indexOf(filterTicket) === -1) continue;
    if (filterDept   && dept.toUpperCase().indexOf(filterDept) === -1) continue;
    if (filterEquip  && equipType.toUpperCase().indexOf(filterEquip) === -1) continue;
    if (filterFrom   && repairDate && repairDate < filterFrom) continue;
    if (filterTo     && repairDate && repairDate > filterTo) continue;

    records.push({
      ticketNo, status: cellStr(r, CS.STATUS), priority: cellStr(r, CS.PRIORITY), dept,
      buildingZone: cellStr(r, CS.BUILDING_ZONE), equipType, equipCode: cellStr(r, CS.EQUIP_CODE),
      specificEquip: cellStr(r, CS.SPECIFIC_EQUIP), downtimeType: cellStr(r, CS.DOWNTIME_TYPE),
      addedBy: cellStr(r, CS.ADDED_BY), dateOpened: fmtCellDate(r, CS.DATE_OPENED),
      problemType: cellStr(r, CS.PROBLEM_TYPE), description: cellStr(r, CS.DESCRIPTION),
      lineNo: cellStr(r, CS.LINE_NO), estHours: r[CS.EST_HOURS - 1] || '', actualHours: r[CS.ACTUAL_HOURS - 1] || '',
      repairComplete: cellStr(r, CS.REPAIR_COMPLETE), completedBy: cellStr(r, CS.COMPLETED_BY),
      repairDate: fmtDate(repairDate), partsUsed: cellStr(r, CS.PARTS_USED),
      correctiveAct: cellStr(r, CS.CORRECTIVE), capaRequired: cellStr(r, CS.CAPA_REQ),
      rootCause: cellStr(r, CS.ROOT_CAUSE), preventiveAct: cellStr(r, CS.PREVENTIVE),
      checklist: cellStr(r, CS.CHECKLIST), verifiedBy: cellStr(r, CS.VERIFIED_BY),
      verifiedDate: fmtCellDate(r, CS.VERIFIED_DATE), notes: cellStr(r, CS.NOTES),
    });
  }
  return { records };
}

function emptyReport(daysBack) {
  return {
    summary: [], tickets: [], daysBack: daysBack || 30, generatedAt: fmtTs(new Date()),
    kpis: { totalOpen: 0, critical: 0, avgTimeToClose: null, tempFix: 0, partsPending: 0, closedThisPeriod: 0 },
    statusFunnel: { waiting: 0, open: 0, pendingVerify: 0, pendingParts: 0, onHold: 0, closed: 0, voided: 0 },
    trend: { labels: [], opened: [], closed: [] }, deptVolume: [], equipHotspots: [],
    equipHeatmap: { depts: [], types: [], matrix: {} }, buildingHeatmap: { buildings: [], zones: [], matrix: {} },
    problemTypes: [], teamWorkload: [], sqfPack: { verifiedCount: 0, totalClosed: 0, openCritical: 0, avgCaDays: null },
  };
}

// ── RPC dispatch table ───────────────────────────────────────────────────────

const READ_HANDLERS = {
  getQueueTickets:             rpcGetQueueTickets,
  getTicketDetail:             rpcGetTicketDetail,
  getClosedTickets:            rpcGetClosedTickets,
  getEquipTicketHistory:       rpcGetEquipTicketHistory,
  getTempFixItems:             rpcGetTempFixItems,
  getEquipHoldItems:           rpcGetEquipHoldItems,
  getPartsItems:               rpcGetPartsItems,
  getAddTicketFormData:        rpcGetAddTicketFormData,
  getEquipQuickStats:          rpcGetEquipQuickStats,
  getTechWorkBoardData:        rpcGetTechWorkBoardData,
  getAdminViewData:            rpcGetAdminViewData,
  getEquipmentInventoryPageData: rpcGetEquipmentInventoryPageData,
  getEquipCacheStatus:         rpcGetEquipCacheStatus,
  getReportData:               rpcGetReportData,
  getEMRLData:                 rpcGetEMRLData,
};

// Write functions are recognised but intentionally NOT executed: this
// deployment uses a read-only Sheets scope and must never mutate the
// production sheet untested. They fail safe with a clear message.
const WRITE_FNS = new Set([
  'addNewTicket', 'approveTicket', 'completeTicket', 'verifyAndCloseTicket', 'voidTicket',
  'requestParts', 'updateTicket', 'assignTicket', 'flagTempFix', 'transferTicket',
  'deptSignOff', 'confirmJointRequest', 'rejectJointRequest', 'makeJointTicket',
  'inspectTempFix', 'clearTempFix', 'clearEquipTag', 'issueEquipHoldTag', 'updatePartsStatus',
  'monthlyRollover', 'refreshEquipCache', 'submitServiceReport', 'updateEmrlRecord',
  'repairTrackerGroup', 'setupTechDirectoryTab',
]);

async function handleRpc(env, userEmail, body) {
  const fn = body && body.fn;
  const args = (body && body.args) || [];
  if (!fn) return jsonResponse({ error: 'Missing function name' }, 400);

  if (WRITE_FNS.has(fn) && !READ_HANDLERS[fn]) {
    return jsonResponse({
      error: `“${fn}” changes data, which is not enabled in this read-only GitHub Pages ` +
             `deployment yet. Viewing works; write actions are intentionally disabled to ` +
             `protect the live sheet.`,
    }, 200);
  }
  if (!READ_HANDLERS[fn]) {
    return jsonResponse({ error: 'Unknown function: ' + fn }, 400);
  }

  const token = await getAccessToken(env);
  const [user, deptMap] = await Promise.all([
    resolveUser(token, env, userEmail),
    getDeptMapping(token, env),
  ]);
  if (user.role === 'noaccess') return jsonResponse({ error: 'UNAUTHORIZED' }, 403);

  const result = await READ_HANDLERS[fn](args, { user, token, env, deptMap });
  return jsonResponse({ result });
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

    const url       = new URL(request.url);
    const userEmail = request.headers.get('X-User-Email') || '';

    let res;
    try {
      if (request.method === 'POST' && url.pathname === '/api/rpc') {
        const body = await request.json().catch(() => ({}));
        res = await handleRpc(env, userEmail, body);
      } else if (request.method === 'GET' && url.pathname === '/api/version') {
        res = handleVersion(env);
      } else if (request.method === 'GET' && url.pathname === '/api/me') {
        res = await handleMe(env, userEmail);
      } else if (request.method === 'GET' && url.pathname === '/api/dashboard/counts') {
        res = await handleDashboardCounts(env, userEmail);
      } else if (request.method === 'GET' && url.pathname === '/api/dashboard/panels') {
        res = await handleDashboardPanels(env, userEmail);
      } else {
        res = jsonResponse({ error: 'Not found' }, 404);
      }
    } catch (e) {
      res = jsonResponse({ error: e.message }, 500);
    }

    res.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    return res;
  },
};
