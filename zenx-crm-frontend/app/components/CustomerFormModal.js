'use client';
// app/components/CustomerFormModal.js

import { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { getAttr, getIdentity } from '../lib/helpers';
import { useDebounce } from '../hooks/useDebounce';

const API = 'http://localhost:3001';
const TIERS = ['new', 'regular', 'vip', 'lapsed'];

const labelStyle = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: '6px',
};

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '2px' };
const gridStyle  = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' };

function FieldStatus({ valid, error }) {
  if (error) return <span style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>✕ {error}</span>;
  if (valid) return <span style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>✓ Looks good</span>;
  return null;
}

/**
 * Modal form for adding or editing a customer with real-time inline validation.
 */
export default function CustomerFormModal({ mode = 'add', customer, onSave, onClose }) {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState({
    name: '', email: '', whatsapp: '', city: '',
    loyalty_tier: 'new', total_spent: '', last_order_days_ago: '',
  });

  // Per-field validation state: { error: string|null, valid: boolean }
  const [fieldState, setFieldState] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Debounced email for uniqueness check
  const debouncedEmail = useDebounce(form.email, 500);

  // Pre-fill when editing
  useEffect(() => {
    if (isEdit && customer) {
      const attrs  = customer.customer_attributes  || [];
      const idents = customer.customer_identities  || [];
      setForm({
        name:                getAttr(attrs, 'name'),
        email:               getIdentity(idents, 'email'),
        whatsapp:            getIdentity(idents, 'whatsapp'),
        city:                getAttr(attrs, 'city'),
        loyalty_tier:        getAttr(attrs, 'loyalty_tier') || 'new',
        total_spent:         getAttr(attrs, 'total_spent'),
        last_order_days_ago: getAttr(attrs, 'last_order_days_ago'),
      });
    }
  }, [isEdit, customer]);

  // Real-time email uniqueness check
  useEffect(() => {
    if (!debouncedEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/customers`);
        const customers = await res.json();
        if (cancelled) return;
        const conflict = customers.find((c) => {
          const emailId = c.customer_identities?.find((i) => i.channel === 'email');
          return emailId?.value === debouncedEmail.toLowerCase() && c.id !== customer?.id;
        });
        if (conflict) {
          setFieldState((prev) => ({ ...prev, email: { error: 'This email is already in use.', valid: false } }));
        } else {
          setFieldState((prev) => ({ ...prev, email: { error: null, valid: true } }));
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [debouncedEmail, customer?.id]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setApiError(null);

    // Validate on change
    let error = null;
    if (field === 'name') {
      if (!value.trim()) error = 'Name is required.';
    }
    if (field === 'email') {
      if (!value.trim()) error = 'Email is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Enter a valid email address.';
    }
    if (field === 'whatsapp' && value) {
      if (!/^\+?[\d\s\-(]{7,15}$/.test(value)) error = 'Enter a valid phone number.';
    }
    if (field === 'total_spent' && value) {
      if (isNaN(Number(value))) error = 'Must be a number.';
    }
    if (field === 'last_order_days_ago' && value) {
      if (isNaN(Number(value))) error = 'Must be a number.';
    }

    setFieldState((prev) => ({
      ...prev,
      [field]: { error, valid: !error && !!value.trim() },
    }));
  }

  function validateAll() {
    const checks = {
      name:  !form.name.trim() ? 'Name is required.' : null,
      email: !form.email.trim() ? 'Email is required.'
            : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? 'Enter a valid email.' : null,
      whatsapp: form.whatsapp && !/^\+?[\d\s\-(]{7,15}$/.test(form.whatsapp) ? 'Invalid phone.' : null,
      total_spent: form.total_spent && isNaN(Number(form.total_spent)) ? 'Must be a number.' : null,
      last_order_days_ago: form.last_order_days_ago && isNaN(Number(form.last_order_days_ago)) ? 'Must be a number.' : null,
    };
    const newState = {};
    Object.entries(checks).forEach(([k, error]) => {
      newState[k] = { error, valid: !error && !!form[k]?.toString().trim() };
    });
    setFieldState((prev) => ({ ...prev, ...newState }));
    return !Object.values(checks).some(Boolean);
  }

  async function handleSubmit() {
    if (!validateAll()) return;
    // Check for existing email conflict
    if (fieldState.email?.error) return;

    setSaving(true);
    setApiError(null);

    const url = isEdit ? `${API}/api/customers/${customer.id}` : `${API}/api/customers`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:                form.name.trim(),
          email:               form.email.trim().toLowerCase(),
          whatsapp:            form.whatsapp.trim() || undefined,
          city:                form.city.trim()     || undefined,
          loyalty_tier:        form.loyalty_tier    || undefined,
          total_spent:         form.total_spent     || undefined,
          last_order_days_ago: form.last_order_days_ago || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      onSave(json);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function inputStyle(field) {
    const s = fieldState[field];
    if (!s) return {};
    if (s.error) return { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px var(--danger-glow)' };
    if (s.valid) return { borderColor: 'var(--success)', boxShadow: '0 0 0 3px var(--success-glow)' };
    return {};
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(6px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px',
          width: '100%', maxWidth: '560px',
          maxHeight: '92vh', overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeInScale 0.22s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
              {isEdit ? '✏️ Edit Customer' : '➕ Add Customer'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)' }}>
              {isEdit ? 'Update contact details and attributes.' : 'Fields marked * are required.'}
            </p>
          </div>
          <button
            onClick={onClose}
            id="customer-form-close"
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', lineHeight: 1 }}
          >✕</button>
        </div>

        {/* API error */}
        {apiError && (
          <div style={{
            background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-md)', padding: '12px 16px',
            color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '20px',
          }}>
            ⚠ {apiError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Name + Email */}
          <div style={gridStyle}>
            <div style={fieldStyle}>
              <label htmlFor="cf-name" style={labelStyle}>Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input id="cf-name" type="text" value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Priya Sharma"
                style={inputStyle('name')}
              />
              <FieldStatus {...(fieldState.name || {})} />
            </div>
            <div style={fieldStyle}>
              <label htmlFor="cf-email" style={labelStyle}>Email <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input id="cf-email" type="email" value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="priya@example.com"
                style={inputStyle('email')}
              />
              <FieldStatus {...(fieldState.email || {})} />
            </div>
          </div>

          {/* WhatsApp + City */}
          <div style={gridStyle}>
            <div style={fieldStyle}>
              <label htmlFor="cf-whatsapp" style={labelStyle}>WhatsApp</label>
              <input id="cf-whatsapp" type="tel" value={form.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)}
                placeholder="+919876543210"
                style={inputStyle('whatsapp')}
              />
              <FieldStatus {...(fieldState.whatsapp || {})} />
            </div>
            <div style={fieldStyle}>
              <label htmlFor="cf-city" style={labelStyle}>City</label>
              <input id="cf-city" type="text" value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="Mumbai"
              />
            </div>
          </div>

          {/* Loyalty Tier */}
          <div style={fieldStyle}>
            <label htmlFor="cf-tier" style={labelStyle}>Loyalty Tier</label>
            <select id="cf-tier" value={form.loyalty_tier} onChange={(e) => set('loyalty_tier', e.target.value)}>
              {TIERS.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Total Spent + Last Order */}
          <div style={gridStyle}>
            <div style={fieldStyle}>
              <label htmlFor="cf-spent" style={labelStyle}>Total Spent (₹)</label>
              <input id="cf-spent" type="number" min="0" value={form.total_spent}
                onChange={(e) => set('total_spent', e.target.value)}
                placeholder="5000"
                style={inputStyle('total_spent')}
              />
              <FieldStatus {...(fieldState.total_spent || {})} />
            </div>
            <div style={fieldStyle}>
              <label htmlFor="cf-days" style={labelStyle}>Last Order (days ago)</label>
              <input id="cf-days" type="number" min="0" value={form.last_order_days_ago}
                onChange={(e) => set('last_order_days_ago', e.target.value)}
                placeholder="30"
                style={inputStyle('last_order_days_ago')}
              />
              <FieldStatus {...(fieldState.last_order_days_ago || {})} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
            Cancel
          </button>
          <button
            id="customer-form-submit"
            onClick={handleSubmit}
            disabled={saving}
            className="btn btn-primary"
            style={{ padding: '10px 24px' }}
          >
            {saving && <LoadingSpinner size="sm" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
