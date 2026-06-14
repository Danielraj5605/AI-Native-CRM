// app/components/StatCard.js

/**
 * Dark stat card with a colored top border.
 * @param {{ title: string, value: string|number, subtitle?: string, color: 'accent'|'cyan'|'success'|'danger' }} props
 */
export default function StatCard({ title, value, subtitle, color = 'accent' }) {
  const colorMap = {
    accent:  'var(--accent)',
    cyan:    'var(--cyan)',
    success: 'var(--success)',
    danger:  'var(--danger)',
  };

  const borderColor = colorMap[color] || colorMap.accent;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.4)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '2.2rem',
          fontWeight: 700,
          color: 'var(--text)',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value ?? '—'}
      </p>
      {subtitle && (
        <p
          style={{
            margin: 0,
            fontSize: '0.75rem',
            color: 'var(--muted)',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
