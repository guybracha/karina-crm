// src/features/customers/CustomerPhotos.jsx
import { useRef, useState } from "react";
import { updateCustomer } from "@/lib/localApi";
import { compressFiles } from "@/lib/imageTools";

export default function CustomerPhotos({ id, urls = [], onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleUpload(e) {
    const files = e.target?.files;
    if (!files?.length) return;
    setBusy(true);
    try {
      // compress to Data URLs (1600px, quality 0.72, JPEG) and persist
      const dataUrls = await compressFiles(files, { maxWidth: 1600, maxHeight: 1600, quality: 0.72, mime: 'image/jpeg' });
      const next = [...urls, ...dataUrls];
      await updateCustomer(id, { orderImageUrls: next });
      onChange?.(next);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeAt(i) {
    const next = urls.filter((_, idx) => idx !== i);
    await updateCustomer(id, { orderImageUrls: next });
    onChange?.(next);
  }

  return (
    <div className="card mt-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="m-0">Photos</h5>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="form-control"
            onChange={handleUpload}
            disabled={busy}
          />
        </div>

        {!urls.length ? (
          <p className="text-muted mb-0">No photos yet.</p>
        ) : (
          <div className="row g-3">
            {urls.map((src, i) => (
              <div className="col-6 col-md-4 col-lg-3" key={i}>
                <div className="position-relative border rounded overflow-hidden">
                  <img src={src} alt={`photo ${i + 1}`} className="w-100" style={{ aspectRatio: "1 / 1", objectFit: "cover" }} />
                  <button type="button" className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1" onClick={() => removeAt(i)}>
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

