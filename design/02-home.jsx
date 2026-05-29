// Manager Home — personalized per manager (Izzy & Mike differ in feel)
const KPICard = ({ label, value, delta, deltaDir, foot, accent, spark }) => (
  <div className={`kpi ${accent || ''}`}>
    <div className="accent"></div>
    <div className="label">{label}</div>
    <div className="value">
      <span>{value}</span>
      {delta && <span className={`delta ${deltaDir || 'neutral'}`}>{deltaDir === 'up' ? '▲' : deltaDir === 'down' ? '▼' : '·'} {delta}</span>}
    </div>
    {spark && <div className="spark"><Sparkline values={spark} /></div>}
    {foot && <div className="foot">{foot}</div>}
  </div>
);

const AttnRow = ({ kind, pid, title, sub, age, action }) => (
  <div className={`attn-row ${kind}`}>
    <div className="icon-wrap">
      {kind === 'review' && <I.checkCircle size={16} />}
      {kind === 'parts' && <I.parts size={16} />}
      {kind === 'temp' && <I.flag size={16} />}
      {kind === 'complete' && <I.check size={16} />}
    </div>
    <div className="body">
      <div className="top"><span className="pid">{pid}</span>{title}</div>
      <div className="sub">{sub}</div>
    </div>
    <div className="age">{age}</div>
    <div className="actions"><button className="btn sm">{action}</button></div>
  </div>
);

const TeamRow = ({ name, init, ticket, hrs, status }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border-default)' }}>
    <Avatar initials={init} size="sm" />
    <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span className="mono" style={{ color: 'var(--brand-navy)' }}>{ticket}</span>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div className="mono tnum" style={{ fontSize: 12, fontWeight: 600 }}>{hrs}h</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>{status}</div>
    </div>
  </div>
);

const HomeIzzy = () => {
  const T = window.CSC_DATA.TICKETS.filter(t => t.mgr === 'izzy');
  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <div className="crumbs"><span>Home</span></div>
          <h1>Good afternoon, Izzy.</h1>
          <p className="sub">Plastics + Electrical reroutes · 4 items need your attention · last refresh <span className="mono">14:42:08</span></p>
        </div>
        <div className="page-header-actions">
          <button className="btn"><I.filter size={13} /> Filter</button>
          <button className="btn-primary btn"><I.plus size={13} /> New Ticket</button>
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard label="Open · Mine" value="9" delta="+2" deltaDir="up" foot="vs. last week" accent="info" spark={[3,4,5,4,6,5,7,9]} />
        <KPICard label="Waiting Review" value="2" delta="0" foot="oldest 1d 4h" accent="" spark={[1,2,1,2,2,1,2,2]} />
        <KPICard label="Critical Open" value="1" delta="0" foot="MT-003-260505-001" accent="critical" spark={[0,1,1,1,1,1,1,1]} />
        <KPICard label="Pending Parts" value="3" delta="+1" deltaDir="up" foot="2 backordered" accent="warn" spark={[1,1,2,2,3,3,3,3]} />
        <KPICard label="Temp Fix Active" value="1" foot="re-inspect in 5d" accent="" spark={[1,1,1,1,1,1,1,1]} />
        <KPICard label="Closed This Week" value="6" delta="+3" deltaDir="up" foot="closure rate 67%" accent="success" spark={[2,3,4,3,5,4,5,6]} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="col">
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Needs your attention</h3>
                <div className="sub">Action required to move tickets forward</div>
              </div>
              <button className="btn ghost sm">View all</button>
            </div>
            <div className="card-body flush">
              <AttnRow kind="review" pid="MT-003-260508-003" title=" Hydraulic press leak — submitted by ext. requester" sub="PLASTICS · INJECTION PRESS NO. 6 · HIGH priority — needs queue approval" age="1d 1h" action="Approve" />
              <AttnRow kind="parts" pid="PRT-2026-0218" title=" VFD Cooling Fan received, ready to schedule" sub="Tied to MT-001-260506-001 · PRESS NO. 18 · Anthony Gonzalez idle" age="3h" action="Schedule" />
              <AttnRow kind="temp" pid="TF-2026-019" title=" Temp fix on Chiller 8 — re-inspect in 5 days" sub="Bypass valve · last inspected 2026-05-07 by Mike M." age="5d" action="Inspect" />
              <AttnRow kind="complete" pid="MT-003-260507-004" title=" Felipe completed mold #48-E ejector pin job" sub="Awaiting your verification + service-report signoff (FRM-040-002)" age="2h" action="Verify" />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div><h3>My open tickets</h3><div className="sub">9 active · sorted by priority then age</div></div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm"><I.filter size={12} /> Priority</button>
                <button className="btn sm">Sort: Age</button>
              </div>
            </div>
            <div className="card-body flush">
              <table className="tbl">
                <thead><tr>
                  <th>Ticket</th><th>Priority</th><th>Status</th><th>Equipment</th><th>Problem</th><th>Tag</th><th>Assigned</th><th className="right">Age</th>
                </tr></thead>
                <tbody>
                  {T.slice(0, 7).map((t) => (
                    <tr key={t.id}>
                      <td className="mono" style={{ color: 'var(--brand-navy)', fontWeight: 600 }}>{t.id}</td>
                      <td><PriorityChip p={t.priority} /></td>
                      <td><StatusPill s={t.status} /></td>
                      <td>
                        <div className="cell-stack">
                          <span style={{ fontWeight: 500 }}>{t.equipment}</span>
                          <span className="meta mono">{t.code} · {t.zone}</span>
                        </div>
                      </td>
                      <td className="truncate" style={{ maxWidth: 220 }}>{t.problemType}</td>
                      <td>{t.tagColor ? <HoldTag c={t.tagColor} label={t.tagColor.toUpperCase()} /> : <span className="tertiary">—</span>}</td>
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
            <div className="card-header"><div><h3>My team today</h3><div className="sub">4 techs assigned to Izzy</div></div></div>
            <div className="card-body flush">
              <TeamRow name="Jesus Nunez" init="JN" ticket="MT-004-260507-002" hrs="1.5" status="On site · Litho" />
              <TeamRow name="Ismael Silva" init="IS" ticket="MT-003-260505-001" hrs="5.5" status="Active · Plastics" />
              <TeamRow name="Felipe Vasquez" init="FV" ticket="MT-003-260507-004" hrs="2.0" status="Awaiting parts" />
              <TeamRow name="Steven Zuniga" init="SZ" ticket="—" hrs="0.0" status="Available" />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div><h3>Equipment on hold</h3><div className="sub">3 tagged in your depts</div></div></div>
            <div className="card-body" style={{ display:'flex', flexDirection:'column', gap: 10 }}>
              {window.CSC_DATA.HOLD_TAGS.filter(h => !h.cleared && ['BLENDER NO. 3 (003-503)','MOLD #48-E (003-354)'].some(n => h.equipment === n)).map(h => (
                <div key={h.tagId} style={{ display:'flex', alignItems:'flex-start', gap: 10 }}>
                  <HoldTag c={h.color} label={h.color.toUpperCase()} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{h.equipment}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{h.reason}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{h.tagId} · {h.date}</div>
                  </div>
                </div>
              ))}
              <div style={{ display:'flex', alignItems:'flex-start', gap: 10 }}>
                <HoldTag c="orange" label="ORANGE" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>IML LABEL FEEDER (006-441)</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Temp fix in place — feeder caps swap cycle</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 2 }}>TAG-2026-0044 · 2026-05-04 09:10</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div><h3>This week at a glance</h3><div className="sub">Opened vs. closed</div></div></div>
            <div className="card-body">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform:'uppercase', letterSpacing: '0.06em' }}>Net</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }} className="tnum">+1</div>
                </div>
                <div style={{ display:'flex', gap: 16 }}>
                  <div style={{ textAlign:'right' }}><div style={{ fontSize: 10.5, color:'var(--status-info)' }}>● Opened</div><div className="mono tnum" style={{ fontWeight: 600 }}>11</div></div>
                  <div style={{ textAlign:'right' }}><div style={{ fontSize: 10.5, color:'var(--status-success)' }}>● Closed</div><div className="mono tnum" style={{ fontWeight: 600 }}>10</div></div>
                </div>
              </div>
              <Sparkline values={[2,3,2,4,3,5,4,3,4,5,4,5]} stroke="#0284C7" fill="rgba(2,132,199,0.08)" height={40} width={280} />
              <Sparkline values={[1,2,3,2,4,3,4,3,4,5,4,4]} stroke="#059669" fill="rgba(5,150,105,0.08)" height={40} width={280} />
            </div>
          </div>
        </div>
      </div>
      <SQFFooter />
    </div>
  );
};

const HomeMike = () => {
  const T = window.CSC_DATA.TICKETS.filter(t => t.mgr === 'mike');
  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <div className="crumbs"><span>Home</span></div>
          <h1>Good afternoon, Mike.</h1>
          <p className="sub">Machine Shop + Facilities · broad span across all four buildings · last refresh <span className="mono">14:42:08</span></p>
        </div>
        <div className="page-header-actions">
          <button className="btn"><I.filter size={13} /> Filter</button>
          <button className="btn-primary btn"><I.plus size={13} /> New Ticket</button>
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard label="Open · Mine" value="13" delta="+1" deltaDir="up" foot="across MS + Facilities" accent="info" spark={[8,9,10,11,10,12,12,13]} />
        <KPICard label="Waiting Review" value="0" foot="cleared earlier today" accent="success" spark={[2,1,2,1,1,0,0,0]} />
        <KPICard label="Critical Open" value="0" foot="last critical: 5d ago" accent="" spark={[1,1,0,0,0,0,0,0]} />
        <KPICard label="Pending Parts" value="2" delta="−1" deltaDir="down" foot="1 received today" accent="warn" spark={[3,3,3,3,2,2,2,2]} />
        <KPICard label="Temp Fix Active" value="1" foot="Chiller bypass — 5d to inspect" accent="" spark={[0,0,1,1,1,1,1,1]} />
        <KPICard label="Closed This Week" value="9" delta="+4" deltaDir="up" foot="closure rate 78%" accent="success" spark={[1,3,4,5,6,7,8,9]} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="col">
          <div className="card">
            <div className="card-header">
              <div><h3>Needs your attention</h3><div className="sub">Action required from you</div></div>
              <button className="btn ghost sm">View all</button>
            </div>
            <div className="card-body flush">
              <AttnRow kind="complete" pid="MT-008-260505-001" title=" Forklift 7 — 500hr PM complete by Jorge G." sub="Awaiting your verification — last odometer 4,512hr" age="2h" action="Verify" />
              <AttnRow kind="parts" pid="PRT-2026-0223" title=" Pressure switch received for Air Compressor 2" sub="Tied to MT-008-260508-001 · Christian Gavina available" age="1h" action="Schedule" />
              <AttnRow kind="temp" pid="TF-2026-019" title=" Chiller bypass valve — re-inspect in 5 days" sub="MT-008-260507-001 · Maintenance Program 030 compliance" age="5d" action="Inspect" />
              <AttnRow kind="review" pid="MT-031-260508-001" title=" A/C in David's office — rerouted to Electrical, copy you" sub="HIGH priority · awaiting your acknowledgement on cross-dept ticket" age="1d 5h" action="Acknowledge" />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div><h3>My open tickets</h3><div className="sub">13 active · 4 buildings · sorted by age</div></div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm"><I.filter size={12} /> Building</button>
                <button className="btn sm">Sort: Age</button>
              </div>
            </div>
            <div className="card-body flush">
              <table className="tbl">
                <thead><tr>
                  <th>Ticket</th><th>Priority</th><th>Status</th><th>Equipment</th><th>Building</th><th>Tag</th><th>Assigned</th><th className="right">Age</th>
                </tr></thead>
                <tbody>
                  {T.slice(0, 6).map((t) => (
                    <tr key={t.id}>
                      <td className="mono" style={{ color: 'var(--brand-navy)', fontWeight: 600 }}>{t.id}</td>
                      <td><PriorityChip p={t.priority} /></td>
                      <td><StatusPill s={t.status} /></td>
                      <td>
                        <div className="cell-stack">
                          <span style={{ fontWeight: 500 }}>{t.equipment}</span>
                          <span className="meta mono">{t.code}</span>
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: 11.5 }}>{t.building} · {t.zone.split(' ')[0]}</td>
                      <td>{t.tagColor ? <HoldTag c={t.tagColor} label={t.tagColor.toUpperCase()} /> : <span className="tertiary">—</span>}</td>
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
            <div className="card-header"><div><h3>My team today</h3><div className="sub">4 techs assigned to Mike</div></div></div>
            <div className="card-body flush">
              <TeamRow name="Anthony Gonzalez" init="AG" ticket="MT-001-260506-001" hrs="3.0" status="Active · MS" />
              <TeamRow name="Christian Gavina" init="CG" ticket="MT-008-260508-001" hrs="1.25" status="Active · MS" />
              <TeamRow name="Jorge Guzman" init="JG" ticket="MT-008-260505-001" hrs="2.75" status="Awaiting verify" />
              <TeamRow name="David Avila" init="DA" ticket="—" hrs="0.0" status="Off · jury duty" />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div><h3>Facilities watchlist</h3><div className="sub">Cross-building hotspots</div></div></div>
            <div className="card-body" style={{ display:'flex', flexDirection:'column', gap: 8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize: 12 }}>
                <span><span className="mono" style={{ color: 'var(--brand-navy)' }}>B1</span> · HVAC complaints</span>
                <span className="mono tnum"><span style={{ color: 'var(--status-warn)' }}>3</span> open</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize: 12 }}>
                <span><span className="mono" style={{ color: 'var(--brand-navy)' }}>B2</span> · Compressed air leaks</span>
                <span className="mono tnum"><span style={{ color: 'var(--status-medium)' }}>2</span> open</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize: 12 }}>
                <span><span className="mono" style={{ color: 'var(--brand-navy)' }}>B3</span> · Roof drain inspection</span>
                <span className="mono tnum"><span style={{ color: 'var(--text-secondary)' }}>1</span> due 5/12</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize: 12 }}>
                <span><span className="mono" style={{ color: 'var(--brand-navy)' }}>B4</span> · Lighting circuits</span>
                <span className="mono tnum"><span style={{ color: 'var(--status-success)' }}>0</span> open</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div><h3>This week at a glance</h3><div className="sub">Opened vs. closed</div></div></div>
            <div className="card-body">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform:'uppercase', letterSpacing: '0.06em' }}>Net</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }} className="tnum">−2</div>
                </div>
                <div style={{ display:'flex', gap: 16 }}>
                  <div style={{ textAlign:'right' }}><div style={{ fontSize: 10.5, color:'var(--status-info)' }}>● Opened</div><div className="mono tnum" style={{ fontWeight: 600 }}>9</div></div>
                  <div style={{ textAlign:'right' }}><div style={{ fontSize: 10.5, color:'var(--status-success)' }}>● Closed</div><div className="mono tnum" style={{ fontWeight: 600 }}>11</div></div>
                </div>
              </div>
              <Sparkline values={[3,2,2,3,2,1,2,1,1,2,1,1]} stroke="#0284C7" fill="rgba(2,132,199,0.08)" height={40} width={280} />
              <Sparkline values={[1,2,3,2,3,4,3,4,3,4,3,4]} stroke="#059669" fill="rgba(5,150,105,0.08)" height={40} width={280} />
            </div>
          </div>
        </div>
      </div>
      <SQFFooter />
    </div>
  );
};

window.HomeIzzy = HomeIzzy;
window.HomeMike = HomeMike;
