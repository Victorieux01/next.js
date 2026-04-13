'use client';
import { useState } from 'react';
import { Project, ProjectDispute } from '@/app/lib/coredon-types';

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

interface Props { project: Project }

export default function ClientProjectView({ project: p }: Props) {
  const isDispute  = p.status === 'Dispute';
  const isFinished = p.status === 'Released';

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
    ...(p.released_date ? [{ date: p.released_date, type: 'released', label: 'Payment released to provider' }] : []),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const typeColors: Record<string, { bg: string; color: string }> = {
    payment:  { bg: '#FEF3C7', color: '#D97706' },
    upload:   { bg: '#EFF6FF', color: '#2563EB' },
    revision: { bg: '#FEF3C7', color: '#D97706' },
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
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
        Overview of your project and deliverables for {p.name}.
      </p>

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

      {/* Files */}
      <ClientFilesSection files={p.files || []} />
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
