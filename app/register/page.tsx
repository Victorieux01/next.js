import { Suspense } from 'react';
import RegisterForm from '@/app/ui/register-form';

export default function RegisterPage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg,#0984E3,#00CEC9)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Coredon</span>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Create your account</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28 }}>Get started with Coredon today.</p>
          <Suspense>
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
