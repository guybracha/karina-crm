import { useEffect, useState } from "react";
import { auth, provider } from "../firebase/client";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

export default function AuthGate({ children }) {
  const [user, setUser] = useState(undefined); // undefined=טוען, null=לא מחובר

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) return <div className="container py-4">Loading…</div>;
  if (!user) {
    return (
      <div className="container py-5 text-center">
        <h2 className="mb-3">התחבר למערכת</h2>
        <button className="btn btn-primary" onClick={() => signInWithPopup(auth, provider)}>
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
