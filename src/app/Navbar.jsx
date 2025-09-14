export default function Navbar() {
  return (
    <nav className="mb-4 d-flex gap-2">
      <a className="btn btn-outline-secondary" href="/">Dashboard</a>
      <a className="btn btn-primary" href="/customers">Customers</a>
    </nav>
  );
}
