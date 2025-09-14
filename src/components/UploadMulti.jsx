import { useRef, useState } from 'react';

export default function UploadMulti({ onUploadedMany, accept = 'image/*' }) {
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
    setPreviews(list.map(f => URL.createObjectURL(f)));
  }

  function uploadAll() {
    if (!files.length) return;
    // דמו: “העלאה” מיידית של כולן
    setProgress(100);
    onUploadedMany?.(previews);
    setTimeout(() => setProgress(null), 800);
  }

  return (
    <div className="d-flex flex-column gap-2">
      {/* קלט מוסתר */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="d-none"
        onChange={handleFiles}
      />

      {/* קבוצת כפתורים + תיבה לקריאה בלבד */}
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
        <button
          type="button"
          className="btn btn-primary"
          disabled={!files.length}
          onClick={uploadAll}
        >
          העלה ({files.length || 0})
        </button>
      </div>

      {/* Progress bar */}
      {progress !== null && (
        <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
          <div className={`progress-bar ${progress === 100 ? 'bg-success' : ''}`} style={{ width: `${progress}%` }}>
            {progress === 100 ? 'הועלו!' : `${progress}%`}
          </div>
        </div>
      )}

      {/* תצוגות מקדימות (grid קטן) */}
      {!!previews.length && (
        <div className="d-flex flex-wrap gap-2 mt-1">
          {previews.map((u, i) => (
            <img
              key={i}
              src={u}
              alt=""
              className="rounded shadow-sm border"
              style={{ width: 72, height: 72, objectFit: 'cover' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
