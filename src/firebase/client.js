// src/firebase/client.js
import { getFirebaseApp } from '@/lib/firebaseClient';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';

const app = getFirebaseApp();
export const provider = new GoogleAuthProvider();
// Optional domain hint for Google Workspace accounts (UI hint only; enforce on backend)
const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_GOOGLE_DOMAIN || '';
if (ALLOWED_DOMAIN) {
  try { provider.setCustomParameters({ hd: ALLOWED_DOMAIN }); } catch {}
}

export const auth = app ? getAuth(app) : null;
if (auth) {
  // Persist session in the browser (survives refresh)
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

export default auth;
