import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import CustomersList from "../features/customers/CustomersList.jsx";
import CustomerDetails from "../features/customers/CustomerDetails.jsx";
import NotFound from "../pages/NotFound.jsx";

function Shell({ children }) {
  return (
    <div className="container py-4">
      <Navbar />
      {children}
    </div>
  );
}

const router = createBrowserRouter([
  { path: "/", element: <Shell><Dashboard /></Shell> },
  { path: "/customers", element: <Shell><CustomersList /></Shell> },
  { path: "/customers/:id", element: <Shell><CustomerDetails /></Shell> }, // ⬅️ חדש
  { path: "*", element: <Shell><NotFound /></Shell> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
