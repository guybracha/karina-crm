// src/components/UserAllLogos.jsx
import { useEffect, useState } from 'react';
import { getBucket } from '@/lib/firebaseClient';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

export default function UserAllLogos({ uid, max = 48 }) {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(''); setUrls([]);
      try {
        if (!uid) { setLoading(false); return; }
        const storage = getBucket();
        if (!storage) { setLoading(false); return; }

        const found = new Set();

        async function collectAll(basePath, limit) {
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
      } catch (e) {
        if (!cancelled) setError(String(e?.message||e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid, max]);

  if (!uid) return null;
  if (loading) return <div className="text-muted small">Loading images…</div>;
  if (error) return <div className="text-danger small">{error}</div>;
  if (!urls.length) return <div className="text-muted small">No images found</div>;

  return (
    <div className="d-flex flex-wrap gap-2">
      {urls.map((u, i) => (
        <a key={i} href={u} target="_blank" rel="noreferrer" download>
          <img src={u} alt="" className="rounded border" style={{ width: 72, height: 72, objectFit: 'cover' }} />
        </a>
      ))}
    </div>
  );
}

