'use client';
// app/components/CustomerFormModal.js

import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { getAttr, getIdentity } from '../lib/helpers';

const TIERS = ['new', 'regular', 'vip', 'lapsed'];

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: '6px',
};

const errorStyle = {
  fontSize: '0.75rem',
  color: 'var(--danger)',
  marginTop: '4px',
  display: 'block',
};

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
};

/**
 * Modal form for adding or editing a customer.
 *
 * @param {{
 *   mode: 'add'|'edit',
 *   customer?: object,         // existing customer object when mode='edit'
 *   onSave: (data) => void,   // called with the saved customer after API success
 *   onClose: () => void,
 * }} props
 */
export default function CustomerFormModal({ mode = 'add', customer, onSave, onClose }) {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    city: '',
    loyalty_tier: 'new',
    total_spent: '',
    last_order_days_ago: '',
  });
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [apiError, setApiError] = useState(null);

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

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
    setApiError(null);
  }

  function validate() {
    const e = {};
    if (!form.name.trim())         e.name  = 'Name is required.';
    if (!form.email.trim())        e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                   e.email = 'Enter a valid email address.';
    if (form.whatsapp && !/^\+?[\d\s\-()]{7,15}$/.test(form.whatsapp))
                                   e.whatsapp = 'Enter a valid phone number (e.g. +919876543210).';
    if (form.total_spent && isNaN(Number(form.total_spent)))
                                   e.total_spent = 'Must be a number.';
    if (form.last_order_days_ago && isNaN(Number(form.last_order_days_ago)))
                                   e.last_order_days_ago = 'Must be a number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setApiError(null);

    const API = 'http://localhost:3001';
    const url = isEdit
      ? `${API}/api/customers/${customer.id}`
      : `${API}/api/customers`;
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

  const inputErr = (field) => errors[field]
    ? { borderColor: 'var(--danger)' }
    : {};

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '32px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          animation: 'fadeInScale 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
            {isEdit ? '✏️ Edit Customer' : '➕ Add Customer'}
          </h2>
          <button
            onClick={onClose}
            id="customer-form-close"
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* API error */}
        {apiError && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: 'var(--danger)',
            fontSize: '0.85rem',
            marginBottom: '20px',
          }}>
            ⚠ {apiError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Name + Email */}
          <div style={gridStyle}>
            <div style={fieldStyle}>
              <label htmlFor="cf-name" style={labelStyle}>Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input id="cf-name" type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="Priya Sharma" style={inputErr('name')} />
              {errors.name && <span style={errorStyle}>{errors.name}</span>}
            </div>

            <div style={fieldStyle}>
              <label htmlFor="cf-email" style={labelStyle}>Email <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input id="cf-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                placeholder="priya@example.com" style={inputErr('email')} />
              {errors.email && <span style={errorStyle}>{errors.email}</span>}
            </div>
          </div>

          {/* WhatsApp + City */}
          <div style={gridStyle}>
            <div style={fieldStyle}>
              <label htmlFor="cf-whatsapp" style={labelStyle}>WhatsApp</label>
              <input id="cf-whatsapp" type="text" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)}
                placeholder="+919876543210" style={inputErr('whatsapp')} />
              {errors.whatsapp && <span style={errorStyle}>{errors.whatsapp}</span>}
            </div>

            <div style={fieldStyle}>
              <label htmlFor="cf-city" style={labelStyle}>City</label>
              <input id="cf-city" type="text" value={form.city} onChange={(e) => set('city', e.target.value)}
                placeholder="Mumbai" />
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
                placeholder="5000" style={inputErr('total_spent')} />
              {errors.total_spent && <span style={errorStyle}>{errors.total_spent}</span>}
            </div>

            <div style={fieldStyle}>
              <label htmlFor="cf-days" style={labelStyle}>Last Order (days ago)</label>
              <input id="cf-days" type="number" min="0" value={form.last_order_days_ago}
                onChange={(e) => set('last_order_days_ago', e.target.value)}
                placeholder="30" style={inputErr('last_order_days_ago')} />
              {errors.last_order_days_ago && <span style={errorStyle}>{errors.last_order_days_ago}</span>}
            </div>
          </div>

        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            id="customer-form-submit"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              background: saving ? 'rgba(139,92,246,0.5)' : 'var(--accent)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            {saving && <LoadingSpinner size="sm" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
