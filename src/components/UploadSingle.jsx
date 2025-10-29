import { useRef, useState } from 'react';
import { compressImageFile } from '@/lib/imageTools';

export default function UploadSingle({ onUploaded, accept = 'image/*', compress = { maxWidth: 512, maxHeight: 512, quality: 0.8, mime: 'image/jpeg' } }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [progress, setProgress] = useState(0);

  function pick() {
    inputRef.current?.click();
  }

  function handleFiles(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : '');
  }

  async function upload() {
    if (!file) return;
    setProgress(50);
    const dataUrl = await compressImageFile(file, compress);
    setProgress(100);
    // Pass both the Data URL (for preview/fallback) and the file itself
    onUploaded?.(dataUrl, file);
    setTimeout(() => setProgress(0), 800);
  }

  return (
    <div className="d-flex flex-column gap-2">
      <input ref={inputRef} type="file" accept={accept} className="d-none" onChange={handleFiles} />

      <div className="input-group">
        <button type="button" className="btn btn-outline-secondary" onClick={pick}>
          בחר קובץ
        </button>
        <input type="text" className="form-control" value={file ? file.name : 'לא נבחר קובץ'} readOnly />
        <button type="button" className="btn btn-primary" disabled={!file} onClick={upload}>
          העלה
        </button>
      </div>

      {progress > 0 && progress < 100 && (
        <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
          <div className="progress-bar" style={{ width: `${progress}%` }}>
            {progress}%
          </div>
        </div>
      )}
      {progress === 100 && (
        <div className="progress" role="progressbar" aria-valuenow={100} aria-valuemin="0" aria-valuemax="100">
          <div className="progress-bar bg-success" style={{ width: '100%' }}>
            הועלה!
          </div>
        </div>
      )}

      {preview && <img src={preview} alt="" className="rounded shadow-sm border mt-1" style={{ width: 120, height: 120, objectFit: 'cover' }} />}
    </div>
  );
}
