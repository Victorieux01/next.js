'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { SettingsModal, type UserProfile } from '@/app/ui/dashboard/settings-client';
import { getUserProfile } from '@/app/lib/coredon-actions';

const navItems = [
  {
    page: 'dashboard',
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    page: 'clients',
    href: '/dashboard/clients',
    label: 'Clients',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    page: 'projects',
    href: '/dashboard/projects',
    label: 'Projects',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
      </svg>
    ),
  },
  {
    page: 'shared',
    href: '/dashboard/shared',
    label: 'Shared with me',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
        <polyline points="16 6 12 2 8 6"/>
        <line x1="12" y1="2" x2="12" y2="15"/>
      </svg>
    ),
  },
  {
    page: 'history',
    href: '/dashboard/history',
    label: 'History',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    page: 'earnings',
    href: '/dashboard/earnings',
    label: 'Earnings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
];

export default function SideNav({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsUser, setSettingsUser] = useState<UserProfile | null>(null);
  // Local name tracks the sidebar display and updates immediately on save
  const [localName, setLocalName] = useState(user.name);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  async function openSettings() {
    setSettingsOpen(true);
    // If we already have a cached profile (from a previous open), show it immediately
    // then re-fetch in the background to pick up any changes made elsewhere
    if (!settingsUser) {
      const profile = await getUserProfile();
      setSettingsUser({
        name:      localName,
        email:     user.email,
        plan:      profile.plan,
        phone:     profile.phone,
        firstName: profile.firstName || localName.split(' ')[0] || '',
        lastName:  profile.lastName  || localName.split(' ').slice(1).join(' ') || '',
      });
    }
  }

  function handleSaved(updated: UserProfile) {
    setSettingsUser(updated);
    setLocalName(updated.name);
  }

  return (
    <aside id="sidebar">
      <div className="logo-block">
        <svg width="34" height="26" viewBox="0 0 34 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
          <rect x="1" y="13" width="16" height="16" rx="3" fill="#0984E3" transform="rotate(-45 1 13)"/>
          <rect x="12" y="13" width="16" height="16" rx="3" fill="#00CEC9" transform="rotate(-45 12 13)" opacity="0.9"/>
        </svg>
        <span className="logo-text">Coredon</span>
      </div>

      <nav id="nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nb ${isActive(item.href) ? 'active' : ''}`}
          >
            {item.icon}
            <span className="nb-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sb-bottom">
        <button
          onClick={openSettings}
          className="nb"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          <span className="nb-label">Settings</span>
        </button>

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 12 }}>
          <div style={{ padding: '0 12px', marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{localName}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="nb"
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="nb-label">Sign out</span>
          </button>
        </div>
      </div>

      {settingsOpen && settingsUser && (
        <SettingsModal
          user={settingsUser}
          onClose={() => setSettingsOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </aside>
  );
}
