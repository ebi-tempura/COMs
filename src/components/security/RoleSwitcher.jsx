import { useAuth } from "../../auth/AuthContext";

export default function RoleSwitcher() {
  const { user, users, setUser } = useAuth();

  function handleChange(event) {
    const selectedUser = users.find((item) => item.id === event.target.value);

    if (selectedUser) {
      setUser(selectedUser);
    }
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label>
        Testing as:{" "}
        <select value={user.id} onChange={handleChange}>
          {users.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {item.role}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}