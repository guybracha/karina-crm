export const TAGS = ['lead', 'prospect', 'customer', 'vip'] as const;
export type Tag = typeof TAGS[number];

export type Customer = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  tag?: Tag | '';
  notes?: string;

  // חדשים:
  logoUrl?: string;          // לוגו הלקוח (קובץ יחיד)
  orderImageUrls?: string[]; // תמונות להזמנה (רבות)

  createdAt?: number;
  updatedAt?: number;
};

export function emptyCustomer(): Customer {
  return {
    name: '',
    email: '',
    phone: '',
    city: '',
    tag: '',
    notes: '',
    logoUrl: '',
    orderImageUrls: [],    // ברירת מחדל
  };
}
