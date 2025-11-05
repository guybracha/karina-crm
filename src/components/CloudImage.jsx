// src/components/CloudImage.jsx
import { useEffect, useState } from 'react';
import { getBucket } from '@/lib/firebaseClient';
import { getDownloadURL, ref } from 'firebase/storage';

const DIRECT_MODE = String(import.meta.env.VITE_USE_FIREBASE_DIRECT || '').toLowerCase() === 'true';

function absoluteFromUploads(u) {
  try {
    if (DIRECT_MODE) return u;
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/?api\/?$/, '');
    return `${base}${u}`;
  } catch { return u; }
}

function isHttp(u) { return typeof u === 'string' && /^https?:/i.test(u); }
function isDataUrl(u) { return typeof u === 'string' && /^data:/i.test(u); }
function isUploads(u) { return typeof u === 'string' && u.startsWith('/uploads/'); }
function isGs(u) { return typeof u === 'string' && /^gs:\/\//i.test(u); }

function pathFromGs(u) {
  try {
    const [, , bucketAndPath] = u.split(':'); // ['gs','','//bucket/path']
    const p = bucketAndPath?.replace(/^\/\//, '') || '';
    const idx = p.indexOf('/');
    return idx >= 0 ? p.slice(idx + 1) : '';
  } catch { return ''; }
}

export default function CloudImage({ src, alt = '', ...imgProps }) {
  const [url, setUrl] = useState(src || '');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const u = src;
      if (!u) { setUrl(''); return; }
      if (isHttp(u) || isDataUrl(u)) { setUrl(u); return; }
      if (isUploads(u)) { setUrl(absoluteFromUploads(u)); return; }

      try {
        const bucket = getBucket();
        if (!bucket) { setUrl(String(u)); return; }
        let path = u;
        if (isGs(u)) path = pathFromGs(u);
        const fileRef = ref(bucket, path);
        const dl = await getDownloadURL(fileRef);
        if (!cancelled) setUrl(dl);
      } catch {
        if (!cancelled) setUrl(String(u));
      }
    }
    run();
    return () => { cancelled = true; };
  }, [src]);

  if (!url) return null;
  return <img src={url} alt={alt} {...imgProps} />;
}
