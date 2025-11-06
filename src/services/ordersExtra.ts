// services/ordersExtra.ts
import { db } from '../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

type OrderItem = { productId: string; qty: number; unitPrice: number };

const USERS_COLL = (import.meta as any)?.env?.VITE_FIREBASE_USERS_COLLECTION || 'users_prod';
const ORDERS_COLL = (import.meta as any)?.env?.VITE_FIREBASE_ORDERS_COLLECTION || 'orders_prod';

export async function createCrmOrderForUser(
  customerUid: string,
  items: OrderItem[],
  status: 'initiated' | 'pending_payment' | 'draft' = 'initiated',
  shipping: any = {},
  notes = ''
) {
  if (!customerUid) throw new Error('customerUid required');

  const cleanItems = (items || []).map((it) => ({
    productId: String(it?.productId || '').trim(),
    qty: Math.max(1, Math.trunc(Number(it?.qty || 0))),
    unitPrice: Number(it?.unitPrice || 0),
  }));
  if (!cleanItems.length || cleanItems.some((i) => !i.productId)) {
    throw new Error('Each item requires non-empty productId');
  }

  // Only client-allowed fields per rules: customer, items, status, shipping, notes, createdAt, updatedAt
  // Items are kept simple (productId, qty, unitPrice)

  // Write to top-level orders collection to match current firestore.rules
  const col = collection(db, `${ORDERS_COLL}`);
  const ref = doc(col);

  const orderDoc: any = {
    customer: { uid: String(customerUid) },
    items: cleanItems,
    status,
    shipping: shipping || {},
    notes: notes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const debugPayload = {
      ...orderDoc,
      createdAt: '[serverTimestamp]',
      updatedAt: '[serverTimestamp]',
    };
    console.log('createCrmOrderForUser payload', JSON.stringify(debugPayload, null, 2));
  } catch {}

  await setDoc(ref, orderDoc);
  return { id: ref.id } as any;
}
