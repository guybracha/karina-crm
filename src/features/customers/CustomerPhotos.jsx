// src/features/customers/CustomerPhotos.jsx
import { useRef, useState } from "react";
import { updateCustomer } from "@/lib/localApi";
import { compressFiles, approxBytesOfDataURL } from "@/lib/imageTools";

export default function CustomerPhotos({ id, urls = [], onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const LOCALSTORAGE_SOFT_LIMIT = 4.5 * 1024 * 1024; // ~4.5MB כדי לא לגעת בתקרה

  async function handleUpload(e) {
    const files = e.target?.files;
    if (!files?.length) return;
    setBusy(true);
    try {
      // דחיסה (1600px ארוך, quality 0.72, JPEG)
      const dataUrls = await compressFiles(files, { maxWidth: 1600, maxHeight: 1600, quality: 0.72, mime: 'image/jpeg' });

      // סינון לפי נפח משוער כדי לא לקרוס את localStorage
      const existingBytes = (urls || []).reduce((sum, u) => sum + approxBytesOfDataURL(u), 0);
      const accepted = [];
      let budget = LOCALSTORAGE_SOFT_LIMIT - existingBytes;

      for (const u of dataUrls) {
        const size = approxBytesOfDataURL(u);
        if (size <= budget) { accepted.push(u); budget -= size; }
        else { break; }
      }

      const next = [...urls, ...accepted];
      await updateCustomer(id, { orderImageUrls: next });
      onChange?.(next);

      if (accepted.length < dataUrls.length) {
        console.warn("Skipped some images due to localStorage limit.");
        alert("חלק מהתמונות לא נשמרו בגלל מגבלת נפח הדפדפן. מומלץ לעבור ל-Firebase Storage לשמירה יציבה.");
      }
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
                  <img src={src} alt={`photo ${i+1}`} className="w-100" style={{ aspectRatio: "1 / 1", objectFit: "cover" }} />
                  <button type="button" className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1" onClick={() => removeAt(i)}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
