// src/lib/firebaseClient.js
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

function readConfig() {
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
  if (!cfg.apiKey || !cfg.projectId) return null;
  return cfg;
}

let app = null;
let db = null;
export function getFirebaseApp() {
  if (app) return app;
  const cfg = readConfig();
  if (!cfg) return null;
  app = getApps().length ? getApps()[0] : initializeApp(cfg);

  // Initialize App Check (reCAPTCHA v3 or Enterprise) if configured
  try {
    const siteKey = import.meta.env.VITE_APPCHECK_SITE_KEY || '';
    const useEnterprise = String(import.meta.env.VITE_APPCHECK_ENTERPRISE || '').toLowerCase() === 'true';
    if (siteKey) {
      if (typeof window !== 'undefined' && import.meta.env.MODE !== 'production') {
        // Enable debug token for local dev if provided (or auto-generate)
        // eslint-disable-next-line no-undef
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
      }
      initializeAppCheck(app, {
        provider: useEnterprise
          ? new ReCaptchaEnterpriseProvider(siteKey)
          : new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch {}
  return app;
}

export function getDb() {
  const a = getFirebaseApp();
  if (!a) return null;
  if (db) return db;
  try {
    // Improve compatibility in strict networks/proxies and reduce noisy terminate errors
    db = initializeFirestore(a, {
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: true,
    });
  } catch (e) {
    // If already initialized (e.g., HMR), fall back to the default getter
    db = getFirestore(a);
  }
  return db;
}

export function getBucket() {
  const a = getFirebaseApp();
  return a ? getStorage(a) : null;
}

export function isFirebaseConfigured() {
  return !!readConfig();
}
