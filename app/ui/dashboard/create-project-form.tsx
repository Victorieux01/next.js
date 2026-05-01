'use client';
import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '@/app/lib/coredon-actions';
import { CoredonClient } from '@/app/lib/coredon-types';

// ── Custom Date Picker ───────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function DatePicker({ value, onChange, hasError }: {
  value: string; onChange: (v: string) => void; hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const [view, setView] = useState(() => {
    const d = parsed ?? today;
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function prevMonth() {
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  }
  function nextMonth() {
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
  }

  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  function selectDay(day: number) {
    const mm = String(view.month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${view.year}-${mm}-${dd}`);
    setOpen(false);
  }

  const display = parsed
    ? parsed.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface,#fff)',
        border: `1px solid ${open ? '#4285F4' : hasError ? '#EF4444' : 'var(--border-light,#F2F4F7)'}`,
        borderRadius: 10, padding: '11px 14px', fontSize: 13, cursor: 'pointer',
        color: display ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'inherit',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: open ? '0 0 0 3px rgba(66,133,244,0.12)' : 'none',
      }}>
        <span>{display || 'Select a date'}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 999,
          background: 'var(--surface,#fff)', border: '1px solid var(--border,#EAECF0)',
          borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          padding: '16px', width: 272,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button type="button" onClick={prevMonth} style={{ width: 28, height: 28, border: '1px solid var(--border-light)', borderRadius: 8, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {MONTHS[view.month]} {view.year}
            </span>
            <button type="button" onClick={nextMonth} style={{ width: 28, height: 28, border: '1px solid var(--border-light)', borderRadius: 8, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '2px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={'e' + i} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dateStr = `${view.year}-${String(view.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const isToday = today.getFullYear() === view.year && today.getMonth() === view.month && today.getDate() === day;
              const isSelected = parsed && parsed.getFullYear() === view.year && parsed.getMonth() === view.month && parsed.getDate() === day;
              const isPast = dateStr <= todayStr;
              return (
                <button key={day} type="button" onClick={() => !isPast && selectDay(day)} style={{
                  width: '100%', aspectRatio: '1', border: 'none', borderRadius: 8,
                  cursor: isPast ? 'default' : 'pointer',
                  fontSize: 12, fontWeight: isSelected ? 700 : 400,
                  background: isSelected ? '#4285F4' : 'transparent',
                  color: isSelected ? '#fff' : isPast ? 'var(--border)' : isToday ? '#4285F4' : 'var(--text-primary)',
                  fontFamily: 'inherit',
                  outline: isToday && !isSelected ? '1.5px solid #4285F4' : 'none',
                  opacity: isPast ? 0.4 : 1,
                }}
                  onMouseEnter={e => { if (!isSelected && !isPast) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg,#F9FAFB)'; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >{day}</button>
              );
            })}
          </div>
          {value && (
            <button type="button" onClick={() => { onChange(''); setOpen(false); }} style={{
              marginTop: 12, width: '100%', background: 'none', border: 'none', borderTop: '1px solid var(--border-light)',
              paddingTop: 10, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
            }}>Clear</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────
interface Step1 {
  title: string;
  clientName: string;
  email: string;
  deliverables: string;
  deliveryDate: string;
}
interface Step2 {
  hourlyRate: string;
  hours: string;
  technicalCost: string;
  artisticCost: string;
  revisions: string;
  internalNote: string;
}

// ── Shared input style ───────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--card)', border: '1px solid var(--border-light)',
  borderRadius: 10, padding: '11px 14px',
  fontSize: 13, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
};
function errInp(has: boolean): React.CSSProperties {
  return has ? { ...inp, borderColor: '#EF4444' } : inp;
}

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
        {hint && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: 11, color: '#EF4444' }}>{error}</span>}
    </div>
  );
}

// ── Step bar ─────────────────────────────────────────────────────────────────
function StepBar({ step }: { step: 1 | 2 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {([{ n: 1, label: 'Project & Client' }, { n: 2, label: 'Pricing' }] as const).map((s, i) => {
        const active = step === s.n, done = step > s.n;
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: active || done ? '#4285F4' : 'var(--card)',
                border: active || done ? 'none' : '1px solid var(--border-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                color: active || done ? '#fff' : 'var(--text-muted)',
              }}>
                {done
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : s.n}
              </div>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.label}</span>
            </div>
            {i === 0 && <div style={{ width: 40, height: 1, background: 'var(--border-light)', margin: '0 10px' }} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Contract preview ─────────────────────────────────────────────────────────
function ContractPreview({ s1, s2 }: { s1: Step1; s2: Step2 }) {
  const refNum = useRef(Math.floor(Math.random() * 90000 + 10000));
  const today = new Date().toISOString().slice(0, 10);

  const hourlyRate    = parseFloat(s2.hourlyRate)    || 0;
  const hours         = parseFloat(s2.hours)         || 0;
  const technicalCost = parseFloat(s2.technicalCost) || 0;
  const artisticCost  = parseFloat(s2.artisticCost)  || 0;
  const revisions     = parseInt(s2.revisions)       || 0;
  const labor         = hourlyRate * hours;
  const total         = labor + technicalCost + artisticCost;

  const fmt = (n: number) => n.toLocaleString('fr-CA', { minimumFractionDigits: 2 }) + ' $';
  const dim = (v: string | number, fallback: string) => (String(v).trim() ? String(v) : fallback);

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 16, padding: '28px 24px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.6,
      minHeight: 580,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-light)' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>Contract</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Service Agreement</div>
        </div>
        <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 10 }}>
          <div>Date <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{today}</span></div>
          <div>Ref <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>#{refNum.current}</span></div>
        </div>
      </div>

      {/* Project title */}
      <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Project</div>
        <div style={{ fontWeight: 700, color: s1.title ? 'var(--text-primary)' : 'var(--border)', fontSize: 13 }}>{dim(s1.title, 'Project Title')}</div>
      </div>

      {/* From / To */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Provider</div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 12 }}>Coredon</div>
          <div style={{ color: 'var(--text-secondary)' }}>coredon.app</div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Client</div>
          <div style={{ fontWeight: 700, color: s1.clientName ? 'var(--text-primary)' : 'var(--border)', fontSize: 12 }}>{dim(s1.clientName, 'Client Name')}</div>
          <div style={{ color: s1.email ? 'var(--text-secondary)' : 'var(--border)' }}>{dim(s1.email, 'client@example.com')}</div>
        </div>
      </div>

      {/* Deliverables */}
      <div style={{ marginBottom: 16, paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Scope of Work</div>
        <div style={{ color: s1.deliverables ? 'var(--text-secondary)' : 'var(--border)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {dim(s1.deliverables, 'Deliverables will appear here…')}
        </div>
      </div>

      {/* Pricing breakdown */}
      <div style={{ marginBottom: 16, paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Pricing Breakdown</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Labor */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>
              Labor
              {hourlyRate > 0 && hours > 0 && (
                <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({hourlyRate} $/h × {hours} h)</span>
              )}
            </span>
            <span style={{ fontWeight: 600, color: labor > 0 ? 'var(--text-primary)' : 'var(--border)' }}>
              {labor > 0 ? fmt(labor) : '—'}
            </span>
          </div>
          {/* Technical */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Technical costs</span>
            <span style={{ fontWeight: 600, color: technicalCost > 0 ? 'var(--text-primary)' : 'var(--border)' }}>
              {technicalCost > 0 ? fmt(technicalCost) : '—'}
            </span>
          </div>
          {/* Artistic */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Artistic value</span>
            <span style={{ fontWeight: 600, color: artisticCost > 0 ? 'var(--text-primary)' : 'var(--border)' }}>
              {artisticCost > 0 ? fmt(artisticCost) : '—'}
            </span>
          </div>
          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', paddingTop: 8, borderTop: '1px solid var(--border-light)', marginTop: 4 }}>
            <span>Total (CAD)</span>
            <span style={{ color: total > 0 ? 'var(--text-primary)' : 'var(--border)' }}>{total > 0 ? fmt(total) : '—'}</span>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div style={{ paddingTop: 14, borderTop: '1px solid var(--border-light)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Terms</div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Delivery <span style={{ color: s1.deliveryDate ? 'var(--text-primary)' : 'var(--border)', fontWeight: 600 }}>{s1.deliveryDate || '—'}</span>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Revisions <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{revisions > 0 ? revisions : '—'}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Note</div>
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 10 }}>Internal notes are not included in this contract.</div>
        </div>
      </div>
    </div>
  );
}

// ── Client avatar color ───────────────────────────────────────────────────────
const AVATAR_COLORS = ['#4285F4','#00C896','#9AA0A6','#F9AB00','#EA4335','#A142F4','#24C1E0','#FF7043'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── Client combobox ───────────────────────────────────────────────────────────
function ClientCombobox({ clients, value, onSelect, hasError }: {
  clients: CoredonClient[];
  value: string;
  onSelect: (name: string, email: string) => void;
  hasError?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = query.trim()
    ? clients.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.company.toLowerCase().includes(query.toLowerCase()) ||
        c.email.toLowerCase().includes(query.toLowerCase())
      )
    : clients;

  function pick(c: CoredonClient) {
    onSelect(c.name, c.email);
    setQuery(c.name);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        style={hasError ? { ...errInp(true) } : inp}
        placeholder="Type or select a client…"
        value={query}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={e => {
          setQuery(e.target.value);
          onSelect(e.target.value, '');
          setOpen(true);
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 999,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          overflow: 'hidden', maxHeight: 240, overflowY: 'auto',
        }}>
          {filtered.map(c => {
            const color = avatarColor(c.name);
            const initials = c.name.split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase();
            return (
              <div
                key={c.id}
                onMouseDown={() => pick(c)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: color + '22', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company || c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name !== c.company ? c.name : c.email}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Number input ─────────────────────────────────────────────────────────────
function NumInput({ value, onChange, placeholder, prefix, hasError, min = 0 }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  prefix?: string; hasError?: boolean; min?: number;
}) {
  return (
    <div style={{ position: 'relative' }}>
      {prefix && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)', pointerEvents: 'none' }}>{prefix}</span>}
      <input
        style={{ ...errInp(hasError ?? false), paddingLeft: prefix ? 26 : undefined }}
        type="number"
        min={min}
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CreateProjectForm({ clients = [] }: { clients?: CoredonClient[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2>(1);
  const [errors1, setErrors1] = useState<Partial<Record<keyof Step1, string>>>({});
  const [errors2, setErrors2] = useState<Partial<Record<keyof Step2, string>>>({});
  const [submitError, setSubmitError] = useState('');

  const [s1, setS1] = useState<Step1>({
    title: '', clientName: '', email: '', deliverables: '', deliveryDate: '',
  });
  const [s2, setS2] = useState<Step2>({
    hourlyRate: '', hours: '', technicalCost: '0', artisticCost: '0', revisions: '', internalNote: '',
  });

  function upd1(field: keyof Step1, val: string) {
    setS1(p => ({ ...p, [field]: val }));
    if (errors1[field]) setErrors1(p => ({ ...p, [field]: undefined }));
  }
  function upd2(field: keyof Step2, val: string) {
    setS2(p => ({ ...p, [field]: val }));
    if (errors2[field]) setErrors2(p => ({ ...p, [field]: undefined }));
  }

  const today = new Date().toISOString().slice(0, 10);

  const total =
    (parseFloat(s2.hourlyRate) || 0) * (parseFloat(s2.hours) || 0) +
    (parseFloat(s2.technicalCost) || 0) +
    (parseFloat(s2.artisticCost) || 0);

  function validateStep1(): boolean {
    const e: Partial<Record<keyof Step1, string>> = {};
    if (!s1.title.trim())        e.title        = 'Required';
    if (!s1.clientName.trim())   e.clientName   = 'Required';
    if (!s1.email.trim())        e.email        = 'Required';
    else if (!/\S+@\S+\.\S+/.test(s1.email)) e.email = 'Invalid email';
    if (!s1.deliverables.trim()) e.deliverables = 'Required';
    if (!s1.deliveryDate)        e.deliveryDate = 'Required';
    else if (s1.deliveryDate <= today) e.deliveryDate = 'Must be a future date';
    setErrors1(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: Partial<Record<keyof Step2, string>> = {};
    if (!s2.hourlyRate || parseFloat(s2.hourlyRate) <= 0)   e.hourlyRate    = 'Must be greater than 0';
    if (!s2.hours      || parseFloat(s2.hours)      <= 0)   e.hours         = 'Must be greater than 0';
    if (s2.technicalCost === '' || parseFloat(s2.technicalCost) < 0) e.technicalCost = 'Must be 0 or more';
    if (s2.artisticCost  === '' || parseFloat(s2.artisticCost)  < 0) e.artisticCost  = 'Must be 0 or more';
    if (s2.revisions !== '' && (isNaN(parseInt(s2.revisions)) || parseInt(s2.revisions) < 0)) {
      e.revisions = 'Must be 0 or more';
    }
    setErrors2(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validateStep2()) return;
    setSubmitError('');
    startTransition(async () => {
      const fd = new FormData();
      fd.append('title',         s1.title);
      fd.append('clientName',    s1.clientName);
      fd.append('email',         s1.email);
      fd.append('deliverables',  s1.deliverables);
      fd.append('deliveryDate',  s1.deliveryDate);
      fd.append('hourlyRate',    s2.hourlyRate);
      fd.append('hours',         s2.hours);
      fd.append('technicalCost', s2.technicalCost);
      fd.append('artisticCost',  s2.artisticCost);
      fd.append('revisions',     s2.revisions);
      fd.append('internalNote',  s2.internalNote);

      const result = await createProject(fd);
      if (!result?.id) {
        setSubmitError('Failed to create project. Please try again.');
        return;
      }

      sessionStorage.setItem('pendingProject', JSON.stringify({
        id:           result.id,
        project_code: result.project_code,
        name:         s1.title,
        email:        s1.email,
        description:  result.description,
        amount:       total,
        status:       'Pending',
        initials:     result.initials,
        color:        result.color,
        start_date:   today,
        end_date:     s1.deliveryDate,
        expected_date: s1.deliveryDate,
        pinned:       false,
        created_at:   today,
        user_id:      '',
        revisions:    [],
        versions:     [],
        files:        [],
        disputes:     [],
        messages:     [],
      }));
      window.location.href = '/dashboard/projects';
    });
  }

  return (
    <div className="page fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 32, alignItems: 'start', maxWidth: 1200 }}>

      {/* ── LEFT: Form ── */}
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span style={{ cursor: 'pointer', color: '#4285F4', fontWeight: 600 }} onClick={() => router.push('/dashboard/projects')}>Projects</span>
          {' / '}New Project
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 2 }}>Create a New Project</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
          Step {step} of 2 — {step === 1 ? 'Project & Client' : 'Pricing & Notes'}
        </p>

        <StepBar step={step} />

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Project Title" required error={errors1.title}>
              <input style={errInp(!!errors1.title)} placeholder="e.g. Brand Reel Q2" value={s1.title} onChange={e => upd1('title', e.target.value)} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Client Name / Company" required error={errors1.clientName}>
                <ClientCombobox
                  clients={clients}
                  value={s1.clientName}
                  hasError={!!errors1.clientName}
                  onSelect={(name, email) => {
                    upd1('clientName', name);
                    if (email) upd1('email', email);
                  }}
                />
              </Field>
              <Field label="Client Email" required error={errors1.email}>
                <input style={errInp(!!errors1.email)} placeholder="client@example.com" type="email" value={s1.email} onChange={e => upd1('email', e.target.value)} />
              </Field>
            </div>

            <Field label="Deliverables Description" required error={errors1.deliverables} hint="— what is delivered exactly (qualitative)">
              <textarea
                style={{ ...errInp(!!errors1.deliverables), minHeight: 100, resize: 'vertical' }}
                placeholder="Describe exactly what will be delivered: format, length, variants, deliverable types…"
                value={s1.deliverables}
                onChange={e => upd1('deliverables', e.target.value)}
              />
            </Field>

            <Field label="Delivery Date" required error={errors1.deliveryDate} hint="— must be in the future">
              <DatePicker value={s1.deliveryDate} onChange={v => upd1('deliveryDate', v)} hasError={!!errors1.deliveryDate} />
            </Field>

            <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
              <button
                onClick={() => { if (validateStep1()) setStep(2); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Continue
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
              <button
                onClick={() => router.push('/dashboard/projects')}
                style={{ background: 'var(--card)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Hourly Rate (CAD/h)" required error={errors2.hourlyRate}>
                <NumInput value={s2.hourlyRate} onChange={v => upd2('hourlyRate', v)} placeholder="e.g. 150" prefix="$" hasError={!!errors2.hourlyRate} min={0.01} />
              </Field>
              <Field label="Estimated Hours" required error={errors2.hours} hint="— excl. artistic">
                <NumInput value={s2.hours} onChange={v => upd2('hours', v)} placeholder="e.g. 20" hasError={!!errors2.hours} min={0.01} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Technical Cost (CAD)" required error={errors2.technicalCost} hint="— licences, plugins, etc.">
                <NumInput value={s2.technicalCost} onChange={v => upd2('technicalCost', v)} placeholder="0" prefix="$" hasError={!!errors2.technicalCost} />
              </Field>
              <Field label="Artistic Cost (CAD)" required error={errors2.artisticCost} hint="— creative value, non-refundable">
                <NumInput value={s2.artisticCost} onChange={v => upd2('artisticCost', v)} placeholder="0" prefix="$" hasError={!!errors2.artisticCost} />
              </Field>
            </div>

            <Field label="Included Revisions" error={errors2.revisions} hint="— optional">
              <NumInput value={s2.revisions} onChange={v => upd2('revisions', v)} placeholder="e.g. 3" />
            </Field>

            <Field label="Internal Note" hint="— visible only to you, not in contract">
              <textarea
                style={{ ...inp, minHeight: 80, resize: 'vertical' }}
                placeholder="Personal reminders, context, client preferences…"
                value={s2.internalNote}
                onChange={e => upd2('internalNote', e.target.value)}
              />
            </Field>

            {/* Computed total */}
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Estimated Total</span>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: total > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {total > 0 ? total.toLocaleString('fr-CA', { maximumFractionDigits: 2 }) + ' $' : '—'}
              </span>
            </div>

            {submitError && <div className="error-banner">{submitError}</div>}

            <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#4285F4', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1 }}
              >
                {isPending ? 'Creating…' : <>Create Project <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></>}
              </button>
              <button
                onClick={() => setStep(1)}
                disabled={isPending}
                style={{ background: 'var(--card)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                ← Back
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Contract preview ── */}
      <div style={{ position: 'sticky', top: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Contract Preview
        </div>
        <ContractPreview s1={s1} s2={s2} />
      </div>

    </div>
  );
}
