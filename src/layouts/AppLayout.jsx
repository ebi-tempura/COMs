import { NavLink, Outlet, useNavigate } from "react-router-dom";

function AppLayout() {
  
  const navigate = useNavigate();

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
            <p>Condominium Operational Management System</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/Dashbord">Dashboard</NavLink>
          <NavLink to="/work-orders">Work Orders</NavLink>
          <NavLink to="/suppliers">Suppliers</NavLink>
          <NavLink to="/residents">Residents</NavLink>
          <NavLink to="/reports">Reports</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>

        <div className="sidebar-user">
         <div className="user-info">
          <div className="user-avatar">A</div>

          <div>
            <strong>Admin User</strong>
            <span>Administrator</span>
          </div>
          </div>

           <button className="logout-button" onClick={handleLogout}>
             Logout
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