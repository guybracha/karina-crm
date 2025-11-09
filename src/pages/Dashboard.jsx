import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../lib/localApi";
import { cloudAvailable, listCloudOrders } from "../lib/cloudApi";
import { fetchCrmOrders } from "../lib/functionsApi";

// Mini pipeline (temporary, client-only) configuration
const PIPELINE_STAGES = ['received','graphics','production','shipped'];
const PIPELINE_LABEL = {
  received: 'ההזמנה התקבלה',
  graphics: 'מצב גרפיקה',
  production: 'מצב ביצוע',
  shipped: 'נשלח ליעדו',
};
const PIPELINE_STORAGE_KEY = 'crm:order-pipeline';
function loadPipelineStageMap(){
  try { return JSON.parse(localStorage.getItem(PIPELINE_STORAGE_KEY) || '{}') || {}; } catch { return {}; }
}
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function Dashboard() {
  const [customers, setCustomers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersSource, setOrdersSource] = useState('');

  useEffect(() => {
    (async () => {
      const cs = await api.listCustomers();
      setCustomers(cs || []);

      if (typeof api.listDeals === "function") {
        try { setDeals(await api.listDeals()); } catch {}
      }
      if (typeof api.listTasks === "function") {
        try { setTasks(await api.listTasks()); } catch {}
      }
    })();
  }, []);


  // Load orders: prefer Cloud Function when enabled, else Firestore
  useEffect(() => {
    let abort = false;
    (async () => {
      if (!cloudAvailable()) return;
      const useCF = String(import.meta.env.VITE_USE_CF_ORDERS || '').toLowerCase() === 'true';
      try {
        if (useCF) {
          try {
            const o = await fetchCrmOrders();
            if (!abort) { setOrders(o || []); setOrdersSource('CF'); }
            return;
          } catch {}
        }
        const o = await listCloudOrders();
        if (!abort) { setOrders(o || []); setOrdersSource('Firestore'); }
      } catch {}
    })();
    return () => { abort = true; };
  }, []);

  // Basic KPIs
  const todaysTasks = useMemo(() => {
    if (!tasks.length) return [];
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(start.getTime() + 24*60*60*1000);
    return tasks.filter(t => t.status !== "done" && t.dueAt >= +start && t.dueAt < +end);
  }, [tasks]);

  const recent = useMemo(
    () => [...customers].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,6),
    [customers]
  );

  // Orders chart data: last 6 months
  const ordersSeries = useMemo(() => {
    const end = new Date();
    const items = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      items.push({ key, label: d.toLocaleDateString('he-IL', { month: 'short' }), count: 0, amount: 0 });
    }
    const map = Object.fromEntries(items.map(it => [it.key, it]));
    orders.forEach(o => {
      const when = o.createdAt || 0;
      if (!when) return;
      const d = new Date(when);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (map[key]) { map[key].count += 1; map[key].amount += Number(o.amount || 0); }
    });
    return items;
  }, [orders]);

  // Compute mini pipeline columns from orders + localStorage stage map
  const miniPipeline = useMemo(() => {
    const cols = Object.fromEntries(PIPELINE_STAGES.map(s => [s, []]));
    const stageMap = loadPipelineStageMap();
    for (const o of orders || []) {
      const st = PIPELINE_STAGES.includes(stageMap[o.id]) ? stageMap[o.id] : 'received';
      cols[st].push(o);
    }
    return cols;
  }, [orders]);

  return (
    <div className="container-fluid dashboard">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="m-0">Dashboard</h1>
        <div className="d-flex align-items-center gap-2 flex-wrap">
        <input
          className="form-control"
          style={{ maxWidth: 420 }}
          placeholder="חיפוש, תיוג, ליד, לקוח…"
        />
        </div>
      </div>

      {/* KPI cards */}
      <div className="row g-3 mb-3">
        <Kpi title="Total Customers" value={customers.length} badgeColor="pink" />
        <Kpi title="Leads (Deals)" value={deals.length} badgeColor="orange" />
        <Kpi title="Open Tasks" value={tasks.filter(t => t.status !== 'done').length} badgeColor="green" />
      </div>

      <div className="row g-3">
        {/* Left: Activity feed */}
        <div className="col-12 col-lg-8">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Recent Activity</span>
              <span className="badge-live pink">LIVE</span>
            </div>
            <div className="card-body">
              {!recent.length && (
                <div className="text-muted">No recent items yet.</div>
              )}
              {!!recent.length && (
                <ul className="list-unstyled activity-list mb-0">
                  {recent.map((c) => (
                    <li key={c.id} className="item d-flex align-items-center gap-2 py-2">
                      <span className="dot" />
                      <div className="flex-grow-1">
                        <div className="title truncate">{c.name || c.company || 'New customer'}</div>
                        <div className="text-muted small truncate">
                          {(c.city || '—')} • {(c.phone || '—')}
                        </div>
                      </div>
                      <Link className="btn btn-sm btn-outline-secondary" to={`/customers/${c.id}`}>Open</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="d-flex gap-2 mt-3 flex-wrap stack-sm">
            <Link to="/pipeline" className="btn btn-primary">Run PIPELINE</Link>
            <Link to="/pipeline?import=1" className="btn btn-outline-primary">Import CSV</Link>
          </div>
        </div>

        {/* Right: Pipeline mini board */}
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-header fw-semibold">Pipeline <span className="text-muted small">(overview)</span></div>
            <div className="card-body">
              <div className="kanban-mini">
                <div className="d-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {PIPELINE_STAGES.map(stage => (
                    <div key={stage}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="text-muted small">{PIPELINE_LABEL[stage] || stage}</div>
                        <span className="badge text-bg-light">{miniPipeline[stage]?.length || 0}</span>
                      </div>
                      {(miniPipeline[stage] || []).slice(0,3).map(o => (
                        <div key={o.id} className="cell mb-2" />
                      ))}
                      {((miniPipeline[stage] || []).length > 3) && (
                        <div className="text-center text-muted small">+{(miniPipeline[stage].length - 3)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders chart */}
      <div className="card mt-3">
        <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
          <span>
            Orders (last 6 months)
            {ordersSource && <span className="ms-2 badge text-bg-light">{ordersSource}</span>}
          </span>
          <span className="text-muted small">{orders.length} total</span>
        </div>
        <div className="card-body" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ordersSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(v, n) => n === 'amount' ? Math.round(v).toLocaleString('he-IL') : v} />
              <Bar dataKey="count" name="Orders" fill="#ff80a6" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ===== Helpers ===== */
function Kpi({ title, value, badgeColor = 'pink' }) {
  return (
    <div className="col-12 col-md-6 col-lg-4">
      <div className="card h-100">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div className="text-muted small">{title}</div>
            <span className={`badge-live ${badgeColor}`}>LIVE</span>
          </div>
          <div className="fs-1 fw-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}

export function formatMoney(n) {
  const x = Math.round(Number(n || 0));
  return x.toLocaleString('he-IL');
}

/* ===== Modals ===== */

