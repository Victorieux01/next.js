'use client';
import { useRouter } from 'next/navigation';
import { Project } from '@/app/lib/coredon-types';
import { deleteProject, addRevision, openDispute } from '@/app/lib/coredon-actions';

function fmt(n: number): string {
  return n.toLocaleString('fr-CA', { maximumFractionDigits: 0 }) + '\u00a0$';
}

function Badge({ status }: { status: string }) {
  const dotColors: Record<string, string> = { Funded: '#00C896', Released: '#0984E3', Pending: '#F59E0B', Dispute: '#EF4444' };
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

export default function ProjectDetailClient({ project: p }: Props) {
  const router = useRouter();

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
    ...(p.released_date ? [{ date: p.released_date, type: 'released', label: 'Payment released to editor' }] : []),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const typeColors: Record<string, { bg: string; color: string }> = {
    payment: { bg: '#FEF3C7', color: '#D97706' },
    upload:  { bg: '#EFF6FF', color: '#2563EB' },
    revision:{ bg: '#FEF3C7', color: '#D97706' },
    released:{ bg: '#DCFCE7', color: '#16A34A' },
  };

  return (
    <div className="page fade-in">
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
        <span style={{ cursor: 'pointer', color: '#0984E3', fontWeight: 600 }} onClick={() => router.push('/dashboard/projects')}>Projects</span>
        {' / '}{p.name}
      </div>

      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>Project Details</h1>
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
        Manage project status and deliverables for {p.name}.
      </p>

      {/* Top layout */}
      <div className="l2" style={{ gap: 20, marginBottom: 20, alignItems: 'stretch' }}>

        {/* Info Card */}
        <div className="card" style={{ flex: 1, padding: '28px 28px 20px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 24, right: 24 }}><Badge status={p.status} /></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border-light)' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: p.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0,
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

        {/* Actions Card */}
        <div className="card" style={{ width: 240, padding: 28, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <button
              className="btn-action"
              style={{ background: '#78350F', color: '#FCD34D', border: 'none', fontWeight: 700 }}
              onClick={async () => {
                const reason = prompt('Describe the reason for the dispute:');
                if (reason) await openDispute(p.id, reason);
              }}
            >
              Open Dispute
            </button>
            <button className="btn-action" onClick={async () => {
              const note = prompt('Revision note:');
              if (note) await addRevision(p.id, note);
            }}>Add Revision Note</button>
            <button className="btn-action">Export as PDF</button>
            <div style={{ flex: 1 }} />
            <button className="btn-danger" onClick={async () => {
              if (confirm('Delete this project?')) await deleteProject(p.id);
            }}>Delete Project</button>
          </div>
        </div>
      </div>

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
      <div className="card" style={{ padding: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Files &amp; Deliverables</div>
        {(p.files || []).length === 0 && (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No files uploaded yet.</div>
        )}
        {(p.files || []).map((f, i) => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg)', borderRadius: 10, marginBottom: i < (p.files || []).length - 1 ? 8 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: f.type === 'pdf' ? '#FEF2F2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: f.type === 'pdf' ? '#EF4444' : '#2563EB' }}>{f.type.toUpperCase()}</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{f.date}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
