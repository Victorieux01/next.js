export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="main-wrapper">
      {/* Branded read-only sidebar shell */}
      <div id="sidebar" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="logo-block">
            <div className="logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="logo-text">Coredon</span>
          </div>

          <nav id="nav">
            <div style={{
              padding: '8px 14px',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 4,
            }}>
              Client Portal
            </div>
            <div className="nb active" style={{ cursor: 'default' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span className="nb-label">Project Overview</span>
            </div>
          </nav>
        </div>

        <div className="sb-bottom">
          <div style={{
            padding: '10px 14px',
            fontSize: 11,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Coredon</span>
            <br />Secure Escrow &amp; Project Management
          </div>
        </div>
      </div>

      <div id="content">{children}</div>
    </div>
  );
}
