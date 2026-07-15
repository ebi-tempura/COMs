import { createContext, useContext, useMemo, useState } from "react";
import { ROLES } from "../security/constants";

export const TEST_USERS = [
  {
    id: "super-admin-1",
    name: "Super Admin User",
    role: ROLES.SUPER_ADMIN,
  },
  {
    id: "admin-1",
    name: "Admin User",
    role: ROLES.ADMIN,
  },
  {
    id: "president-1",
    name: "President User",
    role: ROLES.PRESIDENT,
  },
  {
    id: "treasurer-1",
    name: "Treasurer User",
    role: ROLES.TREASURER,
  },
  {
    id: "board-member-1",
    name: "Board Member User",
    role: ROLES.BOARD_MEMBER,
  },
  {
    id: "resident-1",
    name: "Resident User",
    role: ROLES.RESIDENT,
  },
  {
    id: "manager-1",
    name: "Manager User",
    role: ROLES.MANAGER,
  },
  {
    id: "staff-1",
    name: "Staff User",
    role: ROLES.STAFF,
  },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const storedUser = localStorage.getItem("currentUser");

  const [user, setUserState] = useState(() => {
    if (storedUser) {
      return JSON.parse(storedUser);
    }

    return TEST_USERS[1];
  });

  function setUser(nextUser) {
    setUserState(nextUser);
    localStorage.setItem("currentUser", JSON.stringify(nextUser));
  }

  const value = useMemo(
    () => ({
      user,
      setUser,
      users: TEST_USERS,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}