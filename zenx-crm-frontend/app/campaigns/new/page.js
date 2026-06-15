'use client';
// app/campaigns/new/page.js

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmModal from '../../components/ConfirmModal';
import CustomerPreviewTable from '../../components/CustomerPreviewTable';
import { useToast } from '../../context/ToastContext';

const API = 'http://localhost:3001';

const fetcher = (url) => fetch(url).then((r) => r.json());

const EXAMPLE_QUERIES = [
  'Lapsed VIP customers',
  'New customers from Mumbai',
  'Customers who spent over ₹2000',
  'Inactive for 60+ days',
  'Regular customers from Delhi',
];

const CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬', maxLen: 300 },
  { value: 'sms',      label: 'SMS',      icon: '📱', maxLen: 160 },
  { value: 'email',    label: 'Email',    icon: '✉️',  maxLen: 500 },
  { value: 'rcs',      label: 'RCS',      icon: '✨',  maxLen: 400 },
];

const labelStyle = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: '8px',
};

const errorTextStyle = {
  fontSize: '0.76rem',
  color: 'var(--danger)',
  marginTop: '6px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

const sectionStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '26px',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
};

const sectionTitleStyle = {
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--accent)',
  margin: 0,
  paddingBottom: '14px',
  borderBottom: '1px solid var(--border)',
};

export default function NewCampaignPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [form, setForm] = useState({ name: '', channel: '', message_template: '' });
  const [errors, setErrors] = useState({});

  const [activeTab, setActiveTab] = useState('ai');
  const [nlQuery, setNlQuery] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);

  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [isGeneratingMsg, setIsGeneratingMsg] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const messageRef = useRef(null);

  const { data: segments = [], isLoading: segmentsLoading } = useSWR(
    activeTab === 'browse' ? `${API}/api/segments` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const selectedChannel = CHANNELS.find((c) => c.value === form.channel);
  const MAX_CHARS = selectedChannel?.maxLen ?? 300;

  /* ── Validation ── */
  function validateForSend() {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 3) e.name = 'Campaign name must be at least 3 characters.';
    if (!form.channel) e.channel = 'Please select a channel.';
    if (!selectedSegment && !aiResult)                    e.segment = 'Please select an audience.';
    if (!form.message_template.trim() || form.message_template.trim().length < 10)
      e.message = 'Message must be at least 10 characters.';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function validateForDraft() {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 3) e.name = 'Campaign name must be at least 3 characters.';
    if (!form.channel) e.channel = 'Please select a channel.';
    if (!form.message_template.trim() || form.message_template.trim().length < 10)
      e.message = 'Message must be at least 10 characters.';
    setErrors(e);
    return !Object.keys(e).length;
  }

  /* ── AI Segmentation ── */
  async function handleFindAudience() {
    if (!nlQuery.trim()) { setAiError('Please describe your audience first.'); return; }
    setAiError(null);
    setAiResult(null);
    setIsLoadingAI(true);
    setSelectedSegment(null);
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
    if (!description) { addToast('Select an audience first so AI can tailor the message.', 'warning'); return; }
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
      addToast('Message generated by AI ✨', 'success');
    } catch (e) {
      addToast(`AI error: ${e.message}`, 'error');
    } finally {
      setIsGeneratingMsg(false);
    }
  }

  /* ── Campaign submission ── */
  async function submitCampaign(action) {
    const segId = selectedSegment?.id || aiResult?.segment_id;
    setIsSubmitting(true);
    try {
      const createRes = await fetch(`${API}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          segment_id: segId,
          channel: form.channel,
          message_template: form.message_template,
          ai_generated: !!aiResult,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || 'Failed to create campaign');
      const campaignId = created.campaign?.id || created.id;

      if (action === 'send') {
        const sendRes = await fetch(`${API}/api/campaigns/${campaignId}/send`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
        });
        const sendData = await sendRes.json();
        if (!sendRes.ok) throw new Error(sendData.error || 'Send failed');
        addToast(`Campaign sent to ${sendData.dispatched ?? 0} customers! 🚀`, 'success');
      } else {
        addToast('Campaign saved as draft.', 'info');
      }
      setTimeout(() => router.push('/campaigns'), 1500);
    } catch (e) {
      addToast(`Error: ${e.message}`, 'error');
      setIsSubmitting(false);
    }
  }

  function handleSendClick()  { if (validateForSend())  { setConfirmAction('send');  setShowConfirm(true); } }
  function handleDraftClick() { if (validateForDraft()) { setConfirmAction('draft'); setShowConfirm(true); } }
  async function handleConfirmed() { setShowConfirm(false); await submitCampaign(confirmAction); }

  /* ── Derived ── */
  const previewCount = aiResult?.preview_count ?? selectedSegment?.last_count ?? 0;
  const charCount    = form.message_template.length;
  const charPct      = MAX_CHARS > 0 ? (charCount / MAX_CHARS) * 100 : 0;
  const previewMessage = (form.message_template || '').replace(/\{name\}/g, 'Priya');

  const confirmMessage = confirmAction === 'send'
    ? `Send "${form.name}" to ${previewCount} customer${previewCount !== 1 ? 's' : ''} via ${form.channel || 'the selected channel'}?`
    : `Save "${form.name}" as a draft?`;

  /* ── Render ── */
  return (
    <div style={{ padding: '36px 40px', maxWidth: '1300px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Create Campaign
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
          Reach the right people with the right message.
        </p>
      </div>

      {/* Two-column layout: form + preview panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

        {/* ── LEFT: Form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Section 1: Campaign Basics */}
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>① Campaign Basics</p>

            <div>
              <label htmlFor="campaign-name" style={labelStyle}>
                Campaign Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="campaign-name" type="text"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  if (errors.name) setErrors((er) => ({ ...er, name: null }));
                }}
                placeholder="e.g. Re-engage Lapsed VIPs"
                style={{ borderColor: errors.name ? 'var(--danger)' : undefined }}
              />
              {errors.name && <span style={errorTextStyle}>✕ {errors.name}</span>}
            </div>

            <div>
              <label htmlFor="campaign-channel" style={labelStyle}>
                Channel <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {CHANNELS.map((c) => {
                  const sel = form.channel === c.value;
                  return (
                    <button
                      key={c.value}
                      id={`channel-${c.value}`}
                      onClick={() => {
                        setForm((f) => ({ ...f, channel: c.value }));
                        if (errors.channel) setErrors((er) => ({ ...er, channel: null }));
                      }}
                      style={{
                        padding: '12px 8px',
                        background: sel ? 'var(--accent-glow)' : 'var(--surface-2)',
                        border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        transition: 'all 0.15s ease',
                        color: sel ? 'var(--accent)' : 'var(--muted)',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{c.icon}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{c.label}</span>
                      <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>{c.maxLen} chars</span>
                    </button>
                  );
                })}
              </div>
              {errors.channel && <span style={errorTextStyle}>✕ {errors.channel}</span>}
            </div>
          </div>

          {/* Section 2: Audience */}
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>② Choose Audience</p>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 0 }}>
              {[{ key: 'ai', label: '✨ Ask AI' }, { key: 'browse', label: '📋 Browse Segments' }].map((tab) => (
                <button
                  key={tab.key}
                  id={`tab-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '10px 18px', background: 'none', border: 'none',
                    borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                    color: activeTab === tab.key ? 'var(--accent)' : 'var(--muted)',
                    cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                    marginBottom: '-1px', transition: 'color 0.15s ease',
                    fontFamily: 'inherit',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* AI Tab */}
            {activeTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label htmlFor="nl-query" style={labelStyle}>Describe your audience in plain English</label>
                  <textarea
                    id="nl-query"
                    value={nlQuery}
                    onChange={(e) => { setNlQuery(e.target.value); setAiError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFindAudience(); } }}
                    placeholder="e.g. VIP customers who haven't ordered in 60 days"
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                  {aiError && <span style={errorTextStyle}>✕ {aiError}</span>}
                </div>

                {/* Example pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {EXAMPLE_QUERIES.map((q) => (
                    <button
                      key={q}
                      id={`example-${q.replace(/\s+/g, '-').toLowerCase()}`}
                      onClick={() => { setNlQuery(q); setAiError(null); }}
                      className="filter-pill"
                      style={{ fontSize: '0.76rem' }}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                <button
                  id="find-audience-btn"
                  onClick={handleFindAudience}
                  disabled={isLoadingAI || !nlQuery.trim()}
                  className="btn btn-primary"
                  style={{ justifyContent: 'center', padding: '12px' }}
                >
                  {isLoadingAI ? <><LoadingSpinner size="sm" /> Searching…</> : '🔍 Find Audience →'}
                </button>

                {/* AI Result */}
                {aiResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.3s ease' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px',
                      background: 'var(--success-glow)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      <span style={{ color: 'var(--success)', fontSize: '1.1rem' }}>✅</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
                        Found <strong style={{ color: 'var(--success)' }}>{aiResult.preview_count}</strong>{' '}
                        customer{aiResult.preview_count !== 1 ? 's' : ''} matching your query
                      </span>
                    </div>

                    <CustomerPreviewTable customers={aiResult.customers || []} />

                    {!selectedSegment && (
                      <button
                        id="use-audience-btn"
                        onClick={() => {
                          setSelectedSegment({ id: aiResult.segment_id, name: aiResult.nl_query, last_count: aiResult.preview_count });
                          if (errors.segment) setErrors((er) => ({ ...er, segment: null }));
                          addToast('Audience locked in! ✅', 'success');
                        }}
                        className="btn btn-primary"
                        style={{ background: 'var(--success)', justifyContent: 'center' }}
                      >
                        ✓ Use This Audience
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Browse Tab */}
            {activeTab === 'browse' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {segmentsLoading && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                    <LoadingSpinner size="md" />
                  </div>
                )}
                {!segmentsLoading && segments.length === 0 && (
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', padding: '20px 0' }}>
                    No saved segments yet. Use the AI tab to create one.
                  </p>
                )}
                {segments.map((seg) => {
                  const isSelected = selectedSegment?.id === seg.id;
                  return (
                    <div
                      key={seg.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: isSelected ? 'var(--accent-glow)' : 'var(--surface-2)',
                        border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)', gap: '12px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>{seg.name}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {seg.last_count ?? 0} customer{seg.last_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        id={`select-segment-${seg.id}`}
                        onClick={() => {
                          if (isSelected) { setSelectedSegment(null); }
                          else {
                            setSelectedSegment(seg);
                            setAiResult(null);
                            if (errors.segment) setErrors((er) => ({ ...er, segment: null }));
                          }
                        }}
                        style={{
                          padding: '6px 14px',
                          background: isSelected ? 'var(--accent)' : 'transparent',
                          border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-sm)',
                          color: isSelected ? '#fff' : 'var(--muted)',
                          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                          whiteSpace: 'nowrap', transition: 'all 0.15s ease', fontFamily: 'inherit',
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
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px',
                background: 'var(--accent-glow)',
                border: '1px solid rgba(139,92,246,0.4)',
                borderRadius: 'var(--radius-md)', animation: 'fadeIn 0.2s ease',
              }}>
                <span style={{ color: 'var(--accent)', fontSize: '1rem' }}>✨</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text)', flex: 1 }}>
                  Audience: <strong style={{ color: 'var(--accent)' }}>{selectedSegment.name}</strong>
                  {' '}— {selectedSegment.last_count ?? 0} customers
                </span>
                <button
                  onClick={() => { setSelectedSegment(null); setAiResult(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.9rem', padding: '2px' }}
                >✕</button>
              </div>
            )}
            {errors.segment && <span style={errorTextStyle}>✕ {errors.segment}</span>}
          </div>

          {/* Section 3: Message */}
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>③ Message Template</p>

            <button
              id="generate-msg-btn"
              onClick={handleGenerateMessage}
              disabled={isGeneratingMsg}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start',
                padding: '8px 16px',
                background: 'rgba(139,92,246,0.1)',
                border: '1px solid rgba(139,92,246,0.35)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 600,
                cursor: isGeneratingMsg ? 'not-allowed' : 'pointer',
                opacity: isGeneratingMsg ? 0.7 : 1,
                transition: 'background 0.15s ease', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { if (!isGeneratingMsg) e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; }}
              onMouseLeave={(e) => { if (!isGeneratingMsg) e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; }}
            >
              {isGeneratingMsg ? <><LoadingSpinner size="sm" /> Generating…</> : '✨ Generate with AI'}
            </button>

            <div>
              <label htmlFor="message-template" style={labelStyle}>
                Message <span style={{ color: 'var(--danger)' }}>*</span>
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
                placeholder={`Hey {name}, we have something special for you…`}
                rows={5}
                style={{
                  resize: 'vertical',
                  borderColor: errors.message ? 'var(--danger)' : undefined,
                }}
              />

              {/* Char count bar */}
              <div style={{ marginTop: '8px' }}>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(100, charPct)}%`,
                      background: charPct > 90 ? 'var(--danger)' : charPct > 70 ? 'var(--warning)' : 'var(--accent)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                {errors.message
                  ? <span style={errorTextStyle}>✕ {errors.message}</span>
                  : <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      Use <code style={{ color: 'var(--accent)' }}>{'{name}'}</code> for personalization
                    </span>
                }
                <span style={{ fontSize: '0.72rem', color: charPct > 90 ? 'var(--danger)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {charCount} / {MAX_CHARS}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              id="save-draft-btn"
              onClick={handleDraftClick}
              disabled={isSubmitting}
              className="btn btn-ghost"
              style={{ padding: '12px 24px', fontSize: '0.9rem' }}
            >
              Save as Draft
            </button>
            <button
              id="create-send-btn"
              onClick={handleSendClick}
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ padding: '12px 28px', fontSize: '0.9rem' }}
            >
              {isSubmitting ? <><LoadingSpinner size="sm" /> Processing…</> : 'Create & Send →'}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Preview Panel ── */}
        <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Audience Reach */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '14px',
          }}>
            <p style={{ ...sectionTitleStyle, borderBottom: 'none', paddingBottom: 0 }}>Preview</p>

            {/* Reach count */}
            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ margin: '0 0 4px', fontSize: '2.2rem', fontWeight: 800, color: previewCount > 0 ? 'var(--accent)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                {previewCount.toLocaleString('en-IN')}
              </p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                {previewCount === 0 ? 'Select an audience' : `Customer${previewCount !== 1 ? 's' : ''} will receive this`}
              </p>
            </div>

            {/* Channel badge */}
            {selectedChannel && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '1.3rem' }}>{selectedChannel.icon}</span>
                <div>
                  <p style={{ margin: '0 0 1px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{selectedChannel.label}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--muted)' }}>Max {selectedChannel.maxLen} characters</p>
                </div>
              </div>
            )}

            {/* Message preview */}
            {previewMessage && (
              <div style={{ padding: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Message Preview
                </p>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {previewMessage}
                </p>
              </div>
            )}

            {/* Char count visual */}
            {form.message_template && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Character usage</span>
                  <span style={{ fontSize: '0.7rem', fontVariantNumeric: 'tabular-nums', color: charPct > 90 ? 'var(--danger)' : 'var(--muted)' }}>
                    {charCount}/{MAX_CHARS}
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(100, charPct)}%`,
                      background: charPct > 90 ? 'var(--danger)' : charPct > 70 ? 'var(--warning)' : 'var(--success)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* AI tip */}
            {!form.message_template && (
              <div style={{ padding: '10px 12px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                  💡 <strong style={{ color: 'var(--accent)' }}>Tip:</strong> Select an audience first, then click "Generate with AI" for a tailored message.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <ConfirmModal
          title={confirmAction === 'send' ? 'Send Campaign?' : 'Save as Draft?'}
          message={confirmMessage}
          confirmLabel={confirmAction === 'send' ? 'Send Now 🚀' : 'Save Draft'}
          onConfirm={handleConfirmed}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
