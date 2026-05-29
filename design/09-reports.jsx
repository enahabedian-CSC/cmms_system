// Screen 13 — Reports & Analytics (Future State)
const ReportsScreen = () => {
  const buildings = [
    { id:'B1', name:'B1 Main', zones: [
      { z:1, lbl:'S/R', ct:14, color:'#FECACA' },
      { z:2, lbl:'Metals', ct:22, color:'#F87171' },
      { z:3, lbl:'Plastics', ct:8, color:'#FED7AA' },
      { z:4, lbl:'Litho', ct:5, color:'#FEF3C7' },
      { z:5, lbl:'Misc', ct:3, color:'#E0E7FF' },
    ]},
    { id:'B2', name:'B2 Hitachi', zones: [
      { z:1, lbl:'S/R', ct:2, color:'#E0E7FF' },
      { z:2, lbl:'Metals', ct:1, color:'#F1F5F9' },
      { z:3, lbl:'Plastics', ct:18, color:'#F87171' },
      { z:4, lbl:'Litho', ct:0, color:'#F1F5F9' },
      { z:5, lbl:'Misc', ct:1, color:'#F1F5F9' },
    ]},
    { id:'B3', name:'B3 Wyle', zones: [
      { z:1, lbl:'S/R', ct:0, color:'#F1F5F9' },
      { z:2, lbl:'Metals', ct:3, color:'#FED7AA' },
      { z:3, lbl:'Plastics', ct:6, color:'#FECACA' },
      { z:4, lbl:'Litho', ct:11, color:'#F87171' },
      { z:5, lbl:'Misc', ct:1, color:'#F1F5F9' },
    ]},
    { id:'B4', name:'B4 Monarch', zones: [
      { z:1, lbl:'S/R', ct:1, color:'#F1F5F9' },
      { z:2, lbl:'Metals', ct:2, color:'#FEF3C7' },
      { z:3, lbl:'Plastics', ct:0, color:'#F1F5F9' },
      { z:4, lbl:'Litho', ct:1, color:'#F1F5F9' },
      { z:5, lbl:'Misc', ct:4, color:'#FED7AA' },
    ]},
  ];

  const probTypes = [
    { name:'Mechanical Failure', ct:21, pct:28, avg:2.4, top:'METAL', color:'#001F4F' },
    { name:'Electrical Issue',   ct:14, pct:19, avg:1.8, top:'M/S', color:'#0284C7' },
    { name:'Wear & Tear',        ct:11, pct:15, avg:1.5, top:'PLASTICS', color:'#059669' },
    { name:'Hydraulic',          ct:8,  pct:11, avg:2.9, top:'PLASTICS', color:'#D97706' },
    { name:'Facility',           ct:7,  pct:9,  avg:1.2, top:'M/S', color:'#64748B' },
    { name:'Pneumatic',          ct:5,  pct:7,  avg:1.3, top:'PLASTICS', color:'#EA580C' },
    { name:'Controls / PLC',     ct:4,  pct:5,  avg:3.5, top:'PLASTICS', color:'#7C3AED' },
    { name:'PM',                 ct:4,  pct:6,  avg:0.8, top:'M/S', color:'#94A3B8' },
  ];
  let cumAngle = 0;
  const donutSegs = probTypes.map(p => {
    const angle = (p.pct / 100) * 360;
    const seg = { ...p, start: cumAngle, end: cumAngle + angle };
    cumAngle += angle;
    return seg;
  });
  const polar = (cx, cy, r, deg) => {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arc = (cx, cy, rOuter, rInner, start, end) => {
    const so = polar(cx, cy, rOuter, end), eo = polar(cx, cy, rOuter, start);
    const si = polar(cx, cy, rInner, start), ei = polar(cx, cy, rInner, end);
    const large = end - start <= 180 ? 0 : 1;
    return `M ${so.x} ${so.y} A ${rOuter} ${rOuter} 0 ${large} 0 ${eo.x} ${eo.y} L ${si.x} ${si.y} A ${rInner} ${rInner} 0 ${large} 1 ${ei.x} ${ei.y} Z`;
  };

  return (
    <div className="page-inner wide">
      <div className="page-header">
        <div>
          <div className="crumbs"><span>Reports</span></div>
          <h1>Reports &amp; analytics</h1>
          <p className="sub">Future-state operations intelligence pack. All sections obey the global filters above.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn"><I.shield size={13} /> Export Audit Report (PDF)</button>
          <button className="btn-primary btn"><I.download size={13} /> Export All</button>
        </div>
      </div>

      {/* GLOBAL FILTERS */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="tbl-toolbar" style={{ borderBottom: 0 }}>
          <button className="filter"><span className="lbl">Period:</span><span className="val">Last 30 days</span><I.chevronDown size={11} /></button>
          <button className="filter"><span className="lbl">Department:</span><span className="val">All (6)</span><I.chevronDown size={11} /></button>
          <button className="filter"><span className="lbl">Building:</span><span className="val">All (B1–B4)</span><I.chevronDown size={11} /></button>
          <button className="filter"><span className="lbl">Priority:</span><span className="val">All</span><I.chevronDown size={11} /></button>
          <button className="filter"><span className="lbl">Problem type:</span><span className="val">All</span><I.chevronDown size={11} /></button>
          <button className="filter"><span className="lbl">Manager:</span><span className="val">All 9</span><I.chevronDown size={11} /></button>
          <span className="spacer"></span>
          <span className="count">Filters apply to every chart on this page</span>
          <button className="btn sm">Save view</button>
        </div>
      </div>

      {/* 8.1 OPS HEALTH */}
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '4px 0 10px', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-secondary)' }}>8.1 · Operations Health</h2>
      <div className="kpi-grid">
        <KPICard label="Tickets closed" value="74" delta="+12 WoW" deltaDir="up" foot="vs. 62 prior period" accent="success" spark={[5,6,4,7,8,7,9,11,10,12,11,12]} />
        <KPICard label="Avg time to close" value="2.1d" delta="−0.4d" deltaDir="down" foot="critical: 0.4d / low: 4.1d" accent="success" spark={[3.0,2.8,2.6,2.7,2.4,2.3,2.2,2.1]} />
        <KPICard label="Closure rate" value="68%" delta="+8%" deltaDir="up" foot="open ÷ closed (period)" accent="info" spark={[55,58,60,62,63,65,66,68]} />
        <KPICard label="Unplanned downtime" value="54.5h" delta="−7.2h" deltaDir="down" foot="vs. planned 38.1h" accent="warn" spark={[8,9,7,6,8,7,5,5]} />
        <KPICard label="Critical SLA hit" value="92%" delta="−3%" deltaDir="down" foot="target ≥ 95%" accent="critical" spark={[96,95,95,94,94,93,93,92]} />
        <KPICard label="Active temp fixes" value="4" delta="2 past due" deltaDir="up" foot="2 inspected on time" accent="warn" />
      </div>

      {/* 8.2 TREND & THROUGHPUT */}
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-secondary)' }}>8.2 · Trend &amp; Throughput</h2>
      <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><div><h3>Tickets opened vs. closed · 12 weeks</h3><div className="sub">Stacked area · net throughput line</div></div>
            <div className="row" style={{ gap: 8, fontSize: 11 }}>
              <span style={{ color:'var(--status-info)' }}>● Opened</span>
              <span style={{ color:'var(--status-success)' }}>● Closed</span>
              <span style={{ color:'var(--brand-navy)' }}>— Net</span>
            </div>
          </div>
          <div className="card-body">
            <svg viewBox="0 0 600 180" style={{ width:'100%', height: 200 }}>
              {[0,1,2,3,4].map(i => <line key={i} x1="0" x2="600" y1={36*i+10} y2={36*i+10} stroke="#E4E7EC" strokeDasharray="2 4" />)}
              {/* Opened area */}
              <path d="M0,140 L50,120 L100,110 L150,90 L200,95 L250,75 L300,80 L350,60 L400,55 L450,40 L500,50 L550,30 L600,35 L600,170 L0,170 Z" fill="rgba(2,132,199,0.18)" />
              <polyline points="0,140 50,120 100,110 150,90 200,95 250,75 300,80 350,60 400,55 450,40 500,50 550,30 600,35" fill="none" stroke="#0284C7" strokeWidth="2" />
              {/* Closed area */}
              <path d="M0,150 L50,135 L100,128 L150,110 L200,108 L250,90 L300,90 L350,75 L400,65 L450,55 L500,60 L550,42 L600,45 L600,170 L0,170 Z" fill="rgba(5,150,105,0.16)" />
              <polyline points="0,150 50,135 100,128 150,110 200,108 250,90 300,90 350,75 400,65 450,55 500,60 550,42 600,45" fill="none" stroke="#059669" strokeWidth="2" />
              {/* Net */}
              <polyline points="0,160 50,155 100,150 150,140 200,142 250,135 300,138 350,128 400,118 450,108 500,115 550,98 600,100" fill="none" stroke="#001F4F" strokeWidth="1.5" strokeDasharray="3 3" />
              {['W14','W15','W16','W17','W18','W19','W20','W21','W22','W23','W24','W25','W26'].map((w,i) =>
                <text key={w} x={i*50} y="178" fontSize="9" fill="#94A3B8" fontFamily="JetBrains Mono">{w}</text>
              )}
            </svg>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div><h3>Volume by department</h3><div className="sub">Last 30 days</div></div></div>
          <div className="card-body">
            <div className="bar-h">
              {[
                {nm:'PLASTICS', ct:22},{nm:'MACHINE SHOP',ct:18},{nm:'METALS',ct:14},{nm:'ELECTRICAL',ct:9},{nm:'FACILITIES',ct:6},{nm:'LITHO',ct:5},
              ].map((d,i) => (
                <div className="row" key={i}>
                  <span className="nm">{d.nm}</span>
                  <div className="bar"><span style={{ width: `${(d.ct/22)*100}%` }}></span></div>
                  <span className="ct">{d.ct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* STATUS FUNNEL */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><div><h3>Status funnel</h3><div className="sub">Where tickets fall off the rails — sized by current count, drop labelled below</div></div></div>
        <div className="card-body">
          <div className="funnel">
            <div className="step"><div className="lbl">Waiting</div><div className="v tnum">4</div><div className="drop">−1 rejected</div></div>
            <span className="arr"><I.arrowRight size={16} /></span>
            <div className="step"><div className="lbl">Open</div><div className="v tnum">22</div><div className="drop">—</div></div>
            <span className="arr"><I.arrowRight size={16} /></span>
            <div className="step"><div className="lbl">Pending Parts</div><div className="v tnum">7</div><div className="drop">avg 4.1d wait</div></div>
            <span className="arr"><I.arrowRight size={16} /></span>
            <div className="step"><div className="lbl">Complete</div><div className="v tnum">3</div><div className="drop">awaiting verify</div></div>
            <span className="arr"><I.arrowRight size={16} /></span>
            <div className="step"><div className="lbl">Closed</div><div className="v tnum">74</div><div className="drop">period close</div></div>
          </div>
        </div>
      </div>

      {/* 8.3 EQUIPMENT RISK */}
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-secondary)' }}>8.3 · Equipment Risk</h2>
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><div><h3>Top recurring equipment</h3><div className="sub">≥3 tickets in 90 days flagged Chronic</div></div></div>
          <div className="card-body flush">
            <table className="tbl">
              <thead><tr><th>Equipment</th><th>Dept</th><th className="right">Tickets</th><th className="right">Avg close</th><th>Last ticket</th><th></th></tr></thead>
              <tbody>
                {window.CSC_DATA.REC_EQUIP.map((e,i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{e.name}</td>
                    <td><span className="mono" style={{ fontSize: 11.5, color:'var(--text-secondary)' }}>{e.dept}</span></td>
                    <td className="right mono tnum">{e.count}</td>
                    <td className="right mono tnum">{e.avg}d</td>
                    <td className="mono tnum">{e.last}</td>
                    <td>{e.chronic && <span className="chip p-critical">CHRONIC</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div><h3>Equipment risk heatmap</h3><div className="sub">Dept × type · cell = ticket density</div></div></div>
          <div className="card-body">
            <div className="heatmap" style={{ gridTemplateColumns:'repeat(7, 1fr)' }}>
              <div className="hcell head">Dept ↓ / Type →</div>
              <div className="hcell head">Mold</div><div className="hcell head">Press</div><div className="hcell head">Slitter</div><div className="hcell head">Conveyor</div><div className="hcell head">HVAC</div><div className="hcell head">PLC</div>
              {[
                ['PLASTICS', '#FECACA','#FEF3C7','#F1F5F9','#FEF3C7','#F1F5F9','#FED7AA',  6,3,0,2,0,4],
                ['METAL',    '#FED7AA','#F87171','#FECACA','#F1F5F9','#F1F5F9','#F1F5F9', 4,8,5,0,0,0],
                ['M/S',      '#F1F5F9','#FEF3C7','#F1F5F9','#FED7AA','#FECACA','#FEF3C7', 0,2,0,3,5,2],
                ['ELECTRICAL','#F1F5F9','#FEF3C7','#F1F5F9','#FEF3C7','#FED7AA','#FED7AA', 0,2,0,1,4,3],
                ['LITHO',    '#FEF3C7','#F1F5F9','#FEF3C7','#F1F5F9','#FECACA','#FEF3C7', 1,0,2,0,5,1],
              ].map((row,ri) => (
                <React.Fragment key={ri}>
                  <div className="hcell head" style={{ textAlign: 'left' }}>{row[0]}</div>
                  {[1,2,3,4,5,6].map(i => (
                    <div className="hcell" key={i} style={{ background: row[i] }}>
                      <span className="ct">{row[i+6]}</span>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 8.4 BUILDING & ZONE HOTSPOTS */}
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-secondary)' }}>8.4 · Building &amp; Zone Hotspots</h2>
      <div className="card">
        <div className="card-header">
          <div><h3>Floor-plan view · 4 buildings × 5 zones</h3><div className="sub">Color: ticket density in period · click any zone to drill in</div></div>
          <div className="row" style={{ gap: 10, fontSize: 11 }}>
            <span><span style={{display:'inline-block',width:10,height:10,background:'#F1F5F9',borderRadius:2,verticalAlign:'middle'}}></span> 0</span>
            <span><span style={{display:'inline-block',width:10,height:10,background:'#FEF3C7',borderRadius:2,verticalAlign:'middle'}}></span> 1–4</span>
            <span><span style={{display:'inline-block',width:10,height:10,background:'#FED7AA',borderRadius:2,verticalAlign:'middle'}}></span> 5–9</span>
            <span><span style={{display:'inline-block',width:10,height:10,background:'#FECACA',borderRadius:2,verticalAlign:'middle'}}></span> 10–14</span>
            <span><span style={{display:'inline-block',width:10,height:10,background:'#F87171',borderRadius:2,verticalAlign:'middle'}}></span> 15+</span>
          </div>
        </div>
        <div className="card-body">
          <div className="floor-grid">
            {buildings.map(b => (
              <div key={b.id} className="bldg">
                <div className="bldg-h">
                  <span className="nm">{b.name}</span>
                  <span className="sub">{b.zones.reduce((s,z)=>s+z.ct,0)} tickets</span>
                </div>
                <div className="bldg-zones">
                  {b.zones.map(z => (
                    <div className="zone" key={z.z} style={{ background: z.color, color: z.ct > 9 ? '#fff' : 'var(--text-primary)' }}>
                      <div className="z-ct">{z.ct}</div>
                      <div className="z-lbl">{z.lbl}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8.5 PROBLEM TYPE */}
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-secondary)' }}>8.5 · Problem Type Frequency</h2>
      <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><div><h3>Donut</h3><div className="sub">% of total tickets</div></div></div>
          <div className="card-body" style={{ display:'grid', placeItems:'center' }}>
            <svg viewBox="0 0 200 200" style={{ width: 220, height: 220 }}>
              {donutSegs.map((s, i) => (
                <path key={i} d={arc(100,100,90,55,s.start,s.end)} fill={s.color} />
              ))}
              <circle cx="100" cy="100" r="54" fill="#fff" />
              <text x="100" y="98" textAnchor="middle" fontSize="22" fontWeight="700" fontFamily="Inter">74</text>
              <text x="100" y="115" textAnchor="middle" fontSize="9" fill="#64748B" letterSpacing="2">TICKETS</text>
            </svg>
          </div>
        </div>
        <div className="card">
          <div className="card-body flush">
            <table className="tbl">
              <thead><tr><th></th><th>Problem type</th><th className="right">Count</th><th className="right">% of total</th><th className="right">Avg close</th><th>Top dept</th></tr></thead>
              <tbody>
                {probTypes.map((p,i) => (
                  <tr key={i}>
                    <td style={{ width: 18 }}><span style={{ display:'inline-block', width: 10, height: 10, background: p.color, borderRadius: 2 }}></span></td>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td className="right mono tnum">{p.ct}</td>
                    <td className="right mono tnum">{p.pct}%</td>
                    <td className="right mono tnum">{p.avg}d</td>
                    <td><span className="mono" style={{ fontSize: 11.5, color:'var(--text-secondary)' }}>{p.top}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 8.6 PARTS INTELLIGENCE */}
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-secondary)' }}>8.6 · Parts Intelligence</h2>
      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><div><h3>Top parts repeatedly needed</h3><div className="sub">Items requested 3+ times flagged Stock Candidate</div></div></div>
          <div className="card-body flush">
            <table className="tbl">
              <thead><tr><th>Part</th><th className="right">Times</th><th>Last requested</th><th>Linked tickets</th><th></th></tr></thead>
              <tbody>
                <tr><td>Festo Vacuum Generator VAD-M5</td><td className="right mono tnum">5</td><td className="mono tnum">2026-05-07</td><td className="mono" style={{ color:'var(--brand-navy)' }}>MT-004 · MT-006 · MT-004 …</td><td><span className="chip p-medium">STOCK CANDIDATE</span></td></tr>
                <tr><td>Husky Ejector Pin Set, 48-series</td><td className="right mono tnum">4</td><td className="mono tnum">2026-05-07</td><td className="mono" style={{ color:'var(--brand-navy)' }}>MT-003 · MT-003 · MT-003</td><td><span className="chip p-medium">STOCK CANDIDATE</span></td></tr>
                <tr><td>VFD Cooling Fan, 120mm</td><td className="right mono tnum">3</td><td className="mono tnum">2026-05-06</td><td className="mono" style={{ color:'var(--brand-navy)' }}>MT-001 · MT-008 · MT-001</td><td><span className="chip p-medium">STOCK CANDIDATE</span></td></tr>
                <tr><td>Slitter Wheel, Orange</td><td className="right mono tnum">2</td><td className="mono tnum">2026-05-05</td><td className="mono" style={{ color:'var(--brand-navy)' }}>MT-001 · MT-001</td><td></td></tr>
                <tr><td>R-410A Refrigerant, 25lb</td><td className="right mono tnum">2</td><td className="mono tnum">2026-05-08</td><td className="mono" style={{ color:'var(--brand-navy)' }}>MT-031 · MT-031</td><td></td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="col">
          <div className="card">
            <div className="card-header"><div><h3>Lead time by category</h3><div className="sub">Avg days · REQUESTED → RECEIVED</div></div></div>
            <div className="card-body">
              <div className="bar-h">
                <div className="row"><span className="nm">Vacuum / Pneumatic</span><div className="bar"><span style={{ width:'82%', background:'var(--status-warn)' }}></span></div><span className="ct">9.1d</span></div>
                <div className="row"><span className="nm">Hydraulic</span><div className="bar"><span style={{ width:'70%', background:'var(--status-warn)' }}></span></div><span className="ct">7.8d</span></div>
                <div className="row"><span className="nm">Electrical (drives, PLC)</span><div className="bar"><span style={{ width:'55%' }}></span></div><span className="ct">6.1d</span></div>
                <div className="row"><span className="nm">Mechanical (bearings, pins)</span><div className="bar"><span style={{ width:'40%' }}></span></div><span className="ct">4.5d</span></div>
                <div className="row"><span className="nm">Consumables</span><div className="bar"><span style={{ width:'18%' }}></span></div><span className="ct">2.1d</span></div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div><h3>Pending parts aging</h3><div className="sub">Counts by age bucket</div></div></div>
            <div className="card-body">
              <svg viewBox="0 0 320 110" style={{ width:'100%', height: 130 }}>
                {[{l:'0–3d',v:8,x:10},{l:'4–7d',v:5,x:90},{l:'8–14d',v:3,x:170},{l:'15+d',v:2,x:250}].map((b,i) => (
                  <g key={i}>
                    <rect x={b.x} y={90 - b.v*8} width="60" height={b.v*8} fill={i<2?'#0284C7':i<3?'#D97706':'#DC2626'} rx="2" />
                    <text x={b.x+30} y={88 - b.v*8} textAnchor="middle" fontSize="11" fontWeight="700" fontFamily="JetBrains Mono">{b.v}</text>
                    <text x={b.x+30} y="106" textAnchor="middle" fontSize="10" fill="#64748B">{b.l}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 8.7 TECH WORKLOAD */}
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-secondary)' }}>8.7 · Team Workload</h2>
      <div className="card">
        <div className="card-header"><div><h3>Per-tech workload &amp; throughput</h3><div className="sub">Period totals · sortable. Verification pass rate = % of completed tickets verified by manager on first review.</div></div></div>
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>Technician</th><th className="right">Assigned</th><th className="right">Completed</th><th className="right">Closed</th><th className="right">Total hrs</th><th className="right">Avg hrs/ticket</th><th className="right">Avg time to complete</th><th>Hrs/wk</th><th className="right">Verify pass</th></tr></thead>
            <tbody>
              {window.CSC_DATA.TECH_PERF.map((t,i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}><div className="cell-row"><Avatar initials={t.name.split(' ').map(s=>s[0]).slice(0,2).join('')} size="sm" /> {t.name}</div></td>
                  <td className="right mono tnum">{t.assigned}</td>
                  <td className="right mono tnum">{t.completed}</td>
                  <td className="right mono tnum">{t.closed}</td>
                  <td className="right mono tnum">{t.hrs}</td>
                  <td className="right mono tnum">{t.avg}</td>
                  <td className="right mono tnum">{t.time}d</td>
                  <td style={{ width: 100 }}><Sparkline values={[2,3,4,5,4,5,6,5]} stroke="#001F4F" fill="rgba(0,31,79,0.08)" height={20} width={80} /></td>
                  <td className="right mono tnum" style={{ color: t.pass < 95 ? 'var(--status-warn)' : 'var(--status-success)', fontWeight: 600 }}>{t.pass}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8.8 COST */}
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-secondary)' }}>8.8 · Cost Analysis</h2>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><div><h3>Total spend YTD</h3><div className="sub">Budget pacing · Maintenance Program 030</div></div></div>
          <div className="card-body">
            <div className="value mono tnum" style={{ fontSize: 28, fontWeight: 700 }}>$184,210</div>
            <div style={{ fontSize: 11, color:'var(--text-secondary)' }}>of <span className="mono">$420,000</span> budget · 44% spent · 35% of year elapsed</div>
            <div style={{ marginTop: 10, height: 8, background:'var(--bg-subtle)', borderRadius: 4, overflow:'hidden', position:'relative' }}>
              <div style={{ width: '44%', height: '100%', background: 'var(--brand-navy)' }}></div>
              <div style={{ position:'absolute', top:-2, bottom:-2, left:'35%', width: 1, background:'var(--status-critical)' }} title="Pacing line"></div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop: 6, fontSize: 10.5, color:'var(--text-tertiary)' }}>
              <span className="mono">$0</span><span className="mono">35% pacing</span><span className="mono">$420k</span>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div><h3>Spend by department</h3></div></div>
          <div className="card-body">
            <div className="bar-h">
              <div className="row"><span className="nm">PLASTICS</span><div className="bar"><span style={{ width:'88%' }}></span></div><span className="ct">$58k</span></div>
              <div className="row"><span className="nm">METALS</span><div className="bar"><span style={{ width:'68%' }}></span></div><span className="ct">$45k</span></div>
              <div className="row"><span className="nm">M/S</span><div className="bar"><span style={{ width:'52%' }}></span></div><span className="ct">$34k</span></div>
              <div className="row"><span className="nm">ELECTRICAL</span><div className="bar"><span style={{ width:'30%' }}></span></div><span className="ct">$20k</span></div>
              <div className="row"><span className="nm">LITHO</span><div className="bar"><span style={{ width:'23%' }}></span></div><span className="ct">$15k</span></div>
              <div className="row"><span className="nm">FACILITIES</span><div className="bar"><span style={{ width:'18%' }}></span></div><span className="ct">$12k</span></div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div><h3>Cost of unresolved temp fixes</h3><div className="sub">Maintenance debt parked in TF Monitor</div></div></div>
          <div className="card-body">
            <div className="value mono tnum" style={{ fontSize: 28, fontWeight: 700, color:'var(--status-critical)' }}>$11,840</div>
            <div style={{ fontSize: 11, color:'var(--text-secondary)' }}>4 active temp fixes · est. permanent-fix labor + parts</div>
            <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.55 }}>
              <div className="row" style={{ justifyContent:'space-between' }}><span>Chiller bypass valve</span><span className="mono tnum">$3,200</span></div>
              <div className="row" style={{ justifyContent:'space-between' }}><span>Conveyor mount slip</span><span className="mono tnum">$4,400</span></div>
              <div className="row" style={{ justifyContent:'space-between' }}><span>Oven 4 manual ignition</span><span className="mono tnum">$2,900</span></div>
              <div className="row" style={{ justifyContent:'space-between' }}><span>Press 9 pedal lockout</span><span className="mono tnum">$1,340</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><div><h3>Spend by job number · top 10 cost-driver equipment</h3><div className="sub">Finance-ready rollup · joins to GL via Job # mapping</div></div></div>
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>Job #</th><th>Equipment</th><th>Dept</th><th className="right">Tickets</th><th className="right">Labor</th><th className="right">Parts</th><th className="right">Total</th><th>Cost / uptime hr</th></tr></thead>
            <tbody>
              {[
                {j:'48',n:'MOLD #48-D / 48-E',d:'PLASTICS',t:9,l:5400,p:11200,u:'$1.84/hr'},
                {j:'18',n:'PRESS NO. 18',d:'M/S',t:6,l:3100,p:8900,u:'$2.10/hr'},
                {j:'06',n:'INJECTION PRESS NO. 6',d:'PLASTICS',t:5,l:2800,p:6400,u:'$1.55/hr'},
                {j:'04-OV4',n:'OVEN NO. 4',d:'LITHO',t:4,l:2200,p:4100,u:'$2.95/hr'},
                {j:'08-CH1',n:'CHILLER TANK',d:'M/S',t:3,l:1800,p:3500,u:'$1.20/hr'},
                {j:'03-BL3',n:'BLENDER NO. 3',d:'PLASTICS',t:5,l:2400,p:2900,u:'$2.40/hr'},
                {j:'01-SL1',n:'SLITTER',d:'METAL',t:2,l:900,p:1800,u:'$0.80/hr'},
                {j:'08-FL7',n:'FORKLIFT NO. 7',d:'M/S',t:2,l:800,p:1200,u:'$0.45/hr'},
              ].map((r,i) => (
                <tr key={i}>
                  <td className="mono" style={{ color:'var(--brand-navy)', fontWeight: 600 }}>#{r.j}</td>
                  <td style={{ fontWeight: 500 }}>{r.n}</td>
                  <td><span className="mono" style={{ fontSize: 11.5, color:'var(--text-secondary)' }}>{r.d}</span></td>
                  <td className="right mono tnum">{r.t}</td>
                  <td className="right mono tnum">${r.l.toLocaleString()}</td>
                  <td className="right mono tnum">${r.p.toLocaleString()}</td>
                  <td className="right mono tnum" style={{ fontWeight: 700 }}>${(r.l+r.p).toLocaleString()}</td>
                  <td className="mono tnum">{r.u}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8.9 SQF */}
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-secondary)' }}>8.9 · SQF Compliance Pack</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 16 }}>
        <div className="card"><div className="card-body">
          <div className="label" style={{ fontSize: 10.5, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight: 600 }}>Temp Fix Compliance</div>
          <div className="mono tnum" style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>86%</div>
          <div style={{ fontSize: 11.5, color:'var(--text-secondary)' }}>inspected on schedule · Maintenance Program 030</div>
        </div></div>
        <div className="card"><div className="card-body">
          <div className="label" style={{ fontSize: 10.5, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight: 600 }}>Audit Trail Integrity</div>
          <div className="mono tnum" style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>97.4%</div>
          <div style={{ fontSize: 11.5, color:'var(--text-secondary)' }}>records with all required fields · 9 dirty</div>
        </div></div>
        <div className="card"><div className="card-body">
          <div className="label" style={{ fontSize: 10.5, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight: 600 }}>Equipment Tag Aging</div>
          <div className="mono tnum" style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color:'var(--status-warn)' }}>1</div>
          <div style={{ fontSize: 11.5, color:'var(--text-secondary)' }}>tag held &gt; 30 days · Press No. 9</div>
        </div></div>
        <div className="card"><div className="card-body" style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', height: '100%' }}>
          <div>
            <div className="label" style={{ fontSize: 10.5, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight: 600 }}>One-click audit pack</div>
            <div style={{ fontSize: 11.5, color:'var(--text-secondary)', marginTop: 2 }}>FRM-030-formatted compliance packet for SQF auditors.</div>
          </div>
          <button className="btn-primary btn" style={{ marginTop: 12 }}><I.shield size={13} /> Export PDF</button>
        </div></div>
      </div>

      {/* 8.10 INSIGHTS */}
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-secondary)' }}>8.10 · Predictive insights</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 12 }}>
        <div className="insight">
          <span className="ai-tag"><I.brain size={10} /> Suggestion</span>
          <div className="text"><strong>Mold #48-E</strong> has trended toward more frequent failures (3 → 5 → 6 over the last 3 quarters). Recommend PM review and a 48-series ejector pin restock.</div>
          <div className="ctas"><button className="btn sm">Dismiss</button><button className="btn-primary btn sm">Open equipment</button></div>
        </div>
        <div className="insight">
          <span className="ai-tag"><I.brain size={10} /> Suggestion</span>
          <div className="text">Parts category <strong>Vacuum Generators</strong> has 4 open requests across 3 tickets. Consider stocking 2 units to cut average ticket close time by ~3.1 days.</div>
          <div className="ctas"><button className="btn sm">Dismiss</button><button className="btn-primary btn sm">View parts</button></div>
        </div>
        <div className="insight">
          <span className="ai-tag"><I.brain size={10} /> Suggestion</span>
          <div className="text"><strong>Anthony Gonzalez</strong> has worked 32 hrs across 8 tickets this period — workload sits 1.4× team avg. Consider rebalancing Press 18 follow-up work to Christian or Jorge.</div>
          <div className="ctas"><button className="btn sm">Dismiss</button><button className="btn-primary btn sm">Rebalance</button></div>
        </div>
      </div>
      <SQFFooter />
    </div>
  );
};

window.ReportsScreen = ReportsScreen;
