// Screens 3 & 4: Waiting Queue + Open Tickets, share table chrome
const TableToolbar = ({ filters = [], count, right }) => (
  <div className="tbl-toolbar">
    {filters.map((f, i) => (
      <button key={i} className="filter">
        <span className="lbl">{f.lbl}:</span>
        <span className="val">{f.val}</span>
        <I.chevronDown size={11} />
      </button>
    ))}
    <span className="spacer"></span>
    <span className="count">{count}</span>
    {right}
  </div>
);

const WaitingQueue = ({ onOpenTicket }) => {
  const T = window.CSC_DATA.TICKETS.filter(t => t.status === 'WAITING');
  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <div className="crumbs"><span>Tickets</span><span className="sep">/</span><span>Waiting Queue</span></div>
          <h1>Waiting Queue</h1>
          <p className="sub">Tickets pending manager review · <strong>CRITICAL bypasses this queue</strong> and routes direct to Open. Sources: internal manager-created and <span className="mono">[EXT]</span> external sync.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn"><I.download size={13} /> Export</button>
          <button className="btn-primary btn"><I.check size={13} /> Bulk Approve</button>
        </div>
      </div>

      <div className="card">
        <TableToolbar
          filters={[
            { lbl:'Source', val:'All' }, { lbl:'Department', val:'All' }, { lbl:'Priority', val:'All' }, { lbl:'Submitted', val:'7d' },
          ]}
          count={`${T.length} waiting · oldest 1d 4h`}
        />
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr>
              <th style={{ width: 36 }}><input type="checkbox" /></th>
              <th>Ticket</th><th>Source</th><th>Dept</th><th>Equipment</th><th>Problem Description</th><th>Submitted by</th><th>Priority</th><th className="right">Age</th><th></th>
            </tr></thead>
            <tbody>
              {T.map((t) => (
                <tr key={t.id} onClick={() => onOpenTicket?.(t)}>
                  <td onClick={e=>e.stopPropagation()}><input type="checkbox" /></td>
                  <td className="mono" style={{ color: 'var(--brand-navy)', fontWeight: 600 }}>{t.id}</td>
                  <td>
                    {t.source === 'External' ?
                      <span className="mono" style={{ fontSize: 10.5, padding:'1px 6px', background:'#FEF3C7', color:'#92400E', borderRadius: 3 }}>[EXT]</span> :
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>Internal</span>}
                  </td>
                  <td><DeptTrail trail={t.deptTrail} /></td>
                  <td>
                    <div className="cell-stack">
                      <span style={{ fontWeight: 500 }}>{t.equipment}</span>
                      <span className="meta mono">{t.code}</span>
                    </div>
                  </td>
                  <td className="truncate" style={{ maxWidth: 320, color: 'var(--text-secondary)', fontSize: 12 }}>{t.desc}</td>
                  <td>{t.source === 'External' ? 'Cathy Tran' : 'Felipe Vasquez'}</td>
                  <td><PriorityChip p={t.priority} /></td>
                  <td className="right mono tnum">{t.age}</td>
                  <td><I.chevronRight size={14} /></td>
                </tr>
              ))}
              {/* Show what a critical-bypass row would look like, greyed */}
              <tr style={{ background: 'var(--bg-subtle)', cursor: 'default' }}>
                <td colSpan={10} style={{ color: 'var(--text-secondary)', fontSize: 11.5, textAlign: 'center', padding: '10px 12px' }}>
                  <I.alert size={12} /> &nbsp;1 ticket tonight bypassed this queue (CRITICAL · MT-007-260505-001 · Seamer No. 2) — routed direct to Open and to Eddie Nahabedian.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <SQFFooter />
    </div>
  );
};

const OpenTickets = ({ onOpenTicket }) => {
  const T = window.CSC_DATA.TICKETS.filter(t => ['OPEN','PENDING PARTS','ON HOLD','COMPLETE'].includes(t.status));
  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <div className="crumbs"><span>Tickets</span><span className="sep">/</span><span>Open</span></div>
          <h1>Open Tickets</h1>
          <p className="sub">All currently active maintenance tickets · 22 open · 4 with active equipment tags · 1 critical · use bulk-select to reassign.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn"><I.download size={13} /> Export</button>
          <button className="btn"><I.users size={13} /> Bulk Reassign</button>
          <button className="btn-primary btn"><I.plus size={13} /> New Ticket</button>
        </div>
      </div>

      <div className="card">
        <TableToolbar
          filters={[
            { lbl:'Department', val:'All (6)' },
            { lbl:'Priority', val:'All' },
            { lbl:'Assigned to', val:'Anyone' },
            { lbl:'Problem type', val:'All' },
            { lbl:'Date', val:'Last 30d' },
            { lbl:'Has temp fix', val:'Any' },
            { lbl:'Has tag', val:'Any' },
          ]}
          count={`${T.length} tickets`}
        />
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr>
              <th style={{ width: 36 }}><input type="checkbox" /></th>
              <th>Ticket</th><th>Priority</th><th>Status</th><th>Dept</th><th>Equipment</th><th>Problem</th><th>Tag</th><th>Assigned</th><th className="right">Age</th>
            </tr></thead>
            <tbody>
              {T.map((t) => (
                <tr key={t.id} onClick={() => onOpenTicket?.(t)}>
                  <td onClick={e=>e.stopPropagation()}><input type="checkbox" /></td>
                  <td className="mono" style={{ color: 'var(--brand-navy)', fontWeight: 600 }}>{t.id}</td>
                  <td><PriorityChip p={t.priority} /></td>
                  <td><StatusPill s={t.status} /></td>
                  <td><DeptTrail trail={t.deptTrail} /></td>
                  <td>
                    <div className="cell-stack">
                      <span style={{ fontWeight: 500 }}>{t.equipment}</span>
                      <span className="meta mono">{t.code} · {t.building} {t.zone.split(' ')[0]}</span>
                    </div>
                  </td>
                  <td className="truncate" style={{ maxWidth: 240, color: 'var(--text-secondary)', fontSize: 12 }}>{t.problemType} — {t.desc.slice(0, 60)}…</td>
                  <td>{t.tagColor ? <HoldTag c={t.tagColor} label={t.tagColor.toUpperCase()} /> : <span className="tertiary">—</span>}</td>
                  <td><div className="cell-row"><Avatar initials={t.assignedInit} size="sm" /><span style={{ fontSize: 12 }}>{t.assigned.split(' ')[0]}</span></div></td>
                  <td className="right mono tnum">{t.age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <SQFFooter />
    </div>
  );
};

window.WaitingQueue = WaitingQueue;
window.OpenTickets = OpenTickets;
