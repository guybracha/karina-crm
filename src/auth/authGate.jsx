import { useEffect, useState } from "react";
import { auth, provider } from "../firebase/client";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";

export default function AuthGate({ children }) {
  const [user, setUser] = useState(undefined);
  const allowedDomain = (import.meta.env.VITE_ALLOWED_GOOGLE_DOMAIN || '').toLowerCase();
  const allowedEmails = String(import.meta.env.VITE_ALLOWED_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  useEffect(() => {
    if (!auth) { setUser(null); return; }
    return onAuthStateChanged(auth, setUser);
  }, []);

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
    async function doGoogleSignIn(){
      if(!auth) return;
      try{
        await signInWithPopup(auth, provider);
      }catch(e){
        const code = e?.code || '';
        // Fallback to redirect on popup/cookie/internal issues
        if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || code === 'auth/internal-error'){
          try{ await signInWithRedirect(auth, provider); return; }catch(e2){ console.error('Redirect sign-in failed', e2); }
        }
        console.error('Google sign-in failed', e);
        alert(`Sign-in failed: ${code || 'unknown error'}. If this persists, allow third-party cookies and disable extensions blocking popups, and ensure localhost is in Firebase Authorized domains.`);
      }
    }
    return (
      <div className="container py-5 text-center">
        <h2 className="mb-3">Sign in required</h2>
        <button className="btn btn-primary" onClick={doGoogleSignIn}>
          Sign in with Google
        </button>
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
