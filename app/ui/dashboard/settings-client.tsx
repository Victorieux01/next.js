'use client';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { updateUserProfile } from '@/app/lib/coredon-actions';
import { useRouter } from 'next/navigation';
import { StripeAccountPanel } from '@/app/ui/dashboard/stripe-account-panel';

export const PLAN_OPTIONS = [
  { id: 'free',   label: 'Free',   fee: '5%',   feeLabel: '5% fee',   desc: 'Up to 3 active projects',                         color: '#8C99AA' },
  { id: 'pro',    label: 'Pro',    fee: '2.5%', feeLabel: '2.5% fee', desc: 'Unlimited projects · Priority support',           color: '#4285F4' },
  { id: 'studio', label: 'Studio', fee: '1%',   feeLabel: '1% fee',   desc: 'Custom integrations · Dedicated account manager', color: '#A142F4' },
];

export function planBadge(plan: string) {
  return PLAN_OPTIONS.find(o => o.id === plan) ?? PLAN_OPTIONS[0];
}

export interface UserProfile {
  name: string; email: string; plan: string; phone: string; firstName: string; lastName: string;
}

// ── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{ width: 48, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer', background: on ? '#4285F4' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
    >
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

// ── NotificationsTab ─────────────────────────────────────────────────────────
function NotificationsTab() {
  const [emailNotifs,   setEmailNotifs]   = useState(true);
  const [disputeAlerts, setDisputeAlerts] = useState(true);
  const [paymentRel,    setPaymentRel]    = useState(true);
  const [newPayments,   setNewPayments]   = useState(true);
  const [saving, setSaving] = useState(false);

  const rows = [
    { label: 'Email Notifications',  desc: 'Receive updates about escrow activity via email.',         val: emailNotifs,   set: setEmailNotifs },
    { label: 'Dispute Alerts',        desc: 'Get notified immediately when a dispute is opened.',       val: disputeAlerts, set: setDisputeAlerts },
    { label: 'Payment Released',      desc: 'Notify me when a client approves and releases funds.',     val: paymentRel,    set: setPaymentRel },
    { label: 'New Payment Requests',  desc: 'Alert me on new escrow funding requests.',                 val: newPayments,   set: setNewPayments },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {rows.map((r, i) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{r.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.desc}</div>
          </div>
          <Toggle on={r.val} onToggle={() => r.set(v => !v)} />
        </div>
      ))}
      <button
        onClick={async () => { setSaving(true); await new Promise(r => setTimeout(r, 600)); setSaving(false); }}
        disabled={saving}
        style={{ marginTop: 20, padding: '12px 24px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1, alignSelf: 'flex-start' }}
      >
        {saving ? 'Saving…' : 'Save Preferences'}
      </button>
    </div>
  );
}

// ── SecurityTab ──────────────────────────────────────────────────────────────
function SecurityTab() {
  const [currentPwd, setCurrentPwd] = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [twoFa,      setTwoFa]      = useState(false);
  const [saving,     setSaving]     = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid var(--border-light)',
    borderRadius: 10, background: 'var(--bg)', color: 'var(--text-primary)',
    fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Change Password */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Change Password</div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Current Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPwd ? 'text' : 'password'}
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              placeholder="Enter your current password"
              style={{ ...inputStyle, paddingRight: 44 }}
            />
            <button
              onClick={() => setShowPwd(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}
            >
              {showPwd
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Two-Factor Authentication</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 16px', border: '1px solid var(--border-light)', borderRadius: 12, background: 'var(--bg)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>Two-Factor Authentication</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Require a second factor to sign in.</div>
          </div>
          <Toggle on={twoFa} onToggle={() => setTwoFa(v => !v)} />
        </div>
      </div>

      <button
        onClick={async () => { setSaving(true); await new Promise(r => setTimeout(r, 600)); setSaving(false); }}
        disabled={saving}
        style={{ padding: '12px 24px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1, alignSelf: 'flex-start' }}
      >
        {saving ? 'Saving…' : 'Update Security'}
      </button>
    </div>
  );
}

// ── BillingTab ───────────────────────────────────────────────────────────────
function BillingTab({ plan, setPlan, onSave, saving }: {
  plan: string;
  setPlan: (p: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [stripeOpen, setStripeOpen] = useState(false);
  const current = planBadge(plan);
  const today = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Current plan card */}
      <div style={{ padding: '16px 18px', borderRadius: 14, background: `${current.color}12`, border: `1.5px solid ${current.color}40` }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: current.color, marginBottom: 4 }}>
          {current.label} — {current.feeLabel}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Starting: {today}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{current.desc}</div>
      </div>

      {/* Plan comparison table */}
      <div style={{ borderRadius: 12, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', background: 'var(--bg)', padding: '10px 16px', borderBottom: '1px solid var(--border-light)' }}>
          <div />
          {PLAN_OPTIONS.map(p => (
            <div key={p.id} style={{ fontSize: 12, fontWeight: 700, color: p.id === plan ? p.color : 'var(--text-secondary)', textAlign: 'center' }}>{p.label}</div>
          ))}
        </div>
        {/* Fee row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '10px 16px', borderBottom: '1px solid var(--border-light)', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Platform fee</div>
          {PLAN_OPTIONS.map(p => (
            <div key={p.id} style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: p.id === plan ? p.color : 'var(--text-primary)' }}>{p.fee}</span>
            </div>
          ))}
        </div>
        {/* Select row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '10px 16px', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Select</div>
          {PLAN_OPTIONS.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => setPlan(p.id)}
                style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${p.id === plan ? p.color : 'var(--border-light)'}`, background: p.id === plan ? p.color : 'transparent', cursor: 'pointer', padding: 0, transition: 'all 0.15s' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Payout Account */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Payout Account</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Stripe Connect */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--border-light)', borderRadius: 12, background: 'var(--bg)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#635BFF22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#635BFF"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Stripe Connect</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Your payout account is connected via Stripe.</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00C896', background: '#00C89618', border: '1px solid #00C89630', padding: '3px 10px', borderRadius: 99 }}>● Connected</span>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, padding: '0 2px' }}>
            Clients can pay by credit card or bank debit — all funds are automatically deposited to your account after approval.
          </div>

          <button
            onClick={() => setStripeOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#635BFF', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>
            Manage Payout Account
          </button>
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        style={{ padding: '12px 24px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1, alignSelf: 'flex-start' }}
      >
        {saving ? 'Saving…' : 'Save Plan'}
      </button>

      {stripeOpen && <StripeAccountPanel onClose={() => setStripeOpen(false)} />}
    </div>
  );
}

// ── SettingsModal ────────────────────────────────────────────────────────────
export function SettingsModal({ user, onClose, onSaved }: {
  user: UserProfile;
  onClose: () => void;
  onSaved?: (u: UserProfile) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'profile' | 'notifications' | 'security' | 'billing'>('profile');
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName,  setLastName]  = useState(user.lastName);
  const [phone,     setPhone]     = useState(user.phone);
  const [plan,      setPlan]      = useState(user.plan || 'free');
  const [saving,    setSaving]    = useState(false);
  const [isDark,    setIsDark]    = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('coredon-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('coredon-theme', 'light');
    }
  }

  const initials = [(firstName[0] ?? ''), (lastName[0] ?? '')].join('').toUpperCase()
    || user.name.slice(0, 2).toUpperCase();
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || user.name;
  const badge = planBadge(plan);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid var(--border-light)',
    borderRadius: 10, background: 'var(--bg)', color: 'var(--text-primary)',
    fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };

  async function handleSave() {
    setSaving(true);
    try {
      await updateUserProfile({ firstName, lastName, phone, plan });
      const updated = { ...user, name: [firstName, lastName].filter(Boolean).join(' ') || user.name, firstName, lastName, phone, plan };
      onSaved?.(updated);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'profile',       label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security',      label: 'Security' },
    { id: 'billing',       label: 'Billing' },
  ];

  const modal = (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,25,0.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', borderRadius: 20, width: 560, maxWidth: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '22px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Settings</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Manage your account and preferences</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '16px 24px 0', borderBottom: '1px solid var(--border-light)', gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 14px', border: 'none', borderBottom: `2px solid ${tab === t.id ? '#4285F4' : 'transparent'}`, background: 'none', color: tab === t.id ? '#4285F4' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1, transition: 'color 0.12s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '24px', maxHeight: '65vh', overflowY: 'auto' }}>

          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#00C896', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0, letterSpacing: '-0.02em' }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{displayName}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, background: `${badge.color}18`, border: `1px solid ${badge.color}30`, padding: '3px 10px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {badge.label} · {badge.feeLabel}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>First Name</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Last Name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email</label>
                <input value={user.email} readOnly style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (514) 000-0000" style={inputStyle} />
              </div>

              {/* Appearance */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid var(--border-light)', borderRadius: 12, background: 'var(--bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: isDark ? '#1C1C2E' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                    {isDark
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Appearance</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{isDark ? 'Dark mode' : 'Light mode'}</div>
                  </div>
                </div>
                <Toggle on={isDark} onToggle={toggleTheme} />
              </div>

              <button onClick={handleSave} disabled={saving} style={{ padding: '12px 24px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}

          {tab === 'notifications' && <NotificationsTab />}

          {tab === 'security' && <SecurityTab />}

          {tab === 'billing' && (
            <BillingTab plan={plan} setPlan={setPlan} onSave={handleSave} saving={saving} />
          )}
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modal, document.body);
}
