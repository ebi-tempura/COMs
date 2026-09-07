import { useState } from "react";
import { supabase } from "./lib/supabaseClient";

function RegisterUser() {
  const [accountId, setAccountId] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userRole, setUserRole] = useState("Staff");

  const handleRegister = async (event) => {
    event.preventDefault();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("SUPABASE SIGNUP ERROR:", error);
      return;
    }

    const response = await fetch("http://127.0.0.1:8000/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_id: accountId,
        user_name: userName,
        email: email,
        auth_user_id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        user_role: userRole,
        status: "Active",
      }),
    });

    const result = await response.json();

    console.log("FASTAPI STATUS:", response.status);
    console.log("FASTAPI RESPONSE:", result);
  };

  return (
    <form onSubmit={handleRegister}>
      <input
        placeholder="Account ID"
        value={accountId}
        onChange={(event) => setAccountId(event.target.value)}
      />

      <input
        placeholder="Username"
        value={userName}
        onChange={(event) => setUserName(event.target.value)}
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <input
        placeholder="First name"
        value={firstName}
        onChange={(event) => setFirstName(event.target.value)}
      />

      <input
        placeholder="Last name"
        value={lastName}
        onChange={(event) => setLastName(event.target.value)}
      />

      <select
        value={userRole}
        onChange={(event) => setUserRole(event.target.value)}
      >
        <option value="Staff">Staff</option>
        <option value="Manager">Manager</option>
        <option value="President">President</option>
        <option value="Treasurer">Treasurer</option>
      </select>

      <button type="submit">
        Register
      </button>
    </form>
  );
}

export default RegisterUser;