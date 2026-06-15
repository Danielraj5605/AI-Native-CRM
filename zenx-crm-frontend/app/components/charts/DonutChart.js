'use client';
// app/components/charts/DonutChart.js

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '0.78rem',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <p style={{ margin: 0, color: 'var(--muted)' }}>{d.name}</p>
      <p style={{ margin: '2px 0 0', fontWeight: 700, color: d.payload.fill }}>
        {d.value.toLocaleString('en-IN')} ({d.payload.percent}%)
      </p>
    </div>
  );
};

const CustomLegend = ({ payload }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
    {payload.map((entry) => (
      <div key={entry.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color, display: 'inline-block' }} />
        <span style={{ fontSize: '0.76rem', color: 'var(--muted)', fontWeight: 500 }}>
          {entry.value}
        </span>
      </div>
    ))}
  </div>
);

/**
 * Donut chart with center label.
 * @param {{ data: {name: string, value: number, color: string}[], centerLabel?: string, centerValue?: string|number }} props
 */
export default function DonutChart({ data = [], centerLabel = '', centerValue = '' }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  const enriched = data.map((d) => ({
    ...d,
    percent: total > 0 ? Math.round((d.value / total) * 100) : 0,
  }));

  if (!total) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No data yet</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={enriched}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {enriched.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -56%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
          {centerValue || total.toLocaleString('en-IN')}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {centerLabel || 'Total'}
        </p>
      </div>
    </div>
  );
}
