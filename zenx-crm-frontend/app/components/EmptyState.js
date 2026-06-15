// app/components/EmptyState.js

/**
 * Beautiful illustrated empty state with optional CTA.
 * @param {{ icon: string, title: string, description: string, action?: React.ReactNode }} props
 */
export default function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
        gap: '16px',
      }}
    >
      {/* Floating icon with glow ring */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8px',
        }}
      >
        {/* Glow ring */}
        <div
          style={{
            position: 'absolute',
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
            animation: 'float 3s ease-in-out infinite',
          }}
        />
        {/* Icon container */}
        <div
          style={{
            width: '80px',
            height: '80px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.2rem',
            animation: 'float 3s ease-in-out infinite',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }}
        >
          {icon}
        </div>
      </div>

      {/* Text */}
      <div style={{ maxWidth: '340px' }}>
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--text)',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '0.875rem',
            color: 'var(--muted)',
            lineHeight: 1.65,
          }}
        >
          {description}
        </p>
      </div>

      {/* CTA */}
      {action && (
        <div style={{ marginTop: '8px' }}>
          {action}
        </div>
      )}
    </div>
  );
}
