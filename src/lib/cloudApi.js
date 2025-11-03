// src/lib/cloudApi.js
// Read data directly from Firebase (client SDK) using env config
import { collection, getDocs } from 'firebase/firestore';
import { getDb, isFirebaseConfigured } from './firebaseClient';

const USERS_COLL = import.meta.env.VITE_FIREBASE_USERS_COLLECTION || 'users_prod';
const ORDERS_COLL = import.meta.env.VITE_FIREBASE_ORDERS_COLLECTION || 'orders_prod';

export function cloudAvailable() {
  return isFirebaseConfigured();
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
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, USERS_COLL));
  const list = [];
  snap.forEach((doc) => {
    const d = doc.data() || {};
    const name = d.name || d.fullName || [d.firstName, d.lastName].filter(Boolean).join(' ') || d.email || d.phone || 'User';
    list.push({
      id: doc.id,
      name,
      email: d.email || undefined,
      phone: d.phone || d.phoneNumber || undefined,
      city: d.city || d.addressCity || undefined,
      tag: d.tag || d.segment || undefined,
      notes: d.notes || undefined,
      logoUrl: d.logoUrl || undefined,
      orderImageUrls: [],
      firebaseUid: d.uid || d.userId || d.userUID || doc.id,
      lastOrderAt: toMs(d.lastOrderAt),
      createdAt: toMs(d.createdAt) || undefined,
      updatedAt: toMs(d.updatedAt) || undefined,
    });
  });
  return list;
}

export async function listCloudOrders() {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, ORDERS_COLL));
  const list = [];
  snap.forEach((doc) => {
    const d = doc.data() || {};
    const uid = d.userId || d.uid || d.userUID || d.user || d.customerId || d.customerUID || null;
    const ts = d.createdAt || d.created_at || d.timestamp || d.placedAt || d.time || null;
    list.push({
      id: doc.id,
      userId: uid,
      amount: Number(d.amount || d.total || 0),
      createdAt: toMs(ts),
      raw: d,
    });
  });
  return list;
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
