// src/features/pipeline/Pipeline.jsx
import { useEffect, useMemo, useState } from 'react';
import { cloudAvailable, listCloudOrders } from '@/lib/cloudApi';

// Temporary orders-based pipeline (client-only, persisted in localStorage)
const STAGES = ['received', 'graphics', 'production', 'shipped'];
const STAGE_LABEL = {
  received: 'ההזמנה התקבלה',
  graphics: 'מצב גרפיקה',
  production: 'מצב ביצוע',
  shipped: 'נשלח ליעדו',
};
const STORAGE_KEY = 'crm:order-pipeline'; // { [orderId]: stage }

function loadStageMap() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { return {}; }
}
function saveStageMap(map) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {}
}

export default function Pipeline() {
  const [orders, setOrders] = useState([]);
  const [stageMap, setStageMap] = useState({}); // orderId -> stage
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load orders from cloud when available
  useEffect(() => {
    let abort = false;
    setStageMap(loadStageMap());
    (async () => {
      setLoading(true); setError('');
      try {
        if (!cloudAvailable()) { setOrders([]); setError('Cloud data not available.'); return; }
        const list = await listCloudOrders();
        if (abort) return;
        setOrders(Array.isArray(list) ? list : []);
        // initialize missing stages to 'received'
        const map = { ...loadStageMap() };
        for (const o of list || []) {
          if (!map[o.id]) map[o.id] = 'received';
        }
        setStageMap(map);
        saveStageMap(map);
      } catch (e) {
        if (!abort) setError('Failed to load orders');
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  function setOrderStage(id, stage) {
    setStageMap((prev) => {
      const next = { ...prev, [id]: stage };
      saveStageMap(next);
      return next;
    });
  }
  function move(id, dir) {
    const s = stageMap[id] || 'received';
    const i = Math.max(0, Math.min(STAGES.length - 1, STAGES.indexOf(s)));
    const j = Math.max(0, Math.min(STAGES.length - 1, i + dir));
    setOrderStage(id, STAGES[j]);
  }

  const columns = useMemo(() => {
    const map = Object.fromEntries(STAGES.map(s => [s, []]));
    for (const o of orders) {
      const st = STAGES.includes(stageMap[o.id]) ? stageMap[o.id] : 'received';
      map[st].push(o);
    }
    return map;
  }, [orders, stageMap]);

  return (
    <div className="container-fluid pipeline-board">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="m-0">Pipeline</h1>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>

      {loading && <div className="text-muted">Loading orders…</div>}
      {!!error && <div className="alert alert-warning py-2 my-2">{error}</div>}

      <div className="row g-3">
        {STAGES.map((stage) => (
          <div key={stage} className="col-12 col-md-6 col-xl-3">
            <div className="card h-100">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span className="fw-semibold">{STAGE_LABEL[stage] || stage}</span>
                <span className="badge text-bg-light">{columns[stage]?.length || 0}</span>
              </div>
              <div className="card-body d-grid gap-2">
                {(columns[stage] || []).map((o) => (
                  <div key={o.id} className="border rounded p-2 bg-light">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-semibold">הזמנה #{String(o.id).slice(0,8)}</div>
                        <div className="text-muted small">
                          {o.userId ? `לקוח: ${o.userId}` : 'לקוח לא ידוע'} · סכום: {Number(o.amount||0).toLocaleString('he-IL')}
                        </div>
                        {o.createdAt && (
                          <div className="text-muted small">תאריך: {new Date(o.createdAt).toLocaleDateString('he-IL')}</div>
                        )}
                      </div>
                      <div className="ms-2 small text-muted text-uppercase">{stage}</div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <div className="btn-group">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => move(o.id, -1)} disabled={stage === STAGES[0]}>←</button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => move(o.id, +1)} disabled={stage === STAGES[STAGES.length - 1]}>→</button>
                      </div>
                      {stage !== 'shipped' ? (
                        <button className="btn btn-sm btn-outline-success" onClick={() => setOrderStage(o.id, 'shipped')}>סמן כנשלח</button>
                      ) : (
                        <span className="badge text-bg-success">נשלח</span>
                      )}
                    </div>
                  </div>
                ))}
                {!(columns[stage] || []).length && (
                  <div className="text-center text-muted small py-3">אין פריטים</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

