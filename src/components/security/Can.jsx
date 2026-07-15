import { useAuth } from "../../auth/AuthContext";
import { hasPermission } from "../../security/rbac";

export default function Can({
  module,
  action,
  children,
  fallback = null,
}) {
  const { user } = useAuth();

  if (!hasPermission(user, module, action)) {
    return fallback;
  }

  return children;
}
