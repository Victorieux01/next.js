'use client';
import { useState, useEffect, useRef } from 'react';
import { Project } from '@/app/lib/coredon-types';

// --- HELPERS ---
function fmt(n: number): string {
  return n.toLocaleString('fr-CA', { 
    maximumFractionDigits: 0,
    useGrouping: true
  }).replace(/,/g, '\u202F') + '\u00a0$';
}

function computeMonthlyEarnings(projects: Project[]) {
  const moNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const released = projects.filter(p => p.status === 'Released' && p.released_date);
  const byMonth: Record<string, number> = {};
  released.forEach(p => {
    const d = new Date(p.released_date!);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    byMonth[key] = (byMonth[key] || 0) + p.amount;
  });
  return Object.keys(byMonth).sort().map(k => {
    const [yr, mo] = k.split('-');
    return { key: k, month: moNames[parseInt(mo) - 1], year: yr, v: byMonth[k] };
  });
}

// --- SUB-COMPONENT: CHART ---
// earnData: sorted monthly totals [{ month, year, v }]
function EarningsOverTimeChart({ earnData }: { earnData: { key: string; month: string; year: string; v: number }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';

    // Build cumulative daily points across ALL months using smoothstep S-curve per month
    function smoothstep(t: number) { return t * t * (3 - 2 * t); }
    const dailyPts: { month: string; year: string; dayOfMonth: number; v: number }[] = [];
    let cumTotal = 0;
    earnData.forEach(mo => {
      const prev = cumTotal;
      const inc  = mo.v;
      for (let d = 0; d < 30; d++) {
        const t = smoothstep(d / 29);
        dailyPts.push({ month: mo.month, year: mo.year, dayOfMonth: d + 1, v: prev + inc * t });
      }
      cumTotal += inc;
    });
    const grandTotal = cumTotal;

    // Header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'padding: 20px 20px 0;';
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size: 10px; font-weight: 600; color: #94A3B8; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.05em;';
    lbl.textContent = 'Earnings over time';
    const amtEl = document.createElement('div');
    amtEl.style.cssText = 'font-size: 28px; font-weight: 700; color: #0F172A; line-height: 1;';
    amtEl.textContent = fmt(grandTotal);
    const dateEl = document.createElement('div');
    dateEl.style.cssText = 'font-size: 11px; color: #0984E3; font-weight: 500; margin-top: 4px; min-height: 18px;';
    hdr.appendChild(lbl); hdr.appendChild(amtEl); hdr.appendChild(dateEl);
    el.appendChild(hdr);

    if (dailyPts.length === 0 || grandTotal === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 60px 20px; text-align: center; font-size: 12px; color: #94A3B8;';
      empty.textContent = 'No earnings data yet';
      el.appendChild(empty);
      return;
    }

    const W = 900, H = 220, BOT = 26, TOP = 16, PAD = 10;
    const cH = H - BOT - TOP;
    const ns = 'http://www.w3.org/2000/svg';

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.cssText = 'display: block; width: 100%;';

    // Gradient
    const defs = document.createElementNS(ns, 'defs');
    const grad = document.createElementNS(ns, 'linearGradient');
    grad.setAttribute('id', 'earn_grad');
    grad.setAttribute('x1','0'); grad.setAttribute('y1','0'); grad.setAttribute('x2','0'); grad.setAttribute('y2','1');
    const s1 = document.createElementNS(ns,'stop'); s1.setAttribute('offset','0%'); s1.setAttribute('stop-color','#0984E3'); s1.setAttribute('stop-opacity','0.18');
    const s2 = document.createElementNS(ns,'stop'); s2.setAttribute('offset','100%'); s2.setAttribute('stop-color','#ffffff'); s2.setAttribute('stop-opacity','0');
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

    const area = document.createElementNS(ns,'path'); area.setAttribute('d', areaPath); area.setAttribute('fill','url(#earn_grad)');
    svg.appendChild(area);
    const line = document.createElementNS(ns,'path'); line.setAttribute('d', linePath); line.setAttribute('fill','none');
    line.setAttribute('stroke','#0984E3'); line.setAttribute('stroke-width','2'); line.setAttribute('stroke-linecap','round');
    svg.appendChild(line);

    // Month labels — one per month at the start of each month's segment
    earnData.forEach((mo, m) => {
      const x = PAD + m / (earnData.length - 1) * (W - PAD * 2);
      const lbl2 = document.createElementNS(ns,'text');
      lbl2.setAttribute('x', x.toFixed(1)); lbl2.setAttribute('y', String(H - 7));
      lbl2.setAttribute('text-anchor', m === 0 ? 'start' : m === earnData.length - 1 ? 'end' : 'middle');
      lbl2.setAttribute('font-size','10'); lbl2.setAttribute('fill','#94A3B8'); lbl2.setAttribute('font-weight','600');
      lbl2.setAttribute('font-family',"'Plus Jakarta Sans',sans-serif");
      lbl2.textContent = mo.month;
      svg.appendChild(lbl2);
    });

    // Hover tracker
    const DOT_R = 4;
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

// --- PAYMENT TAB ---
type Schedule = 'instant' | 'weekly' | 'monthly';
function PaymentTab() {
  const [currency, setCurrency] = useState<'CAD' | 'USD'>('CAD');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<'CAD' | 'USD'>('CAD');
  const [autoSendOpen, setAutoSendOpen] = useState(false);
  const [autoSend, setAutoSend] = useState(true);
  const [pendingAutoSend, setPendingAutoSend] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedule, setSchedule] = useState<Schedule>('instant');
  const [pendingSchedule, setPendingSchedule] = useState<Schedule>('instant');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifSms, setNotifSms] = useState(false);
  const [pendingNotifEmail, setPendingNotifEmail] = useState(true);
  const [pendingNotifInApp, setPendingNotifInApp] = useState(true);
  const [pendingNotifSms, setPendingNotifSms] = useState(false);

  const scheduleLabels: Record<Schedule, string> = {
    instant: 'Instant on client approval',
    weekly: 'Weekly',
    monthly: 'Monthly',
  };
  const notifLabel = [notifEmail && 'Email', notifInApp && 'In-app', notifSms && 'SMS'].filter(Boolean).join(' + ') || 'None';
  const currencyLabel = currency === 'CAD' ? 'CAD (Canadian Dollar)' : 'USD (US Dollar)';

  return (
    <div className="fade-in">
      {/* Payment Methods */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
        {/* Credit Card */}
        <div className="card" style={{ flex: 1, minWidth: 260, padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="#4285F4" strokeWidth="2"/>
              <path d="M2 10h20" stroke="#4285F4" strokeWidth="2"/>
            </svg>
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Credit Card (Stripe)</div>
          <div style={{ fontSize: 12, color: '#8C99AA', marginBottom: 14 }}>Powered by Stripe — accepts all major cards</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#00C896', background: 'rgba(0,200,150,0.12)', padding: '3px 10px', borderRadius: 99 }}>Active</span>
        </div>

        {/* ACH / Bank Debit */}
        <div className="card" style={{ flex: 1, minWidth: 260, padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#4285F4" strokeWidth="2"/>
              <path d="M12 7v1m0 8v1M9.17 9.17l.71.71m4.24 4.24.71.71M7 12h1m8 0h1M9.17 14.83l.71-.71m4.24-4.24.71-.71" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 8v8M9 10.5l3-2.5 3 2.5" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>ACH / Bank Debit (Stripe)</div>
          <div style={{ fontSize: 12, color: '#8C99AA', marginBottom: 14 }}>CAD &amp; USD — lower fees via Stripe</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#8C99AA' }}>Not Connected</span>
            <button style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#4285F4', border: 'none', borderRadius: 8, padding: '5px 16px', cursor: 'pointer' }}>Connect</button>
          </div>
        </div>
      </div>

      {/* Payout Settings */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '18px 24px', fontSize: 15, fontWeight: 700 }}>Payout Settings</div>

        {/* Payout Schedule */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8C99AA" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Payout Schedule</div>
            <div style={{ fontSize: 12, color: '#8C99AA' }}>{scheduleLabels[schedule]}</div>
          </div>
          <button onClick={() => { setPendingSchedule(schedule); setScheduleOpen(true); }} style={{ background: 'none', border: 'none', color: '#4285F4', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Edit›</button>
        </div>

        {/* Currency */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8C99AA" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 2.5-3 2.5-3 1.1-3 2.5 1.3 2.5 3 2.5 3-1.1 3-2.5"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Currency</div>
            <div style={{ fontSize: 12, color: '#8C99AA' }}>{currencyLabel}</div>
          </div>
          <button onClick={() => { setPendingCurrency(currency); setCurrencyOpen(true); }} style={{ background: 'none', border: 'none', color: '#4285F4', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Edit›</button>
        </div>

        {/* Invoice Auto-Send */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8C99AA" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Invoice Auto-Send</div>
            <div style={{ fontSize: 12, color: '#8C99AA' }}>{autoSend ? 'Sent on escrow release' : 'Disabled'}</div>
          </div>
          <button onClick={() => { setPendingAutoSend(autoSend); setAutoSendOpen(true); }} style={{ background: 'none', border: 'none', color: '#4285F4', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Edit›</button>
        </div>

        {/* Payout Notifications */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8C99AA" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Payout Notifications</div>
            <div style={{ fontSize: 12, color: '#8C99AA' }}>{notifLabel}</div>
          </div>
          <button onClick={() => { setPendingNotifEmail(notifEmail); setPendingNotifInApp(notifInApp); setPendingNotifSms(notifSms); setNotifOpen(true); }} style={{ background: 'none', border: 'none', color: '#4285F4', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Edit›</button>
        </div>
      </div>

      {/* Currency Modal */}
      {currencyOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setCurrencyOpen(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>Currency</div>
              <button onClick={() => setCurrencyOpen(false)} style={{ background: 'none', border: 'none', color: '#8C99AA', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: '#8C99AA', marginBottom: 8 }}>Currency</div>
            <CurrencyDropdown value={pendingCurrency} onChange={setPendingCurrency} />
            <button
              onClick={() => { setCurrency(pendingCurrency); setCurrencyOpen(false); }}
              style={{ marginTop: 20, width: '100%', padding: '12px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Save
            </button>
          </div>
        </div>
      )}

      {/* Invoice Auto-Send Modal */}
      {autoSendOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setAutoSendOpen(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>Invoice Auto-Send</div>
              <button onClick={() => setAutoSendOpen(false)} style={{ background: 'none', border: 'none', color: '#8C99AA', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Auto-send invoices</div>
                <div style={{ fontSize: 12, color: '#8C99AA', marginTop: 2 }}>Send invoice automatically on release</div>
              </div>
              <button
                onClick={() => setPendingAutoSend(v => !v)}
                style={{
                  width: 48, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer',
                  background: pendingAutoSend ? '#4285F4' : '#3A4252',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0
                }}>
                <span style={{
                  position: 'absolute', top: 3, left: pendingAutoSend ? 23 : 3,
                  width: 22, height: 22, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', display: 'block'
                }} />
              </button>
            </div>
            <button
              onClick={() => { setAutoSend(pendingAutoSend); setAutoSendOpen(false); }}
              style={{ marginTop: 24, width: '100%', padding: '12px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Save
            </button>
          </div>
        </div>
      )}

      {/* Payout Schedule Modal */}
      {scheduleOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setScheduleOpen(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>Payout Schedule</div>
              <button onClick={() => setScheduleOpen(false)} style={{ background: 'none', border: 'none', color: '#8C99AA', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: '#8C99AA', marginBottom: 8 }}>Schedule</div>
            <ScheduleDropdown value={pendingSchedule} onChange={setPendingSchedule} labels={scheduleLabels} />
            <button
              onClick={() => { setSchedule(pendingSchedule); setScheduleOpen(false); }}
              style={{ marginTop: 20, width: '100%', padding: '12px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Save
            </button>
          </div>
        </div>
      )}

      {/* Payout Notifications Modal */}
      {notifOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setNotifOpen(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>Payout Notifications</div>
              <button onClick={() => setNotifOpen(false)} style={{ background: 'none', border: 'none', color: '#8C99AA', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {[
              { label: 'Email', checked: pendingNotifEmail, set: setPendingNotifEmail },
              { label: 'In-app', checked: pendingNotifInApp, set: setPendingNotifInApp },
              { label: 'SMS', checked: pendingNotifSms, set: setPendingNotifSms },
            ].map(({ label, checked, set }) => (
              <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, cursor: 'pointer' }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 4, border: checked ? 'none' : '2px solid #4A5568',
                  background: checked ? '#7C3AED' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}
                  onClick={() => set(v => !v)}>
                  {checked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
                <span style={{ fontWeight: 600, fontSize: 14 }} onClick={() => set(v => !v)}>{label}</span>
              </label>
            ))}
            <button
              onClick={() => { setNotifEmail(pendingNotifEmail); setNotifInApp(pendingNotifInApp); setNotifSms(pendingNotifSms); setNotifOpen(false); }}
              style={{ marginTop: 6, width: '100%', padding: '12px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CurrencyDropdown({ value, onChange }: { value: 'CAD' | 'USD'; onChange: (v: 'CAD' | 'USD') => void }) {
  const [open, setOpen] = useState(false);
  const options: { v: 'CAD' | 'USD'; label: string }[] = [
    { v: 'CAD', label: 'CAD (Canadian Dollar)' },
    { v: 'USD', label: 'USD (US Dollar)' },
  ];
  const selected = options.find(o => o.v === value)!;
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {selected.label}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 10, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          {options.map(o => (
            <button key={o.v} onClick={() => { onChange(o.v); setOpen(false); }}
              style={{ width: '100%', padding: '10px 14px', background: o.v === value ? 'rgba(66,133,244,0.15)' : 'transparent', border: 'none', color: o.v === value ? '#4285F4' : 'var(--text-primary)', fontSize: 14, fontWeight: o.v === value ? 600 : 400, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
              {o.label}
              {o.v === value && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleDropdown({ value, onChange, labels }: { value: Schedule; onChange: (v: Schedule) => void; labels: Record<Schedule, string> }) {
  const [open, setOpen] = useState(false);
  const options: Schedule[] = ['instant', 'weekly', 'monthly'];
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {labels[value]}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 10, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }}
              style={{ width: '100%', padding: '10px 14px', background: o === value ? 'rgba(66,133,244,0.15)' : 'transparent', border: 'none', color: o === value ? '#4285F4' : 'var(--text-primary)', fontSize: 14, fontWeight: o === value ? 600 : 400, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
              {labels[o]}
              {o === value && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- MAIN COMPONENT EXPORT ---
interface Props { projects: Project[] }

export default function EarningsClient({ projects }: Props) {
  const [activeTab, setActiveTab] = useState<'earnings' | 'payment'>('earnings');
  const earnData = computeMonthlyEarnings(projects);
  const total = earnData.reduce((a, b) => a + b.v, 0);
  const lastMonth = earnData.length > 0 ? earnData[earnData.length - 1].v : 0;
  const avg = earnData.length > 0 ? Math.round(total / earnData.length) : 0;

  return (
    <div className="page fade-in">
      <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 20 }}>Earnings &amp; Payment</h1>

      <div className="tab-wrap" style={{ marginBottom: 24 }}>
        <button className={`tab-btn ${activeTab === 'earnings' ? 'active' : ''}`} onClick={() => setActiveTab('earnings')}>Earnings</button>
        <button className={`tab-btn ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>Payment</button>
      </div>

      {activeTab === 'earnings' && (
        <div className="fade-in">
          <div className="stat-row" style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Total Earned (6mo)', val: total, color: '#00C896' },
              { label: 'This Month', val: lastMonth, color: '#4285F4' },
              { label: 'Avg / Month', val: avg, color: '#94A3B8' },
            ].map(({ label, val, color }) => (
              <div key={label} className="stat-card" style={{ flex: 1, padding: 20, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div className="stat-label" style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>{label}</div>
                <div className="stat-val" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(val)}</div>
                <div className="stat-bar" style={{ height: 4, width: '100%', background: color, marginTop: 12, borderRadius: 2 }} />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 24 }}>
             <EarningsOverTimeChart earnData={earnData} />
          </div>

          <div className="card">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)', fontSize: 15, fontWeight: 700 }}>Monthly Breakdown</div>
            {earnData.map((row, i) => (
              <div key={row.key} className="tbl-row" style={{ display: 'flex', padding: '12px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--border-light)' }}>
                <div style={{ flex: 1, fontWeight: 600 }}>{row.month} {row.year}</div>
                <div style={{ flex: 1, textAlign: 'right', color: '#0984E3', fontWeight: 600 }}>{fmt(row.v)}</div>
                <div style={{ flex: 1, textAlign: 'right', fontWeight: 700 }}>{fmt(Math.round(row.v * 0.95))}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'payment' && <PaymentTab />}
    </div>
  );
}