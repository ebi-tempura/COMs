import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
const roles = ['Resident', 'Staff', 'Manager', 'President', 'Board Member', 'Treasurer', 'Admin'];
export default function Users() {
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [me, setMe] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Staff');
  const [link, setLink] = useState('');
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
  return <main><h1>User management</h1>
    {error && <p role="alert">{error}</p>}
    {admin && <form onSubmit={e => { e.preventDefault(); perform(async () => {
      setLink('');
      const invitation = await api('/api/users/invitations', { method: 'POST', body: JSON.stringify({ email, user_role: role }) });
      setLink(`${window.location.origin}/accept-invitation#token=${encodeURIComponent(invitation.token)}`);
      setEmail('');
    }); }}>
      <label>Email <input type="email" required maxLength={50} value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Role <select value={role} onChange={e => setRole(e.target.value)}>{roles.map(r => <option key={r}>{r}</option>)}</select></label>
      <button disabled={busy}>Create invitation</button>
    </form>}
    {link && <p>Share this link with the invited person. It expires in seven days.<br /><input aria-label="Invitation link" readOnly value={link} style={{ width: '100%' }} /></p>}
    <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>{users.map(u => <tr key={u.database_id}>
        <td>{u.first_name} {u.last_name}</td><td>{u.email}</td>
        <td>{admin ? <select aria-label={`Role for ${u.email}`} value={u.user_role} disabled={busy}
          onChange={e => perform(() => api(`/api/users/${u.database_id}/role`, { method: 'PATCH', body: JSON.stringify({ user_role: e.target.value }) }))}>
          {roles.map(r => <option key={r}>{r}</option>)}
        </select> : u.user_role}</td><td>{u.status}</td>
        <td>{admin && <button disabled={busy} onClick={() => {
          if (u.status === 'Active' && !window.confirm(`Deactivate ${u.email}? Their COMs access will be blocked.`)) return;
          perform(() => api(`/api/users/${u.database_id}/status`, { method: 'PATCH', body: JSON.stringify({ status: u.status === 'Active' ? 'Inactive' : 'Active' }) }));
        }}>{u.status === 'Active' ? 'Deactivate' : 'Reactivate'}</button>}</td>
      </tr>)}</tbody></table>
    {admin && <><h2>Invitations</h2><ul>{invitations.map(i => <li key={i.database_id}>
      {i.email} — {i.user_role} — {i.accepted_at ? 'Accepted' : i.revoked_at ? 'Revoked' : new Date(i.expires_at + (i.expires_at.endsWith('Z') || /[+-]\d\d:\d\d$/.test(i.expires_at) ? '' : 'Z')) < new Date() ? 'Expired' : 'Pending'}
      {!i.accepted_at && !i.revoked_at && <button disabled={busy} onClick={() => perform(() => api(`/api/users/invitations/${i.database_id}`, { method: 'DELETE' }))}>Revoke</button>}
    </li>)}</ul></>}
  </main>;
}
