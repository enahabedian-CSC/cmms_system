// Sidebar + Topbar + Page wrapper
const SIDEBAR_NAV = [
  { id: 'home', label: 'Home', icon: I.home },
  { id: 'tickets', label: 'Tickets', icon: I.ticket, sub: [
    { id: 'waiting', label: 'Waiting Queue', badge: 4 },
    { id: 'open', label: 'Open', badge: 22 },
    { id: 'closed', label: 'Closed' },
  ]},
  { id: 'submit', label: 'Submit Ticket', icon: I.plus },
  { id: 'trackers', label: 'Trackers', icon: I.layers, sub: [
    { id: 'tracker-machine', label: 'Machine Shop' },
    { id: 'tracker-electrical', label: 'Electrical' },
    { id: 'tracker-facilities', label: 'Facilities' },
    { id: 'tracker-plastics', label: 'Plastics' },
    { id: 'tracker-metals', label: 'Metals' },
    { id: 'tracker-litho', label: 'Litho' },
  ]},
  { id: 'equipment', label: 'Equipment', icon: I.box, sub: [
    { id: 'equipment-inventory', label: 'Inventory' },
    { id: 'equipment-hold', label: 'Hold Log' },
  ]},
  { id: 'parts', label: 'Parts', icon: I.parts },
  { id: 'tempfix', label: 'Temp Fix Monitor', icon: I.flag, badgeDanger: 2 },
  { id: 'reports', label: 'Reports', icon: I.chart },
  { id: 'admin', label: 'Admin', icon: I.cog, sub: [
    { id: 'admin-config', label: 'Configuration' },
    { id: 'admin-users', label: 'User Access' },
    { id: 'admin-deptmap', label: 'Department Map' },
  ]},
];

const Sidebar = ({ active, onNav, manager, onChangeManager }) => {
  const [openSec, setOpenSec] = React.useState({ tickets: true, trackers: false, equipment: false, admin: false });
  const isSubActive = (sub) => sub?.some((s) => s.id === active);
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logomark">CSC</div>
          <div className="sidebar-wordmark">
            Container Supply<span className="sub">Maintenance Ops</span>
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {SIDEBAR_NAV.map((n) => {
          const open = openSec[n.id];
          const isActive = active === n.id || (n.sub && isSubActive(n.sub));
          return (
            <div key={n.id} className="nav-section">
              <div
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (n.sub) setOpenSec({ ...openSec, [n.id]: !open });
                  else onNav(n.id);
                }}
              >
                <span className="nav-icon"><n.icon size={15} /></span>
                <span className="nav-label">{n.label}</span>
                {n.badgeDanger && <span className="nav-badge danger">{n.badgeDanger}</span>}
                {n.sub && (
                  <span style={{ color: 'var(--text-onnavy-dim)' }}>
                    <I.chevronDown size={12} />
                  </span>
                )}
              </div>
              {n.sub && (open || isActive) && (
                <div className="nav-subitems">
                  {n.sub.map((s) => (
                    <div
                      key={s.id}
                      className={`nav-subitem ${active === s.id ? 'active' : ''}`}
                      onClick={() => onNav(s.id)}
                    >
                      <span>{s.label}</span>
                      {s.badge != null && <span className="nav-badge">{s.badge}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <Avatar initials={manager.initials} size="md" />
        <div className="user-meta">
          <div className="name">{manager.name}</div>
          <div className="role">{manager.role}</div>
        </div>
        <button className="topbar-icon-btn" title="Switch manager" onClick={() => onChangeManager?.()} style={{ color: 'var(--text-onnavy-dim)' }}>
          <I.refresh size={14} />
        </button>
      </div>
    </aside>
  );
};

const Topbar = ({ ticketCount, manager, view, onView }) => (
  <header className="topbar">
    <div className="topbar-search">
      <span className="topbar-search-icon"><I.search size={14} /></span>
      <input placeholder="Search tickets, equipment, parts…" />
      <span className="kbd">⌘K</span>
    </div>
    <div className="topbar-spacer"></div>
    {view && (
      <div className="view-toggle" title="Scope">
        <button className={view === 'mine' ? 'active' : ''} onClick={() => onView('mine')}>My View</button>
        <button className={view === 'all' ? 'active' : ''} onClick={() => onView('all')}>All</button>
      </div>
    )}
    <div className="topbar-live">
      <span className="live-dot"></span>
      <span>Live as of <span className="mono">14:42:08</span></span>
    </div>
    <button className="topbar-icon-btn" title="Notifications">
      <I.bell size={16} />
      <span className="badge"></span>
    </button>
    <div className="topbar-divider"></div>
    <div className="topbar-user">
      <Avatar initials={manager.initials} size="sm" />
      <div>
        <div className="name">{manager.name.split(' ')[0]}</div>
      </div>
      <I.chevronDown size={12} />
    </div>
  </header>
);

const PageShell = ({ manager, active, onNav, onChangeManager, view, onView, children }) => (
  <div className="app">
    <Sidebar active={active} onNav={onNav} manager={manager} onChangeManager={onChangeManager} />
    <div className="main">
      <Topbar manager={manager} view={view} onView={onView} />
      <div className="page">{children}</div>
    </div>
  </div>
);

const SQFFooter = () => (
  <div className="sqf-footer">
    <span>FRM-030-001 Maintenance Ticket</span>
    <span>FRM-040-002 Service Report</span>
    <span>FRM-029-001 Equipment Hold Tag</span>
    <span>Maintenance Program 030 — Temp Fix Compliance</span>
    <span style={{ marginLeft: 'auto' }}>SQF audit trail · v2026.05 · Container Supply Co. — Garden Grove, CA</span>
  </div>
);

window.PageShell = PageShell;
window.SQFFooter = SQFFooter;
