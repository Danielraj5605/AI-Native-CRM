'use client';
// app/page.js — Dashboard

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import StatCard from './components/StatCard';
import Badge from './components/Badge';
import { SkeletonStatCard, SkeletonTableRows, Skeleton } from './components/Skeleton';
import DonutChart from './components/charts/DonutChart';
import CampaignBarChart from './components/charts/CampaignBarChart';
import InsightsPanel from './components/InsightsPanel';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const fetcher = (url) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`Server error ${r.status}`);
  return r.json();
});

function getStats(campaign) {
  const s = campaign.campaign_stats;
  if (Array.isArray(s)) return s[0] || {};
  return s || {};
}

// Generate 7-day mock trend from a total value
function makeTrend(total, days = 7) {
  if (!total) return [];
  const perDay = total / days;
  return Array.from({ length: days }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (days - 1 - i));
    return {
      day: day.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      value: Math.round(perDay * (0.6 + Math.random() * 0.8)),
    };
  });
}

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR(`${API}/api/dashboard/stats`, fetcher, {
    refreshInterval: 30000,
  });

  const thStyle = {
    padding: '12px 16px',
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    textAlign: 'left',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '14px 16px',
    fontSize: '0.875rem',
    color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  };

  // Build donut data from recent campaigns
  const channelCounts = {};
  (data?.recent_campaigns || []).forEach((c) => {
    channelCounts[c.channel] = (channelCounts[c.channel] || 0) + 1;
  });
  const CHANNEL_COLORS = {
    whatsapp: 'var(--success)',
    sms: 'var(--cyan)',
    email: 'var(--muted)',
    rcs: 'var(--accent)',
  };
  const donutData = Object.entries(channelCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: CHANNEL_COLORS[name] || 'var(--muted)',
  }));

  // Build bar chart data from recent campaigns
  const barData = (data?.recent_campaigns || []).slice(0, 5).map((c) => {
    const s = getStats(c);
    return {
      name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
      sent:      s.total_sent      || 0,
      delivered: s.total_delivered || 0,
      opened:    s.total_opened    || 0,
      clicked:   s.total_clicked   || 0,
    };
  });

  return (
    <div style={{ padding: '36px 40px', maxWidth: '1200px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Dashboard
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
          Welcome back. Here's what's happening with ZenX.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-md)', padding: '14px 18px',
          color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '24px',
        }}>
          ⚠ Failed to load dashboard: {error.message}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {isLoading ? (
          <><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /></>
        ) : (
          <>
            <div className="animate-fade-in stagger-1">
              <StatCard
                title="Total Customers"
                value={data?.total_customers ?? 0}
                subtitle="Active shoppers"
                color="accent"
                icon="👥"
                trendData={makeTrend(data?.total_customers ?? 0)}
              />
            </div>
            <div className="animate-fade-in stagger-2">
              <StatCard
                title="Total Campaigns"
                value={data?.total_campaigns ?? 0}
                subtitle="All time"
                color="cyan"
                icon="📣"
              />
            </div>
            <div className="animate-fade-in stagger-3">
              <StatCard
                title="Messages Sent"
                value={data?.total_sent ?? 0}
                subtitle={`${(data?.total_delivered ?? 0).toLocaleString('en-IN')} delivered`}
                color="success"
                icon="📤"
                trendData={makeTrend(data?.total_sent ?? 0)}
              />
            </div>
            <div className="animate-fade-in stagger-4">
              <StatCard
                title="Total Clicked"
                value={data?.total_clicked ?? 0}
                subtitle={`${(data?.total_opened ?? 0).toLocaleString('en-IN')} opened`}
                color="danger"
                icon="🔗"
                trendData={makeTrend(data?.total_clicked ?? 0)}
              />
            </div>
          </>
        )}
      </div>

      {/* Two-column row: Charts + AI Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', marginBottom: '24px', alignItems: 'start' }}>

        {/* Left: Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Campaign performance bar chart */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Campaign Performance</h2>
              {isLoading && <Skeleton width="80px" height="16px" />}
            </div>
            {isLoading
              ? <Skeleton height="220px" />
              : <CampaignBarChart data={barData} />
            }
          </div>

          {/* Channel breakdown donut */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700 }}>Channel Mix</h2>
            <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: 'var(--muted)' }}>
              Distribution of recent campaigns by channel
            </p>
            {isLoading
              ? <Skeleton height="200px" />
              : <DonutChart data={donutData} centerLabel="Campaigns" centerValue={data?.total_campaigns ?? 0} />
            }
          </div>
        </div>

        {/* Right: AI Insights */}
        <InsightsPanel />
      </div>

      {/* Recent campaigns table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Recent Campaigns
          </h2>
          <Link
            href="/campaigns"
            id="view-all-campaigns-link"
            style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}
          >
            View all →
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Segment</th>
                <th style={thStyle}>Channel</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Sent</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Delivered</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Opened</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Clicked</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonTableRows cols={8} rows={5} />
              ) : !data?.recent_campaigns?.length ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
                    No campaigns yet.{' '}
                    <Link href="/campaigns/new" id="dash-create-campaign-link" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      Create your first campaign →
                    </Link>
                  </td>
                </tr>
              ) : (
                data.recent_campaigns.map((c, idx) => {
                  const stats = getStats(c);
                  return (
                    <tr
                      key={c.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      style={{ transition: 'background 0.12s ease', animationDelay: `${idx * 40}ms` }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 600, maxWidth: '180px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {c.name}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: '0.8rem' }}>
                        {c.segments?.name || '—'}
                      </td>
                      <td style={tdStyle}><Badge type="channel" label={c.channel} /></td>
                      <td style={tdStyle}><Badge type="status" label={c.status} /></td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{stats.total_sent ?? 0}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--success)', fontWeight: 500 }}>{stats.total_delivered ?? 0}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--cyan)' }}>{stats.total_opened ?? 0}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--accent)', fontWeight: 500 }}>{stats.total_clicked ?? 0}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
