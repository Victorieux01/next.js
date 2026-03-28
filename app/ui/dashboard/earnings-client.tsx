'use client';
import { useState } from 'react';
import { Project } from '@/app/lib/coredon-types';

function fmt(n: number): string {
  return n.toLocaleString('fr-CA', { maximumFractionDigits: 0 }) + '\u00a0$';
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

      <div className="tab-wrap">
        <button className={`tab-btn ${activeTab === 'earnings' ? 'active' : ''}`} onClick={() => setActiveTab('earnings')}>Earnings</button>
        <button className={`tab-btn ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>Payment</button>
      </div>

      {activeTab === 'earnings' && (
        <div className="fade-in">
          <div className="stat-row">
            {[
              { label: 'Total Earned', val: total, color: '#00C896' },
              { label: 'This Month', val: lastMonth, color: '#4285F4' },
              { label: 'Avg / Month', val: avg, color: '#94A3B8' },
            ].map(({ label, val, color }) => (
              <div key={label} className="stat-card">
                <div className="stat-card-inner">
                  <div className="stat-label">{label}</div>
                  <div className="stat-val">{fmt(val)}</div>
                </div>
                <div className="stat-bar" style={{ background: color }} />
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)', fontSize: 15, fontWeight: 700 }}>Monthly Breakdown</div>
            <div className="tbl-header">
              <span className="tbl-col" style={{ flex: 1 }}>Month</span>
              <span className="tbl-col" style={{ flex: 1, textAlign: 'right' }}>Gross Earned</span>
              <span className="tbl-col" style={{ flex: 1, textAlign: 'right' }}>Net (95%)</span>
            </div>
            {earnData.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No released projects yet.</div>
            )}
            {earnData.map((row, i) => (
              <div key={row.key} className="tbl-row" style={{ borderTop: i === 0 ? 'none' : undefined }}>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{row.month} {row.year}</div>
                <div style={{ flex: 1, textAlign: 'right', color: '#0984E3', fontWeight: 600, fontSize: 14 }}>{fmt(row.v)}</div>
                <div style={{ flex: 1, textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{fmt(Math.round(row.v * 0.95))}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="fade-in">
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              { label: 'Credit Card (Stripe)', sub: 'Powered by Stripe — accepts all major cards', active: true },
              { label: 'ACH / Bank Debit (Stripe)', sub: 'CAD & USD — lower fees via Stripe', active: false },
            ].map(({ label, sub, active }) => (
              <div key={label} className="card" style={{ flex: 1, minWidth: 160, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>{sub}</div>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 12, background: active ? 'var(--green-bg)' : 'var(--border-light)', color: active ? '#007A5E' : 'var(--text-muted)' }}>
                  {active ? 'Active' : 'Not Connected'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
