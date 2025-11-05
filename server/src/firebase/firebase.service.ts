import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AdminApp = any;

@Injectable()
export class FirebaseService {
  private app: AdminApp | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async ensureInit(): Promise<AdminApp | null> {
    if (this.app) return this.app;
    let admin: any;
    try {
      admin = await import('firebase-admin');
    } catch (err) {
      // firebase-admin not installed
      return null;
    }

    // Try to init from env
    const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey && privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');

    try {
      if (saJson) {
        const cred = admin.credential.cert(JSON.parse(saJson));
        this.app = admin.initializeApp({ credential: cred });
      } else if (saPath) {
        const cred = admin.credential.cert(require(saPath));
        this.app = admin.initializeApp({ credential: cred });
      } else if (projectId && clientEmail && privateKey) {
        const cred = admin.credential.cert({ projectId, clientEmail, privateKey });
        this.app = admin.initializeApp({ credential: cred });
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }

    return this.app;
  }

  async canSync(): Promise<boolean> {
    return (await this.ensureInit()) != null;
  }

  async syncUsersFromFirestore(): Promise<{ created: number; updated: number; total: number }> {
    const app = await this.ensureInit();
    if (!app) throw new Error('Firebase Admin not configured');
    const admin: any = await import('firebase-admin');
    const usersColl = process.env.FIREBASE_USERS_COLLECTION || 'users_prod';

    const snap = await admin.firestore().collection(usersColl).get();

    let created = 0;
    let updated = 0;
    let total = 0;

    snap.forEach((doc: any) => {
      total++;
    });

    // Use for..of to await inside loop
    for (const doc of snap.docs) {
      const d: any = doc.data() || {};
      const uid: string | undefined = d.uid || d.userId || d.userUID || doc.id;
      const name: string = d.name || d.fullName || [d.firstName, d.lastName].filter(Boolean).join(' ') || d.email || d.phone || 'User';
      const email: string | undefined = d.email || d.mail || undefined;
      const phone: string | undefined = d.phone || d.phoneNumber || d.mobile || undefined;
      const city: string | undefined = d.city || d.addressCity || undefined;
      const tag: string | undefined = d.tag || d.segment || undefined;
      const notes: string | undefined = d.notes || undefined;

      const payload: any = { name, email, phone, city, tag, notes, firebaseUid: uid };

      if (uid) {
        const exists = await this.prisma.customer.findFirst({ where: { firebaseUid: uid } });
        if (exists) {
          await this.prisma.customer.update({ where: { id: exists.id }, data: payload });
          updated++;
          continue;
        }
      }

      if (uid) {
        // Create with uid
        await this.prisma.customer.create({ data: payload });
        created++;
      } else if (email) {
        // Fallback: try match by email
        const byEmail = await this.prisma.customer.findFirst({ where: { email } });
        if (byEmail) {
          await this.prisma.customer.update({ where: { id: byEmail.id }, data: payload });
          updated++;
        } else {
          await this.prisma.customer.create({ data: payload });
          created++;
        }
      } else {
        // No uid/email, just create minimal
        await this.prisma.customer.create({ data: payload });
        created++;
      }
    }

    return { created, updated, total };
  }

  async syncOrdersFromFirestore(): Promise<{ updated: number; scanned: number }> {
    const app = await this.ensureInit();
    if (!app) throw new Error('Firebase Admin not configured');
    const admin: any = await import('firebase-admin');
    const coll = process.env.FIREBASE_ORDERS_COLLECTION || 'orders_prod';
    const snap = await admin.firestore().collection(coll).get();
    let scanned = 0;
    const latestByUid = new Map<string, Date>();
    snap.forEach((doc: any) => {
      scanned++;
      const d = doc.data() || {};
      const uid: string | undefined = d.userId || d.uid || d.userUID || d.user || undefined;
      if (!uid) return;
      const ts = d.createdAt || d.created_at || d.timestamp || d.placedAt;
      let when: Date | null = null;
      if (ts?.toDate) when = ts.toDate();
      else if (typeof ts === 'number') when = new Date(ts);
      else if (typeof ts === 'string') when = new Date(ts);
      if (!when || Number.isNaN(+when)) return;
      const prev = latestByUid.get(uid);
      if (!prev || +when > +prev) latestByUid.set(uid, when);
    });

    let updated = 0;
    for (const [uid, when] of latestByUid.entries()) {
      const cust = await this.prisma.customer.findFirst({ where: { firebaseUid: uid } });
      if (!cust) continue;
      // Update lastOrderAt
      await this.prisma.customer.update({ where: { id: cust.id }, data: { lastOrderAt: when } });
      // Upsert follow-up task (delete old followups and create a new one)
      await this.prisma.task.deleteMany({ where: { customerId: cust.id, kind: 'followup' } }).catch(() => {});
      const due = new Date(when);
      due.setMonth(due.getMonth() + 6);
      await this.prisma.task.create({
        data: {
          customerId: cust.id,
          title: 'Follow-up call after last order',
          dueAt: due,
          status: 'open',
          kind: 'followup',
        },
      });
      updated++;
    }

    return { updated, scanned };
  }

  async syncStaffClaimsFromFirestore(): Promise<{ updated: number; scanned: number }> {
    const app = await this.ensureInit();
    if (!app) throw new Error('Firebase Admin not configured');
    const admin: any = await import('firebase-admin');
    const coll = 'staff';
    const snap = await admin.firestore().collection(coll).get();
    let scanned = 0;
    let updated = 0;
    for (const doc of snap.docs) {
      scanned++;
      const d = (doc.data && doc.data()) || {};
      const uid: string = doc.id;
      const active = d.active === true || d.status === 'active';
      const role = d.role || null;
      const claims: any = {};
      if (active) {
        claims.employee = true;
        if (role === 'admin') claims.admin = true;
        else claims.admin = false;
      } else {
        claims.employee = false;
        claims.admin = false;
      }
      await admin.auth().setCustomUserClaims(uid, claims).catch(() => {});
      updated++;
    }
    return { updated, scanned };
  }
}
