// src/lib/tasksApi.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
const http = axios.create({ baseURL: API_URL });

export async function listTasks() {
  const { data } = await http.get('/tasks');
  return Array.isArray(data) ? data : [];
}

export async function createTask(payload) {
  // Expect { customerId, title, dueAt: ISO string, status?, kind? }
  const { data } = await http.post('/tasks', payload);
  return data;
}

export async function updateTask(id, patch) {
  const { data } = await http.put(`/tasks/${id}`, patch);
  return data;
}

export async function removeTask(id) {
  await http.delete(`/tasks/${id}`);
}

