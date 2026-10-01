import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed"
        );
      }

      // Save authentication information
      login(
        data.token, 
        data.user,
        data.restaurant
      );

      // Go to admin dashboard
      if (data.user.role === "staff") {
        navigate("/kitchen");
      } else {
        navigate("/admin");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* ================= LEFT SIDE ================= */}

      <div className="login-left">

        <div className="login-overlay"></div>

        <div className="login-left-content">

          {/* Logo */}

          <div className="brand">
            <div className="brand-icon">
              👨‍🍳
            </div>

            <div>
              <h1>DineFlow</h1>
              <p>Restaurant Management System</p>
            </div>
          </div>

          {/* Main Heading */}

          <div className="hero-content">

            <h2>
              Manage Your
              <br />

              <span>Restaurant</span> with Ease
            </h2>

            <p className="hero-description">
              Simple, fast and powerful tools to handle
              orders, menu, tables and more — all in one place.
            </p>

          </div>

          {/* Features */}

          <div className="login-features">

            <div className="feature-item">
              <div className="feature-icon">
                📊
              </div>

              <div>
                <h3>Real-time Orders</h3>
                <p>Track orders as they come in</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                🔔
              </div>

              <div>
                <h3>Menu Management</h3>
                <p>Add, edit and organize food items</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                ▣
              </div>

              <div>
                <h3>Table QR Codes</h3>
                <p>Generate QR codes for each table</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                👥
              </div>

              <div>
                <h3>Staff Management</h3>
                <p>Manage kitchen and service staff</p>
              </div>
            </div>

          </div>

          {/* Bottom Message */}

          <div className="login-bottom-card">

            <div className="bottom-star">
              ✨
            </div>

            <div>
              <strong>
                Built for modern restaurants
              </strong>

              <p>
                Faster service. Happier customers. Higher profits.
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* ================= RIGHT SIDE ================= */}

      <div className="login-right">

        <div className="login-card">

          {/* Logo */}

          <div className="login-logo">
            👨‍🍳
          </div>

          <div className="login-heading">

            <h2>Welcome Back</h2>

            <p>
              Login to your restaurant dashboard
            </p>

          </div>

          {/* Login Form */}

          <form
            className="login-form"
            onSubmit={handleLogin}
          >

            {/* Email */}

            <div className="login-field">

              <label htmlFor="email">
                Email Address
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  ✉
                </span>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="admin@restaurant.com"
                  required
                />

              </div>

            </div>

            {/* Password */}

            <div className="login-field">

              <label htmlFor="password">
                Password
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  🔒
                </span>

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>

              </div>

            </div>

            {/* Remember / Forgot */}

            <div className="login-options">

              <label className="remember-me">

                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(event.target.checked)
                  }
                />

                <span>
                  Remember me
                </span>

              </label>

              <button
                type="button"
                className="forgot-password"
                onClick={() =>
                  alert(
                    "Please contact your administrator to reset your password."
                  )
                }
              >
                Forgot password?
              </button>

            </div>

            {/* Error */}

            {error && (
              <p className="login-error">
                {error}
              </p>
            )}

            {/* Login */}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Login"}

              {!loading && (
                <span className="login-arrow">
                  →
                </span>
              )}
            </button>

          </form>

          {/* Divider */}

          <div className="login-divider">
            <span></span>
            <p>OR</p>
            <span></span>
          </div>

          {/* Contact */}
          <div className="register-link">
  <p>Don't have a restaurant account?</p>

  <button
  className="Create-account"
    type="button"
    onClick={() => navigate("/register")}
  >
    Create Restaurant Account
  </button>
</div>

        </div>

      </div>

    </div>
  );
}

export default Login;