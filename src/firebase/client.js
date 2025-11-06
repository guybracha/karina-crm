// src/firebase/client.js
import { getFirebaseApp } from '@/lib/firebaseClient';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, indexedDBLocalPersistence } from 'firebase/auth';

const app = getFirebaseApp();
const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
export const provider = new GoogleAuthProvider();
// Optional domain hint for Google Workspace accounts (UI hint only; enforce on backend)
const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_GOOGLE_DOMAIN || '';
if (ALLOWED_DOMAIN) {
  try { provider.setCustomParameters({ hd: ALLOWED_DOMAIN }); } catch {}
}

export const auth = app ? getAuth(app) : null;
if (auth) {
  const persistence = isElectron ? indexedDBLocalPersistence : browserLocalPersistence;
  setPersistence(auth, persistence).catch(() => {});
}

export default auth;
