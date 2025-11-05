import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function RequireAuth({ children }) {
  const { user, loading, isActiveStaff } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="container py-5">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (!isActiveStaff) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">
          לחשבון שלך אין עדיין הרשאת עובד פעילה. פנה למנהל שיאשר אותך.
        </div>
      </div>
    );
  }
  return children;
}

