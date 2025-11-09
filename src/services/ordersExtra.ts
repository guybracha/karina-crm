// src/services/ordersExtra.ts
import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

type OrderItem = {
  productId: string;
  qty: number;
  unitPrice: number;
  name?: string | null;
  slug?: string | null;
  color?: string | null;
  size?: string | null;
  notes?: string | null;
  baseUnit?: number | null;
  discountPct?: number | null;
  lineTotal?: number | null;
};

// אוספים – כאן בכוונה מקובע לשמות שמופיעים ב-rules
const ORDERS_COLL =
  (import.meta as any)?.env?.VITE_FIREBASE_ORDERS_COLLECTION || 'orders_prod';

export async function createCrmOrderForUser(
  customerUid: string,
  items: OrderItem[],
  status: 'initiated' | 'pending_payment' | 'draft' = 'initiated',
  shipping: any = {},
  notes = ''
) {
  if (!customerUid) throw new Error('customerUid required');

  const cleanItems = (items || []).map((it) => {
    const productId = String(it?.productId || '').trim();
    const qty = Math.max(1, Math.trunc(Number(it?.qty || 0)));
    const unitPrice = Number(it?.unitPrice || 0);

    const payload: Record<string, unknown> = { productId, qty, unitPrice };

    const enrichments: Record<string, unknown> = {
      name: it?.name?.toString().trim(),
      slug: it?.slug?.toString().trim(),
      color: it?.color?.toString().trim(),
      size: it?.size?.toString().trim(),
      notes: it?.notes?.toString().trim(),
      baseUnit: Number.isFinite(it?.baseUnit) ? Number(it?.baseUnit) : undefined,
      discountPct: Number.isFinite(it?.discountPct) ? Number(it?.discountPct) : undefined,
      lineTotal: Number.isFinite(it?.lineTotal) ? Number(it?.lineTotal) : undefined,
    };

    Object.entries(enrichments).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      payload[key] = value;
    });

    return payload;
  });

  if (!cleanItems.length || cleanItems.some((i) => !i.productId)) {
    throw new Error('Each item requires non-empty productId');
  }

  // כתיבה לאוסף העליון orders_prod – לפי ה-rules:
  // מותר ליצור אם (isOwnerOfOrderCreate() || canManageOrders())
  // וגם validOrderOnCreate(request.resource.data)
  const colRef = collection(db, ORDERS_COLL);
  const ref = doc(colRef); // id אוטומטי

  const orderDoc: any = {
    customer: { uid: String(customerUid) },
    items: cleanItems,
    status,
    shipping: shipping || {},
    notes: notes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // לוג לדיבוג – ה-timestamps מוצגים בצורה "מדומה"
  try {
    const debugPayload = {
      ...orderDoc,
      createdAt: '[serverTimestamp]',
      updatedAt: '[serverTimestamp]',
    };
    console.log(
      'createCrmOrderForUser payload',
      JSON.stringify(debugPayload, null, 2)
    );
  } catch {
    // אם JSON.stringify ייכשל – לא נורא, זה רק לדיבוג
  }

  await setDoc(ref, orderDoc);
  return { id: ref.id } as { id: string };
}
