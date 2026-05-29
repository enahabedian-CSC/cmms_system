// Screen 6 — Submit Ticket (3-step) and Screen 7 — Department Tracker
const StepDots = ({ step }) => (
  <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
    {[1,2,3].map(n => (
      <React.Fragment key={n}>
        <div style={{
          width: 22, height: 22, borderRadius: 11, fontSize: 11, fontWeight: 700,
          display:'grid', placeItems:'center',
          background: n <= step ? 'var(--brand-navy)' : 'var(--bg-subtle)',
          color: n <= step ? '#fff' : 'var(--text-secondary)',
          border: n === step ? '2px solid #fff' : '0',
          boxShadow: n === step ? '0 0 0 2px var(--brand-navy)' : 'none',
        }}>{n}</div>
        {n < 3 && <div style={{ flex: '0 0 30px', height: 1, background: n < step ? 'var(--brand-navy)' : 'var(--border-default)' }}></div>}
      </React.Fragment>
    ))}
  </div>
);

const SubmitTicket = () => {
  const [step, setStep] = React.useState(2); // show step 2 for richest preview
  return (
    <div className="page-inner wide">
      <div className="page-header">
        <div>
          <div className="crumbs"><span>Submit Ticket</span></div>
          <h1>New maintenance ticket</h1>
          <p className="sub">FRM-030-001 · Maintenance Ticket · created internally by manager. Step {step} of 3.</p>
        </div>
        <div className="page-header-actions"><StepDots step={step} /></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap: 16 }}>
        <div className="col">
          <div className="card">
            <div className="card-header">
              <div><h3>Step {step}: {step===1?'Equipment':step===2?'Problem':'Routing'}</h3>
                <div className="sub">{step===1?'Cascade narrows to a single equipment record.':step===2?'Capture priority, downtime impact, and what failed.':'Suggest a department; pick the assigned tech.'}</div></div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm" disabled={step===1} onClick={()=>setStep(s=>s-1)}><I.chevronLeft size={12} /> Back</button>
                <button className="btn sm" disabled={step===3} onClick={()=>setStep(s=>s+1)}>Next <I.chevronRight size={12} /></button>
              </div>
            </div>
            <div className="card-body">
              {step === 1 && (
                <div className="field-grid cols-4">
                  <div className="field"><label>Department</label><select defaultValue="PLASTICS">{['MACHINE SHOP','ELECTRICAL','FACILITIES','PLASTICS','METALS','LITHO'].map(d=><option key={d}>{d}</option>)}</select><div className="help">22 equipment records</div></div>
                  <div className="field"><label>Equipment Type</label><select defaultValue="MOLD">{['SLITTER','PRESS','MOLD','BLENDER','FEEDER','OVEN','CHILLER'].map(d=><option key={d}>{d}</option>)}</select><div className="help">14 in Plastics</div></div>
                  <div className="field"><label>Line #</label><select defaultValue="48"><option>20</option><option>34</option><option>48</option></select><div className="help">3 molds on Line 48</div></div>
                  <div className="field"><label>Specific Equipment</label><select defaultValue="48-D"><option>48-C</option><option>48-D</option><option>48-E</option></select><div className="help mono">Code: 003-353</div></div>
                </div>
              )}
              {step === 2 && (
                <>
                  <div className="field-grid cols-3">
                    <div className="field"><label>Priority</label>
                      <div style={{ display:'flex', gap: 6, marginTop: 2 }}>
                        {['LOW','MEDIUM','HIGH','CRITICAL'].map(p =>
                          <label key={p} style={{ flex: 1, display:'flex', alignItems:'center', justifyContent:'center', padding: '7px 4px', border: '1px solid var(--border-default)', borderRadius: 5, cursor:'pointer', background: p==='HIGH'?'var(--status-high-bg)':'#fff' }}>
                            <input type="radio" name="prio" defaultChecked={p==='HIGH'} style={{ marginRight: 5 }} />
                            <PriorityChip p={p} />
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="field"><label>Downtime</label>
                      <div style={{ display:'flex', gap: 6, marginTop: 2 }}>
                        <label style={{ flex: 1, padding: '7px 10px', border:'1px solid var(--border-default)', borderRadius: 5 }}><input type="radio" name="dt" /> Planned</label>
                        <label style={{ flex: 1, padding: '7px 10px', border:'1px solid var(--brand-navy)', background:'#F0F4FB', borderRadius: 5 }}><input type="radio" name="dt" defaultChecked /> Unplanned</label>
                      </div>
                    </div>
                    <div className="field"><label>Est Hours</label><input defaultValue="6" className="mono" /></div>
                  </div>
                  <div className="field-grid" style={{ marginTop: 12 }}>
                    <div className="field"><label>Problem Type</label><select defaultValue="Hydraulic">{['Mechanical Failure','Electrical Issue','Hydraulic','Pneumatic','Controls / PLC','Wear & Tear','Operator Error','Preventive Maintenance','Facility','New Installation','Other'].map(d=><option key={d}>{d}</option>)}</select></div>
                    <div className="field"><label>Fix Type</label><select defaultValue="Permanent"><option>Temporary</option><option>Permanent</option></select></div>
                  </div>
                  <div className="field" style={{ marginTop: 12 }}>
                    <label>Problem Description</label>
                    <textarea defaultValue={"Hydraulic line weeping at clamp manifold on Injection Press No. 6. Press still cycling but reservoir volume dropped ~3 gal overnight. Cylinder rod retract speed appears normal."}></textarea>
                  </div>
                  <div style={{ marginTop: 12, display:'flex', alignItems:'center', gap: 12 }}>
                    <div className="photo" style={{ height: 88, flex: 1, padding: 12 }}>
                      Drag photos here<br /><span style={{ opacity: 0.7 }}>or paste from clipboard</span>
                    </div>
                    <button className="btn"><I.camera size={13} /> Camera</button>
                    <button className="btn"><I.paperclip size={13} /> Attach</button>
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <div style={{ background: 'var(--bg-subtle)', border:'1px solid var(--border-default)', borderRadius: 6, padding: 12, marginBottom: 14, fontSize: 12, lineHeight: 1.5 }}>
                    <strong>Suggested routing:</strong> PLASTICS (auto-derived from Hydraulic + Plastics equipment). You can override.
                  </div>
                  <div className="field-grid cols-3">
                    <div className="field"><label>Department</label><select defaultValue="PLASTICS">{['MACHINE SHOP','ELECTRICAL','FACILITIES','PLASTICS','METALS','LITHO'].map(d=><option key={d}>{d}</option>)}</select></div>
                    <div className="field"><label>Assigned Tech</label><select defaultValue="Felipe Vasquez">{['Felipe Vasquez','Ismael Silva','Jesus Nunez','Steven Zuniga'].map(d=><option key={d}>{d}</option>)}</select><div className="help">Filtered to Izzy's team</div></div>
                    <div className="field"><label>Manager Owner</label><div className="input" style={{ display:'flex', alignItems:'center' }}>Izzy Zuniga</div></div>
                  </div>
                  <div style={{ marginTop: 14, display:'flex', flexDirection:'column', gap: 8 }}>
                    <Toggle on={true} label="Notify assigned tech by email" />
                    <Toggle on={true} label="Notify manager owner (Izzy)" />
                    <Toggle on={false} label="Notify external requester (cthran@cscmfg.com)" />
                  </div>
                </>
              )}
            </div>
            <div className="card-header" style={{ borderTop:'1px solid var(--border-default)', borderBottom: 0 }}>
              <span style={{ fontSize: 11, color:'var(--text-tertiary)', fontFamily:'var(--font-mono)' }}>Auto-saved · 14:42</span>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm">Save Draft</button>
                {step < 3 ? <button className="btn-primary btn sm" onClick={()=>setStep(s=>s+1)}>Continue</button> : <button className="btn-primary btn sm"><I.send size={12} /> Submit Ticket</button>}
              </div>
            </div>
          </div>
        </div>

        <div className="col" style={{ position:'sticky', top: 12 }}>
          <div className="card">
            <div className="card-header"><div><h3>Live preview</h3><div className="sub">Ticket as it will appear in Open</div></div></div>
            <div className="card-body">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
                <span className="mono" style={{ color: 'var(--brand-navy)', fontWeight: 700, fontSize: 13 }}>MT-003-260509-001</span>
                <span style={{ fontSize: 10.5, color:'var(--text-tertiary)', fontFamily:'var(--font-mono)' }}>auto-generated</span>
              </div>
              <div style={{ display:'flex', gap: 6, marginBottom: 10, flexWrap:'wrap' }}>
                <PriorityChip p="HIGH" />
                <StatusPill s="OPEN" />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>INJECTION PRESS NO. 6</div>
              <div className="mono" style={{ fontSize: 11, color:'var(--text-secondary)' }}>003-106 · B2 · Z3 Plastics</div>
              <div className="divider"></div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight: 600 }}>Problem</div>
              <div style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.45 }}>Hydraulic — line weeping at clamp manifold. Reservoir volume dropping ~3 gal overnight.</div>
              <div className="divider"></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8, fontSize: 12 }}>
                <div><div style={{ color:'var(--text-secondary)', fontSize: 10.5 }}>Downtime</div><div>Unplanned</div></div>
                <div><div style={{ color:'var(--text-secondary)', fontSize: 10.5 }}>Est hours</div><div className="mono">6</div></div>
                <div><div style={{ color:'var(--text-secondary)', fontSize: 10.5 }}>Assigned</div><div>Felipe Vasquez</div></div>
                <div><div style={{ color:'var(--text-secondary)', fontSize: 10.5 }}>Submitted by</div><div>Izzy Zuniga</div></div>
              </div>
            </div>
          </div>
          <div className="insight">
            <span className="ai-tag">Heads up</span>
            <div className="text">This is the <strong>3rd hydraulic ticket</strong> on Press No. 6 in 60 days. Consider opening a parallel preventive ticket for the manifold seal kit.</div>
          </div>
        </div>
      </div>
      <SQFFooter />
    </div>
  );
};

window.SubmitTicket = SubmitTicket;
