/*import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;*/

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({
  children,
  allowedRoles,
}) {
  const {
    isAuthenticated,
    user,
  } = useAuth();

  /* =========================
     NOT AUTHENTICATED
  ========================= */

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  /* =========================
     ROLE CHECK
  ========================= */

  if (
    allowedRoles &&
    !allowedRoles.includes(user?.role)
  ) {
    if (user?.role === "staff") {
      return (
        <Navigate
          to="/kitchen"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/admin"
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;