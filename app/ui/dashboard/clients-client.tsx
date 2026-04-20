'use client';
import { useState } from 'react';
import { CoredonClient } from '@/app/lib/coredon-types';
import { updateClient, createClient, deleteClient } from '@/app/lib/coredon-actions';
import { useRouter } from 'next/navigation';

function fmt(n: number): string {
  return n.toLocaleString('fr-CA', { maximumFractionDigits: 0 }) + '\u00a0$';
}

const COLORS = ['#4285F4','#00C896','#9AA0A6','#F9AB00','#EA4335','#A142F4','#24C1E0','#FF7043'];

// ── Field component ──────────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = 'text', placeholder = '',
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
          borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: 'var(--text-primary)',
          background: 'var(--surface)', outline: 'none',
          transition: 'border-color 0.12s, box-shadow 0.12s',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(9,132,227,0.1)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

// ── Edit / New Client Modal ──────────────────────────────────────────────────
function ClientModal({
  client,
  onClose,
  onSaved,
}: {
  client: CoredonClient | null; // null = new client
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !client;
  const nameParts = (client?.name || '').split(' ');

  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName]   = useState(nameParts.slice(1).join(' ') || '');
  const [company, setCompany]     = useState(client?.company || '');
  const [email, setEmail]         = useState(client?.email || '');
  const [phone, setPhone]         = useState(client?.phone || '');
  const [outstanding, setOutstanding] = useState(String(client?.outstanding || ''));
  const [address, setAddress]     = useState(client?.address || '');
  const [note, setNote]           = useState(client?.note || '');
  const [saving, setSaving]       = useState(false);

  const color = client ? COLORS[0] : '#64748B';

  async function handleSave() {
    setSaving(true);
    const fd = new FormData();
    fd.append('name', (firstName + ' ' + lastName).trim());
    fd.append('company', company);
    fd.append('email', email);
    fd.append('phone', phone);
    fd.append('address', address);
    fd.append('note', note);
    fd.append('outstanding', outstanding);
    if (isNew) {
      await createClient(fd);
    } else {
      await updateClient(client!.id, fd);
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', border: '1px solid var(--border)', animation: 'mi 0.2s ease both' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: color + '22', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
              {(company || firstName || 'N')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{company || (isNew ? 'New Client' : '')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Edit client info</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4, borderRadius: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
          <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="Jordan" />
          <Field label="Last Name"  value={lastName}  onChange={setLastName}  placeholder="Lee" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <Field label="Company" value={company} onChange={setCompany} placeholder="Apex Studios" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="contact@example.com" />
        </div>

        <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
          <Field label="Phone" value={phone} onChange={setPhone} placeholder="514-555-0101" />
          <Field label="Outstanding ($)" value={outstanding} onChange={setOutstanding} type="number" placeholder="0" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <Field label="Address" value={address} onChange={setAddress} placeholder="Street address" />
        </div>

        <div style={{ marginBottom: 22 }}>
          <Field label="Note" value={note} onChange={setNote} placeholder="e.g. Authorization Created" />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn"
            style={{ flex: 1, padding: 12, fontSize: 14, opacity: saving ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : isNew ? 'Create Client' : 'Save Changes'}
          </button>
          <button className="btn-outline" style={{ flex: 1, padding: 12, fontSize: 14 }} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
interface Props { clients: CoredonClient[] }

export default function ClientsClient({ clients: initialClients }: Props) {
  const router = useRouter();
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('All');
  const [page, setPage]         = useState(1);
  const [modal, setModal]       = useState<'edit' | 'new' | null>(null);
  const [selected, setSelected] = useState<CoredonClient | null>(null);
  const PER_PAGE = 8;

  const activeIds   = new Set(initialClients.filter(c => c.outstanding > 0).map(c => c.id));
  const disputeCount = 0; // would need project data; keeping simple

  const filtered = initialClients
    .filter(c => filter === 'All' || (filter === 'Active' && activeIds.has(c.id)))
    .filter(c =>
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      (c.name || '').toLowerCase().includes(search.toLowerCase())
    );

  const pages     = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function openEdit(c: CoredonClient) { setSelected(c); setModal('edit'); }
  function openNew()                  { setSelected(null); setModal('new'); }
  function closeModal()               { setModal(null); setSelected(null); }
  function onSaved()                  { router.refresh(); }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this client?')) return;
    await deleteClient(id);
    router.refresh();
  }

  return (
    <div className="page fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>Clients</h1>
        <button className="btn" onClick={openNew}>New Client +</button>
      </div>

      {/* Stat cards */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-card-inner">
            <div className="stat-label">Total Clients</div>
            <div className="stat-val">{initialClients.length}</div>
            <div className="stat-delta" style={{ color: '#16A34A' }}>↑ 1 new Last month</div>
          </div>
          <div className="stat-bar" style={{ background: '#0984E3' }} />
        </div>
        <div className="stat-card">
          <div className="stat-card-inner">
            <div className="stat-label">Active clients</div>
            <div className="stat-val">{activeIds.size}</div>
          </div>
          <div className="stat-bar" style={{ background: '#00C896' }} />
        </div>
        <div className="stat-card">
          <div className="stat-card-inner">
            <div className="stat-label">Clients en dispute</div>
            <div className="stat-val">{disputeCount}</div>
            <div className="stat-delta" style={{ color: '#DC2626' }}>↑ 2 open Last month</div>
          </div>
          <div className="stat-bar" style={{ background: '#EF4444' }} />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Clients List</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="search-box">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input placeholder="Search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="fsel" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
              <option value="All">All</option>
              <option value="Active">Active</option>
            </select>
          </div>
        </div>

        <div className="tbl-header">
          <span className="tbl-col" style={{ flex: 1.5 }}>Company</span>
          <span className="tbl-col" style={{ flex: 1.5 }}>Name</span>
          <span className="tbl-col hide-m" style={{ flex: 1.5 }}>Email</span>
          <span className="tbl-col" style={{ flex: 1 }}>Outstanding</span>
          <span className="tbl-col hide-m" style={{ flex: 1 }}>Note</span>
          <span className="tbl-col" style={{ flex: 0.4 }}></span>
        </div>

        {pageItems.map((c, i) => {
          const color = COLORS[initialClients.indexOf(c) % COLORS.length];
          return (
            <div
              key={c.id}
              className="tbl-row"
              style={{ borderTop: i === 0 ? 'none' : undefined }}
              onClick={() => openEdit(c)}
            >
              {/* Company */}
              <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: color + '22', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {c.company[0]}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{c.company}</span>
              </div>

              {/* Name */}
              <div style={{ flex: 1.5, fontSize: 14, color: 'var(--text-primary)' }}>{c.name}</div>

              {/* Email */}
              <div className="hide-m" style={{ flex: 1.5, fontSize: 13, color: 'var(--text-secondary)' }}>{c.email}</div>

              {/* Outstanding */}
              <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{fmt(c.outstanding || 0)}</div>

              {/* Note */}
              <div className="hide-m" style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{c.note}</div>

              {/* Actions */}
              <div style={{ flex: 0.4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                {/* Edit icon */}
                <button
                  title="Edit"
                  onClick={() => openEdit(c)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'all 0.12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#0984E3'; (e.currentTarget as HTMLButtonElement).style.background = '#EFF6FF'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                {/* Delete icon */}
                <button
                  title="Delete"
                  onClick={e => handleDelete(c.id, e)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', fontSize: 14, transition: 'all 0.12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}

        {pageItems.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No clients found.</div>
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

      {/* Modal */}
      {modal && (
        <ClientModal
          client={modal === 'edit' ? selected : null}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
