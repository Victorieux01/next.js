'use client';

import { useActionState } from 'react';
import { registerUser } from '@/app/lib/actions';
import Link from 'next/link';

export default function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerUser, {});

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Name */}
      <div>
        <label className="field-label" htmlFor="name">Full name</label>
        <div className="field-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <input id="name" type="text" name="name" placeholder="Your full name" required />
        </div>
        {state.errors?.name && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{state.errors.name[0]}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="field-label" htmlFor="email">Email address</label>
        <div className="field-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>
          <input id="email" type="email" name="email" placeholder="you@example.com" required autoComplete="email" />
        </div>
        {state.errors?.email && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{state.errors.email[0]}</p>}
      </div>

      {/* Password */}
      <div>
        <label className="field-label" htmlFor="password">Password</label>
        <div className="field-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input id="password" type="password" name="password" placeholder="At least 6 characters" required minLength={6} autoComplete="new-password" />
        </div>
        {state.errors?.password && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{state.errors.password[0]}</p>}
      </div>

      {/* Global error */}
      {state.message && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 8, padding: '10px 14px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <span style={{ fontSize: 13, color: '#DC2626' }}>{state.message}</span>
        </div>
      )}

      <button
        type="submit"
        className="btn"
        disabled={isPending}
        style={{ width: '100%', padding: '11px', fontSize: 14, marginTop: 4, opacity: isPending ? 0.7 : 1 }}
      >
        {isPending ? 'Creating account…' : 'Create account'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
