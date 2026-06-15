'use client';
// app/campaigns/page.js

import { useState, useCallback } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonCampaignCard } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';

const API = 'http://localhost:3001';

const fetcher = (url) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`Server error ${r.status}`);
  return r.json();
});

function getStats(campaign) {
  const s = campaign.campaign_stats;
  if (Array.isArray(s)) return s[0] || {};
  return s || {};
}

function StatPill({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}>
      <span>{icon}</span>
      <span style={{ color: 'var(--muted)' }}>{label}:</span>
      <span style={{ fontWeight: 700, color: color || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
        {(value ?? 0).toLocaleString('en-IN')}
      </span>
    </div>
  );
}

function ProgressBar({ value, total, color }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="progress-bar-track" style={{ flex: 1 }}>
      <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function CampaignCard({ campaign, onSend }) {
  const stats = getStats(campaign);
  const canSend = campaign.status === 'draft' || campaign.status === 'completed';
  const sent = stats.total_sent || 0;
  const delivered = stats.total_delivered || 0;
  const opened = stats.total_opened || 0;
  const clicked = stats.total_clicked || 0;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.45)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.25)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 700, color: 'var(--text)', flex: 1, lineHeight: 1.3 }}>
          {campaign.name}
        </h3>
        <Badge type="channel" label={campaign.channel} />
      </div>

      {/* Segment + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
          Segment:{' '}
          <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>
            {campaign.segments?.name || '—'}
          </span>
        </span>
        <Badge type="status" label={campaign.status} />
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '8px', padding: '12px',
        background: 'var(--surface-2)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}>
        <StatPill icon="📤" label="Sent"      value={sent}      color="var(--text)" />
        <StatPill icon="✅" label="Delivered" value={delivered} color="var(--success)" />
        <StatPill icon="👁"  label="Opened"   value={opened}    color="var(--cyan)" />
        <StatPill icon="🔗" label="Clicked"   value={clicked}   color="var(--accent)" />
      </div>

      {/* Progress bars */}
      {sent > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--muted)' }}>
            <span style={{ width: '52px' }}>Delivery</span>
            <ProgressBar value={delivered} total={sent} color="var(--success)" />
            <span style={{ width: '36px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {sent > 0 ? Math.round((delivered / sent) * 100) : 0}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--muted)' }}>
            <span style={{ width: '52px' }}>Open</span>
            <ProgressBar value={opened} total={delivered} color="var(--cyan)" />
            <span style={{ width: '36px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {delivered > 0 ? Math.round((opened / delivered) * 100) : 0}%
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '4px' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
          {new Date(campaign.created_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
        <button
          id={`send-btn-${campaign.id}`}
          onClick={() => onSend(campaign)}
          disabled={!canSend}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px',
            background: canSend ? 'var(--accent)' : 'rgba(107,114,128,0.15)',
            border: 'none', borderRadius: 'var(--radius-md)',
            color: canSend ? '#fff' : 'var(--muted)',
            fontSize: '0.8rem', fontWeight: 600,
            cursor: canSend ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (canSend) {
              e.currentTarget.style.background = 'var(--accent-dim)';
              e.currentTarget.style.boxShadow = '0 4px 16px var(--accent-glow)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = canSend ? 'var(--accent)' : 'rgba(107,114,128,0.15)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          🚀 Send Campaign
        </button>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const { addToast } = useToast();
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [dispatching, setDispatching]     = useState(false);

  const { data: campaigns = [], error, isLoading, mutate } = useSWR(
    `${API}/api/campaigns`,
    fetcher,
    { revalidateOnFocus: false }
  );

  async function handleSendConfirmed() {
    if (!confirmTarget) return;
    const campaign = confirmTarget;
    setConfirmTarget(null);
    setDispatching(true);

    try {
      const res = await fetch(`${API}/api/campaigns/${campaign.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Send failed');
      addToast(`Dispatched to ${json.dispatched ?? 0} customers! 🚀`, 'success');
      setTimeout(() => mutate(), 2000);
    } catch (e) {
      addToast(`Failed to send: ${e.message}`, 'error');
    } finally {
      setDispatching(false);
    }
  }

  return (
    <div style={{ padding: '36px 40px', maxWidth: '1200px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Campaigns
          </h1>
          {!isLoading && !error && (
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
              {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <Link
          href="/campaigns/new"
          id="new-campaign-btn"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '10px 20px', background: 'var(--accent)',
            borderRadius: 'var(--radius-md)', color: '#fff',
            fontWeight: 600, fontSize: '0.875rem',
            transition: 'background 0.15s ease, box-shadow 0.15s ease',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.boxShadow = '0 4px 16px var(--accent-glow)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          ✨ New Campaign
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '14px 18px', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '20px' }}>
          ⚠ Failed to load campaigns: {error.message}
        </div>
      )}

      {/* Loading skeleton grid */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {[1,2,3,4,5,6].map(i => <SkeletonCampaignCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && campaigns.length === 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <EmptyState
            icon="📣"
            title="No campaigns yet"
            description="Create your first campaign in 3 steps: pick an audience with AI, write a message, and launch."
            action={
              <Link
                href="/campaigns/new"
                id="campaigns-empty-create-btn"
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: '0.9rem' }}
              >
                ✨ Create your first campaign →
              </Link>
            }
          />
        </div>
      )}

      {/* Campaign grid */}
      {!isLoading && !error && campaigns.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {campaigns.map((c, idx) => (
            <div
              key={c.id}
              className="animate-fade-in"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <CampaignCard campaign={c} onSend={(camp) => setConfirmTarget(camp)} />
            </div>
          ))}
        </div>
      )}

      {/* Confirm modal */}
      {confirmTarget && (
        <ConfirmModal
          title="Send Campaign"
          message={`Send "${confirmTarget.name}" to all customers in this segment via ${confirmTarget.channel}? This cannot be undone.`}
          confirmLabel={dispatching ? 'Sending…' : 'Send Now 🚀'}
          onConfirm={handleSendConfirmed}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
