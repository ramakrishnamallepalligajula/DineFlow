import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Subscription.css";

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
    multiplier: 6,
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
    multiplier: 12,
  },
};

function SubscriptionPlans() {
  const navigate = useNavigate();

  const [billingPeriod, setBillingPeriod] =
    useState("monthly");

  const [loadingPlan, setLoadingPlan] =
    useState(null);

  const [error, setError] =
    useState("");

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
        "https://dineflow-050e.onrender.com/api/restaurants/start-trial",
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
      // TRIAL STARTED
      // ==========================================

      navigate("/admin");
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

  return (
    <div className="subscription-page">

      {/* =========================
          HEADER
      ========================= */}

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
          🎉 7-Day Free Trial
        </div>

      </header>

      {/* =========================
          HERO
      ========================= */}

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
          Start with a 7-day free trial.
          No complicated setup. Choose your
          billing period and grow with DineFlow.
        </p>

      </section>

      {/* =========================
          BILLING SELECTOR
      ========================= */}

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

      {/* =========================
          ERROR MESSAGE
      ========================= */}

      {error && (
        <div
          style={{
            maxWidth: "1100px",
            margin: "20px auto",
            padding: "14px 18px",
            borderRadius: "10px",
            background: "#fff1f2",
            color: "#be123c",
            border:
              "1px solid #fecdd3",
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {/* =========================
          PLANS
      ========================= */}

      <section className="subscription-plans">

        {plans.map((plan) => {

          const price =
            selectedBilling.prices[
              plan.id
            ];

          let monthlyEquivalent = null;

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

              {/* =========================
                  POPULAR BADGE
              ========================= */}

              {plan.popular && (
                <div className="popular-badge">
                  MOST POPULAR
                </div>
              )}

              {/* =========================
                  PLAN HEADER
              ========================= */}

              <div className="subscription-card-header">

                <h2>
                  {plan.name}
                </h2>

                <p>
                  {plan.description}
                </p>

              </div>

              {/* =========================
                  PRICE
              ========================= */}

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

              {/* =========================
                  MONTHLY EQUIVALENT
              ========================= */}

              {monthlyEquivalent && (
                <div className="monthly-equivalent">
                  ≈ ₹
                  {monthlyEquivalent.toLocaleString(
                    "en-IN"
                  )}
                  /month
                </div>
              )}

              {/* =========================
                  FREE TRIAL
              ========================= */}

              <div className="trial-message">
                🎁 7-day free trial included
              </div>

              {/* =========================
                  START TRIAL BUTTON
              ========================= */}

              <button
                type="button"
                className="start-trial-button"
                disabled={loadingPlan !== null}
                onClick={() =>
                  handleStartTrial(plan)
                }
              >

                {isLoading
                  ? "Starting Trial..."
                  : "Start Free Trial →"}

              </button>

              {/* =========================
                  FEATURES
              ========================= */}

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

      {/* =========================
          FOOTER
      ========================= */}

      <section className="subscription-footer">

        <div>

          <strong>
            Start risk-free with DineFlow.
          </strong>

          <p>
            Your 7-day trial gives you time to
            experience DineFlow before committing
            to a paid subscription.
          </p>

        </div>

      </section>

    </div>
  );
}

export default SubscriptionPlans;