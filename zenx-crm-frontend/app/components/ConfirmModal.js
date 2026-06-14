'use client';
// app/components/ConfirmModal.js

/**
 * Centered confirm modal with dark backdrop.
 * @param {{ title: string, message: string, confirmLabel: string, onConfirm: () => void, onCancel: () => void }} props
 */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '32px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          animation: 'fadeInScale 0.2s ease',
        }}
      >
        <h2
          style={{
            margin: '0 0 10px',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--text)',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: '0 0 28px',
            fontSize: '0.875rem',
            color: 'var(--muted)',
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            id="confirm-modal-cancel"
            style={{
              padding: '10px 20px',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'border-color 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--muted)';
              e.currentTarget.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--muted)';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            id="confirm-modal-confirm"
            style={{
              padding: '10px 24px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'background 0.15s ease, transform 0.1s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-dim)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
