'use client';
// app/components/Sidebar.js

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { label: 'Dashboard',     href: '/',              icon: '📊' },
  { label: 'Customers',     href: '/customers',     icon: '👥' },
  { label: 'Campaigns',     href: '/campaigns',     icon: '📣' },
  { label: 'New Campaign',  href: '/campaigns/new', icon: '✨', accent: true },
];

function SidebarContent({ pathname, onClose }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '24px 16px',
        gap: '8px',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '0 8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--accent)',
            letterSpacing: '-0.04em',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          zenx.
        </span>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            id="sidebar-close-btn"
            aria-label="Close menu"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {NAV.map(({ label, href, icon, accent }) => {
          const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href));
          const isNewCampaign = accent;

          const base = {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'background 0.15s ease, color 0.15s ease',
            color: isActive ? '#fff' : 'var(--muted)',
            background: isActive
              ? 'var(--accent)'
              : isNewCampaign
              ? 'rgba(139,92,246,0.12)'
              : 'transparent',
            border: isNewCampaign && !isActive ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
            marginTop: isNewCampaign ? '8px' : 0,
          };

          return (
            <Link
              key={href}
              href={href}
              id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={onClose}
              style={base}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = 'var(--text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = isNewCampaign
                    ? 'rgba(139,92,246,0.12)'
                    : 'transparent';
                  e.currentTarget.style.color = 'var(--muted)';
                }
              }}
            >
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 8px 0', borderTop: '1px solid var(--border)' }}>
        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          ZenX CRM
          <br />
          AI-native marketing
        </p>
      </div>
    </div>
  );
}

/**
 * Sidebar with responsive mobile drawer.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarStyles = {
    width: '220px',
    flexShrink: 0,
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 100,
    overflowY: 'auto',
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        id="desktop-sidebar"
        style={{
          ...sidebarStyles,
          display: 'block',
        }}
        className="hide-on-mobile"
      >
        <SidebarContent pathname={pathname} onClose={null} />
      </aside>

      {/* Mobile hamburger */}
      <button
        id="hamburger-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="show-on-mobile"
        style={{
          display: 'none',
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 200,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px 10px',
          cursor: 'pointer',
          color: 'var(--text)',
          fontSize: '1.1rem',
          lineHeight: 1,
        }}
      >
        ☰
      </button>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 150,
            backdropFilter: 'blur(4px)',
          }}
          className="show-on-mobile"
        />
      )}

      {/* Mobile drawer panel */}
      <aside
        id="mobile-sidebar"
        style={{
          ...sidebarStyles,
          display: 'none',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          zIndex: 160,
        }}
        className="show-on-mobile"
      >
        <SidebarContent pathname={pathname} onClose={() => setMobileOpen(false)} />
      </aside>
    </>
  );
}
