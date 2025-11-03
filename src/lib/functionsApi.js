// src/lib/functionsApi.js
// Helpers to call Firebase HTTPS Cloud Functions with Firebase Auth ID token
import auth from '@/firebase/client';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForUser(timeoutMs = 4000) {
  // Resolve quickly if user already available
  if (auth?.currentUser) return auth.currentUser;
  if (!auth) return null;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    const unsub = auth.onAuthStateChanged((u) => {
      clearTimeout(timer);
      unsub();
      resolve(u || null);
    });
  });
}

export async function getIdTokenOrThrow() {
  const user = await waitForUser();
  if (!user) throw new Error('User not logged in');
  return user.getIdToken();
}

// Build CF URL from env. Prefer explicit URL; else compose from region+project+name.
function functionUrl(name) {
  const explicit = import.meta.env.VITE_CF_GET_ORDERS_URL && name === 'getOrdersForCRM'
    ? import.meta.env.VITE_CF_GET_ORDERS_URL
    : null;
  if (explicit) return explicit;

  const region = import.meta.env.VITE_CF_REGION || 'us-central1';
  const project = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  // v2 style domain also works for v1
  return `https://${region}-${project}.cloudfunctions.net/${name}`;
}

export async function fetchCrmOrders() {
  const url = functionUrl('getOrdersForCRM');
  const idToken = await getIdTokenOrThrow();
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { const data = await res.json(); msg = data?.message || msg; } catch {}
    throw new Error(`Cloud Function failed: ${msg}`);
  }
  return res.json();
}

// Generic caller if you need POST with body
export async function callFunction(name, { method = 'POST', body, headers = {} } = {}) {
  const url = functionUrl(name);
  const idToken = await getIdTokenOrThrow();
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { const data = await res.json(); msg = data?.message || msg; } catch {}
    throw new Error(`Cloud Function failed: ${msg}`);
  }
  try { return await res.json(); } catch { return null; }
}

