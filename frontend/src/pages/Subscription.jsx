import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Subscription.css";
import { useAuth } from "../context/AuthContext";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

const plans = [
  {
    id: "basic",
    apiPlan: "BASIC",
    name: "Basic",
    description:
      "Everything you need to start digital restaurant ordering.",
    features: [
      "QR Code Ordering",
      "Digital Menu",
      "Kitchen Order Management",
      "Table Management",
      "Basic Dashboard",
      "Customer Final Bill",
    ],
  },
  {
    id: "pro",
    apiPlan: "PRO",
    name: "Pro",
    popular: true,
    description:
      "Powerful tools for growing restaurants.",
    features: [
      "Everything in Basic",
      "Advanced Dashboard",
      "Reports & Analytics",
      "Bill History & Reprint",
      "Printer Management",
      "Staff Management",
      "Advanced Business Insights",
    ],
  },
];

const billingOptions = {
  monthly: {
    apiValue: "MONTHLY",
    label: "Monthly",
    suffix: "/month",
    prices: {
      basic: 899,
      pro: 1499,
    },
    saving: null,
  },

  sixMonths: {
    apiValue: "SIX_MONTHS",
    label: "6 Months",
    suffix: "/6 months",
    prices: {
      basic: 4499,
      pro: 7499,
    },
    saving: "Save ~17%",
  },

  twelveMonths: {
    apiValue: "TWELVE_MONTHS",
    label: "12 Months",
    suffix: "/year",
    prices: {
      basic: 7999,
      pro: 14999,
    },
    saving: "Save ~26%",
  },
};

function SubscriptionPlans() {
  const navigate = useNavigate();
  const {
  updateSession,
} = useAuth();

  const [billingPeriod, setBillingPeriod] =
    useState("monthly");

  const [loadingPlan, setLoadingPlan] =
    useState(null);

  const [error, setError] = useState("");

  const [showWelcome, setShowWelcome] =
    useState(false);

  const [startedPlan, setStartedPlan] =
    useState(null);

  const selectedBilling =
    billingOptions[billingPeriod];

  // ==========================================
  // START FREE TRIAL
  // ==========================================

  const handleStartTrial = async (plan) => {
    if (loadingPlan) {
      return;
    }

    setError("");
    setLoadingPlan(plan.id);

    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/restaurants/start-trial`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            plan: plan.apiPlan,

            billingPeriod:
              selectedBilling.apiValue,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to start free trial"
        );
      }

      console.log(
        "🎉 Trial started successfully:",
        data
      );

      // ==========================================
      // SAVE SELECTED PLAN
      // ==========================================

      setStartedPlan({
        name: plan.name,
        billingPeriod:
          selectedBilling.label,
        trialEndsAt:
          data.subscription
            ?.trialEndsAt,
      });

      // ==========================================
      // SHOW WELCOME POPUP
      // ==========================================

      setShowWelcome(true);

    } catch (error) {
      console.error(
        "❌ Trial start error:",
        error
      );

      setError(
        error.message ||
          "Something went wrong while starting your trial."
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  // ==========================================
  // CONTINUE TO DASHBOARD
  // ==========================================

/*  

const handleContinue = async () => {
  try {
    const token =
      localStorage.getItem("token");

    if (!token) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    // Refresh the latest restaurant/subscription
    // information before entering the dashboard.
    const response = await fetch(
      `${API_URL}/api/auth/me`,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        "Failed to refresh account information"
      );
    }

    const data =
      await response.json();

    // Update localStorage so ProtectedRoute
    // has the latest subscription.
    if (data.user) {
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );
    }

    if (data.restaurant) {
      localStorage.setItem(
        "restaurant",
        JSON.stringify(
          data.restaurant
        )
      );
    }

    setShowWelcome(false);

    // Now enter the dashboard.
    navigate("/admin", {
      replace: true,
    });
  } catch (error) {
    console.error(
      "❌ Failed to enter DineFlow:",
      error
    );

    // Even if the refresh fails, don't leave
    // the user trapped on the popup.
    setShowWelcome(false);

    navigate("/admin", {
      replace: true,
    });
  }
};
*/


const handleContinue = async () => {
  try {
    const token =
      localStorage.getItem("token");

    // ==========================================
    // AUTH CHECK
    // ==========================================

    if (!token) {
      setShowWelcome(false);

      navigate("/login", {
        replace: true,
      });

      return;
    }

    // ==========================================
    // GET FRESH ACCOUNT DATA
    // ==========================================

    const response = await fetch(
      `${API_URL}/api/auth/me`,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("restaurant");

      setShowWelcome(false);

      navigate("/login", {
        replace: true,
      });

      return;
    }

    if (!response.ok) {
      throw new Error(
        "Failed to refresh account information"
      );
    }

    const data =
      await response.json();

    // ==========================================
    // VALIDATE ACCOUNT DATA
    // ==========================================

    if (
      !data.user ||
      !data.restaurant
    ) {
      throw new Error(
        "Account information is incomplete"
      );
    }

    const subscription =
      data.restaurant.subscription;

    const status =
      subscription?.status;

    // ==========================================
    // MAKE SURE TRIAL WAS ACTUALLY ACTIVATED
    // ==========================================

    const hasAccess =
      status === "TRIALING" ||
      status === "ACTIVE";

    if (!hasAccess) {
      throw new Error(
        "Your free trial is not active yet. Please try again."
      );
    }

    console.log(
      "✅ Trial verified:",
      {
        plan:
          subscription.plan,

        status:
          subscription.status,

        trialEndsAt:
          subscription.trialEndsAt,
      }
    );

    // ==========================================
    // IMPORTANT
    //
    // Update React AuthContext AND localStorage.
    //
    // Previously only localStorage was updated,
    // which caused ProtectedRoute to use stale
    // subscription data.
    // ==========================================

    updateSession(
      data.user,
      data.restaurant
    );

    // ==========================================
    // CLOSE POPUP
    // ==========================================

    setShowWelcome(false);

    // ==========================================
    // ENTER DINEFLOW
    // ==========================================

    navigate("/admin", {
      replace: true,
    });
  } catch (error) {
    console.error(
      "❌ Failed to enter DineFlow:",
      error
    );

    setError(
      error.message ||
        "Unable to enter DineFlow. Please try again."
    );

    // Keep popup open so the user can retry.
    // DO NOT navigate to /admin when verification
    // fails.
  }
};


  return (
    <div className="subscription-page">

      {/* ======================================
          HEADER
      ====================================== */}

      <header className="subscription-header">

        <div className="subscription-brand">

          <div className="subscription-brand-icon">
            🍽️
          </div>

          <div>
            <strong>
              DineFlow
            </strong>

            <span>
              Restaurant OS
            </span>
          </div>

        </div>

        <div className="trial-badge">
          🎉 3-Day Free Trial
        </div>

      </header>

      {/* ======================================
          HERO
      ====================================== */}

      <section className="subscription-hero">

        <span className="subscription-eyebrow">
          SIMPLE & TRANSPARENT PRICING
        </span>

        <h1>
          Choose the plan that
          <br />
          fits your restaurant.
        </h1>

        <p>
          Start with a 3-day free trial.
          No complicated setup. Choose your
          billing period and grow with DineFlow.
        </p>

      </section>

      {/* ======================================
          BILLING SELECTOR
      ====================================== */}

      <div className="billing-selector-wrapper">

        <div className="billing-selector">

          {Object.entries(
            billingOptions
          ).map(
            ([key, option]) => (

              <button
                key={key}
                type="button"
                className={
                  billingPeriod === key
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setBillingPeriod(key);
                  setError("");
                }}
              >

                <span>
                  {option.label}
                </span>

                {option.saving && (
                  <small>
                    {option.saving}
                  </small>
                )}

              </button>

            )
          )}

        </div>

      </div>

      {/* ======================================
          ERROR
      ====================================== */}

      {error && (
        <div
          className="subscription-error"
        >
          {error}
        </div>
      )}

      {/* ======================================
          PLANS
      ====================================== */}

      <section className="subscription-plans">

        {plans.map((plan) => {

          const price =
            selectedBilling.prices[
              plan.id
            ];

          let monthlyEquivalent =
            null;

          if (
            billingPeriod ===
            "sixMonths"
          ) {
            monthlyEquivalent =
              Math.round(price / 6);
          }

          if (
            billingPeriod ===
            "twelveMonths"
          ) {
            monthlyEquivalent =
              Math.round(price / 12);
          }

          const isLoading =
            loadingPlan === plan.id;

          return (
            <article
              key={plan.id}
              className={`subscription-card ${
                plan.popular
                  ? "popular"
                  : ""
              }`}
            >

              {plan.popular && (
                <div className="popular-badge">
                  MOST POPULAR
                </div>
              )}

              <div className="subscription-card-header">

                <h2>
                  {plan.name}
                </h2>

                <p>
                  {plan.description}
                </p>

              </div>

              <div className="subscription-price">

                <span className="currency">
                  ₹
                </span>

                <strong>
                  {price.toLocaleString(
                    "en-IN"
                  )}
                </strong>

                <span className="price-period">
                  {selectedBilling.suffix}
                </span>

              </div>

              {monthlyEquivalent && (
                <div className="monthly-equivalent">
                  ≈ ₹
                  {monthlyEquivalent.toLocaleString(
                    "en-IN"
                  )}
                  /month
                </div>
              )}

              <div className="trial-message">
                🎁 3-day free trial included
              </div>

              <button
                type="button"
                className="start-trial-button"
                disabled={
                  loadingPlan !== null
                }
                onClick={() =>
                  handleStartTrial(plan)
                }
              >
                {isLoading
                  ? "Starting Trial..."
                  : "Start Free Trial →"}
              </button>

              <div className="features-divider" />

              <h3>
                What's included
              </h3>

              <ul className="subscription-features">

                {plan.features.map(
                  (feature) => (
                    <li
                      key={feature}
                    >
                      <span className="feature-check">
                        ✓
                      </span>

                      <span>
                        {feature}
                      </span>
                    </li>
                  )
                )}

              </ul>

            </article>
          );
        })}

      </section>

      {/* ======================================
          FOOTER
      ====================================== */}

      <section className="subscription-footer">

        <div>

          <strong>
            Start risk-free with DineFlow.
          </strong>

          <p>
            Your 3-day trial gives you time to
            experience DineFlow before committing
            to a paid subscription.
          </p>

        </div>

      </section>

      {/* ======================================
          WELCOME POPUP
      ====================================== */}

      {showWelcome && (
        <div className="trial-success-overlay">

          {/* Floating particles */}

          <div className="success-particle particle-one">
            ✦
          </div>

          <div className="success-particle particle-two">
            ✦
          </div>

          <div className="success-particle particle-three">
            ✦
          </div>

          <div className="success-particle particle-four">
            ✦
          </div>

          <div className="success-particle particle-five">
            ✦
          </div>

          {/* Popup */}

          <div className="trial-success-card">

            {/* Animated check */}

            <div className="success-check-wrapper">

              <div className="success-check-circle">
                <span>✓</span>
              </div>

            </div>

            {/* Greeting */}

            <div className="trial-success-content">

              <div className="success-small-title">
                🎉 YOU'RE ALL SET
              </div>

              <h2>
                Welcome to DineFlow!
              </h2>

              <p>
                Your restaurant is now ready
                to start its journey with
                DineFlow.
              </p>

              {startedPlan && (
                <div className="trial-details">

                  <div>
                    <span>
                      Plan
                    </span>

                    <strong>
                      {startedPlan.name}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Billing
                    </span>

                    <strong>
                      {startedPlan.billingPeriod}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Trial
                    </span>

                    <strong>
                      3 Days Free
                    </strong>
                  </div>

                </div>
              )}

              <div className="trial-success-message">
                🚀 Let's get your restaurant
                ready for success.
              </div>

              <button
                type="button"
                className="trial-success-button"
                onClick={
                  handleContinue
                }
              >
                Enter DineFlow
                <span>→</span>
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default SubscriptionPlans;