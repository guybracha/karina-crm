import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import CustomersList from "../features/customers/CustomersList.jsx";
import CustomerDetails from "../features/customers/CustomerDetails.jsx";
import NotFound from "../pages/NotFound.jsx";
import Pipeline from "../features/pipeline/Pipeline.jsx";
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
  { path: "/", element: page(<Dashboard />) },
  { path: "/customers", element: page(<CustomersList />) },
  { path: "/customers/:id", element: page(<CustomerDetails />) },
  { path: "/pipeline", element: page(<Pipeline />) },
  { path: "*", element: page(<NotFound />) },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
