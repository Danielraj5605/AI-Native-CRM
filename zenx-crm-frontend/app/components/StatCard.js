'use client';
// app/components/StatCard.js

import { useCountUp } from '../hooks/useCountUp';
import MiniLineChart from './charts/MiniLineChart';

const COLOR_MAP = {
  accent:  { main: 'var(--accent)',  glow: 'var(--accent-glow)' },
  cyan:    { main: 'var(--cyan)',    glow: 'var(--cyan-glow)' },
  success: { main: 'var(--success)', glow: 'var(--success-glow)' },
  danger:  { main: 'var(--danger)',  glow: 'var(--danger-glow)' },
  warning: { main: 'var(--warning)', glow: 'var(--warning-glow)' },
};

/**
 * Premium stat card with count-up animation and optional mini sparkline.
 * @param {{ title: string, value: number, subtitle?: string, color?: string, trendData?: {day:string,value:number}[], icon?: string }} props
 */
export default function StatCard({ title, value = 0, subtitle, color = 'accent', trendData, icon }) {
  const animated = useCountUp(value, 900, value > 0);
  const c = COLOR_MAP[color] || COLOR_MAP.accent;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${c.main}`,
        borderRadius: 'var(--radius-lg)',
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px ${c.main}44`;
        e.currentTarget.style.borderColor = c.main;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '80px',
          height: '80px',
          background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          {title}
        </p>
        {icon && <span style={{ fontSize: '1.1rem', opacity: 0.8 }}>{icon}</span>}
      </div>

      {/* Value */}
      <p
        style={{
          margin: 0,
          fontSize: '2.4rem',
          fontWeight: 800,
          color: 'var(--text)',
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}
      >
        {animated.toLocaleString('en-IN')}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--muted)' }}>
          {subtitle}
        </p>
      )}

      {/* Sparkline */}
      {trendData && trendData.length > 0 && (
        <MiniLineChart data={trendData} color={c.main} valueLabel={title} />
      )}
    </div>
  );
}
