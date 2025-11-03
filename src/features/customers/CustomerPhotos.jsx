// src/features/customers/CustomerPhotos.jsx
import { useRef, useState } from "react";
import { uploadCustomerPhotos, listCustomerPhotos, removeCustomerPhoto } from "@/lib/localApi";
import CloudImage from "@/components/CloudImage.jsx";

export default function CustomerPhotos({ id, urls = [], onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleUpload(e) {
    const files = e.target?.files;
    if (!files?.length) return;
    setBusy(true);
    try {
      const uploaded = await uploadCustomerPhotos(id, files);
      const next = [...urls, ...uploaded];
      onChange?.(next);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeAt(i) {
    // Map index to photo id via API and delete
    const photos = await listCustomerPhotos(id);
    const target = photos[i];
    if (target?.id) {
      await removeCustomerPhoto(id, target.id);
      const next = urls.filter((_, idx) => idx !== i);
      onChange?.(next);
    }
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
                  <CloudImage src={src} alt={`photo ${i + 1}`} className="w-100" style={{ aspectRatio: "1 / 1", objectFit: "cover" }} />
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


