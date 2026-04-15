'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/app/lib/coredon-types';

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

function Avatar({ project }: { project: Project }) {
  const isDispute = project.status === 'Dispute';
  const bg    = isDispute ? '#421616' : project.color + '22';
  const color = isDispute ? '#984040' : project.color;
  return (
    <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, transition: 'background 0.2s, color 0.2s' }}>
      {project.initials}
    </div>
  );
}

interface Props { projects: Project[] }

const SORT_ORDER: Record<string, number> = { Dispute: 0, Funded: 1, Pending: 2, Released: 3 };

export default function ProjectsClient({ projects: initialProjects }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const sorted = [...initialProjects].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const oa = SORT_ORDER[a.status] ?? 99, ob = SORT_ORDER[b.status] ?? 99;
    if (oa !== ob) return oa - ob;
    return new Date(b.start_date || '2000-01-01').getTime() - new Date(a.start_date || '2000-01-01').getTime();
  });

  const filtered = sorted
    .filter(p => filter === 'All' || p.status === filter)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const total = initialProjects.length;
  const active = initialProjects.filter(p => p.status === 'Funded' || p.status === 'Pending').length;
  const disputes = initialProjects.filter(p => p.status === 'Dispute').length;

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>Projects</h1>
        <button className="btn" onClick={() => router.push('/dashboard/projects/create')}>+ New Project</button>
      </div>

      {/* Stats */}
      <div className="stat-row">
        {[
          { label: 'Total Projects', val: String(total), color: '#00C896' },
          { label: 'Active Projects', val: String(active), color: '#4285F4' },
          { label: 'In Dispute', val: String(disputes), color: '#EA4335' },
        ].map(({ label, val, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-card-inner">
              <div className="stat-label">{label}</div>
              <div className="stat-val">{val}</div>
            </div>
            <div className="stat-bar" style={{ background: color }} />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>All Projects</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="search-box">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input placeholder="Search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="fsel" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
              {['All', 'Funded', 'Released', 'Pending', 'Dispute'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="tbl-header">
          <span className="tbl-col" style={{ flex: 1 }}>Client</span>
          <span className="tbl-col" style={{ flex: 1 }}>Status</span>
          <span className="tbl-col" style={{ flex: 1, textAlign: 'right' }}>Amount</span>
        </div>

        {pageItems.map((p, i) => (
          <div
            key={p.id}
            className="tbl-row"
            style={{ borderTop: i === 0 ? 'none' : undefined }}
            onClick={() => router.push(`/dashboard/projects/${p.id}`)}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar project={p} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                {p.description && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.description}
                  </div>
                )}
              </div>
            </div>
            <div style={{ flex: 1 }}><Badge status={p.status} /></div>
            <div style={{ flex: 1, textAlign: 'right', fontWeight: 600, fontSize: 14 }}>{fmt(p.amount)}</div>
          </div>
        ))}

        {pageItems.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No projects found.</div>
        )}

        {/* Pagination */}
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
