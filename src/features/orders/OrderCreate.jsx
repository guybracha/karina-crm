// src/features/orders/OrderCreate.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCustomers } from '@/lib/localApi.js';
import { PRODUCT_OPTIONS } from '@/lib/productOptions';
import { priceForItem } from '@/lib/pricing';
import { createCrmOrderForUser } from '@/services/ordersExtra';

const STATUS_OPTIONS = [
  { value: 'initiated', label: 'הוזן במערכת' },
  { value: 'pending_payment', label: 'ממתין לתשלום' },
  { value: 'draft', label: 'טיוטה' },
];

const SHIPPING_OPTIONS = [
  { value: 'pickup', label: 'איסוף עצמי (ללא חיוב)', defaultCost: 0 },
  { value: 'delivery', label: 'שליחות עד הבית', defaultCost: 35 },
  { value: 'express', label: 'שליחות אקספרס (יום עסקים אחד)', defaultCost: 65 },
];

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });

const createBlankItem = () => ({
  id:
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  slug: '',
  name: '',
  color: '',
  size: '',
  qty: 1,
  unitPrice: 0,
  notes: '',
});

const initialShipping = SHIPPING_OPTIONS[0];

export default function OrderCreate() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState({ form: [], items: [] });

  const [form, setForm] = useState({
    customerId: '',
    status: STATUS_OPTIONS[0].value,
    items: [createBlankItem()],
    notes: '',
    shippingMethod: initialShipping.value,
    shippingLabel: initialShipping.label,
    shippingCost: initialShipping.defaultCost,
    shippingCity: '',
    shippingStreet: '',
    shippingHouse: '',
    shippingContactName: '',
    shippingContactPhone: '',
    shippingContactEmail: '',
  });

  const productMap = useMemo(() => {
    const map = new Map();
    PRODUCT_OPTIONS.forEach((p) => map.set(p.slug, p));
    return map;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await listCustomers();
        if (!mounted) return;
        const safe = Array.isArray(list) ? list : [];
        setCustomers(safe);
        if (!form.customerId && safe[0]?.id) {
          setForm((prev) => ({ ...prev, customerId: String(safe[0].id) }));
        }
      } catch (err) {
        console.error('listCustomers failed', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const rows = form.items
      .map((item) => {
        const slug = item.slug || '';
        if (!slug) return null;
        try {
          const priced = priceForItem({ slug, qty: item.qty, price: item.unitPrice }, PRODUCT_OPTIONS);
          const meta = productMap.get(slug);
          return {
            ...priced,
            name: item.name?.trim() || meta?.name || slug,
            color: item.color?.trim() || '',
            size: item.size?.trim() || '',
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    const merchandise = rows.reduce((sum, row) => sum + row.lineTotal, 0);
    const saved = rows.reduce((sum, row) => sum + Math.max(0, row.baseUnit * row.qty - row.lineTotal), 0);
    const shipping = Number(form.shippingCost) || 0;
    return {
      rows,
      merchandise: Math.round(merchandise * 100) / 100,
      saved: Math.round(saved * 100) / 100,
      shipping,
      grandTotal: Math.round((merchandise + shipping) * 100) / 100,
    };
  }, [form.items, form.shippingCost, productMap]);

  function updateItem(idx, patch) {
    setForm((prev) => {
      const items = prev.items.map((item, itemIdx) => (itemIdx === idx ? { ...item, ...patch } : item));
      return { ...prev, items };
    });
  }

  function handleProductChange(idx, slug) {
    const product = productMap.get(slug) || null;
    updateItem(idx, {
      slug,
      name: product?.name || '',
      unitPrice: product?.price ?? 0,
    });
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, createBlankItem()] }));
  }

  function removeItem(idx) {
    setForm((prev) => {
      const items = prev.items.filter((_, itemIdx) => itemIdx !== idx);
      return { ...prev, items: items.length ? items : [createBlankItem()] };
    });
  }

  function handleShippingMethodChange(value) {
    const option = SHIPPING_OPTIONS.find((opt) => opt.value === value) || SHIPPING_OPTIONS[0];
    setForm((prev) => ({
      ...prev,
      shippingMethod: option.value,
      shippingLabel: option.label,
      shippingCost: option.defaultCost,
    }));
  }

  function validateForm() {
    const issues = { form: [], items: [] };
    const sanitizedItems = [];
    const customer = customers.find((c) => String(c.id) === String(form.customerId));

    if (!customer) {
      issues.form.push('יש לבחור לקוח מהרשימה.');
    }
    if (!STATUS_OPTIONS.some((st) => st.value === form.status)) {
      issues.form.push('סטטוס ההזמנה אינו תקין.');
    }
    if (!form.items.length) {
      issues.form.push('הוסף לפחות פריט אחד להזמנה.');
    }

    issues.items = form.items.map((item) => {
      const rowErrors = [];
      const slug = (item.slug || '').trim();
      const qty = Math.trunc(Number(item.qty));
      const price = Number(item.unitPrice);

      if (!slug) rowErrors.push('בחר מוצר מרשימת המוצרים.');
      if (!Number.isInteger(qty) || qty < 1 || qty > 999) rowErrors.push('כמות חייבת להיות בין 1 ל-999.');
      if (!Number.isFinite(price) || price < 0 || price > 100000) rowErrors.push('מחיר ליחידה חייב להיות בין 0 ל-100,000 ₪.');

      if (!rowErrors.length) {
        const meta = productMap.get(slug);
        const priced = priceForItem({ slug, qty, price }, PRODUCT_OPTIONS);
        sanitizedItems.push({
          productId: slug,
          slug,
          name: item.name?.trim() || meta?.name || slug,
          qty,
          unitPrice: Number(price.toFixed(2)),
          color: item.color?.trim() || null,
          size: item.size?.trim() || null,
          notes: item.notes?.trim() || null,
          baseUnit: priced.baseUnit,
          discountPct: priced.discountPct,
          lineTotal: priced.lineTotal,
        });
      }
      return rowErrors;
    });

    const shippingCost = Number(form.shippingCost);
    if (!Number.isFinite(shippingCost) || shippingCost < 0) {
      issues.form.push('עלות משלוח חייבת להיות מספר חיובי.');
    }
    const contactName = form.shippingContactName.trim();
    const phoneRaw = form.shippingContactPhone.trim();
    const phoneDigits = phoneRaw.replace(/\D/g, '');
    if (!contactName) issues.form.push('יש להזין שם איש קשר למשלוח.');
    if (phoneDigits.length < 7) issues.form.push('מספר הטלפון למשלוח קצר מדי.');

    const needsAddress = form.shippingMethod !== 'pickup';
    const city = form.shippingCity.trim();
    const street = form.shippingStreet.trim();
    const house = form.shippingHouse.trim();
    if (needsAddress) {
      if (!city) issues.form.push('יש להזין עיר למשלוח.');
      if (!street) issues.form.push('יש להזין רחוב למשלוח.');
      if (!house) issues.form.push('יש להזין מספר בית.');
    }

    const option = SHIPPING_OPTIONS.find((opt) => opt.value === form.shippingMethod) || SHIPPING_OPTIONS[0];
    const shippingPayload = {
      method: form.shippingMethod,
      label: form.shippingLabel?.trim() || option.label,
      cost: Math.round(Math.max(0, shippingCost) * 100) / 100,
      contact: {
        name: contactName || null,
        phoneRaw: phoneRaw || null,
        phoneDigits: phoneDigits || null,
        email: form.shippingContactEmail.trim() || null,
      },
      address: {
        city: city || null,
        street: street || null,
        house: house || null,
      },
    };

    const ok = !issues.form.length && issues.items.every((row) => row.length === 0);
    return { ok, issues, sanitizedItems, shippingPayload, customer };
  }

  async function handleSave() {
    setError('');
    const result = validateForm();
    setValidation(result.issues);
    if (!result.ok) return;

    const customer = result.customer;
    const uid = customer?.firebaseUid ? String(customer.firebaseUid) : String(form.customerId);

    try {
      setSaving(true);
      await createCrmOrderForUser(uid, result.sanitizedItems, form.status, result.shippingPayload, form.notes.trim());
      navigate('/orders');
    } catch (err) {
      console.error('onSave error', err);
      const code = err?.code || err?.errorCode || '';
      setError([code && `(${code})`, err?.message || 'שמירת ההזמנה נכשלה'].filter(Boolean).join(' '));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-4">
      <h1 className="mb-4">יצירת הזמנה חדשה</h1>

      {error && <div className="alert alert-danger">{error}</div>}
      {validation.form.length > 0 && (
        <div className="alert alert-warning">
          <ul className="mb-0">
            {validation.form.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">לקוח (UID)</label>
                  <select
                    className="form-select"
                    value={form.customerId}
                    onChange={(e) => setForm((prev) => ({ ...prev, customerId: e.target.value }))}
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name || c.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">סטטוס</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <hr className="my-4" />

              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">שם איש קשר</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.shippingContactName}
                    onChange={(e) => setForm((prev) => ({ ...prev, shippingContactName: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">טלפון</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={form.shippingContactPhone}
                    onChange={(e) => setForm((prev) => ({ ...prev, shippingContactPhone: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">אימייל (אופציונלי)</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.shippingContactEmail}
                    onChange={(e) => setForm((prev) => ({ ...prev, shippingContactEmail: e.target.value }))}
                  />
                </div>
              </div>

              <div className="row g-3 mt-1">
                <div className="col-md-4">
                  <label className="form-label">שיטת משלוח</label>
                  <select
                    className="form-select"
                    value={form.shippingMethod}
                    onChange={(e) => handleShippingMethodChange(e.target.value)}
                  >
                    {SHIPPING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">עלות משלוח</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    step="1"
                    value={form.shippingCost}
                    onChange={(e) => setForm((prev) => ({ ...prev, shippingCost: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">תיאור למשלוח</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.shippingLabel}
                    onChange={(e) => setForm((prev) => ({ ...prev, shippingLabel: e.target.value }))}
                  />
                </div>
              </div>

              {form.shippingMethod !== 'pickup' && (
                <div className="row g-3 mt-1">
                  <div className="col-md-4">
                    <label className="form-label">עיר</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.shippingCity}
                      onChange={(e) => setForm((prev) => ({ ...prev, shippingCity: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label">רחוב</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.shippingStreet}
                      onChange={(e) => setForm((prev) => ({ ...prev, shippingStreet: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">מס׳ בית</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.shippingHouse}
                      onChange={(e) => setForm((prev) => ({ ...prev, shippingHouse: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="m-0">פריטי הזמנה</h5>
                <button type="button" className="btn btn-outline-primary" onClick={addItem}>
                  הוספת פריט
                </button>
              </div>

              {form.items.map((item, idx) => {
                const rowErrors = validation.items[idx] || [];
                let line;
                if ((item.slug || '').trim()) {
                  try {
                    line = priceForItem(
                      { slug: item.slug, qty: item.qty, price: item.unitPrice },
                      PRODUCT_OPTIONS
                    );
                  } catch {
                    line = null;
                  }
                }
                return (
                  <div key={item.id} className="border rounded p-3 mb-3">
                    <div className="row g-3 align-items-end">
                      <div className="col-lg-4 col-md-6">
                        <label className="form-label">מוצר</label>
                        <select
                          className="form-select"
                          value={item.slug}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                        >
                          <option value="">בחר מוצר...</option>
                          {PRODUCT_OPTIONS.map((p) => (
                            <option key={p.slug} value={p.slug}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-lg-4 col-md-6">
                        <label className="form-label">תיאור על גבי החשבונית</label>
                        <input
                          type="text"
                          className="form-control"
                          value={item.name}
                          onChange={(e) => updateItem(idx, { name: e.target.value })}
                        />
                      </div>
                      <div className="col-md-2 col-6">
                        <label className="form-label">צבע</label>
                        <input
                          type="text"
                          className="form-control"
                          value={item.color}
                          onChange={(e) => updateItem(idx, { color: e.target.value })}
                        />
                      </div>
                      <div className="col-md-2 col-6">
                        <label className="form-label">מידה</label>
                        <input
                          type="text"
                          className="form-control"
                          value={item.size}
                          onChange={(e) => updateItem(idx, { size: e.target.value })}
                        />
                      </div>
                      <div className="col-md-2 col-6">
                        <label className="form-label">כמות</label>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          className="form-control"
                          value={item.qty}
                          onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                        />
                      </div>
                      <div className="col-md-2 col-6">
                        <label className="form-label">מחיר ליחידה</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          className="form-control"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                        />
                      </div>
                      <div className="col-md-3 col-6">
                        <label className="form-label">סה"כ שורה</label>
                        <div className="form-control bg-light" readOnly>
                          {line ? currency.format(line.lineTotal) : currency.format(0)}
                        </div>
                      </div>
                      <div className="col-md-9">
                        <label className="form-label">הערות לפריט (אופציונלי)</label>
                        <textarea
                          className="form-control"
                          rows="1"
                          value={item.notes}
                          onChange={(e) => updateItem(idx, { notes: e.target.value })}
                        />
                      </div>
                      <div className="col-12 text-end">
                        <button type="button" className="btn btn-outline-danger" onClick={() => removeItem(idx)}>
                          הסרת פריט
                        </button>
                      </div>
                    </div>
                    {rowErrors.length > 0 && (
                      <div className="text-danger small mt-2">
                        {rowErrors.join(' • ')}
                      </div>
                    )}
                  </div>
                );
              })}

              <label className="form-label">הערות כלליות להזמנה</label>
              <textarea
                className="form-control"
                rows="2"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="mb-3">סיכום הזמנה</h5>
              {summary.rows.length === 0 && <p className="text-muted mb-0">עדיין לא נבחרו פריטים.</p>}
              {summary.rows.length > 0 && (
                <ul className="list-group list-group-flush mb-3">
                  {summary.rows.map((row, idx) => (
                    <li key={idx} className="list-group-item">
                      <div className="d-flex justify-content-between">
                        <div>
                          <div className="fw-semibold">{row.name}</div>
                          <div className="text-muted small">
                            {row.qty} יח׳ • {currency.format(row.unitAfter)}
                            {row.color ? ` • צבע: ${row.color}` : ''}
                            {row.size ? ` • מידה: ${row.size}` : ''}
                          </div>
                        </div>
                        <div className="fw-semibold">{currency.format(row.lineTotal)}</div>
                      </div>
                      {row.discountPct > 0 && (
                        <div className="text-success small mt-1">
                          חיסכון {currency.format(row.baseUnit * row.qty - row.lineTotal)} ({Math.round(row.discountPct * 100)}%)
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="d-flex justify-content-between mb-1">
                <span>סה"כ פריטים</span>
                <strong>{currency.format(summary.merchandise)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span>עלות משלוח</span>
                <strong>{currency.format(summary.shipping)}</strong>
              </div>
              <div className="d-flex justify-content-between text-success mb-2">
                <span>חיסכון מצטבר</span>
                <strong>{currency.format(summary.saved)}</strong>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <span>סה"כ לתשלום</span>
                <strong className="fs-5">{currency.format(summary.grandTotal)}</strong>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2 mt-4">
            <button
              type="button"
              className="btn btn-success flex-grow-1"
              disabled={saving}
              onClick={handleSave}
            >
              שמירת ההזמנה
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
