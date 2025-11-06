// src/lib/cloudApi.js
// Read data directly from Firebase (client SDK) using env config
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { getDb, isFirebaseConfigured, getFirebaseApp } from './firebaseClient';

const USERS_COLL = import.meta.env.VITE_FIREBASE_USERS_COLLECTION || 'users_prod';
const ORDERS_COLL = import.meta.env.VITE_FIREBASE_ORDERS_COLLECTION || 'orders_prod';
const REMOTE_CUSTOMERS_URL = import.meta.env.VITE_REMOTE_CUSTOMERS_URL || '';
const REMOTE_ORDERS_URL = import.meta.env.VITE_REMOTE_ORDERS_URL || '';
const REQUIRE_AUTH = String(import.meta.env.VITE_REQUIRE_AUTH || '').toLowerCase() === 'true';

// Track last error to surface meaningful UI messages in read-only mode
let lastCloudError = null; // { code?: string, message?: string, at: number }
export function getCloudStatus() {
  return lastCloudError ? { ...lastCloudError } : null;
}
function setCloudError(err) {
  try {
    const code = err?.code || /permission|denied/i.test(String(err)) ? 'permission-denied' : (err?.status ? String(err.status) : undefined);
    const message = err?.message || String(err);
    lastCloudError = { code, message, at: Date.now() };
  } catch { lastCloudError = { message: String(err), at: Date.now() }; }
}
function clearCloudError() { lastCloudError = null; }

export function cloudAvailable() {
  if (REMOTE_CUSTOMERS_URL || REMOTE_ORDERS_URL) return true;
  return isFirebaseConfigured();
}

async function getIdTokenOptional(timeoutMs = 3000) {
  // If auth isn't required, avoid touching Firebase Auth entirely.
  if (!REQUIRE_AUTH) return null;
  try {
    const app = getFirebaseApp();
    if (!app) return null;
    // Lazy-load auth only when needed to prevent unintended network calls
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth(app);
    if (auth?.currentUser) return await auth.currentUser.getIdToken();
    const user = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), timeoutMs);
      const unsub = auth.onAuthStateChanged((u) => {
        clearTimeout(timer);
        unsub();
        resolve(u || null);
      });
    });
    return user ? await user.getIdToken() : null;
  } catch { return null; }
}

async function fetchJson(url) {
  const headers = { Accept: 'application/json' };
  const idToken = await getIdTokenOptional();
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    let text = '';
    try { text = await res.text(); } catch {}
    throw new Error(`Remote fetch failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

function toMs(v) {
  try {
    if (!v) return undefined;
    if (typeof v === 'number') return v;
    if (v?.toDate) return +v.toDate();
    const d = new Date(v);
    return Number.isNaN(+d) ? undefined : +d;
  } catch { return undefined; }
}

export async function listCloudCustomers() {
  try {
    clearCloudError();
    if (REMOTE_CUSTOMERS_URL) {
      const payload = await fetchJson(REMOTE_CUSTOMERS_URL);
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.customers)
          ? payload.customers
          : [];
      return rows.map((row, idx) => normalizeCustomer(row, idx));
    }
    const db = getDb();
    if (!db) return [];
    const snap = await getDocs(collection(db, USERS_COLL));
    const list = [];
    snap.forEach((doc, idx) => {
      list.push(normalizeCustomer({ id: doc.id, ...(doc.data() || {}) }, idx));
    });
    return list;
  } catch (e) {
    setCloudError(e);
    throw e;
  }
}

export async function listCloudOrders() {
  try {
    if (REMOTE_ORDERS_URL) {
      const payload = await fetchJson(REMOTE_ORDERS_URL);
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.orders)
          ? payload.orders
          : [];
      return rows.map((row, idx) => normalizeOrder(row, idx));
    }
    const db = getDb();
    if (!db) return [];
    // Read from all collections named ORDERS_COLL across the database (includes top-level and subcollections)
    const snap = await getDocs(collectionGroup(db, ORDERS_COLL));
    const list = [];
    let i = 0;
    snap.forEach((doc) => {
      list.push(normalizeOrder({ id: doc.id, ...(doc.data() || {}) }, i++));
    });
    return list;
  } catch (e) {
    setCloudError(e);
    throw e;
  }
}

function normalizeCustomer(data = {}, index = 0) {
  const name =
    data.name ||
    data.fullName ||
    [data.firstName, data.lastName].filter(Boolean).join(' ') ||
    data.email ||
    data.phone ||
    'Customer';
  const idCandidate =
    data.id ??
    data.customerId ??
    data.firebaseUid ??
    data.uid ??
    data.userId ??
    data.email ??
    data.phone;
  const rawImages = data.orderImageUrls || data.orderImages || data.photos || [];
  return {
    id: String(idCandidate ?? `remote-${index}`),
    name,
    email: data.email || data.mail || undefined,
    phone: data.phone || data.phoneNumber || undefined,
    city: data.city || data.addressCity || undefined,
    tag: data.tag || data.segment || undefined,
    notes: data.notes || undefined,
    logoUrl: data.logoUrl || data.logo || data.avatarUrl || undefined,
    orderImageUrls: Array.isArray(rawImages) ? rawImages : [],
    firebaseUid:
      data.firebaseUid ||
      data.uid ||
      data.userId ||
      data.customerId ||
      undefined,
    lastOrderAt: toMs(data.lastOrderAt || data.lastOrderDate || data.lastOrder),
    createdAt: toMs(data.createdAt) || undefined,
    updatedAt: toMs(data.updatedAt) || undefined,
  };
}

function normalizeOrder(data = {}, index = 0) {
  const uid =
    data.userId || data.customerId || data.customerUID || data.uid || data.firebaseUid || (data.customer && (data.customer.uid || data.customerUid));
  const idCandidate = data.id ?? data.orderId ?? data.order_id ?? uid;
  const ts = data.createdAt || data.created_at || data.timestamp || data.placedAt || data.time;
  // If amount is missing, try to compute from items
  let amount = Number(data.amount ?? data.total ?? 0);
  if (!amount && Array.isArray(data.items)) {
    try {
      amount = data.items.reduce((sum, it) => sum + Number(it.qty || it.quantity || 1) * Number(it.unitPrice || it.price || 0), 0);
    } catch {}
  }
  return {
    id: String(idCandidate ?? `remote-order-${index}`),
    userId: uid ? String(uid) : undefined,
    amount: Number(amount || 0),
    createdAt: toMs(ts),
    raw: data,
  };
}

export function latestOrderTimestampByUser(orders) {
  const latest = new Map();
  for (const o of (orders || [])) {
    const uid = o.userId;
    const when = o.createdAt;
    if (!uid || !when) continue;
    const prev = latest.get(uid);
    if (!prev || when > prev) latest.set(uid, when);
  }
  return latest;
}
