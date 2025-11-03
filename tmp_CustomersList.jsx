// src/features/customers/CustomersList.jsx
import { useEffect, useMemo, useState } from 'react';
import { listCustomers, createCustomer, updateCustomer, removeCustomer } from '@/lib/localApi';
import { cloudAvailable, listCloudCustomers, listCloudOrders, latestOrderTimestampByUser } from '@/lib/cloudApi';
import CloudImage from '@/components/CloudImage.jsx';
import CustomerForm from './CustomerForm';

export default function CustomersList(){
  const [rows,setRows]=useState([]);
  const [filter,setFilter]=useState('');
  const [editing,setEditing]=useState(null);
  const [importing,setImporting]=useState(false);
  const directMode = String(import.meta.env.VITE_USE_FIREBASE_DIRECT || '').toLowerCase() === 'true';
  const requireAuth = String(import.meta.env.VITE_REQUIRE_AUTH || '').toLowerCase() === 'true';

  async function refresh(){ setRows(await listCustomers()); }
  useEffect(()=>{ refresh(); }, []);

  const filtered = useMemo(()=>{
    const f = filter.toLowerCase();
    return rows.filter(r =>
      (r.name||'').toLowerCase().includes(f) ||
      (r.email||'').toLowerCase().includes(f) ||
      (r.phone||'').toLowerCase().includes(f) ||
      (r.city||'').toLowerCase().includes(f) ||
      (r.tag||'').toLowerCase().includes(f)
    );
  },[rows,filter]);

  async function onCreate(data){ await createCustomer(data); await refresh(); }
  async function onUpdate(id,data){ await updateCustomer(id,data); setEditing(null); await refresh(); }
  async function onDelete(id){ if(confirm('Delete?')) { await removeCustomer(id); await refresh(); } }

  async function importFromFirebase(){
    if(!directMode){ alert('Direct Firebase import is disabled. Use server sync from Dashboard.'); return; }
    if(!requireAuth){ alert('Direct Firebase import requires login enabled. Set VITE_REQUIRE_AUTH=true or use server sync.'); return; }
    if(!cloudAvailable()){ alert('Firebase config missing. Check src/.env'); return; }
    setImporting(true);
    let created=0, updated=0, scanned=0;
    try{
      const cloud = await listCloudCustomers();
      scanned = Array.isArray(cloud) ? cloud.length : 0;

      // Read local customers directly from server API to avoid direct-mode override
      const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api').replace(/\/$/, '');
      let local = [];
      try { const res = await fetch(`${API_URL}/customers`); if(res.ok) local = await res.json(); } catch {}

      const byUid = new Map(local.filter(x=>x.firebaseUid).map(x=>[String(x.firebaseUid), x]));
      const byEmail = new Map(local.filter(x=>x.email).map(x=>[String(x.email).toLowerCase(), x]));

      for(const c of cloud){
        const uid = c.firebaseUid || c.uid || c.id;
        const email = (c.email||'').toLowerCase();
        const payload = {
          name: c.name,
          email: c.email || undefined,
          phone: c.phone || undefined,
          city: c.city || undefined,
          tag: c.tag || undefined,
          notes: c.notes || undefined,
          logoUrl: c.logoUrl || undefined,
          firebaseUid: uid || undefined,
          lastOrderAt: c.lastOrderAt || undefined,
        };
        const target = (uid && byUid.get(String(uid))) || (email && byEmail.get(email)) || null;
        try{
          if(target){ await updateCustomer(target.id, payload); updated++; }
          else { await createCustomer(payload); created++; }
        } catch {}
      }

      // Enrich lastOrderAt from orders (optional)
      try{
        const orders = await listCloudOrders();
        const latest = latestOrderTimestampByUser(orders);
        for(const [uid, when] of latest.entries()){
          const t = byUid.get(String(uid));
          if(!t) continue;
          await updateCustomer(t.id, { lastOrderAt: when });
        }
      } catch {}

      alert(`׳™׳™׳‘׳•׳ ׳”׳¡׳×׳™׳™׳\n׳ ׳¡׳¨׳§׳•: ${scanned}\n׳ ׳•׳¦׳¨׳•: ${created}\n׳¢׳•׳“׳›׳ ׳•: ${updated}`);
      await refresh();
      const direct = String(import.meta.env.VITE_USE_FIREBASE_DIRECT || '').toLowerCase() === 'true';
      if(direct){ console.warn('Direct Firebase mode is ON. UI may show cloud data; set VITE_USE_FIREBASE_DIRECT=false to view server data.'); }
    } finally { setImporting(false); }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="m-0">Customers</h1>
        <input className="form-control w-auto" placeholder="Searchג€¦" value={filter} onChange={e=>setFilter(e.target.value)} />
      </div>

      <div className="card mb-4">
        <div className="card-header">Add Customer</div>
        <div className="card-body">
          <CustomerForm onSubmit={onCreate}/>
        </div>
      </div>

      {/* Client-side import from Firebase (only visible when direct mode + auth) */}
      {directMode && requireAuth && (
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>Import from Firebase</span>
          <button
            className="btn btn-outline-success"
            onClick={importFromFirebase}
            disabled={importing}
            title="׳™׳™׳‘׳•׳ ׳™׳©׳™׳¨ ׳׳₪׳™׳™׳¨׳¡׳˜׳•׳¨"
          >
            {importing && (
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            )}
            Run Import
          </button>
        </div>
        <div className="card-body text-muted small">
          Reads directly from Firestore in the browser and upserts into the local server database.
        </div>
      </div>

      )}

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th style={{width:56}}>Logo</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>City</th>
              <th>Tag</th>
              <th>Order images</th>
              <th style={{width:180}}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c=>(
              <tr key={c.id}>
                {/* Logo */}
                <td>
                  {c.logoUrl
                    ? <CloudImage src={c.logoUrl} alt="" className="rounded border" style={{width:40,height:40,objectFit:'cover'}}/>
                    : <div className="rounded border bg-light" style={{width:40,height:40}}/>
                  }
                </td>

                {/* Name (link) */}
                <td><a href={`/customers/${c.id}`}>{c.name}</a></td>

                <td>{c.email||'ג€”'}</td>
                <td>{c.phone||'ג€”'}</td>
                <td>{c.city||'ג€”'}</td>
                <td><span className="badge text-bg-secondary">{c.tag||'ג€”'}</span></td>

                {/* Order images: thumbnails + counter */}
                <td>
                  {Array.isArray(c.orderImageUrls) && c.orderImageUrls.length > 0 ? (
                    <div className="d-flex align-items-center gap-2">
                      <div className="d-flex gap-1">
                        {c.orderImageUrls.slice(0,3).map((u,i)=>(
                          <CloudImage key={i} src={u} alt="" className="rounded border"
                                      style={{width:28,height:28,objectFit:'cover'}}/>
                        ))}
                      </div>
                      {c.orderImageUrls.length > 3 && (
                        <span className="badge text-bg-light">+{c.orderImageUrls.length - 3}</span>
                      )}
                    </div>
                  ) : <span className="text-muted">ג€”</span>}
                </td>

                {/* Actions */}
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-primary me-2" onClick={()=>setEditing(c)}>Edit</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={()=>onDelete(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={8} className="text-center text-muted py-4">No results</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="card mt-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>Edit: {editing.name}</strong>
            <button className="btn-close" onClick={()=>setEditing(null)} />
          </div>
          <div className="card-body">
            <CustomerForm
              defaultValues={editing}
              onSubmit={(d)=>onUpdate(editing.id,d)}
              onCancel={()=>setEditing(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}

