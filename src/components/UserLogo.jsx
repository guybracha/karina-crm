// src/components/UserLogo.jsx
import { useEffect, useState } from 'react';
import { getBucket } from '@/lib/firebaseClient';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

export default function UserLogo({ uid, folder = 'users_prod', className = 'rounded border', style = { width: 40, height: 40, objectFit: 'cover' } }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!uid) return;
        const bucket = getBucket();
        if (!bucket) return;
        const baseRef = ref(bucket, `${folder}/${uid}`);
        const res = await listAll(baseRef);
        let chosen = null;
        // Prefer files with 'logo' in name
        for (const item of res.items || []) {
          const name = (item.name || '').toLowerCase();
          if (name.includes('logo')) { chosen = item; break; }
        }
        if (!chosen) chosen = (res.items || [])[0] || null;
        if (!chosen) return;
        const u = await getDownloadURL(chosen);
        if (!cancelled) setUrl(u);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [uid, folder]);

  if (!url) return <div className={className} style={style} />;
  return <img src={url} alt="" className={className} style={style} />;
}

