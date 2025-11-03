import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCustomer, updateCustomer, removeCustomer } from '@/lib/localApi';
import { formatDateTime } from '@/lib/date';
import CustomerForm from './CustomerForm';
import CustomerPhotos from "./CustomerPhotos";

export default function CustomerDetails(){
  const { id } = useParams();
  const nav = useNavigate();
  const [cust,setCust]=useState(null);
  const [edit,setEdit]=useState(false);

  useEffect(()=>{ getCustomer(id).then(setCust); },[id]);

  if(cust===null) return <p className="text-muted">Loading…</p>;
  if(!cust) return <p className="text-danger">Customer not found.</p>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="m-0">{cust.name}</h1>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={()=>setEdit(v=>!v)}>{edit?'Close edit':'Edit'}</button>
          <button className="btn btn-outline-danger" onClick={async()=>{
            if(confirm('Delete?')){ await removeCustomer(id); nav('/customers'); }
          }}>Delete</button>
        </div>
      </div>

      {!edit ? (
        <div className="card">
          <div className="card-body">
            <p><strong>Email:</strong> {cust.email||'—'}</p>
            <p><strong>Phone:</strong> {cust.phone||'—'}</p>
            <p><strong>City:</strong> {cust.city||'—'}</p>
            <p><strong>Tag:</strong> <span className="badge text-bg-secondary">{cust.tag||'—'}</span></p>
            <p><strong>Notes:</strong><br/>{cust.notes||'—'}</p>
          </div>
            <p className="mb-1"><strong>Created:</strong> <span className="text-muted">{formatDateTime(cust.createdAt) || '—'}</span></p>
            <p><strong>Updated:</strong> <span className="text-muted">{formatDateTime(cust.updatedAt) || '—'}</span></p>
          <CustomerPhotos
            id={id}
            urls={cust.orderImageUrls || []}
            onChange={(next) => setCust((prev) => ({ ...prev, orderImageUrls: next }))}
          />
        </div>
        
      ) : (
        <div className="card">
          <div className="card-body">
            <CustomerForm
              defaultValues={cust}
              onSubmit={async (d)=>{
                // Sanitize payload to avoid validation errors (exclude client-only fields)
                const patch = {
                  name: d.name,
                  email: d.email || undefined,
                  phone: d.phone || undefined,
                  city: d.city || undefined,
                  tag: d.tag || undefined,
                  notes: d.notes || undefined,
                  logoUrl: d.logoUrl || undefined,
                  firebaseUid: d.firebaseUid || undefined,
                  lastOrderAt: d.lastOrderAt || undefined,
                };
                await updateCustomer(id, patch);
                setEdit(false);
                setCust(await getCustomer(id));
              }}
              onCancel={()=>setEdit(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
