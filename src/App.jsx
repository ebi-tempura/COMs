import "./App.css"
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login/Login";
import AppLayout from "./layouts/AppLayout";
import WorkOrders from "./pages/WorkOrders/WorkOrders";
import Suppliers from "./pages/Suppliers/Suppliers";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/work-orders" replace />} />
        <Route path="/work-orders" element={<WorkOrders />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/residents" element={<div>Residents</div>} />
        <Route path="/reports" element={<div>Reports</div>} />
        <Route path="/settings" element={<div>Settings</div>} />
      </Route>
    </Routes>
  );
}

export default App;