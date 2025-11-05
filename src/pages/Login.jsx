import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext.jsx';

export default function Login() {
  const { user, login, loginEmail } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err,setErr] = useState('');
  useEffect(() => {
    if (user) {
      const to = loc.state?.from?.pathname || '/';
      nav(to, { replace: true });
    }
  }, [user]);
  return (
    <div className="container py-5">
      <h1 className="mb-3">התחברות עובדים</h1>
      <div className="row g-3" style={{maxWidth:420}}>
        {err && <div className="alert alert-danger" role="alert">{err}</div>}
        <div className="col-12">
          <label className="form-label">Email</label>
          <input className="form-control" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label">Password</label>
          <input className="form-control" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <div className="col-12 d-flex gap-2">
          <button className="btn btn-primary" onClick={async()=>{ try{ setErr(''); await loginEmail(email, password); } catch(e){ setErr(e?.message||'Login failed'); } }}>התחבר</button>
          <a className="btn btn-outline-secondary" href="/register">אין לך חשבון? להרשמה</a>
        </div>
        <div className="col-12"><hr/></div>
        <div className="col-12">
          <button className="btn btn-outline-primary" onClick={login}>או התחברות עם Google</button>
        </div>
      </div>
    </div>
  );
}
