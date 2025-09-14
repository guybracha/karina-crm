import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Navbar from "./Navbar";
import Dashboard from "../pages/Dashboard";
import CustomersList from "../features/customers/CustomersList";
import CustomerDetails from "../features/customers/CustomerDetails";

function Shell({ children }) {
  return (
    <div className="container py-4">
      <Navbar />
      {children}
    </div>
  );
}

const router = createBrowserRouter([
  { path: '/', element: <Shell><Dashboard/></Shell> },
  { path: '/customers', element: <Shell><CustomersList/></Shell> },
  { path: '/customers/:id', element: <Shell><CustomerDetails/></Shell> },
]);

export default function AppRouter(){ return <RouterProvider router={router}/>; }
