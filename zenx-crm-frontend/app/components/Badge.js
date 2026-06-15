// app/components/Badge.js

const CHANNEL_STYLES = {
  whatsapp: { bg: 'rgba(16,185,129,0.12)',  color: 'var(--success)', border: 'rgba(16,185,129,0.3)',   label: '💬 WhatsApp' },
  sms:      { bg: 'rgba(6,182,212,0.12)',   color: 'var(--cyan)',    border: 'rgba(6,182,212,0.3)',    label: '📱 SMS' },
  email:    { bg: 'rgba(107,114,128,0.12)', color: 'var(--muted)',   border: 'rgba(107,114,128,0.2)', label: '✉️ Email' },
  rcs:      { bg: 'rgba(139,92,246,0.12)',  color: 'var(--accent)',  border: 'rgba(139,92,246,0.3)',  label: '✨ RCS' },
};

const STATUS_STYLES = {
  draft:     { bg: 'rgba(107,114,128,0.12)', color: 'var(--muted)',   border: 'rgba(107,114,128,0.2)', label: 'Draft' },
  sending:   { bg: 'rgba(6,182,212,0.12)',   color: 'var(--cyan)',    border: 'rgba(6,182,212,0.3)',   label: '⚡ Sending' },
  completed: { bg: 'rgba(16,185,129,0.12)',  color: 'var(--success)', border: 'rgba(16,185,129,0.3)',  label: '✅ Completed' },
  failed:    { bg: 'rgba(239,68,68,0.12)',   color: 'var(--danger)',  border: 'rgba(239,68,68,0.3)',   label: '✕ Failed' },
};

const LOYALTY_STYLES = {
  vip:     { bg: 'rgba(139,92,246,0.12)',  color: 'var(--accent)',  border: 'rgba(139,92,246,0.3)',   label: '👑 VIP' },
  new:     { bg: 'rgba(6,182,212,0.12)',   color: 'var(--cyan)',    border: 'rgba(6,182,212,0.3)',    label: '🌱 New' },
  regular: { bg: 'rgba(107,114,128,0.12)', color: 'var(--muted)',   border: 'rgba(107,114,128,0.2)', label: 'Regular' },
  lapsed:  { bg: 'rgba(239,68,68,0.12)',   color: 'var(--danger)',  border: 'rgba(239,68,68,0.3)',   label: '💤 Lapsed' },
};

const TYPE_MAP = {
  channel:      CHANNEL_STYLES,
  status:       STATUS_STYLES,
  loyalty_tier: LOYALTY_STYLES,
};

/**
 * Pill badge component with border accent.
 * @param {{ type: 'channel'|'status'|'loyalty_tier', label: string }} props
 */
export default function Badge({ type, label }) {
  const map = TYPE_MAP[type] || {};
  const key = (label || '').toLowerCase();
  const style = map[key] || {
    bg: 'rgba(107,114,128,0.12)',
    color: 'var(--muted)',
    border: 'rgba(107,114,128,0.2)',
    label: label || '—',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.6,
      }}
    >
      {style.label}
    </span>
  );
}
