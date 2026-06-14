'use client';
// app/campaigns/page.js

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

const API = 'http://localhost:3001';

function getStats(campaign) {
  const s = campaign.campaign_stats;
  if (Array.isArray(s)) return s[0] || {};
  return s || {};
}

function StatPill({ icon, label, value, color }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.8rem',
      }}
    >
      <span>{icon}</span>
      <span style={{ color: 'var(--muted)' }}>{label}:</span>
      <span style={{ fontWeight: 600, color: color || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
        {value ?? 0}
      </span>
    </div>
  );
}

function CampaignCard({ campaign, onSend }) {
  const stats = getStats(campaign);
  const [sending, setSending] = useState(false);

  const canSend = campaign.status === 'draft' || campaign.status === 'completed';

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)', flex: 1 }}>
          {campaign.name}
        </h3>
        <Badge type="channel" label={campaign.channel} />
      </div>

      {/* Segment + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Segment:{' '}
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>
            {campaign.segments?.name || '—'}
          </span>
        </span>
        <Badge type="status" label={campaign.status} />
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
        }}
      >
        <StatPill icon="📤" label="Sent"      value={stats.total_sent}      color="var(--text)" />
        <StatPill icon="✅" label="Delivered" value={stats.total_delivered} color="var(--success)" />
        <StatPill icon="👁" label="Opened"    value={stats.total_opened}    color="var(--cyan)" />
        <StatPill icon="🔗" label="Clicked"   value={stats.total_clicked}   color="var(--accent)" />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          {new Date(campaign.created_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
        <button
          id={`send-btn-${campaign.id}`}
          onClick={() => onSend(campaign)}
          disabled={sending || !canSend}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 18px',
            background: canSend ? 'var(--accent)' : 'rgba(107,114,128,0.2)',
            border: 'none',
            borderRadius: '8px',
            color: canSend ? '#fff' : 'var(--muted)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: canSend && !sending ? 'pointer' : 'not-allowed',
            opacity: sending ? 0.6 : 1,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (canSend && !sending) e.currentTarget.style.background = 'var(--accent-dim)';
          }}
          onMouseLeave={(e) => {
            if (canSend && !sending) e.currentTarget.style.background = 'var(--accent)';
          }}
        >
          {sending ? <LoadingSpinner size="sm" /> : '🚀'}
          {sending ? 'Sending…' : 'Send Campaign'}
        </button>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [dispatching, setDispatching]     = useState(false);
  const [toast, setToast]                 = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/campaigns`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      setCampaigns(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
      showToast(`Dispatched to ${json.dispatched ?? 0} customers!`, 'success');
      // Refresh after short delay so stats can start populating
      setTimeout(load, 2000);
    } catch (e) {
      showToast(`Failed to send: ${e.message}`, 'error');
    } finally {
      setDispatching(false);
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1100px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 4px' }}>
            Campaigns
          </h1>
          {!loading && !error && (
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
              {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <Link
          href="/campaigns/new"
          id="new-campaign-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            background: 'var(--accent)',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.875rem',
            transition: 'background 0.15s ease',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-dim)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
        >
          ✨ New Campaign
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px',
            padding: '16px 20px',
            color: 'var(--danger)',
            fontSize: '0.875rem',
          }}
        >
          ⚠ Failed to load campaigns: {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            gap: '12px',
            color: 'var(--muted)',
          }}
        >
          <LoadingSpinner size="lg" />
          <span>Loading campaigns…</span>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && (
        <>
          {campaigns.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                gap: '16px',
                color: 'var(--muted)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
              }}
            >
              <span style={{ fontSize: '2.5rem' }}>📣</span>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>No campaigns yet.</p>
              <Link
                href="/campaigns/new"
                id="campaigns-empty-create-btn"
                style={{
                  padding: '10px 20px',
                  background: 'var(--accent)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Create your first campaign →
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: '20px',
              }}
            >
              {campaigns.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  onSend={(camp) => setConfirmTarget(camp)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Confirm modal */}
      {confirmTarget && (
        <ConfirmModal
          title="Send Campaign"
          message={`Send "${confirmTarget.name}" to all customers in this segment via ${confirmTarget.channel}? This action cannot be undone.`}
          confirmLabel={dispatching ? 'Sending…' : 'Send Now'}
          onConfirm={handleSendConfirmed}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
