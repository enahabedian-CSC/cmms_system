// Screens 10, 11, 12 — Parts Lifecycle, Equipment Hold Log, Equipment Detail
const STAGES = ['REQUESTED','ON HOLD FOR APPROVAL','ORDERED','BACKORDERED','RECEIVED','USED'];

const PartsLifecycle = () => {
  const P = window.CSC_DATA.PARTS;
  return (
    <div className="page-inner wide">
      <div className="page-header">
        <div>
          <div className="crumbs"><span>Parts</span></div>
          <h1>Parts lifecycle</h1>
          <p className="sub">Drag a part forward to advance it. Each transition prompts for vendor, PO, and ETA — and offers email notify (default on).</p>
        </div>
        <div className="page-header-actions">
          <button className="btn"><I.filter size={13} /> Filter</button>
          <button className="btn-primary btn"><I.plus size={13} /> Request Part</button>
        </div>
      </div>

      <div className="kanban">
        {STAGES.map(s => {
          const items = P.filter(p => p.stage === s);
          return (
            <div className="kanban-col" key={s}>
              <div className="kanban-col-h">
                <span className="nm">{s}</span>
                <span className="ct">{items.length}</span>
              </div>
              <div className="kanban-list">
                {items.map(p => (
                  <div className="kanban-card" key={p.id}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span className="pid">{p.id}</span>
                      {p.notify && <span title="Email notify on" style={{ color:'var(--status-success)' }}><I.bell size={11} /></span>}
                    </div>
                    <div className="desc">{p.desc}</div>
                    <div className="meta">
                      <span className="mono" style={{ color:'var(--brand-navy)' }}>{p.ticket}</span>
                    </div>
                    <div className="meta" style={{ marginTop: 2 }}>
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.equipment}</span>
                    </div>
                    <div className="meta">
                      <span style={{ fontSize: 10 }}>{p.dept} · {p.vendor}</span>
                      <span className="age">{p.days}d</span>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div style={{ padding: 16, textAlign:'center', fontSize: 11, color:'var(--text-tertiary)' }}>No parts in this stage</div>}
              </div>
            </div>
          );
        })}
      </div>
      <SQFFooter />
    </div>
  );
};

const EquipmentHoldLog = () => {
  const H = window.CSC_DATA.HOLD_TAGS;
  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <div className="crumbs"><span>Equipment</span><span className="sep">/</span><span>Hold Log</span></div>
          <h1>Equipment hold log</h1>
          <p className="sub">FRM-029-001 · all currently-tagged equipment. Only managers can issue a Green Tag to return equipment to service.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn"><I.download size={13} /> Export</button>
          <button className="btn-success btn"><I.check size={13} /> Issue Green Tag</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(5, 1fr)' }}>
        <KPICard label="Active tags" value="5" foot="across 4 depts" accent="critical" />
        <KPICard label="🟥 Red · Out of Service" value="2" foot="oldest 4d" accent="critical" />
        <KPICard label="🟨 Yellow · Caution" value="2" accent="warn" />
        <KPICard label="🟧 Orange · Temp Fix" value="1" foot="re-inspect 5d" accent="" />
        <KPICard label="🟩 Green · Cleared (30d)" value="6" accent="success" />
      </div>

      <div className="card">
        <TableToolbar filters={[{lbl:'Color',val:'All'},{lbl:'Department',val:'All'},{lbl:'Status',val:'Active'}]} count={`${H.filter(h=>!h.cleared).length} active · ${H.filter(h=>h.cleared).length} cleared (last 30d)`} />
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>Tag ID</th><th>Equipment</th><th>Color</th><th>Reason</th><th>Tagged by</th><th>Date</th><th>Linked ticket</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {H.map(h => (
                <tr key={h.tagId}>
                  <td className="mono" style={{ color:'var(--brand-navy)', fontWeight: 600 }}>{h.tagId}</td>
                  <td style={{ fontWeight: 500 }}>{h.equipment}</td>
                  <td><HoldTag c={h.color} /></td>
                  <td className="truncate" style={{ maxWidth: 280, fontSize: 12, color:'var(--text-secondary)' }}>{h.reason}</td>
                  <td>{h.taggedBy}</td>
                  <td className="mono tnum">{h.date}</td>
                  <td className="mono" style={{ color:'var(--brand-navy)' }}>{h.ticket}</td>
                  <td>{h.cleared ? <StatusPill s="CLOSED" /> : <span className="pill s-open">ACTIVE</span>}</td>
                  <td>{!h.cleared && <button className="btn-success btn sm"><I.check size={11} /> Clear</button>}</td>
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

const EquipmentDetail = () => {
  return (
    <div className="page-inner wide">
      <div className="page-header">
        <div>
          <div className="crumbs"><span>Equipment</span><span className="sep">/</span><span>Inventory</span><span className="sep">/</span><span className="mono">003-353</span></div>
          <h1 style={{ display:'flex', alignItems:'center', gap: 10 }}>
            MOLD, #48-D, 4.25 GAL ROUND
            <span className="mono" style={{ fontSize: 14, fontWeight: 500, color: 'var(--brand-navy)' }}>003-353</span>
            <span className="pill s-complete no-dot" style={{ marginLeft: 6 }}>ACTIVE · IN SERVICE</span>
          </h1>
          <p className="sub">METAL · B1 Main · Z2 Metals · acquired 2019-03 · last PM 2026-04-22 · job #48 cost rollup.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn"><I.tag size={13} /> Tag Equipment</button>
          <button className="btn"><I.pause size={13} /> Retire &amp; Archive</button>
          <button className="btn-primary btn"><I.plus size={13} /> New Ticket</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(6, 1fr)' }}>
        <KPICard label="All-time tickets" value="34" foot="since 2019" />
        <KPICard label="Open" value="0" accent="success" foot="cleared yesterday" />
        <KPICard label="Avg time to close" value="2.1d" delta="−0.4d" deltaDir="down" foot="last 12mo" accent="success" />
        <KPICard label="MTBF" value="92d" foot="mean time between failures" />
        <KPICard label="MTTR" value="4.7h" foot="mean time to repair" />
        <KPICard label="Last PM" value="18d" foot="2026-04-22" accent="warn" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap: 16 }}>
        <div className="col">
          <div className="card">
            <div className="card-header">
              <div><h3>Tabs</h3></div>
              <div className="tab-strip" style={{ marginBottom: 0, borderBottom: 0 }}>
                <div className="tab active">History <span className="ct">34</span></div>
                <div className="tab">Parts <span className="ct">12</span></div>
                <div className="tab">Tags <span className="ct">7</span></div>
                <div className="tab">PM Schedule <span className="ct">phase 2</span></div>
              </div>
            </div>
            <div className="card-body flush">
              <table className="tbl">
                <thead><tr><th>Ticket</th><th>Date</th><th>Priority</th><th>Problem</th><th>Tech</th><th>Status</th><th className="right">Hrs</th></tr></thead>
                <tbody>
                  <tr><td className="mono" style={{ color:'var(--brand-navy)', fontWeight:600 }}>MT-003-260506-002</td><td className="mono tnum">2026-05-06</td><td><PriorityChip p="MEDIUM" /></td><td>Mechanical · leader pins fabricated</td><td>Art Ramos</td><td><StatusPill s="COMPLETE" /></td><td className="right mono tnum">9.25</td></tr>
                  <tr><td className="mono" style={{ color:'var(--brand-navy)', fontWeight:600 }}>MT-003-260214-001</td><td className="mono tnum">2026-02-14</td><td><PriorityChip p="LOW" /></td><td>Wear &amp; Tear · ejector bushing replacement</td><td>Felipe Vasquez</td><td><StatusPill s="CLOSED" /></td><td className="right mono tnum">3.5</td></tr>
                  <tr><td className="mono" style={{ color:'var(--brand-navy)', fontWeight:600 }}>MT-003-251108-003</td><td className="mono tnum">2025-11-08</td><td><PriorityChip p="HIGH" /></td><td>Hydraulic · clamp manifold seal kit</td><td>Ismael Silva</td><td><StatusPill s="CLOSED" /></td><td className="right mono tnum">6.0</td></tr>
                  <tr><td className="mono" style={{ color:'var(--brand-navy)', fontWeight:600 }}>MT-003-250722-002</td><td className="mono tnum">2025-07-22</td><td><PriorityChip p="MEDIUM" /></td><td>Preventive · 5,000hr PM</td><td>Justino Flores</td><td><StatusPill s="CLOSED" /></td><td className="right mono tnum">2.0</td></tr>
                  <tr><td className="mono" style={{ color:'var(--brand-navy)', fontWeight:600 }}>MT-003-250318-001</td><td className="mono tnum">2025-03-18</td><td><PriorityChip p="LOW" /></td><td>Operator · misalignment cleared</td><td>Art Ramos Jr.</td><td><StatusPill s="CLOSED" /></td><td className="right mono tnum">0.75</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card">
            <div className="card-header"><div><h3>Equipment record</h3><div className="sub">Job #48 · cost rollup</div></div></div>
            <div className="card-body">
              <div className="photo" style={{ height: 180 }}>equipment photo · mold 48-D</div>
              <div style={{ marginTop: 12, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10, fontSize: 12 }}>
                <div><div style={{ color:'var(--text-secondary)', fontSize: 10.5 }}>Department</div><div>METAL</div></div>
                <div><div style={{ color:'var(--text-secondary)', fontSize: 10.5 }}>Job number</div><div className="mono">48</div></div>
                <div><div style={{ color:'var(--text-secondary)', fontSize: 10.5 }}>Building</div><div>B1 Main</div></div>
                <div><div style={{ color:'var(--text-secondary)', fontSize: 10.5 }}>Zone</div><div>Z2 Metals</div></div>
                <div><div style={{ color:'var(--text-secondary)', fontSize: 10.5 }}>Acquired</div><div className="mono">2019-03-12</div></div>
                <div><div style={{ color:'var(--text-secondary)', fontSize: 10.5 }}>Manufacturer</div><div>Husky / CSC</div></div>
                <div><div style={{ color:'var(--text-secondary)', fontSize: 10.5 }}>Cycles to date</div><div className="mono tnum">412,883</div></div>
                <div><div style={{ color:'var(--text-secondary)', fontSize: 10.5 }}>Owner manager</div><div>Eddie Nahabedian</div></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div><h3>Hold tag history</h3><div className="sub">Last 12 months</div></div></div>
            <div className="card-body" style={{ display:'flex', flexDirection:'column', gap: 10 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap: 10 }}>
                <HoldTag c="green" label="GREEN · CLEARED" />
                <div style={{ flex: 1 }}><div style={{ fontSize: 12 }}>Cleared by Eddie — pins replaced, dim. checked</div><div className="mono" style={{ fontSize: 10.5, color:'var(--text-tertiary)' }}>TAG-2026-0046 · 2026-05-06</div></div>
              </div>
              <div style={{ display:'flex', alignItems:'flex-start', gap: 10 }}>
                <HoldTag c="red" label="RED · OUT OF SERVICE" />
                <div style={{ flex: 1 }}><div style={{ fontSize: 12 }}>Leader pins out of spec — production blocked</div><div className="mono" style={{ fontSize: 10.5, color:'var(--text-tertiary)' }}>TAG-2026-0042 · 2026-05-04</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SQFFooter />
    </div>
  );
};

window.PartsLifecycle = PartsLifecycle;
window.EquipmentHoldLog = EquipmentHoldLog;
window.EquipmentDetail = EquipmentDetail;
