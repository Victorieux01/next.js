'use client';
import { useEffect, useRef, useState } from 'react';
import { Project, CoredonClient } from '@/app/lib/coredon-types';
import { useRouter } from 'next/navigation';
import { SettingsModal, type UserProfile } from '@/app/ui/dashboard/settings-client';
import { getUserProfile } from '@/app/lib/coredon-actions';

interface Props {
  projects: Project[];
  clients: CoredonClient[];
  user?: { name?: string | null; email?: string | null };
}

function fmt(n: number): string {
  return n.toLocaleString('fr-CA', { maximumFractionDigits: 0 }) + '\u00a0$';
}

function parseReason(raw: string): { original: string } {
  return { original: raw.split('\n\n── Internal Note')[0] ?? raw };
}

function Badge({ status }: { status: string }) {
  const dotColors: Record<string, string> = {
    Funded: '#00C896', Released: '#0984E3', Pending: '#F59E0B', Dispute: '#EF4444',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColors[status] || '#94A3B8', display: 'inline-block', flexShrink: 0 }} />
      {status}
    </span>
  );
}

function Avatar({ project }: { project: Project }) {
  return (
    <div style={{ width: 34, height: 34, borderRadius: 10, background: project.color + '22', color: project.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
      {project.initials}
    </div>
  );
}


function MonthlyEscrowChart({ projects }: { projects: Project[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Build earnData the same way as the earnings tab
  const moNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const byKey: Record<string, { month: string; year: string; v: number }> = {};
  projects.filter(p => p.status === 'Released' && p.released_date).forEach(p => {
    const d = new Date(p.released_date!);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (!byKey[key]) byKey[key] = { month: moNames[d.getMonth()], year: String(d.getFullYear()), v: 0 };
    byKey[key].v += p.amount;
  });
  const earnData = Object.keys(byKey).sort().map(k => ({ key: k, ...byKey[k] }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';

    // Cumulative daily points across all months using smoothstep
    function smoothstep(t: number) { return t * t * (3 - 2 * t); }
    const dailyPts: { month: string; year: string; dayOfMonth: number; v: number }[] = [];
    let cumTotal = 0;
    earnData.forEach(mo => {
      const prev = cumTotal;
      for (let d = 0; d < 30; d++) {
        const t = smoothstep(d / 29);
        dailyPts.push({ month: mo.month, year: mo.year, dayOfMonth: d + 1, v: prev + mo.v * t });
      }
      cumTotal += mo.v;
    });
    const grandTotal = cumTotal;

    // Header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'padding:16px 16px 0;';
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:11px;font-weight:600;color:#94A3B8;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px;';
    lbl.textContent = 'Total Earnings';
    const amtEl = document.createElement('div');
    amtEl.style.cssText = 'font-size:28px;font-weight:800;letter-spacing:-0.04em;color:var(--text-primary);line-height:1;';
    amtEl.textContent = fmt(grandTotal);
    const dateEl = document.createElement('div');
    dateEl.style.cssText = 'font-size:12px;color:#0984E3;font-weight:500;margin-top:4px;min-height:18px;';
    hdr.appendChild(lbl); hdr.appendChild(amtEl); hdr.appendChild(dateEl);
    el.appendChild(hdr);

    if (dailyPts.length === 0 || grandTotal === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:24px;text-align:center;font-size:12px;color:#94A3B8;';
      empty.textContent = 'No earnings yet';
      el.appendChild(empty);
      return;
    }

    const W = 300, H = 180, BOT = 22, TOP = 14, PAD = 10;
    const cH = H - BOT - TOP;
    const ns = 'http://www.w3.org/2000/svg';

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.cssText = 'display:block;width:100%;';

    const defs = document.createElementNS(ns, 'defs');
    const grad = document.createElementNS(ns, 'linearGradient');
    grad.setAttribute('id', 'dash_earn_grad');
    grad.setAttribute('x1','0'); grad.setAttribute('y1','0'); grad.setAttribute('x2','0'); grad.setAttribute('y2','1');
    const s1 = document.createElementNS(ns,'stop'); s1.setAttribute('offset','0%'); s1.setAttribute('stop-color','#0984E3'); s1.setAttribute('stop-opacity','0.15');
    const s2 = document.createElementNS(ns,'stop'); s2.setAttribute('offset','100%'); s2.setAttribute('stop-color','transparent'); s2.setAttribute('stop-opacity','0');
    grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad); svg.appendChild(defs);

    const maxV = grandTotal || 1;
    const ePts = dailyPts.map((_, i) => [
      PAD + i / (dailyPts.length - 1) * (W - PAD * 2),
      TOP + cH * (1 - dailyPts[i].v / maxV),
    ]);

    function bez(ps: number[][]): string {
      if (ps.length < 2) return '';
      let path = `M${ps[0][0].toFixed(1)},${ps[0][1].toFixed(1)}`;
      for (let i = 0; i < ps.length - 1; i++) {
        const dx = ps[i+1][0] - ps[i][0], t = 0.45;
        const cp1x = ps[i][0] + dx*t, cp1y = ps[i][1];
        const cp2x = ps[i+1][0] - dx*t, cp2y = ps[i+1][1];
        path += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${ps[i+1][0].toFixed(1)},${ps[i+1][1].toFixed(1)}`;
      }
      return path;
    }

    const linePath = bez(ePts);
    const areaPath = linePath + ` L${ePts[ePts.length-1][0].toFixed(1)},${H-BOT} L${ePts[0][0].toFixed(1)},${H-BOT} Z`;

    const area = document.createElementNS(ns,'path'); area.setAttribute('d', areaPath); area.setAttribute('fill','url(#dash_earn_grad)');
    svg.appendChild(area);
    const line = document.createElementNS(ns,'path'); line.setAttribute('d', linePath); line.setAttribute('fill','none');
    line.setAttribute('stroke','#0984E3'); line.setAttribute('stroke-width','2'); line.setAttribute('stroke-linecap','round');
    svg.appendChild(line);

    // Month labels
    if (earnData.length > 1) {
      earnData.forEach((mo, m) => {
        const x = PAD + m / (earnData.length - 1) * (W - PAD * 2);
        const lbl2 = document.createElementNS(ns,'text');
        lbl2.setAttribute('x', x.toFixed(1)); lbl2.setAttribute('y', String(H - 6));
        lbl2.setAttribute('text-anchor', m === 0 ? 'start' : m === earnData.length - 1 ? 'end' : 'middle');
        lbl2.setAttribute('font-size','8'); lbl2.setAttribute('fill','#94A3B8'); lbl2.setAttribute('font-weight','600');
        lbl2.setAttribute('font-family',"'Plus Jakarta Sans',sans-serif");
        lbl2.textContent = mo.month;
        svg.appendChild(lbl2);
      });
    } else if (earnData.length === 1) {
      const lbl2 = document.createElementNS(ns,'text');
      lbl2.setAttribute('x', String(W / 2)); lbl2.setAttribute('y', String(H - 6));
      lbl2.setAttribute('text-anchor','middle');
      lbl2.setAttribute('font-size','8'); lbl2.setAttribute('fill','#94A3B8'); lbl2.setAttribute('font-weight','600');
      lbl2.setAttribute('font-family',"'Plus Jakarta Sans',sans-serif");
      lbl2.textContent = earnData[0].month + ' ' + earnData[0].year;
      svg.appendChild(lbl2);
    }

    // Hover tracker
    const DOT_R = 3;
    const vl = document.createElementNS(ns,'line');
    vl.setAttribute('stroke','#0984E3'); vl.setAttribute('stroke-width','1'); vl.setAttribute('stroke-dasharray','3 2'); vl.style.display='none';
    svg.appendChild(vl);
    const dot = document.createElementNS(ns,'circle'); dot.setAttribute('r', String(DOT_R));
    dot.setAttribute('fill','#fff'); dot.setAttribute('stroke','#0984E3'); dot.setAttribute('stroke-width','2'); dot.style.display='none';
    svg.appendChild(dot);
    const ov = document.createElementNS(ns,'rect');
    ov.setAttribute('x','0'); ov.setAttribute('y','0'); ov.setAttribute('width',String(W)); ov.setAttribute('height',String(H-BOT));
    ov.setAttribute('fill','transparent'); ov.style.cursor='crosshair';
    svg.appendChild(ov);

    ov.addEventListener('mousemove', (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const ctm = svg.getScreenCTM(); if (!ctm) return;
      const mx = pt.matrixTransform(ctm.inverse()).x;
      let best = 0, bestD = Infinity;
      ePts.forEach((p, i) => { const dd = Math.abs(p[0]-mx); if (dd < bestD) { bestD = dd; best = i; } });
      const cx = ePts[best][0], cy = ePts[best][1];
      vl.setAttribute('x1', cx.toFixed(1)); vl.setAttribute('y1', (cy + DOT_R).toFixed(1));
      vl.setAttribute('x2', cx.toFixed(1)); vl.setAttribute('y2', String(H-BOT));
      dot.setAttribute('cx', cx.toFixed(1)); dot.setAttribute('cy', cy.toFixed(1));
      vl.style.display=''; dot.style.display='';
      amtEl.textContent = fmt(dailyPts[best].v);
      dateEl.textContent = dailyPts[best].dayOfMonth + ' ' + dailyPts[best].month + ' ' + dailyPts[best].year;
    });
    ov.addEventListener('mouseleave', () => {
      vl.style.display='none'; dot.style.display='none';
      amtEl.textContent = fmt(grandTotal); dateEl.textContent = '';
    });

    el.appendChild(svg);
  }, [earnData]);

  return (
    <div
      ref={containerRef}
      style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}
    />
  );
}

// ── Escrow Breakdown Donut Chart ───────────────────────────────────────────
function DonutChart({ funded, released, pending, dispute }: { funded: number; released: number; pending: number; dispute: number }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = funded + released + pending + dispute || 1;
  const grand = funded + released + pending + dispute;

  const R = 68, CX = 100, CY = 100;
  const circumference = 2 * Math.PI * R;

  const slices = [
    { label: 'Funded', val: funded, color: '#00C896' },
    { label: 'Released', val: released, color: '#0984E3' },
    { label: 'Pending', val: pending, color: '#CBD5E1' },
    { label: 'Dispute', val: dispute, color: '#EF4444' },
  ];

  let offset = circumference * 0.25; // start at top
  const circles = slices.map(slice => {
    if (slice.val <= 0) return null;
    const frac = slice.val / total;
    const dash = frac * circumference;
    const gap = circumference - dash;
    const strokeDashoffset = offset;
    offset -= dash;
    return { ...slice, dash, gap, strokeDashoffset };
  }).filter(Boolean);

  
  return (
    <div className="card" style={{ padding: 24, flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Escrow Breakdown</span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{fmt(grand)}</span>
      </div>

      <svg viewBox="0 0 200 200" width="180" height="180" style={{ display: 'block', margin: '4px auto 16px' }}>
        {/* Background ring */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border-light)" strokeWidth="22" />
        {/* Slices */}
        {circles.map((s) => s && (
          <circle
            key={s.label}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={hovered === s.label ? s.color : s.color}
            strokeWidth={hovered === s.label ? 26 : 22}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={s.strokeDashoffset}
            strokeLinecap="butt"
            style={{ transition: 'stroke-width 0.15s', cursor: 'pointer', opacity: hovered && hovered !== s.label ? 0.55 : 1 }}
            onMouseEnter={() => setHovered(s.label)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {/* Center text */}
        <text x={CX} y={grand > 0 ? CY - 6 : CY + 6} textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--text-primary)" fontFamily="'Plus Jakarta Sans',sans-serif">
          {fmt(grand)}
        </text>
        {grand > 0 && (
          <text x={CX} y={CY + 13} textAnchor="middle" fontSize="11" fontWeight="600" fill="#00C896" fontFamily="'Plus Jakarta Sans',sans-serif">
            ↑ 4.6%
          </text>
        )}
      </svg>

      {slices.map((slice, i) => (
        <div
          key={slice.label}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: i > 0 ? '1px solid var(--border-light)' : 'none', cursor: 'default' }}
          onMouseEnter={() => setHovered(slice.label)}
          onMouseLeave={() => setHovered(null)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: slice.color, display: 'block', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{slice.label}</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(slice.val)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Notification helpers ────────────────────────────────────────────────────
type NotifEvent = {
  id: string;
  type: 'dispute' | 'funded' | 'released' | 'revision' | 'version' | 'pending';
  title: string;
  description: string;
  date: string;
  color: string;
  initials: string;
  projectId: string;
};

function buildNotifications(projects: Project[]): NotifEvent[] {
  const events: NotifEvent[] = [];

  for (const p of projects) {
    // Dispute opened
    for (const d of p.disputes || []) {
      if (d.status === 'Open') {
        events.push({
          id: 'dispute-' + d.id,
          type: 'dispute',
          title: `Dispute opened — ${p.name}`,
          description: d.reason.split('\n')[0]?.slice(0, 80) || 'Funds are frozen pending review.',
          date: d.date,
          color: '#EF4444',
          initials: p.initials,
          projectId: p.id,
        });
      }
    }
    // Escrow funded
    if (p.prepaid_date) {
      events.push({
        id: 'funded-' + p.id,
        type: 'funded',
        title: `Escrow funded — ${p.name}`,
        description: `${fmt(p.amount)} held in escrow via ${p.prepaid_method || 'Stripe Connect'}.`,
        date: p.prepaid_date,
        color: '#00C896',
        initials: p.initials,
        projectId: p.id,
      });
    }
    // Payment released
    if (p.released_date) {
      events.push({
        id: 'released-' + p.id,
        type: 'released',
        title: `Payment released — ${p.name}`,
        description: `${fmt(p.amount)} released after client approval.`,
        date: p.released_date,
        color: '#0984E3',
        initials: p.initials,
        projectId: p.id,
      });
    }
    // Revisions
    for (const r of p.revisions || []) {
      events.push({
        id: 'revision-' + r.id,
        type: 'revision',
        title: `New revision requested — ${p.name}`,
        description: r.note?.slice(0, 80) || 'A revision was requested.',
        date: r.date,
        color: '#F59E0B',
        initials: p.initials,
        projectId: p.id,
      });
    }
    // Versions uploaded
    for (const v of p.versions || []) {
      events.push({
        id: 'version-' + v.id,
        type: 'version',
        title: `Deliverable uploaded — ${p.name}`,
        description: v.note?.slice(0, 80) || 'A new version was uploaded.',
        date: v.date,
        color: '#6366F1',
        initials: p.initials,
        projectId: p.id,
      });
    }
  }

  return events.sort((a, b) => b.date.localeCompare(a.date));
}

function relativeDate(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function NotifIcon({ type }: { type: NotifEvent['type'] }) {
  if (type === 'dispute') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
  if (type === 'funded') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
  if (type === 'released') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
  if (type === 'revision') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function NotificationPanel({ events, onClose, onNavigate }: { events: NotifEvent[]; onClose: () => void; onNavigate: (projectId: string) => void }) {
  return (
    <>
      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: 340,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.2s ease both',
      }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Notifications</span>
            {events.length > 0 && (
              <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 7px' }}>
                {events.length}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {events.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No notifications yet.
            </div>
          ) : (
            events.map((e, i) => (
              <div key={e.id} style={{
                display: 'flex', gap: 12, padding: '14px 20px',
                borderBottom: i < events.length - 1 ? '1px solid var(--border-light)' : 'none',
                alignItems: 'flex-start',
              }}>
                {/* Icon bubble */}
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: e.color + '1A', color: e.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 1,
                }}>
                  <NotifIcon type={e.type} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, lineHeight: 1.3 }}>
                    {e.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
                    {e.description}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                      {relativeDate(e.date)}
                    </span>
                    <button
                      onClick={() => { onNavigate(e.projectId); onClose(); }}
                      style={{
                        fontSize: 11, fontWeight: 700, color: 'var(--blue)',
                        background: 'var(--blue-bg)', border: 'none', borderRadius: 6,
                        padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      View
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ── Dashboard Home ─────────────────────────────────────────────────────────
export default function DashboardHome({ projects, user }: Props) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsUser, setSettingsUser] = useState<UserProfile | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const notifications = buildNotifications(projects);

  const rawName = user?.name ?? '';
  const initials = rawName.split(' ').map(w => w[0] ?? '').filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

  async function openSettings() {
    setSettingsOpen(true);
    if (!settingsUser) {
      const profile = await getUserProfile();
      setSettingsUser({
        name:      rawName,
        email:     user?.email ?? '',
        plan:      profile.plan,
        phone:     profile.phone,
        firstName: profile.firstName || rawName.split(' ')[0] || '',
        lastName:  profile.lastName  || rawName.split(' ').slice(1).join(' ') || '',
      });
    }
  }

  const escrow       = projects.filter(p => p.status === 'Funded').reduce((a, b) => a + b.amount, 0);
  const released     = projects.filter(p => p.status === 'Released').reduce((a, b) => a + b.amount, 0);
  const pending      = projects.filter(p => p.status === 'Pending').reduce((a, b) => a + b.amount, 0);
  const dispute      = projects.filter(p => p.status === 'Dispute').reduce((a, b) => a + b.amount, 0);
  const activeEscrow = escrow;

  const today = new Date().toISOString().slice(0, 10);
  const nextDeadlineProject = projects
    .filter(p => p.status !== 'Released' && (p.end_date || p.expected_date))
    .map(p => ({ name: p.name, date: (p.end_date || p.expected_date)! }))
    .filter(p => p.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

  const sortOrder: Record<string, number> = { Dispute: 0, Funded: 1, Pending: 2, Released: 3 };
  const sorted = [...projects].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const oa = sortOrder[a.status] ?? 99, ob = sortOrder[b.status] ?? 99;
    if (oa !== ob) return oa - ob;
    return new Date(b.start_date || '2000-01-01').getTime() - new Date(a.start_date || '2000-01-01').getTime();
  });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const PER = 7;

  // More Action dropdown + modals
  const [ddOpen,    setDdOpen]    = useState(false);
  const [modal,     setModal]     = useState<null | 'reminder' | 'dispute'>(null);
  const ddRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reminder modal state — pending projects
  const pendingProjects = projects.filter(p => p.status === 'Pending');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reminderSent, setReminderSent] = useState(false);

  function openReminder() {
    setSelected(new Set(pendingProjects.map(p => p.id)));
    setReminderSent(false);
    setModal('reminder');
    setDdOpen(false);
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function sendReminders() {
    const targets = pendingProjects.filter(p => selected.has(p.id));
    targets.forEach(p => console.log(`[Email] Reminder sent to ${p.email} for project "${p.name}" (${fmt(p.amount)})`));
    setReminderSent(true);
  }

  // Dispute report data
  const allDisputes = projects.flatMap(p =>
    (p.disputes || []).map(d => ({ ...d, projectName: p.name, projectAmount: p.amount }))
  );
  const openDisputes     = allDisputes.filter(d => d.status === 'Open');
  const resolvedDisputes = allDisputes.filter(d => d.status === 'Resolved');
  const atRisk           = openDisputes.reduce((s, d) => s + d.projectAmount, 0);

  const filtered = sorted
    .filter(p => filter === 'All' || p.status === filter)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const pageItems = filtered.slice((page - 1) * PER, page * PER);

  return (
    <div className="page fade-in" style={{ position: 'relative', paddingRight: notifOpen ? 356 : undefined, transition: 'padding-right 0.2s ease' }}>
      {/* Page Controls */}
      <div id="page-controls">
        <button className="tb-icon-btn" title="Notifications" onClick={() => setNotifOpen(o => !o)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {notifications.length > 0 && <span className="tb-notif-dot" />}
        </button>
        <button className="tb-avatar" onClick={openSettings} title="Settings">{initials}</button>
      </div>

      {notifOpen && (
        <NotificationPanel
          events={notifications}
          onClose={() => setNotifOpen(false)}
          onNavigate={(projectId) => router.push(`/dashboard/projects/${projectId}`)}
        />
      )}

      {settingsOpen && settingsUser && (
        <SettingsModal
          user={settingsUser}
          onClose={() => setSettingsOpen(false)}
          onSaved={u => setSettingsUser(u)}
        />
      )}

      {/* Welcome */}
      <div className="welcome-section">
        <h1>Welcome back, {user?.name?.split(' ')[0] ?? 'there'}.</h1>
        <p>Here&apos;s what&apos;s happening with your projects.</p>
      </div>

      {/* All Projects header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>All Projects</h2>

        {/* More Action dropdown */}
        <div ref={ddRef} style={{ position: 'relative' }}>
          <button className="btn" onClick={() => setDdOpen(o => !o)}>
            More Action ▾
          </button>
          {ddOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
              minWidth: 200, zIndex: 200, overflow: 'hidden',
              animation: 'fu 0.13s ease both',
            }}>
              <button
                onClick={openReminder}
                style={{ width: '100%', padding: '11px 16px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0984E3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.12 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                Send Reminder
              </button>
              <div style={{ height: 1, background: 'var(--border-light)', margin: '0 12px' }} />
              <button
                onClick={() => { setModal('dispute'); setDdOpen(false); }}
                style={{ width: '100%', padding: '11px 16px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Dispute Report
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Send Reminder Modal ── */}
      {modal === 'reminder' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Send Reminders</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Select the clients you want to notify about their unfunded projects.
                </div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, marginLeft: 12, flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {reminderSent ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Reminders Sent!</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                  {selected.size} reminder{selected.size !== 1 ? 's' : ''} sent successfully.
                </div>
                <button className="btn-outline" onClick={() => setModal(null)}>Close</button>
              </div>
            ) : (
              <>
                {pendingProjects.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                    No pending projects to remind.
                  </div>
                ) : (
                  <>
                    {/* Select all */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--bg)', marginBottom: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={selected.size === pendingProjects.length}
                        onChange={() => setSelected(selected.size === pendingProjects.length ? new Set() : new Set(pendingProjects.map(p => p.id)))}
                        style={{ width: 16, height: 16, accentColor: '#0984E3' }}
                      />
                      Select all ({pendingProjects.length})
                    </label>

                    {/* Project list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, maxHeight: 260, overflowY: 'auto' }}>
                      {pendingProjects.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${selected.has(p.id) ? '#0984E3' : 'var(--border)'}`, background: selected.has(p.id) ? '#EFF6FF' : 'var(--surface)', cursor: 'pointer', transition: 'all 0.12s' }}>
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            style={{ width: 16, height: 16, accentColor: '#0984E3', flexShrink: 0 }}
                          />
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: p.color + '22', color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {p.initials}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</div>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{fmt(p.amount)}</span>
                        </label>
                      ))}
                    </div>

                    <button
                      className="btn"
                      disabled={selected.size === 0}
                      style={{ width: '100%', padding: '12px', fontSize: 14, opacity: selected.size === 0 ? 0.5 : 1 }}
                      onClick={sendReminders}
                    >
                      Send {selected.size > 0 ? selected.size : ''} Reminder{selected.size !== 1 ? 's' : ''}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Dispute Report Modal ── */}
      {modal === 'dispute' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>Dispute Report</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
              <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#EF4444' }}>{openDisputes.length}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', marginTop: 2 }}>Open</div>
              </div>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#16A34A' }}>{resolvedDisputes.length}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#16A34A', marginTop: 2 }}>Resolved</div>
              </div>
              <div style={{ background: '#FEF3C7', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#D97706' }}>{fmt(atRisk)}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#D97706', marginTop: 2 }}>At Risk</div>
              </div>
            </div>

            {/* Dispute history */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Dispute History
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {allDisputes.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No disputes recorded.</div>
              )}
              {allDisputes.map((d, i) => {
                const isOpen = d.status === 'Open';
                const { original } = parseReason(d.reason);
                return (
                  <div key={i} style={{ borderRadius: 10, border: `1px solid ${isOpen ? '#FECACA' : 'var(--border-light)'}`, borderLeft: `4px solid ${isOpen ? '#EF4444' : '#16A34A'}`, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{d.projectName}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isOpen ? '#EF4444' : '#16A34A', background: isOpen ? '#FEF2F2' : '#DCFCE7', borderRadius: 20, padding: '3px 8px' }}>
                        {d.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.4 }}>{original}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Opened: {d.date}{d.resolved_date ? `  ·  Resolved: ${d.resolved_date}` : ''}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(d.projectAmount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="btn-outline" style={{ width: '100%', marginTop: 16, padding: '11px' }} onClick={() => setModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* 2-column layout: left (stats + table) / right (charts) */}
      <div className="l2" style={{ gap: 16, alignItems: 'flex-start' }}>

        {/* LEFT COLUMN */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Stat cards */}
          <div className="stat-row" style={{ marginBottom: 0 }}>
            {/* Active Escrow */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#2c2c2c' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00C896" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="stat-card-inner">
                <div className="stat-label">Active Escrow</div>
                <div className="stat-val">{fmt(activeEscrow)}</div>
                {activeEscrow > 0 && <div className="stat-delta" style={{ color: '#16A34A' }}>Funded</div>}
              </div>
              <div className="stat-bar" style={{ background: '#00C896' }} />
            </div>

            {/* Pending — middle */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#2c2c2c' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="stat-card-inner">
                <div className="stat-label">Pending</div>
                <div className="stat-val">{fmt(pending)}</div>
              </div>
              <div className="stat-bar" style={{ background: '#94A3B8' }} />
            </div>

            {/* Next Deadline */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#2c2c2c' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0984E3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="stat-card-inner">
                <div className="stat-label">Next Deadline</div>
                <div className="stat-val" style={{ fontSize: 17, letterSpacing: '-0.01em' }}>
                  {nextDeadlineProject ? nextDeadlineProject.date : '—'}
                </div>
                {nextDeadlineProject && (
                  <div className="stat-delta" style={{ color: '#0984E3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {nextDeadlineProject.name}
                  </div>
                )}
              </div>
              <div className="stat-bar" style={{ background: '#F59E0B' }} />
            </div>
          </div>

          {/* Projects table */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 10px', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Projects</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div className="search-box">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input placeholder="Search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="fsel" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
                  {['All','Funded','Released','Pending','Dispute'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="tbl-header">
              <span className="tbl-col" style={{ flex: 2 }}>Name</span>
              <span className="tbl-col hide-m" style={{ flex: 2 }}>Email</span>
              <span className="tbl-col" style={{ flex: 1 }}>Status</span>
              <span className="tbl-col" style={{ flex: 1, textAlign: 'right' }}>Value</span>
            </div>

            {pageItems.map((p, i) => (
              <div
                key={p.id}
                className="tbl-row"
                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-light)' }}
                onClick={() => router.push(`/dashboard/projects/${p.id}`)}
              >
                <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar project={p} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                </div>
                <div className="hide-m" style={{ flex: 2, fontSize: 13, color: 'var(--text-secondary)' }}>{p.email}</div>
                <div style={{ flex: 1 }}><Badge status={p.status} /></div>
                <div style={{ flex: 1, textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{fmt(p.amount)}</div>
              </div>
            ))}

            {pageItems.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                No projects found.{' '}
                <button className="btn" style={{ marginLeft: 8 }} onClick={() => router.push('/dashboard/projects/create')}>
                  Create your first
                </button>
              </div>
            )}

            {/* Pagination */}
            <div className="pag">
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Page {page} of {pages}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="pag-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
                <button className="pag-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="hide-m" style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
          <MonthlyEscrowChart projects={projects} />
          <DonutChart funded={escrow} released={released} pending={pending} dispute={dispute} />
        </div>

      </div>
    </div>
  );
}
