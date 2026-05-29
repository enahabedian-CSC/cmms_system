// Screen 7 — Department Tracker (template, switches dept)
const DEPTS = ['Machine Shop','Electrical','Facilities','Plastics','Metals','Litho'];

const DeptTracker = ({ initial = 'Plastics' }) => {
  const [dept, setDept] = React.useState(initial);
  const KEY = dept.toUpperCase();
  const counts = window.CSC_DATA.DEPT_COUNTS[KEY] || window.CSC_DATA.DEPT_COUNTS['PLASTICS'];
  const tickets = window.CSC_DATA.TICKETS.filter(t => (t.dept || '').toUpperCase().includes(KEY.split(' ')[0]));
  const watchlist = tickets.filter(t => ['CRITICAL','HIGH'].includes(t.priority) && t.status !== 'CLOSED');

  return (
    <div className="page-inner wide">
      <div className="page-header">
        <div>
          <div className="crumbs"><span>Trackers</span><span className="sep">/</span><span>{dept}</span></div>
          <h1>{dept} Tracker</h1>
          <p className="sub">Live operational view scoped to {dept.toLowerCase()}. Counts pulled from the master log; updates streamed.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn"><I.download size={13} /> Export</button>
          <button className="btn-primary btn"><I.plus size={13} /> New Ticket</button>
        </div>
      </div>

      <div className="tab-strip">
        {DEPTS.map(d => (
          <div key={d} className={`tab ${dept === d ? 'active' : ''}`} onClick={() => setDept(d)}>
            {d}
            <span className="ct">{(window.CSC_DATA.DEPT_COUNTS[d.toUpperCase()] || {open:0}).open}</span>
          </div>
        ))}
      </div>

      <div className="dept-strip">
        <div className="cell"><div className="lbl">Total</div><div className="v tnum">{counts.total}</div></div>
        <div className="cell"><div className="lbl">Open</div><div className="v tnum">{counts.open}</div></div>
        <div className="cell crit"><div className="lbl">Critical</div><div className="v tnum">{counts.crit}</div></div>
        <div className="cell high"><div className="lbl">High</div><div className="v tnum">{counts.high}</div></div>
        <div className="cell warn"><div className="lbl">Pending Parts</div><div className="v tnum">{counts.parts}</div></div>
        <div className="cell warn"><div className="lbl">On Hold</div><div className="v tnum">{counts.hold}</div></div>
        <div className="cell"><div className="lbl">Complete</div><div className="v tnum">{counts.complete}</div></div>
        <div className="cell"><div className="lbl">Waiting</div><div className="v tnum">{counts.waiting}</div></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.7fr 1fr', gap: 16 }}>
        <div className="col">
          <div className="card">
            <div className="card-header">
              <div><h3 style={{ display:'flex', alignItems:'center', gap: 6 }}><span style={{ color:'var(--status-high)' }}><I.alert size={14} /></span> Priority watch list</h3><div className="sub">Critical &amp; high · across {dept.toLowerCase()}</div></div>
            </div>
            <div className="card-body flush">
              {watchlist.length === 0 ? (
                <EmptyState icon={<I.checkCircle size={28} />} title="Nothing critical or high" desc="No urgent tickets in this department." />
              ) : (
                <table className="tbl">
                  <thead><tr><th>Ticket</th><th>Priority</th><th>Status</th><th>Equipment</th><th>Tag</th><th>Assigned</th><th className="right">Age</th></tr></thead>
                  <tbody>
                    {watchlist.map(t => (
                      <tr key={t.id}>
                        <td className="mono" style={{ color:'var(--brand-navy)', fontWeight: 600 }}>{t.id}</td>
                        <td><PriorityChip p={t.priority} /></td>
                        <td><StatusPill s={t.status} /></td>
                        <td><div className="cell-stack"><span style={{ fontWeight: 500 }}>{t.equipment}</span><span className="meta mono">{t.code}</span></div></td>
                        <td>{t.tagColor ? <HoldTag c={t.tagColor} label={t.tagColor.toUpperCase()} /> : <span className="tertiary">—</span>}</td>
                        <td><div className="cell-row"><Avatar initials={t.assignedInit} size="sm" /><span style={{ fontSize: 12 }}>{t.assigned.split(' ')[0]}</span></div></td>
                        <td className="right mono tnum">{t.age}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div><h3>All open tickets</h3><div className="sub">{tickets.filter(t=>t.status!=='CLOSED').length} active</div></div>
            </div>
            <div className="card-body flush">
              <table className="tbl">
                <thead><tr><th>Ticket</th><th>Priority</th><th>Status</th><th>Equipment</th><th>Problem</th><th>Assigned</th><th className="right">Age</th></tr></thead>
                <tbody>
                  {tickets.filter(t => t.status !== 'CLOSED').map(t => (
                    <tr key={t.id}>
                      <td className="mono" style={{ color:'var(--brand-navy)', fontWeight: 600 }}>{t.id}</td>
                      <td><PriorityChip p={t.priority} /></td>
                      <td><StatusPill s={t.status} /></td>
                      <td><div className="cell-stack"><span style={{ fontWeight: 500 }}>{t.equipment}</span><span className="meta mono">{t.code}</span></div></td>
                      <td className="truncate" style={{ maxWidth: 240, fontSize: 12, color:'var(--text-secondary)' }}>{t.problemType}</td>
                      <td><div className="cell-row"><Avatar initials={t.assignedInit} size="sm" /><span style={{ fontSize: 12 }}>{t.assigned.split(' ')[0]}</span></div></td>
                      <td className="right mono tnum">{t.age}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card">
            <div className="card-header"><div><h3>Monthly trend</h3><div className="sub">Tickets opened · last 12 weeks</div></div></div>
            <div className="card-body">
              <div style={{ fontSize: 22, fontWeight: 700 }} className="tnum">+18% <span style={{ fontSize: 11, color:'var(--text-secondary)', fontWeight: 500 }}>vs prior 12 wk</span></div>
              <Sparkline values={[6,5,7,8,7,9,8,11,10,12,11,13]} stroke="#001F4F" fill="rgba(0,31,79,0.10)" height={56} width={300} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div><h3>Top recurring equipment</h3><div className="sub">In {dept.toLowerCase()} · last 90 days</div></div></div>
            <div className="card-body">
              <div className="bar-h">
                {window.CSC_DATA.REC_EQUIP.filter(e => (KEY.includes('PLAST') ? e.dept === 'PLASTICS' : KEY.includes('METAL') ? e.dept === 'METAL' : KEY.includes('MACHINE') ? e.dept === 'MACHINE SHOP' : KEY.includes('LITHO') ? e.dept === 'LITHO' : true)).slice(0, 5).map((e, i) => (
                  <div className="row" key={i}>
                    <span className="nm" title={e.name} style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.name.split(' (')[0]}</span>
                    <div className="bar"><span style={{ width: `${(e.count / 6) * 100}%`, background: e.chronic ? 'var(--status-critical)' : 'var(--brand-navy)' }}></span></div>
                    <span className="ct">{e.count}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color:'var(--text-tertiary)', marginTop: 8 }}><span style={{ color:'var(--status-critical)' }}>●</span> chronic (≥3 in 90d)</div>
            </div>
          </div>

          <div className="insight">
            <span className="ai-tag">Insight</span>
            <div className="text">{dept} accounts for <strong>{Math.round(counts.total / 0.74)}%</strong> of the open ticket pool. Two equipment classes (Mold #48-E and Blender No. 3) are driving most of the volume.</div>
          </div>
        </div>
      </div>
      <SQFFooter />
    </div>
  );
};

window.DeptTracker = DeptTracker;
