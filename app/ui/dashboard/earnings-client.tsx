'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Project } from '@/app/lib/coredon-types';
import { updateUserProfile } from '@/app/lib/coredon-actions';
import { PLAN_OPTIONS as SHARED_PLAN_OPTIONS, planBadge as sharedPlanBadge } from '@/app/ui/dashboard/settings-client';

// --- HELPERS ---
function fmt(n: number): string {
  return n.toLocaleString('fr-CA', { 
    maximumFractionDigits: 0,
    useGrouping: true
  }).replace(/,/g, '\u202F') + '\u00a0$';
}

function computeMonthlyEarnings(projects: Project[]) {
  const moNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const released = projects.filter(p => p.status === 'Released');
  const byMonth: Record<string, number> = {};
  released.forEach(p => {
    const dateStr = p.released_date || p.completion_date || p.end_date || new Date().toISOString().slice(0, 10);
    const d = new Date(dateStr);
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

// --- SHARED MODAL SHELL ---
function SettingsModal({ title, subtitle, onClose, onSave, children }: {
  title: string; subtitle: string; onClose: () => void; onSave: () => void; children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,25,0.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', borderRadius: 20, width: 440, maxWidth: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: '20px 24px' }}>{children}</div>
        {/* Footer */}
        <div style={{ padding: '0 24px 22px', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'var(--bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={onSave} style={{ flex: 1, padding: '11px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Save changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// --- TOGGLE ---
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{ width: 52, height: 30, borderRadius: 99, border: 'none', cursor: 'pointer', background: on ? '#4285F4' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
    >
      <span style={{ position: 'absolute', top: 4, left: on ? 26 : 4, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

// --- ACCOUNT SETTINGS MODAL ---
const PLAN_OPTIONS = SHARED_PLAN_OPTIONS;
const planBadge = sharedPlanBadge;

interface UserProfile { name: string; email: string; plan: string; phone: string; firstName: string; lastName: string; }

function AccountSettingsModal({ user, onClose, onSaved }: {
  user: UserProfile;
  onClose: () => void;
  onSaved: (u: UserProfile) => void;
}) {
  const [tab, setTab] = useState<'profile' | 'notifications' | 'security' | 'billing'>('profile');
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName,  setLastName]  = useState(user?.lastName  ?? '');
  const [phone,     setPhone]     = useState(user?.phone     ?? '');
  const [plan,      setPlan]      = useState(user?.plan      ?? 'free');
  const [saving,    setSaving]    = useState(false);

  const initials = [(firstName[0] ?? ''), (lastName[0] ?? '')].join('').toUpperCase() || (user?.name ?? '').slice(0, 2).toUpperCase();
  const badge = planBadge(plan);
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || user?.name || '';

  async function handleSave() {
    setSaving(true);
    try {
      await updateUserProfile({ firstName, lastName, phone, plan });
      onSaved({ ...user, name: displayName, firstName, lastName, phone, plan });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid var(--border-light)',
    borderRadius: 10, background: 'var(--bg)', color: 'var(--text-primary)',
    fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };

  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'profile',       label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security',      label: 'Security' },
    { id: 'billing',       label: 'Billing' },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,25,0.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', borderRadius: 20, width: 560, maxWidth: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '22px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Settings</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Manage your account and preferences</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '16px 24px 0', borderBottom: '1px solid var(--border-light)', gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 14px', border: 'none', borderBottom: `2px solid ${tab === t.id ? '#4285F4' : 'transparent'}`, background: 'none', color: tab === t.id ? '#4285F4' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1, transition: 'color 0.12s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '24px', maxHeight: '65vh', overflowY: 'auto' }}>
          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Avatar card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#00C896', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0, letterSpacing: '-0.02em' }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{displayName}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, background: `${badge.color}18`, border: `1px solid ${badge.color}30`, padding: '3px 10px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {badge.label} · {badge.feeLabel}
                  </span>
                </div>
              </div>

              {/* Name row */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>First Name</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Last Name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email</label>
                <input value={user.email} readOnly style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
              </div>

              {/* Phone */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (514) 000-0000" style={inputStyle} />
              </div>

              <button onClick={handleSave} disabled={saving} style={{ padding: '12px 24px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}

          {tab === 'notifications' && (
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', padding: '40px 0', lineHeight: 1.6 }}>
              Notification preferences are managed in<br/>
              <strong style={{ color: 'var(--text-primary)' }}>Payout Settings → Payout Notifications</strong>
            </div>
          )}

          {tab === 'security' && (
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', padding: '40px 0', lineHeight: 1.6 }}>
              Two-factor authentication and password settings<br/>
              are managed in <strong style={{ color: 'var(--text-primary)' }}>Account Security</strong>.
            </div>
          )}

          {tab === 'billing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Choose the plan that fits your workflow.</div>
              {PLAN_OPTIONS.map(p => (
                <button key={p.id} onClick={() => setPlan(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: `2px solid ${plan === p.id ? p.color : 'var(--border-light)'}`, borderRadius: 12, background: plan === p.id ? `${p.color}0d` : 'var(--bg)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: plan === p.id ? p.color : 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.12s', fontSize: 14, fontWeight: 800, color: plan === p.id ? '#fff' : 'var(--text-muted)' }}>
                    {p.label[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {p.label} <span style={{ fontSize: 12, color: p.color, fontWeight: 600 }}>— {p.feeLabel}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.desc}</div>
                  </div>
                  {plan === p.id && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              ))}
              <button onClick={handleSave} disabled={saving} style={{ marginTop: 8, padding: '12px 24px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save Plan'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
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

  const scheduleOptions: { v: Schedule; label: string; desc: string }[] = [
    { v: 'instant', label: 'Instant', desc: 'Released immediately on client approval' },
    { v: 'weekly',  label: 'Weekly',  desc: 'Batched every Monday' },
    { v: 'monthly', label: 'Monthly', desc: 'Batched on the 1st of each month' },
  ];
  const currencyOptions: { v: 'CAD' | 'USD'; label: string; symbol: string; desc: string }[] = [
    { v: 'CAD', label: 'Canadian Dollar', symbol: 'CA$', desc: 'Default for Canadian providers' },
    { v: 'USD', label: 'US Dollar',        symbol: 'US$', desc: 'Accepted worldwide' },
  ];
  const notifChannels: { key: keyof typeof notifState; label: string; desc: string }[] = [
    { key: 'email', label: 'Email',  desc: 'Receive payout confirmations by email' },
    { key: 'inApp', label: 'In-app', desc: 'Notifications inside the dashboard' },
    { key: 'sms',   label: 'SMS',    desc: 'Text message alerts for each payout' },
  ];
  const notifState = { email: pendingNotifEmail, inApp: pendingNotifInApp, sms: pendingNotifSms };
  const notifSetters = { email: setPendingNotifEmail, inApp: setPendingNotifInApp, sms: setPendingNotifSms };

  const notifLabel = [notifEmail && 'Email', notifInApp && 'In-app', notifSms && 'SMS'].filter(Boolean).join(' · ') || 'None';
  const editBtnStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };

  return (
    <div className="fade-in">
      {/* Stripe Connect Card */}
      <div className="card" style={{ marginBottom: 20, borderRadius: 16, overflow: 'hidden', padding: 0 }}>
        {/* Row 1: Stripe Connect */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border-light)', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,91,255,0.1)', border: '1px solid rgba(99,91,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 2.5-3 2.5-3 1.1-3 2.5 1.3 2.5 3 2.5 3-1.1 3-2.5"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>Stripe Connect</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Your payout account</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#00a870', background: 'rgba(0,168,112,0.1)', border: '1px solid rgba(0,168,112,0.2)', padding: '3px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00a870', display: 'inline-block' }}/>
            Connected
          </span>
        </div>

        {/* Row 2: Bank account */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-light)', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="10" width="18" height="10" rx="2"/>
              <path d="M3 10l9-6 9 6"/>
              <path d="M9 16v-2M12 16v-2M15 16v-2"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>RBC Royal Bank — Chequing</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>••••• 8842 · CAD</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#4285F4', background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.2)', padding: '3px 10px', borderRadius: 99 }}>Primary</span>
        </div>

        {/* Manage button */}
        <div style={{ padding: '14px 20px' }}>
          <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 0', background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-light)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
            Manage in Stripe Dashboard
          </button>
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
            <div style={{ fontSize: 12, color: '#8C99AA' }}>{scheduleOptions.find(o => o.v === schedule)?.label}</div>
          </div>
          <button style={editBtnStyle} onClick={() => { setPendingSchedule(schedule); setScheduleOpen(true); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
        </div>

        {/* Currency */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8C99AA" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 2.5-3 2.5-3 1.1-3 2.5 1.3 2.5 3 2.5 3-1.1 3-2.5"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Currency</div>
            <div style={{ fontSize: 12, color: '#8C99AA' }}>{currencyOptions.find(o => o.v === currency)?.label}</div>
          </div>
          <button style={editBtnStyle} onClick={() => { setPendingCurrency(currency); setCurrencyOpen(true); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
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
          <button style={editBtnStyle} onClick={() => { setPendingAutoSend(autoSend); setAutoSendOpen(true); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
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
          <button style={editBtnStyle} onClick={() => { setPendingNotifEmail(notifEmail); setPendingNotifInApp(notifInApp); setPendingNotifSms(notifSms); setNotifOpen(true); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
        </div>
      </div>

      {/* ── Currency Modal ── */}
      {currencyOpen && (
        <SettingsModal title="Currency" subtitle="Choose your preferred payout currency." onClose={() => setCurrencyOpen(false)} onSave={() => { setCurrency(pendingCurrency); setCurrencyOpen(false); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currencyOptions.map(o => (
              <button key={o.v} onClick={() => setPendingCurrency(o.v)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: `2px solid ${pendingCurrency === o.v ? '#4285F4' : 'var(--border-light)'}`, borderRadius: 12, background: pendingCurrency === o.v ? 'rgba(66,133,244,0.06)' : 'var(--bg)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s', fontFamily: 'inherit' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: pendingCurrency === o.v ? '#4285F4' : 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.12s' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: pendingCurrency === o.v ? '#fff' : 'var(--text-muted)' }}>{o.symbol}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{o.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{o.desc}</div>
                </div>
                {pendingCurrency === o.v && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            ))}
          </div>
        </SettingsModal>
      )}

      {/* ── Payout Schedule Modal ── */}
      {scheduleOpen && (
        <SettingsModal title="Payout Schedule" subtitle="When should funds be transferred to your account?" onClose={() => setScheduleOpen(false)} onSave={() => { setSchedule(pendingSchedule); setScheduleOpen(false); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scheduleOptions.map((o, i) => (
              <button key={o.v} onClick={() => setPendingSchedule(o.v)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: `2px solid ${pendingSchedule === o.v ? '#4285F4' : 'var(--border-light)'}`, borderRadius: 12, background: pendingSchedule === o.v ? 'rgba(66,133,244,0.06)' : 'var(--bg)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s', fontFamily: 'inherit' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: pendingSchedule === o.v ? '#4285F4' : 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.12s', fontSize: 14, fontWeight: 800, color: pendingSchedule === o.v ? '#fff' : 'var(--text-muted)' }}>
                  {i === 0 ? '⚡' : i === 1 ? '7d' : '1m'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{o.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{o.desc}</div>
                </div>
                {pendingSchedule === o.v && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            ))}
          </div>
        </SettingsModal>
      )}

      {/* ── Invoice Auto-Send Modal ── */}
      {autoSendOpen && (
        <SettingsModal title="Invoice Auto-Send" subtitle="Automatically send invoices when a payout is released." onClose={() => setAutoSendOpen(false)} onSave={() => { setAutoSend(pendingAutoSend); setAutoSendOpen(false); }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', border: `2px solid ${pendingAutoSend ? '#4285F4' : 'var(--border-light)'}`, borderRadius: 14, background: pendingAutoSend ? 'rgba(66,133,244,0.06)' : 'var(--bg)', transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: pendingAutoSend ? '#4285F4' : 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={pendingAutoSend ? '#fff' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Auto-send invoices</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Triggered on every escrow release</div>
              </div>
            </div>
            <Toggle on={pendingAutoSend} onToggle={() => setPendingAutoSend(v => !v)} />
          </div>
        </SettingsModal>
      )}

      {/* ── Payout Notifications Modal ── */}
      {notifOpen && (
        <SettingsModal title="Payout Notifications" subtitle="Choose how you'd like to be notified about payouts." onClose={() => setNotifOpen(false)} onSave={() => { setNotifEmail(pendingNotifEmail); setNotifInApp(pendingNotifInApp); setNotifSms(pendingNotifSms); setNotifOpen(false); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifChannels.map(ch => {
              const on = notifState[ch.key];
              return (
                <div key={ch.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: `2px solid ${on ? '#4285F4' : 'var(--border-light)'}`, borderRadius: 12, background: on ? 'rgba(66,133,244,0.06)' : 'var(--bg)', transition: 'all 0.12s', cursor: 'pointer' }} onClick={() => notifSetters[ch.key](v => !v)}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{ch.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{ch.desc}</div>
                  </div>
                  <Toggle on={on} onToggle={() => notifSetters[ch.key](v => !v)} />
                </div>
              );
            })}
          </div>
        </SettingsModal>
      )}
    </div>
  );
}

// --- MAIN COMPONENT EXPORT ---
const DEFAULT_USER: UserProfile = { name: '', email: '', plan: 'free', phone: '', firstName: '', lastName: '' };

interface Props { projects: Project[]; user?: UserProfile }

export default function EarningsClient({ projects, user: initialUser }: Props) {
  const [activeTab, setActiveTab] = useState<'earnings' | 'payment'>('earnings');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [user, setUser] = useState<UserProfile>(initialUser ?? DEFAULT_USER);
  const earnData = computeMonthlyEarnings(projects);
  const total = earnData.reduce((a, b) => a + b.v, 0);
  const lastMonth = earnData.length > 0 ? earnData[earnData.length - 1].v : 0;
  const avg = earnData.length > 0 ? Math.round(total / earnData.length) : 0;

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Earnings &amp; Payment</h1>
        <button
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
      {settingsOpen && (
        <AccountSettingsModal user={user} onClose={() => setSettingsOpen(false)} onSaved={u => setUser(u)} />
      )}

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