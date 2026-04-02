'use client';

import { useActionState, useState } from 'react';
import { verify2FASetup } from '@/app/lib/actions';
import Image from 'next/image';

interface Props {
  qrCodeDataUrl: string;
  secret: string;
}

export default function TwoFASetupForm({ qrCodeDataUrl, secret }: Props) {
  const [state, formAction, isPending] = useActionState(verify2FASetup, {});
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* QR Code */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          padding: 12,
          background: '#fff',
          borderRadius: 12,
          border: '1px solid var(--border)',
          display: 'inline-block',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <Image src={qrCodeDataUrl} alt="TOTP QR Code" width={180} height={180} unoptimized />
        </div>
      </div>

      {/* Manual key */}
      <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
          Manual entry key
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <code style={{ flex: 1, fontSize: 13, fontFamily: 'monospace', color: 'var(--text-primary)', letterSpacing: '0.1em', wordBreak: 'break-all' }}>
            {secret.match(/.{1,4}/g)?.join(' ')}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              background: copied ? 'var(--green-bg)' : 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: copied ? 'var(--green)' : 'var(--text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              fontFamily: 'inherit',
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code input */}
      <div>
        <label className="field-label" htmlFor="code">Verification code</label>
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
        style={{ width: '100%', padding: '11px', fontSize: 14, opacity: isPending ? 0.7 : 1 }}
      >
        {isPending ? 'Verifying…' : 'Verify & activate 2FA'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
        Protected with industry-standard TOTP (RFC 6238)
      </p>
    </form>
  );
}
