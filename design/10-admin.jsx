// Screen 14 — Admin / Configuration
const Admin = () => {
  const tabs = ['System Config', 'User Access', 'Department Map'];
  const [tab, setTab] = React.useState(0);
  const managers = window.CSC_DATA.MANAGERS;

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <div className="crumbs"><span>Admin</span></div>
          <h1>Admin · configuration</h1>
          <p className="sub">Three panes: system-wide settings, manager &amp; team access, and the external↔internal department map. All edits logged to the audit trail.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn"><I.shield size={13} /> Audit log</button>
          <button className="btn-primary btn"><I.check size={13} /> Save changes</button>
        </div>
      </div>

      <div className="tab-strip">
        {tabs.map((t, i) => (
          <div key={t} className={'tab' + (i === tab ? ' active' : '')} onClick={() => setTab(i)}>{t}</div>
        ))}
      </div>

      {tab === 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div><h3>Company &amp; location</h3></div></div>
            <div className="card-body" style={{ display:'grid', gap: 14 }}>
              <Field label="Company name" value="Container Supply Co." />
              <Field label="Location" value="Garden Grove, California" />
              <Field label="Buildings" value="B1 Main · B2 Hitachi · B3 Wyle · B4 Monarch" />
              <Field label="SQF certification" value="Active · expires 2027-02-14" mono />
              <Field label="Time zone" value="America/Los_Angeles" mono />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div><h3>Document numbers</h3><div className="sub">SQF reference forms — appear in screen footers</div></div></div>
            <div className="card-body" style={{ display:'grid', gap: 14 }}>
              <Field label="Maintenance ticket" value="FRM-030-001" mono />
              <Field label="Service report" value="FRM-040-002" mono />
              <Field label="Equipment hold tag" value="FRM-029-001" mono />
              <Field label="Temp Fix Compliance program" value="Maintenance Program 030" mono />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div><h3>Monitoring &amp; rollover</h3></div></div>
            <div className="card-body" style={{ display:'grid', gap: 14 }}>
              <Field label="Live refresh frequency" value="60 seconds" />
              <Field label="Current month" value="May 2026" />
              <Field label="Month rollover" value="1st of month at 06:00 PT" mono />
              <Field label="Audit retention" value="Permanent (SQF requirement)" />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div><h3>System</h3></div></div>
            <div className="card-body" style={{ display:'grid', gap: 14 }}>
              <Field label="System version" value="2.0.0 · web app preview" mono />
              <Field label="Source of truth" value="Migration from Sheets in progress" />
              <Field label="Technician app" value="Connected · v1.7.3 (mobile)" mono />
              <Field label="External requester sync" value="Connected · 5-min interval" mono />
            </div>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="card">
          <div className="card-header">
            <div><h3>Managers &amp; approved teams</h3><div className="sub">Manager email = full edit rights · Team emails = view + task update only</div></div>
            <button className="btn-primary btn sm"><I.plus size={11} /> Add manager</button>
          </div>
          <div className="card-body flush">
            <table className="tbl">
              <thead><tr><th>Manager</th><th>Email</th><th>Owned departments</th><th>Approved team</th><th>Last active</th><th></th></tr></thead>
              <tbody>
                {managers.map(m => (
                  <tr key={m.email}>
                    <td><div className="cell-row"><Avatar initials={m.initials} bg={m.color} /> <strong>{m.name}</strong></div></td>
                    <td className="mono" style={{ fontSize: 11.5 }}>{m.email}</td>
                    <td>{m.depts.map(d => <span key={d} className="chip" style={{ marginRight: 4, background:'var(--bg-subtle)', color:'var(--text-primary)' }}>{d}</span>)}</td>
                    <td style={{ fontSize: 12, color:'var(--text-secondary)' }}>{m.team.join(' · ') || <span style={{ color:'var(--text-tertiary)' }}>—</span>}</td>
                    <td className="mono tnum" style={{ fontSize: 11.5 }}>{m.lastActive}</td>
                    <td className="right"><button className="btn sm">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="card">
          <div className="card-header">
            <div><h3>Department map</h3><div className="sub">External requester labels → internal CSC departments. Drives auto-routing on the Waiting Queue.</div></div>
            <button className="btn-primary btn sm"><I.plus size={11} /> Add mapping</button>
          </div>
          <div className="card-body flush">
            <table className="tbl">
              <thead><tr><th>External label</th><th>Source code</th><th></th><th>Internal department</th><th>Owner manager</th><th></th></tr></thead>
              <tbody>
                {[
                  {ext:'Metal Manufacturing',c:'001',int:'METALS',m:'Eddie Nahabedian'},
                  {ext:'Plastic Manufacturing',c:'003',int:'PLASTICS',m:'Izzy'},
                  {ext:'Lithography',c:'004',int:'LITHO',m:'Joel Gonzalez'},
                  {ext:'Plastic Decorating',c:'006',int:'PLASTICS',m:'Izzy'},
                  {ext:'Quality Assurance',c:'007',int:'METALS',m:'Eddie Nahabedian'},
                  {ext:'Machine Shop',c:'008',int:'MACHINE SHOP',m:'Mike Magallanes'},
                  {ext:'Shipping & Receiving',c:'009',int:'FACILITIES',m:'Mike Magallanes'},
                  {ext:'Shipping & Receiving (alt)',c:'030',int:'FACILITIES',m:'Mike Magallanes'},
                  {ext:'General & Admin',c:'031',int:'ELECTRICAL',m:'Izzy'},
                ].map((r,i) => (
                  <tr key={i}>
                    <td>{r.ext}</td>
                    <td className="mono" style={{ color:'var(--brand-navy)', fontWeight: 600 }}>{r.c}</td>
                    <td style={{ color:'var(--text-tertiary)' }}>→</td>
                    <td><span className="chip" style={{ background:'var(--bg-subtle)', color:'var(--text-primary)' }}>{r.int}</span></td>
                    <td>{r.m}</td>
                    <td className="right"><button className="btn sm">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <SQFFooter />
    </div>
  );
};

const Field = ({ label, value, mono }) => (
  <div>
    <div style={{ fontSize: 10.5, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight: 600, marginBottom: 4 }}>{label}</div>
    <div className={'field-input ' + (mono ? 'mono' : '')}>{value}</div>
  </div>
);

window.Admin = Admin;
