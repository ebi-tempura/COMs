import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import {useState} from "react";

function AppLayout() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const { roleLabel, t, userName } = useLanguage();

async function handleLogout() {
  setLoggingOut(true);
  setLogoutError("");

  try {
    await signOut();
    navigate("/login", { replace: true  });
  } catch (err) {
    setLogoutError(err.message || "Unable to sign out.");
  } finally {
    setLoggingOut(false);
  }
}  

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <img src="../Logo-white.png" />
            <p>{t("brand.tagline")}</p>
            </div>      
        </div>
          <div>
          </div>
         
        <nav className="sidebar-nav">
          <NavLink to="/Dashboard">{t("nav.dashboard")}</NavLink>
          <NavLink to="/work-orders">{t("nav.workOrders")}</NavLink>
          <NavLink to="/suppliers">{t("nav.suppliers")}</NavLink>
          <NavLink to="/purchase-orders">{t("nav.purchaseOrders")}</NavLink>
          <NavLink to="/reports">{t("nav.reports")}</NavLink>
          <NavLink to="/documents">{t("nav.documents")}</NavLink>
          <NavLink to="/settings">{t("nav.settings")}</NavLink>
        </nav>
        <div className="sidebar-user">
        <div className="user-info">
          <div className="user-avatar">
            {userName(user).charAt(0)}
          </div>

          <div className="user-details">
            <strong>{user.name}</strong>
            <span className="user-email" title={user.email}>
              {user.email}
            </span>
            <span>{roleLabel(user.role)}</span>
          </div>
        </div>

        {logoutError && <p role="alert">{logoutError}</p>}

      </div>
        <button
          className="logout-button"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? t("logout.Signing out...") : t("nav.logout")}
        </button>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
