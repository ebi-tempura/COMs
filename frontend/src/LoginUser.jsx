import { useState } from "react";
import { supabase } from "./lib/supabaseClient";

function LoginUser() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("LOGIN ERROR:", error);
      return;
    }

    console.log("LOGIN USER:", data.user);
    console.log("ACCESS TOKEN:", data.session.access_token);
  };

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

  console.log("LOGIN USER:", data.user);

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

  console.log("LOGIN USER:", data.user);


  return (
    <form onSubmit={handleLogin}>
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

      <button type="submit">
        Login
      </button>
    </form>
  );
}

export default LoginUser;