import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="mb-4 d-flex gap-2">
      <NavLink className="btn btn-outline-secondary" to="/">Dashboard</NavLink>
      <NavLink className="btn btn-primary" to="/customers">לקוחות</NavLink>
      <NavLink className="btn btn-outline-secondary" to="/pipeline">Pipeline</NavLink>
    </nav>
  );
}

