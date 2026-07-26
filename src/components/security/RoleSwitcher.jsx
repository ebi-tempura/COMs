import { useAuth } from "../../auth/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";

export default function RoleSwitcher() {
  const { user, users, setUser } = useAuth();
  const { roleLabel, t, userName } = useLanguage();

  function handleChange(event) {
    const selectedUser = users.find((item) => item.id === event.target.value);

    if (selectedUser) {
      setUser(selectedUser);
    }
  }

  return (
    <label className="role-switcher">
      <span>{t("roleSwitcher.testingAs")}</span>
      <select value={user.id} onChange={handleChange}>
        {users.map((item) => (
          <option key={item.id} value={item.id}>
            {userName(item)} — {roleLabel(item.role)}
          </option>
        ))}
      </select>
    </label>
  );
}
