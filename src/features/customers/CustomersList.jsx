import { useEffect, useMemo, useState } from 'react';
import { listCustomers, createCustomer, updateCustomer, removeCustomer } from '@/lib/localApi';
import CustomerForm from './CustomerForm';

export default function CustomersList(){
  const [rows,setRows]=useState([]);
  const [filter,setFilter]=useState('');
  const [editing,setEditing]=useState(null);

  async function refresh(){ setRows(await listCustomers()); }
  useEffect(()=>{ refresh(); }, []);

  const filtered = useMemo(()=>{
    const f = filter.toLowerCase();
    return rows.filter(r =>
      (r.name||'').toLowerCase().includes(f) ||
      (r.email||'').toLowerCase().includes(f) ||
      (r.phone||'').toLowerCase().includes(f) ||
      (r.city||'').toLowerCase().includes(f)
    );
  },[rows,filter]);

  async function onCreate(data){ await createCustomer(data); await refresh(); }
  async function onUpdate(id,data){ await updateCustomer(id,data); setEditing(null); await refresh(); }
  async function onDelete(id){ if(confirm('Delete?')) { await removeCustomer(id); await refresh(); } }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="m-0">Customers</h1>
        <input className="form-control w-auto" placeholder="Search…" value={filter} onChange={e=>setFilter(e.target.value)} />
      </div>

      <div className="card mb-4">
        <div className="card-header">Add Customer</div>
        <div className="card-body">
          <CustomerForm onSubmit={onCreate}/>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table align-middle">
          <thead><tr>
            <th>Name</th><th>Email</th><th>Phone</th><th>City</th><th>Tag</th><th style={{width:160}}></th>
          </tr></thead>
          <tbody>
            {filtered.map(c=>(
              <tr key={c.id}>
                <td><a href={`/customers/${c.id}`}>{c.name}</a></td>
                <td>{c.email||'—'}</td>
                <td>{c.phone||'—'}</td>
                <td>{c.city||'—'}</td>
                <td><span className="badge text-bg-secondary">{c.tag||'—'}</span></td>
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-primary me-2" onClick={()=>setEditing(c)}>Edit</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={()=>onDelete(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={6} className="text-center text-muted py-4">No results</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="card mt-4">
          <div className="card-header d-flex justify-content-between">
            <strong>Edit: {editing.name}</strong>
            <button className="btn-close" onClick={()=>setEditing(null)} />
          </div>
          <div className="card-body">
            <CustomerForm defaultValues={editing} onSubmit={(d)=>onUpdate(editing.id,d)} onCancel={()=>setEditing(null)} />
          </div>
        </div>
      )}
    </>
  );
}
