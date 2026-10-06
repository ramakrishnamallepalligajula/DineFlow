import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({
  children,
  allowedRoles,
}) {
  const {
    isAuthenticated,
    user,
    restaurant,
    loading,
  } = useAuth();

  /* =========================
     AUTH LOADING
  ========================= */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: 600,
        }}
      >
        Loading DineFlow...
      </div>
    );
  }

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

  /* =========================
     SUBSCRIPTION
  ========================= */

  const subscription =
    restaurant?.subscription;

  const subscriptionStatus =
    subscription?.status;

  const hasActiveSubscription =
    subscriptionStatus ===
      "TRIALING" ||
    subscriptionStatus ===
      "ACTIVE";

  /* =========================
     NO SUBSCRIPTION
  ========================= */

  if (
    !hasActiveSubscription
  ) {
    return (
      <Navigate
        to="/subscription"
        replace
      />
    );
  }

  /* =========================
     ACTIVE SUBSCRIPTION
     → ALLOW ACCESS
  ========================= */

  return children;
}

export default ProtectedRoute;