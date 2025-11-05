import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err,setErr] = useState('');
  const [busy,setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      const to = loc.state?.from?.pathname || '/';
      nav(to, { replace: true });
    }
  }, [user]);

  return (
    <div className="container py-5" style={{maxWidth:480}}>
      <h1 className="mb-3">הרשמת עובד</h1>
      {err && <div className="alert alert-danger" role="alert">{err}</div>}
      <div className="mb-3">
        <label className="form-label">שם מלא</label>
        <input className="form-control" value={name} onChange={e=>setName(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Email</label>
        <input className="form-control" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Password</label>
        <input className="form-control" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      </div>
      <div className="d-flex gap-2">
        <button className="btn btn-success" disabled={busy} onClick={async()=>{
          try{ setErr(''); setBusy(true); await register(name, email, password); }
          catch(e){ setErr(e?.message||'Registration failed'); }
          finally{ setBusy(false); }
        }}>הרשמה</button>
        <a className="btn btn-outline-secondary" href="/login">יש לך חשבון? התחבר/י</a>
      </div>
    </div>
  );
}

