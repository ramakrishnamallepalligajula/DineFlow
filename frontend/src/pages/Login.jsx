import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { auth, googleProvider } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

function Login() {
  const navigate = useNavigate();
  const { login, refreshUser } = useAuth();

  const [loginMode, setLoginMode] = useState("admin");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

// CREATE RESTAURANT ACCOUNT — GOOGLE FIRST
const handleCreateRestaurantAccount = async () => {
  setError("");
  setMessage("");
  setLoading(true);

  try {
    // 1. Authenticate through Firebase Google sign-in.
    const result = await signInWithPopup(auth, googleProvider);

    // 2. Get a Firebase ID token for backend verification.
    const idToken = await result.user.getIdToken();

    // 3. Use the SAME backend authentication endpoint as Google Login.
    const response = await fetch(`${API_URL}/api/auth/firebase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idToken,
        name: result.user.displayName || "",
        contactEmail: result.user.email || "",
      }),
    });

    const data = await response.json().catch(() => ({}));

    // 4. New users or existing users without a restaurant
    // must complete restaurant onboarding.
    if (response.status === 428 && data.requiresRestaurantSetup) {
      sessionStorage.setItem("dineflowRestaurantSetup", "true");

      navigate("/register", {
        replace: true,
        state: {
          requiresFirebaseSetup: true,
          firebaseUser: data.firebaseUser || {
            name: result.user.displayName || "",
            email: result.user.email || "",
            phoneNumber: result.user.phoneNumber || null,
          },
        },
      });

      return;
    }

    // 5. Handle backend authentication errors.
    if (!response.ok) {
      throw new Error(
        data.message || "Unable to authenticate with Google."
      );
    }

    // 6. Existing restaurant accounts should sign in normally.
    if (!data.token || !data.user || !data.restaurant) {
      throw new Error(
        "The server returned incomplete account information."
      );
    }

    if (data.user.role !== "admin") {
      throw new Error(
        "This account cannot use admin Google login. Please use Staff Login."
      );
    }

    // 7. Save the authenticated session using the existing AuthContext.
    login(data.token, data.user, data.restaurant);

    sessionStorage.removeItem("dineflowRestaurantSetup");

    // 8. Refresh restaurant information if available.
    let restaurant = data.restaurant;

    try {
      const refreshed = await refreshUser();

      if (refreshed?.restaurant) {
        restaurant = refreshed.restaurant;
      }
    } catch (refreshError) {
      console.error("Session refresh failed:", refreshError);
    }

    // 9. Route existing owners according to subscription status.
    const status = restaurant?.subscription?.status;

    navigate(
      status === "TRIALING" || status === "ACTIVE"
        ? "/admin"
        : "/subscription",
      { replace: true }
    );
  } catch (err) {
    console.error("Google restaurant signup failed:", err);

    setError(
      err.message || "Google sign-in failed. Please try again."
    );
  } finally {
    setLoading(false);
  }
};

  // EXISTING ADMIN GOOGLE LOGIN
  const handleGoogleLogin = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const response = await fetch(`${API_URL}/api/auth/firebase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 428 && data.requiresRestaurantSetup) {
        sessionStorage.setItem("dineflowRestaurantSetup", "true");

        navigate("/register", {
          replace: true,
          state: { requiresFirebaseSetup: true },
        });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Google authentication failed.");
      }

      if (!data.token || !data.user || !data.restaurant) {
        throw new Error("The server returned incomplete account information.");
      }

      if (data.user.role !== "admin") {
        throw new Error(
          "This account cannot use admin Google login. Please use Staff Login."
        );
      }

      login(data.token, data.user, data.restaurant);

      let restaurant = data.restaurant;

      try {
        const refreshed = await refreshUser();
        if (refreshed?.restaurant) restaurant = refreshed.restaurant;
      } catch (refreshError) {
        console.error("Session refresh failed:", refreshError);
      }

      const status = restaurant?.subscription?.status;

      navigate(
        status === "TRIALING" || status === "ACTIVE"
          ? "/admin"
          : "/subscription",
        { replace: true }
      );
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  // STAFF LOGIN
  const handleStaffLogin = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: staffEmail.trim().toLowerCase(),
          password: staffPassword,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          `Staff login endpoint returned HTTP ${response.status}. Check your backend route registration.`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Staff login failed.");
      }

      if (
        !data.token ||
        !data.user ||
        !data.restaurant ||
        data.user.role !== "staff"
      ) {
        throw new Error("Invalid staff account response.");
      }

      login(data.token, data.user, data.restaurant);

      try {
        const refreshed = await refreshUser();

        if (refreshed?.user && refreshed.user.role !== "staff") {
          throw new Error("This account is not authorized for staff access.");
        }
      } catch (refreshError) {
        console.error("Staff session refresh failed:", refreshError);
      }

      navigate("/kitchen", { replace: true });
    } catch (err) {
      console.error("Staff login failed:", err);
      setError(err.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const changeLoginMode = (mode) => {
    setLoginMode(mode);
    setError("");
    setMessage("");
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-overlay" />

        <div className="login-left-content">
          <div className="brand" onClick={() => navigate("/")}>
            <div className="brand-icon">🍽️</div>
            <div>
              <h1>DineFlow</h1>
              <p>Restaurant Management System</p>
            </div>
          </div>

          <div className="hero-content">
            <h2>
              Manage Your <span>Restaurant</span> with Ease
            </h2>
            <p className="hero-description">
              Manage orders, menus, tables and more — all in one place.
            </p>
          </div>

          <div className="login-features">
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <div>
                <h3>Real-time Orders</h3>
                <p>Track orders as they arrive</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">🔔</div>
              <div>
                <h3>Menu Management</h3>
                <p>Manage your restaurant menu</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">▣</div>
              <div>
                <h3>Table QR Codes</h3>
                <p>Enable digital ordering</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-logo">🍽️</div>

          <div className="login-heading">
            <h2>Welcome to DineFlow</h2>
            <p>Sign in to your restaurant workspace</p>
          </div>

          <div
            className="login-mode-switch"
            role="group"
            aria-label="Choose login type"
          >
            <button
              type="button"
              className={loginMode === "admin" ? "active" : ""}
              aria-pressed={loginMode === "admin"}
              onClick={() => changeLoginMode("admin")}
              disabled={loading}
            >
              Admin Login
            </button>

            <button
              type="button"
              className={loginMode === "staff" ? "active" : ""}
              aria-pressed={loginMode === "staff"}
              onClick={() => changeLoginMode("staff")}
              disabled={loading}
            >
              Staff Login
            </button>
          </div>

          {error && (
            <p className="login-error" role="alert">{error}</p>
          )}

          {message && <p role="status">{message}</p>}

          {loginMode === "admin" && (
            <>
              <button
                type="button"
                className="login-submit"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                {loading ? "Please wait..." : "Continue with Google"}
              </button>

              <div className="register-link">
                <p>New to DineFlow?</p>
                <button
                  className="Create-account"
                  type="button"
                  onClick={handleCreateRestaurantAccount}
                  disabled={loading}
                >
                  {loading
                    ? "Connecting to Google..."
                    : "Create Restaurant Account"}
                </button>
              </div>
            </>
          )}

          {loginMode === "staff" && (
            <>
              <p className="staff-login-description">
                Sign in using the credentials provided by your restaurant admin.
              </p>

              <form className="login-form" onSubmit={handleStaffLogin}>
                <div className="login-field">
                  <label htmlFor="staff-email">Email address</label>
                  <input
                    id="staff-email"
                    type="email"
                    value={staffEmail}
                    onChange={(event) => setStaffEmail(event.target.value)}
                    placeholder="staff@restaurant.com"
                    autoComplete="username"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="staff-password">Password</label>
                  <input
                    id="staff-password"
                    type="password"
                    value={staffPassword}
                    onChange={(event) => setStaffPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  className="login-submit"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Staff Sign In"}
                </button>
              </form>

              <p className="staff-login-help">
                Need access? Contact your restaurant admin.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;