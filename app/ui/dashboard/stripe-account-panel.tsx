'use client';
import { useEffect, useState, useCallback } from 'react';
import { loadConnectAndInitialize, StripeConnectInstance } from '@stripe/connect-js';
import {
  ConnectComponentsProvider,
  ConnectAccountManagement,
  ConnectPayouts,
  ConnectPayments,
} from '@stripe/react-connect-js';

type PanelTab = 'account' | 'payouts' | 'payments';

function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 14 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border-light)', borderTopColor: '#4285F4', animation: 'spin 0.7s linear infinite' }} />
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading Stripe…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function OnboardingPrompt({ onStart, loading }: { onStart: () => void; loading: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 24px', gap: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: '#635BFF1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#635BFF"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Connect your Stripe account</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 340 }}>
          Set up your payout account to receive payments from clients directly into your bank account via Stripe.
        </div>
      </div>
      <button
        onClick={onStart}
        disabled={loading}
        style={{ padding: '11px 28px', background: '#635BFF', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
      >
        {loading ? 'Redirecting…' : 'Connect with Stripe'}
      </button>
    </div>
  );
}

export function StripeAccountPanel({ onClose }: { onClose: () => void }) {
  const [instance, setInstance]     = useState<StripeConnectInstance | null>(null);
  const [status,   setStatus]       = useState<'loading' | 'ready' | 'no_account' | 'error'>('loading');
  const [tab,      setTab]          = useState<PanelTab>('account');
  const [onboarding, setOnboarding] = useState(false);

  const fetchSecret = useCallback(async (): Promise<string> => {
    const res = await fetch('/api/stripe-account-session', { method: 'POST' });
    if (!res.ok) throw new Error('session_error');
    const { clientSecret } = await res.json();
    return clientSecret;
  }, []);

  useEffect(() => {
    async function init() {
      try {
        // Probe first to check if account exists
        const probe = await fetch('/api/stripe-account-session', { method: 'POST' });
        if (probe.status === 404) { setStatus('no_account'); return; }
        if (!probe.ok)            { setStatus('error'); return; }

        const { clientSecret } = await probe.json();

        const inst = loadConnectAndInitialize({
          publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
          fetchClientSecret: fetchSecret,
          appearance: {
            overlays: 'dialog',
            variables: {
              colorPrimary:    '#4285F4',
              colorBackground: 'var(--surface)',
              borderRadius:    '10px',
              fontFamily:      'inherit',
            },
          },
        });

        // Seed the first secret so the instance doesn't need to re-fetch immediately
        void clientSecret;
        setInstance(inst);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }
    init();
  }, [fetchSecret]);

  async function handleOnboard() {
    setOnboarding(true);
    const res = await fetch('/api/stripe-connect-onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnUrl: window.location.href }),
    });
    const { url } = await res.json();
    window.location.href = url;
  }

  const tabs: { id: PanelTab; label: string }[] = [
    { id: 'account',  label: 'Account' },
    { id: 'payouts',  label: 'Payouts' },
    { id: 'payments', label: 'Payments' },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,25,0.35)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', borderRadius: 20, width: 700, maxWidth: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#635BFF1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#635BFF"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Stripe Account</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Manage your payouts and payments</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Tabs — only shown when ready */}
        {status === 'ready' && (
          <div style={{ display: 'flex', padding: '0 24px', borderBottom: '1px solid var(--border-light)', gap: 2, flexShrink: 0 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '12px 14px', border: 'none', borderBottom: `2px solid ${tab === t.id ? '#4285F4' : 'transparent'}`, background: 'none', color: tab === t.id ? '#4285F4' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1, transition: 'color 0.12s' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: status === 'ready' ? '24px' : 0 }}>
          {status === 'loading' && <Spinner />}

          {status === 'no_account' && (
            <OnboardingPrompt onStart={handleOnboard} loading={onboarding} />
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)', fontSize: 14 }}>
              Could not load your Stripe account. Please try again later.
            </div>
          )}

          {status === 'ready' && instance && (
            <ConnectComponentsProvider connectInstance={instance}>
              {tab === 'account'  && <ConnectAccountManagement />}
              {tab === 'payouts'  && <ConnectPayouts />}
              {tab === 'payments' && <ConnectPayments />}
            </ConnectComponentsProvider>
          )}
        </div>
      </div>
    </div>
  );
}
