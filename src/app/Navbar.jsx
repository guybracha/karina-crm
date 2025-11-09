import { NavLink } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export default function Navbar() {
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Failed to sign out", err);
    }
  };

  return (
    <nav className="mb-4 d-flex gap-2 align-items-center">
      <NavLink className="btn btn-outline-secondary" to="/">Dashboard</NavLink>
      <NavLink className="btn btn-primary" to="/customers">לקוחות</NavLink>
      <NavLink className="btn btn-outline-secondary" to="/orders">הזמנות</NavLink>
      <NavLink className="btn btn-outline-secondary" to="/pipeline">Pipeline</NavLink>
      {user && (
        <button
          type="button"
          className="btn btn-outline-danger ms-auto"
          onClick={handleLogout}
        >
          התנתקות
        </button>
      )}
    </nav>
  );
}
