'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '@/app/lib/coredon-actions';

// ── Types ───────────────────────────────────────────────────────────────────
interface Step1 {
  name: string; email: string; description: string;
  start_date: string; end_date: string; expected_date: string; amount: string;
}
interface Step2 { payment_method: string; contract_notes: string; }

// ── Shared input style ──────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--card)', border: '1px solid var(--border-light)',
  borderRadius: 10, padding: '11px 14px',
  fontSize: 13, color: 'var(--text-primary)', outline: 'none',
};
function errInp(has: boolean): React.CSSProperties {
  return has ? { ...inp, borderColor: '#EF4444' } : inp;
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: 11, color: '#EF4444' }}>{error}</span>}
    </div>
  );
}

// ── Step bar ────────────────────────────────────────────────────────────────
function StepBar({ step }: { step: 1 | 2 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {([{ n: 1, label: 'Project Info' }, { n: 2, label: 'Contract' }] as const).map((s, i) => {
        const active = step === s.n, done = step > s.n;
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: active || done ? '#4285F4' : 'var(--card)',
                border: active || done ? 'none' : '1px solid var(--border-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                color: active || done ? '#fff' : 'var(--text-muted)',
              }}>
                {done
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : s.n}
              </div>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.label}</span>
            </div>
            {i === 0 && <div style={{ width: 40, height: 1, background: 'var(--border-light)', margin: '0 10px' }} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Contract preview (right panel) ─────────────────────────────────────────
function ContractPreview({ s1, s2 }: { s1: Step1; s2: Step2 }) {
  const amount = parseFloat(s1.amount) || 0;
  const fmt = (n: number) => n.toLocaleString('fr-CA', { minimumFractionDigits: 2 }) + ' $';
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '32px 28px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      fontSize: 11, color: '#1a1a2e', lineHeight: 1.6,
      minHeight: 560,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#111' }}>Contract</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Project Agreement</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
      </div>

      {/* From / To / Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>From</div>
          <div style={{ fontWeight: 700, color: '#111', fontSize: 12 }}>Coredon</div>
          <div style={{ color: '#6b7280' }}>coredon.app</div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>To</div>
          <div style={{ fontWeight: 700, color: s1.name ? '#111' : '#d1d5db', fontSize: 12 }}>{s1.name || 'Client Name'}</div>
          <div style={{ color: s1.email ? '#6b7280' : '#d1d5db' }}>{s1.email || 'client@example.com'}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Details</div>
          <div style={{ color: '#6b7280' }}>Date <span style={{ color: '#111', fontWeight: 600 }}>{today}</span></div>
          <div style={{ color: '#6b7280' }}>Ref <span style={{ color: '#111', fontWeight: 600 }}>#{Math.floor(Math.random() * 90000 + 10000)}</span></div>
        </div>
      </div>

      {/* Line items */}
      <div style={{ borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', paddingTop: 14, paddingBottom: 14, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 20px', marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Item</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 70, textAlign: 'right' }}>Qty</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 80, textAlign: 'right' }}>Total</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 20px' }}>
          <div style={{ color: s1.description ? '#111' : '#d1d5db', fontWeight: 500, fontSize: 12 }}>{s1.description || 'Project description'}</div>
          <div style={{ minWidth: 70, textAlign: 'right', color: '#6b7280' }}>1</div>
          <div style={{ minWidth: 80, textAlign: 'right', fontWeight: 700, color: amount ? '#111' : '#d1d5db' }}>{amount ? fmt(amount) : '—'}</div>
        </div>
      </div>

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
            <span>Subtotal</span><span>{amount ? fmt(amount) : '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
            <span>Tax</span><span>—</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13, color: '#111', paddingTop: 6, borderTop: '1px solid #e5e7eb', marginTop: 4 }}>
            <span>Total</span><span>{amount ? fmt(amount) : '—'}</span>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Terms</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ color: '#6b7280' }}>Start date <span style={{ color: s1.start_date ? '#111' : '#d1d5db', fontWeight: 600 }}>{s1.start_date || '—'}</span></div>
            <div style={{ color: '#6b7280' }}>Deadline <span style={{ color: s1.end_date ? '#111' : '#d1d5db', fontWeight: 600 }}>{s1.end_date || '—'}</span></div>
            <div style={{ color: '#6b7280' }}>Delivery <span style={{ color: s1.expected_date ? '#111' : '#d1d5db', fontWeight: 600 }}>{s1.expected_date || '—'}</span></div>
            <div style={{ color: '#6b7280' }}>Pay via <span style={{ color: '#111', fontWeight: 600 }}>{s2.payment_method}</span></div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Notes</div>
          <div style={{ color: s2.contract_notes ? '#374151' : '#d1d5db', fontSize: 11, lineHeight: 1.6 }}>
            {s2.contract_notes || 'Additional terms will appear here…'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function CreateProjectForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<Partial<Record<keyof Step1, string>>>({});

  const [s1, setS1] = useState<Step1>({ name: '', email: '', description: '', start_date: '', end_date: '', expected_date: '', amount: '' });
  const [s2, setS2] = useState<Step2>({ payment_method: 'Stripe Connect', contract_notes: '' });

  function upd1(field: keyof Step1, val: string) {
    setS1(p => ({ ...p, [field]: val }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof Step1, string>> = {};
    if (!s1.name.trim())        e.name          = 'Required';
    if (!s1.email.trim())       e.email         = 'Required';
    else if (!/\S+@\S+\.\S+/.test(s1.email)) e.email = 'Invalid email';
    if (!s1.description.trim()) e.description   = 'Required';
    if (!s1.start_date)         e.start_date    = 'Required';
    if (!s1.end_date)           e.end_date      = 'Required';
    if (!s1.expected_date)      e.expected_date = 'Required';
    if (!s1.amount || isNaN(parseFloat(s1.amount))) e.amount = 'Enter a valid amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(s1).forEach(([k, v]) => fd.append(k, v));
      fd.append('payment_method', s2.payment_method);
      fd.append('contract_notes', s2.contract_notes);
      await createProject(fd);
    });
  }

  return (
    <div className="page fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 32, alignItems: 'start', maxWidth: 1200 }}>

      {/* ── LEFT: Form ── */}
      <div>
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span style={{ cursor: 'pointer', color: '#4285F4', fontWeight: 600 }} onClick={() => router.push('/dashboard/projects')}>Projects</span>
          {' / '}New Project
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 2 }}>Create a New Project</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
          Step {step} of 2 — {step === 1 ? 'Project Info & Client' : 'Contract & Payment'}
        </p>

        <StepBar step={step} />

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Client Name / Company" required error={errors.name}>
                <input style={errInp(!!errors.name)} placeholder="Type client name or company…" value={s1.name} onChange={e => upd1('name', e.target.value)} />
              </Field>
              <Field label="Client Email" required error={errors.email}>
                <input style={errInp(!!errors.email)} placeholder="client@example.com" type="email" value={s1.email} onChange={e => upd1('email', e.target.value)} />
              </Field>
            </div>

            <Field label="Project Description" required error={errors.description}>
              <input style={errInp(!!errors.description)} placeholder="e.g. Brand Reel Q2" value={s1.description} onChange={e => upd1('description', e.target.value)} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Start Date" required error={errors.start_date}>
                <input style={errInp(!!errors.start_date)} type="date" value={s1.start_date} onChange={e => upd1('start_date', e.target.value)} />
              </Field>
              <Field label="Deadline (Contract End)" required error={errors.end_date}>
                <input style={errInp(!!errors.end_date)} type="date" value={s1.end_date} onChange={e => upd1('end_date', e.target.value)} />
              </Field>
            </div>

            <Field label="Expected Delivery Date" required error={errors.expected_date}>
              <input style={errInp(!!errors.expected_date)} type="date" value={s1.expected_date} onChange={e => upd1('expected_date', e.target.value)} />
            </Field>

            <Field label="Amount (CAD)" required error={errors.amount}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)', pointerEvents: 'none' }}>$</span>
                <input style={{ ...errInp(!!errors.amount), paddingLeft: 26 }} placeholder="0.00" type="number" min="0" step="0.01" value={s1.amount} onChange={e => upd1('amount', e.target.value)} />
              </div>
            </Field>

            <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
              <button onClick={() => { if (validate()) setStep(2); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Continue
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
              <button onClick={() => router.push('/dashboard/projects')}
                style={{ background: 'var(--card)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Back to Projects
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Payment Method">
              <select style={{ ...inp, appearance: 'none', cursor: 'pointer' }} value={s2.payment_method} onChange={e => setS2(p => ({ ...p, payment_method: e.target.value }))}>
                {['Stripe Connect', 'Bank Transfer', 'E-Transfer', 'Cash', 'Other'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>

            <Field label="Contract Notes (optional)">
              <textarea style={{ ...inp, minHeight: 120, resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Additional terms, conditions, or notes…"
                value={s2.contract_notes}
                onChange={e => setS2(p => ({ ...p, contract_notes: e.target.value }))} />
            </Field>

            <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
              <button onClick={handleSubmit} disabled={isPending}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1 }}>
                {isPending ? 'Creating…' : <>Create Project <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></>}
              </button>
              <button onClick={() => setStep(1)} disabled={isPending}
                style={{ background: 'var(--card)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                ← Back
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Live contract preview ── */}
      <div style={{ position: 'sticky', top: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Contract Preview
        </div>
        <ContractPreview s1={s1} s2={s2} />
      </div>

    </div>
  );
}
