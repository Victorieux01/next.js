import ClientPortalNav from '@/app/ui/client-portal-nav';
import { Suspense } from 'react';

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

          <Suspense>
            <ClientPortalNav />
          </Suspense>
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
