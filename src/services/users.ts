// services/users.ts
import { db } from "../firebase";
import { doc, setDoc, serverTimestamp, getDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/** יצירה חד־פעמית אחרי רישום/כניסה ראשונה */
export async function ensureUserDoc() {
  const auth = getAuth();
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");

  const ref = doc(db, "users_prod", u.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // create חייב createdAt/updatedAt == request.time:
    await setDoc(ref, {
      displayName: u.displayName ?? null,
      email: u.email ?? null,
      phoneNumber: u.phoneNumber ?? null,
      company: null,
      photoURL: u.photoURL ?? null,
      marketingConsent: false,
      marketingConsentAt: null, // מותר גם timestamp או string לפי החוקים שלך
      marketingConsentMethod: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/** עדכון פרופיל — רק מפתחות מותרים! */
export async function updateUserProfile(patch: {
  displayName?: string|null;
  email?: string|null;
  phoneNumber?: string|null;
  company?: string|null;
  photoURL?: string|null;
  marketingConsent?: boolean;
  marketingConsentAt?: any;           // timestamp|string|null מותר בחוקים
  marketingConsentMethod?: string|null;
}) {
  const auth = getAuth();
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");

  const ref = doc(db, "users_prod", u.uid);
  await updateDoc(ref, {
    ...patch,                       // רק מפתחות מהרשימה המותרת
    updatedAt: serverTimestamp(),   // חובה!
  });
}
