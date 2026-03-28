'use client';
import { useEffect, useRef, useState } from 'react';
import { Project, CoredonClient } from '@/app/lib/coredon-types';
import { useRouter } from 'next/navigation';

interface Props {
  projects: Project[];
  clients: CoredonClient[];
}

function fmt(n: number): string {
  return n.toLocaleString('fr-CA', { maximumFractionDigits: 0 }) + '\u00a0$';
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

// ── Monthly Escrow Line Chart ──────────────────────────────────────────────
function MonthlyEscrowChart({ projects }: { projects: Project[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';

    // Build cumulative daily data from funded projects' prepaid_date
    const moNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // Group funded projects by month
    const moFunded: Record<string, { events: Record<number, number>; name: string; year: number }> = {};
    projects.filter(p => p.prepaid_date).forEach(p => {
      const d = new Date(p.prepaid_date!);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (!moFunded[key]) moFunded[key] = { events: {}, name: moNames[d.getMonth()], year: d.getFullYear() };
      const day = d.getDate();
      moFunded[key].events[day] = (moFunded[key].events[day] || 0) + p.amount;
    });

    const lastMoKey = Object.keys(moFunded).sort().pop() || '';
    const lastMo = moFunded[lastMoKey] || { events: {}, name: moNames[new Date().getMonth()], year: new Date().getFullYear() };
    const releaseEvents = lastMo.events;

    // Build raw cumulative
    let c = 0;
    const rawCum: number[] = new Array(31).fill(0);
    for (let d = 1; d <= 30; d++) {
      if (releaseEvents[d]) c += releaseEvents[d];
      rawCum[d] = c;
    }
    const total = rawCum[30];

    // Smooth S-curve around payment days
    function smoothstep(t: number) { return t * t * (3 - 2 * t); }
    const payDays = Object.keys(releaseEvents).map(Number);
    const RAMP = 3;
    const days: { day: number; v: number }[] = [];
    for (let d = 1; d <= 30; d++) {
      let inRamp = false;
      for (const pd of payDays) {
        if (d >= pd - RAMP && d <= pd + RAMP) {
          inRamp = true;
          const vBefore = rawCum[pd] - (releaseEvents[pd] || 0);
          const vAfter = rawCum[pd];
          const t = Math.max(0, Math.min(1, (d - (pd - RAMP)) / (RAMP * 2)));
          days.push({ day: d, v: vBefore + smoothstep(t) * (vAfter - vBefore) });
          break;
        }
      }
      if (!inRamp) days.push({ day: d, v: rawCum[d] });
    }

    // Build SVG
    const W = 300, H = 180, BOT = 20, TOP = 14, PAD = 10;
    const cH = H - BOT - TOP;
    const ns = 'http://www.w3.org/2000/svg';

    // Header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'padding:16px 16px 0;';
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:11px;font-weight:600;color:#64A8D8;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px;';
    lbl.textContent = 'Monthly Escrow';
    const amtEl = document.createElement('div');
    amtEl.style.cssText = 'font-size:28px;font-weight:800;letter-spacing:-0.04em;color:#fff;line-height:1;';
    amtEl.textContent = total === 0 ? '0\u00a0$' : fmt(total);
    const dateEl = document.createElement('div');
    dateEl.style.cssText = 'font-size:12px;color:#64A8D8;font-weight:500;margin-top:4px;min-height:18px;';
    hdr.appendChild(lbl); hdr.appendChild(amtEl); hdr.appendChild(dateEl);
    el.appendChild(hdr);

    if (days.length === 0 || total === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:24px;text-align:center;font-size:12px;color:#64A8D8;';
      empty.textContent = 'No escrow data this month';
      el.appendChild(empty);
      return;
    }

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.cssText = 'display:block;width:100%;';

    // Gradient
    const defs = document.createElementNS(ns, 'defs');
    const grad = document.createElementNS(ns, 'linearGradient');
    grad.setAttribute('id', 'mg_esc'); grad.setAttribute('x1','0'); grad.setAttribute('y1','0'); grad.setAttribute('x2','0'); grad.setAttribute('y2','1');
    const s1 = document.createElementNS(ns,'stop'); s1.setAttribute('offset','0%'); s1.setAttribute('stop-color','#3B82F6'); s1.setAttribute('stop-opacity','0.5');
    const s2 = document.createElementNS(ns,'stop'); s2.setAttribute('offset','100%'); s2.setAttribute('stop-color','#1E3A5F'); s2.setAttribute('stop-opacity','0.05');
    grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad); svg.appendChild(defs);

    const maxV = total || 1;
    const scX = (d: number) => PAD + (d - 1) / (days.length - 1) * (W - PAD * 2);
    const scY = (v: number) => TOP + cH * (1 - v / maxV);
    const pts = days.map(d => [scX(d.day), scY(d.v)]);

    function bez(pts: number[][]): string {
      if (pts.length < 2) return '';
      let path = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const dx = pts[i+1][0] - pts[i][0];
        const dy = Math.abs(pts[i+1][1] - pts[i][1]);
        const t = dy < 0.5 ? 0.499 : 0.45;
        const cp1x = pts[i][0] + dx*t, cp1y = pts[i][1];
        const cp2x = pts[i+1][0] - dx*t, cp2y = pts[i+1][1];
        path += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${pts[i+1][0].toFixed(2)},${pts[i+1][1].toFixed(2)}`;
      }
      return path;
    }

    const linePath = bez(pts);
    const areaPath = linePath + ` L${pts[pts.length-1][0].toFixed(2)},${H-BOT} L${pts[0][0].toFixed(2)},${H-BOT} Z`;

    const area = document.createElementNS(ns,'path'); area.setAttribute('d', areaPath); area.setAttribute('fill','url(#mg_esc)');
    svg.appendChild(area);
    const line = document.createElementNS(ns,'path'); line.setAttribute('d', linePath); line.setAttribute('fill','none');
    line.setAttribute('stroke','#3B82F6'); line.setAttribute('stroke-width','2.5'); line.setAttribute('stroke-linecap','round');
    svg.appendChild(line);

    // X-axis labels
    [1,5,10,15,20,25,30].forEach((d, li, arr) => {
      const x = PAD + li/(arr.length-1)*(W-PAD*2);
      const lbl2 = document.createElementNS(ns,'text');
      lbl2.setAttribute('x', x.toFixed(2)); lbl2.setAttribute('y', String(H-5));
      lbl2.setAttribute('text-anchor', li===0?'start':li===arr.length-1?'end':'middle');
      lbl2.setAttribute('font-size','9'); lbl2.setAttribute('fill','#4A7BA8'); lbl2.setAttribute('font-weight','600');
      lbl2.setAttribute('font-family',"'Plus Jakarta Sans',sans-serif");
      lbl2.textContent = 'D' + String(d).padStart(2,'0');
      svg.appendChild(lbl2);
    });

    // Hover tracker
    const DOT_R = 4;
    const vl = document.createElementNS(ns,'line');
    vl.setAttribute('stroke','#3B82F6'); vl.setAttribute('stroke-width','1.5'); vl.style.display='none';
    svg.appendChild(vl);
    const dot = document.createElementNS(ns,'circle'); dot.setAttribute('r', String(DOT_R));
    dot.setAttribute('fill','#0F1629'); dot.setAttribute('stroke','#3B82F6'); dot.setAttribute('stroke-width','2'); dot.style.display='none';
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
      pts.forEach((p, i) => { const dd = Math.abs(p[0]-mx); if (dd < bestD) { bestD = dd; best = i; } });
      const cx = pts[best][0], cy = pts[best][1];
      vl.setAttribute('x1', cx.toFixed(2)); vl.setAttribute('y1', (cy+DOT_R).toFixed(2));
      vl.setAttribute('x2', cx.toFixed(2)); vl.setAttribute('y2', String(H-BOT));
      dot.setAttribute('cx', cx.toFixed(2)); dot.setAttribute('cy', cy.toFixed(2));
      vl.style.display=''; dot.style.display='';
      amtEl.textContent = fmt(days[best].v);
      dateEl.textContent = days[best].day + ' ' + lastMo.name + ' ' + lastMo.year;
    });
    ov.addEventListener('mouseleave', () => {
      vl.style.display='none'; dot.style.display='none';
      amtEl.textContent = fmt(total); dateEl.textContent='';
    });

    el.appendChild(svg);
  }, [projects]);

  return (
    <div
      ref={containerRef}
      style={{ background: '#0F1629', borderRadius: 12, border: '1px solid #1E3A5F', overflow: 'hidden' }}
    />
  );
}

// ── Escrow Breakdown Donut Chart ───────────────────────────────────────────
function DonutChart({ funded, released, pending }: { funded: number; released: number; pending: number }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = funded + released + pending || 1;
  const grand = funded + released + pending;

  const R = 68, CX = 100, CY = 100;
  const circumference = 2 * Math.PI * R;

  const slices = [
    { label: 'Funded', val: funded, color: '#00C896' },
    { label: 'Released', val: released, color: '#0984E3' },
    { label: 'Pending', val: pending, color: '#CBD5E1' },
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
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F1F5F9" strokeWidth="22" />
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
        <text x={CX} y={CY - 6} textAnchor="middle" fontSize="13" fontWeight="800" fill="#0F172A" fontFamily="'Plus Jakarta Sans',sans-serif">
          {fmt(grand)}
        </text>
        <text x={CX} y={CY + 13} textAnchor="middle" fontSize="11" fontWeight="600" fill="#00C896" fontFamily="'Plus Jakarta Sans',sans-serif">
          ↑ 4.6%
        </text>
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

// ── Dashboard Home ─────────────────────────────────────────────────────────
export default function DashboardHome({ projects }: Props) {
  const router = useRouter();

  const escrow  = projects.filter(p => p.status === 'Funded').reduce((a, b) => a + b.amount, 0);
  const released = projects.filter(p => p.status === 'Released').reduce((a, b) => a + b.amount, 0);
  const pending  = projects.filter(p => p.status === 'Pending').reduce((a, b) => a + b.amount, 0);

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

  const filtered = sorted
    .filter(p => filter === 'All' || p.status === filter)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const pageItems = filtered.slice((page - 1) * PER, page * PER);

  return (
    <div className="page fade-in" style={{ position: 'relative' }}>
      {/* Page Controls */}
      <div id="page-controls">
        <button className="tb-icon-btn" title="Notifications">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="tb-notif-dot" />
        </button>
        <button className="tb-avatar">H</button>
      </div>

      {/* Welcome */}
      <div className="welcome-section">
        <h1>Welcome back, Henri.</h1>
        <p>Here&apos;s what&apos;s happening with your projects.</p>
      </div>

      {/* All Projects header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>All Projects</h2>
        <button className="btn">More Action ▾</button>
      </div>

      {/* 2-column layout: left (stats + table) / right (charts) */}
      <div className="l2" style={{ gap: 16, alignItems: 'flex-start' }}>

        {/* LEFT COLUMN */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Stat cards */}
          <div className="stat-row" style={{ marginBottom: 0 }}>
            {[
              { label: 'Total Escrow', val: escrow, color: '#00C896', delta: '+4.2%', up: true },
              { label: 'Total Released', val: released, color: '#0984E3', delta: '+1.8%', up: true },
              { label: 'Pending', val: pending, color: '#94A3B8', delta: '-2.1%', up: false },
            ].map(({ label, val, color, delta, up }) => (
              <div key={label} className="stat-card">
                <div className="stat-card-inner">
                  <div className="stat-label">{label}</div>
                  <div className="stat-val">{fmt(val)}</div>
                  <div className="stat-delta" style={{ color: up ? '#16A34A' : '#DC2626' }}>
                    {up ? '↑' : '↓'} {delta} Last month
                  </div>
                </div>
                <div className="stat-bar" style={{ background: color }} />
              </div>
            ))}
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
          <DonutChart funded={escrow} released={released} pending={pending} />
        </div>

      </div>
    </div>
  );
}
