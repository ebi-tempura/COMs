import { useLanguage } from "../../i18n/LanguageContext";
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import Card from '../../components/common/Card'; 

const roles = ['Resident', 'Staff', 'Manager', 'President', 'Board Member', 'Treasurer', 'Admin'];

export default function Users() {
  const { ui, roleLabel, statusLabel } = useLanguage();
  
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [me, setMe] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Staff');
  const [message, setMessage] = useState("");
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  
  async function refresh() {
    const identity = await api('/api/me');
    setMe(identity);
    setUsers(await api('/api/users'));
    if (identity.user_role === 'Admin') setInvitations(await api('/api/users/invitations'));
  }
  useEffect(() => { refresh().catch(e => setError(e.message)); }, []);
  
  async function perform(action) {
    setBusy(true); setError('');
    try { await action(); await refresh(); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  
  const admin = me?.user_role === 'Admin';

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const statuses = [
    ...new Set(users.map((user) => user.status).filter(Boolean)),
  ];

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();

    const matchesSearch = [
      user.user_name,
      user.first_name,
      user.last_name,
      user.email,
      user.user_role,
    ].some((value) => String(value ?? "").toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === "All" || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
  
  return <main>
    
    <div className="page-header">
      <div>
        <h1>{ui("User management")}</h1>
        <p1>{ui("Create, invite and remove users")}</p1>
      </div>  
    </div>
    {error && <p role="alert">{error}</p>}
    {admin && ( 
  <form
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;

          setMessage("");

          perform(async () => {
            const invitation = await api("/api/users/invitations", {
              method: "POST", body: JSON.stringify({ 
                email: email.trim(),
                user_role: role,
              }),
            });

            setMessage(invitation.message);
            setEmail("");
          });
        }}
      >
      <Card>
        <div className="login-form">
          <label>
            {ui("Email")}
            <input
              type="email"
              required
              maxLength={50}
              value={email}
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
              />
          </label>

          <label className="role-field" htmlFor="user-role">
            <span>{ui("Role")}</span>

            <select
              id="user-role"
              value={role}
              disabled={busy}
              onChange={(event) => setRole(event.target.value)}
            >
              {roles.map((item) => (
                <option key={item} value={item}>
                  {roleLabel(item)}
                </option>
              ))}
            </select>
</label>

        <button type="submit" disabled={busy}>
          {busy ? ui("Please wait…") : ui("Create invitation")}
        </button>
        </div>
      </Card>
      </form>
)}

{message && <p role="status">{message}</p>}

    <Card>
      <div className="panel-title">
        <div className="table-tools">
          <input
            aria-label={ui("Search users")}
            type="search"
            placeholder={ui("Search users…")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            aria-label={ui("Filter by status")}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">{ui("All statuses")}</option>

            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div class="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>{ui("Name")}</th>
              <th>{ui("Email")}</th>
              <th>{ui("Role")}</th>
              <th>{ui("Status")}</th>
              <th>{ui("Action")}</th>
            </tr>
          </thead>


          <tbody>{users.map(u => <tr key={u.database_id}>
            <td>{u.first_name} {u.last_name}</td>
            <td>{u.email}</td>
            <td>{admin ? <select aria-label={ui("Role for {email}", { email: u.email })} value={u.user_role} disabled={busy}
              onChange={e => perform(() => api(`/api/users/${u.database_id}/role`, { method: 'PATCH', body: JSON.stringify({ user_role: e.target.value }) }))}>
              {roles.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select> : roleLabel(u.user_role)}</td>
            <td>
              <span
                className="status-badge-users"
                data-status={String(u.status ?? "").trim().toLowerCase()}
              >
                {statusLabel(u.status)}
              </span>
            </td>

            <td>{admin && <button disabled={busy} onClick={() => {
              if (u.status === 'Active' && !window.confirm(ui("Deactivate {email}? Their COMs access will be blocked.", { email: u.email }))) return;
              perform(() => api(`/api/users/${u.database_id}/status`, { method: 'PATCH', body: JSON.stringify({ status: u.status === 'Active' ? 'Inactive' : 'Active' }) }));
            }}>{u.status === 'Active' ? ui("Deactivate") : ui("Reactivate")}</button>}</td>
          </tr>)}
          
          </tbody>
          </table>
      </div>
    </Card>
    
    <Card>
      {admin && (
        <>
          <h2>{ui("Invitations")}</h2>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{ui("Email")}</th>
                  <th>{ui("Role")}</th>
                  <th>{ui("Status")}</th>
                  <th>{ui("Actions")}</th>
                </tr>
              </thead>

              <tbody>
                {invitations.map((i) => {
                  const expiresAt = new Date(
                    i.expires_at +
                      (i.expires_at.endsWith("Z") ||
                      /[+-]\d\d:\d\d$/.test(i.expires_at)
                        ? ""
                        : "Z")
                  );

                  const status = i.accepted_at
                    ? "Accepted"
                    : i.revoked_at
                      ? "Revoked"
                      : expiresAt < new Date()
                        ? "Expired"
                        : "Pending";

                  return (
                    <tr key={i.database_id}>
                      <td>{i.email}</td>
                      <td>{roleLabel(i.user_role)}</td>
                     <td>
                        <span
                          className="status-badge-users"
                          data-status={String(status ?? "").trim().toLowerCase()}
                        >
                          {statusLabel(status)}
                        </span>
                      </td>
                      <td>
                        {!i.accepted_at && !i.revoked_at && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              perform(() =>
                                api(`/api/users/invitations/${i.database_id}`, {
                                  method: "DELETE",
                                })
                              )
                            }
                          >
                            {ui("Revoke")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {invitations.length === 0 && (
                  <tr>
                    <td colSpan={4}>{ui("No invitations found.")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>

  </main>;
}
