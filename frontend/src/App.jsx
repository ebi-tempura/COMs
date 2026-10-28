import Users from "./pages/Users/Users";
import AcceptInvitation from "./pages/Users/AcceptInvitation";
import RequireAuth from "./auth/RequireAuth";

/**********************/

import "./App.css";
import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login/Login";
import AppLayout from "./layouts/AppLayout";
import WorkOrders from "./pages/WorkOrders/WorkOrders";
import Suppliers from "./pages/Suppliers/Suppliers";
import Register from "./pages/Register/Register";
import PurchaseOrders from "./pages/PurchaseOrders/PurchaseOrders";
import LanguageSwitcher from "./components/common/LanguageSwitcher";
import { useLanguage } from "./i18n/LanguageContext";

function PlaceholderPage({ translationKey }) {
  const { t } = useLanguage();
  return <div>{t(translationKey)}</div>;
} 

function App() {
  const [userEmail, setUserEmail] = useState("");
  const [name ,setName] = useState("");

  return (
    <>

      <Routes>
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/register" element={<Register setUserEmail={setUserEmail} setName={setName} />} />
        
        <Route path="/login" element={<Login setUserEmail={setUserEmail} />} />
        <Route element={<RequireAuth />}>
          <Route path="/users" element={<Users />} />
              
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/work-orders" replace />} />
            <Route
              path="/Dashboard"
              element={<PlaceholderPage translationKey="placeholders.dashboard" />}
            />
            <Route
              path="/work-orders"
              element={<WorkOrders userEmail={userEmail} />}
            />
            <Route
              path="/purchase-orders"
              element={<PurchaseOrders/>}
            />
            <Route
              path="/suppliers"
              element={<Suppliers userEmail={userEmail} />}
            />
            <Route
              path="/reports"
              element={<PlaceholderPage translationKey="placeholders.reports" />}
            />
            <Route
              path="/documents"
              element={<PlaceholderPage translationKey="placeholders.documents" />}
            />
            <Route
              path="/settings"
              element={<Users />}
            />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
