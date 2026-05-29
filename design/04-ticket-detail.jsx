// Screen 5 — Ticket Detail
const TicketDetail = ({ ticket, onBack }) => {
  const t = ticket || window.CSC_DATA.TICKETS[0];
  const HISTORY = window.CSC_DATA.TICKET_HISTORY;
  return (
    <div className="page-inner wide">
      <div className="page-header">
        <div>
          <div className="crumbs">
            <span style={{ cursor:'pointer' }} onClick={onBack}>Tickets</span>
            <span className="sep">/</span>
            <span>Open</span>
            <span className="sep">/</span>
            <span className="mono">{t.id}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap: 12, flexWrap:'wrap', marginTop: 6 }}>
            <h1 style={{ margin: 0, display:'flex', alignItems:'baseline', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--brand-navy)' }}>{t.id}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color:'var(--text-secondary)' }}>{t.equipment}</span>
            </h1>
            <PriorityChip p={t.priority} />
            <StatusPill s={t.status} />
            {t.tagColor && <HoldTag c={t.tagColor} />}
            <span style={{ fontSize: 12, color:'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>· age {t.age} · est {t.estHrs}h / actual {t.actualHrs}h</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <DeptTrail trail={t.deptTrail} />
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn"><I.users size={13} /> Reassign</button>
          <button className="btn"><I.arrowRight size={13} /> Transfer Dept</button>
          <button className="btn"><I.refresh size={13} /> Reroute</button>
          <button className="btn"><I.parts size={13} /> Request Parts</button>
          <button className="btn"><I.flag size={13} /> Flag Temp Fix</button>
          <button className="btn"><I.tag size={13} /> Tag Equipment</button>
          <button className="btn-success btn" disabled={t.status !== 'COMPLETE'}><I.check size={13} /> Verify &amp; Close</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16 }}>
        <div className="col">
          <div className="card">
            <div className="card-header">
              <div><h3>Ticket fields</h3><div className="sub">FRM-030-001 · Maintenance Ticket</div></div>
              <button className="btn ghost sm"><I.edit size={12} /> Edit</button>
            </div>
            <div className="card-body">
              <div className="field-grid cols-3">
                <div className="field"><label>Equipment</label><div className="input" style={{ display:'flex', alignItems:'center' }}>{t.equipment}</div></div>
                <div className="field"><label>Equipment Code</label><div className="input mono" style={{ display:'flex', alignItems:'center' }}>{t.code}</div></div>
                <div className="field"><label>Building / Zone</label><div className="input" style={{ display:'flex', alignItems:'center' }}>{t.building} · {t.zone}</div></div>
                <div className="field"><label>Problem Type</label><div className="input" style={{ display:'flex', alignItems:'center' }}>{t.problemType}</div></div>
                <div className="field"><label>Downtime Type</label><div className="input" style={{ display:'flex', alignItems:'center' }}>{t.downtime}</div></div>
                <div className="field"><label>Fix Type</label><div className="input" style={{ display:'flex', alignItems:'center' }}>{t.fixType}</div></div>
                <div className="field"><label>Est Hours</label><div className="input mono tnum" style={{ display:'flex', alignItems:'center' }}>{t.estHrs}</div></div>
                <div className="field"><label>Actual Hours</label><div className="input mono tnum" style={{ display:'flex', alignItems:'center' }}>{t.actualHrs}</div></div>
                <div className="field"><label>Parts Required</label><div className="input" style={{ display:'flex', alignItems:'center' }}>{t.tagColor === 'orange' || t.status === 'PENDING PARTS' ? 'Yes' : 'No'}</div></div>
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label>Problem Description</label>
                <textarea defaultValue={t.desc} style={{ minHeight: 80 }}></textarea>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div><h3>Photos</h3><div className="sub">3 attached · click to expand</div></div><button className="btn sm"><I.camera size={12} /> Add</button></div>
            <div className="card-body">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 10 }}>
                <div className="photo" style={{ height: 96 }}>photo · 4032×3024</div>
                <div className="photo" style={{ height: 96 }}>photo · vfd enclosure</div>
                <div className="photo" style={{ height: 96 }}>thermal · 84°C</div>
                <div className="photo" style={{ height: 96 }}>+ add</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div><h3>Service report</h3><div className="sub">FRM-040-002 · root cause / corrective / preventive</div></div></div>
            <div className="card-body">
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Work summary</label>
                <textarea placeholder="Describe the work performed in technician's own words…" defaultValue={"Disabled affected EOAT cups via vacuum manifold. Bagged 4-cup configuration ran at 88% production rate to bridge until vacuum generators arrive. Verified leak isolation with smoke pen."}></textarea>
              </div>
              <div className="field-grid">
                <div className="field"><label>Root cause</label><textarea placeholder="What actually failed and why" defaultValue={"Vacuum generator diaphragm fatigue at 18,000hr — within Festo's expected service life. Two units failed in close sequence indicating likely batch effect."}></textarea></div>
                <div className="field"><label>Corrective</label><textarea placeholder="What you did to fix" defaultValue={"Replace 2× VAD-M5 with new Festo units (ETA 2026-05-12). Verify vacuum draw at 24inHg per spec."}></textarea></div>
              </div>
              <div className="field" style={{ marginTop: 10 }}>
                <label>Preventive recommendation</label>
                <textarea placeholder="What we should do so this doesn't happen again" defaultValue={"Move all 6 vacuum generators on a rolling 2-year replacement plan (currently failure-driven). Add to Maintenance Program 030 schedule."}></textarea>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div><h3>Parts used</h3><div className="sub">Linked to this ticket</div></div></div>
            <div className="card-body flush">
              <table className="tbl">
                <thead><tr><th>Part ID</th><th>Description</th><th>Vendor</th><th>Stage</th><th className="right">Days in stage</th></tr></thead>
                <tbody>
                  <tr><td className="mono" style={{ color:'var(--brand-navy)' }}>PRT-2026-0214</td><td>Festo Vacuum Generator VAD-M5</td><td>Festo USA</td><td><span className="pill s-pending-parts">ORDERED</span></td><td className="right mono tnum">2d</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card">
            <div className="card-header"><div><h3>Audit timeline</h3><div className="sub">Every history event · SQF-grade attribution</div></div></div>
            <div className="card-body">
              <div className="timeline">
                {HISTORY.map((h, i) => (
                  <div key={i} className={`tl-item ${h.type}`}>
                    <span className="tl-dot"><I.dot size={8} /></span>
                    <div className="tl-head">
                      <span className="label">{h.label}</span>
                      <span className="ts">{h.ts}</span>
                      <span className="who">· {h.who}</span>
                    </div>
                    <div className="tl-body">{h.body}</div>
                    {h.meta && <div className="tl-meta">{h.meta}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div><h3>Linked temp fix</h3><div className="sub">TF-2026-020 · re-inspect 2026-05-14</div></div></div>
            <div className="card-body" style={{ display:'flex', flexDirection:'column', gap: 8 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}><HoldTag c="orange" label="ORANGE · TEMP FIX" /></div>
              <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>4-cup configuration in place; reduced cycle rate posted at machine. Last inspection 2026-05-07 by Jesus Nunez — no further degradation observed.</div>
              <div style={{ display:'flex', gap: 6 }}>
                <button className="btn sm"><I.checkCircle size={12} /> Inspect Now</button>
                <button className="btn sm"><I.wrench size={12} /> Convert to Permanent</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div><h3>Equipment tag</h3><div className="sub">TAG-2026-0047 · FRM-029-001</div></div></div>
            <div className="card-body" style={{ display:'flex', flexDirection:'column', gap: 8 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}><HoldTag c="yellow" label="YELLOW · CAUTION" /></div>
              <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>Use With Caution — reduced cycle rate posted at machine. Tagged 2026-05-07 09:55 by Jesus Nunez. Manager-only Green Tag will return to full service.</div>
              <button className="btn-success btn sm" style={{ alignSelf:'flex-start' }}><I.check size={12} /> Issue Green Tag (clear)</button>
            </div>
          </div>
        </div>
      </div>
      <SQFFooter />
    </div>
  );
};
window.TicketDetail = TicketDetail;
