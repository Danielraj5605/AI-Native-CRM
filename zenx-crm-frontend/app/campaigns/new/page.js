'use client';
// app/campaigns/new/page.js

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import CustomerPreviewTable from '../../components/CustomerPreviewTable';

const API = 'http://localhost:3001';

const EXAMPLE_QUERIES = [
  'Lapsed VIP customers',
  'New customers from Mumbai',
  'Customers who spent over ₹2000',
  'Inactive for 60+ days',
];

const CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms',      label: 'SMS' },
  { value: 'email',    label: 'Email' },
  { value: 'rcs',      label: 'RCS' },
];

const MAX_CHARS = 300;

/* ──────────────────── Shared styles ──────────────────── */
const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: '8px',
};

const errorTextStyle = {
  fontSize: '0.78rem',
  color: 'var(--danger)',
  marginTop: '6px',
  display: 'block',
};

const sectionStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '28px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const sectionTitleStyle = {
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--accent)',
  margin: 0,
  paddingBottom: '16px',
  borderBottom: '1px solid var(--border)',
};

/* ──────────────────── Component ──────────────────── */
export default function NewCampaignPage() {
  const router = useRouter();

  // Form state
  const [form, setForm] = useState({ name: '', channel: '', message_template: '' });
  const [errors, setErrors] = useState({});

  // Audience tabs
  const [activeTab, setActiveTab] = useState('ai');
  const [nlQuery, setNlQuery] = useState('');
  const [aiResult, setAiResult] = useState(null);      // {segment_id, preview_count, customers, nl_query}
  const [selectedSegment, setSelectedSegment] = useState(null); // {id, name, last_count}
  const [segments, setSegments] = useState([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);

  // AI states
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [isGeneratingMsg, setIsGeneratingMsg] = useState(false);

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'send' | 'draft'
  const [toast, setToast] = useState(null);

  const messageRef = useRef(null);

  /* Load saved segments when Browse tab opens */
  useEffect(() => {
    if (activeTab === 'browse' && segments.length === 0) {
      setSegmentsLoading(true);
      fetch(`${API}/api/segments`)
        .then((r) => r.json())
        .then((data) => setSegments(Array.isArray(data) ? data : []))
        .catch(() => setSegments([]))
        .finally(() => setSegmentsLoading(false));
    }
  }, [activeTab]);

  const showToast = (message, type = 'success') =>
    setToast({ message, type, key: Date.now() });

  /* ── Validation ── */
  function validateForSend() {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 3)
      e.name = 'Campaign name must be at least 3 characters.';
    if (!form.channel)
      e.channel = 'Please select a channel.';
    if (!selectedSegment && !aiResult)
      e.segment = 'Please select an audience (AI or Browse).';
    if (!form.message_template.trim() || form.message_template.trim().length < 10)
      e.message = 'Message must be at least 10 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateForDraft() {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 3)
      e.name = 'Campaign name must be at least 3 characters.';
    if (!form.channel)
      e.channel = 'Please select a channel.';
    if (!form.message_template.trim() || form.message_template.trim().length < 10)
      e.message = 'Message must be at least 10 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /* ── AI Segmentation ── */
  async function handleFindAudience() {
    if (!nlQuery.trim()) {
      setAiError('Please describe your audience first.');
      return;
    }
    setAiError(null);
    setAiResult(null);
    setIsLoadingAI(true);
    setSelectedSegment(null); // clear browse selection
    try {
      const res = await fetch(`${API}/api/ai/segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nl_query: nlQuery }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'AI segmentation failed');
      setAiResult(json);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setIsLoadingAI(false);
    }
  }

  /* ── AI Message Generation ── */
  async function handleGenerateMessage() {
    const description = aiResult?.nl_query || selectedSegment?.name || form.name;
    if (!description) {
      showToast('Select an audience first so AI can tailor the message.', 'error');
      return;
    }
    setIsGeneratingMsg(true);
    try {
      const res = await fetch(`${API}/api/ai/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment_description: description,
          channel: form.channel || 'whatsapp',
          brand_name: 'ZenX',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');
      setForm((f) => ({ ...f, message_template: json.message }));
      if (messageRef.current) messageRef.current.focus();
    } catch (e) {
      showToast(`AI error: ${e.message}`, 'error');
    } finally {
      setIsGeneratingMsg(false);
    }
  }

  /* ── Campaign submission ── */
  async function submitCampaign(action) {
    const segId = selectedSegment?.id || aiResult?.segment_id;
    const isAiGen = !!aiResult;
    setIsSubmitting(true);
    try {
      // 1. Create campaign
      const createRes = await fetch(`${API}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          segment_id: segId,
          channel: form.channel,
          message_template: form.message_template,
          ai_generated: isAiGen,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || 'Failed to create campaign');

      const campaignId = created.campaign?.id || created.id;

      if (action === 'send') {
        // 2. Send immediately
        const sendRes = await fetch(`${API}/api/campaigns/${campaignId}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const sendData = await sendRes.json();
        if (!sendRes.ok) throw new Error(sendData.error || 'Send failed');
        showToast(`Campaign sent to ${sendData.dispatched ?? 0} customers!`, 'success');
      } else {
        showToast('Campaign saved as draft.', 'success');
      }

      setTimeout(() => router.push('/campaigns'), 1500);
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
      setIsSubmitting(false);
    }
  }

  function handleSendClick() {
    if (!validateForSend()) return;
    setConfirmAction('send');
    setShowConfirm(true);
  }

  function handleDraftClick() {
    if (!validateForDraft()) return;
    setConfirmAction('draft');
    setShowConfirm(true);
  }

  async function handleConfirmed() {
    setShowConfirm(false);
    await submitCampaign(confirmAction);
  }

  /* ── Derived values ── */
  const previewCount =
    aiResult?.preview_count ?? selectedSegment?.last_count ?? 0;
  const previewMessage = (form.message_template || '').replace(/\{name\}/g, 'Priya');
  const charCount = form.message_template.length;

  const effectiveSegment = selectedSegment
    ? selectedSegment.name
    : aiResult?.nl_query
    ? `AI: ${aiResult.nl_query}`
    : null;

  const confirmMessage =
    confirmAction === 'send'
      ? `Send "${form.name}" to ${previewCount} customer${previewCount !== 1 ? 's' : ''} via ${form.channel || 'the selected channel'}?`
      : `Save "${form.name}" as a draft?`;

  /* ──────────────────── Render ──────────────────── */
  return (
    <div style={{ padding: '40px', maxWidth: '760px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px' }}>
          Create Campaign
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
          Reach the right people with the right message.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ─── SECTION 1: Campaign Basics ─── */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>① Campaign Basics</p>

          {/* Name */}
          <div>
            <label htmlFor="campaign-name" style={labelStyle}>
              Campaign Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="campaign-name"
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                if (errors.name) setErrors((er) => ({ ...er, name: null }));
              }}
              placeholder="e.g. Re-engage VIP Customers"
              style={{
                borderColor: errors.name ? 'var(--danger)' : undefined,
              }}
            />
            {errors.name && <span style={errorTextStyle}>{errors.name}</span>}
          </div>

          {/* Channel */}
          <div>
            <label htmlFor="campaign-channel" style={labelStyle}>
              Channel <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select
              id="campaign-channel"
              value={form.channel}
              onChange={(e) => {
                setForm((f) => ({ ...f, channel: e.target.value }));
                if (errors.channel) setErrors((er) => ({ ...er, channel: null }));
              }}
              style={{
                borderColor: errors.channel ? 'var(--danger)' : undefined,
              }}
            >
              <option value="">Select a channel…</option>
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.channel && <span style={errorTextStyle}>{errors.channel}</span>}
          </div>
        </div>

        {/* ─── SECTION 2: Choose Audience ─── */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>② Choose Audience</p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)' }}>
            {[
              { key: 'ai',     label: '✨ Ask AI' },
              { key: 'browse', label: '📋 Browse Segments' },
            ].map((tab) => (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 20px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.key
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
                  color: activeTab === tab.key ? 'var(--accent)' : 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '-1px',
                  transition: 'color 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* AI Tab */}
          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="nl-query" style={labelStyle}>
                  Describe your audience in plain English
                </label>
                <textarea
                  id="nl-query"
                  value={nlQuery}
                  onChange={(e) => {
                    setNlQuery(e.target.value);
                    setAiError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleFindAudience();
                    }
                  }}
                  placeholder="e.g. VIP customers who haven't ordered in 60 days"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
                {aiError && <span style={errorTextStyle}>{aiError}</span>}
              </div>

              {/* Example pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    id={`example-${q.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => {
                      setNlQuery(q);
                      setAiError(null);
                    }}
                    style={{
                      padding: '5px 12px',
                      background: 'rgba(139,92,246,0.1)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      borderRadius: '999px',
                      color: 'var(--accent)',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.1)')}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Find Audience button */}
              <button
                id="find-audience-btn"
                onClick={handleFindAudience}
                disabled={isLoadingAI || !nlQuery.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px',
                  background: isLoadingAI || !nlQuery.trim()
                    ? 'rgba(139,92,246,0.4)'
                    : 'var(--accent)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: isLoadingAI || !nlQuery.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isLoadingAI && nlQuery.trim())
                    e.currentTarget.style.background = 'var(--accent-dim)';
                }}
                onMouseLeave={(e) => {
                  if (!isLoadingAI && nlQuery.trim())
                    e.currentTarget.style.background = 'var(--accent)';
                }}
              >
                {isLoadingAI ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Searching…
                  </>
                ) : (
                  'Find Audience →'
                )}
              </button>

              {/* AI Result */}
              {aiResult && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    animation: 'fadeIn 0.3s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: '8px',
                    }}
                  >
                    <span style={{ color: 'var(--success)' }}>✅</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
                      Found{' '}
                      <strong style={{ color: 'var(--success)' }}>
                        {aiResult.preview_count}
                      </strong>{' '}
                      customer{aiResult.preview_count !== 1 ? 's' : ''} matching your query
                    </span>
                  </div>

                  <CustomerPreviewTable customers={aiResult.customers || []} />

                  {!selectedSegment && (
                    <button
                      id="use-audience-btn"
                      onClick={() => {
                        setSelectedSegment({
                          id: aiResult.segment_id,
                          name: aiResult.nl_query,
                          last_count: aiResult.preview_count,
                        });
                        if (errors.segment) setErrors((er) => ({ ...er, segment: null }));
                      }}
                      style={{
                        padding: '10px 20px',
                        background: 'var(--success)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'opacity 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      ✓ Use This Audience
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Browse Segments Tab */}
          {activeTab === 'browse' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {segmentsLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                  <LoadingSpinner size="md" />
                </div>
              )}
              {!segmentsLoading && segments.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', padding: '24px 0' }}>
                  No saved segments yet. Use the AI tab to create one.
                </p>
              )}
              {segments.map((seg) => {
                const isSelected = selectedSegment?.id === seg.id;
                return (
                  <div
                    key={seg.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      background: isSelected ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
                      border: isSelected
                        ? '1px solid rgba(139,92,246,0.5)'
                        : '1px solid var(--border)',
                      borderRadius: '10px',
                      gap: '12px',
                      transition: 'border-color 0.15s ease, background 0.15s ease',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>
                        {seg.name}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {seg.last_count ?? 0} customer{seg.last_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      id={`select-segment-${seg.id}`}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSegment(null);
                        } else {
                          setSelectedSegment(seg);
                          setAiResult(null); // clear AI result
                          if (errors.segment) setErrors((er) => ({ ...er, segment: null }));
                        }
                      }}
                      style={{
                        padding: '7px 16px',
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: '6px',
                        color: isSelected ? '#fff' : 'var(--muted)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected ? '✓ Selected' : 'Select'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected audience indicator */}
          {selectedSegment && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: 'rgba(139,92,246,0.1)',
                border: '1px solid rgba(139,92,246,0.4)',
                borderRadius: '8px',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              <span style={{ color: 'var(--accent)', fontSize: '1rem' }}>✨</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text)', flex: 1 }}>
                Audience selected:{' '}
                <strong style={{ color: 'var(--accent)' }}>{selectedSegment.name}</strong>
                {' '}— {selectedSegment.last_count ?? 0} customer{selectedSegment.last_count !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => { setSelectedSegment(null); setAiResult(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  padding: '2px',
                }}
              >
                ✕
              </button>
            </div>
          )}

          {errors.segment && <span style={errorTextStyle}>{errors.segment}</span>}
        </div>

        {/* ─── SECTION 3: Message ─── */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>③ Message Template</p>

          {/* Generate with AI */}
          <button
            id="generate-msg-btn"
            onClick={handleGenerateMessage}
            disabled={isGeneratingMsg}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              alignSelf: 'flex-start',
              padding: '8px 16px',
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.4)',
              borderRadius: '8px',
              color: 'var(--accent)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: isGeneratingMsg ? 'not-allowed' : 'pointer',
              opacity: isGeneratingMsg ? 0.7 : 1,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isGeneratingMsg) e.currentTarget.style.background = 'rgba(139,92,246,0.22)';
            }}
            onMouseLeave={(e) => {
              if (!isGeneratingMsg) e.currentTarget.style.background = 'rgba(139,92,246,0.12)';
            }}
          >
            {isGeneratingMsg ? <LoadingSpinner size="sm" /> : '✨'}
            {isGeneratingMsg ? 'Generating…' : 'Generate with AI'}
          </button>

          {/* Message textarea */}
          <div>
            <label htmlFor="message-template" style={labelStyle}>
              Message Template <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea
              id="message-template"
              ref={messageRef}
              value={form.message_template}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setForm((f) => ({ ...f, message_template: e.target.value }));
                  if (errors.message) setErrors((er) => ({ ...er, message: null }));
                }
              }}
              placeholder="Hey {name}, we have something special for you…"
              rows={5}
              style={{
                resize: 'vertical',
                borderColor: errors.message ? 'var(--danger)' : undefined,
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              {errors.message ? (
                <span style={errorTextStyle}>{errors.message}</span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Use <code style={{ color: 'var(--accent)' }}>{'{name}'}</code> for personalization
                </span>
              )}
              <span
                style={{
                  fontSize: '0.75rem',
                  color: charCount > MAX_CHARS * 0.9 ? 'var(--warning)' : 'var(--muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {charCount} / {MAX_CHARS}
              </span>
            </div>
          </div>

          {/* Live preview */}
          {form.message_template && (
            <div
              style={{
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Preview
              </p>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.6 }}>
                {previewMessage}
              </p>
            </div>
          )}
        </div>

        {/* ─── SECTION 4: Actions ─── */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <button
            id="save-draft-btn"
            onClick={handleDraftClick}
            disabled={isSubmitting}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--muted)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
              transition: 'border-color 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.borderColor = 'var(--muted)';
                e.currentTarget.style.color = 'var(--text)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--muted)';
              }
            }}
          >
            Save as Draft
          </button>

          <button
            id="create-send-btn"
            onClick={handleSendClick}
            disabled={isSubmitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              background: isSubmitting ? 'rgba(139,92,246,0.5)' : 'var(--accent)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) e.currentTarget.style.background = 'var(--accent-dim)';
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) e.currentTarget.style.background = 'var(--accent)';
            }}
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : null}
            {isSubmitting ? 'Processing…' : 'Create & Send →'}
          </button>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <ConfirmModal
          title={confirmAction === 'send' ? 'Send Campaign?' : 'Save as Draft?'}
          message={confirmMessage}
          confirmLabel={confirmAction === 'send' ? 'Send Now' : 'Save Draft'}
          onConfirm={handleConfirmed}
          onCancel={() => setShowConfirm(false)}
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
