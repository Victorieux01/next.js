'use client';
import { useState } from 'react';
import { CoredonClient } from '@/app/lib/coredon-types';

function fmt(n: number): string {
  return n.toLocaleString('fr-CA', { maximumFractionDigits: 0 }) + '\u00a0$';
}

const COLORS = ['#4285F4','#00C896','#9AA0A6','#F9AB00','#EA4335','#A142F4','#24C1E0','#FF7043'];

interface Props { clients: CoredonClient[] }

export default function ClientsClient({ clients: initialClients }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const filtered = initialClients.filter(c =>
    c.company.toLowerCase().includes(search.toLowerCase()) ||
    (c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>Clients</h1>
        <button className="btn">New Client +</button>
      </div>

      {/* Stats */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-card-inner">
            <div className="stat-label">Total Clients</div>
            <div className="stat-val">{initialClients.length}</div>
          </div>
          <div className="stat-bar" style={{ background: '#0984E3' }} />
        </div>
        <div className="stat-card">
          <div className="stat-card-inner">
            <div className="stat-label">Outstanding</div>
            <div className="stat-val">{fmt(initialClients.reduce((a, c) => a + (c.outstanding || 0), 0))}</div>
          </div>
          <div className="stat-bar" style={{ background: '#00C896' }} />
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Clients List</span>
          <div className="search-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        <div className="tbl-header">
          <span className="tbl-col" style={{ flex: 1.5 }}>Company</span>
          <span className="tbl-col" style={{ flex: 1.5 }}>Name</span>
          <span className="tbl-col hide-m" style={{ flex: 1.5 }}>Email</span>
          <span className="tbl-col" style={{ flex: 1 }}>Outstanding</span>
          <span className="tbl-col hide-m" style={{ flex: 1 }}>Note</span>
        </div>

        {pageItems.map((c, i) => {
          const color = COLORS[i % COLORS.length];
          return (
            <div key={c.id} className="tbl-row" style={{ borderTop: i === 0 ? 'none' : undefined }}>
              <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: color + '22', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {c.company[0]}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{c.company}</span>
              </div>
              <div style={{ flex: 1.5, fontSize: 14 }}>{c.name}</div>
              <div className="hide-m" style={{ flex: 1.5, fontSize: 13, color: 'var(--text-secondary)' }}>{c.email}</div>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{fmt(c.outstanding || 0)}</div>
              <div className="hide-m" style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{c.note}</div>
            </div>
          );
        })}

        {pageItems.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No clients found.</div>
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
