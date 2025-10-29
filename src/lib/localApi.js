// src/lib/localApi.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
const http = axios.create({ baseURL: API_URL });

export async function listCustomers() {
  const { data } = await http.get('/customers');
  return data;
}

export async function getCustomer(id) {
  try {
    const { data } = await http.get(`/customers/${id}`);
    return data;
  } catch (e) {
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
  const { data } = await http.get('/tasks');
  return Array.isArray(data) ? data : [];
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
