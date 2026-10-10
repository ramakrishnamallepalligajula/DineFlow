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

  // ==========================================
  // AUTH LOADING
  // ==========================================

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

  // ==========================================
  // NOT AUTHENTICATED
  // ==========================================

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace />
    );
  }

  // ==========================================
  // ROLE CHECK
  // ==========================================

if (
  allowedRoles &&
  !allowedRoles.includes(user?.role)
) {
  if (user?.role === "staff") {
    return (
      <Navigate
        to="/staff-dashboard"
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


  // ==========================================
  // SUBSCRIPTION CHECK
  // ==========================================

  const subscription =
    restaurant?.subscription;

  const subscriptionStatus =
    subscription?.status;

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  // ==========================================
  // 24-HOUR FREE TRIAL VALIDATION
  // ==========================================

  const trialEndsAt = subscription?.trialEndsAt
    ? new Date(
        subscription.trialEndsAt
      ).getTime()
    : NaN;

  const hasValidTrial =
    subscriptionStatus === "TRIALING" &&
    Number.isFinite(trialEndsAt) &&
    now < trialEndsAt;

  // ==========================================
  // PAID SUBSCRIPTION VALIDATION
  // ==========================================

  const paidEndsAt =
    subscription?.currentPeriodEnd
      ? new Date(
          subscription.currentPeriodEnd
        ).getTime()
      : NaN;

  const hasValidPaidSubscription =
    subscriptionStatus === "ACTIVE" &&
    Number.isFinite(paidEndsAt) &&
    now < paidEndsAt;

  // ==========================================
  // NO VALID ACCESS
  // ==========================================

  if (
    !hasValidTrial &&
    !hasValidPaidSubscription
  ) {
    return (
      <Navigate
        to="/subscription"
        replace
      />
    );
  }

  // ==========================================
  // ALLOW ACCESS
  // ==========================================

  return children;
}

export default ProtectedRoute;