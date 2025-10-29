// src/features/pipeline/Pipeline.jsx
import { useEffect, useMemo, useState } from 'react';
import ImportCSV from '@/components/ImportCSV.jsx';

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const STORAGE_KEY = 'crm:deals';

function loadDeals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = JSON.parse(raw || '[]');
    if (Array.isArray(arr)) return arr;
  } catch {}
  return [];
}

function saveDeals(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

export default function Pipeline() {
  const [deals, setDeals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', customer: '', stage: 'lead' });

  useEffect(() => { setDeals(loadDeals()); }, []);
  useEffect(() => { saveDeals(deals); }, [deals]);

  const columns = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s, []]));
    deals.forEach((d) => {
      const s = STAGES.includes(d.stage) ? d.stage : 'lead';
      map[s].push(d);
    });
    return map;
  }, [deals]);

  const kpis = useMemo(() => {
    const prob = (s) => ({ lead: 0.1, qualified: 0.25, proposal: 0.5, negotiation: 0.7, won: 1, lost: 0 }[s] ?? 0.2);
    const forecast = deals.reduce((acc, d) => acc + Number(d.amount || 0) * prob(d.stage), 0);
    const open = deals.filter((d) => !['won', 'lost'].includes(d.stage)).length;
    const won = deals.filter((d) => d.stage === 'won').reduce((acc, d) => acc + Number(d.amount || 0), 0);
    return { forecast, open, won };
  }, [deals]);

  function addDeal(e) {
    e?.preventDefault?.();
    if (!form.title) return;
    const d = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      amount: Number(form.amount || 0),
      customer: form.customer?.trim() || '',
      stage: STAGES.includes(form.stage) ? form.stage : 'lead',
      createdAt: Date.now(),
    };
    setDeals((prev) => [d, ...prev]);
    setForm({ title: '', amount: '', customer: '', stage: 'lead' });
    setShowForm(false);
  }

  function removeDeal(id) {
    if (!confirm('Delete deal?')) return;
    setDeals((prev) => prev.filter((d) => d.id !== id));
  }

  function moveDeal(id, dir) {
    setDeals((prev) => prev.map((d) => {
      if (d.id !== id) return d;
      const i = Math.max(0, Math.min(STAGES.length - 1, STAGES.indexOf(d.stage)));
      const j = Math.max(0, Math.min(STAGES.length - 1, i + dir));
      return { ...d, stage: STAGES[j] };
    }));
  }

  async function importDeals(rows) {
    const toDeal = (r) => ({
      id: crypto.randomUUID(),
      title: String(r.title || r.name || '').trim(),
      amount: Number(r.amount || 0),
      customer: String(r.customer || '').trim(),
      stage: STAGES.includes(String(r.stage || '').toLowerCase())
        ? String(r.stage).toLowerCase()
        : 'lead',
      createdAt: Date.now(),
    });
    const list = rows.map(toDeal).filter((d) => d.title);
    if (!list.length) return;
    setDeals((prev) => [...list, ...prev]);
    setShowImport(false);
  }

  return (
    <div className="container-fluid pipeline-board">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="m-0">Pipeline</h1>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => setShowImport((v) => !v)}>
            Import CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            + Add Deal
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-4 col-xl-2">
          <div className="p-3 border rounded-3 bg-light h-100">
            <div className="text-muted small">Open deals</div>
            <div className="fs-3 fw-bold">{kpis.open}</div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <div className="p-3 border rounded-3 bg-light h-100">
            <div className="text-muted small">Forecast (₪)</div>
            <div className="fs-3 fw-bold">{Math.round(kpis.forecast).toLocaleString('he-IL')}</div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <div className="p-3 border rounded-3 bg-light h-100">
            <div className="text-muted small">Won (₪)</div>
            <div className="fs-3 fw-bold">{Math.round(kpis.won).toLocaleString('he-IL')}</div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card mb-3">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>New Deal</strong>
            <button className="btn-close" onClick={() => setShowForm(false)} />
          </div>
          <div className="card-body">
            <form className="row g-3" onSubmit={addDeal}>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Title *</label>
                <input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Amount</label>
                <input type="number" className="form-control" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Customer</label>
                <input className="form-control" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
              </div>
              <div className="col-md-2">
                <label className="form-label fw-semibold">Stage</label>
                <select className="form-select" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 d-flex justify-content-end">
                <button className="btn btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div className="mb-3">
          <ImportCSV
            fields={[
              { key: 'title', label: 'Deal Title' },
              { key: 'amount', label: 'Amount' },
              { key: 'customer', label: 'Customer' },
              { key: 'stage', label: 'Stage' },
            ]}
            onImport={importDeals}
          />
        </div>
      )}

      <div className="row g-3">
        {STAGES.map((stage) => (
          <div key={stage} className="col-12 col-md-6 col-xl-2">
            <div className="card h-100">
              <div className="card-header text-capitalize d-flex justify-content-between align-items-center">
                <span className="fw-semibold">{stage}</span>
                <span className="badge text-bg-light">{columns[stage]?.length || 0}</span>
              </div>
              <div className="card-body d-grid gap-2">
                {(columns[stage] || []).map((d) => (
                  <div key={d.id} className="border rounded p-2 bg-light">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-semibold">{d.title}</div>
                        {!!d.customer && <div className="text-muted small">{d.customer}</div>}
                      </div>
                      <div className="ms-2 fw-semibold">₪{Number(d.amount || 0).toLocaleString('he-IL')}</div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <div className="btn-group">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => moveDeal(d.id, -1)} disabled={stage === STAGES[0]}>←</button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => moveDeal(d.id, +1)} disabled={stage === STAGES[STAGES.length - 1]}>→</button>
                      </div>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => removeDeal(d.id)}>Delete</button>
                    </div>
                  </div>
                ))}
                {!(columns[stage] || []).length && (
                  <div className="text-center text-muted small py-3">No deals</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
