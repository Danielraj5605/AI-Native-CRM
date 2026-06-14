// app/components/LoadingSpinner.js

const SIZE_MAP = {
  sm: 16,
  md: 24,
  lg: 40,
};

/**
 * Small spinning circle in accent color.
 * @param {{ size?: 'sm'|'md'|'lg' }} props
 */
export default function LoadingSpinner({ size = 'md' }) {
  const px = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <span
      aria-label="Loading"
      role="status"
      style={{
        display: 'inline-block',
        width: `${px}px`,
        height: `${px}px`,
        border: `${Math.max(2, Math.round(px / 8))}px solid rgba(139,92,246,0.25)`,
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}
