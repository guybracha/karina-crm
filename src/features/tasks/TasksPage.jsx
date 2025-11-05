import { useEffect, useMemo, useState } from 'react';
import { listTasks, createTask, removeTask, updateTask } from '@/lib/tasksApi.js';
import { listCustomers } from '@/lib/localApi.js';

function formatDateTimeLocal(ms) {
  try {
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
  } catch { return ''; }
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ customerId: '', title: '', dueAt: formatDateTimeLocal(Date.now()), kind: '' });
  const canSave = useMemo(() => form.customerId && form.title && form.dueAt, [form]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [t, c] = await Promise.all([listTasks(), listCustomers()]);
        setTasks(t);
        setCustomers(Array.isArray(c) ? c : []);
        if (!form.customerId && c?.[0]?.id) setForm((f) => ({ ...f, customerId: String(c[0].id) }));
      } catch (e) {
        setError(e?.message || String(e));
      } finally { setLoading(false); }
    })();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSave) return;
    try {
      setError('');
      const iso = new Date(form.dueAt).toISOString();
      await createTask({ customerId: String(form.customerId), title: form.title.trim(), dueAt: iso, kind: form.kind || undefined });
      const next = await listTasks();
      setTasks(next);
      setForm((f) => ({ ...f, title: '' }));
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  return (
    <div className="container">
      <h2 className="mb-3">משימות</h2>
      <form className="row g-2 align-items-end mb-4" onSubmit={onSubmit}>
        <div className="col-12 col-md-3">
          <label className="form-label">לקוח</label>
          <select className="form-select" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
            {customers.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name || c.id}</option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label">כותרת</label>
          <input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="לדוגמה: שיחת פולואפ" />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label">תאריך יעד</label>
          <input type="datetime-local" className="form-control" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label">סוג</label>
          <input className="form-control" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} placeholder="אופציונלי" />
        </div>
        <div className="col-12">
          <button className="btn btn-primary" disabled={!canSave}>הוסף משימה</button>
          {loading && <span className="ms-3 text-muted">טוען…</span>}
          {error && <span className="ms-3 text-danger">{error}</span>}
        </div>
      </form>

      <div className="table-responsive">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>לקוח</th>
              <th>כותרת</th>
              <th>יעד</th>
              <th>סטטוס</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td>{String(t.customerId)}</td>
                <td>{t.title}</td>
                <td>{t.dueAt ? new Date(t.dueAt).toLocaleString() : ''}</td>
                <td>{t.status}</td>
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-success me-2" onClick={async () => {
                    await updateTask(t.id, { status: t.status === 'done' ? 'open' : 'done' });
                    setTasks(await listTasks());
                  }}>
                    סמן {t.status === 'done' ? 'כפתוח' : 'כהושלם'}
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={async () => {
                    await removeTask(t.id);
                    setTasks(await listTasks());
                  }}>מחק</button>
                </td>
              </tr>
            ))}
            {!tasks.length && !loading && (
              <tr><td colSpan="5" className="text-center text-muted">אין משימות</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

