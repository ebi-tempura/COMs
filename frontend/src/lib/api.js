import { supabase } from './supabaseClient';
export const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
export async function api(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in first.');
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...options.headers },
  });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Please check your information.');
  return result;
}
