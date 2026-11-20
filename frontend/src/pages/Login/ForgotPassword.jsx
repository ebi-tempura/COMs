import { useLanguage } from "../../i18n/LanguageContext";
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function ForgotPassword() {
  const { ui } = useLanguage();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: new URL(
            "/reset-password",
            window.location.origin
          ).toString(),
        }
      );

      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err.message || ui("Unable to send the reset email."));
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

        <h1>{ui("Reset your password")}</h1>
        <p>{ui("Enter the email address you use for COMS.")}</p>

        {sent ? (
          <p role="status">
            {ui("If an account exists for this email, you will receive a password-reset link. Please check your inbox and spam folder.")}
          </p>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <label>
              {ui("Email")}
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <button className="button" type="submit" disabled={busy}>
              {busy ? ui("Sending…") : ui("Send reset link")}
            </button>
            <p>
              <Link to="/login">{ui("Back to login")}</Link>
            </p>
          </form>
        )}

      </section>
    </main>
  );
}