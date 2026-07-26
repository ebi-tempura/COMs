import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";

function Login({ setUserEmail }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setUserEmail(email);
    navigate("/work-orders");
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">COMS</div>

        <h1>{t("login.welcome")}</h1>
        <p>{t("login.subtitle")}</p>

        <form className="login-form" onSubmit={handleSubmit}>
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
            />
          </label>

          <div className="login-options">
            <label className="checkbox-row">
              <input type="checkbox" />
              {t("login.rememberMe")}
            </label>

            <a>{t("login.forgotPassword")}</a>
          </div>

          <button className="button" type="submit">
            {t("login.signIn")}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;
