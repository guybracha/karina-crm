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

