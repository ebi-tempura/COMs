import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ROLES } from "../security/constants";

import { supabase } from "../lib/supabaseClient";
import { apiUrl } from "../lib/api";

const AuthContext = createContext(null);

// AuthProvider component that provides authentication context to its children

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    // Remove the old mock identity, not the Supabase session.
    localStorage.removeItem("currentUser");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setUser(null);
      setError("");
      setLoading(Boolean(nextSession));
      setSession(nextSession);
      setReload((value) => value + 1);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;

    if (!session) {
      setUser(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function loadUser() {
      setLoading(true);
      setUser(null);
      setError("");

      try {
        const response = await fetch(
          `${apiUrl.replace(/\/$/, "")}/api/me`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            signal: controller.signal,
          }
        );

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            typeof result?.detail === "string"
              ? result.detail
              : `Unable to load your COMs account (${response.status}).`
          );
        }

        if (
          !result?.database_id ||
          !result?.account_id ||
          !result?.user_role
        ) {
          throw new Error("The server returned an incomplete COMs identity.");
        }

        if (!active) return;

        setUser({
          ...result,
          id: result.database_id,
          name:
            result.user_name ||
            [result.first_name, result.last_name].filter(Boolean).join(" ") ||
            result.email,
          role: result.user_role,
        });
      } catch (err) {
        if (!active) return;

        setUser(null);
        setError(
          err.message || "Unable to connect to the COMs backend."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUser();

    return () => {
      active = false;
      controller.abort();
    };
  }, [session, reload]);

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "local",
    });

    if (signOutError) throw signOutError;

    setUser(null);
    setSession(null);
    setError("");
    setLoading(false);
  }

  function refreshUser() {
    setUser(null);
    setError("");
    setLoading(true);
    setReload((value) => value + 1);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, error, signOut, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
