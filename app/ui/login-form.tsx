'use client';

import { useActionState } from 'react';
import { authenticate } from '@/app/lib/actions';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [errorMessage, formAction, isPending] = useActionState(authenticate, undefined);

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Email */}
      <div>
        <label className="field-label" htmlFor="email">Email address</label>
        <div className="field-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="field-label" htmlFor="password">Password</label>
        <div className="field-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="Enter your password"
            required
            minLength={6}
            autoComplete="current-password"
          />
        </div>
      </div>

      <input type="hidden" name="redirectTo" value={callbackUrl} />

      {/* Error */}
      {errorMessage && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 8, padding: '10px 14px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <span style={{ fontSize: 13, color: '#DC2626' }}>{errorMessage}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        className="btn"
        disabled={isPending}
        style={{ width: '100%', padding: '11px', fontSize: 14, marginTop: 4, opacity: isPending ? 0.7 : 1 }}
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>

      {/* Register link */}
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
        Don&apos;t have an account?{' '}
        <Link href="/register" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>
          Create account
        </Link>
      </p>
    </form>
  );
}
