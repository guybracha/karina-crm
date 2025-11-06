import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import auth, { provider } from '@/firebase/client';
import { onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { getDb } from '@/lib/firebaseClient';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const Ctx = createContext({ user: null, loading: true, isActiveStaff: false, role: null, login: async () => {}, logout: async () => {}, loginEmail: async (_e,_p)=>{}, register: async (_name,_e,_p)=>{} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isActiveStaff, setIsActiveStaff] = useState(false);
  const [role, setRole] = useState(null);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setLoading(false);
      try {
        if (u) {
          await u.getIdToken(true);
          // Ensure staff profile document exists/updated
          try {
            const db = getDb();
            if (db) {
              await setDoc(doc(db, 'staff', u.uid), {
                displayName: u.displayName || null,
                email: u.email || null,
                role: 'employee',
                active: true,
                updatedAt: serverTimestamp(),
              }, { merge: true });
              const snap = await getDoc(doc(db, 'staff', u.uid));
              if (snap.exists()) {
                const d = snap.data() || {};
                setIsActiveStaff(!!d.active || d.status === 'active');
                setRole(d.role || null);
              } else {
                setIsActiveStaff(false);
                setRole(null);
              }
            }
          } catch { setIsActiveStaff(false); setRole(null); }
        }
      } catch {}
    });
    return () => { try { unsub(); } catch {} };
  }, []);

  const api = useMemo(() => ({
    user,
    loading,
    isActiveStaff,
    role,
    login: async () => {
      if (!auth) return;
      if (isElectron && window.electronAPI?.googleOAuth) {
        const tokens = await window.electronAPI.googleOAuth();
        if (!tokens?.id_token) throw new Error('Google OAuth did not return id_token');
        const cred = GoogleAuthProvider.credential(tokens.id_token);
        await signInWithCredential(auth, cred);
        return;
      }
      await signInWithPopup(auth, provider);
    },
    logout: async () => { if (!auth) return; await signOut(auth); },
    loginEmail: async (email, password) => {
      if (!auth) return; await signInWithEmailAndPassword(auth, email, password);
    },
    register: async (name, email, password) => {
      if (!auth) return;
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      try { if (name) await updateProfile(cred.user, { displayName: name }); } catch {}
      // Create staff document
      try {
        const db = getDb();
        if (db) {
          await setDoc(doc(db, 'staff', cred.user.uid), {
            displayName: name || null,
            email: email || null,
            role: 'employee',
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      } catch {}
      await cred.user.getIdToken(true);
    },
  }), [user, loading, isActiveStaff, role, isElectron]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAuth() { return useContext(Ctx); }
