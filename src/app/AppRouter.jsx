import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import CustomersList from "../features/customers/CustomersList.jsx";
import CustomerDetails from "../features/customers/CustomerDetails.jsx";
import OrderDetails from "../features/orders/OrderDetails.jsx";
import NotFound from "../pages/NotFound.jsx";
import Pipeline from "../features/pipeline/Pipeline.jsx";
import RequireAuth from "../auth/RequireAuth.jsx";
import Login from "../pages/Login.jsx";
import Register from "../pages/Register.jsx";
// Auth disabled: rendering pages directly without AuthGate

function Shell({ children }) {
  return (
    <div className="container py-4">
      <Navbar />
      {children}
    </div>
  );
}

function page(el) {
  return (
    <Shell>
      {el}
    </Shell>
  );
}

const router = createBrowserRouter([
  { path: "/login", element: page(<Login />) },
  { path: "/register", element: page(<Register />) },
  { path: "/", element: page(<RequireAuth><Dashboard /></RequireAuth>) },
  { path: "/customers", element: page(<RequireAuth><CustomersList /></RequireAuth>) },
  { path: "/customers/:id", element: page(<RequireAuth><CustomerDetails /></RequireAuth>) },
  { path: "/pipeline", element: page(<RequireAuth><Pipeline /></RequireAuth>) },
  { path: "/orders/:id", element: page(<RequireAuth><OrderDetails /></RequireAuth>) },
  { path: "*", element: page(<NotFound />) },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
