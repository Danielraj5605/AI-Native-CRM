'use client';
// app/components/CSVImportModal.js

import { useState, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const EXPECTED_COLUMNS = ['name', 'email', 'whatsapp', 'city', 'loyalty_tier', 'total_spent', 'last_order_days_ago'];

/** Parse a CSV string into an array of objects using the header row as keys. */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields (basic)
    const values = [];
    let inQuote = false;
    let cur = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    values.push(cur.trim());

    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

/**
 * CSV import modal.
 * @param {{ onImported: (count: number) => void, onClose: () => void }} props
 */
export default function CSVImportModal({ onImported, onClose }) {
  const fileRef = useRef(null);

  const [step, setStep] = useState('upload');   // 'upload' | 'preview' | 'importing' | 'done'
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState({ imported: 0, failed: 0, total: 0 });
  const [importErrors, setImportErrors] = useState([]);

  function processFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a .csv file.');
      return;
    }
    setParseError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target.result);
        if (parsed.length === 0) throw new Error('No data rows found in the CSV.');
        setRows(parsed);
        setStep('preview');
      } catch (err) {
        setParseError(err.message);
      }
    };
    reader.readAsText(file);
  }

  function handleFileDrop(e) {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  }

  async function handleImport() {
    setStep('importing');
    setProgress({ imported: 0, failed: 0, total: rows.length });

    try {
      const res = await fetch(`${API}/api/customers/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: rows }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Import failed');

      setProgress({ imported: result.imported, failed: result.failed, total: rows.length });
      setImportErrors(result.errors || []);
      setStep('done');
    } catch (err) {
      setParseError(err.message);
      setStep('preview');
    }
  }

  const thStyle = {
    padding: '8px 12px',
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    textAlign: 'left',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '8px 12px',
    fontSize: '0.8rem',
    color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const previewCols = ['name', 'email', 'city', 'loyalty_tier', 'total_spent'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} />

      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '32px',
        width: '100%',
        maxWidth: step === 'preview' ? '700px' : '480px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        animation: 'fadeInScale 0.2s ease',
        transition: 'max-width 0.25s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
            📂 Import Customers via CSV
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* ── UPLOAD step ── */}
        {step === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Expected format hint */}
            <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', padding: '14px 16px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Expected CSV columns
              </p>
              <code style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.8 }}>
                {EXPECTED_COLUMNS.join(', ')}
              </code>
              <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>name</strong> and <strong style={{ color: 'var(--text)' }}>email</strong> are required. All others are optional.
              </p>
            </div>

            {/* Sample download hint */}
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              Example row:<br />
              <code style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>
                Priya Sharma,priya@example.com,+919876543210,Mumbai,vip,5000,30
              </code>
            </p>

            {/* Drop zone */}
            <div
              onDrop={handleFileDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'rgba(139,92,246,0.06)' : 'transparent',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📄</div>
              <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>
                {fileName ? fileName : 'Drop your CSV here'}
              </p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>
                or click to browse
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => processFile(e.target.files[0])}
            />

            {parseError && (
              <p style={{ margin: 0, color: 'var(--danger)', fontSize: '0.85rem' }}>⚠ {parseError}</p>
            )}
          </div>
        )}

        {/* ── PREVIEW step ── */}
        {step === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
                <strong style={{ color: 'var(--accent)' }}>{rows.length}</strong> rows found in <strong>{fileName}</strong>
              </span>
              <button
                onClick={() => { setStep('upload'); setRows([]); setFileName(''); setParseError(null); }}
                style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem', padding: '4px 10px' }}
              >
                ← Change file
              </button>
            </div>

            {parseError && (
              <p style={{ margin: 0, color: 'var(--danger)', fontSize: '0.85rem' }}>⚠ {parseError}</p>
            )}

            {/* Preview table (first 5 rows) */}
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {previewCols.map((c) => <th key={c} style={thStyle}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      {previewCols.map((c) => (
                        <td key={c} style={tdStyle} title={r[c]}>
                          {r[c] || <span style={{ color: 'var(--muted)' }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 5 && (
                <p style={{ margin: 0, padding: '8px 12px', fontSize: '0.75rem', color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
                  … and {rows.length - 5} more rows
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
              <button onClick={onClose} style={{ padding: '10px 20px', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.875rem' }}>
                Cancel
              </button>
              <button
                id="csv-import-confirm"
                onClick={handleImport}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Import {rows.length} customers →
              </button>
            </div>
          </div>
        )}

        {/* ── IMPORTING step ── */}
        {step === 'importing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px 0' }}>
            <LoadingSpinner size="lg" />
            <p style={{ margin: 0, color: 'var(--text)', fontWeight: 600 }}>
              Importing {progress.total} customers…
            </p>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
              This may take a moment
            </p>
          </div>
        )}

        {/* ── DONE step ── */}
        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Summary */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, padding: '16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{progress.imported}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Imported</p>
              </div>
              {progress.failed > 0 && (
                <div style={{ flex: 1, padding: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>{progress.failed}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Failed</p>
                </div>
              )}
            </div>

            {/* Row errors */}
            {importErrors.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '12px 16px', maxHeight: '140px', overflowY: 'auto' }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase' }}>Failed rows</p>
                {importErrors.map((e, i) => (
                  <p key={i} style={{ margin: '0 0 4px', fontSize: '0.78rem', color: 'var(--muted)' }}>
                    Row {e.row} ({e.email}): {e.error}
                  </p>
                ))}
              </div>
            )}

            <button
              id="csv-import-done"
              onClick={() => onImported(progress.imported)}
              style={{ padding: '12px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Done — View Customers
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
