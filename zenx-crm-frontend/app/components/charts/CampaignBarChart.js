'use client';
// app/components/charts/CampaignBarChart.js

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '0.78rem',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--text)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ margin: '2px 0', color: p.fill }}>
          {p.name}: <strong>{p.value.toLocaleString('en-IN')}</strong>
        </p>
      ))}
    </div>
  );
};

/**
 * Stacked bar chart for campaign performance.
 * @param {{ data: {name: string, sent: number, delivered: number, opened: number, clicked: number}[] }} props
 */
export default function CampaignBarChart({ data = [] }) {
  if (!data.length) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No campaign data yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barSize={16} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: 'var(--muted)' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend
          wrapperStyle={{ fontSize: '0.76rem', color: 'var(--muted)', paddingTop: '12px' }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="sent"      name="Sent"      fill="var(--muted)"   radius={[3,3,0,0]} />
        <Bar dataKey="delivered" name="Delivered" fill="var(--success)" radius={[3,3,0,0]} />
        <Bar dataKey="opened"    name="Opened"    fill="var(--cyan)"    radius={[3,3,0,0]} />
        <Bar dataKey="clicked"   name="Clicked"   fill="var(--accent)"  radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
