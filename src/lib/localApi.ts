import type { Customer, Tag } from '@/types'; // התאמה לנתיב/טייפים שלך

const STORAGE_KEY = 'customers';

function loadAll(): Customer[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as Customer[];
  } catch {
    return [];
  }
}

function saveAll(list: Customer[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

const TAGS: readonly Tag[] = ['lead', 'prospect', 'customer', 'vip'] as const;

type Patch = Partial<Customer>;

export async function updateCustomer(id: string, patch: Patch): Promise<Customer> {
  const all = loadAll();
  const ix = all.findIndex(c => c.id === id);
  if (ix === -1) throw new Error('Customer not found');

  const prev = all[ix];

  // קוסמטיקה/ולידציה: לטאג לא חוקי – ננקה
  let cleanTag = patch.tag;
  if (cleanTag && !TAGS.includes(cleanTag as Tag)) cleanTag = '';

  const next: Customer = {
    ...prev,
    ...patch,
    tag: cleanTag ?? prev.tag,
    // הגנות קטנות על שדות בעייתיים
    orderImageUrls: Array.isArray(patch.orderImageUrls)
      ? patch.orderImageUrls
      : prev.orderImageUrls ?? [],
    id: prev.id,
    createdAt: prev.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };

  all[ix] = next;
  saveAll(all);
  return next;
}
