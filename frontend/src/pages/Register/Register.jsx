import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";

const Register = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  const [accountName, setAccountName] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [buildingAddress, setBuildingAddress] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
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

  const handleSubmit = (event) => {
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

    // Later, this is where we call POST /api/register.
    console.log({
      accountName,
      buildingName,
      buildingAddress,
      firstName,
      lastName,
      email,
    });

    setStep(3);
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

              <div className="register-actions">
                <button type="button" onClick={() => setStep(1)}>
                  Back
                </button>

                <button className="button" type="submit">
                  Create building account
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="register-step" key="confirmation">
              <h2>Building account created</h2>
              <p>
                Thank you. Please check your email to confirm your COMS
                administrator account.
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