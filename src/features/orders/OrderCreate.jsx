// src/features/orders/OrderCreate.jsx
import { useEffect, useMemo, useState } from 'react';
import { listCustomers } from '@/lib/localApi.js';
import { PRODUCT_OPTIONS } from '@/lib/productOptions';
import { createCrmOrderForUser } from '@/services/ordersExtra';
import { useNavigate } from 'react-router-dom';

export default function OrderCreate() {
  const nav = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customerId: '',
    status: 'initiated',
    notes: '',
    items: [{ productId: '', qty: 1, unitPrice: 0 }],
  });

  // טענת רשימת הלקוחות ל-select
  useEffect(() => {
    (async () => {
      try {
        const list = await listCustomers();
        const safe = Array.isArray(list) ? list : [];
        setCustomers(safe);
        // בחירת הלקוח הראשון כברירת מחדל
        if (!form.customerId && safe?.[0]?.id) {
          setForm((f) => ({ ...f, customerId: String(safe[0].id) }));
        }
      } catch (e) {
        console.error('listCustomers failed', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const CURRENCY =
    (import.meta?.env && import.meta.env.VITE_CURRENCY)
      ? import.meta.env.VITE_CURRENCY
      : 'ILS';

  const fmtCurrency = useMemo(
    () => new Intl.NumberFormat('he-IL', { style: 'currency', currency: CURRENCY }),
    [CURRENCY]
  );

  const orderTotal = useMemo(
    () =>
      (form.items || []).reduce(
        (sum, it) =>
          sum + Number(it.qty || 0) * Number(it.unitPrice || 0),
        0
      ),
    [form.items]
  );

  const productMap = useMemo(() => {
    const map = new Map();
    (PRODUCT_OPTIONS || []).forEach((item) => {
      if (!item) return;
      if (item.slug) map.set(String(item.slug).toLowerCase(), item);
      if (item.name) map.set(String(item.name).toLowerCase(), item);
    });
    return map;
  }, []);

  function handleProductChange(idx, value) {
    const items = form.items.slice();
    const next = { ...items[idx], productId: value };
    const key = String(value || '').trim().toLowerCase();
    if (key && productMap.has(key)) {
      const option = productMap.get(key);
      if (
        option &&
        option.price != null &&
        (!Number(next.unitPrice) || Number(next.unitPrice) === 0)
      ) {
        next.unitPrice = Number(option.price);
      }
    }
    items[idx] = next;
    setForm({ ...form, items });
  }

  async function onSave() {
    try {
      setSaving(true);
      setError('');

      // ניקוי פריטים
      const items = (form.items || []).map((it) => ({
        productId: String(it.productId || 'item').trim(),
        qty: Number(it.qty || 1),
        unitPrice: Number(it.unitPrice || 0),
      }));

      // מציאת הלקוח מתוך הרשימה
      const selected = customers.find(
        (c) => String(c.id) === String(form.customerId)
      );

      if (!selected) {
        throw new Error('לא נמצא לקוח מתאים (customerId שגוי)');
      }

      // אם יש firebaseUid – נשתמש בו, אחרת נ fallback ל-id
      const uid = selected.firebaseUid
        ? String(selected.firebaseUid)
        : String(form.customerId);

      console.log('createCrmOrderForUser uid:', uid, 'items:', items);

      await createCrmOrderForUser(
        uid,
        items,
        form.status,
        {},
        form.notes || ''
      );

      nav('/orders');
    } catch (e) {
      console.error('onSave error', e);
      const code = (e && (e.code || e.errorCode)) ? String(e.code || e.errorCode) : '';
      const msg = e?.message ? String(e.message) : 'Failed to create order';
      setError([code && `(${code})`, msg].filter(Boolean).join(' '));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-3">
      <h1 className="mb-3">הוספת הזמנה</h1>

      {!!error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="card-body">
          <div className="row g-2 align-items-end">

            {/* בחירת לקוח */}
            <div className="col-12 col-md-4">
              <label className="form-label">לקוח (UID)</label>
              <select
                className="form-select"
                value={form.customerId}
                onChange={(e) =>
                  setForm({ ...form, customerId: e.target.value })
                }
              >
                {customers.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name || c.id}
                  </option>
                ))}
              </select>
            </div>

            {/* סטטוס */}
            <div className="col-12 col-md-3">
              <label className="form-label">סטטוס</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value })
                }
              >
                <option value="initiated">initiated</option>
                <option value="pending_payment">pending_payment</option>
                <option value="draft">draft</option>
              </select>
            </div>

            {/* פריטים */}
            <div className="col-12">
              <label className="form-label">פריטים</label>
              <div className="d-grid gap-2">
                {form.items.map((it, idx) => {
                  const lineTotal =
                    Number(it.qty || 0) * Number(it.unitPrice || 0);
                  return (
                    <div key={idx} className="row g-2">
                      <div className="col-12 col-md-4">
                        <label className="form-label">תיאור/מק״ט</label>
                        <input
                          className="form-control"
                          placeholder="לדוגמה: חולצת לוגו"
                          list="product-options"
                          value={it.productId}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                        />
                      </div>

                      <div className="col-6 col-md-2">
                        <label className="form-label">כמות</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="form-control"
                          value={it.qty}
                          onChange={(e) => {
                            const items = form.items.slice();
                            items[idx] = {
                              ...items[idx],
                              qty: Number(e.target.value || 1),
                            };
                            setForm({ ...form, items });
                          }}
                        />
                      </div>

                      <div className="col-6 col-md-2">
                        <label className="form-label">מחיר ליחידה</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control"
                          value={it.unitPrice}
                          onChange={(e) => {
                            const items = form.items.slice();
                            items[idx] = {
                              ...items[idx],
                              unitPrice: Number(e.target.value || 0),
                            };
                            setForm({ ...form, items });
                          }}
                        />
                      </div>

                      <div className="col-6 col-md-2">
                        <label className="form-label">סה״כ</label>
                        <div
                          className="form-control"
                          style={{ background: '#f8f9fa' }}
                        >
                          {fmtCurrency.format(lineTotal)}
                        </div>
                      </div>

                      <div className="col-6 col-md-2">
                        <label className="form-label">&nbsp;</label>
                        <button
                          type="button"
                          className="btn btn-outline-danger w-100"
                          onClick={() => {
                            const items = form.items.slice();
                            items.splice(idx, 1);
                            setForm({
                              ...form,
                              items: items.length
                                ? items
                                : [{ productId: '', qty: 1, unitPrice: 0 }],
                            });
                          }}
                        >
                          מחק
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="d-flex justify-content-between align-items-center">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        items: [
                          ...f.items,
                          { productId: '', qty: 1, unitPrice: 0 },
                        ],
                      }))
                    }
                  >
                    הוסף פריט
                  </button>
                  <div className="fw-semibold">
                    סה"כ הזמנה: {fmtCurrency.format(orderTotal)}
                  </div>
                </div>
              </div>
              <datalist id="product-options">
                {PRODUCT_OPTIONS.map((p) => (
                  <option
                    key={p.slug || p.name}
                    value={p.name}
                    label={
                      p.price != null
                        ? `${p.name} · ${fmtCurrency.format(Number(p.price) || 0)}`
                        : p.name
                    }
                  />
                ))}
              </datalist>
            </div>

            {/* הערות */}
            <div className="col-12">
              <label className="form-label">הערות</label>
              <textarea
                className="form-control"
                rows="2"
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
              />
            </div>

            {/* כפתורים */}
            <div className="col-12 d-flex gap-2">
              <button
                className="btn btn-success"
                disabled={
                  saving ||
                  !form.customerId ||
                  !form.items.length ||
                  form.items.some(
                    (it) => !String(it.productId || '').trim()
                  )
                }
                onClick={onSave}
              >
                שמור הזמנה
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => nav(-1)}
              >
                בטל
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
