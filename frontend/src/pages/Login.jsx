
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import "./Login.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

function Login() {
  const navigate = useNavigate();
  const { login, refreshUser } = useAuth();

  const [loginMode, setLoginMode] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (!data.token || !data.user || !data.restaurant) {
        throw new Error("The server returned incomplete account information.");
      }

      if (data.user.role !== loginMode) {
        throw new Error(
          loginMode === "admin"
            ? "This is not an administrator account. Please use Staff Login."
            : "This is not a staff account. Please use Admin Login."
        );
      }

      login(data.token, data.user, data.restaurant);

      let restaurant = data.restaurant;

      try {
        const refreshed = await refreshUser();

        if (refreshed?.restaurant) {
          restaurant = refreshed.restaurant;
        }
      } catch (refreshError) {
        console.error("Session refresh failed:", refreshError);
      }

      if (loginMode === "staff") {
        navigate("/kitchen", { replace: true });
        return;
      }

      const status = restaurant?.subscription?.status;

      navigate(
        status === "TRIALING" || status === "ACTIVE"
          ? "/admin"
          : "/subscription",
        { replace: true }
      );
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const changeLoginMode = (mode) => {
    setLoginMode(mode);
    setError("");
    setEmail("");
    setPassword("");
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
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@restaurant.com"
                autoComplete="username"
                required
                disabled={loading}
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
              {loading
                ? "Signing in..."
                : loginMode === "admin"
                  ? "Admin Sign In"
                  : "Staff Sign In"}
            </button>
          </form>

          {loginMode === "admin" && (
            <div className="register-link">
              <p>New to DineFlow?</p>
              <button
                className="Create-account"
                type="button"
                onClick={() => navigate("/register")}
                disabled={loading}
              >
                Create Restaurant Account
              </button>
            </div>
          )}

          {loginMode === "staff" && (
            <p className="staff-login-help">
              Need access? Contact your restaurant admin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
