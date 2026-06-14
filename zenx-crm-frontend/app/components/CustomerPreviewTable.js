// app/components/CustomerPreviewTable.js

import Badge from './Badge';
import { getAttr, formatCurrency } from '../lib/helpers';

/**
 * Compact preview table for AI segment results.
 * @param {{ customers: Array }} props
 */
export default function CustomerPreviewTable({ customers = [] }) {
  if (!customers.length) {
    return (
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', padding: '16px 0' }}>
        No customers match this filter.
      </p>
    );
  }

  const thStyle = {
    padding: '10px 12px',
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
    padding: '12px 12px',
    fontSize: '0.875rem',
    color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  };

  return (
    <div
      style={{
        overflowX: 'auto',
        borderRadius: '10px',
        border: '1px solid var(--border)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>City</th>
            <th style={thStyle}>Tier</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Spent</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c, i) => {
            const attrs = c.customer_attributes || [];
            const name  = getAttr(attrs, 'name');
            const city  = getAttr(attrs, 'city');
            const tier  = getAttr(attrs, 'loyalty_tier');
            const spent = formatCurrency(getAttr(attrs, 'total_spent'));

            return (
              <tr
                key={c.id || i}
                style={{ transition: 'background 0.12s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={tdStyle}>{name}</td>
                <td style={{ ...tdStyle, color: 'var(--muted)' }}>{city}</td>
                <td style={tdStyle}>
                  <Badge type="loyalty_tier" label={tier} />
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {spent}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
