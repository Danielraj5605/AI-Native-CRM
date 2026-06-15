'use client';
// app/components/Sidebar.js

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';

const NAV = [
  { label: 'Dashboard',    href: '/',              icon: '📊' },
  { label: 'Customers',    href: '/customers',     icon: '👥' },
  { label: 'Campaigns',    href: '/campaigns',     icon: '📣' },
  { label: 'New Campaign', href: '/campaigns/new', icon: '✨', accent: true },
];

function NavLink({ label, href, icon, accent, isActive, onClose }) {
  const [hovered, setHovered] = useState(false);

  const bg = isActive
    ? 'var(--accent)'
    : hovered
    ? accent
      ? 'rgba(139,92,246,0.18)'
      : 'rgba(255,255,255,0.05)'
    : accent
    ? 'rgba(139,92,246,0.08)'
    : 'transparent';

  const color = isActive ? '#fff' : hovered ? 'var(--text)' : 'var(--muted)';

  return (
    <Link
      href={href}
      id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={onClose}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.875rem',
        fontWeight: isActive ? 600 : 500,
        textDecoration: 'none',
        transition: 'background 0.15s ease, color 0.15s ease',
        color,
        background: bg,
        border: accent && !isActive ? '1px solid rgba(139,92,246,0.2)' : '1px solid transparent',
        marginTop: accent ? '8px' : 0,
      }}
    >
      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {isActive && (
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)',
            flexShrink: 0,
          }}
        />
      )}
    </Link>
  );
}

function SidebarContent({ pathname, onClose }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '20px 14px',
        gap: '4px',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '0 8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--cyan) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.04em',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            zenx.
          </span>
          <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            CRM Platform
          </p>
        </div>

        {/* Mobile close */}
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
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {NAV.map(({ label, href, icon, accent }) => {
          // A route is active if it matches exactly OR the pathname starts with it,
          // BUT only if no other more-specific nav item also matches (to avoid
          // highlighting both /campaigns AND /campaigns/new at the same time).
          const exactOrPrefix = pathname === href || (href !== '/' && pathname?.startsWith(href));
          const moreSpecificMatch = NAV.some(
            (other) =>
              other.href !== href &&
              other.href.startsWith(href) &&
              pathname?.startsWith(other.href)
          );
          const isActive = exactOrPrefix && !moreSpecificMatch;
          return (
            <NavLink
              key={href}
              label={label}
              href={href}
              icon={icon}
              accent={accent}
              isActive={isActive}
              onClose={onClose}
            />
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Theme toggle */}
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: '0.78rem',
            color: 'var(--muted)',
            fontFamily: 'inherit',
            fontWeight: 500,
            transition: 'all 0.15s ease',
            width: '100%',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-hover)';
            e.currentTarget.style.color = 'var(--text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--muted)';
          }}
        >
          <span style={{ fontSize: '1rem' }}>{isDark ? '☀️' : '🌙'}</span>
          <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
        </button>

        {/* Branding */}
        <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.5, padding: '0 4px' }}>
          ZenX CRM v2.0 · AI-native marketing
        </p>
      </div>
    </div>
  );
}

/**
 * Sidebar with responsive mobile drawer and dark/light theme toggle.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarBase = {
    width: 'var(--sidebar-w, 224px)',
    flexShrink: 0,
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 100,
    overflowY: 'auto',
    transition: 'background 0.25s ease, border-color 0.25s ease',
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside id="desktop-sidebar" style={sidebarBase} className="hide-on-mobile">
        <SidebarContent pathname={pathname} onClose={null} />
      </aside>

      {/* Mobile hamburger */}
      <button
        id="hamburger-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="show-on-mobile"
        style={{
          display: 'none',
          position: 'fixed',
          top: '12px',
          left: '12px',
          zIndex: 200,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 10px',
          cursor: 'pointer',
          color: 'var(--text)',
          fontSize: '1.1rem',
          lineHeight: 1,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        ☰
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 150,
            backdropFilter: 'blur(6px)',
          }}
          className="show-on-mobile"
        />
      )}

      {/* Mobile drawer */}
      <aside
        id="mobile-sidebar"
        style={{
          ...sidebarBase,
          display: 'none',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)',
          zIndex: 160,
        }}
        className="show-on-mobile"
      >
        <SidebarContent pathname={pathname} onClose={() => setMobileOpen(false)} />
      </aside>
    </>
  );
}
