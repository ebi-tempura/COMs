import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    navigate("/work-orders");
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">COMS</div>

        <h1>Welcome back</h1>
        <p>Sign in to manage condominium operations.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" placeholder="admin@condominio.com" required />
          </label>

          <label>
            Password
            <input type="password" placeholder="Enter your password" required />
          </label>

          <div className="login-options">
            <label className="checkbox-row">
              <input type="checkbox" />
              Remember me
            </label>

            <a>Forgot password?</a>
          </div>

          <button className="button" type="submit">
            Sign In
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;