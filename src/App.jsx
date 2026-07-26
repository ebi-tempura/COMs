import "./App.css";
import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login/Login";
import AppLayout from "./layouts/AppLayout";
import WorkOrders from "./pages/WorkOrders/WorkOrders";
import Suppliers from "./pages/Suppliers/Suppliers";
import LanguageSwitcher from "./components/common/LanguageSwitcher";
import RoleSwitcher from "./components/security/RoleSwitcher";
import { useLanguage } from "./i18n/LanguageContext";

function PlaceholderPage({ translationKey }) {
  const { t } = useLanguage();
  return <div>{t(translationKey)}</div>;
}

function App() {
  const [userEmail, setUserEmail] = useState("");

  return (
    <>
      <div className="development-toolbar">
        <RoleSwitcher />
        <LanguageSwitcher />
      </div>

      <Routes>
        <Route path="/login" element={<Login setUserEmail={setUserEmail} />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/work-orders" replace />} />
          <Route
            path="/Dashbord"
            element={<PlaceholderPage translationKey="placeholders.dashboard" />}
          />
          <Route
            path="/work-orders"
            element={<WorkOrders userEmail={userEmail} />}
          />
          <Route
            path="/suppliers"
            element={<Suppliers userEmail={userEmail} />}
          />
          <Route
            path="/residents"
            element={<PlaceholderPage translationKey="placeholders.residents" />}
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
            element={<PlaceholderPage translationKey="placeholders.settings" />}
          />
        </Route>
      </Routes>
    </>
  );
}

export default App;
