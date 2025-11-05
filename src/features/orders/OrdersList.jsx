// src/features/orders/OrdersList.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cloudAvailable, listCloudOrders, getCloudStatus } from '@/lib/cloudApi';

// Pipeline stages (client-only, persisted in localStorage like Pipeline/OrderDetails)
const STAGES = ['received', 'graphics', 'production', 'shipped'];
const STAGE_LABEL = {
  received: 'נקלט',
  graphics: 'גרפיקה',
  production: 'ייצור',
  shipped: 'נשלח',
};
const STORAGE_KEY = 'crm:order-pipeline'; // { [orderId]: stage }

function loadStageMap() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { return {}; }
}

export default function OrdersList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [stageMap, setStageMap] = useState(loadStageMap());

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true); setError('');
      try {
        if (!cloudAvailable()) { setRows([]); setError('Firebase config missing'); return; }
        const list = await listCloudOrders();
        if (!abort) setRows(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!abort) setError(e?.message || 'Failed to load orders');
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // Keep pipeline stages in sync when returning to this view
  useEffect(() => {
    function sync() { setStageMap(loadStageMap()); }
    window.addEventListener('focus', sync);
    const t = setTimeout(sync, 0);
    return () => { window.removeEventListener('focus', sync); clearTimeout(t); };
  }, []);

  const filtered = useMemo(() => {
    const f = filter.toLowerCase();
    return (rows || []).filter(o =>
      String(o.id || '').toLowerCase().includes(f) ||
      String(o.userId || '').toLowerCase().includes(f)
    );
  }, [rows, filter]);

  const cloudStatus = getCloudStatus();

  return (
    <div className="container py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="m-0">הזמנות</h1>
        <input className="form-control w-auto" placeholder="חיפוש" value={filter} onChange={e=>setFilter(e.target.value)} />
      </div>

      <div className="mb-3">
        <Link to="/orders/new" className="btn btn-primary">הוסף הזמנה</Link>
      </div>
      {cloudStatus?.code === 'permission-denied' && (
        <div className="alert alert-danger" role="alert">אין הרשאה לגשת ל-Firestore (permission-denied).</div>
      )}

      {loading && <div className="text-muted">טוען הזמנות…</div>}
      {!!error && <div className="alert alert-warning">{error}</div>}

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>הזמנה</th>
              <th>UID משתמש</th>
              <th>סכום</th>
              <th>נוצר</th>
              <th>סטטוס</th>
              <th style={{width:160}}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td className="fw-semibold">{String(o.id).slice(0,12)}</td>
                <td className="text-muted small">{o.userId || '—'}</td>
                <td>{Number(o.amount||0).toLocaleString('he-IL')}</td>
                <td>{o.createdAt ? new Date(o.createdAt).toLocaleString('he-IL') : '—'}</td>
                <td>
                  {(() => {
                    const s = STAGES.includes(stageMap[o.id]) ? stageMap[o.id] : 'received';
                    const label = STAGE_LABEL[s] || s;
                    const cls = s === 'shipped' ? 'text-bg-success' : s === 'production' ? 'text-bg-warning' : s === 'graphics' ? 'text-bg-info' : 'text-bg-light';
                    return <span className={`badge ${cls}`}>{label}</span>;
                  })()}
                </td>
                <td className="text-end">
                  <Link to={`/orders/${o.id}`} className="btn btn-sm btn-outline-primary">פרטים</Link>
                </td>
              </tr>
            ))}
            {!filtered.length && !loading && (
              <tr><td colSpan={6} className="text-center text-muted py-4">אין הזמנות</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}








