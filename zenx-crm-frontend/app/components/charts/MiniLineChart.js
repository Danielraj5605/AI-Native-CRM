'use client';
// app/components/charts/MiniLineChart.js

import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  Area,
  AreaChart,
} from 'recharts';

const CustomTooltip = ({ active, payload, label, valueLabel }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '0.78rem',
        color: 'var(--text)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <p style={{ margin: 0, color: 'var(--muted)' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontWeight: 700 }}>
        {valueLabel}: {payload[0]?.value?.toLocaleString('en-IN')}
      </p>
    </div>
  );
};

/**
 * Compact sparkline / area chart for stat cards.
 * @param {{ data: {day: string, value: number}[], color?: string, valueLabel?: string }} props
 */
export default function MiniLineChart({ data = [], color = 'var(--accent)', valueLabel = 'Value' }) {
  if (!data.length) return null;

  // Convert color to rgba for gradient
  const gradientId = `grad-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <div style={{ width: '100%', height: '60px', marginTop: '8px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip content={<CustomTooltip valueLabel={valueLabel} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
