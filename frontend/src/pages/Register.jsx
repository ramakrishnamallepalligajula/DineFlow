import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Register.css";

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    restaurantName: "",
    restaurantPhone: "",
    restaurantAddress: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            restaurantName: formData.restaurantName,
            restaurantPhone: formData.restaurantPhone,
            restaurantAddress: formData.restaurantAddress,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed"
        );
      }

      /*
       * Store authentication + restaurant information
       */
      login(
        data.token,
        data.user,
        data.restaurant
      );

      navigate("/subscription");
    } catch (error) {
      console.error("Registration failed:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">

      {/* =====================================================
          LEFT SIDE
          ===================================================== */}

      <section className="register-left">

        <div className="register-left-overlay"></div>

        <div className="register-left-content">

          {/* Brand */}

          <div className="register-brand">

            <div className="register-brand-icon">
              👨‍🍳
            </div>

            <div>
              <h1>DineFlow</h1>

              <p>
                Restaurant Management System
              </p>
            </div>

          </div>

          {/* Main Content */}

          <div className="register-hero">

            <span className="register-eyebrow">
              RESTAURANT OPERATIONS
            </span>

            <h2>
              Everything your
              <br />
              restaurant needs,
              <br />
              <span>in one place.</span>
            </h2>

            <p>
              Bring orders, menus, tables, kitchen
              operations and business insights together
              with DineFlow.
            </p>

          </div>

          {/* Benefits */}

          <div className="register-benefits">

            <div className="register-benefit">

              <div className="register-benefit-icon">
                ✓
              </div>

              <div>
                <strong>
                  Digital QR Ordering
                </strong>

                <span>
                  Let customers order directly from their table.
                </span>
              </div>

            </div>

            <div className="register-benefit">

              <div className="register-benefit-icon">
                ✓
              </div>

              <div>
                <strong>
                  Real-time Kitchen
                </strong>

                <span>
                  Send orders instantly to your kitchen team.
                </span>
              </div>

            </div>

            <div className="register-benefit">

              <div className="register-benefit-icon">
                ✓
              </div>

              <div>
                <strong>
                  Business Insights
                </strong>

                <span>
                  Understand orders, revenue and restaurant activity.
                </span>
              </div>

            </div>

          </div>

          {/* Bottom */}

          <div className="register-trust">

            <span className="register-trust-icon">
              ✨
            </span>

            <div>
              <strong>
                Built for modern restaurants
              </strong>

              <p>
                Start with DineFlow and grow with your business.
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          RIGHT SIDE
          ===================================================== */}

      <section className="register-right">

        <div className="register-card">

          {/* Header */}

          <div className="register-header">

            <div className="register-mobile-logo">
              👨‍🍳
            </div>

            <div>

              <span className="register-form-eyebrow">
                GET STARTED
              </span>

              <h2>
                Create your restaurant
              </h2>

              <p>
                Set up your DineFlow account in a few steps.
              </p>

            </div>

          </div>

          {/* Form */}

          <form
            className="register-form"
            onSubmit={handleRegister}
          >

            {/* =================================================
                OWNER DETAILS
                ================================================= */}

            <div className="register-section">

              <div className="register-section-heading">

                <span className="register-section-number">
                  01
                </span>

                <div>
                  <h3>
                    Owner details
                  </h3>

                  <p>
                    Your account information
                  </p>
                </div>

              </div>

              <div className="register-grid">

                {/* Owner Name */}

                <div className="register-field register-field-full">

                  <label htmlFor="name">
                    Owner name
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                  />

                </div>

                {/* Email */}

                <div className="register-field register-field-full">

                  <label htmlFor="email">
                    Email address
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@restaurant.com"
                    autoComplete="email"
                    required
                  />

                </div>

                {/* Password */}

                <div className="register-field">

                  <label htmlFor="password">
                    Password
                  </label>

                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    required
                  />

                </div>

                {/* Confirm Password */}

                <div className="register-field">

                  <label htmlFor="confirmPassword">
                    Confirm password
                  </label>

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    required
                  />

                </div>

              </div>

            </div>

            {/* =================================================
                RESTAURANT DETAILS
                ================================================= */}

            <div className="register-section">

              <div className="register-section-heading">

                <span className="register-section-number">
                  02
                </span>

                <div>

                  <h3>
                    Restaurant details
                  </h3>

                  <p>
                    Tell us about your restaurant
                  </p>

                </div>

              </div>

              <div className="register-grid">

                {/* Restaurant Name */}

                <div className="register-field register-field-full">

                  <label htmlFor="restaurantName">
                    Restaurant name
                  </label>

                  <input
                    id="restaurantName"
                    name="restaurantName"
                    type="text"
                    value={formData.restaurantName}
                    onChange={handleChange}
                    placeholder="e.g. The Grand Kitchen"
                    required
                  />

                </div>

                {/* Phone */}

                <div className="register-field register-field-full">

                  <label htmlFor="restaurantPhone">
                    Phone number
                    <span className="optional">
                      Optional
                    </span>
                  </label>

                  <input
                    id="restaurantPhone"
                    name="restaurantPhone"
                    type="tel"
                    value={formData.restaurantPhone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                  />

                </div>

                {/* Address */}

                <div className="register-field register-field-full">

                  <label htmlFor="restaurantAddress">
                    Restaurant address
                    <span className="optional">
                      Optional
                    </span>
                  </label>

                  <textarea
                    id="restaurantAddress"
                    name="restaurantAddress"
                    value={formData.restaurantAddress}
                    onChange={handleChange}
                    placeholder="Enter your restaurant address"
                    rows="3"
                  />

                </div>

              </div>

            </div>

            {/* Error */}

            {error && (
              <div className="register-error">

                <span className="register-error-icon">
                  !
                </span>

                <span>
                  {error}
                </span>

              </div>
            )}

            {/* Submit */}

            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >

              {loading ? (
                <>
                  <span className="register-spinner"></span>
                  Creating restaurant...
                </>
              ) : (
                <>
                  Create restaurant
                  <span className="register-submit-arrow">
                    →
                  </span>
                </>
              )}

            </button>

            {/* Login */}

            <div className="register-login">

              <span>
                Already have an account?
              </span>

              <button
                type="button"
                onClick={() => navigate("/login")}
              >
                Sign in
              </button>

            </div>

          </form>

          {/* Footer */}

          <div className="register-footer">
            By creating an account, you can start managing
            your restaurant with DineFlow.
          </div>

        </div>

      </section>

    </div>
  );
}

export default Register;