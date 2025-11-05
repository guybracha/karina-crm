import { useEffect, useState } from "react";
import { auth } from "../firebase/client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getDb } from "@/lib/firebaseClient";
import { collection, doc, getDoc, getDocs, query, where, limit } from "firebase/firestore";

export default function AuthGate({ children }) {
  const [user, setUser] = useState(undefined);
  const [staffAllowed, setStaffAllowed] = useState(undefined);
  const allowedDomain = (import.meta.env.VITE_ALLOWED_GOOGLE_DOMAIN || '').toLowerCase();
  const allowedEmails = String(import.meta.env.VITE_ALLOWED_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const staffColl = import.meta.env.VITE_FIREBASE_STAFF_COLLECTION || 'staff';

  useEffect(() => {
    if (!auth) { setUser(null); return; }
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Check Firestore staff membership for the signed-in user (by UID doc, fallback by email)
  useEffect(() => {
    let cancelled = false;
    async function checkStaff(u){
      try{
        setStaffAllowed(undefined);
        const db = getDb();
        if(!db || !u) { setStaffAllowed(false); return; }
        // Try by UID document
        const ref = doc(collection(db, staffColl), String(u.uid));
        const snap = await getDoc(ref);
        if (snap.exists()){
          const data = snap.data() || {};
          const active = data.active ?? data.enabled ?? true;
          if(!cancelled) setStaffAllowed(!!active);
          return;
        }
        // Fallback by email field
        const email = String(u.email || '').toLowerCase();
        if (email){
          const q = query(collection(db, staffColl), where('email','==', email), limit(1));
          const qs = await getDocs(q);
          if(!qs.empty){
            const data = qs.docs[0].data() || {};
            const active = data.active ?? data.enabled ?? true;
            if(!cancelled) setStaffAllowed(!!active);
            return;
          }
        }
        if(!cancelled) setStaffAllowed(false);
      }catch{
        if(!cancelled) setStaffAllowed(false);
      }
    }
    if (user) checkStaff(user); else setStaffAllowed(undefined);
    return () => { cancelled = true; };
  }, [user, staffColl]);


  if (user === undefined) return <div className="container py-4">Loading...</div>;
  // If a domain restriction is configured, enforce it client-side for UX (backend must also enforce)
  if (user && allowedDomain) {
    const email = String(user.email || '').toLowerCase();
    const ok = email.endsWith(`@${allowedDomain}`);
    if (!ok) {
      return (
        <div className="container py-5 text-center">
          <h2 className="mb-3">Access restricted</h2>
          <p className="text-muted">This app is limited to users from {allowedDomain}.</p>
          <div className="d-flex justify-content-center gap-2">
            <button className="btn btn-outline-secondary" onClick={() => signOut(auth)}>Sign out</button>
          </div>
        </div>
      );
    }
  }

  // If allowlist of emails is configured, enforce it client-side for UX (backend must also enforce)
  if (user && allowedEmails.length) {
    const email = String(user.email || '').toLowerCase();
    const ok = allowedEmails.includes(email);
    if (!ok) {
      return (
        <div className="container py-5 text-center">
          <h2 className="mb-3">Access restricted</h2>
          <p className="text-muted">This app is limited to specific authorized users.</p>
          <div className="text-muted small">Signed in as: {user.email}</div>
          <div className="d-flex justify-content-center gap-2 mt-3">
            <button className="btn btn-outline-secondary" onClick={() => signOut(auth)}>Sign out</button>
          </div>
        </div>
      );
    }
  }
  if (!user) {
    return (
      <div className="container py-5 text-center">
        <h2 className="mb-3">נדרש להתחבר</h2>
        <p className="text-muted">התחברות באמצעות גוגל הוסרה. פנה למנהל המערכת לקבלת גישה.</p>
      </div>
    );
  }

  // Enforce Firestore staff membership
  if (staffAllowed === undefined) {
    return <div className="container py-5 text-center">Validating access…</div>;
  }
  if (!staffAllowed) {
    return (
      <div className="container py-5 text-center">
        <h2 className="mb-3">Access restricted</h2>
        <p className="text-muted">Your account is not listed in the staff directory.</p>
        <div className="text-muted small">Ask an administrator to add your UID or email to the <code>{staffColl}</code> collection.</div>
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button className="btn btn-outline-secondary" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="container d-flex justify-content-end pt-2">
        <div className="d-flex align-items-center gap-2">
          {user.photoURL && <img src={user.photoURL} alt="" style={{width:28,height:28,borderRadius:'50%'}}/>}
          <span className="small">{user.displayName || user.email}</span>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => signOut(auth)}>Logout</button>
        </div>
      </div>
      {children}
    </div>
  );
}
