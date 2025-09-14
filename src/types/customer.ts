export const TAGS = ['lead', 'prospect', 'customer', 'vip'] as const;
export type Tag = typeof TAGS[number];

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'order';

export type Activity = {
  id: string;
  type: ActivityType;
  description: string;
  date: number;
  user?: string;
};

export type ContactPerson = {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
};

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

  // מורחבים:
  companyName?: string;
  website?: string;
  address?: string;
  industry?: string;
  contacts?: ContactPerson[];
  status?: 'active' | 'inactive' | 'archived';
  documents?: string[];
  activities?: Activity[];
  customFields?: Record<string, string | number | boolean>;

  // תאריכים
  createdAt?: number;
  updatedAt?: number;
  lastContactedAt?: number;
  nextFollowUpAt?: number;
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
    orderImageUrls: [],
    companyName: '',
    website: '',
    address: '',
    industry: '',
    contacts: [],
    status: 'active',
    documents: [],
    activities: [],
    customFields: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
