// src/features/customers/CustomerPhotos.jsx
import { useRef, useState } from "react";
import { uploadCustomerPhotos, listCustomerPhotos, removeCustomerPhoto, resolveImageUrl } from "@/lib/localApi";
import CloudImage from "@/components/CloudImage.jsx";
import { getBucket } from "@/lib/firebaseClient";
import { getDownloadURL, ref } from "firebase/storage";

export default function CustomerPhotos({ id, urls = [], onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const directMode = String(import.meta.env.VITE_USE_FIREBASE_DIRECT || '').toLowerCase() === 'true';

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
    const photos = await listCustomerPhotos(id);
    const target = photos[i];
    if (target?.id) {
      await removeCustomerPhoto(id, target.id);
      const next = urls.filter((_, idx) => idx !== i);
      onChange?.(next);
      setSelected((prev)=>{ const n = new Set(prev); n.delete(i); return n; });
    }
  }

  // Helpers for resolving download URLs (supports /uploads, http(s), data:, and Firebase Storage)
  function isHttp(u){ return typeof u === 'string' && /^https?:/i.test(u); }
  function isData(u){ return typeof u === 'string' && /^data:/i.test(u); }
  function isUploads(u){ return typeof u === 'string' && u.startsWith('/uploads/'); }
  function isGs(u){ return typeof u === 'string' && /^gs:\/\//i.test(u); }
  function pathFromGs(u){ try { const p = u.replace(/^gs:\/\//,''); const idx = p.indexOf('/'); return idx>=0? p.slice(idx+1):''; } catch { return ''; } }

  async function resolveForDownload(u){
    if (!u) return '';
    if (isHttp(u) || isData(u) || u.startsWith('blob:')) return u;
    if (isUploads(u)) return resolveImageUrl(u);
    try {
      const bucket = getBucket();
      if (!bucket) return String(u);
      const path = isGs(u) ? pathFromGs(u) : String(u);
      const url = await getDownloadURL(ref(bucket, path));
      return url;
    } catch { return String(u); }
  }

  async function zipAndDownload(list, filename){
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const folder = zip.folder('photos');
    const tasks = list.map(async (u, i)=>{
      const url = await resolveForDownload(u);
      const res = await fetch(url);
      const blob = await res.blob();
      const nameFromUrl = (()=>{ try{ const a = new URL(url); const base = a.pathname.split('/').pop() || `photo-${i+1}.jpg`; return decodeURIComponent(base); } catch { return `photo-${i+1}.jpg`; } })();
      folder.file(nameFromUrl, blob);
    });
    await Promise.all(tasks);
    const out = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(out);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(()=>{ URL.revokeObjectURL(link.href); link.remove(); }, 0);
  }

  async function downloadAllZip(){
    if (!urls.length || zipping) return;
    setZipping(true);
    try{ await zipAndDownload(urls, `customer-${id}-photos.zip`); }
    finally{ setZipping(false); }
  }

  async function downloadSelectedZip(){
    const list = Array.from(selected).map((i)=> urls[i]).filter(Boolean);
    if (!list.length || zipping) return;
    setZipping(true);
    try { await zipAndDownload(list, `customer-${id}-selected.zip`); }
    finally { setZipping(false); }
  }

  function toggle(i){ setSelected(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; }); }
  function clearSelection(){ setSelected(new Set()); }

  return (
    <div className="card mt-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
          <h5 className="m-0">Photos</h5>
          <div className="d-flex gap-2">
            {!!selected.size && (
              <button type="button" className="btn btn-primary" onClick={downloadSelectedZip} disabled={zipping}>
                {zipping ? 'Preparing ZIP…' : `Download Selected (ZIP) (${selected.size})`}
              </button>
            )}
            {!!urls.length && (
              <button type="button" className="btn btn-outline-secondary" onClick={downloadAllZip} disabled={zipping}>
                {zipping ? 'Preparing ZIP…' : 'Download All (ZIP)'}
              </button>
            )}
            {!!selected.size && (
              <button type="button" className="btn btn-outline-secondary" onClick={clearSelection}>Clear</button>
            )}
            {
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="form-control"
                onChange={handleUpload}
                disabled={busy}
              />
            }
          </div>
        </div>

        {!urls.length ? (
          <p className="text-muted mb-0">No photos yet.</p>
        ) : (
          <div className="row g-3">
            {urls.map((src, i) => (
              <div className="col-6 col-md-4 col-lg-3" key={`${i}-${String(src).slice(0,12)}`}>
                <div className={`position-relative border rounded overflow-hidden ${selected.has(i) ? 'border-2 border-primary' : ''}`}>
                  <div className="position-absolute top-0 start-0 m-1">
                    <input type="checkbox" className="form-check-input" aria-label="Select photo" checked={selected.has(i)} onChange={()=>toggle(i)} />
                  </div>
                  <CloudImage src={src} alt={`photo ${i + 1}`} className="w-100" style={{ aspectRatio: "1 / 1", objectFit: "cover" }} />
                  <div className="position-absolute top-0 end-0 m-1 d-flex gap-1">
                    <a className="btn btn-sm btn-outline-secondary" href={resolveImageUrl(src)} target="_blank" rel="noreferrer" download>
                      Download
                    </a>
                    {
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => removeAt(i)}>
                        Delete
                      </button>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
