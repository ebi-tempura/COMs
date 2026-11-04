import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function ResetPassword() {
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const query = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(
          window.location.hash.slice(1)
        );

        if (query.has("error") || hash.has("error")) {
          throw new Error(
            "This reset link is invalid or has expired. Request a new link."
          );
        }

        // Wait for Supabase to process the recovery URL.
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
          throw new Error(
            "No recovery session found. Open the latest reset link from your email."
          );
        }

        const { error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (active) setReady(true);
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to verify the reset link.");
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || !ready || done) return;

    setError("");

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setPassword("");
      setConfirmPassword("");
      setDone(true);

      // Finish the recovery session before returning to login.
      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      });

      if (signOutError) {
        setError(
          "Your password was updated, but automatic sign-out failed. " +
          "Sign out of COMS before testing your new password."
        );
      }
    } catch (err) {
      setError(err.message || "Unable to update your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">
          <img src="/Logo-blue.png" alt="PAX Aurora" />
        </div>

        <h1>Set a new password</h1>

        {checking && <p role="status">Checking your reset link…</p>}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {done ? (
          <div>
            <p role="status">Your password has been updated.</p>
            <Link to="/login">Return to login</Link>
          </div>
        ) : (
          <>
            {ready && (
              <form className="login-form" onSubmit={handleSubmit}>
                <label>
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>

                <label>
                  Confirm new password
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                  />
                </label>

                <button className="button" type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save new password"}
                </button>
              </form>
            )}

            {!checking && !ready && (
              <Link to="/forgot-password">Request a new reset link</Link>
            )}
          </>
        )}
      </section>
    </main>
  );
}