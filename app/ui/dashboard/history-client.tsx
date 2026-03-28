'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/app/lib/coredon-types';

function fmt(n: number): string {
  return n.toLocaleString('fr-CA', { maximumFractionDigits: 0 }) + '\u00a0$';
}

interface Props { projects: Project[] }

export default function HistoryClient({ projects }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 11;

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="page fade-in">
      <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 24 }}>Project History</h1>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Completed Projects</span>
          <div className="search-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        <div className="tbl-header">
          <span className="tbl-col" style={{ flex: 1 }}>Client</span>
          <span className="tbl-col hide-m" style={{ flex: 2 }}>Description</span>
          <span className="tbl-col" style={{ flex: 1, textAlign: 'right' }}>Amount</span>
          <span className="tbl-col" style={{ flex: 1, textAlign: 'right' }}>Released On</span>
        </div>

        {pageItems.map((p, i) => (
          <div
            key={p.id}
            className="tbl-row"
            style={{ borderTop: i === 0 ? 'none' : undefined }}
            onClick={() => router.push(`/dashboard/projects/${p.id}`)}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: p.color + '22', color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{p.initials}</div>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
            </div>
            <div className="hide-m" style={{ flex: 2, fontSize: 13, color: 'var(--text-secondary)' }}>{p.description}</div>
            <div style={{ flex: 1, textAlign: 'right', fontWeight: 600, fontSize: 14 }}>{fmt(p.amount)}</div>
            <div style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{p.released_date || '—'}</div>
          </div>
        ))}

        {pageItems.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No completed projects yet.</div>
        )}

        <div className="pag">
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Page {page} of {pages}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pag-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>&#8592; Previous</button>
            <button className="pag-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next &#8594;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
