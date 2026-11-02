import { supabase } from './supabaseClient';
export const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
export async function api(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in first.');
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
  headers: {...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    Authorization: `Bearer ${session.access_token}`,
    ...options.headers,
  },  
  });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Please check your information.');
  return result;
}
export async function apiDownload(path, filename) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("Please sign in first.");

  const response = await fetch(`${apiUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);

    throw new Error(
      typeof result?.detail === "string"
        ? result.detail
        : `Unable to download file (${response.status}).`
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
