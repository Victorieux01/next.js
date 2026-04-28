'use client';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Project, ProjectDispute } from '@/app/lib/coredon-types';
import { approveProject, clientRequestChanges } from '@/app/lib/coredon-actions';
import ChatSection from './chat-section';

async function redirectToCheckout(projectId: string, amount: number, email: string, projectName: string, token: string) {
  const res = await fetch('/api/fund-project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, amount, email, projectName, token }),
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}

function fmt(n: number): string {
  return n.toLocaleString('fr-CA', { maximumFractionDigits: 0 }) + '\u00a0$';
}

function parseDisputeReason(raw: string): { original: string; notes: { date: string; text: string }[] } {
  const parts = raw.split(/\n\n── Internal Note \(([^)]+)\) ──\n/);
  const original = parts[0] ?? '';
  const notes: { date: string; text: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    notes.push({ date: parts[i] ?? '', text: parts[i + 1] ?? '' });
  }
  return { original, notes };
}

function Badge({ status }: { status: string }) {
  const dotColors: Record<string, string> = {
    Funded: '#00C896', Released: '#0984E3', Pending: '#F59E0B', Dispute: '#EF4444',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColors[status] || '#94A3B8', display: 'inline-block' }} />
      {status}
    </span>
  );
}

function EventIcon({ type }: { type: string }) {
  if (type === 'payment') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  );
  if (type === 'upload') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
  if (type === 'revision') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

interface ClientProjectSummary {
  id: string; name: string; status: string; amount: number;
  start_date: string; expected_date: string; color: string; initials: string;
  user_id: string; provider_name: string; token?: string;
}

interface Props { project: Project; allProjects?: ClientProjectSummary[] }

export default function ClientProjectView({ project: initialProject, allProjects = [] }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portalToken = searchParams.get('token') ?? '';
  const [p, setP] = useState(initialProject);
  const [tab, setTab] = useState<'overview' | 'shared'>('overview');
  const isPending  = p.status === 'Pending';
  const isDispute  = p.status === 'Dispute';
  const isFinished = p.status === 'Released';
  const isFunded   = p.status === 'Funded';

  // Pay / Fund state
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  // Approve & Release
  const [approvePending, startApprove] = useTransition();
  const [approveError, setApproveError] = useState('');
  const [approved, setApproved] = useState(false);

  function handleApprove() {
    setApproveError('');
    startApprove(async () => {
      const res = await approveProject(p.id);
      if (res.success) {
        setApproved(true);
        setP(prev => ({ ...prev, status: 'Released', released_date: new Date().toISOString().slice(0, 10), approved_date: new Date().toISOString().slice(0, 10) }));
      } else {
        setApproveError(res.error ?? 'Something went wrong.');
      }
    });
  }

  // Request Changes
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [changeName, setChangeName] = useState(p.email?.split('@')[0] ?? 'Client');
  const [changesPending, startChanges] = useTransition();
  const [changesError, setChangesError] = useState('');
  const [changesSent, setChangesSent] = useState(false);

  let durationVal = '—';
  if (p.start_date) {
    const refDate = isFinished ? (p.end_date || p.expected_date) : p.expected_date;
    if (refDate) {
      const days = Math.max(1, Math.round((new Date(refDate).getTime() - new Date(p.start_date).getTime()) / (1000 * 60 * 60 * 24)));
      durationVal = days + ' days';
    }
  }

  const shortId = p.id.replace(/-/g, '').slice(0, 8).toUpperCase();

  const events = [
    ...(p.prepaid_date ? [{ date: p.prepaid_date, type: 'payment', label: 'Escrow funded via ' + (p.prepaid_method || 'Stripe Connect') }] : []),
    ...(p.versions || []).map(v => ({ date: v.date, type: 'upload', label: v.note })),
    ...(p.revisions || []).map(r => ({ date: r.date, type: 'revision', label: r.note })),
    ...(p.approved_date ? [{ date: p.approved_date, type: 'approved', label: 'Deliverables approved by client' }] : []),
    ...(p.released_date ? [{ date: p.released_date, type: 'released', label: 'Payment released to provider' }] : []),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const typeColors: Record<string, { bg: string; color: string }> = {
    payment:  { bg: '#FEF3C7', color: '#D97706' },
    upload:   { bg: '#EFF6FF', color: '#2563EB' },
    revision: { bg: '#FEF3C7', color: '#D97706' },
    approved: { bg: '#DCFCE7', color: '#00C896' },
    released: { bg: '#DCFCE7', color: '#16A34A' },
  };

  const activeDisputes = (p.disputes || []).filter((d: ProjectDispute) => d.status === 'Open');

  return (
    <div className="page fade-in">
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
        Projects / {p.name}
      </div>

      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>Project Details</h1>
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Overview of your project and deliverables for {p.name}.
      </p>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--border-light)' }}>
        {(['overview', 'shared'] as const).map((t) => {
          const labels = { overview: 'Overview', shared: 'Shared with me' };
          const isActive = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 16px', fontSize: 14, fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--blue)' : 'var(--text-muted)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: isActive ? '2px solid var(--blue)' : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {labels[t]}
              {t === 'shared' && allProjects.length > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 11, fontWeight: 700,
                  background: isActive ? 'rgba(9,132,227,0.12)' : 'var(--surface)',
                  color: isActive ? 'var(--blue)' : 'var(--text-muted)',
                  borderRadius: 20, padding: '2px 7px',
                  border: '1px solid var(--border-light)',
                }}>
                  {allProjects.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Shared with me tab ── */}
      {tab === 'shared' && (
        <SharedWithMeSection projects={allProjects} currentId={p.id} />
      )}

      {/* ── Overview tab ── */}
      {tab === 'overview' && <>

      {/* Top layout — info card only (no actions sidebar for client) */}
      <div className="l2" style={{ gap: 20, marginBottom: 20, alignItems: 'stretch' }}>

        {/* Info Card */}
        <div className="card" style={{ flex: 1, padding: '28px 28px 20px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 24, right: 24 }}><Badge status={p.status} /></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border-light)' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: isDispute ? '#EF4444' : p.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0,
              transition: 'background 0.2s',
            }}>
              {p.initials}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{p.name}</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>{p.description}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0 }}>
            {[
              ['START DATE',          p.start_date || '—'],
              ['AMOUNT',              fmt(p.amount)],
              ['PREPAID ON',          p.prepaid_date || '—'],
              ['NUMBER OF REVISIONS', String((p.revisions || []).length)],
              ['EXPECTED DELIVERY',   p.expected_date || '—'],
              ['END DATE',            isFinished ? (p.end_date || '—') : 'Not finished'],
              ['RELEASED ON',         p.released_date || 'Not finished'],
              ['DURATION',            durationVal],
              ['ID',                  shortId],
              ['PAYMENT METHOD',      p.prepaid_method || '—'],
            ].map(([label, val], i) => {
              const row = Math.floor(i / 5), col = i % 5;
              const isMuted = val === 'Not finished' || val === '—';
              return (
                <div key={label} style={{
                  paddingTop:    row > 0 ? 20 : 0,
                  paddingBottom: row < 1 ? 20 : 0,
                  paddingLeft:   col > 0 ? 20 : 0,
                  paddingRight:  col < 4 ? 20 : 0,
                  borderRight:   col < 4 ? '1px solid var(--border-light)' : 'none',
                  borderBottom:  row < 1 ? '1px solid var(--border-light)' : 'none',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: isMuted ? 'var(--text-muted)' : 'var(--text-primary)', letterSpacing: '-0.01em' }}>{val}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Card (replaces Actions for the client) */}
        <div className="card" style={{ width: 240, padding: 28, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Project Status</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            {[
              { label: 'Status',   val: p.status,                color: p.status === 'Dispute' ? '#EF4444' : p.status === 'Released' ? '#0984E3' : p.status === 'Funded' ? '#00C896' : '#F59E0B' },
              { label: 'Amount',   val: fmt(p.amount),           color: 'var(--text-primary)' },
              { label: 'Start',    val: p.start_date || '—',     color: 'var(--text-secondary)' },
              { label: 'Deadline', val: p.expected_date || '—',  color: 'var(--text-secondary)' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                <span style={{ fontWeight: 700, color }}>{val}</span>
              </div>
            ))}
          </div>

          {isDispute && (
            <div style={{ background: '#FEF2F2', borderRadius: 8, padding: '10px 12px', border: '1px solid #FECACA' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', marginBottom: 2 }}>Dispute Active</div>
              <div style={{ fontSize: 12, color: '#7F1D1D', lineHeight: 1.4 }}>Funds are frozen pending resolution.</div>
            </div>
          )}
          {isFinished && (
            <div style={{ background: '#DCFCE7', borderRadius: 8, padding: '10px 12px', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', marginBottom: 2 }}>Project Complete</div>
              <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.4 }}>Payment has been released.</div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Panel — shown when still Pending */}
      {isPending && (
        <div className="card" style={{ padding: 28, marginBottom: 20, border: '1px solid rgba(99,102,241,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Fund your project</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                Your payment is held securely in escrow and only released once you approve the deliverables.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Amount due</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>{fmt(p.amount)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Secured by</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Stripe Escrow</div>
            </div>
          </div>

          {payError && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{payError}</div>}

          <button
            disabled={paying}
            onClick={async () => {
              setPaying(true);
              setPayError('');
              try {
                await redirectToCheckout(p.id, p.amount, p.email ?? '', p.name, portalToken);
              } catch {
                setPayError('Could not start checkout. Please try again.');
                setPaying(false);
              }
            }}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 10,
              background: paying ? '#4338CA' : '#6366F1', color: '#fff',
              fontWeight: 700, fontSize: 15, border: 'none',
              cursor: paying ? 'wait' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {paying ? 'Redirecting to checkout…' : `Pay ${fmt(p.amount)} — Fund Escrow`}
          </button>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Secured by Stripe · Funds released only upon your approval</span>
          </div>
        </div>
      )}

      {/* Escrow Action Panel — only shown while Funded */}
      {isFunded && !approved && (
        <div className="card" style={{ padding: 28, marginBottom: 20, border: '1px solid rgba(0,200,150,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,200,150,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00C896" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Ready to approve?</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                Review the latest deliverable, then approve to release the escrow funds to your provider.
              </div>
            </div>
          </div>

          {!showChangesForm ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleApprove}
                disabled={approvePending}
                style={{
                  flex: 1, padding: '13px 20px', borderRadius: 10,
                  background: approvePending ? '#1a4a3a' : '#00C896', color: approvePending ? '#555' : '#000',
                  fontWeight: 700, fontSize: 14, border: 'none', cursor: approvePending ? 'wait' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {approvePending ? 'Releasing funds…' : '✓ Approve & Release Funds'}
              </button>
              <button
                onClick={() => setShowChangesForm(true)}
                style={{
                  flex: 1, padding: '13px 20px', borderRadius: 10,
                  background: 'transparent', color: 'var(--text-primary)',
                  fontWeight: 700, fontSize: 14,
                  border: '1px solid var(--border-light)',
                  cursor: 'pointer',
                }}
              >
                Request Changes
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Your name</div>
              <input
                value={changeName}
                onChange={e => setChangeName(e.target.value)}
                placeholder="Your name"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8, marginBottom: 12,
                  background: 'var(--surface)', border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>What needs to be changed?</div>
              <textarea
                value={changeReason}
                onChange={e => setChangeReason(e.target.value)}
                placeholder="Describe the changes you'd like…"
                rows={4}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8, marginBottom: 12,
                  background: 'var(--surface)', border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)', fontSize: 14, resize: 'vertical', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              {changesError && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 10 }}>{changesError}</div>}
              {changesSent ? (
                <div style={{ color: '#00C896', fontSize: 14, fontWeight: 600, padding: '10px 0' }}>
                  ✓ Your request has been sent to your provider.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => {
                      if (!changeReason.trim()) { setChangesError('Please describe the changes.'); return; }
                      setChangesError('');
                      startChanges(async () => {
                        const res = await clientRequestChanges(p.id, changeName, changeReason.trim());
                        if (res.success) { setChangesSent(true); setChangeReason(''); }
                        else setChangesError(res.error ?? 'Something went wrong.');
                      });
                    }}
                    disabled={changesPending}
                    style={{
                      flex: 1, padding: '12px 20px', borderRadius: 10,
                      background: '#1a8cff', color: '#fff',
                      fontWeight: 700, fontSize: 14, border: 'none',
                      cursor: changesPending ? 'wait' : 'pointer',
                    }}
                  >
                    {changesPending ? 'Sending…' : 'Send Request'}
                  </button>
                  <button
                    onClick={() => { setShowChangesForm(false); setChangesError(''); }}
                    style={{
                      padding: '12px 20px', borderRadius: 10,
                      background: 'transparent', border: '1px solid var(--border-light)',
                      color: 'var(--text-primary)', fontWeight: 600, fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {approveError && <div style={{ color: '#EF4444', fontSize: 13, marginTop: 12 }}>{approveError}</div>}
        </div>
      )}

      {/* Approval confirmed banner */}
      {(approved || p.status === 'Released') && p.approved_date && (
        <div className="card" style={{ padding: '16px 24px', marginBottom: 20, background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.25)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00C896" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#00C896' }}>
            You approved this project on {p.approved_date}. Funds have been released.
          </span>
        </div>
      )}

      {/* Active Disputes (read-only) */}
      {activeDisputes.length > 0 && (
        <ClientDisputesSection disputes={activeDisputes} amount={p.amount} />
      )}

      {/* Timeline */}
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Project Timeline</div>
        {events.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No events yet.</div>}
        {events.map((e, i) => {
          const ts = typeColors[e.type] || { bg: '#F1F5F9', color: 'var(--text-secondary)' };
          return (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: ts.bg, color: ts.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <EventIcon type={e.type} />
                </div>
                {i < events.length - 1 && (
                  <div style={{ width: 1, flex: 1, minHeight: 16, background: 'var(--border-light)', margin: '4px 0' }} />
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', paddingTop: 8, paddingBottom: i < events.length - 1 ? 8 : 0 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{e.label}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 12 }}>{e.date}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat */}
      <ChatSection
        projectId={p.id}
        messages={p.messages || []}
        side="client"
        senderName={p.name || p.email?.split('@')[0] || 'Client'}
        onRefresh={() => router.refresh()}
      />

      {/* Files */}
      <ClientFilesSection files={p.files || []} />

      </>}
    </div>
  );
}

// ── Client-facing Disputes (read-only) ─────────────────────────────────────
function ClientDisputesSection({ disputes, amount }: { disputes: ProjectDispute[]; amount: number }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#EF4444' }}>Disputes</span>
        <span style={{ background: '#FEF2F2', color: '#EF4444', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 8px' }}>
          {disputes.length} active
        </span>
      </div>

      {disputes.map((d, idx) => {
        const { original } = parseDisputeReason(d.reason);
        return (
          <div key={d.id} style={{
            background: 'var(--surface)',
            border: '1px solid #FECACA',
            borderLeft: '4px solid #EF4444',
            borderRadius: 12,
            padding: 24,
            marginBottom: idx < disputes.length - 1 ? 12 : 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Dispute #{idx + 1} — Active</div>
                  <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, marginTop: 2 }}>Funds are frozen — review in progress</div>
                </div>
              </div>
              <span style={{ background: '#FEF2F2', color: '#EF4444', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '4px 10px', border: '1px solid #FECACA' }}>
                Open
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, padding: '16px 0', borderTop: '1px solid #FECACA', borderBottom: '1px solid #FECACA', margin: '16px 0' }}>
              {[
                ['DISPUTE OPENED', d.date],
                ['AMOUNT FROZEN',  amount.toLocaleString('fr-CA', { maximumFractionDigits: 0 }) + '\u00a0$'],
                ['STATUS',         d.status],
              ].map(([label, val], i) => (
                <div key={label} style={{ paddingLeft: i > 0 ? 20 : 0, borderLeft: i > 0 ? '1px solid #FECACA' : 'none' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, opacity: 0.7 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#7F1D1D' }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, opacity: 0.7 }}>
              Dispute Reason
            </div>
            <div style={{ background: '#FEF2F2', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#7F1D1D', lineHeight: 1.6, whiteSpace: 'pre-wrap', border: '1px solid #FECACA' }}>
              {original}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Files & Deliverables ────────────────────────────────────────────────────
function ClientFilesSection({ files }: { files: { id: string; name: string; date: string; type: string; url?: string }[] }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleDownload(url: string, name: string) {
    setDownloading(name);
    try {
      const res  = await fetch(url);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = href;
      a.download = name;
      a.click();
      URL.revokeObjectURL(href);
    } finally {
      setDownloading(null);
    }
  }

  function fileIcon(type: string) {
    if (type === 'pdf') return (
      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
    );
    if (type === 'image') return (
      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
    );
    if (type === 'video') return (
      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
        </svg>
      </div>
    );
    return (
      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 28, marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Files &amp; Deliverables</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 16px', padding: '8px 14px', borderBottom: '1px solid var(--border-light)', marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>File Name</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 110 }}>Upload Date</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 80, textAlign: 'right' }}>Action</span>
      </div>

      {files.length === 0 && (
        <div style={{ padding: '20px 14px', fontSize: 13, color: 'var(--text-muted)' }}>No files yet.</div>
      )}
      {files.map((f, i) => (
        <div
          key={f.id}
          onDoubleClick={() => f.url && window.open(f.url, '_blank')}
          title={f.url ? 'Double-click to open' : undefined}
          style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 16px', alignItems: 'center',
            padding: '12px 14px',
            borderBottom: i < files.length - 1 ? '1px solid var(--border-light)' : 'none',
            borderRadius: 8,
            cursor: f.url ? 'pointer' : 'default',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {fileIcon(f.type)}
            <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 110 }}>{f.date}</span>
          {f.url ? (
            <button
              onClick={() => handleDownload(f.url!, f.name)}
              disabled={downloading === f.name}
              style={{
                fontSize: 13, fontWeight: 600, color: 'var(--blue)',
                background: 'none', border: 'none', cursor: downloading === f.name ? 'wait' : 'pointer',
                padding: 0, minWidth: 80, textAlign: 'right',
                opacity: downloading === f.name ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {downloading === f.name ? 'Downloading…' : 'Download'}
            </button>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 80, textAlign: 'right' }}>—</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Shared with me ──────────────────────────────────────────────────────────
function SharedWithMeSection({ projects, currentId }: { projects: ClientProjectSummary[]; currentId: string }) {
  const statusColor: Record<string, string> = {
    Funded: '#00C896', Released: '#0984E3', Pending: '#F59E0B', Dispute: '#EF4444',
  };

  if (projects.length === 0) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No shared projects</div>
        <div style={{ fontSize: 13 }}>Projects shared with your email will appear here.</div>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>
          All projects shared with you
          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0 16px', padding: '6px 12px', borderBottom: '1px solid var(--border-light)', marginBottom: 4 }}>
          {['Project', 'Status', 'Amount', 'Deadline'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
          ))}
        </div>
        {projects.map((proj) => (
          <a
            key={proj.id}
            href={proj.token ? `/client/${proj.id}?token=${proj.token}` : `/client/${proj.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0 16px',
              alignItems: 'center', padding: '14px 12px',
              borderBottom: '1px solid var(--border-light)',
              borderRadius: 8,
              background: proj.id === currentId ? 'rgba(99,102,241,0.06)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => { if (proj.id !== currentId) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = proj.id === currentId ? 'rgba(99,102,241,0.06)' : 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: proj.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                  {proj.initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {proj.name}
                    {proj.id === currentId && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#6366F1', background: 'rgba(99,102,241,0.12)', borderRadius: 20, padding: '2px 8px' }}>current</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{proj.provider_name || '—'}</div>
                </div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor[proj.status] || '#94A3B8', display: 'inline-block', flexShrink: 0 }} />
                {proj.status}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>
                {proj.amount.toLocaleString('fr-CA', { maximumFractionDigits: 0 })}&nbsp;$
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {proj.expected_date || '—'}
              </span>
            </div>
          </a>
        ))}
      </div>
      <ProvidersSection projects={projects} />
    </>
  );
}

// ── Providers ───────────────────────────────────────────────────────────────
function ProvidersSection({ projects }: { projects: ClientProjectSummary[] }) {
  const byProvider = Object.values(
    projects.reduce<Record<string, { name: string; count: number; funded: number; statuses: string[] }>>(
      (acc, p) => {
        if (!acc[p.user_id]) acc[p.user_id] = { name: p.provider_name, count: 0, funded: 0, statuses: [] };
        acc[p.user_id].count++;
        acc[p.user_id].funded += p.amount;
        acc[p.user_id].statuses.push(p.status);
        return acc;
      }, {}
    )
  );

  return (
    <div className="card" style={{ padding: 28, marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Providers</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {byProvider.map((prov, i) => {
          const activeCount = prov.statuses.filter(s => s === 'Funded' || s === 'Pending').length;
          const doneCount   = prov.statuses.filter(s => s === 'Released').length;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderRadius: 12,
              background: 'var(--surface)', border: '1px solid var(--border-light)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(99,102,241,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800, color: '#6366F1', flexShrink: 0,
                }}>
                  {(prov.name || 'P').slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{prov.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {prov.count} project{prov.count !== 1 ? 's' : ''} · {activeCount} active · {doneCount} completed
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>
                  {prov.funded.toLocaleString('fr-CA', { maximumFractionDigits: 0 })}&nbsp;$
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
