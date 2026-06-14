'use client';
// app/page.js — Dashboard

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatCard from './components/StatCard';
import Badge from './components/Badge';
import LoadingSpinner from './components/LoadingSpinner';

const API = 'http://localhost:3001';

function SkeletonCard() {
  return (
    <div
      className="skeleton"
      style={{ height: '110px', borderRadius: '12px' }}
    />
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div className="skeleton" style={{ height: '16px', width: `${50 + i * 8}%` }} />
        </td>
      ))}
    </tr>
  );
}

function getStats(campaign) {
  const s = campaign.campaign_stats;
  if (Array.isArray(s)) return s[0] || {};
  return s || {};
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/api/dashboard/stats`);
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const thStyle = {
    padding: '12px 16px',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
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

  return (
    <div style={{ padding: '40px', maxWidth: '1100px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px' }}>
          Dashboard
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
          Welcome back. Here's what's happening with ZenX.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px',
            padding: '16px 20px',
            color: 'var(--danger)',
            fontSize: '0.875rem',
            marginBottom: '24px',
          }}
        >
          ⚠ Failed to load dashboard: {error}
        </div>
      )}

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '40px',
        }}
      >
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              title="Total Customers"
              value={data?.total_customers ?? 0}
              subtitle="Active shoppers"
              color="accent"
            />
            <StatCard
              title="Total Campaigns"
              value={data?.total_campaigns ?? 0}
              subtitle="Last 5 shown below"
              color="cyan"
            />
            <StatCard
              title="Messages Sent"
              value={data?.total_sent ?? 0}
              subtitle={`${data?.total_delivered ?? 0} delivered`}
              color="success"
            />
            <StatCard
              title="Total Clicked"
              value={data?.total_clicked ?? 0}
              subtitle={`${data?.total_opened ?? 0} opened`}
              color="danger"
            />
          </>
        )}
      </div>

      {/* Recent campaigns */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
            Recent Campaigns
          </h2>
          <Link
            href="/campaigns"
            id="view-all-campaigns-link"
            style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 500 }}
          >
            View all →
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Channel</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Sent</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Delivered</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Opened</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Clicked</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : !data?.recent_campaigns?.length ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                    No campaigns yet.{' '}
                    <Link href="/campaigns/new" id="dash-create-campaign-link" style={{ color: 'var(--accent)' }}>
                      Create your first campaign →
                    </Link>
                  </td>
                </tr>
              ) : (
                data.recent_campaigns.map((c) => {
                  const stats = getStats(c);
                  return (
                    <tr
                      key={c.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      style={{ transition: 'background 0.12s ease' }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{c.name}</td>
                      <td style={tdStyle}>
                        <Badge type="channel" label={c.channel} />
                      </td>
                      <td style={tdStyle}>
                        <Badge type="status" label={c.status} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {stats.total_sent ?? 0}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--success)' }}>
                        {stats.total_delivered ?? 0}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--cyan)' }}>
                        {stats.total_opened ?? 0}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--accent)' }}>
                        {stats.total_clicked ?? 0}
                      </td>
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
