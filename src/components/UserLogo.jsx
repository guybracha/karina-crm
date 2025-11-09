// src/components/UserLogo.jsx
import { useEffect, useState } from 'react';
import { getBucket } from '@/lib/firebaseClient';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

export default function UserLogo({
  uid,
  folder = 'users_prod',
  className = 'rounded border',
  style = { width: 40, height: 40, objectFit: 'cover' },
}) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setUrl('');
      try {
        if (!uid) return;
        const bucket = getBucket();
        if (!bucket) return;

        // נתיבים שמותרים לפי storage.rules:
        // users_prod/{uid}/logos/**  ו- logos/{uid}/**
        const bases =
          folder === 'logos'
            ? [`logos/${uid}`]
            : [
                `users_prod/${uid}/logos`,
                `logos/${uid}`, // fallback ישן
              ];

        let chosenUrl = '';

        for (const base of bases) {
          try {
            const baseRef = ref(bucket, base);
            const res = await listAll(baseRef);
            if (!res.items || !res.items.length) continue;

            // העדפה לקובץ עם "logo" בשם
            let chosenItem = null;
            for (const item of res.items) {
              const name = (item.name || '').toLowerCase();
              if (name.includes('logo')) {
                chosenItem = item;
                break;
              }
            }
            if (!chosenItem) {
              chosenItem = res.items[0];
            }

            if (chosenItem) {
              chosenUrl = await getDownloadURL(chosenItem);
              break;
            }
          } catch (e) {
            // 403/404 וכו' – פשוט ממשיכים לבסיס הבא
            continue;
          }
        }

        if (!cancelled && chosenUrl) {
          setUrl(chosenUrl);
        }
      } catch {
        // מתעלמים – נשאר ריבוע ריק
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, folder]);

  if (!url) return <div className={className} style={style} />;
  return <img src={url} alt="" className={className} style={style} />;
}
