// app/components/Skeleton.js

/**
 * Generic shimmer skeleton primitive.
 * @param {{ width?: string, height?: string, radius?: string, className?: string, style?: object }} props
 */
export function Skeleton({ width = '100%', height = '16px', radius = '8px', className = '', style = {} }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: radius, flexShrink: 0, ...style }}
    />
  );
}

/**
 * Multi-line text skeleton.
 * @param {{ lines?: number, lastLineWidth?: string }} props
 */
export function SkeletonText({ lines = 3, lastLineWidth = '60%' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="13px"
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

/**
 * Dashboard stat card skeleton.
 */
export function SkeletonStatCard() {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderTop: '3px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <Skeleton height="11px" width="45%" />
      <Skeleton height="36px" width="55%" />
      <Skeleton height="11px" width="35%" />
    </div>
  );
}

/**
 * Table row skeleton — shows N shimmer rows.
 * @param {{ cols?: number, rows?: number }} props
 */
export function SkeletonTableRows({ cols = 7, rows = 5 }) {
  const widths = ['55%', '50%', '40%', '35%', '45%', '40%', '30%'];
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri}>
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} style={{ padding: '16px' }}>
              <Skeleton height="14px" width={widths[ci % widths.length]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Campaign card skeleton.
 */
export function SkeletonCampaignCard() {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton height="18px" width="55%" />
        <Skeleton height="22px" width="70px" radius="999px" />
      </div>
      <Skeleton height="14px" width="40%" />
      <div style={{ display: 'flex', gap: '12px' }}>
        {[1,2,3,4].map(i => <Skeleton key={i} height="32px" width="70px" radius="8px" />)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton height="14px" width="30%" />
        <Skeleton height="34px" width="120px" radius="8px" />
      </div>
    </div>
  );
}
