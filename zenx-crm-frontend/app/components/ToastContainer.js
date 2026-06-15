'use client';
// app/components/ToastContainer.js

import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';

function ToastItem({ id, message, type, duration, onRemove }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(id), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onRemove]);

  function handleClose() {
    setExiting(true);
    setTimeout(() => onRemove(id), 300);
  }

  const colors = {
    success: { border: 'var(--success)', bg: 'rgba(16,185,129,0.08)', icon: '✓', iconBg: 'rgba(16,185,129,0.15)', iconColor: 'var(--success)' },
    error:   { border: 'var(--danger)',  bg: 'rgba(239,68,68,0.08)',  icon: '✕', iconBg: 'rgba(239,68,68,0.15)',  iconColor: 'var(--danger)' },
    warning: { border: 'var(--warning)', bg: 'rgba(245,158,11,0.08)', icon: '⚠', iconBg: 'rgba(245,158,11,0.15)', iconColor: 'var(--warning)' },
    info:    { border: 'var(--cyan)',    bg: 'rgba(6,182,212,0.08)',  icon: 'ℹ', iconBg: 'rgba(6,182,212,0.15)',  iconColor: 'var(--cyan)' },
  };
  const c = colors[type] || colors.info;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'var(--surface)',
        border: `1px solid var(--border)`,
        borderLeft: `4px solid ${c.border}`,
        borderRadius: 'var(--radius-md)',
        padding: '13px 16px',
        boxShadow: 'var(--shadow-md)',
        maxWidth: '380px',
        width: '100%',
        animation: exiting
          ? 'slideOutToast 0.3s ease forwards'
          : 'slideInToast 0.3s ease both',
        pointerEvents: 'auto',
        willChange: 'transform, opacity',
      }}
    >
      {/* Icon */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: c.iconBg,
          color: c.iconColor,
          fontSize: '0.72rem',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {c.icon}
      </span>

      {/* Message */}
      <p
        style={{
          margin: 0,
          fontSize: '0.855rem',
          color: 'var(--text)',
          flex: 1,
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>

      {/* Close */}
      <button
        onClick={handleClose}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: '1rem',
          padding: '2px 4px',
          lineHeight: 1,
          borderRadius: '4px',
          flexShrink: 0,
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
      >
        ×
      </button>
    </div>
  );
}

/**
 * Renders all active toasts from ToastContext in a stacked bottom-right container.
 */
export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          {...t}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
}
