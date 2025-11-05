// src/components/UserOrderImages.jsx
import { useEffect, useState } from 'react';
import { getBucket } from '@/lib/firebaseClient';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

export default function UserOrderImages({ uid, max = 3 }) {
  const [urls, setUrls] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError('');
      try {
        if (!uid) return;
        const storage = getBucket();
        if (!storage) return;

        const found = new Set();

        async function collectAll(basePath, limit = 12) {
          try {
            const start = ref(storage, basePath);
            async function walk(prefixRef) {
              if (found.size >= limit) return;
              const res = await listAll(prefixRef);
              const items = (res.items || []).slice().sort((a,b)=>{
                const an = (a.name||'').toLowerCase();
                const bn = (b.name||'').toLowerCase();
                const ap = an.includes('original') || an.includes('logo') ? -1 : 0;
                const bp = bn.includes('original') || bn.includes('logo') ? -1 : 0;
                return ap - bp;
              });
              for (const item of items) {
                if (found.size >= limit) break;
                try { found.add(await getDownloadURL(item)); } catch {}
              }
              for (const p of res.prefixes || []) {
                if (found.size >= limit) break;
                await walk(p);
              }
            }
            await walk(start);
          } catch {}
        }

        const bases = [
          `users_prod/${uid}/orders_prod`,
          `users_prod/${uid}/orders`,
          `users_prod/${uid}/logos`,
          `users_prod/${uid}`,
          `logos/${uid}`,
        ];
        for (const b of bases) {
          if (found.size >= max) break;
          await collectAll(b, max);
        }

        if (!cancelled) setUrls(Array.from(found));
      } catch (e) { if (!cancelled) setError(String(e?.message||e)); }
    })();
    return () => { cancelled = true; };
  }, [uid, max]);

  if (error) return <span className="text-danger small">{error}</span>;
  if (!urls.length) return <span className="text-muted">—</span>;
  return (
    <div className="d-flex align-items-center gap-2">
      <div className="d-flex gap-1">
        {urls.slice(0, max).map((u, i) => (
          <img key={i} src={u} alt="" className="rounded border" style={{ width: 28, height: 28, objectFit: 'cover' }} />
        ))}
      </div>
      {urls.length > max && (
        <span className="badge text-bg-light">+{urls.length - max}</span>
      )}
    </div>
  );
}

