'use client';
// app/customers/page.js

import { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonTableRows } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import CustomerFormModal from '../components/CustomerFormModal';
import CSVImportModal from '../components/CSVImportModal';
import { getAttr, getIdentity, formatCurrency } from '../lib/helpers';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../context/ToastContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const fetcher = (url) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`Server error ${r.status}`);
  return r.json();
});

const QUICK_FILTERS = [
  { id: 'all',      label: 'All',           test: () => true },
  { id: 'vip',      label: '👑 VIP',        test: (a) => getAttr(a, 'loyalty_tier').toLowerCase() === 'vip' },
  { id: 'new',      label: '🌱 New',        test: (a) => getAttr(a, 'loyalty_tier').toLowerCase() === 'new' },
  { id: 'lapsed',   label: '💤 Lapsed',     test: (a) => getAttr(a, 'loyalty_tier').toLowerCase() === 'lapsed' },
  { id: 'highval',  label: '💰 High Value', test: (a) => parseFloat(getAttr(a, 'total_spent') || 0) > 10000 },
  { id: 'atrisk',   label: '⚠️ At Risk',    test: (a) => parseFloat(getAttr(a, 'last_order_days_ago') || 0) > 90 },
];

/**
 * Lightweight fuzzy match: returns a score > 0 if q matches str.
 * Scores: exact prefix = 3, contains = 2, character subsequence = 1.
 */
function fuzzyScore(str, q) {
  if (!q || !str) return 0;
  const s = str.toLowerCase();
  const query = q.toLowerCase();
  if (s === query) return 4;
  if (s.startsWith(query)) return 3;
  if (s.includes(query)) return 2;
  // subsequence check
  let si = 0;
  for (let qi = 0; qi < query.length; qi++) {
    si = s.indexOf(query[qi], si);
    if (si === -1) return 0;
    si++;
  }
  return 1;
}

/** Highlight matching characters in text */
function Highlight({ text, query }) {
  if (!query?.trim()) return <>{text}</>;
  const q = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(139,92,246,0.25)', color: 'var(--accent)', borderRadius: '2px', padding: '0 1px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function CustomersPage() {
  const { addToast } = useToast();
  const [search, setSearch]         = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAdd, setShowAdd]       = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const { data: customers = [], error, isLoading, mutate } = useSWR(
    `${API}/api/customers`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const filtered = useMemo(() => {
    const filterFn = QUICK_FILTERS.find((f) => f.id === activeFilter)?.test ?? (() => true);

    return customers
      .filter((c) => filterFn(c.customer_attributes || []))
      .map((c) => {
        if (!debouncedSearch.trim()) return { ...c, _score: 0 };
        const attrs  = c.customer_attributes  || [];
        const idents = c.customer_identities  || [];
        const name   = getAttr(attrs, 'name');
        const city   = getAttr(attrs, 'city');
        const email  = getIdentity(idents, 'email');
        const tier   = getAttr(attrs, 'loyalty_tier');
        const score = Math.max(
          fuzzyScore(name, debouncedSearch),
          fuzzyScore(city, debouncedSearch),
          fuzzyScore(email, debouncedSearch),
          fuzzyScore(tier, debouncedSearch),
        );
        return { ...c, _score: score };
      })
      .filter((c) => !debouncedSearch.trim() || c._score > 0)
      .sort((a, b) => (b._score || 0) - (a._score || 0));
  }, [customers, debouncedSearch, activeFilter]);

  function handleSaved(saved, isEdit) {
    mutate(); // revalidate from server
    addToast(isEdit ? 'Customer updated.' : 'Customer added.', 'success');
    setShowAdd(false);
    setEditTarget(null);
  }

  function handleImported(count) {
    setShowImport(false);
    addToast(`Imported ${count} customers successfully.`, 'success');
    mutate();
  }

  const thStyle = {
    padding: '11px 16px',
    fontSize: '0.66rem',
    fontWeight: 700,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    textAlign: 'left',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    background: 'var(--surface-2)',
  };
  const tdStyle = {
    padding: '13px 16px',
    fontSize: '0.875rem',
    color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: '36px 40px', maxWidth: '1200px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Customers</h1>
          {!isLoading && !error && (
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
              Showing <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> of{' '}
              <strong style={{ color: 'var(--text)' }}>{customers.length}</strong> shoppers
              {activeFilter !== 'all' && <span style={{ color: 'var(--accent)' }}> · {QUICK_FILTERS.find(f=>f.id===activeFilter)?.label} filter active</span>}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
            <input
              id="customer-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Fuzzy search by name, city, email…"
              aria-label="Search customers"
              style={{ paddingLeft: '36px', width: '260px' }}
            />
          </div>

          {/* Import CSV */}
          <button
            id="import-csv-btn"
            onClick={() => setShowImport(true)}
            className="btn btn-secondary"
          >
            📂 Import CSV
          </button>

          {/* Add Customer */}
          <button
            id="add-customer-btn"
            onClick={() => setShowAdd(true)}
            className="btn btn-primary"
          >
            ➕ Add Customer
          </button>
        </div>
      </div>

      {/* Quick filter pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.id}
            className={`filter-pill ${activeFilter === f.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
        {(search || activeFilter !== 'all') && (
          <button
            className="filter-pill"
            onClick={() => { setSearch(''); setActiveFilter('all'); }}
            style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}
          >
            ✕ Reset
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '14px 18px', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '16px' }}>
          ⚠ Failed to load customers: {error.message}
        </div>
      )}

      {/* Desktop Table */}
      {!error && (
        <div className="customer-table-wrap">
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>City</th>
                    <th style={thStyle}>Tier</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total Spent</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Last Order</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <SkeletonTableRows cols={7} rows={8} />
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <EmptyState
                          icon={search ? '🔍' : activeFilter !== 'all' ? '🎯' : '👥'}
                          title={search ? 'No matches found' : activeFilter !== 'all' ? 'No customers in this filter' : 'No customers yet'}
                          description={
                            search
                              ? `No customers matched "${search}". Try a different name, city, or email.`
                              : activeFilter !== 'all'
                              ? 'No customers match this filter. Try a different one.'
                              : 'Get started by adding customers manually or importing from a CSV file.'
                          }
                          action={!search && activeFilter === 'all' && (
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button onClick={() => setShowImport(true)} className="btn btn-secondary">📂 Import CSV</button>
                              <button onClick={() => setShowAdd(true)} className="btn btn-primary">➕ Add Customer</button>
                            </div>
                          )}
                        />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => {
                      const attrs  = c.customer_attributes || [];
                      const idents = c.customer_identities  || [];
                      const name   = getAttr(attrs, 'name');
                      const city   = getAttr(attrs, 'city');
                      const tier   = getAttr(attrs, 'loyalty_tier');
                      const spent  = formatCurrency(getAttr(attrs, 'total_spent'));
                      const days   = getAttr(attrs, 'last_order_days_ago');
                      const email  = getIdentity(idents, 'email');
                      const daysNum = parseFloat(days);
                      const lastOrder = days === '—' ? 'Never' : `${days}d ago`;
                      const atRisk = daysNum > 90;

                      return (
                        <tr
                          key={c.id}
                          style={{ transition: 'background 0.1s ease' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ ...tdStyle, fontWeight: 600 }}>
                            <Highlight text={name} query={debouncedSearch} />
                          </td>
                          <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: '0.8rem' }}>
                            <Highlight text={email} query={debouncedSearch} />
                          </td>
                          <td style={{ ...tdStyle, color: 'var(--muted)' }}>
                            <Highlight text={city} query={debouncedSearch} />
                          </td>
                          <td style={tdStyle}><Badge type="loyalty_tier" label={tier} /></td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{spent}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: atRisk ? 'var(--danger)' : 'var(--muted)', fontSize: '0.8rem', fontWeight: atRisk ? 600 : 400 }}>
                            {atRisk && '⚠ '}{lastOrder}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <button
                              id={`edit-customer-${c.id}`}
                              onClick={() => setEditTarget(c)}
                              style={{
                                padding: '5px 14px',
                                background: 'rgba(139,92,246,0.1)',
                                border: '1px solid rgba(139,92,246,0.25)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--accent)',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.2)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.1)')}
                            >
                              ✏️ Edit
                            </button>
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
      )}

      {/* Mobile cards */}
      {!error && !isLoading && (
        <div className="customer-cards-wrap">
          {filtered.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No customers yet"
              description="Import from CSV or add manually to get started."
              action={
                <button onClick={() => setShowAdd(true)} className="btn btn-primary">➕ Add Customer</button>
              }
            />
          ) : (
            filtered.map((c) => {
              const attrs  = c.customer_attributes || [];
              const idents = c.customer_identities  || [];
              const name   = getAttr(attrs, 'name');
              const city   = getAttr(attrs, 'city');
              const tier   = getAttr(attrs, 'loyalty_tier');
              const spent  = formatCurrency(getAttr(attrs, 'total_spent'));
              const email  = getIdentity(idents, 'email');

              return (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.95rem' }}>{name}</p>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)' }}>{email}</p>
                    </div>
                    <Badge type="loyalty_tier" label={tier} />
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--muted)' }}>
                    <span>📍 {city}</span>
                    <span>💰 {spent}</span>
                  </div>
                  <button
                    onClick={() => setEditTarget(c)}
                    className="btn btn-secondary"
                    style={{ alignSelf: 'flex-end', padding: '6px 14px', fontSize: '0.8rem' }}
                  >
                    ✏️ Edit
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <CustomerFormModal
          mode="add"
          onSave={(saved) => handleSaved(saved, false)}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editTarget && (
        <CustomerFormModal
          mode="edit"
          customer={editTarget}
          onSave={(saved) => handleSaved(saved, true)}
          onClose={() => setEditTarget(null)}
        />
      )}
      {showImport && (
        <CSVImportModal
          onImported={handleImported}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
