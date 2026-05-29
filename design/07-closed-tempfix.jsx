// Screens 8 & 9 — Closed Tickets / Audit Archive · Temp Fix Monitor
const ClosedTickets = () => {
  const T = window.CSC_DATA.TICKETS.filter(t => t.status === 'CLOSED');
  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <div className="crumbs"><span>Tickets</span><span className="sep">/</span><span>Closed</span></div>
          <h1>Closed tickets · audit archive</h1>
          <p className="sub">Read-only. Preserved permanently for SQF audit trail. 6 closed this week · 387 total this year.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn"><I.shield size={13} /> Export Audit Pack</button>
          <button className="btn"><I.download size={13} /> CSV</button>
        </div>
      </div>
      <div className="card">
        <TableToolbar
          filters={[{lbl:'Date',val:'Last 30d'},{lbl:'Department',val:'All'},{lbl:'Verified by',val:'Any manager'},{lbl:'Priority',val:'All'},{lbl:'Problem type',val:'All'}]}
          count={`${T.length} archived this view`}
        />
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>Ticket</th><th>Priority</th><th>Dept</th><th>Equipment</th><th>Problem</th><th>Closed Date</th><th>Verified by</th><th>Tag</th><th className="right">Hrs</th></tr></thead>
            <tbody>
              {T.map(t => (
                <tr key={t.id}>
                  <td className="mono" style={{ color:'var(--brand-navy)', fontWeight: 600 }}>{t.id}</td>
                  <td><PriorityChip p={t.priority} /></td>
                  <td><DeptTrail trail={t.deptTrail} /></td>
                  <td><div className="cell-stack"><span style={{ fontWeight: 500 }}>{t.equipment}</span><span className="meta mono">{t.code}</span></div></td>
                  <td className="truncate" style={{ maxWidth: 280, fontSize: 12, color:'var(--text-secondary)' }}>{t.problemType}</td>
                  <td className="mono tnum">{t.closedDate || '—'}</td>
                  <td>{t.closedBy || '—'}</td>
                  <td>{t.tagColor ? <HoldTag c={t.tagColor} label={t.tagColor.toUpperCase()} /> : <span className="tertiary">—</span>}</td>
                  <td className="right mono tnum">{t.actualHrs}</td>
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

const TempFixMonitor = () => {
  const TF = window.CSC_DATA.TEMP_FIXES;
  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <div className="crumbs"><span>Temp Fix Monitor</span></div>
          <h1>Temp Fix Monitor</h1>
          <p className="sub">FRM-029-001 + Maintenance Program 030. Every temporary fix on the floor — flagged, scheduled, audited. Past-due rows must be inspected or formally snoozed (with manager justification).</p>
        </div>
        <div className="page-header-actions"><button className="btn"><I.shield size={13} /> Compliance Report</button></div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(4, 1fr)' }}>
        <KPICard label="Active temp fixes" value="4" foot="2 of 4 past due" accent="warn" />
        <KPICard label="Past due" value="2" delta="+1" deltaDir="up" foot="oldest 6d overdue" accent="critical" />
        <KPICard label="Inspected on schedule" value="86%" delta="−4%" deltaDir="down" foot="rolling 90d" accent="" />
        <KPICard label="Converted to permanent" value="11" foot="this quarter" accent="success" />
      </div>

      <div className="card">
        <TableToolbar filters={[{lbl:'Status',val:'All'},{lbl:'Department',val:'All'},{lbl:'Manager',val:'Any'}]} count={`${TF.length} temp fixes`} />
        <div className="card-body flush">
          <table className="tbl">
            <thead><tr><th>Temp Fix ID</th><th>Ticket</th><th>Equipment</th><th>Date Flagged</th><th>Days to re-inspection</th><th>Status</th><th>Manager</th><th></th></tr></thead>
            <tbody>
              {TF.map(t => (
                <tr key={t.id} style={t.status === 'Past Due' ? { background: 'var(--status-critical-bg)' } : null}>
                  <td className="mono" style={{ color:'var(--brand-navy)', fontWeight: 600 }}>{t.id}</td>
                  <td className="mono" style={{ color:'var(--brand-navy)' }}>{t.ticket}</td>
                  <td><div className="cell-stack"><span style={{ fontWeight: 500 }}>{t.equipment}</span></div></td>
                  <td className="mono tnum">{t.date}</td>
                  <td className="mono tnum" style={{ fontWeight: 700, color: t.daysUntil < 0 ? 'var(--status-critical)' : t.daysUntil <= 3 ? 'var(--status-warn)' : 'var(--text-primary)' }}>
                    {t.daysUntil < 0 ? `${Math.abs(t.daysUntil)}d overdue` : `${t.daysUntil}d`}
                  </td>
                  <td>
                    {t.status === 'Past Due' ?
                      <span className="pill s-pending-parts" style={{ color: 'var(--status-critical)', background: 'var(--status-critical-bg)', borderColor:'#FECACA' }}>PAST DUE</span> :
                      <span className="pill s-open">ACTIVE</span>}
                  </td>
                  <td>{t.mgr}</td>
                  <td className="right">
                    <div style={{ display:'flex', gap: 4, justifyContent:'flex-end' }}>
                      <button className="btn sm"><I.checkCircle size={11} /> Inspect</button>
                      <button className="btn sm"><I.wrench size={11} /> Convert</button>
                      <button className="btn sm">Snooze 7d</button>
                    </div>
                  </td>
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

window.ClosedTickets = ClosedTickets;
window.TempFixMonitor = TempFixMonitor;
