import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";

import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Register.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);

  const [isFirebaseOnboarding, setIsFirebaseOnboarding] = useState(() =>
    Boolean(
      location.state?.requiresFirebaseSetup ||
      sessionStorage.getItem("dineflowRestaurantSetup") === "true" ||
      auth.currentUser
    )
  );

  const [formData, setFormData] = useState({
    name: auth.currentUser?.displayName || "",
    email: auth.currentUser?.email || "",
    password: "",
    confirmPassword: "",
    restaurantName: "",
    gstin: "",
    restaurantAddress: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);

      const setupRequested =
        sessionStorage.getItem("dineflowRestaurantSetup") === "true";

      const routeRequestsSetup =
        location.state?.requiresFirebaseSetup === true;

      setIsFirebaseOnboarding(
        Boolean(user || setupRequested || routeRequestsSetup)
      );

      if (user) {
        setFormData((current) => ({
          ...current,
          name: user.displayName || current.name,
          email: user.email || current.email,
        }));
      }
    });

    return unsubscribe;
  }, [location.state]);

  const handleChange = (event) => {
    const { name } = event.target;
    let { value } = event.target;

    if (name === "gstin") {
      value = value.toUpperCase().replace(/\s/g, "");
    }

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // Optional fallback if the user opens /register directly.
  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);

      sessionStorage.setItem("dineflowRestaurantSetup", "true");
      setFirebaseUser(result.user);
      setIsFirebaseOnboarding(true);

      setFormData((current) => ({
        ...current,
        name: result.user.displayName || current.name,
        email: result.user.email || current.email,
      }));

      navigate("/register", {
        replace: true,
        state: { requiresFirebaseSetup: true },
      });
    } catch (err) {
      console.error("Google signup failed:", err);
      setError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.restaurantName.trim()) {
      setError("Enter your restaurant name.");
      return;
    }

    if (!formData.restaurantAddress.trim()) {
      setError("Enter your restaurant address.");
      return;
    }

    if (!isFirebaseOnboarding) {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
    }

    setLoading(true);

    try {
      let endpoint;
      let body;

      if (isFirebaseOnboarding) {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          throw new Error(
            "Your Google session has expired. Please sign in again with Google."
          );
        }

        const idToken = await currentUser.getIdToken();

        endpoint = `${API_URL}/api/auth/firebase`;

        body = {
          idToken,
          name:
            currentUser.displayName ||
            formData.name.trim() ||
            "DineFlow Owner",
          contactEmail:
            currentUser.email || formData.email.trim(),
          restaurantName: formData.restaurantName.trim(),
          restaurantAddress: formData.restaurantAddress.trim(),
          gstin: formData.gstin.trim(),
        };

        if (!body.contactEmail) {
          throw new Error(
            "A contact email is required to create your restaurant account."
          );
        }
      } else {
        endpoint = `${API_URL}/api/auth/register`;

        body = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          restaurantName: formData.restaurantName.trim(),
          restaurantAddress: formData.restaurantAddress.trim(),
          gstin: formData.gstin.trim(),
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(
            data.message ||
              "This account already exists or is linked to another account. Please sign in with the correct Google account."
          );
        }

        throw new Error(
          data.message ||
            data.error ||
            `Could not create your restaurant (HTTP ${response.status}).`
        );
      }

      if (!data.token || !data.user || !data.restaurant) {
        throw new Error(
          "The server returned incomplete account information. Please try again."
        );
      }

      login(data.token, data.user, data.restaurant);

      sessionStorage.removeItem("dineflowRestaurantSetup");

      const status = data.restaurant.subscription?.status;

      navigate(
        status === "TRIALING" || status === "ACTIVE"
          ? "/admin"
          : "/subscription",
        { replace: true }
      );
    } catch (err) {
      console.error("Restaurant registration failed:", err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <section className="register-left">
        <div className="register-left-overlay" />

        <div className="register-left-content">
          <div className="register-brand">
            <div className="register-brand-icon">👨‍🍳</div>
            <div>
              <h1>DineFlow</h1>
              <p>Restaurant Management System</p>
            </div>
          </div>

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
              Bring orders, menus, tables, kitchen operations and
              business insights together with DineFlow.
            </p>
          </div>

          <div className="register-benefits">
            <div className="register-benefit">
              <div className="register-benefit-icon">✓</div>
              <div>
                <strong>Digital QR Ordering</strong>
                <span>Let customers order directly from their table.</span>
              </div>
            </div>

            <div className="register-benefit">
              <div className="register-benefit-icon">✓</div>
              <div>
                <strong>Real-time Kitchen</strong>
                <span>Send orders instantly to your kitchen team.</span>
              </div>
            </div>

            <div className="register-benefit">
              <div className="register-benefit-icon">✓</div>
              <div>
                <strong>Business Insights</strong>
                <span>Understand orders, revenue and restaurant activity.</span>
              </div>
            </div>
          </div>

          <div className="register-trust">
            <span className="register-trust-icon">✨</span>
            <div>
              <strong>Built for modern restaurants</strong>
              <p>Start with DineFlow and grow with your business.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="register-right">
        <div className="register-card">
          <div className="register-header">
            <div className="register-mobile-logo">👨‍🍳</div>
            <div>
              <span className="register-form-eyebrow">GET STARTED</span>
              <h2>
                {isFirebaseOnboarding
                  ? "Set up your restaurant"
                  : "Create your restaurant"}
              </h2>
              <p>
                {isFirebaseOnboarding
                  ? "Your Google account is connected. Add your restaurant details to continue."
                  : "Create your account and explore DineFlow free for 30 days."}
              </p>
            </div>
          </div>

          {!isFirebaseOnboarding && (
            <>
              <button
                type="button"
                className="register-google-button"
                onClick={handleGoogleSignup}
                disabled={loading}
              >
                {loading ? "Connecting to Google..." : "Continue with Google"}
              </button>

              <div className="register-divider">
                <span>or create an account with email</span>
              </div>
            </>
          )}

          {isFirebaseOnboarding && !firebaseUser && (
            <div className="register-error" role="alert">
              <span className="register-error-icon">!</span>
              <span>
                Your Google session needs to be restored. Click below to sign in again.
              </span>
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={loading}
              >
                Sign in with Google
              </button>
            </div>
          )}

          <form className="register-form" onSubmit={handleRegister}>
            {!isFirebaseOnboarding && (
              <div className="register-section">
                <div className="register-section-heading">
                  <span className="register-section-number">01</span>
                  <div>
                    <h3>Owner details</h3>
                    <p>Your account information</p>
                  </div>
                </div>

                <div className="register-grid">
                  <div className="register-field register-field-full">
                    <label htmlFor="name">Owner name</label>
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

                  <div className="register-field register-field-full">
                    <label htmlFor="email">Email address</label>
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

                  <div className="register-field">
                    <label htmlFor="password">Password</label>
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

                  <div className="register-field">
                    <label htmlFor="confirmPassword">Confirm password</label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="register-section">
              <div className="register-section-heading">
                <span className="register-section-number">
                  {isFirebaseOnboarding ? "01" : "02"}
                </span>
                <div>
                  <h3>Restaurant details</h3>
                  <p>Tell us about your restaurant</p>
                </div>
              </div>

              <div className="register-grid">
                <div className="register-field register-field-full">
                  <label htmlFor="restaurantName">Restaurant name</label>
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

                <div className="form-group">
                  <label htmlFor="gstin">
                    GSTIN <span>(Optional)</span>
                  </label>
                  <input
                    id="gstin"
                    name="gstin"
                    type="text"
                    value={formData.gstin}
                    onChange={handleChange}
                    placeholder="Enter GSTIN if registered"
                    maxLength={15}
                  />
                </div>

                <div className="register-field register-field-full">
                  <label htmlFor="restaurantAddress">
                    Restaurant address <span>*</span>
                  </label>
                  <textarea
                    id="restaurantAddress"
                    name="restaurantAddress"
                    value={formData.restaurantAddress}
                    onChange={handleChange}
                    placeholder="Enter your restaurant address"
                    rows={3}
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="register-error" role="alert">
                <span className="register-error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="register-submit"
              disabled={loading || (isFirebaseOnboarding && !firebaseUser)}
            >
              {loading ? (
                <>
                  <span className="register-spinner" />
                  Creating restaurant...
                </>
              ) : (
                <>
                  Start 30-day free trial
                  <span className="register-submit-arrow">→</span>
                </>
              )}
            </button>

            <div className="register-login">
              <span>Already have an account?</span>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem("dineflowRestaurantSetup");
                  navigate("/login", { replace: true });
                }}
              >
                Sign in
              </button>
            </div>
          </form>

          <div className="register-footer">
            No payment required to get started. Explore DineFlow for 30 days
            and choose a plan when you're ready.
          </div>
        </div>
      </section>
    </div>
  );
}

export default Register;