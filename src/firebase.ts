// src/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Prefer VITE_FB_* keys, fallback to existing VITE_FIREBASE_* keys
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID || import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FB_MEASUREMENT_ID || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize once (avoid HMR duplicates)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig, 'crm');
export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);

// Expose for quick console diagnostics
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.__FIREBASE_AUTH__ = auth;
  // @ts-ignore
  window.__FIREBASE_DB__ = db;
}

