// src/components/ImportCSV.jsx
import { useMemo, useState } from 'react';

// Lightweight CSV parser that supports quoted fields, commas and newlines in quotes
function parseCSV(text, delimiter = ',') {
  const rows = [];
  let cur = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === delimiter && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && text[i + 1] === '\n') i++; // handle CRLF
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  // Trim empty trailing rows
  while (rows.length && rows[rows.length - 1].every((x) => String(x || '').trim() === '')) rows.pop();
  return rows;
}

const DEFAULT_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'city', label: 'City' },
  { key: 'tag', label: 'Tag' },
];

export default function ImportCSV({ fields = DEFAULT_FIELDS, delimiter = ',', onImport }) {
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState([]); // array of arrays
  const [headers, setHeaders] = useState([]); // header row (strings)
  const [mapping, setMapping] = useState({}); // { fieldKey: columnIndex }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const hasData = rawRows.length > 0;
  const previewRows = useMemo(() => rawRows.slice(0, 5), [rawRows]);

  function onFileChange(e) {
    const f = e.target.files?.[0];
    setError('');
    if (!f) return;
    setBusy(true);
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const rows = parseCSV(text, delimiter);
        if (!rows.length) throw new Error('Empty CSV');
        setHeaders(rows[0].map((h) => String(h || '').trim()));
        setRawRows(rows.slice(1));
        // Try auto-map by header names (case-insensitive)
        const auto = {};
        const lower = rows[0].map((h) => String(h || '').trim().toLowerCase());
        for (const f of fields) {
          const idx = lower.findIndex((h) => h === f.key || h === f.label.toLowerCase());
          if (idx >= 0) auto[f.key] = idx;
        }
        setMapping(auto);
      } catch (err) {
        setError(err?.message || 'Failed to parse CSV');
        setHeaders([]);
        setRawRows([]);
      } finally {
        setBusy(false);
      }
    };
    reader.onerror = () => {
      setBusy(false);
      setError('Failed reading file');
    };
    reader.readAsText(f);
  }

  function handleMapChange(fieldKey, value) {
    const idx = value === '' ? undefined : Number(value);
    setMapping((m) => ({ ...m, [fieldKey]: idx }));
  }

  function buildObjects() {
    const out = [];
    for (const row of rawRows) {
      const obj = {};
      for (const f of fields) {
        const idx = mapping[f.key];
        if (typeof idx === 'number') obj[f.key] = row[idx] ?? '';
      }
      out.push(obj);
    }
    return out;
  }

  async function handleImport() {
    const rows = buildObjects();
    if (!rows.length) return;
    try {
      if (typeof onImport === 'function') await onImport(rows);
      alert(`Imported ${rows.length} rows`);
    } catch (err) {
      alert(`Import failed: ${String(err?.message || err)}`);
    }
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div className="fw-semibold">Import CSV</div>
        {busy && <span className="spinner-border spinner-border-sm text-secondary" />}
      </div>
      <div className="card-body">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold">CSV file</label>
            <input type="file" accept=".csv,text/csv" className="form-control" onChange={onFileChange} />
            {fileName && <div className="form-text">Selected: {fileName}</div>}
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label fw-semibold">Delimiter</label>
            <select className="form-select" value={delimiter} onChange={()=>{}} disabled>
              <option>,</option>
            </select>
            <div className="form-text">Only comma is supported</div>
          </div>
        </div>

        {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}

        {hasData && (
          <div className="mt-4">
            <div className="fw-semibold mb-2">Map columns</div>
            <div className="row g-2">
              {fields.map((f) => (
                <div className="col-12 col-md-6 col-lg-4" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <select
                    className="form-select"
                    value={typeof mapping[f.key] === 'number' ? String(mapping[f.key]) : ''}
                    onChange={(e) => handleMapChange(f.key, e.target.value)}
                  >
                    <option value="">— ignore —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <div className="fw-semibold mb-2">Preview (first 5 rows)</div>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead className="table-light">
                    <tr>
                      {headers.map((h, i) => (<th key={i}>{h || `Column ${i + 1}`}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i}>
                        {headers.map((_, j) => (<td key={j}>{r[j] ?? ''}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="d-flex justify-content-end mt-3">
              <button className="btn btn-primary" onClick={handleImport} disabled={!rawRows.length}>Import</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

