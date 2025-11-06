import { useEffect, useMemo, useState } from 'react';
import { listCustomers } from '@/lib/localApi.js';
import { createCrmOrderForUser } from '@/services/ordersExtra';
import { useNavigate } from 'react-router-dom';

export default function OrderCreate() {
  const nav = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerId: '', status: 'initiated', notes: '', items: [{ productId: '', qty: 1, unitPrice: 0 }] });

  useEffect(() => {
    (async () => {
      try {
        const list = await listCustomers();
        setCustomers(Array.isArray(list) ? list : []);
        if (!form.customerId && list?.[0]?.id) setForm((f) => ({ ...f, customerId: String(list[0].id) }));
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const CURRENCY = (import.meta?.env && import.meta.env.VITE_CURRENCY) ? import.meta.env.VITE_CURRENCY : 'ILS';
  const fmtCurrency = useMemo(() => new Intl.NumberFormat('he-IL', { style: 'currency', currency: CURRENCY }), [CURRENCY]);
  const orderTotal = useMemo(() => (form.items || []).reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.unitPrice || 0), 0), [form.items]);

  async function onSave() {
    try {
      setSaving(true); setError('');
      const items = (form.items || []).map((it) => ({ productId: String(it.productId || 'item'), qty: Number(it.qty || 1), unitPrice: Number(it.unitPrice || 0) }));
      const selected = customers.find((c) => String(c.id) === String(form.customerId));
      const uid = selected?.firebaseUid ? String(selected.firebaseUid) : String(form.customerId);
      await createCrmOrderForUser(uid, items, form.status, {}, form.notes || '');
      nav('/orders');
    } catch (e) {
      const code = (e && (e.code || e.errorCode)) ? String(e.code || e.errorCode) : '';
      const msg = e?.message ? String(e.message) : 'Failed to create order';
      setError([code && `(${code})`, msg].filter(Boolean).join(' '));
    } finally { setSaving(false); }
  }

  return (
    <div className="container py-3">
      <h1 className="mb-3">הוספת הזמנה</h1>
      {!!error && <div className="alert alert-danger">{error}</div>}
      <div className="card">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-4">
              <label className="form-label">לקוח (UID)</label>
              <select className="form-select" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                {customers.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name || c.id}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">סטטוס</label>
              <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="initiated">initiated</option>
                <option value="pending_payment">pending_payment</option>
                <option value="draft">draft</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">פריטים</label>
              <div className="d-grid gap-2">
                {form.items.map((it, idx) => {
                  const lineTotal = Number(it.qty || 0) * Number(it.unitPrice || 0);
                  return (
                    <div key={idx} className="row g-2">
                      <div className="col-12 col-md-4">
                        <label className="form-label">תיאור/מק״ט</label>
                        <input className="form-control" placeholder="לדוגמה: חולצת לוגו" value={it.productId}
                          onChange={(e) => { const items = form.items.slice(); items[idx] = { ...items[idx], productId: e.target.value }; setForm({ ...form, items }); }} />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">כמות</label>
                        <input type="number" min="1" step="1" className="form-control" value={it.qty}
                          onChange={(e) => { const items = form.items.slice(); items[idx] = { ...items[idx], qty: Number(e.target.value || 1) }; setForm({ ...form, items }); }} />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">מחיר ליחידה</label>
                        <input type="number" min="0" step="0.01" className="form-control" value={it.unitPrice}
                          onChange={(e) => { const items = form.items.slice(); items[idx] = { ...items[idx], unitPrice: Number(e.target.value || 0) }; setForm({ ...form, items }); }} />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">סה״כ</label>
                        <div className="form-control" style={{background:'#f8f9fa'}}>{new Intl.NumberFormat('he-IL', { style: 'currency', currency: (import.meta?.env && import.meta.env.VITE_CURRENCY) ? import.meta.env.VITE_CURRENCY : 'ILS' }).format(lineTotal)}</div>
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">&nbsp;</label>
                        <button type="button" className="btn btn-outline-danger w-100" onClick={() => {
                          const items = form.items.slice(); items.splice(idx, 1); setForm({ ...form, items: items.length ? items : [{ productId: '', qty: 1, unitPrice: 0 }] });
                        }}>מחק</button>
                      </div>
                    </div>
                  );
                })}
                <div className="d-flex justify-content-between align-items-center">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setForm((f) => ({ ...f, items: [...f.items, { productId: '', qty: 1, unitPrice: 0 }] }))}>הוסף פריט</button>
                  <div className="fw-semibold">סה"כ הזמנה: {new Intl.NumberFormat('he-IL', { style: 'currency', currency: (import.meta?.env && import.meta.env.VITE_CURRENCY) ? import.meta.env.VITE_CURRENCY : 'ILS' }).format(orderTotal)}</div>
                </div>
              </div>
            </div>
            <div className="col-12">
              <label className="form-label">הערות</label>
              <textarea className="form-control" rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="col-12 d-flex gap-2">
              <button className="btn btn-success" disabled={saving || !form.customerId || !form.items.length || form.items.some(it => !String(it.productId||'').trim())} onClick={onSave}>שמור הזמנה</button>
              <button className="btn btn-secondary" type="button" onClick={() => nav(-1)}>בטל</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
