import { useRef, useState } from 'react';

export default function UploadSingle({ onUploaded, accept = 'image/*' }) {
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

  function upload() {
    if (!file) return;
    // דמו: “העלאה” מיידית
    setProgress(100);
    const url = preview || URL.createObjectURL(file);
    onUploaded?.(url);
    setTimeout(() => setProgress(0), 800);
  }

  return (
    <div className="d-flex flex-column gap-2">
      {/* בחירת קובץ (מוסתר) */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="d-none"
        onChange={handleFiles}
      />

      {/* קבוצת כפתורים/תצוגה */}
      <div className="input-group">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={pick}
        >
          בחר קובץ
        </button>
        <input
          type="text"
          className="form-control"
          value={file ? file.name : 'לא נבחר קובץ'}
          readOnly
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={!file}
          onClick={upload}
        >
          העלה
        </button>
      </div>

      {/* Progress bar */}
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

      {/* תצוגה מקדימה */}
      {preview && (
        <img
          src={preview}
          alt=""
          className="rounded shadow-sm border mt-1"
          style={{ width: 120, height: 120, objectFit: 'cover' }}
        />
      )}
    </div>
  );
}
