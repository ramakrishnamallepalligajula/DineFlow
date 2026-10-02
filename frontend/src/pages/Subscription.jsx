import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Subscription.css";

const API_URL = import.meta.env.VITE_API_URL;

function Subscription() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] =
    useState("");

  const [error, setError] = useState("");

  const plans = [
    {
      billingCycle: "monthly",
      name: "Monthly",
      price: 999,
      period: "month",
      description:
        "Full access to DineFlow with flexible monthly billing.",
      features: [
        "QR Code Ordering",
        "Digital Menu",
        "Kitchen Dashboard",
        "Live Order Updates",
        "Table Management",
        "Food Management",
        "Admin Dashboard",
        "Reports & Analytics",
        "Staff Management",
      ],
    },

    {
      billingCycle: "yearly",
      name: "Yearly",
      price: 7999,
      period: "year",
      description:
        "Full access to DineFlow with the best annual value.",
      savings: "Save ₹3,989 per year",
      popular: true,
      features: [
        "QR Code Ordering",
        "Digital Menu",
        "Kitchen Dashboard",
        "Live Order Updates",
        "Table Management",
        "Food Management",
        "Admin Dashboard",
        "Reports & Analytics",
        "Staff Management",
      ],
    },
  ];

  /*
    Load Razorpay Checkout script
  */

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script =
        document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => {
        resolve(true);
      };

      script.onerror = () => {
        resolve(false);
      };

      document.body.appendChild(script);
    });
  };

  /*
    Select subscription,
    create Razorpay order,
    open Razorpay Checkout,
    verify payment.
  */

  const handleSelectPlan = async (
    billingCycle
  ) => {
    try {
      setError("");
      setLoading(true);
      setSelectedPlan(billingCycle);

      const token =
        localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication required"
        );
      }

      /*
        STEP 1
        Create pending subscription
      */

      const subscriptionResponse =
        await fetch(
          `${API_URL}/api/subscriptions/select-plan`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              plan: "dineflow",
              billingCycle,
            }),
          }
        );

      const subscriptionData =
        await subscriptionResponse.json();

      if (!subscriptionResponse.ok) {
        throw new Error(
          subscriptionData.message ||
            "Failed to select subscription"
        );
      }

      console.log(
        "Subscription selected:",
        subscriptionData
      );

      /*
        STEP 2
        Create Razorpay order
      */

      const orderResponse =
        await fetch(
          `${API_URL}/api/payments/create-order`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const orderData =
        await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(
          orderData.message ||
            "Failed to create payment order"
        );
      }

      console.log(
        "Razorpay order created:",
        orderData
      );

      /*
        STEP 3
        Load Razorpay Checkout
      */

      const razorpayLoaded =
        await loadRazorpay();

      if (!razorpayLoaded) {
        throw new Error(
          "Razorpay Checkout failed to load"
        );
      }

      /*
        STEP 4
        Razorpay Checkout configuration
      */

      const options = {
        key: orderData.order.key,

        amount:
          orderData.order.amount,

        currency:
          orderData.order.currency,

        name: "DineFlow",

        description:
          billingCycle === "monthly"
            ? "DineFlow Monthly Subscription"
            : "DineFlow Yearly Subscription",

        order_id:
          orderData.order.id,

        handler: async function (
          response
        ) {
          try {
            console.log(
              "Razorpay payment response:",
              response
            );

            /*
              STEP 5
              Verify payment on backend
            */

            const verifyResponse =
              await fetch(
                `${API_URL}/api/payments/verify`,
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",

                    Authorization:
                      `Bearer ${token}`,
                  },

                  body: JSON.stringify({
                    razorpay_payment_id:
                      response.razorpay_payment_id,

                    razorpay_signature:
                      response.razorpay_signature,
                  }),
                }
              );

            const verifyData =
              await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.message ||
                  "Payment verification failed"
              );
            }

            console.log(
              "Payment verified:",
              verifyData
            );

            /*
              Payment is verified.
              Subscription is now active.
            */

            navigate("/admin");
          } catch (error) {
            console.error(
              "Payment verification error:",
              error
            );

            setError(
              error.message ||
                "Payment verification failed"
            );

            setLoading(false);
            setSelectedPlan("");
          }
        },

        modal: {
          ondismiss: function () {
            console.log(
              "Razorpay checkout closed"
            );

            setLoading(false);
            setSelectedPlan("");
          },
        },

        theme: {
          color: "#171717",
        },
      };

      /*
        STEP 6
        Open Razorpay Checkout
      */

      const razorpay =
        new window.Razorpay(options);

      razorpay.on(
        "payment.failed",
        function (response) {
          console.error(
            "Payment failed:",
            response
          );

          setError(
            response.error?.description ||
              "Payment failed"
          );

          setLoading(false);
          setSelectedPlan("");
        }
      );

      razorpay.open();
    } catch (error) {
      console.error(
        "Subscription error:",
        error
      );

      setError(
        error.message ||
          "Something went wrong"
      );

      setLoading(false);
      setSelectedPlan("");
    }
  };

  return (
    <div className="subscription-page">

      <div className="subscription-header">

        <div className="brand">
          DineFlow
        </div>

        <h1>
          Choose your DineFlow plan
        </h1>

        <p>
          Simple pricing. Everything you need
          to run your restaurant digitally.
        </p>

      </div>

      {error && (
        <div className="subscription-error">
          {error}
        </div>
      )}

      <div className="plans-grid">

        {plans.map((plan) => (
          <div
            key={plan.billingCycle}
            className={`plan-card ${
              plan.popular
                ? "popular"
                : ""
            }`}
          >

            {plan.popular && (
              <div className="popular-badge">
                Best Value
              </div>
            )}

            <h2>
              {plan.name}
            </h2>

            <p className="plan-description">
              {plan.description}
            </p>

            <div className="price">

              <span className="currency">
                ₹
              </span>

              <span className="amount">
                {plan.price.toLocaleString(
                  "en-IN"
                )}
              </span>

              <span className="period">
                /{plan.period}
              </span>

            </div>

            {plan.savings && (
              <div className="monthly-equivalent">
                {plan.savings}
              </div>
            )}

            <div className="plan-divider" />

            <ul className="feature-list">

              {plan.features.map(
                (feature) => (
                  <li key={feature}>
                    <span>✓</span>
                    {feature}
                  </li>
                )
              )}

            </ul>

            <button
              className="plan-button"
              disabled={loading}
              onClick={() =>
                handleSelectPlan(
                  plan.billingCycle
                )
              }
            >
              {loading &&
              selectedPlan ===
                plan.billingCycle
                ? "Processing..."
                : `Choose ${plan.name}`}
            </button>

          </div>
        ))}

      </div>

      <div className="subscription-footer">
        Cancel or change your subscription
        according to your billing cycle.
      </div>

    </div>
  );
}

export default Subscription;