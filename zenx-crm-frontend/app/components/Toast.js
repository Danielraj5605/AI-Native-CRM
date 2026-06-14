'use client';
// app/components/Toast.js

import { useEffect } from 'react';

/**
 * Fixed bottom-right toast. Auto-dismisses after 3 seconds.
 * @param {{ message: string, type: 'success'|'error', onClose: () => void }} props
 */
export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';
  const borderColor = isSuccess ? 'var(--success)' : 'var(--danger)';
  const iconColor = isSuccess ? 'var(--success)' : 'var(--danger)';
  const icon = isSuccess ? '✓' : '✕';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'var(--surface)',
        border: `1px solid var(--border)`,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: '10px',
        padding: '14px 18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        maxWidth: '360px',
        animation: 'slideInToast 0.25s ease',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: isSuccess ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          color: iconColor,
          fontSize: '0.75rem',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <p
        style={{
          margin: 0,
          fontSize: '0.875rem',
          color: 'var(--text)',
          flex: 1,
        }}
      >
        {message}
      </p>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: '1rem',
          padding: '0 0 0 4px',
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label="Close toast"
      >
        ×
      </button>
    </div>
  );
}
