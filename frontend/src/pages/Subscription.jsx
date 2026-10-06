import { useState } from "react";
import "./Subscription.css";

const plans = [
  {
    id: "basic",
    name: "Basic",
    monthly: 699,
    description: "Everything you need to start digital restaurant ordering.",
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
    name: "Pro",
    monthly: 1499,
    popular: true,
    description: "Powerful tools for growing restaurants.",
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
  {
    id: "premium",
    name: "Premium",
    monthly: 2499,
    description: "Complete restaurant management for high-volume businesses.",
    features: [
      "Everything in Pro",
      "Advanced Analytics",
      "Priority Support",
      "Multiple Operational Features",
      "Premium Business Tools",
      "Future Premium Features",
    ],
  },
];

const billingOptions = {
  monthly: {
    label: "Monthly",
    suffix: "/month",
    multiplier: 1,
    saving: null,
  },
  sixMonths: {
    label: "6 Months",
    suffix: "/6 months",
    multiplier: 6,
    saving: "Save 10%",
  },
  twelveMonths: {
    label: "12 Months",
    suffix: "/year",
    multiplier: 12,
    saving: "Save 20%",
  },
};

function SubscriptionPlans() {
  const [billingPeriod, setBillingPeriod] =
    useState("monthly");

  const selectedBilling =
    billingOptions[billingPeriod];

  const calculatePrice = (monthlyPrice) => {
    if (billingPeriod === "monthly") {
      return monthlyPrice;
    }

    if (billingPeriod === "sixMonths") {
      return Math.round(
        monthlyPrice * 6 * 0.9
      );
    }

    return Math.round(
      monthlyPrice * 12 * 0.8
    );
  };

  const getMonthlyEquivalent = (monthlyPrice) => {
    if (billingPeriod === "monthly") {
      return null;
    }

    return Math.round(
      calculatePrice(monthlyPrice) /
        selectedBilling.multiplier
    );
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
            <strong>DineFlow</strong>
            <span>Restaurant OS</span>
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
          ).map(([key, option]) => (

            <button
              key={key}
              type="button"
              className={
                billingPeriod === key
                  ? "active"
                  : ""
              }
              onClick={() =>
                setBillingPeriod(key)
              }
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

          ))}

        </div>

      </div>

      {/* =========================
          PLANS
      ========================= */}

      <section className="subscription-plans">

        {plans.map((plan) => {

          const price = calculatePrice(
            plan.monthly
          );

          const monthlyEquivalent =
            getMonthlyEquivalent(
              plan.monthly
            );

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
                🎁 7-day free trial included
              </div>

              <button
                type="button"
                className="start-trial-button"
              >
                Start Free Trial →
              </button>

              <div className="features-divider" />

              <h3>
                What's included
              </h3>

              <ul className="subscription-features">

                {plan.features.map(
                  (feature) => (
                    <li key={feature}>
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
          FOOTER NOTE
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