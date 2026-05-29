// Login / Manager Picker
const LoginScreen = ({ onPick }) => {
  const M = window.CSC_DATA.MANAGERS;
  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-head">
          <div className="brand">
            <div className="mk">CSC</div>
            <div className="nm">Container Supply Co.</div>
          </div>
          <h1>Maintenance Operations Console</h1>
          <p className="sub">Single sign-on · select a manager to continue. SSO bound to <span className="mono">@cscmfg.com</span>.</p>
        </div>
        <div className="manager-grid">
          {M.map((m) => (
            <button key={m.id} className="manager-tile" onClick={() => onPick(m.id)}>
              <Avatar initials={m.initials} size="md" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="name">{m.name}</div>
                <div className="depts">{m.depts.join(' · ')}</div>
                <div className="meta">{m.email}</div>
              </div>
              <I.chevronRight size={14} />
            </button>
          ))}
        </div>
        <div className="login-foot">
          <span>FRM-030 · FRM-040 · FRM-029 · Program 030</span>
          <span>Build 2026.05.09 · SQF audit trail enabled</span>
        </div>
      </div>
    </div>
  );
};
window.LoginScreen = LoginScreen;
