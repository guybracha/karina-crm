// src/lib/firebaseClient.js
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
export function getFirebaseApp() {
  if (app) return app;
  const cfg = readConfig();
  if (!cfg) return null;
  app = getApps().length ? getApps()[0] : initializeApp(cfg);
  return app;
}

export function getDb() {
  const a = getFirebaseApp();
  return a ? getFirestore(a) : null;
}

export function getBucket() {
  const a = getFirebaseApp();
  return a ? getStorage(a) : null;
}

export function isFirebaseConfigured() {
  return !!readConfig();
}

