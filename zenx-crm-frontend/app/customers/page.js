'use client';
// app/customers/page.js

import { useState, useEffect, useMemo, useCallback } from 'react';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import CustomerFormModal from '../components/CustomerFormModal';
import CSVImportModal from '../components/CSVImportModal';
import { getAttr, getIdentity, formatCurrency } from '../lib/helpers';

const API = 'http://localhost:3001';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');

  // Modal states
  const [showAdd, setShowAdd]         = useState(false);
  const [editTarget, setEditTarget]   = useState(null); // customer object
  const [showImport, setShowImport]   = useState(false);
  const [toast, setToast]             = useState(null);

  const showToast = (message, type = 'success') =>
    setToast({ message, type, key: Date.now() });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/customers`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      setCustomers(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => {
      const name = getAttr(c.customer_attributes, 'name').toLowerCase();
      const city = getAttr(c.customer_attributes, 'city').toLowerCase();
      return name.includes(q) || city.includes(q);
    });
  }, [customers, search]);

  // Called when add/edit modal saves successfully
  function handleSaved(savedCustomer, isEdit) {
    if (isEdit) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === savedCustomer.id ? savedCustomer : c))
      );
      showToast('Customer updated successfully.', 'success');
    } else {
      setCustomers((prev) => [savedCustomer, ...prev]);
      showToast('Customer added successfully.', 'success');
    }
    setShowAdd(false);
    setEditTarget(null);
  }

  // Called when CSV import completes
  function handleImported(count) {
    setShowImport(false);
    showToast(`Imported ${count} customers successfully.`, 'success');
    // Reload to get fresh data from DB
    setLoading(true);
    load();
  }

  /* ── Styles ── */
  const thStyle = {
    padding: '12px 16px',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    textAlign: 'left',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  };

  const tdStyle = {
    padding: '14px 16px',
    fontSize: '0.875rem',
    color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  };

  const btnBase = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 18px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'background 0.15s ease, opacity 0.15s ease',
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1100px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 4px' }}>Customers</h1>
          {!loading && !error && (
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
              {filtered.length} of {customers.length} shoppers
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.9rem', pointerEvents: 'none' }}>
              🔍
            </span>
            <input
              id="customer-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or city…"
              aria-label="Search customers"
              style={{ paddingLeft: '36px', width: '220px' }}
            />
          </div>

          {/* Import CSV */}
          <button
            id="import-csv-btn"
            onClick={() => setShowImport(true)}
            style={{ ...btnBase, background: 'rgba(255,255,255,0.06)', color: 'var(--text)', border: '1px solid var(--border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            📂 Import CSV
          </button>

          {/* Add Customer */}
          <button
            id="add-customer-btn"
            onClick={() => setShowAdd(true)}
            style={{ ...btnBase, background: 'var(--accent)', color: '#fff' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-dim)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            ➕ Add Customer
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '16px 20px', color: 'var(--danger)', fontSize: '0.875rem' }}>
          ⚠ Failed to load customers: {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px', color: 'var(--muted)' }}>
          <LoadingSpinner size="lg" />
          <span>Loading customers…</span>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>City</th>
                  <th style={thStyle}>Loyalty Tier</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total Spent</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Last Order</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                      {search ? 'No customers match your search.' : 'No customers yet. Add one or import from CSV.'}
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
                    const lastOrder = days === '—' ? 'Never' : `${days} days ago`;

                    return (
                      <tr
                        key={c.id}
                        style={{ transition: 'background 0.12s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{name}</td>
                        <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: '0.8rem' }}>{email}</td>
                        <td style={{ ...tdStyle, color: 'var(--muted)' }}>{city}</td>
                        <td style={tdStyle}><Badge type="loyalty_tier" label={tier} /></td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{spent}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--muted)', fontSize: '0.8rem' }}>{lastOrder}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <button
                            id={`edit-customer-${c.id}`}
                            onClick={() => setEditTarget(c)}
                            style={{
                              padding: '5px 14px',
                              background: 'rgba(139,92,246,0.12)',
                              border: '1px solid rgba(139,92,246,0.3)',
                              borderRadius: '6px',
                              color: 'var(--accent)',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.22)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.12)')}
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
      )}

      {/* Add Customer Modal */}
      {showAdd && (
        <CustomerFormModal
          mode="add"
          onSave={(saved) => handleSaved(saved, false)}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Edit Customer Modal */}
      {editTarget && (
        <CustomerFormModal
          mode="edit"
          customer={editTarget}
          onSave={(saved) => handleSaved(saved, true)}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* CSV Import Modal */}
      {showImport && (
        <CSVImportModal
          onImported={handleImported}
          onClose={() => setShowImport(false)}
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
