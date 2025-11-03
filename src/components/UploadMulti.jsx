import { useRef, useState } from 'react';
import { compressFiles } from '@/lib/imageTools';

export default function UploadMulti({ onUploadedMany, accept = 'image/*', compress = { maxWidth: 1600, maxHeight: 1600, quality: 0.72, mime: 'image/jpeg' } }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [progress, setProgress] = useState(null);

  function pick() {
    inputRef.current?.click();
  }

  function handleFiles(e) {
    const list = Array.from(e.target.files || []);
    setFiles(list);
    setPreviews(list.map((f) => URL.createObjectURL(f)));
  }

  async function uploadAll() {
    if (!files.length) return;
    try {
      setProgress(50);
      // Convert files to compressed Data URLs so they can persist in DB
      const dataUrls = await compressFiles(files, compress);
      setProgress(100);
      // Pass both data URLs and the original File objects for server uploads when needed
      onUploadedMany?.(dataUrls, files);
    } finally {
      setTimeout(() => setProgress(null), 800);
    }
  }

  return (
    <div className="d-flex flex-column gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="d-none"
        onChange={handleFiles}
      />

      <div className="input-group">
        <button type="button" className="btn btn-outline-secondary" onClick={pick}>
          בחר קבצים
        </button>
        <input
          type="text"
          className="form-control"
          value={files.length ? `${files.length} קבצים נבחרו` : 'לא נבחרו קבצים'}
          readOnly
        />
        <button type="button" className="btn btn-primary" disabled={!files.length} onClick={uploadAll}>
          העלה ({files.length || 0})
        </button>
      </div>

      {progress !== null && (
        <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
          <div className={`progress-bar ${progress === 100 ? 'bg-success' : ''}`} style={{ width: `${progress}%` }}>
            {progress === 100 ? 'הועלה!' : `${progress}%`}
          </div>
        </div>
      )}

      {!!previews.length && (
        <div className="d-flex flex-wrap gap-2 mt-1">
          {previews.map((u, i) => (
            <img key={i} src={u} alt="" className="rounded shadow-sm border" style={{ width: 72, height: 72, objectFit: 'cover' }} />
          ))}
        </div>
      )}
    </div>
  );
}
