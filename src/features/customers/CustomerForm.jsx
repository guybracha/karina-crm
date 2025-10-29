// src/features/customers/CustomerForm.jsx
import { useEffect, useState } from 'react';
import { TAGS, emptyCustomer } from '@/types/customer';
import UploadSingle from '../../components/UploadSingle';
import UploadMulti from '../../components/UploadMulti';
import { uploadCustomerLogo } from '@/lib/localApi';
import { resolveImageUrl } from '@/lib/localApi';

const CITIES_API =
  'https://data.gov.il/api/3/action/datastore_search?resource_id=d4901968-dad3-4845-a9b0-a57d027f11ab&limit=1272';
const LS_CITIES = 'crm:cities:list';

export default function CustomerForm({ defaultValues, onSubmit, onCancel }) {
  const [form, setForm] = useState(emptyCustomer());

  // === Cities state ===
  const [cities, setCities] = useState([]);           // array of strings (hebrew city names)
  const [loadingCities, setLoadingCities] = useState(false);
  const [cityError, setCityError] = useState(null);

  useEffect(() => {
    setForm(defaultValues ?? emptyCustomer());
  }, [defaultValues]);

  // Load cities from cache + refresh from API
  useEffect(() => {
    let abort = false;
    const cached = localStorage.getItem(LS_CITIES);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length) setCities(parsed);
      } catch {}
    }

    (async () => {
      setLoadingCities(true);
      setCityError(null);
      try {
        const res = await fetch(CITIES_API);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (abort) return;
        const names = Array.from(
          new Set(
            (data?.result?.records || [])
              .map((r) => (r['שם_ישוב'] || '').trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, 'he'));
        setCities(names);
        localStorage.setItem(LS_CITIES, JSON.stringify(names));
      } catch (err) {
        if (!abort) setCityError(err?.message || 'Error fetching cities');
        // לא חוסם — עדיין אפשר להקליד ידנית
      } finally {
        if (!abort) setLoadingCities(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, []);

  function change(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function submit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form className="row g-3" onSubmit={submit}>
      {/* לוגו לקוח */}
      <div className="col-12">
        <label className="form-label fw-bold">Customer Logo</label>
        <UploadSingle
          onUploaded={async (dataUrl, file) => {
            // If editing existing customer (has id), upload to server and store returned URL
            if (file && defaultValues?.id) {
              try {
                const serverUrl = await uploadCustomerLogo(defaultValues.id, file);
                setForm((prev) => ({ ...prev, logoUrl: serverUrl }));
                return;
              } catch {
                // Fallback to Data URL on failure
              }
            }
            // Create mode (no id) or fallback: store Data URL directly
            setForm((prev) => ({ ...prev, logoUrl: dataUrl }));
          }}
        />
        {form.logoUrl && (
          <img
            src={resolveImageUrl(form.logoUrl)}
            alt=""
            className="mt-2 rounded shadow-sm border"
            style={{ width: 72, height: 72, objectFit: 'cover' }}
          />
        )}
      </div>

      {/* תמונות להזמנה */}
      <div className="col-12">
        <label className="form-label fw-bold">Order Images</label>
        <UploadMulti
          onUploadedMany={(urls) =>
            setForm((prev) => ({
              ...prev,
              orderImageUrls: [...(prev.orderImageUrls ?? []), ...urls],
            }))
          }
        />
        {!!form.orderImageUrls?.length && (
          <div className="d-flex flex-wrap gap-2 mt-2">
            {form.orderImageUrls.map((u) => (
              <img
                key={u}
                src={u}
                alt=""
                className="rounded shadow-sm border"
                style={{ width: 72, height: 72, objectFit: 'cover' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* שם */}
      <div className="col-md-4">
        <label className="form-label fw-bold">Name *</label>
        <input
          name="name"
          className="form-control"
          value={form.name}
          onChange={change}
          required
        />
      </div>

      {/* אימייל */}
      <div className="col-md-4">
        <label className="form-label fw-bold">Email</label>
        <input
          name="email"
          className="form-control"
          value={form.email ?? ''}
          onChange={change}
        />
      </div>

      {/* טלפון */}
      <div className="col-md-4">
        <label className="form-label fw-bold">Phone</label>
        <input
          name="phone"
          className="form-control"
          value={form.phone ?? ''}
          onChange={change}
        />
      </div>

      {/* עיר — עם הצעות אוטומטיות מה־API */}
      <div className="col-md-4">
        <label className="form-label fw-bold d-flex align-items-center gap-2">
          City
          {loadingCities && (
            <span
              className="spinner-border spinner-border-sm text-secondary"
              role="status"
              aria-hidden="true"
            />
          )}
        </label>
        <input
          name="city"
          className="form-control"
          value={form.city ?? ''}
          onChange={change}
          list="city-list" // ← datalist
          placeholder="התחל להקליד ובחר מהרשימה"
          autoComplete="off"
        />
        <datalist id="city-list">
          {cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {cityError && (
          <div className="form-text text-danger">
            לא הצלחנו לטעון רשימת ערים ({String(cityError)}). אפשר להקליד ידנית.
          </div>
        )}
      </div>

      {/* תגית */}
      <div className="col-md-4">
        <label className="form-label fw-bold">Tag</label>
        <select
          name="tag"
          className="form-select"
          value={form.tag ?? ''}
          onChange={change}
        >
          <option value="">—</option>
          {TAGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* הערות */}
      <div className="col-12">
        <label className="form-label fw-bold">Notes</label>
        <textarea
          name="notes"
          rows={3}
          className="form-control"
          value={form.notes ?? ''}
          onChange={change}
        />
      </div>

      {/* כפתורים */}
      <div className="col-12 d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-primary btn-lg shadow-sm px-4">
          💾 Save
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-lg shadow-sm px-4"
            onClick={onCancel}
          >
            ✖ Cancel
          </button>
        )}
      </div>
    </form>
  );
}
