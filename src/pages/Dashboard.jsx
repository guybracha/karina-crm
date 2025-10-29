import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../lib/localApi";

export default function Dashboard() {
  const [customers, setCustomers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [syncReady, setSyncReady] = useState(false); // kept for future actions
  const [syncing, setSyncing] = useState(false);     // kept for future actions

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

      if (typeof api.firebaseSyncStatus === 'function') {
        try { setSyncReady(await api.firebaseSyncStatus()); } catch {}
      }
    })();
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

  return (
    <div className="container-fluid dashboard">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="m-0">Dashboard</h1>
        <input
          className="form-control"
          style={{ maxWidth: 420 }}
          placeholder="חיפוש, תיוג, ליד, לקוח…"
        />
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
                <div className="d-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div>
                    <div className="text-muted small mb-1">Lead</div>
                    <div className="cell mb-2" />
                    <div className="cell mb-2" />
                    <div className="cell" />
                  </div>
                  <div>
                    <div className="text-muted small mb-1">Qualified</div>
                    <div className="cell mb-2" />
                    <div className="cell mb-2" />
                    <div className="cell" />
                  </div>
                  <div>
                    <div className="text-muted small mb-1">Proposal</div>
                    <div className="cell mb-2" />
                    <div className="cell mb-2" />
                    <div className="cell" />
                  </div>
                </div>
              </div>
            </div>
          </div>
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

