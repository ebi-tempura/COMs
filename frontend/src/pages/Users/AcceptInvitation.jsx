import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import TermsAndConditions, {TERMS_VERSION,
} from "../../components/TermsAndConditions/TermsAndConditions";
const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

function readInvitation() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));

  return {
    token:
      url.searchParams.get("invitation") ||
      hash.get("token") ||
      "",
    confirmationReturn: url.searchParams.has("invitation"),
    error:
      url.searchParams.get("error_description") ||
      hash.get("error_description") ||
      "",
  };
}

async function tokenHash(token) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function post(path, body, accessToken) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = result?.detail;

      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => item.msg).join("; ")
            : `Request failed (${response.status}).`;

      throw new Error(message);
    }

    return result;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "The server took too long to respond. Please try again."
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach the backend at ${API_URL}. Check that it is running.`
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function Card({ children }) {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">
          <img src="/Logo-blue.png" alt="PAX Aurora" />
        </div>
        {children}
      </section>
    </main>
  );
}

function Terms({ onClose }) {
  return (
    <dialog
      ref={(element) => {
        if (element && !element.open) element.showModal();
      }}
      onCancel={onClose}
      onClose={onClose}
      aria-label="Terms and Conditions"
      style={{
        width: "min(640px, calc(100vw - 32px))",
        maxHeight: "80vh",
        overflowY: "auto",
        boxSizing: "border-box",
        padding: 24,
        border: 0,
        borderRadius: 12,
        background: "#fff",
        color: "#1e293b",
        lineHeight: 1.6,
      }}
    >
      <TermsAndConditions />

      <button type="button" className="button" onClick={onClose}>
        Close
      </button>
    </dialog>
  );
}

function CompleteInvitation({ token, callbackError }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Reuse the same operation if React StrictMode runs the effect twice.
  const operation = useRef(null);
  const membershipCreated = useRef(false);

  useEffect(() => {
    let active = true;

    async function complete() {
      if (!token) {
        throw new Error("Invitation missing. Open your invitation email.");
      }

      if (callbackError) {
        throw new Error(callbackError);
      }

      if (!membershipCreated.current) {
        // The shared Supabase client processes the confirmation URL.
        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const session = data.session;

        if (!session) {
          throw new Error(
            "No confirmed session was found. Open the confirmation " +
            "email in the same browser where you completed the form."
          );
        }

        await post(
          "/api/users/invitations/accept",
          { token },
          session.access_token
        );

        membershipCreated.current = true;
      }

      // Membership is already saved. A retry only retries sign-out.
      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      });

      if (signOutError) {
        throw new Error(
          "Your invitation was accepted, but sign-out could not finish. " +
          "Click Continue to login to try again."
        );
      }
    }

    setBusy(true);
    setError("");

    if (!operation.current) {
      operation.current = complete();
    }

    operation.current
      .then(() => {
        if (!active) return;
        setAccepted(true);
        window.location.replace("/login");
      })
      .catch((err) => {
        if (!active) return;
        setAccepted(membershipCreated.current);
        setError(err.message || "Unable to finish your invitation.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });

    return () => {
      active = false;
    };
  }, [token, callbackError, attempt]);

  function retry() {
    if (busy) return;
    operation.current = null;
    setAttempt((current) => current + 1);
  }

  return (
    <Card>
      <h1>
        {accepted ? "Invitation accepted" : "Finishing your invitation"}
      </h1>

      {busy && (
        <p role="status">
          Please wait while we finish and open login…
        </p>
      )}

      {error && (
        <>
          <p className="form-error" role="alert" style={{ color: "#dc2626" }}>
            {error}
          </p>
          <button
            type="button"
            className="button"
            onClick={retry}
            disabled={busy}
          >
            {accepted ? "Continue to login" : "Try again"}
          </button>
        </>
      )}
    </Card>
  );
}

function InvitationForm({ token }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [terms, setTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (running.current) return;

    running.current = true;
    setBusy(true);
    setError("");

    try {
      const email = form.email.trim().toLowerCase();
      const firstName = form.first_name.trim();
      const lastName = form.last_name.trim();

      if (!token) {
        throw new Error("Open the invitation link sent by your Admin.");
      }

      if (!firstName || !lastName || !email) {
        throw new Error("Complete your name and invited email.");
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Enter a valid invited email address.");
      }

      if (!terms) {
        throw new Error("Please accept the Terms and Conditions.");
      }

      if (form.password.length < 8) {
        throw new Error("Use a password with at least 8 characters.");
      }

      if (form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      await post("/api/users/invitations/validate", { token, email });

      const profile = {
        invitation_hash: await tokenHash(token),
        first_name: firstName,
        last_name: lastName,
        accepted_terms: true,
        terms_version: TERMS_VERSION,
      };

      // Prevent a previously signed-in Admin from accepting the invitation.
      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      });

      if (signOutError) throw signOutError;

      const redirect = new URL(
        "/accept-invitation",
        window.location.origin
      );
      redirect.searchParams.set("invitation", token);

      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: redirect.toString(),
          data: { invitation_signup: profile },
        },
      });

      const existingLogin =
        signupError?.code === "user_already_exists" ||
        (!signupError &&
          Array.isArray(data?.user?.identities) &&
          data.user.identities.length === 0);

      if (signupError && !existingLogin) throw signupError;

      if (existingLogin) {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email,
            password: form.password,
          });

        if (loginError) {
          throw new Error(
            "This email already has a login. Enter its current password " +
            "in both password fields, or reset it from the login page."
          );
        }

        const { error: profileError } = await supabase.auth.updateUser({
          data: { invitation_signup: profile },
        });

        if (profileError) throw profileError;
      }

      setForm((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));

      if (!existingLogin && !data?.session) {
        setWaiting(true);
        return;
      }

      window.location.replace(redirect.toString());
    } catch (err) {
      setError(err.message || "Unable to submit your invitation.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  if (waiting) {
    return (
      <Card>
        <h1>Check your email</h1>
        <p role="status">
          Click the confirmation link in your email. We will finish
          your invitation and open login.
        </p>
        <p>
          Open the link in this same browser. You do not need to fill
          in the form again.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h1>Join your building</h1>
      <p>Complete this form once using the email invited by your Admin.</p>

      {error && (
        <p className="form-error" role="alert" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      {!token && (
        <p className="form-error" role="alert">
          Invitation missing. Open the invitation email link.
        </p>
      )}

      <form className="login-form" onSubmit={submit} noValidate>
        <fieldset
          disabled={busy || !token}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          {[
            ["first_name", "First name", "text", "given-name"],
            ["last_name", "Last name", "text", "family-name"],
            ["email", "Invited email", "email", "email"],
            ["password", "Password", "password", "new-password"],
            ["confirmPassword", "Confirm password", "password", "new-password"],
          ].map(([name, label, type, autocomplete]) => (
 
            <label key={name}
            style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            marginBottom: "16px",
            width: "100%",
            }}      
            >
              {label}
              <input
                name={name}
                type={type}
                value={form[name]}
                onChange={change}
                autoComplete={autocomplete}
                required
                minLength={type === "password" ? 8 : 1}
                maxLength={type === "password" ? 128 : 50}
                />
            </label>
          ))}

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              margin: "16px 0",
            }}
          >
            <input
              id="invitation-terms"
              type="checkbox"
              checked={terms}
              onChange={(event) => {
                setTerms(event.target.checked);
                setError("");
              }}
              required
              style={{
                width: 18,
                height: 18,
                flexShrink: 0,
                margin: "3px 0 0",
              }}
            />

            <span>
              <label
                htmlFor="invitation-terms"
                style={{ display: "inline" }}
              >
                I accept the{" "}
              </label>
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                style={{
                  background: "none",
                  border: 0,
                  padding: 0,
                  color: "#2563eb",
                  textDecoration: "underline",
                  font: "inherit",
                  cursor: "pointer",
                }}
              >
                Terms and Conditions
              </button>
            </span>
          </div>

          <button className="button" type="submit" disabled={busy}>
            {busy ? "Please wait…" : "Accept invitation"}
          </button>
        </fieldset>
      </form>

      {showTerms && <Terms onClose={() => setShowTerms(false)} />}
    </Card>
  );
}

export default function AcceptInvitation() {
  const [invitation] = useState(readInvitation);

  if (invitation.confirmationReturn || invitation.error) {
    return (
      <CompleteInvitation
        token={invitation.token}
        callbackError={invitation.error}
      />
    );
  }

  return <InvitationForm token={invitation.token} />;
}