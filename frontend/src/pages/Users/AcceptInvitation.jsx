import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { api } from '../../lib/api';
export default function AcceptInvitation() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || sessionStorage.getItem('comsInvitation') || '');
  const [form, setForm] = useState({ email: '', password: '', user_name: '', first_name: '', last_name: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event, signup) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      if (!token) throw new Error('Open the invitation link from your Admin.');
      sessionStorage.setItem('comsInvitation', token);
      const { data, error } = signup
        ? await supabase.auth.signUp({ email: form.email, password: form.password, options: { emailRedirectTo: `${window.location.origin}/accept-invitation` } })
        : await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (error) throw error;
      if (!data.session) { setMessage('Check your email to confirm, then return to this page and sign in to accept.'); return; }
      await api('/api/users/invitations/accept', { method: 'POST', body: JSON.stringify({ token, user_name: form.user_name, first_name: form.first_name, last_name: form.last_name }) });
      sessionStorage.removeItem('comsInvitation');
      setMessage('Invitation accepted. You can now sign in to COMs.');
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }
  return <main className="login-page"><section className="login-card"><h1>Join your building</h1>
    <form className="login-form" onSubmit={e => submit(e, false)}>
      {Object.keys(form).map(key => <label key={key}>{key.replaceAll('_', ' ')}<input required
        type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'}
        minLength={key === 'password' ? 8 : 1} maxLength={key === 'password' ? 128 : 50}
        value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
      <button disabled={busy}>Sign in and accept</button>
      <button type="button" disabled={busy} onClick={e => { if (e.currentTarget.form.reportValidity()) submit(e, true); }}>Create login and accept</button>
    </form><p role="status">{message}</p><a href="/login">Go to login</a>
  </section></main>;
}
