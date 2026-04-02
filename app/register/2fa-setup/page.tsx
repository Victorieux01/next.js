import TwoFASetupForm from '@/app/ui/2fa-setup-form';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import supabase from '@/app/lib/supabase';
import { generateTotpUri, generateQrCodeDataUrl } from '@/app/lib/totp';

export default async function TwoFASetupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { data: user } = await supabase
    .from('users')
    .select('totp_secret, totp_enabled, email')
    .eq('id', session.user.id)
    .single();

  if (user?.totp_enabled) redirect('/dashboard');
  if (!user?.totp_secret) redirect('/login');

  const email = session.user.email ?? user.email ?? '';
  const otpUri = generateTotpUri(email, user.totp_secret);
  const qrCodeDataUrl = await generateQrCodeDataUrl(otpUri);

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
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

        <div className="card" style={{ padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#E6FAF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Secure your account</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28 }}>
            Scan the QR code below with an authenticator app (Google Authenticator, Authy…), then enter the 6-digit code.
          </p>
          <TwoFASetupForm qrCodeDataUrl={qrCodeDataUrl} secret={user.totp_secret} />
        </div>
      </div>
    </main>
  );
}
