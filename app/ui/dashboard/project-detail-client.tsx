'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, ProjectDispute } from '@/app/lib/coredon-types';
import { deleteProject, addRevision, openDispute, resolveDispute, addDisputeNote } from '@/app/lib/coredon-actions';

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

// Parse reason string — split original reason from internal notes
function parseDisputeReason(raw: string): { original: string; notes: { date: string; text: string }[] } {
  const parts = raw.split(/\n\n── Internal Note \(([^)]+)\) ──\n/);
  const original = parts[0] ?? '';
  const notes: { date: string; text: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    notes.push({ date: parts[i] ?? '', text: parts[i + 1] ?? '' });
  }
  return { original, notes };
}

interface Props { project: Project }

export default function ProjectDetailClient({ project: p }: Props) {
  const router = useRouter();

  // Dispute modal state: null | 'reason' | 'confirm'
  const [disputeStep,  setDisputeStep]  = useState<null | 'reason' | 'confirm'>(null);
  const [disputeReason, setDisputeReason] = useState('');

  // Note modal state
  const [noteDispute, setNoteDispute] = useState<ProjectDispute | null>(null);
  const [noteText,    setNoteText]    = useState('');

  // Revision modal
  const [revModal,    setRevModal]    = useState(false);
  const [revNote,     setRevNote]     = useState('');

  // Loading states
  const [submitting, setSubmitting] = useState(false);

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
    ...(p.released_date ? [{ date: p.released_date, type: 'released', label: 'Payment released to editor' }] : []),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const typeColors: Record<string, { bg: string; color: string }> = {
    payment:  { bg: '#FEF3C7', color: '#D97706' },
    upload:   { bg: '#EFF6FF', color: '#2563EB' },
    revision: { bg: '#FEF3C7', color: '#D97706' },
    released: { bg: '#DCFCE7', color: '#16A34A' },
  };

  // ── PDF Export ─────────────────────────────────────────────────────────────
  function handleExportPdf() {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Contract — ${p.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#0F172A;background:#fff;padding:72px 80px;line-height:1.7;}
    .logo{font-weight:800;font-size:22px;letter-spacing:-0.04em;margin-bottom:40px;color:#0984E3;}
    h1{font-size:30px;font-weight:800;letter-spacing:-0.03em;margin-bottom:6px;}
    .subtitle{font-size:14px;color:#64748B;margin-bottom:40px;}
    .divider{border:none;border-top:1px solid #EAECF0;margin:32px 0;}
    .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;margin-bottom:16px;}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;}
    .field-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94A3B8;margin-bottom:4px;}
    .field-val{font-size:15px;font-weight:700;color:#0F172A;}
    .amount-block{background:#0F172A;color:#fff;border-radius:12px;padding:24px 28px;display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;}
    .amount-label{font-size:13px;font-weight:600;opacity:0.6;}
    .amount-val{font-size:28px;font-weight:800;letter-spacing:-0.03em;}
    .desc-box{background:#F9FAFB;border-radius:10px;padding:20px 22px;font-size:14px;color:#0F172A;white-space:pre-wrap;margin-bottom:32px;}
    .sig-row{display:flex;gap:40px;margin-top:40px;}
    .sig-block{flex:1;}
    .sig-line{border-top:1.5px solid #0F172A;margin-top:48px;padding-top:8px;font-size:12px;color:#64748B;}
    .footer{margin-top:60px;font-size:11px;color:#94A3B8;text-align:center;}
    @media print{body{padding:40px 48px;}}
  </style>
</head>
<body>
  <div class="logo">Coredon</div>
  <h1>Project Contract</h1>
  <div class="subtitle">Issued on ${today} &mdash; Contract ID: ${shortId}</div>
  <hr class="divider"/>

  <div class="section-title">Parties</div>
  <div class="grid">
    <div>
      <div class="field-label">Client Name / Company</div>
      <div class="field-val">${p.name}</div>
    </div>
    <div>
      <div class="field-label">Client Email</div>
      <div class="field-val">${p.email}</div>
    </div>
  </div>

  <div class="amount-block">
    <div>
      <div class="amount-label">Project Amount (Escrow)</div>
      <div class="amount-val">${fmt(p.amount)}</div>
    </div>
    <div style="text-align:right;">
      <div class="amount-label">Payment Method</div>
      <div style="font-size:15px;font-weight:700;">${p.prepaid_method || 'Stripe Connect'}</div>
    </div>
  </div>

  <div class="section-title">Project Details</div>
  <div class="grid">
    <div>
      <div class="field-label">Start Date</div>
      <div class="field-val">${p.start_date || '—'}</div>
    </div>
    <div>
      <div class="field-label">Expected Delivery</div>
      <div class="field-val">${p.expected_date || '—'}</div>
    </div>
    <div>
      <div class="field-label">Duration</div>
      <div class="field-val">${durationVal}</div>
    </div>
    <div>
      <div class="field-label">Number of Revisions</div>
      <div class="field-val">${(p.revisions || []).length}</div>
    </div>
  </div>

  <div class="section-title">Scope of Work &amp; Contract Notes</div>
  <div class="desc-box">${(p.description || '—').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>

  <div class="section-title">Terms</div>
  <p style="font-size:13px;color:#475569;margin-bottom:32px;line-height:1.8;">
    The payment of <strong>${fmt(p.amount)}</strong> is held in escrow via Coredon and will be released to the service provider upon client approval of the final deliverables. If a dispute is raised, funds will remain frozen until resolved. This contract is binding once both parties have signed or the project has been funded.
  </p>

  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-line">Client Signature &mdash; ${p.name}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Service Provider Signature</div>
    </div>
  </div>

  <div class="footer">Coredon &mdash; Secure Escrow &amp; Project Management &mdash; Contract #${shortId}</div>
  <script>window.onload=function(){window.print();}</script>
</body>
</html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleOpenDispute() {
    if (!disputeReason.trim()) return;
    setSubmitting(true);
    await openDispute(p.id, disputeReason.trim());
    setSubmitting(false);
    setDisputeStep(null);
    setDisputeReason('');
    router.refresh();
  }

  async function handleAccept(d: ProjectDispute) {
    setSubmitting(true);
    await resolveDispute(d.id, p.id, 'accept');
    setSubmitting(false);
    router.refresh();
  }

  async function handleReject(d: ProjectDispute) {
    setSubmitting(true);
    await resolveDispute(d.id, p.id, 'reject');
    setSubmitting(false);
    router.refresh();
  }

  async function handleAddNote() {
    if (!noteDispute || !noteText.trim()) return;
    setSubmitting(true);
    await addDisputeNote(noteDispute.id, noteText.trim(), p.id);
    setSubmitting(false);
    setNoteDispute(null);
    setNoteText('');
    router.refresh();
  }

  async function handleAddRevision() {
    if (!revNote.trim()) return;
    setSubmitting(true);
    await addRevision(p.id, revNote.trim());
    setSubmitting(false);
    setRevModal(false);
    setRevNote('');
    router.refresh();
  }

  const activeDisputes = (p.disputes || []).filter(d => d.status === 'Open');

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

        {/* Actions Card */}
        <div className="card" style={{ width: 240, padding: 28, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <button
              className="btn-action"
              disabled={isDispute}
              style={isDispute
                ? { opacity: 0.45, cursor: 'not-allowed', fontWeight: 700 }
                : { background: '#78350F', color: '#FCD34D', border: 'none', fontWeight: 700 }
              }
              onClick={() => { if (!isDispute) setDisputeStep('reason'); }}
            >
              {isDispute ? 'Dispute Active' : 'Open Dispute'}
            </button>
            <button className="btn-action" onClick={() => setRevModal(true)}>Add Revision Note</button>
            <button className="btn-action" onClick={handleExportPdf}>Export as PDF</button>
            <div style={{ flex: 1 }} />
            <button className="btn-danger" onClick={async () => {
              if (confirm('Delete this project? This cannot be undone.')) await deleteProject(p.id);
            }}>Delete Project</button>
          </div>
        </div>
      </div>

      {/* Disputes Section */}
      {activeDisputes.length > 0 && (
        <DisputesSection
          disputes={activeDisputes}
          amount={p.amount}
          projectId={p.id}
          onAccept={handleAccept}
          onReject={handleReject}
          onAddNote={(d) => { setNoteDispute(d); setNoteText(''); }}
          submitting={submitting}
        />
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

      <UploadSection projectId={p.id} versions={p.versions || []} />
      <FilesSection files={p.files || []} />

      {/* ── Dispute Step 1 Modal: Reason ── */}
      {disputeStep === 'reason' && (
        <div className="modal-overlay" onClick={() => setDisputeStep(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Open a Dispute</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Funds will be frozen until the dispute is resolved.</div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                Reason for Dispute
              </label>
              <textarea
                autoFocus
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                placeholder="Describe what went wrong or why you are raising this dispute…"
                rows={5}
                style={{
                  width: '100%', border: '1px solid var(--border)', borderRadius: 10,
                  padding: '12px 14px', fontSize: 14, fontFamily: 'inherit',
                  color: 'var(--text-primary)', background: 'var(--surface)',
                  resize: 'vertical', lineHeight: 1.6,
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => { setDisputeStep(null); setDisputeReason(''); }}>Cancel</button>
              <button
                style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: disputeReason.trim() ? 'pointer' : 'not-allowed', opacity: disputeReason.trim() ? 1 : 0.5 }}
                disabled={!disputeReason.trim()}
                onClick={() => disputeReason.trim() && setDisputeStep('confirm')}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dispute Step 2 Modal: Confirm ── */}
      {disputeStep === 'confirm' && (
        <div className="modal-overlay" onClick={() => setDisputeStep('reason')}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Confirm Dispute</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Funds of <strong>{fmt(p.amount)}</strong> will be frozen immediately.
              </div>
            </div>

            <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '14px 16px', marginBottom: 24, borderLeft: '3px solid #EF4444' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Dispute Reason</div>
              <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{disputeReason}</div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setDisputeStep('reason')}>Back</button>
              <button
                disabled={submitting}
                style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}
                onClick={handleOpenDispute}
              >
                {submitting ? 'Submitting…' : 'Confirm Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Revision Modal ── */}
      {revModal && (
        <div className="modal-overlay" onClick={() => setRevModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>Add Revision Note</div>
            <textarea
              autoFocus
              value={revNote}
              onChange={e => setRevNote(e.target.value)}
              placeholder="Describe the revision request…"
              rows={4}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text-primary)', background: 'var(--surface)', resize: 'vertical', lineHeight: 1.6, marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => { setRevModal(false); setRevNote(''); }}>Cancel</button>
              <button
                className="btn"
                disabled={!revNote.trim() || submitting}
                style={{ opacity: !revNote.trim() || submitting ? 0.6 : 1 }}
                onClick={handleAddRevision}
              >
                {submitting ? 'Saving…' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Internal Note Modal ── */}
      {noteDispute && (
        <div className="modal-overlay" onClick={() => setNoteDispute(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Add Internal Note</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              This note will be appended to the dispute record.
            </div>
            <textarea
              autoFocus
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add your internal note here…"
              rows={4}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text-primary)', background: 'var(--surface)', resize: 'vertical', lineHeight: 1.6, marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => { setNoteDispute(null); setNoteText(''); }}>Cancel</button>
              <button
                className="btn"
                disabled={!noteText.trim() || submitting}
                style={{ opacity: !noteText.trim() || submitting ? 0.6 : 1 }}
                onClick={handleAddNote}
              >
                {submitting ? 'Saving…' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Disputes Section ────────────────────────────────────────────────────────
function DisputesSection({
  disputes, amount, projectId,
  onAccept, onReject, onAddNote, submitting,
}: {
  disputes: ProjectDispute[];
  amount: number;
  projectId: string;
  onAccept: (d: ProjectDispute) => void;
  onReject: (d: ProjectDispute) => void;
  onAddNote: (d: ProjectDispute) => void;
  submitting: boolean;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      {/* Header */}
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
        const { original, notes } = parseDisputeReason(d.reason);
        return (
          <div
            key={d.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid #FECACA',
              borderLeft: '4px solid #EF4444',
              borderRadius: 12,
              padding: 24,
              marginBottom: idx < disputes.length - 1 ? 12 : 0,
            }}
          >
            {/* Dispute header */}
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

            {/* Detail grid */}
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

            {/* Original reason */}
            <div style={{ marginBottom: notes.length > 0 ? 12 : 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, opacity: 0.7 }}>
                Dispute Reason
              </div>
              <div style={{ background: '#FEF2F2', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#7F1D1D', lineHeight: 1.6, whiteSpace: 'pre-wrap', border: '1px solid #FECACA' }}>
                {original}
              </div>
            </div>

            {/* Internal notes */}
            {notes.map((n, ni) => (
              <div key={ni} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Internal Note — {n.date}
                </div>
                <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', border: '1px solid var(--border-light)' }}>
                  {n.text}
                </div>
              </div>
            ))}

            {/* Resolution actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                disabled={submitting}
                onClick={() => onAccept(d)}
                style={{ flex: 1, background: '#0984E3', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.6 : 1 }}
              >
                Accept
              </button>
              <button
                disabled={submitting}
                onClick={() => onReject(d)}
                style={{ flex: 1, background: 'var(--surface)', color: '#7F1D1D', border: '1.5px solid #EF4444', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.6 : 1 }}
              >
                Reject
              </button>
              <button
                disabled={submitting}
                onClick={() => onAddNote(d)}
                className="btn-outline"
                style={{ flex: 1, fontSize: 13, opacity: submitting ? 0.6 : 1 }}
              >
                Add Internal Note
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Upload Your Work ────────────────────────────────────────────────────────
function UploadSection({ projectId, versions }: { projectId: string; versions: { id: string; note: string; date: string }[] }) {
  const router    = useRouter();
  const inputRef  = useRef<HTMLInputElement>(null);
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('projectId', projectId);
      const res  = await fetch('/api/upload-project-file', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Upload failed'); break; }
    }
    setUploading(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ padding: 28, marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Upload Your Work</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Upload your deliverable so the client can review and approve it.
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#4285F4' : 'var(--border-light)'}`,
          borderRadius: 12,
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(66,133,244,0.05)' : 'var(--bg)',
          transition: 'all 0.15s',
          marginBottom: 24,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".mp4,.mov,.zip,.pdf"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          {uploading ? 'Uploading…' : <><span>Drop your file here or </span><span style={{ color: '#4285F4', textDecoration: 'underline' }}>click to browse</span></>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>.mp4, .mov, .zip, .pdf — max 10 GB</div>
        {error && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 8 }}>{error}</div>}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Uploaded Deliverables
      </div>
      {versions.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>No deliverables uploaded yet.</div>
      )}
      {versions.map((v, i) => (
        <div key={v.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', borderRadius: 10, background: 'var(--bg)',
          marginBottom: i < versions.length - 1 ? 8 : 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{v.note}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v.date}</div>
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#4285F4' }}>Uploaded</span>
        </div>
      ))}
    </div>
  );
}

// ── Files & Deliverables ────────────────────────────────────────────────────
function FilesSection({ files }: { files: { id: string; name: string; date: string; type: string; url?: string }[] }) {
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
    const isPdf = type === 'pdf';
    return (
      <div style={{ width: 32, height: 32, borderRadius: 8, background: isPdf ? '#FEF2F2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {isPdf ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 28, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Files &amp; Deliverables</div>
        <button style={{ fontSize: 13, fontWeight: 600, color: '#4285F4', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Upload All as .zip
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 16px', padding: '8px 14px', borderBottom: '1px solid var(--border-light)', marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>File Name</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 110 }}>Upload Date</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 60, textAlign: 'right' }}>Action</span>
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
            cursor: f.url ? 'pointer' : 'default',
            borderRadius: 8,
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => { if (f.url) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {fileIcon(f.type)}
            <span style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</span>
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 110 }}>{f.date}</span>
          <div style={{ minWidth: 60, textAlign: 'right' }}>
            {f.url ? (
              <button
                title="Download"
                disabled={downloading === f.name}
                onClick={e => { e.stopPropagation(); handleDownload(f.url!, f.name); }}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: downloading === f.name ? 'wait' : 'pointer', color: downloading === f.name ? 'var(--text-muted)' : '#4285F4', padding: 4 }}
              >
                {downloading === f.name ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                )}
              </button>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
