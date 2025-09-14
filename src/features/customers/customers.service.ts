// src/services/customers.service.ts
import axios, { AxiosInstance } from "axios";

export interface Customer {
  id: string;        // אם בשרת זה _id, ראה הערה למטה
  name: string;
  email: string;
  phone?: string;
  city?: string;
}

// בעת יצירה אין לנו id מצד הלקוח
export type NewCustomer = Omit<Customer, "id">;

// בעדכון מותר לשלוח חלקי שדות — בלי id
export type UpdateCustomer = Partial<Omit<Customer, "id">>;

const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

// מומלץ לעבוד עם instance כדי לא לחזור על baseURL/headers
const http: AxiosInstance = axios.create({
  baseURL: API_URL,
  // headers: { Authorization: `Bearer ${token}` } // אם יש JWT
});

// === כל הלקוחות ===
export async function listCustomers(): Promise<Customer[]> {
  const { data } = await http.get<Customer[]>("/customers");
  return data;
}

// === יצירת לקוח ===
export async function createCustomer(customer: NewCustomer): Promise<Customer> {
  const { data } = await http.post<Customer>("/customers", customer);
  return data;
}

// === עדכון לקוח ===
export async function updateCustomer(id: string, patch: UpdateCustomer): Promise<Customer> {
  const { data } = await http.put<Customer>(`/customers/${id}`, patch);
  return data;
}

// === מחיקת לקוח ===
export async function removeCustomer(id: string): Promise<void> {
  await http.delete<void>(`/customers/${id}`);
}
