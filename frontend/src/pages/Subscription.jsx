import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Subscription.css";
import { useAuth } from "../context/AuthContext";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

const plans = [
  {
    id: "basic",
    apiPlan: "BASIC",
    name: "Basic",
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
    apiPlan: "PRO",
    name: "Pro",
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
];

const billingOptions = {
  monthly: {
    apiValue: "MONTHLY",
    label: "Monthly",
    suffix: "/month",
    prices: {
      basic: 999,
      pro: 1499,
    },
    saving: null,
  },
  twelveMonths: {
    apiValue: "TWELVE_MONTHS",
    label: "12 Months",
    suffix: "/year",
    prices: {
      basic: 9999,
      pro: 14999,
    },
    saving: "Save ~26%",
  },
};

function SubscriptionPlans() {
  const navigate = useNavigate();
  const { updateSession } = useAuth();

  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [startedPlan, setStartedPlan] = useState(null);

  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [accountData, setAccountData] = useState(null);

  const selectedBilling = billingOptions[billingPeriod];

  useEffect(() => {
    let cancelled = false;

    const fetchSubscription = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setSubscriptionLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Unable to load your subscription.");
        }

        const data = await response.json();

        if (cancelled) return;

        setAccountData(data);
        setSubscription(data.restaurant?.subscription ?? null);
      } catch (err) {
        if (!cancelled) {
          console.error("Subscription loading error:", err);
          setError(err.message || "Unable to load subscription.");
        }
      } finally {
        if (!cancelled) {
          setSubscriptionLoading(false);
        }
      }
    };

    fetchSubscription();

    return () => {
      cancelled = true;
    };
  }, []);

  const trialAlreadyUsed = Boolean(
    subscription?.trialUsed ||
      subscription?.trialStartedAt ||
      subscription?.trialEndsAt ||
      ["TRIALING", "EXPIRED", "CANCELLED"].includes(
        subscription?.status
      )
  );

  const paidSubscriptionActive =
    subscription?.status === "ACTIVE";

  const handleStartTrial = async (plan) => {
    if (loadingPlan) return;

    setError("");
    setLoadingPlan(plan.id);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/restaurants/start-trial`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            plan: plan.apiPlan,
            billingPeriod: selectedBilling.apiValue,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to start free trial."
        );
      }

      setStartedPlan({
        name: plan.name,
        billingPeriod: selectedBilling.label,
        trialEndsAt: data.subscription?.trialEndsAt,
      });

      // Immediately switch the button to Buy Plan.
      setSubscription((previous) => ({
        ...previous,
        ...data.subscription,
        status: data.subscription?.status || "TRIALING",
        trialUsed: true,
      }));

      setShowWelcome(true);
    } catch (err) {
      console.error("Trial start error:", err);
      setError(err.message || "Unable to start free trial.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleBuyPlan = async (plan) => {
  if (loadingPlan) return;

  const token = localStorage.getItem("token");

  if (!token) {
    navigate("/login");
    return;
  }

  setError("");
  setLoadingPlan(plan.id);

  try {
    // Load Razorpay Checkout.
    const scriptLoaded = await new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });

    if (!scriptLoaded) {
      throw new Error("Unable to load Razorpay Checkout.");
    }

    // Step 1: Create or update the pending subscription.
    const selectResponse = await fetch(
      `${API_URL}/api/subscriptions/select-plan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: plan.apiPlan,
          billingCycle: selectedBilling.apiValue,
        }),
      }
    );

    const selectedData = await selectResponse.json();

    if (!selectResponse.ok) {
      throw new Error(
        selectedData.message || "Unable to select subscription plan."
      );
    }

    // Step 2: Create Razorpay order using the existing payment route.
    const orderResponse = await fetch(
      `${API_URL}/api/payments/create-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      throw new Error(
        orderData.message || "Unable to create Razorpay order."
      );
    }

    const order = orderData.order;

    if (!order?.id || !order?.key || !order?.amount) {
      throw new Error("Invalid Razorpay order response.");
    }

    // Step 3: Open Razorpay Checkout.
    const razorpay = new window.Razorpay({
      key: order.key,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency || "INR",
      name: "DineFlow",
      description: `${plan.name} Subscription`,
      theme: {
        color: "#111827",
      },

      handler: async (paymentResponse) => {
        try {
          // Step 4: Verify payment through the existing backend.
          const verifyResponse = await fetch(
            `${API_URL}/api/payments/verify`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(paymentResponse),
            }
          );

          const verification = await verifyResponse.json();

          if (!verifyResponse.ok) {
            throw new Error(
              verification.message || "Payment verification failed."
            );
          }

          // Step 5: Refresh account and subscription information.
          const accountResponse = await fetch(
            `${API_URL}/api/auth/me`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!accountResponse.ok) {
            throw new Error(
              "Payment was verified, but account refresh failed."
            );
          }

          const account = await accountResponse.json();

          if (!account.user || !account.restaurant) {
            throw new Error("Account information is incomplete.");
          }

          updateSession(account.user, account.restaurant);

          setAccountData(account);
          setSubscription(
            account.restaurant.subscription ?? null
          );

          navigate("/admin", { replace: true });
        } catch (err) {
          console.error("Payment verification error:", err);

          setError(
            err.message ||
              "Unable to verify payment. Check your payment status before retrying."
          );
        } finally {
          setLoadingPlan(null);
        }
      },

      modal: {
        ondismiss: () => {
          setLoadingPlan(null);
        },
      },
    });

    razorpay.on("payment.failed", (failure) => {
      console.error("Razorpay payment failed:", failure.error);

      setError(
        failure.error?.description ||
          "Payment failed. Please try again."
      );

      setLoadingPlan(null);
    });

    razorpay.open();
  } catch (err) {
    console.error("Buy plan error:", err);

    setError(
      err.message || "Unable to initiate subscription payment."
    );

    setLoadingPlan(null);
  }
};

  const handleContinue = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setShowWelcome(false);
        navigate("/login", { replace: true });
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("restaurant");

        setShowWelcome(false);
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to refresh account information.");
      }

      const data = await response.json();

      if (!data.user || !data.restaurant) {
        throw new Error("Account information is incomplete.");
      }

      const status = data.restaurant.subscription?.status;

      if (!["TRIALING", "ACTIVE"].includes(status)) {
        throw new Error("Your trial is not active yet.");
      }

      updateSession(data.user, data.restaurant);
      setAccountData(data);
      setSubscription(data.restaurant.subscription ?? null);
      setShowWelcome(false);

      navigate("/admin", { replace: true });
    } catch (err) {
      console.error("Failed to enter DineFlow:", err);
      setError(
        err.message || "Unable to enter DineFlow. Please try again."
      );
    }
  };

  return (
    <div className="subscription-page">
      <header className="subscription-header">
        <div className="subscription-brand">
          <div className="subscription-brand-icon">🍽️</div>
          <div>
            <strong>DineFlow</strong>
            <span>Restaurant OS</span>
          </div>
        </div>

        <div className="trial-badge">🎉 1-Day Free Trial</div>
      </header>

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
          Start with a 1-day free trial. No complicated setup.
          Choose your billing period and grow with DineFlow.
        </p>
      </section>

      <div className="billing-selector-wrapper">
        <div className="billing-selector">
          {Object.entries(billingOptions).map(([key, option]) => (
            <button
              key={key}
              type="button"
              className={billingPeriod === key ? "active" : ""}
              onClick={() => {
                setBillingPeriod(key);
                setError("");
              }}
            >
              <span>{option.label}</span>
              {option.saving && <small>{option.saving}</small>}
            </button>
          ))}
        </div>
      </div>

      {trialAlreadyUsed && !paidSubscriptionActive && (
        <div className="subscription-error">
          Your free trial has already been used. Choose a plan to continue.
        </div>
      )}

      {error && (
        <div className="subscription-error">
          {error}
        </div>
      )}

      <section className="subscription-plans">
        {plans.map((plan) => {
          const price = selectedBilling.prices[plan.id];
          const monthlyEquivalent =
            billingPeriod === "twelveMonths"
              ? Math.round(price / 12)
              : null;

          const isLoading = loadingPlan === plan.id;

          return (
            <article
              key={plan.id}
              className={`subscription-card ${
                plan.popular ? "popular" : ""
              }`}
            >
              {plan.popular && (
                <div className="popular-badge">MOST POPULAR</div>
              )}

              <div className="subscription-card-header">
                <h2>{plan.name}</h2>
                <p>{plan.description}</p>
              </div>

              <div className="subscription-price">
                <span className="currency">₹</span>
                <strong>{price.toLocaleString("en-IN")}</strong>
                <span className="price-period">
                  {selectedBilling.suffix}
                </span>
              </div>

              {monthlyEquivalent && (
                <div className="monthly-equivalent">
                  ≈ ₹{monthlyEquivalent.toLocaleString("en-IN")}/month
                </div>
              )}

              {!trialAlreadyUsed && (
                <div className="trial-message">
                  🎁 1-day free trial included
                </div>
              )}

              <button
                type="button"
                className="start-trial-button"
                disabled={
                  subscriptionLoading ||
                  loadingPlan !== null ||
                  paidSubscriptionActive
                }
                onClick={() => {
                  if (trialAlreadyUsed) {
                    handleBuyPlan(plan);
                  } else {
                    handleStartTrial(plan);
                  }
                }}
              >
                {subscriptionLoading
                  ? "Checking Subscription..."
                  : isLoading
                    ? trialAlreadyUsed
                      ? "Processing Payment..."
                      : "Starting Trial..."
                    : paidSubscriptionActive
                      ? "Plan Active ✓"
                      : trialAlreadyUsed
                        ? "Buy Plan →"
                        : "Start Free Trial →"}
              </button>

              <div className="features-divider" />

              <h3>What's included</h3>

              <ul className="subscription-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span className="feature-check">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className="subscription-footer">
        <div>
          <strong>Start with DineFlow.</strong>
          <p>
            Experience digital ordering, streamline restaurant
            operations, and choose the right plan for your business.
          </p>
        </div>
      </section>

      {showWelcome && (
        <div className="trial-success-overlay">
          <div className="success-particle particle-one">✦</div>
          <div className="success-particle particle-two">✦</div>
          <div className="success-particle particle-three">✦</div>
          <div className="success-particle particle-four">✦</div>
          <div className="success-particle particle-five">✦</div>

          <div className="trial-success-card">
            <div className="success-check-wrapper">
              <div className="success-check-circle">
                <span>✓</span>
              </div>
            </div>

            <div className="trial-success-content">
              <div className="success-small-title">
                🎉 YOU'RE ALL SET
              </div>

              <h2>Welcome to DineFlow!</h2>

              <p>
                Your restaurant is now ready to start its journey
                with DineFlow.
              </p>

              {startedPlan && (
                <div className="trial-details">
                  <div>
                    <span>Plan</span>
                    <strong>{startedPlan.name}</strong>
                  </div>

                  <div>
                    <span>Billing</span>
                    <strong>{startedPlan.billingPeriod}</strong>
                  </div>

                  <div>
                    <span>Trial</span>
                    <strong>3 Days Free</strong>
                  </div>
                </div>
              )}

              <div className="trial-success-message">
                🚀 Let's get your restaurant ready for success.
              </div>

              <button
                type="button"
                className="trial-success-button"
                onClick={handleContinue}
              >
                Enter DineFlow <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionPlans;