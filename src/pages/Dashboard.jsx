import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../lib/localApi"; // ייבוא גורף כדי לבדוק אם קיימים listDeals/listTasks

export default function Dashboard() {
  const [customers, setCustomers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    (async () => {
      const cs = await api.listCustomers();
      setCustomers(cs);

      // נטען דילים/משימות רק אם קיימים ב-API (נעים לעתיד)
      if (typeof api.listDeals === "function") {
        try { setDeals(await api.listDeals()); } catch {}
      }
      if (typeof api.listTasks === "function") {
        try { setTasks(await api.listTasks()); } catch {}
      }
    })();
  }, []);

  // === חישובי KPI ===
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const customersThisWeek = useMemo(
    () => customers.filter(c => (c.createdAt || 0) >= sevenDaysAgo).length,
    [customers, sevenDaysAgo]
  );

  const dataCompleteness = useMemo(() => {
    if (!customers.length) return 0;
    const ok = customers.filter(c => !!c.email && !!c.phone).length;
    return Math.round((ok / customers.length) * 100);
  }, [customers]);

  const pipeline = useMemo(() => {
    const stages = ["lead","qualified","proposal","negotiation","won","lost"];
    const sums = Object.fromEntries(stages.map(s => [s, { count: 0, amount: 0 }]));
    deals.forEach(d => {
      const s = d.stage || "lead";
      if (!sums[s]) sums[s] = { count: 0, amount: 0 };
      sums[s].count += 1;
      sums[s].amount += Number(d.amount || 0);
    });
    const prob = s => ({lead:0.1,qualified:0.25,proposal:0.5,negotiation:0.7,won:1,lost:0}[s] ?? 0.2);
    const forecast = deals.reduce((acc, d) => acc + (Number(d.amount || 0) * prob(d.stage)), 0);
    const openDeals = deals.filter(d => !["won","lost"].includes(d.stage || "")).length;
    return { sums, forecast, openDeals, stages };
  }, [deals]);

  const todaysTasks = useMemo(() => {
    if (!tasks.length) return [];
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(start.getTime() + 24*60*60*1000);
    return tasks.filter(t => t.status !== "done" && t.dueAt >= +start && t.dueAt < +end);
  }, [tasks]);

  // === Top Cities ===
  const topCities = useMemo(() => {
    const counts = new Map();
    customers.forEach(c => {
      const city = (c.city || "—").trim();
      counts.set(city, (counts.get(city) || 0) + 1);
    });
    const arr = [...counts.entries()].sort((a,b) => b[1] - a[1]).slice(0,5);
    const total = customers.length || 1;
    return arr.map(([city, count]) => ({ city, count, pct: Math.round((count/total)*100) }));
  }, [customers]);

  const recent = useMemo(
    () => [...customers].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,5),
    [customers]
  );

  return (
    <div className="container-fluid">
      <h1 className="mb-3">Dashboard</h1>

      {/* KPI Cards */}
      <div className="row g-3 mb-3">
        <Kpi title="Customers" value={customers.length}/>
        <Kpi title="New (7 days)" value={customersThisWeek}/>
        <Kpi title="Data completeness" value={`${dataCompleteness}%`}/>
        {deals.length > 0 && <Kpi title="Open deals" value={pipeline.openDeals}/>}
        {deals.length > 0 && <Kpi title="Forecast (₪)" value={formatMoney(pipeline.forecast)}/>}
        {tasks.length > 0 && <Kpi title="Today's tasks" value={todaysTasks.length}/>}
      </div>

      <div className="row g-3">
        {/* Top Cities */}
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-header fw-semibold">Top Cities</div>
            <div className="card-body">
              {topCities.length === 0 && <div className="text-muted">אין נתונים עדיין.</div>}
              {topCities.map(row => (
                <div key={row.city} className="mb-3">
                  <div className="d-flex justify-content-between small">
                    <span className="fw-semibold">{row.city}</span>
                    <span className="text-muted">{row.count} ({row.pct}%)</span>
                  </div>
                  <div className="progress" role="progressbar" aria-label={`City ${row.city}`}>
                    <div className="progress-bar" style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Customers */}
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-header fw-semibold">Recent Customers</div>
            <div className="card-body p-0">
              <table className="table mb-0 align-middle">
                <thead className="table-light">
                  <tr><th>שם</th><th>אימייל</th><th>טלפון</th></tr>
                </thead>
                <tbody>
                {recent.length === 0 && (
                  <tr><td colSpan={3} className="text-muted">עוד לא נוצרו לקוחות.</td></tr>
                )}
                {recent.map(c => (
                  <tr key={c.id}>
                    <td>{c.name || "—"}</td>
                    <td className="text-nowrap">{c.email || "—"}</td>
                    <td className="text-nowrap">{c.phone || "—"}</td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pipeline Summary (if deals קיימים) */}
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-header fw-semibold">Pipeline</div>
            <div className="card-body">
              {deals.length === 0 && <div className="text-muted">עדיין אין דילים. אפשר להתחיל מיצירת דיל חדש.</div>}
              {deals.length > 0 && (
                <div className="d-grid gap-2">
                  {pipeline.stages.map(s => {
                    const row = pipeline.sums[s] || { count: 0, amount: 0 };
                    return (
                      <div key={s} className="d-flex justify-content-between">
                        <span className="text-capitalize">{s}</span>
                        <span className="text-muted small">
                          {row.count} | ₪{formatMoney(row.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-12">
          <div className="card">
            <div className="card-header fw-semibold">Quick Actions</div>
            <div className="card-body d-flex flex-wrap gap-2">
              <Link to="/customers" className="btn btn-primary">+ לקוח חדש</Link>
              <Link to="/customers" className="btn btn-outline-secondary">ניהול לקוחות</Link>
              <Link to="/pipeline" className="btn btn-outline-secondary">פתח Pipeline</Link>
              {/* כפתור ייבוא CSV – אם יש לך מסך כזה בהמשך */}
              <button className="btn btn-outline-secondary" onClick={() => alert('Import CSV coming soon')}>
                ייבוא CSV
              </button>
            </div>
          </div>
        </div>

        {/* Today's Tasks (אם קיימות משימות) */}
        {tasks.length > 0 && (
          <div className="col-12">
            <div className="card">
              <div className="card-header fw-semibold">Today's Tasks</div>
              <div className="card-body p-0">
                <table className="table mb-0 align-middle">
                  <thead className="table-light"><tr><th>משימה</th><th>לקוח</th><th>סטטוס</th></tr></thead>
                  <tbody>
                    {todaysTasks.length === 0 && (
                      <tr><td colSpan={3} className="text-muted">אין משימות להיום.</td></tr>
                    )}
                    {todaysTasks.slice(0,5).map(t => {
                      const c = customers.find(x => x.id === t.customerId);
                      return (
                        <tr key={t.id}>
                          <td>{t.title}</td>
                          <td>{c?.name || "—"}</td>
                          <td><span className="badge text-bg-warning">open</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Helpers ===== */
function Kpi({ title, value }) {
  return (
    <div className="col-6 col-md-4 col-xl-2">
      <div className="p-3 border rounded-3 bg-light h-100">
        <div className="text-muted small">{title}</div>
        <div className="fs-3 fw-bold">{value}</div>
      </div>
    </div>
  );
}

function formatMoney(n) {
  const x = Math.round(Number(n || 0));
  return x.toLocaleString("he-IL");
}
