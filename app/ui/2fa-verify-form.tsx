'use client';

import { useActionState } from 'react';
import { verifyTwoFactor } from '@/app/lib/actions';

export default function TwoFAVerifyForm() {
  const [state, formAction, isPending] = useActionState(verifyTwoFactor, {});

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label className="field-label" htmlFor="code">Authentication code</label>
        <div className="field-box" style={{ justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <input
            id="code"
            type="text"
            name="code"
            placeholder="000 000"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
            style={{ letterSpacing: '0.25em', fontSize: 18, fontWeight: 600, textAlign: 'center' }}
          />
        </div>
      </div>

      {state.error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 8, padding: '10px 14px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <span style={{ fontSize: 13, color: '#DC2626' }}>{state.error}</span>
        </div>
      )}

      <button
        type="submit"
        className="btn"
        disabled={isPending}
        style={{ width: '100%', padding: '11px', fontSize: 14, marginTop: 4, opacity: isPending ? 0.7 : 1 }}
      >
        {isPending ? 'Verifying…' : 'Verify'}
      </button>
    </form>
  );
}
