import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

function AppLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roleLabel, t, userName } = useLanguage();

  function handleLogout() {
    navigate("/login");
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">🏢</div>
          <div>
            <h2>COMS</h2>
            <p>{t("brand.tagline")}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/Dashbord">{t("nav.dashboard")}</NavLink>
          <NavLink to="/work-orders">{t("nav.workOrders")}</NavLink>
          <NavLink to="/suppliers">{t("nav.suppliers")}</NavLink>
          <NavLink to="/residents">{t("nav.residents")}</NavLink>
          <NavLink to="/reports">{t("nav.reports")}</NavLink>
          <NavLink to="/documents">{t("nav.documents")}</NavLink>
          <NavLink to="/settings">{t("nav.settings")}</NavLink>
        </nav>

        <div className="sidebar-user">
          <div className="user-info">
            <div className="user-avatar">{userName(user).charAt(0)}</div>
            <div>
              <strong>{userName(user)}</strong>
              <span>{roleLabel(user.role)}</span>
            </div>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
