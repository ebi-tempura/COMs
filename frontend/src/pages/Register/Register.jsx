import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { api } from "../../lib/api";
import { use } from "react";

const DRAFT_KEY = "comsRegistration";

function readDraft() {
  try {
    const value = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export default function Register() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [draft] = useState(readDraft);

  const [form, setForm] = useState({
    account_name: draft.account_name || "",
    building_name: draft.building_name || "",
    building_address: draft.building_address || "",
    first_name: draft.first_name || "",
    last_name: draft.last_name || "",
    email: draft.email || "",
  });

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [session, setSession] = useState(undefined);
  const [pending, setPending] = useState(Boolean(draft.email));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createdAccount, setCreatedAccount] = useState(null);
  const submitting = useRef(false);

  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (nextSession?.user?.email) {
        setForm((current) => ({
          ...current,
          email: nextSession.user.email,
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function changeField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    
    if (!acceptedTerms) {
      setError("Please accept the therms and conditions to continue with the registration");
      return
    }

    if (submitting.current || session === undefined) return;

    submitting.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const email = form.email.trim().toLowerCase();

      const registration = {
        account_name: form.account_name.trim(),
        building_name: form.building_name.trim(),
        building_address: form.building_address.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        user_name: `${form.first_name.trim()} ${form.last_name.trim()}`
          .trim()
          .slice(0, 50),
      };

      if (Object.values(registration).some((value) => !value)) {
        throw new Error("Please complete all building and administrator details.");
      }

      if (
        currentSession &&
        currentSession.user.email?.toLowerCase() !== email
      ) {
        throw new Error(
          "The email must match the account currently signed in."
        );
      }

      if (!currentSession && !pending) {
        if (password.length < 8) {
          throw new Error("Use a password with at least 8 characters.");
        }

        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
      }

      // Save details for returning from email confirmation.
      // Passwords are never saved here.
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ ...registration, email })
      );

      let activeSession = currentSession;

      if (!activeSession && pending) {
        const { data, error: loginError } =
          await supabase.auth.signInWithPassword({ email, password });

        if (loginError) throw loginError;
        activeSession = data.session;
      } else if (!activeSession) {
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/register`,
          },
        });

        if (signupError) throw signupError;

        activeSession = data.session;
        setPending(true);
        setPassword("");
        setConfirmPassword("");

        if (!activeSession) {
          setNotice(
            "Check your email for the confirmation link. After confirming, " +
            "return here to finish registration. Your building has not been created yet."
          );
          return;
        }
      }

      if (!activeSession) {
        throw new Error("Please sign in to finish registration.");
      }

      const account = await api("/api/register", {
        method: "POST",
        body: JSON.stringify(registration),
      });

      setCreatedAccount(account);
      setPassword("");
      setConfirmPassword("");

      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // Registration has already succeeded.
      }

      refreshUser();
    } catch (err) {
      setError(err.message || "Unable to complete registration.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (createdAccount) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-logo">
             <img src="/Logo-blue.png" alt="PAX Aurora" />
          </div>
          <h1>Your building is ready</h1>
          <p>
            {createdAccount.building_name} has been registered.
            You are its first Admin.
          </p>
          <p>Account: {createdAccount.account_id}</p>

          <button
            className="button"
            type="button"
            onClick={() => navigate("/login", { replace: true })}
          >
            Continue
          </button>
        </section>
      </main>
    );
  }

  if (user) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-logo">
            <img src="/Logo-blue.png" alt="PAX Aurora" />
          </div>
          <h1>You already belong to a building</h1>
          <p>This account is connected to {user.account_id}.</p>

          <button
            className="button"
            type="button"
            onClick={() => navigate("/work-orders")}
          >
            Go to your building
          </button>
        </section>
      </main>
    );
  }

  const checkingSession = session === undefined;
  const needsSignup = !session && !pending;

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">
          <img src="/Logo-blue.png" alt="PAX Aurora" />
        </div>
        <h1>Register your building</h1>
        <p>Create a building account and become its first Admin.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          {notice && <p role="status">{notice}</p>}

          {checkingSession && (
            <p role="status">Checking your session…</p>
          )}

          <fieldset
            className="register-step"
            disabled={busy || checkingSession}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
            <legend>Building information</legend>

            <label>
              Condominium / account name
              <input
                name="account_name"
                value={form.account_name}
                onChange={changeField}
                placeholder="e.g. Condominio La Capital"
                maxLength={200}
                required
              />
            </label>

            <label>
              Building name
              <input
                name="building_name"
                value={form.building_name}
                onChange={changeField}
                placeholder="e.g. Tower A"
                maxLength={200}
                required
              />
            </label>

            <label>
              Building address
              <input
                name="building_address"
                value={form.building_address}
                onChange={changeField}
                autoComplete="street-address"
                maxLength={200}
                required
              />
            </label>

            <h2>Administrator information</h2>

            <label>
              First name
              <input
                name="first_name"
                value={form.first_name}
                onChange={changeField}
                autoComplete="given-name"
                maxLength={50}
                required
              />
            </label>

            <label>
              Last name
              <input
                name="last_name"
                value={form.last_name}
                onChange={changeField}
                autoComplete="family-name"
                maxLength={50}
                required
              />
            </label>

            <label>
              Email
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={changeField}
                autoComplete="email"
                maxLength={50}
                readOnly={Boolean(session)}
                required
              />
            </label>

            {!session && (
              <>
                {pending && (
                  <p>
                    Confirm your email, then enter your password below
                    to finish creating your building.
                    If you already confirmed, you can continue now.
                  </p>
                )}

                <label>
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={
                      needsSignup ? "new-password" : "current-password"
                    }
                    minLength={needsSignup ? 8 : 1}
                    maxLength={128}
                    required
                  />
                </label>

                {needsSignup && (
                  <label>
                    Confirm password
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                    />
                  </label>
                )}
              </>
            )}

            {session && (
              <p>
                Signed in as {session.user.email}.
                Complete your details to create the building.
              </p>
            )}
              <div>
              
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "16px",
                }}
              >
                <input
                  id="acceptedTerms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => {
                    setAcceptedTerms(event.target.checked);
                    setError("");
                  }}
                  required
                  style={{ width: "18px", height: "18px", margin: 0 }}
                />

                <span>
                  <label htmlFor="acceptedTerms" style={{ display: "inline" }}>
                    I accept the{" "}
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    style={{
                      display: "inline",
                      background: "none",
                      border: 0,
                      padding: 0,
                      color: "#2563eb",
                      textDecoration: "underline",
                      cursor: "pointer",
                      font: "inherit",
                    }}
                  >
                    Terms and Conditions
                  </button>
                </span>
              </div>
            </div>
            
            <button className="button" type="submit">
              {busy
                ? "Please wait…"
                : session || pending
                  ? "Finish building registration"
                  : "Create account"}
            </button>

            {!session && (
              <button
                type="button"
                onClick={() => {
                  setPending((current) => !current);
                  setError("");
                  setNotice("");
                  setPassword("");
                  setConfirmPassword("");
                }}
              >
                {pending
                  ? "Use a new email account"
                  : "Already signed up? Finish registration"}
              </button>
            )}

              <button
                className="button"
                type="submit"
                onClick={() => navigate("/login")}
              >
              Back to login
            </button>
          </fieldset>
        </form>
              {showTerms && (
              <dialog
                ref={(element) => {
                  if (element && !element.open) element.showModal();
                }}
                onCancel={() => setShowTerms(false)}
                onClose={() => setShowTerms(false)}
                aria-labelledby="terms-title"
                style={{
                  width: "min(640px, calc(100vw - 32px))",
                  maxHeight: "80vh",
                  boxSizing: "border-box",
                  overflowY: "auto",
                  padding: "24px",
                  border: 0,
                  borderRadius: "12px",
                  background: "#fff",
                  color: "#1e293b",
                  lineHeight: 1.6,
                }}
              >
                <h2 id="terms-title">Terms and Conditions</h2>

                <h3>Your data stays yours</h3>
                <p>
                  COMs processes building, user, and supplier information only to
                  provide, secure, and support the service, follow your instructions,
                  or meet legal obligations.
                </p>
                <p>
                  We do not sell or rent this information, use it for advertising,
                  approach your suppliers for business, or share user and supplier
                  contacts for marketing.
                </p>
                <p>
                  Service providers may process information only as necessary to
                  deliver the service, subject to confidentiality and restrictions
                  on independent use.
                </p>

                <h3>Protection of the platform</h3>
                <p>
                  Except where permitted by applicable law or authorized in writing,
                  you must not copy, distribute, reverse engineer, decompile, or
                  attempt to extract the platform’s source code. You must not use
                  its proprietary code or confidential information to create or
                  help others create a competing product.
                </p>

                <h3>Registering for an organization</h3>
                <p>
                  If registering for a company, condominium association, or other
                  organization, you confirm that you are authorized to accept these
                  terms on its behalf.
                </p>

                <button
                  className="button"
                  type="button"
                  onClick={() => setShowTerms(false)}
                >
                  Close
                </button>
              </dialog>
            )}
      </section>
    </main>
  );
}