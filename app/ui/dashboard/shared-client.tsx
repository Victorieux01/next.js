'use client';
import { useState } from 'react';
import Link from 'next/link';

function fmt(n: number): string {
  return n.toLocaleString('fr-CA', { maximumFractionDigits: 0 }) + ' $';
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

interface SharedProject {
  id: string;
  name: string;
  status: string;
  amount: number;
  start_date: string;
  expected_date: string;
  color: string;
  initials: string;
  user_id: string;
  provider_name: string;
  token: string;
}

interface Props { projects: SharedProject[] }

export default function SharedClient({ projects }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.provider_name.toLowerCase().includes(search.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="page fade-in">
      <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 24 }}>Shared with me</h1>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Projects shared with you</span>
          <div className="search-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        <div className="tbl-header">
          <span className="tbl-col" style={{ flex: 2 }}>Project</span>
          <span className="tbl-col hide-m" style={{ flex: 1 }}>Provider</span>
          <span className="tbl-col" style={{ flex: 1, textAlign: 'right' }}>Amount</span>
          <span className="tbl-col" style={{ flex: 1, textAlign: 'right' }}>Status</span>
          <span className="tbl-col" style={{ flex: 1, textAlign: 'right' }}>Portal</span>
        </div>

        {pageItems.map((p, i) => (
          <div
            key={p.id}
            className="tbl-row"
            style={{ borderTop: i === 0 ? 'none' : undefined }}
          >
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: p.color + '22', color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {p.initials}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
            </div>
            <div className="hide-m" style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>
              {p.provider_name || '—'}
            </div>
            <div style={{ flex: 1, textAlign: 'right', fontWeight: 600, fontSize: 14 }}>{fmt(p.amount)}</div>
            <div style={{ flex: 1, textAlign: 'right' }}><Badge status={p.status} /></div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <Link
                href={`/client/${p.id}?token=${p.token}`}
                style={{ fontSize: 12, color: '#0984E3', fontWeight: 600, textDecoration: 'none' }}
              >
                View →
              </Link>
            </div>
          </div>
        ))}

        {pageItems.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            No projects have been shared with you yet.
          </div>
        )}

        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                style={{
                  width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                  background: page === i + 1 ? '#0984E3' : 'transparent',
                  color: page === i + 1 ? '#fff' : 'var(--text-primary)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
