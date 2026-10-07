import { supabase } from "../../lib/supabaseClient";
import { api } from "../../lib/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";

const Register = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [draft] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('comsRegistration') || '{}'); }
    catch { return {}; }
  });
  const [step, setStep] = useState(draft.account_name ? 2 : 1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(Boolean(draft.account_name));


  const [accountName, setAccountName] = useState(draft.account_name || "");
  const [buildingName, setBuildingName] = useState(draft.building_name || "");
  const [buildingAddress, setBuildingAddress] = useState(draft.building_address || "");

  const [firstName, setFirstName] = useState(draft.first_name || "");
  const [lastName, setLastName] = useState(draft.last_name || "");
  const [email, setEmail] = useState(draft.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const goToUserStep = () => {
    if (!accountName || !buildingName || !buildingAddress) {
      setError("Please complete all building information.");
      return;
    }

    setError("");
    setStep(2);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError("Please complete all administrator information.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");

    setBusy(true);
    try {
      const registration = { account_name: accountName, building_name: buildingName,
        building_address: buildingAddress, first_name: firstName, last_name: lastName,
        user_name: `${firstName} ${lastName}`.trim().slice(0, 50) };
      sessionStorage.setItem("comsRegistration", JSON.stringify({ ...registration, email }));
      const { data: { session } } = await supabase.auth.getSession();
      let activeSession = session;
      if (session && session.user.email?.toLowerCase() !== email.trim().toLowerCase()) {
        throw new Error('Sign out of your existing account before registering another identity.');
      }
      if (!activeSession) {
        const { data, error: signupError } = await supabase.auth.signUp({ email, password,
          options: { emailRedirectTo: `${window.location.origin}/register` } });
        if (signupError) throw signupError;
        activeSession = data.session;
      }
      if (!activeSession) {
        setConfirmationPending(true);
        setError('Confirm your email, then return here and sign in to finish registration. Your building has not been created yet.');
        return;
      }
      await api('/api/register', { method: 'POST', body: JSON.stringify(registration) });
      sessionStorage.removeItem("comsRegistration");
      setStep(3);
    } catch (e) { setError(e.message); } finally { setBusy(false); }

  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">COMS</div>
        <h1>Register your building</h1>
        <p>Please fill in the form to create your building account.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}

          {step === 1 && (
            <div className="register-step" key="building">
              <h2>Step 1: Building information</h2>

              <label>
                Account / condominium name
                <input
                  type="text"
                  placeholder="e.g. Condominio La Capital"
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                />
              </label>

              <label>
                {t("register.buildingName")}
                <input
                  type="text"
                  placeholder="e.g. Tower A"
                  value={buildingName}
                  onChange={(event) => setBuildingName(event.target.value)}
                />
              </label>

              <label>
                Building address
                <input
                  type="text"
                  placeholder="Street, number, city"
                  value={buildingAddress}
                  onChange={(event) => setBuildingAddress(event.target.value)}
                />
              </label>

              <button className="button" type="button" onClick={goToUserStep}>
                Next
              </button>
              
              <button type="button" onClick={()=> navigate("/login")}>
                Go to login
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="register-step" key="user">
              <h2>Step 2: Administrator information</h2>

              <label>
                First name
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </label>

              <label>
                Last name
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <label>
                Confirm password
                <input
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>

              {confirmationPending && <button type="button" disabled={busy} onClick={async () => {
                setBusy(true);
                try {
                  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
                  if (loginError) throw loginError;
                  setConfirmationPending(false);
                  setError('Email confirmed. Click Create building account to finish.');
                } catch (e) { setError(e.message); } finally { setBusy(false); }
              }}>Sign in after confirming email</button>}
              <div className="register-actions">
                <button type="button" onClick={() => setStep(1)}>
                  Back
                </button>

                <button className="button" type="submit" disabled={busy}>
                  Create building account
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="register-step" key="confirmation">
              <h2>Building account created</h2>
              <p>
                Your building account and first Admin are ready. You can now sign in to COMs.
              </p>

              <button type="button" onClick={() => navigate("/login")}>
                Go to login
              </button>
            </div>
          )}
        </form>
      </section>
    </main>
  );
};

export default Register;