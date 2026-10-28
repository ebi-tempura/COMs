import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import { useAuth } from "../../auth/AuthContext";
import { supabase } from "../../lib/supabaseClient";

function Login() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    user,
    loading,
    error: accountError,
    refreshUser,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || loading) return;

    setBusy(true);
    setLoginError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      // AuthContext loads /api/me before allowing navigation.
    } catch (err) {
      setLoginError(err.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  if (user && !loading) {
    return <Navigate to="/work-orders" replace />;
  }

  return (

   <main className="login-page">

      <section className="login-card">
        <div className="login-logo">
          <img src="/Logo-blue.png" alt="PAX Aurora" />
        </div>

        <h1>{t("login.welcome")}</h1>
        <p>{t("login.subtitle")}</p>

        <form className="login-form" onSubmit={handleSubmit}>
                    {(loginError || accountError) && (
            <p className="form-error" role="alert">
              {loginError || accountError}
            </p>
          )}

          {accountError && (
            <button
              type="button"
              disabled={busy || loading}
              onClick={refreshUser}
            >
              Retry account connection
            </button>
          )}

          {loading && (
            <p role="status">Loading your COMs account…</p>
          )}
          
          
          <label>
            {t("login.email")}
            <input
              type="email"
              placeholder="admin@condominio.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            {t("login.password")}
            <input
              type="password"
              placeholder={t("login.passwordPlaceholder")}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <div className="login-options">
            <label className="checkbox-row">
              <input type="checkbox" />
              {t("login.rememberMe")}
            </label>

            <a>{t("login.forgotPassword")}</a>
          </div>

          <button
            className="button"
            type="submit"
            disabled={busy || loading}
          >
            {busy || loading ? "Signing in…" : t("login.signIn")}
          </button> 

          <button type="button" className="button.secondarybutton" onClick={() => navigate("/register")}>
            {t("login.signUp")}
          </button>



        </form>
      </section>
    </main>
  );
}

export default Login;