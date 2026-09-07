import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabaseClient";

function Login({ setUserEmail }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("LOGIN ERROR:", error);
      return;
    }
    console.log("ACCESS TOKEN:", data.session.access_token);

    const response = await fetch("http://127.0.0.1:8000/api/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    });

    const result = await response.json();

    console.log("API /ME STATUS:", response.status);
    console.log("API /ME RESPONSE:", result);

    if (!response.ok) {
      console.error("COMS AUTH ERROR:", result);
      return;
    }


    const workOrdersResponse = await fetch(
  "http://127.0.0.1:8000/api/work-orders",
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
    },
  }
);

const workOrders = await workOrdersResponse.json();

console.log("WORK ORDERS STATUS:", workOrdersResponse.status);
console.log("WORK ORDERS:", workOrders);

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

          <button className="button" type="submit">
            {t("login.signIn")}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;