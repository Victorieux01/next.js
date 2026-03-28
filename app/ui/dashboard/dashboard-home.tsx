'use client';
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
    Funded: '#00C896', Released: '#0984E3', Pending: '#F59E0B', Dispute: '#EF4444'
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColors[status] || '#94A3B8', display: 'inline-block', flexShrink: 0 }} />
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

export default function DashboardHome({ projects, clients }: Props) {
  const router = useRouter();

  const escrow = projects.filter(p => p.status === 'Funded').reduce((a, b) => a + b.amount, 0);
  const released = projects.filter(p => p.status === 'Released').reduce((a, b) => a + b.amount, 0);
  const pending = projects.filter(p => p.status === 'Pending').reduce((a, b) => a + b.amount, 0);

  const sortOrder: Record<string, number> = { Dispute: 0, Funded: 1, Pending: 2, Released: 3 };
  const sorted = [...projects].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const oa = sortOrder[a.status] ?? 99, ob = sortOrder[b.status] ?? 99;
    if (oa !== ob) return oa - ob;
    return new Date(b.start_date || '2000-01-01').getTime() - new Date(a.start_date || '2000-01-01').getTime();
  }).slice(0, 7);

  return (
    <div className="page fade-in" style={{ position: 'relative' }}>
      {/* Page Controls */}
      <div id="page-controls">
        <button className="tb-icon-btn" title="Notifications">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="tb-notif-dot"></span>
        </button>
        <button className="tb-avatar">H</button>
      </div>

      {/* Welcome */}
      <div className="welcome-section">
        <h1>Welcome back, Henri.</h1>
        <p>Here&apos;s what&apos;s happening with your projects.</p>
      </div>

      {/* Stats */}
      <div className="stat-row">
        {[
          { label: 'Total Escrow', val: escrow, color: '#00C896' },
          { label: 'Total Released', val: released, color: '#0984E3' },
          { label: 'Pending', val: pending, color: '#94A3B8' },
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

      {/* Projects Table */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Recent Projects</h2>
        <button className="btn" onClick={() => router.push('/dashboard/projects')}>View All</button>
      </div>

      <div className="card">
        <div className="tbl-header">
          <span className="tbl-col" style={{ flex: 2 }}>Name</span>
          <span className="tbl-col hide-m" style={{ flex: 2 }}>Email</span>
          <span className="tbl-col" style={{ flex: 1 }}>Status</span>
          <span className="tbl-col" style={{ flex: 1, textAlign: 'right' }}>Value</span>
        </div>
        {sorted.map((p, i) => (
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
        {sorted.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            No projects yet.{' '}
            <button className="btn" style={{ marginLeft: 8 }} onClick={() => router.push('/dashboard/projects/create')}>Create your first project</button>
          </div>
        )}
      </div>
    </div>
  );
}
