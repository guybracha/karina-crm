// services/orders.ts
import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

type OrderItem = { productId: string; qty: number; unitPrice: number };

// Resolve collection names from env with sensible defaults
const USERS_COLL = (import.meta as any)?.env?.VITE_FIREBASE_USERS_COLLECTION || 'users_prod';
const ORDERS_COLL = (import.meta as any)?.env?.VITE_FIREBASE_ORDERS_COLLECTION || 'orders_prod';

export async function createOrder(items: OrderItem[], status: "initiated"|"pending_payment"|"draft" = "initiated", shipping = {}, notes = "") {
  const auth = getAuth();
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");

  return await addDoc(collection(db, "orders_prod"), {
    customer: { uid: u.uid },         // חובה: uid של המחובר
    items,                            // חייב לעבור את validOrderItems
    status,                           // חייב להיות אחד מהשלושה
    shipping,
    notes,
    createdAt: serverTimestamp(),     // == request.time
    updatedAt: serverTimestamp(),     // == request.time
  });
}

// Create an order for a specific customer UID (manual admin entry)
export async function createOrderForUser(customerUid: string, items: OrderItem[], status: "initiated"|"pending_payment"|"draft" = "initiated", shipping = {}, notes = "") {
  if (!customerUid) throw new Error("customerUid required");
  // Clean items per rules
  const cleanItems = (items || []).map((it) => ({
    productId: String(it?.productId || "").trim(),
    qty: Math.max(1, Math.trunc(Number(it?.qty || 0))),
    unitPrice: Number(it?.unitPrice || 0),
  }));
  if (!cleanItems.length || cleanItems.some((i) => !i.productId)) {
    throw new Error("Each item requires non-empty productId");
  }
  // Write to user-scoped subcollection to meet rules easily
  const col = collection(db, `users_prod/${customerUid}/orders_prod`);
  const res = await addDoc(col, {
    customer: { uid: customerUid },
    items: cleanItems,
    status,
    shipping: shipping || {},
    notes: notes || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return res;
}

export async function updateOrder(orderId: string, patch: Partial<{
  items: OrderItem[];
  status: string;           // דאג שיישב על הערכים המותרים שלך בצד לקוח
  shipping: any;
  notes: string;
}>) {
  // אסור לגעת ב-createdAt/customer.uid, והחוקים בודקים שזה לא משתנה
  const ref = doc(db, "orders_prod", orderId);
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp(),     // חובה בכל update
  });
}
