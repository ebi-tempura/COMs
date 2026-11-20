import { useLanguage } from "../i18n/LanguageContext";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth() {
  const { ui } = useLanguage();
  const { user, loading } = useAuth();

  if (loading) {
    return <p role="status">{ui("Loading your COMs account…")}</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}