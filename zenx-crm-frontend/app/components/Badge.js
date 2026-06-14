// app/components/Badge.js

const CHANNEL_STYLES = {
  whatsapp: { bg: 'rgba(16,185,129,0.15)', color: 'var(--success)', label: 'WhatsApp' },
  sms:      { bg: 'rgba(6,182,212,0.15)',  color: 'var(--cyan)',    label: 'SMS' },
  email:    { bg: 'rgba(107,114,128,0.2)', color: 'var(--muted)',   label: 'Email' },
  rcs:      { bg: 'rgba(139,92,246,0.15)', color: 'var(--accent)',  label: 'RCS' },
};

const STATUS_STYLES = {
  draft:     { bg: 'rgba(107,114,128,0.2)', color: 'var(--muted)',   label: 'Draft' },
  sending:   { bg: 'rgba(6,182,212,0.15)',  color: 'var(--cyan)',    label: 'Sending' },
  completed: { bg: 'rgba(16,185,129,0.15)', color: 'var(--success)', label: 'Completed' },
  failed:    { bg: 'rgba(239,68,68,0.15)',  color: 'var(--danger)',  label: 'Failed' },
};

const LOYALTY_STYLES = {
  vip:     { bg: 'rgba(139,92,246,0.15)', color: 'var(--accent)',  label: 'VIP' },
  new:     { bg: 'rgba(6,182,212,0.15)',  color: 'var(--cyan)',    label: 'New' },
  regular: { bg: 'rgba(107,114,128,0.2)', color: 'var(--muted)',   label: 'Regular' },
  lapsed:  { bg: 'rgba(239,68,68,0.15)',  color: 'var(--danger)',  label: 'Lapsed' },
};

const TYPE_MAP = {
  channel:      CHANNEL_STYLES,
  status:       STATUS_STYLES,
  loyalty_tier: LOYALTY_STYLES,
};

/**
 * Pill badge component.
 * @param {{ type: 'channel'|'status'|'loyalty_tier', label: string }} props
 */
export default function Badge({ type, label }) {
  const map = TYPE_MAP[type] || {};
  const key = (label || '').toLowerCase();
  const style = map[key] || {
    bg: 'rgba(107,114,128,0.2)',
    color: 'var(--muted)',
    label: label || '—',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      {style.label}
    </span>
  );
}
