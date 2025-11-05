import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { getDb, getBucket } from '@/lib/firebaseClient';

const STAGES = ['received', 'graphics', 'production', 'shipped'];
const STAGE_LABEL = {
  received: 'התקבלה',
  graphics: 'גרפיקה',
  production: 'ייצור',
  shipped: 'נשלחה',
};
const STORAGE_KEY = 'crm:order-pipeline';

function loadStageMap() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { return {}; }
}
function saveStageMap(map) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {}
}

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stageMap, setStageMap] = useState(loadStageMap());

  const stage = STAGES.includes(stageMap[id]) ? stageMap[id] : 'received';

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const db = getDb();
        if (!db) throw new Error('Firebase not configured');
        const ordersColl = import.meta.env.VITE_FIREBASE_ORDERS_COLLECTION || 'orders_prod';
        const usersColl = import.meta.env.VITE_FIREBASE_USERS_COLLECTION || 'users_prod';

        const oSnap = await getDoc(doc(db, ordersColl, id));
        if (!oSnap.exists()) throw new Error('Order not found');
        const oData = { id: oSnap.id, ...(oSnap.data() || {}) };
        if (abort) return; setOrder(oData);

        // Attempt to load customer by UID
        const uid = oData?.customer?.uid || oData?.userId || oData?.uid || null;
        if (uid) {
          try {
            const cSnap = await getDoc(doc(db, usersColl, uid));
            if (!abort && cSnap.exists()) setCustomer({ id: cSnap.id, ...(cSnap.data() || {}) });
          } catch {}
        }

        // Try load logos from Storage paths (supports nested per-product paths)
        try {
          const storage = getBucket();
          if (storage) {
            const urls = new Set();

            async function collectAll(path, max = 24) {
              try {
                const start = ref(storage, path);
                async function walk(prefixRef) {
                  if (urls.size >= max) return;
                  const res = await listAll(prefixRef);
                  // Prefer files named 'original' first
                  const sortedItems = (res.items || []).slice().sort((a,b)=>{
                    const an = (a.name||'').toLowerCase();
                    const bn = (b.name||'').toLowerCase();
                    const ap = an.includes('original') || an.includes('logo') ? -1 : 0;
                    const bp = bn.includes('original') || bn.includes('logo') ? -1 : 0;
                    return ap - bp;
                  });
                  for (const item of sortedItems) {
                    if (urls.size >= max) break;
                    try {
                      const u = await getDownloadURL(item);
                      urls.add(u);
                    } catch {}
                  }
                  for (const p of res.prefixes || []) {
                    if (urls.size >= max) break;
                    await walk(p);
                  }
                }
                await walk(start);
              } catch {}
            }

            const candidates = [];
            if (uid) {
              // Most specific: per order assets
              candidates.push(`users_prod/${uid}/orders_prod/${id}/assets`);
              candidates.push(`users_prod/${uid}/orders/${id}/assets`);
              // If folder under orders_prod is not the id (e.g., 'draft'), scan all
              candidates.push(`users_prod/${uid}/orders_prod`);
              // Fallbacks
              candidates.push(`users_prod/${uid}`);
              candidates.push(`logos/${uid}`);
            }
            // Order-scoped fallback
            candidates.push(`orders/${id}/logos`);

            for (const base of candidates) {
              if (urls.size >= 24) break;
              await collectAll(base, 24);
            }

            if (!abort) setLogos(Array.from(urls));
          }
        } catch {}
      } catch (e) {
        if (!abort) setError(e?.message || 'Failed to load order');
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [id]);

  const items = useMemo(() => Array.isArray(order?.items) ? order.items : [], [order]);

  function setStage(next) {
    setStageMap((prev) => { const m = { ...prev, [id]: next }; saveStageMap(m); return m; });
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="m-0">עסקה #{id?.slice(0,8)}</h1>
        <div className="d-flex gap-2 align-items-center">
          <span className="text-muted">Pipeline</span>
          <select className="form-select" style={{width:180}} value={stage} onChange={(e)=>setStage(e.target.value)}>
            {STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]||s}</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="text-muted">טוען…</div>}
      {!!error && <div className="alert alert-danger">{error}</div>}

      {order && (
        <div className="row g-3">
          <div className="col-12 col-lg-8">
            <div className="card">
              <div className="card-header fw-semibold">פרטי הזמנה</div>
              <div className="card-body">
                <div className="mb-2">מספר הזמנה: <b>{order.orderNumber || order.id}</b></div>
                <div className="mb-2 text-muted small">נוצר: {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('he-IL') : ''}</div>
                <hr/>
                <div className="fw-semibold mb-2">פריטים</div>
                {items.length ? (
                  <div className="d-grid gap-2">
                    {items.map((it, i) => (
                      <div key={i} className="border rounded p-2 bg-light d-flex justify-content-between">
                        <div>
                          <div className="fw-semibold">{it.name || it.productName || it.productId}</div>
                          <div className="text-muted small">כמות: {it.qty || it.quantity} | מחיר יח׳: {it.unitPrice || it.price}</div>
                        </div>
                        <div className="text-muted">{(it.qty||it.quantity||1) * (it.unitPrice||it.price||0)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="small bg-light p-2 rounded overflow-auto">{JSON.stringify(order.items || {}, null, 2)}</pre>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="card mb-3">
              <div className="card-header fw-semibold">פרטי לקוח</div>
              <div className="card-body">
                {customer ? (
                  <div className="d-grid gap-1">
                    <div className="fw-semibold">{customer.displayName || customer.name || customer.fullName || 'לקוח'}</div>
                    {customer.email && <div className="text-muted small">{customer.email}</div>}
                    {customer.phone && <div className="text-muted small">{customer.phone}</div>}
                    {customer.city && <div className="text-muted small">{customer.city}</div>}
                  </div>
                ) : (
                  <div className="text-muted small">לא נמצאו פרטי לקוח תואמים</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header fw-semibold">לוגואים מצורפים</div>
              <div className="card-body d-flex flex-wrap gap-2">
                {logos.length ? logos.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer">
                    <img src={u} alt="logo" className="thumb-40" />
                  </a>
                )) : <div className="text-muted small">אין קבצים</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
