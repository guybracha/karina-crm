// services/orders.ts
import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

type OrderItem = { productId: string; qty: number; unitPrice: number };

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
  return await addDoc(collection(db, "orders_prod"), {
    customer: { uid: customerUid },
    items,
    status,
    shipping,
    notes,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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
