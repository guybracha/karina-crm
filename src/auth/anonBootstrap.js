// src/auth/anonBootstrap.js
import { auth } from '@/firebase/client';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { isFirebaseConfigured } from '@/lib/firebaseClient';

function flag(name, def = false) {
  const v = String(import.meta.env[name] ?? '').toLowerCase();
  if (!v && def) return true;
  return v === 'true' || v === '1' || v === 'yes';
}

// Ensure there is a Firebase user when in direct mode without full auth.
// Useful when Firestore rules require request.auth != null for reads.
export async function ensureSignedInIfNeeded() {
  try {
    if (!isFirebaseConfigured()) return;
    const direct = flag('VITE_USE_FIREBASE_DIRECT', false);
    const requireAuth = flag('VITE_REQUIRE_AUTH', false);
    const autoAnon = flag('VITE_AUTO_ANON_SIGNIN', true);
    if (!direct || requireAuth || !autoAnon) return;
    if (!auth) return;

    // If already signed-in (any provider), nothing to do
    if (auth.currentUser) return;

    await new Promise((resolve) => {
      const timer = setTimeout(() => { try { unsub(); } catch {} resolve(); }, 5000);
      const unsub = onAuthStateChanged(auth, async (user) => {
        try {
          if (!user) {
            await signInAnonymously(auth).catch(() => {});
          }
        } finally {
          clearTimeout(timer);
          try { unsub(); } catch {}
          resolve();
        }
      });
    });
  } catch {}
}

