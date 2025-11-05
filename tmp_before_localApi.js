// src/lib/localApi.js
import axios from 'axios';
import { cloudAvailable, listCloudCustomers } from './cloudApi';
import { listCloudOrders } from './cloudApi';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
const http = axios.create({ baseURL: API_URL });

export async function listCustomers() {
  const preferCloud = String(import.meta.env.VITE_USE_FIREBASE_DIRECT || '').toLowerCase() === 'true';
  if (preferCloud && cloudAvailable()) {
    try { return await listCloudCustomers(); } catch {}
  }
  try {
    const { data } = await http.get('/customers');
    return data;
  } catch (err) {
    // Fallback to cloud when server is not reachable
    if (cloudAvailable()) {
      try { return await listCloudCustomers(); } catch {}
    }
    // Final fallback: empty list (avoid crashing UI when server is down)
    return [];
  }
}

export async function getCustomer(id) {
  try {
    const { data } = await http.get(`/customers/${id}`);
    return data;
  } catch (e) {
    // Basic fallback: if we have cloud data cached by list, try find it
    try {
      if (cloudAvailable()) {
        const list = await listCloudCustomers();
        return list.find((c) => String(c.id) === String(id)) || null;
      }
    } catch {}
    return null;
  }
}

export async function createCustomer(payload) {
  const { data } = await http.post('/customers', payload);
  // Keep return shape minimal to not break callers
  return { id: data?.id };
}

export async function updateCustomer(id, patch) {
  const { data } = await http.put(`/customers/${id}`, patch);
  return data;
}

export async function removeCustomer(id) {
  await http.delete(`/customers/${id}`);
}

// Multipart photos upload: files is FileList or File[]
export async function uploadCustomerPhotos(id, files) {
  const list = Array.from(files || []);
  if (!list.length) return [];
  const fd = new FormData();
  for (const f of list) fd.append('files', f);
  // Let the browser set the correct multipart boundary automatically
  const { data } = await http.post(`/customers/${id}/photos`, fd);
  return Array.isArray(data?.urls) ? data.urls : [];
}

export async function listCustomerPhotos(id) {
  const { data } = await http.get(`/customers/${id}/photos`);
  return Array.isArray(data) ? data : [];
}

export async function removeCustomerPhoto(id, photoId) {
  await http.delete(`/customers/${id}/photos/${photoId}`);
}

// Resolve image URL to absolute server URL when needed
export function resolveImageUrl(u) {
  if (!u) return u;
  if (typeof u === 'string' && u.startsWith('/uploads/')) {
    const base = API_URL.replace(/\/?api\/?$/, '');
    return `${base}${u}`;
  }
  return u;
}

export async function uploadCustomerLogo(id, file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await http.post(`/customers/${id}/logo`, fd);
  return data?.url || '';
}

// Tasks API
export async function listTasks() {
  const preferCloud = String(import.meta.env.VITE_USE_FIREBASE_DIRECT || '').toLowerCase() === 'true';
  if (preferCloud && cloudAvailable()) {
    try { return await tasksFromOrders(); } catch { return []; }
  }
  try {
    const { data } = await http.get('/tasks');
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (cloudAvailable()) {
      try { return await tasksFromOrders(); } catch {}
    }
    return [];
  }
}

async function tasksFromOrders() {
  const orders = await listCloudOrders();
  // Reduce to latest order date per user uid
  const latest = new Map();
  for (const o of orders) {
    const uid = o.userId || o.uid || o.userUID || o.user || o.customerId || o.customerUID;
    const ts = o.createdAt || o.created_at || o.timestamp || o.placedAt || o.time;
    let when = ts?.toDate ? +ts.toDate() : (typeof ts === 'number' ? ts : +new Date(ts));
    if (!uid || !when || Number.isNaN(when)) continue;
    const prev = latest.get(uid);
    if (!prev || when > prev) latest.set(uid, when);
  }
  const tasks = [];
  for (const [uid, when] of latest.entries()) {
    const due = new Date(when);
    due.setMonth(due.getMonth() + 6);
    tasks.push({
      id: `cloud-${uid}`,
      customerId: uid,
      title: 'Follow-up call after last order',
      dueAt: +due,
      status: 'open',
      kind: 'followup',
    });
  }
  return tasks;
}

export async function createTask(task) {
  const { data } = await http.post('/tasks', task);
  return data;
}

export async function updateTask(id, patch) {
  const { data } = await http.put(`/tasks/${id}`, patch);
  return data;
}

export async function removeTask(id) {
  await http.delete(`/tasks/${id}`);
}

// Firebase sync endpoints
export async function firebaseSyncStatus() {
  const preferCloud = String(import.meta.env.VITE_USE_FIREBASE_DIRECT || '').toLowerCase() === 'true';
  if (preferCloud) return false; // no backend needed
  try {
    const { data } = await http.get('/sync/firebase/status');
    return !!data?.configured;
  } catch {
    return false;
  }
}

export async function syncFirebaseUsers() {
  const { data } = await http.get('/sync/firebase/users');
  return data;
}

export async function syncFirebaseOrders() {
  const { data } = await http.get('/sync/firebase/orders');
  return data;
}

