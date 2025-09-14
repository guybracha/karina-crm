// src/features/customers/CustomerForm.jsx
import { useEffect, useState } from 'react';
import { TAGS, emptyCustomer } from '@/types/customer';
import UploadSingle from '../../components/UploadSingle';
import UploadMulti from '../../components/UploadMulti';

export default function CustomerForm({ defaultValues, onSubmit, onCancel }) {
  const [form, setForm] = useState(emptyCustomer());

  useEffect(() => {
    setForm(defaultValues ?? emptyCustomer());
  }, [defaultValues]);

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
          onUploaded={(url) => setForm((prev) => ({ ...prev, logoUrl: url }))}
        />
        {form.logoUrl && (
          <img
            src={form.logoUrl}
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
        {!!(form.orderImageUrls?.length) && (
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

      {/* עיר */}
      <div className="col-md-4">
        <label className="form-label fw-bold">City</label>
        <input
          name="city"
          className="form-control"
          value={form.city ?? ''}
          onChange={change}
        />
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
