'use client';
// app/components/InsightsPanel.js

import { useState, useEffect } from 'react';
import { Skeleton, SkeletonText } from './Skeleton';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const LEVEL_COLOR = {
  high:   'var(--danger)',
  medium: 'var(--warning)',
  low:    'var(--success)',
};

const IMPACT_COLOR = {
  high:   { bg: 'rgba(139,92,246,0.12)', color: 'var(--accent)', border: 'rgba(139,92,246,0.3)' },
  medium: { bg: 'rgba(6,182,212,0.1)',   color: 'var(--cyan)',   border: 'rgba(6,182,212,0.3)' },
};

function ScoreRing({ score }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div style={{ position: 'relative', width: '110px', height: '110px' }}>
      <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx="55" cy="55" r={radius} fill="none" stroke="var(--surface-2)" strokeWidth="9" />
        {/* Progress */}
        <circle
          cx="55" cy="55" r={radius}
          fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.25,0.46,0.45,0.94)', animation: 'drawCircle 1.2s ease both' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</span>
      </div>
    </div>
  );
}

export default function InsightsPanel() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  async function fetchInsights() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/ai/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load insights');
      setInsights(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
      className="animate-fade-in"
    >
      {/* Header */}
      <div
        style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, transparent 60%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>🧠</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>
              AI Insights
            </h2>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--muted)' }}>
              Powered by Gemini · {insights?.cached ? 'Cached' : 'Live'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          title="Refresh insights"
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--muted)',
            cursor: loading ? 'not-allowed' : 'pointer',
            padding: '5px 8px',
            fontSize: '0.8rem',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
        >
          {loading ? '⟳' : '↺'} Refresh
        </button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Loading state */}
        {loading && !insights && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <Skeleton width="110px" height="110px" radius="50%" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                <Skeleton height="14px" width="60%" />
                <Skeleton height="12px" width="80%" />
                <Skeleton height="12px" width="70%" />
              </div>
            </div>
            <SkeletonText lines={3} />
            <SkeletonText lines={2} lastLineWidth="50%" />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: '0 0 12px' }}>⚠ {error}</p>
            <button
              onClick={fetchInsights}
              style={{ padding: '6px 16px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Insights content */}
        {insights && !loading && (
          <>
            {/* Health Score + Churn Risk row */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <ScoreRing score={insights.health_score?.score ?? 0} />
              <div style={{ flex: 1, minWidth: '200px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
                  {insights.health_score?.trend === 'up' ? '📈' : insights.health_score?.trend === 'down' ? '📉' : '➡️'}{' '}
                  CRM Health
                </p>
                <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                  {insights.health_score?.summary}
                </p>
                {/* Churn risk pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: `${LEVEL_COLOR[insights.churn_risk?.level] || 'var(--muted)'}22`,
                      color: LEVEL_COLOR[insights.churn_risk?.level] || 'var(--muted)',
                      border: `1px solid ${LEVEL_COLOR[insights.churn_risk?.level] || 'var(--muted)'}44`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {insights.churn_risk?.level ?? '—'} churn risk
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                    {insights.churn_risk?.count ?? 0} customers at risk ({insights.churn_risk?.percentage ?? 0}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Next Best Action */}
            {insights.next_best_action && (
              <div
                style={{
                  padding: '14px 16px',
                  background: 'var(--accent-glow)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🎯</span>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>
                    Next Best Action: {insights.next_best_action.action}
                  </p>
                  <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                    {insights.next_best_action.description}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--muted)' }}>
                    Target: {insights.next_best_action.target_segment} · ~{(insights.next_best_action.estimated_reach || 0).toLocaleString('en-IN')} customers
                  </p>
                </div>
              </div>
            )}

            {/* LTV Insight */}
            {insights.ltv_insight && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem' }}>💰</span>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                    Avg LTV: ₹{(insights.ltv_insight.avg_ltv || 0).toLocaleString('en-IN')} · Top: {insights.ltv_insight.top_segment}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)' }}>
                    {insights.ltv_insight.ltv_growth_tip}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Wins - expandable */}
            {insights.quick_wins?.length > 0 && (
              <div>
                <button
                  onClick={() => setExpanded((e) => !e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: expanded ? '12px' : 0,
                  }}
                >
                  ⚡ Quick Wins ({insights.quick_wins.length})
                  <span style={{ fontSize: '0.7rem' }}>{expanded ? '▲' : '▼'}</span>
                </button>

                {expanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
                    {insights.quick_wins.map((win, i) => {
                      const imp = IMPACT_COLOR[win.impact] || IMPACT_COLOR.medium;
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            padding: '10px 12px',
                            background: imp.bg,
                            border: `1px solid ${imp.border}`,
                            borderRadius: 'var(--radius-md)',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: imp.color,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          >
                            {win.impact}
                          </span>
                          <div>
                            <p style={{ margin: '0 0 2px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{win.title}</p>
                            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--muted)' }}>{win.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
