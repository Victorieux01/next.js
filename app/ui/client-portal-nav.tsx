'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ClientPortalNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  // pathname is /client/[projectId] — segment index 2 is the id
  const projectId = pathname.split('/')[2] ?? '';

  const items = [
    {
      label: 'Project Overview',
      href: `/client/${projectId}?token=${token}`,
      active: true,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
  ];

  return (
    <nav id="nav">
      <div style={{
        padding: '8px 14px',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
      }}>
        Client Portal
      </div>
      {items.map(item => (
        <Link
          key={item.label}
          href={item.href}
          className={`nb${item.active ? ' active' : ''}`}
        >
          {item.icon}
          <span className="nb-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
