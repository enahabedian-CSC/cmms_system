// Shared icon set + small components for CSC CMMS
// Lucide-style stroke icons inline as React components.
const Icon = ({ d, size = 16, stroke = 'currentColor', sw = 1.75, fill = 'none', children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children || <path d={d} />}
  </svg>
);
const I = {
  home: (p) => <Icon {...p}><path d="M3 12 12 3l9 9"/><path d="M5 10v10h14V10"/></Icon>,
  ticket: (p) => <Icon {...p}><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z"/><path d="M13 6v12"/></Icon>,
  inbox: (p) => <Icon {...p}><path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14l2 7v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6Z"/></Icon>,
  list: (p) => <Icon {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></Icon>,
  plus: (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  layers: (p) => <Icon {...p}><path d="m12 2 10 6-10 6L2 8z"/><path d="m2 14 10 6 10-6"/><path d="m2 11 10 6 10-6"/></Icon>,
  box: (p) => <Icon {...p}><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/></Icon>,
  parts: (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></Icon>,
  flag: (p) => <Icon {...p}><path d="M4 21v-7M4 14V3l7 4 9-3v11l-9 3-7-4Z"/></Icon>,
  chart: (p) => <Icon {...p}><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 5-7"/></Icon>,
  cog: (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></Icon>,
  search: (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></Icon>,
  bell: (p) => <Icon {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></Icon>,
  chevronDown: (p) => <Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>,
  chevronRight: (p) => <Icon {...p}><path d="m9 6 6 6-6 6"/></Icon>,
  chevronLeft: (p) => <Icon {...p}><path d="m15 6-6 6 6 6"/></Icon>,
  filter: (p) => <Icon {...p}><path d="M3 5h18l-7 9v6l-4-2v-4Z"/></Icon>,
  download: (p) => <Icon {...p}><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></Icon>,
  upload: (p) => <Icon {...p}><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/></Icon>,
  user: (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Icon>,
  users: (p) => <Icon {...p}><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M17 11a4 4 0 0 0 0-8"/><path d="M22 21a7 7 0 0 0-5-6.7"/></Icon>,
  clock: (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>,
  alert: (p) => <Icon {...p}><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z"/></Icon>,
  check: (p) => <Icon {...p}><path d="m5 12 5 5L20 7"/></Icon>,
  checkCircle: (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></Icon>,
  x: (p) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12"/></Icon>,
  edit: (p) => <Icon {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></Icon>,
  refresh: (p) => <Icon {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></Icon>,
  arrowUp: (p) => <Icon {...p}><path d="M12 19V5M5 12l7-7 7 7"/></Icon>,
  arrowDown: (p) => <Icon {...p}><path d="M12 5v14M5 12l7 7 7-7"/></Icon>,
  arrowRight: (p) => <Icon {...p}><path d="M5 12h14M13 5l7 7-7 7"/></Icon>,
  send: (p) => <Icon {...p}><path d="m22 2-11 11"/><path d="M22 2 15 22l-4-9-9-4Z"/></Icon>,
  camera: (p) => <Icon {...p}><path d="M3 9V7a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="13" r="4"/></Icon>,
  paperclip: (p) => <Icon {...p}><path d="M21 12.79V7a5 5 0 1 0-10 0v11a3 3 0 1 0 6 0V8a1 1 0 1 0-2 0v9"/></Icon>,
  building: (p) => <Icon {...p}><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 9h2a2 2 0 0 1 2 2v10"/><path d="M8 7h.01M8 11h.01M8 15h.01M12 7h.01M12 11h.01M12 15h.01"/></Icon>,
  tag: (p) => <Icon {...p}><path d="M20.59 13.41 12 22l-9-9V3h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7.5" cy="7.5" r="1.5"/></Icon>,
  wrench: (p) => <Icon {...p}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.4-.4-2.6 2.4-2.4Z"/></Icon>,
  pause: (p) => <Icon {...p}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></Icon>,
  shield: (p) => <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></Icon>,
  brain: (p) => <Icon {...p}><path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v15A2.5 2.5 0 0 0 9.5 22h5a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 14.5 2Z"/><path d="M5 8h2M5 12h2M5 16h2M17 8h2M17 12h2M17 16h2"/></Icon>,
  trend: (p) => <Icon {...p}><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></Icon>,
  database: (p) => <Icon {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></Icon>,
  link: (p) => <Icon {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></Icon>,
  dot: (p) => <Icon {...p}><circle cx="12" cy="12" r="3" fill="currentColor"/></Icon>,
  more: (p) => <Icon {...p}><circle cx="12" cy="6" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="18" r="1.2" fill="currentColor"/></Icon>,
};
window.I = I;

// Status / priority pill renderers
const statusClass = (s) => {
  const map = {
    'WAITING': 's-waiting', 'OPEN': 's-open', 'PENDING PARTS': 's-pending-parts',
    'ON HOLD': 's-on-hold', 'COMPLETE': 's-complete', 'CLOSED': 's-closed'
  };
  return map[s] || 's-open';
};
const StatusPill = ({ s }) => <span className={`pill ${statusClass(s)}`}>{s}</span>;
const PriorityChip = ({ p }) => {
  if (!p) return <span className="chip p-none">—</span>;
  const cls = { CRITICAL:'p-critical', HIGH:'p-high', MEDIUM:'p-medium', LOW:'p-low' }[p] || 'p-low';
  return <span className={`chip ${cls}`}>{p}</span>;
};
const HoldTag = ({ c, label }) => {
  if (!c) return null;
  const labelMap = { red:'Red · Out of Service', yellow:'Yellow · Caution', orange:'Orange · Temp Fix', green:'Green · Cleared' };
  return <span className={`hold-tag ${c}`}>{label || labelMap[c]}</span>;
};
const Avatar = ({ initials, size = 'sm', tone }) => (
  <div className={`avatar ${size}`} style={tone ? { background: tone } : undefined}>{initials}</div>
);
const DeptTrail = ({ trail }) => (
  <span className="dept-trail">
    {trail.map((s, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span className="arr">›</span>}
        <span className={`step ${i === trail.length - 1 ? 'cur' : ''}`}>{s}</span>
      </React.Fragment>
    ))}
  </span>
);

// Sparkline svg
const Sparkline = ({ values, stroke = '#001F4F', fill = 'rgba(0,31,79,0.10)', height = 28, width = 100 }) => {
  const max = Math.max(...values), min = Math.min(...values), range = max - min || 1;
  const step = width / (values.length - 1 || 1);
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  const area = `0,${height} ${points} ${width},${height}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="spark">
      <polygon points={area} fill={fill} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
};

// Empty state
const EmptyState = ({ icon, title, desc, cta }) => (
  <div className="empty">
    <div className="icon">{icon}</div>
    <div className="title">{title}</div>
    <div className="desc">{desc}</div>
    {cta}
  </div>
);

// Toggle
const Toggle = ({ on, onChange, label }) => (
  <label className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange?.(!on)}>
    <span className="knob"></span>
    {label && <span>{label}</span>}
  </label>
);

window.StatusPill = StatusPill;
window.PriorityChip = PriorityChip;
window.HoldTag = HoldTag;
window.Avatar = Avatar;
window.DeptTrail = DeptTrail;
window.Sparkline = Sparkline;
window.EmptyState = EmptyState;
window.Toggle = Toggle;
