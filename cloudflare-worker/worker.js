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
};

const TF = {
  TEMP_ID:1, TICKET_NO:2, EQUIP_CODE:3, SPECIFIC_EQUIP:4,
  DEPT:5, BUILDING_ZONE:6, DATE_FLAGGED:7, DESCRIPTION:8,
  TEMP_FIX_DESC:9, FREQ_DAYS:10, LAST_INSPECTED:11, NEXT_DUE:12,
  STATUS:13, FLAGGED_BY:14, CLEARED_BY:15, CLEARED_DATE:16, NOTES:17,
};

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
};

const HIST_HEADER_ROW = 5; // data starts at row HIST_HEADER_ROW + 1

// Sheet tab names (exact match to Config.gs SH object)
const SH = {
  MASTER_LOG:     '🗄️ Master Log',
  TEMP_FIX:       '🔧 Temp Fix Monitor',
  PARTS_NEEDED:   '🔩 Parts Needed',
  EQUIP_HOLD_LOG: '🏷️ Equipment Hold Log',
  MANAGER_ACCESS: '👔 Manager Access',
  CONFIG:         '⚙️ Configuration',
};

// ── Cell helpers ──────────────────────────────────────────────────────────────

function cellStr(row, colOneBased) {
  const v = row[colOneBased - 1];
  return v != null ? String(v).trim() : '';
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
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
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
  if (!res.ok) throw new Error(`Sheets API error (${sheetName}): ${await res.text()}`);
  return (await res.json()).values || [];
}

// ── User / role resolution ────────────────────────────────────────────────────

async function resolveUser(token, env, userEmail) {
  const email = (userEmail || '').trim().toLowerCase();

  const [configRows, managerRows] = await Promise.all([
    readSheet(token, env.SPREADSHEET_ID, SH.CONFIG, 'C2:D30'),
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
    ownedDepts  = String(r[4] || '').split(',')
      .map(d => d.trim().toUpperCase()).filter(Boolean);
  });

  return { email, isAdmin, isManager, ownedDepts, displayName };
}

function allowed(user, dept) {
  return user.isAdmin || user.ownedDepts.includes(dept.toUpperCase().trim());
}

// ── Handlers ──────────────────────────────────────────────────────────────────

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

  if (isAdmin) ownedDepts = ['ELECTRICAL', 'MACHINE SHOP', 'FACILITIES', 'PLASTICS', 'METALS', 'LITHO'];

  if (!displayName) {
    displayName = email.split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  const initials = displayName.trim().split(/\s+/)
    .map(w => w[0] || '').join('').substring(0, 2).toUpperCase() || '?';

  const user = { email, displayName, initials, role,
                 isAdmin, isManager: isManager || isAdmin, ownedDepts, teamEmails };

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

  // Collapse ML rows per ticket; latest non-empty value wins
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
    const opened = fmtDate(cellDate(r, ML.DATE_OPENED));

    if (status === 'WAITING' && attentionItems.length < 8) {
      attentionItems.push({
        kind: 'review', ticketNo: tn,
        title: equip || desc || tn,
        sub: dept + (code ? ' · ' + code : '') + (prio ? ' · ' + prio + ' priority' : '') + ' — awaiting approval',
        action: 'Approve', pageTarget: 'waiting',
      });
    } else if (status === 'PENDING VERIFICATION' && attentionItems.length < 8) {
      attentionItems.push({
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
    if (attentionItems.length >= 8) return;
    const equip = cellStr(r, TF.SPECIFIC_EQUIP);
    const due   = fmtDate(cellDate(r, TF.NEXT_DUE));
    attentionItems.push({
      kind: 'temp', ticketNo: cellStr(r, TF.TICKET_NO),
      title: tempId + (equip ? ' — ' + equip : ''),
      sub: dept + ' · Temp fix PAST DUE' + (due ? ' (due ' + due + ')' : '') + ' — Maintenance Program 030',
      action: 'Inspect', pageTarget: 'tempfix',
    });
  });

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
    sub: cellStr(r, ML.DEPT) + (cellStr(r, ML.EQUIP_CODE) ? ' · ' + cellStr(r, ML.EQUIP_CODE) : '') +
         ' — requesting your dept: ' + myDepts.join(', '),
    action: 'Review',
  }));

  // Chronic equipment: 3+ distinct tickets in last 90 days
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

// ── Main export ───────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin':  allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-User-Email',
          'Access-Control-Max-Age':       '86400',
        },
      });
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const url       = new URL(request.url);
    const userEmail = request.headers.get('X-User-Email') || '';

    let res;
    try {
      if      (url.pathname === '/api/version')           res = handleVersion(env);
      else if (url.pathname === '/api/me')                res = await handleMe(env, userEmail);
      else if (url.pathname === '/api/dashboard/counts')  res = await handleDashboardCounts(env, userEmail);
      else if (url.pathname === '/api/dashboard/panels')  res = await handleDashboardPanels(env, userEmail);
      else                                                res = jsonResponse({ error: 'Not found' }, 404);
    } catch (e) {
      res = jsonResponse({ error: e.message }, 500);
    }

    res.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    return res;
  },
};
