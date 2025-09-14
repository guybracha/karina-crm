// src/lib/localApi.js
const KEY = 'crm:customers';

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
};
const write = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));

function normalizeCustomer(c) {
  return {
    id: c.id,
    name: c.name || '',
    email: c.email || '',
    phone: c.phone || '',
    city: c.city || '',
    tag: c.tag ?? '',
    notes: c.notes || '',
    logoUrl: typeof c.logoUrl === 'string' ? c.logoUrl : '',
    orderImageUrls: Array.isArray(c.orderImageUrls) ? c.orderImageUrls : [],
    createdAt: c.createdAt ?? Date.now(),
    updatedAt: c.updatedAt ?? Date.now(),
  };
}

export async function listCustomers() {
  return read()
    .map(normalizeCustomer)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getCustomer(id) {
  const found = read().find(x => x.id === id);
  return found ? normalizeCustomer(found) : null;
}

export async function createCustomer(data) {
  const id = crypto.randomUUID();
  const now = Date.now();
  const next = normalizeCustomer({ id, createdAt: now, updatedAt: now, ...data });
  write([...read(), next]);
  return { id }; // שמרתי התאמה לאיך שקראת קודם
}

/**
 * עדכון לקוח עם מיזוג ושמירת createdAt. מחזיר את האובייקט לאחר עדכון.
 * שימושי במיוחד לשדות תמונה:
 *  - אם patch.logoUrl לא נשלח, נשמר הערך הישן.
 *  - אם patch.orderImageUrls לא מערך, נשמר הישן.
 */
export async function updateCustomer(id, patch) {
  const all = read();
  const ix = all.findIndex(x => x.id === id);
  if (ix === -1) throw new Error('Customer not found');

  const prev = normalizeCustomer(all[ix]);

  // נורמליזציה לשדות בעייתיים
  const merged = {
    ...prev,
    ...patch,
  };

  // ודא טיפוסים נכונים לשדות המדיה
  merged.logoUrl =
    'logoUrl' in (patch || {})
      ? (typeof patch.logoUrl === 'string' ? patch.logoUrl : '')
      : prev.logoUrl;

  merged.orderImageUrls =
    'orderImageUrls' in (patch || {}) && Array.isArray(patch.orderImageUrls)
      ? patch.orderImageUrls
      : prev.orderImageUrls;

  merged.createdAt = prev.createdAt;   // לא לגעת
  merged.updatedAt = Date.now();

  all[ix] = merged;
  write(all);
  return merged;
}

export async function removeCustomer(id) {
  write(read().filter(x => x.id !== id));
}