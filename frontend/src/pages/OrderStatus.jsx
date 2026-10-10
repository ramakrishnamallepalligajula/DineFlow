
import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import socket from "../socket";

const API_URL = (() => {
  const configuredApiUrl = import.meta.env.VITE_API_URL || "";

  if (import.meta.env.DEV && configuredApiUrl) {
    const apiHost = new URL(
      configuredApiUrl,
      window.location.origin
    ).hostname;

    const loopbackHosts = ["localhost", "127.0.0.1", "[::1]"];

    if (loopbackHosts.includes(apiHost)) {
      return "";
    }
  }

  return configuredApiUrl;
})();

function OrderStatus() {
  const [order, setOrder] = useState(null);
  const [session, setSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [bill, setBill] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [requestingBill, setRequestingBill] = useState(false);
  const [requestingCloseTable, setRequestingCloseTable] = useState(false);

  const [payingOnline, setPayingOnline] = useState(false);
  const navigate = useNavigate();
  const [payingCash, setPayingCash] = useState(false);

  const [selectingPayment, setSelectingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");

  // =========================
  // LOAD ORDER + SESSION
  // =========================

  useEffect(() => {
    let cancelled = false;

    const loadOrderAndSession = async () => {
      try {
        setLoading(true);
        setError("");

        const savedOrder = localStorage.getItem("currentOrder");
        const savedSession = localStorage.getItem("tableSession");

        if (!savedOrder) {
          if (!cancelled) {
            setError("No active order found.");
            setLoading(false);
          }
          return;
        }

        const localOrder = JSON.parse(savedOrder);

        if (!localOrder._id) {
          if (!cancelled) {
            setError("MongoDB order ID is missing.");
            setLoading(false);
          }
          return;
        }

        const recoveryToken =
          localOrder.recoveryToken ||
          localStorage.getItem(
            `dineflow:recovery:${localOrder.tableId}`
          );

        if (!recoveryToken) {
          throw new Error(
            "Order recovery token is missing. Please reopen your order from this device."
          );
        }

        // FETCH CURRENT ORDER
        const orderResponse = await fetch(
          `${API_URL}/api/orders/recover/${encodeURIComponent(
            localOrder.tableId
          )}`,
          {
            headers: {
              "X-Order-Recovery-Token": recoveryToken,
            },
          }
        );

        const orderData = await orderResponse.json();

        if (!orderResponse.ok) {
          throw new Error(
            orderData.message || "Failed to fetch order"
          );
        }

        if (cancelled) return;

        const currentOrder = orderData.order;

        setOrder(currentOrder);

        localStorage.setItem(
          "currentOrder",
          JSON.stringify({
            ...currentOrder,
            recoveryToken,
          })
        );

        // GET SESSION ID
        const sessionId =
          currentOrder.sessionId ||
          (savedSession
            ? JSON.parse(savedSession)?.sessionId
            : null);

        if (!sessionId) {
          setOrders([currentOrder]);
          setLoading(false);
          return;
        }

        // FETCH ENTIRE SESSION
        const sessionResponse = await fetch(
          `${API_URL}/api/orders/session/${encodeURIComponent(
            sessionId
          )}`,
          {
            headers: {
              "X-Order-Recovery-Token": recoveryToken,
            },
          }
        );

        const sessionData = await sessionResponse.json();

        if (!sessionResponse.ok) {
          throw new Error(
            sessionData.message || "Failed to fetch table session"
          );
        }

        if (cancelled) return;

        setSession(sessionData.session);
        setOrders(sessionData.orders || []);

        // SAVE SESSION
        const savedSessionData = {
          sessionId: sessionData.session.sessionId,
          orderId: sessionData.session.orderId,
          tableId: sessionData.session.tableId,
          tableNumber: sessionData.session.tableNumber,
          orderCount: sessionData.session.orderCount,
          status: sessionData.session.status,
          closeTableRequest: sessionData.session.closeTableRequest,
        };

        localStorage.setItem(
          "tableSession",
          JSON.stringify(savedSessionData)
        );

        setLoading(false);
      } catch (error) {
        console.error("❌ Failed to load order/session:", error);

        if (!cancelled) {
          setError(error.message || "Failed to load order");
          setLoading(false);
        }
      }
    };

    loadOrderAndSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================
  // REAL-TIME SOCKET UPDATES
  // =========================

  useEffect(() => {
    if (!order?.restaurantId) return;

    const restaurantId = String(order.restaurantId);

    socket.emit("join-restaurant", restaurantId);
  }, [order?.restaurantId]);

  // =========================
  // PAY CASH
  // =========================

  const handlePayCash = async () => {
    console.log("💵 PAY CASH CLICKED");
    console.log("Current bill:", bill);

    if (payingCash) return;

    if (!bill?._id) {
      alert("Bill ID is missing. Please request the bill again.");
      console.error("❌ Bill ID missing:", bill);
      return;
    }

    if (bill.paymentStatus === "PAID") {
      alert("This bill is already paid.");
      return;
    }

    try {
      setPayingCash(true);

      console.log("💵 Sending cash payment:", bill._id);

      const response = await fetch(
        `${API_URL}/api/bill-payments/cash`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            billId: bill._id,
          }),
        }
      );

      const data = await response.json();

      console.log("💵 Cash payment response:", data);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Cash payment failed.");
      }

      setBill(data.bill);

      alert(
        "💵 Payment successful!\n\n🧾 Receipt is being printed."
      );
    } catch (error) {
      console.error("❌ Cash payment error:", error);

      alert(
        error.message || "Unable to process cash payment."
      );
    } finally {
      setPayingCash(false);
    }
  };

  // =========================
  // RAZORPAY PAYMENT
  // =========================

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (
        document.querySelector(
          'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
        )
      ) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  const handlePayOnline = async () => {
    console.log("💳 PAY ONLINE CLICKED");
    console.log("Current bill:", bill);

    if (payingOnline) return;

    if (!bill?._id) {
      alert("Bill ID is missing. Please request the bill again.");
      console.error("❌ Bill ID missing:", bill);
      return;
    }

    if (bill.paymentStatus === "PAID") {
      alert("This bill is already paid.");
      return;
    }

    try {
      setPayingOnline(true);

      const razorpayLoaded = await loadRazorpayScript();

      if (!razorpayLoaded) {
        throw new Error(
          "Unable to load Razorpay. Please check your internet connection."
        );
      }

      const response = await fetch(
        `${API_URL}/api/bill-payments/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            billId: bill._id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create payment order."
        );
      }

      console.log("💳 Razorpay order:", data);

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency || "INR",
        name: bill.restaurantName || "DineFlow Restaurant",
        description: `Bill #${bill.billNumber}`,
        order_id: data.orderId,

        handler: async function (paymentResponse) {
          try {
            console.log(
              "💳 Razorpay payment response:",
              paymentResponse
            );

            const verifyResponse = await fetch(
              `${API_URL}/api/bill-payments/verify`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  billId: bill._id,
                  razorpay_order_id:
                    paymentResponse.razorpay_order_id,
                  razorpay_payment_id:
                    paymentResponse.razorpay_payment_id,
                  razorpay_signature:
                    paymentResponse.razorpay_signature,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.message || "Payment verification failed."
              );
            }

            console.log("✅ Payment verified:", verifyData);

            setBill(verifyData.bill);

            setSession((currentSession) =>
              currentSession
                ? {
                    ...currentSession,
                    status: "closed",
                  }
                : currentSession
            );

            localStorage.setItem(
              "dineflowLastPayment",
              JSON.stringify({
                billId: bill._id,
                paymentId:
                  paymentResponse.razorpay_payment_id,
                orderId:
                  paymentResponse.razorpay_order_id,
                status: "PAID",
              })
            );

            alert("Payment successful! 🎉");
          } catch (error) {
            console.error(
              "❌ Payment verification failed:",
              error
            );

            alert(
              error.message || "Payment verification failed."
            );
          } finally {
            setPayingOnline(false);
          }
        },

        modal: {
          ondismiss: () => {
            console.log("💳 Razorpay checkout closed.");
            setPayingOnline(false);
          },
        },

        prefill: {
          name: "",
          email: "",
          contact: "",
        },

        theme: {
          color: "#4b2918",
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", function (response) {
        console.error(
          "❌ Razorpay payment failed:",
          response.error
        );

        alert(
          response.error?.description ||
            "Payment failed. Please try again."
        );

        setPayingOnline(false);
      });

      razorpay.open();
    } catch (error) {
      console.error("❌ Online payment failed:", error);

      alert(
        error.message || "Unable to start online payment."
      );

      setPayingOnline(false);
    }
  };

  // Select CASH or ONLINE for this order using its recovery token.
  const handleSelectPaymentMethod = async (paymentMethod) => {
    if (selectingPayment) return;

    let currentOrder;

    try {
      currentOrder = JSON.parse(
        localStorage.getItem("currentOrder") || "null"
      );
    } catch {
      setPaymentError(
        "Unable to read your order. Please reopen your order."
      );
      return;
    }

    if (!currentOrder?._id || !currentOrder?.tableId) {
      setPaymentError(
        "Order information is missing. Please reopen your order."
      );
      return;
    }

    const recoveryToken =
      currentOrder.recoveryToken ||
      localStorage.getItem(
        `dineflow:recovery:${currentOrder.tableId}`
      );

    if (!recoveryToken) {
      setPaymentError(
        "Order recovery token is missing. Please reopen your order."
      );
      return;
    }

    if (currentOrder.paymentMethod) {
      setPaymentError(
        "A payment method has already been selected for this order."
      );
      return;
    }

    setSelectingPayment(true);
    setPaymentError("");
    setPaymentMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/orders/${currentOrder._id}/payment-method`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Order-Recovery-Token": recoveryToken,
          },
          body: JSON.stringify({ paymentMethod }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success || !data.order) {
        throw new Error(
          data.message || "Unable to select payment method."
        );
      }

      const updatedOrder = {
        ...currentOrder,
        ...data.order,
        recoveryToken,
      };

      localStorage.setItem(
        "currentOrder",
        JSON.stringify(updatedOrder)
      );

      setOrder(updatedOrder);

      setOrders((previous) =>
        previous.map((item) =>
          String(item._id) === String(updatedOrder._id)
            ? { ...item, ...updatedOrder }
            : item
        )
      );

      setPaymentMessage(
        paymentMethod === "CASH"
          ? "Cash selected. Please pay the restaurant staff and wait for staff confirmation."
          : "Online payment selected. Request the final bill to continue through the existing Razorpay checkout."
      );
    } catch (selectionError) {
      setPaymentError(
        selectionError.message || "Unable to select payment method."
      );
    } finally {
      setSelectingPayment(false);
    }
  };

  // =========================
  // ORDER MORE FOOD
  // =========================

  const handleOrderMore = () => {
    if (!order?.tableId) return;

    if (
      session?.status === "bill_requested" ||
      session?.status === "closed" ||
      session?.closeTableRequest?.status === "pending" ||
      session?.closeTableRequest?.status === "approved"
    ) {
      return;
    }

    navigate(`/order/${order.tableId}`);
  };

  // =========================
  // REQUEST TABLE CLOSURE
  // =========================

  const handleRequestCloseTable = async () => {
    if (
      requestingCloseTable ||
      !order?.sessionId ||
      !order?.tableId
    ) {
      return;
    }

    const requestStatus = session?.closeTableRequest?.status;

    if (
      session?.status === "closed" ||
      requestStatus === "pending" ||
      requestStatus === "approved"
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Request to close this table? It will remain occupied until staff approves the request."
    );

    if (!confirmed) return;

    const recoveryToken =
      localStorage.getItem(
        `dineflow:recovery:${order.tableId}`
      ) || order.recoveryToken;

    if (!recoveryToken) {
      alert(
        "Order recovery token is missing. Please reopen your order."
      );
      return;
    }

    try {
      setRequestingCloseTable(true);

      const response = await fetch(
        `${API_URL}/api/orders/session/${encodeURIComponent(
          order.sessionId
        )}/request-close`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Order-Recovery-Token": recoveryToken,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to request table closure."
        );
      }

      const updatedSession = data.session || {
        ...session,
        closeTableRequest: {
          ...(session?.closeTableRequest || {}),
          status: "pending",
          requestedAt: new Date().toISOString(),
        },
      };

      setSession((current) => ({
        ...(current || {}),
        ...updatedSession,
      }));

      let savedSessionData = {};

      try {
        savedSessionData = JSON.parse(
          localStorage.getItem("tableSession") || "{}"
        );
      } catch {
        savedSessionData = {};
      }

      localStorage.setItem(
        "tableSession",
        JSON.stringify({
          ...savedSessionData,
          ...updatedSession,
        })
      );

      alert(
        "Table closure requested. Please wait for staff approval."
      );
    } catch (closeError) {
      console.error(
        "Table closure request failed:",
        closeError
      );

      alert(
        closeError.message ||
          "Unable to request table closure."
      );
    } finally {
      setRequestingCloseTable(false);
    }
  };

  // =========================
  // REQUEST BILL
  // =========================

  const handleRequestBill = async () => {
    if (requestingBill || !order?.sessionId) return;

    if (
      session?.status === "bill_requested" ||
      session?.status === "closed"
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Request the final bill for this table?"
    );

    if (!confirmed) return;

    try {
      setRequestingBill(true);

      const response = await fetch(
        `${API_URL}/api/orders/session/${order.sessionId}/bill`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Order-Recovery-Token":
              localStorage.getItem(
                `dineflow:recovery:${order.tableId}`
              ) || order.recoveryToken,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to request bill"
        );
      }

      console.log("🧾 Final bill:", data.bill);

      setBill(data.bill);

      setSession((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              status: "bill_requested",
            }
          : currentSession
      );

      localStorage.setItem(
        "tableSession",
        JSON.stringify({
          sessionId: data.bill.sessionId,
          orderId: data.bill.orderId,
          tableId: data.bill.tableId,
          tableNumber: data.bill.tableNumber,
          orderCount: data.bill.orderCount,
          status: "bill_requested",
        })
      );
    } catch (error) {
      console.error("❌ Bill request failed:", error);

      alert(error.message || "Failed to request bill.");
    } finally {
      setRequestingBill(false);
    }
  };

  // =========================
  // SESSION TOTALS
  // =========================

  const sessionTotals = useMemo(() => {
    return orders.reduce(
      (totals, currentOrder) => {
        totals.totalItems += currentOrder.totalItems || 0;
        totals.totalPrice += currentOrder.totalPrice || 0;
        return totals;
      },
      {
        totalItems: 0,
        totalPrice: 0,
      }
    );
  }, [orders]);

  // =========================
  // STATUS STYLE
  // =========================

  const getStatusStyle = (status) => {
    switch (status) {
      case "Order Received":
        return {
          background: "#fff1e6",
          color: "#d96525",
        };

      case "Accepted":
        return {
          background: "#fff7d6",
          color: "#9a7300",
        };

      default:
        return {
          background: "#f3f3f3",
          color: "#555",
        };
    }
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fffaf2",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h2>Loading order... 🍽️</h2>
      </div>
    );
  }

  // =========================
  // ERROR
  // =========================

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fffaf2",
          fontFamily: "Arial, sans-serif",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <h2>Something went wrong</h2>
        <p>{error}</p>
      </div>
    );
  }

  // =========================
  // NO ORDER
  // =========================

  if (!order) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fffaf2",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h2>No active order</h2>
      </div>
    );
  }

  const isBillRequested =
    session?.status === "bill_requested" ||
    session?.status === "closed" ||
    Boolean(bill);

  // =========================
  // DISPLAY ORDERS
  // =========================

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        padding: "50px 20px 70px",
        boxSizing: "border-box",
        background: "linear-gradient(135deg, #fffaf2, #f4e8d9)",
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          width: "100%",
          maxWidth: "650px",
          margin: "0 auto 30px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: "0 0 12px",
            fontFamily: "Georgia, serif",
            fontSize: "42px",
            color: "#4b2918",
            lineHeight: "1.2",
          }}
        >
          {isBillRequested ? "Final Bill 🧾" : "Order Status 🍽️"}
        </h1>

        <div
          style={{
            marginBottom: "8px",
            color: "#806653",
            fontSize: "15px",
            fontWeight: "600",
          }}
        >
          Order #{order.orderId}
        </div>

        <div
          style={{
            color: "#4b2918",
            fontSize: "18px",
            fontWeight: "700",
          }}
        >
          Table {order.tableNumber}
        </div>

        {!isBillRequested && (
          <div
            style={{
              marginTop: "10px",
              color: "#806653",
              fontSize: "14px",
            }}
          >
            {orders.length}{" "}
            {orders.length === 1 ? "order" : "orders"} in this session
          </div>
        )}
      </div>

      {/* BILL REQUESTED MESSAGE */}
      {isBillRequested && (
        <div
          style={{
            width: "100%",
            maxWidth: "650px",
            margin: "0 auto 22px",
            padding: "16px 18px",
            boxSizing: "border-box",
            borderRadius: "14px",
            background: "#e8f8ed",
            color: "#218838",
            textAlign: "center",
            fontSize: "16px",
            fontWeight: "700",
          }}
        >
          🧾 Bill requested successfully.
          <br />
          Please wait for the staff.
        </div>
      )}

      {/* ORDER RECEIVED / PAYMENT STATUS */}
      {!isBillRequested && order && (
        <div
          style={{
            width: "100%",
            maxWidth: "650px",
            margin: "0 auto 22px",
            padding: "20px",
            boxSizing: "border-box",
            borderRadius: "18px",
            background:
              order.paymentStatus === "PAID"
                ? "#e8f8ed"
                : "#fff4dc",
            border:
              order.paymentStatus === "PAID"
                ? "1px solid #b7e4c7"
                : "1px solid #f1d49a",
            color: "#4b2918",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              fontWeight: "800",
              marginBottom: "10px",
            }}
          >
            {order.paymentStatus === "PAID"
              ? "✅ Order Received!"
              : "🍽️ Order Received!"}
          </div>

          {order.paymentStatus === "PAID" ? (
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                lineHeight: "1.7",
              }}
            >
              Payment confirmed successfully. Your order can now be
              processed by the kitchen.
            </p>
          ) : (
            <>
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: "14px",
                  lineHeight: "1.7",
                }}
              >
                Your order has been submitted successfully. We are
                waiting for payment confirmation before sending it
                to the kitchen.
              </p>

              <div
                style={{
                  display: "inline-block",
                  padding: "8px 14px",
                  borderRadius: "999px",
                  background: "#ffebba",
                  color: "#875b00",
                  fontSize: "13px",
                  fontWeight: "800",
                }}
              >
                ⏳ Payment Pending
              </div>
            </>
          )}

          <div
            style={{
              marginTop: "12px",
              fontSize: "13px",
              color: "#806653",
            }}
          >
            Payment method: {order.paymentMethod || "Not specified"}
          </div>

          {order.paymentStatus === "PENDING" &&
            !order.paymentMethod && (
              <div
                style={{
                  marginTop: "20px",
                  paddingTop: "18px",
                  borderTop: "1px solid #f0dfd1",
                  textAlign: "left",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 8px",
                    color: "#4b2918",
                    fontSize: "18px",
                  }}
                >
                  Choose Payment Method
                </h3>

                <p
                  style={{
                    margin: "0 0 16px",
                    color: "#806653",
                    fontSize: "13px",
                    lineHeight: "1.6",
                  }}
                >
                  Choose how you want to pay. Your order remains
                  pending until payment is confirmed.
                </p>

                {paymentError && (
                  <p role="alert" style={{ color: "#b42318", fontSize: "13px" }}>
                    {paymentError}
                  </p>
                )}

                {paymentMessage && (
                  <p role="status" style={{ color: "#287a43", fontSize: "13px" }}>
                    {paymentMessage}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => handleSelectPaymentMethod("ONLINE")}
                  disabled={selectingPayment}
                  style={{
                    width: "100%",
                    padding: "14px",
                    marginBottom: "10px",
                    border: "none",
                    borderRadius: "12px",
                    background: selectingPayment ? "#b9a99e" : "#4b2918",
                    color: "#fff",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: selectingPayment ? "not-allowed" : "pointer",
                  }}
                >
                  {selectingPayment ? "Saving..." : "💳 Pay Online"}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPaymentMethod("CASH")}
                  disabled={selectingPayment}
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: "2px solid #4b2918",
                    borderRadius: "12px",
                    background: "#fff",
                    color: "#4b2918",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: selectingPayment ? "not-allowed" : "pointer",
                  }}
                >
                  {selectingPayment ? "Saving..." : "💵 Cash at Counter"}
                </button>
              </div>
            )}

          {order.paymentStatus === "PENDING" &&
            order.paymentMethod && (
              <div style={{ marginTop: "14px", textAlign: "left" }}>
                {paymentError && (
                  <p role="alert" style={{ color: "#b42318", fontSize: "13px" }}>
                    {paymentError}
                  </p>
                )}

                {paymentMessage && (
                  <p role="status" style={{ color: "#287a43", fontSize: "13px" }}>
                    {paymentMessage}
                  </p>
                )}

                <p
                  style={{
                    margin: 0,
                    color: "#806653",
                    fontSize: "13px",
                    lineHeight: "1.6",
                  }}
                >
                  {order.paymentMethod === "CASH"
                    ? "Cash selected. Payment stays pending until authorized staff confirms collection."
                    : "Online payment selected. Request the final bill to continue through the existing Razorpay checkout."}
                </p>
              </div>
            )}
        </div>
      )}

      {/* SESSION ORDERS */}
      <div
        style={{
          width: "100%",
          maxWidth: "650px",
          margin: "0 auto",
        }}
      >
        {orders.map((currentOrder, index) => {
          const statusStyle = getStatusStyle(currentOrder.status);

          return (
            <div
              key={currentOrder._id}
              style={{
                width: "100%",
                marginBottom: "20px",
                padding: "24px",
                boxSizing: "border-box",
                background: "#ffffff",
                borderRadius: "22px",
                boxShadow: "0 15px 40px rgba(63, 35, 18, 0.10)",
              }}
            >
              {/* ORDER HEADER */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "15px",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#4b2918",
                      fontSize: "20px",
                      fontWeight: "800",
                    }}
                  >
                    Order #{currentOrder.orderSequence || index + 1}
                  </div>

                  <div
                    style={{
                      marginTop: "4px",
                      color: "#806653",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    {currentOrder.type === "initial"
                      ? "Initial Order"
                      : "Additional Order"}
                  </div>
                </div>

                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "999px",
                    background: statusStyle.background,
                    color: statusStyle.color,
                    fontSize: "13px",
                    fontWeight: "700",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentOrder.paymentStatus !== "PAID"
                    ? "⏳ Order Received — Payment Pending"
                    : currentOrder.status === "NEW" ||
                      currentOrder.status === "Order Received"
                    ? "Order Received"
                    : currentOrder.status === "ACCEPTED" ||
                      currentOrder.status === "Accepted"
                    ? "Order Accepted"
                    : currentOrder.status}
                </div>
              </div>

              {/* ITEMS */}
              <div style={{ width: "100%" }}>
                {currentOrder.items.map((item, itemIndex) => (
                  <div
                    key={item.id || `${item.name}-${itemIndex}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                      columnGap: "20px",
                      width: "100%",
                      minHeight: "52px",
                      padding: "14px 0",
                      boxSizing: "border-box",
                      borderBottom:
                        itemIndex === currentOrder.items.length - 1
                          ? "none"
                          : "1px solid #eadaca",
                    }}
                  >
                    <div
                      style={{
                        margin: 0,
                        padding: 0,
                        color: "#3d2415",
                        fontSize: "15px",
                        lineHeight: "1.5",
                        fontWeight: "500",
                      }}
                    >
                      {item.name} × {item.quantity}
                    </div>

                    <div
                      style={{
                        margin: 0,
                        padding: 0,
                        color: "#4b2918",
                        fontSize: "15px",
                        fontWeight: "700",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ₹{(item.price || 0) * (item.quantity || 0)}
                    </div>
                  </div>
                ))}
              </div>

              {/* ORDER TOTAL */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "15px",
                  paddingTop: "18px",
                  marginTop: "12px",
                  borderTop: "1px solid #eadaca",
                  color: "#4b2918",
                  fontSize: "17px",
                  fontWeight: "800",
                }}
              >
                <span>Order Total</span>
                <span>₹{currentOrder.totalPrice || 0}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SESSION TOTALS */}
      <div
        style={{
          width: "100%",
          maxWidth: "650px",
          margin: "0 auto 22px",
          padding: "22px",
          boxSizing: "border-box",
          borderRadius: "18px",
          background: "#4b2918",
          color: "#ffffff",
          boxShadow: "0 12px 28px rgba(75, 41, 24, 0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "15px",
            marginBottom: "12px",
            fontSize: "15px",
          }}
        >
          <span>Total Items</span>
          <strong>{sessionTotals.totalItems}</strong>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "15px",
            fontSize: "20px",
            fontWeight: "800",
          }}
        >
          <span>Session Total</span>
          <span>₹{sessionTotals.totalPrice}</span>
        </div>
      </div>

      {/* BILL PAYMENT */}
      {isBillRequested && bill && (
        <div
          style={{
            width: "100%",
            maxWidth: "650px",
            margin: "0 auto 22px",
            padding: "24px",
            boxSizing: "border-box",
            borderRadius: "20px",
            background: "#ffffff",
            boxShadow: "0 15px 40px rgba(63, 35, 18, 0.10)",
          }}
        >
          <h2
            style={{
              margin: "0 0 18px",
              color: "#4b2918",
              fontFamily: "Georgia, serif",
            }}
          >
            Bill Summary 🧾
          </h2>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "15px",
              marginBottom: "12px",
              color: "#806653",
            }}
          >
            <span>Bill Number</span>
            <strong>{bill.billNumber || "—"}</strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "15px",
              marginBottom: "18px",
              color: "#4b2918",
              fontSize: "22px",
              fontWeight: "800",
            }}
          >
            <span>Amount Due</span>
            <span>₹{bill.totalAmount ?? bill.totalPrice ?? 0}</span>
          </div>

          {bill.paymentStatus === "PAID" ? (
            <div
              style={{
                padding: "15px",
                borderRadius: "12px",
                background: "#e8f8ed",
                color: "#218838",
                textAlign: "center",
                fontWeight: "800",
              }}
            >
              ✅ Payment Complete
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handlePayCash}
                disabled={payingCash}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  marginBottom: "12px",
                  border: "2px solid #4b2918",
                  borderRadius: "14px",
                  background: "#ffffff",
                  color: "#4b2918",
                  fontSize: "16px",
                  fontWeight: "700",
                  cursor: payingCash ? "not-allowed" : "pointer",
                }}
              >
                {payingCash ? "Processing Cash..." : "💵 Pay Cash"}
              </button>

              <button
                type="button"
                onClick={handlePayOnline}
                disabled={payingOnline}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  border: "none",
                  borderRadius: "14px",
                  background: "#4b2918",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: "700",
                  cursor: payingOnline ? "not-allowed" : "pointer",
                }}
              >
                {payingOnline
                  ? "Opening Payment..."
                  : "💳 Pay Online"}
              </button>
            </>
          )}
        </div>
      )}

      {/* ACTION BUTTONS */}
      {!isBillRequested && (
        <div
          style={{
            width: "100%",
            maxWidth: "650px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* ORDER MORE */}
          <button
            type="button"
            onClick={handleOrderMore}
            disabled={
              session?.status === "bill_requested" ||
              session?.status === "closed" ||
              session?.closeTableRequest?.status === "pending" ||
              session?.closeTableRequest?.status === "approved"
            }
            style={{
              width: "100%",
              padding: "16px 20px",
              border: "none",
              borderRadius: "14px",
              background: "#4b2918",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 8px 20px rgba(75, 41, 24, 0.20)",
            }}
          >
            🍽️ Order More Food
          </button>

          {/* REQUEST TABLE CLOSURE */}
          <button
            type="button"
            onClick={handleRequestCloseTable}
            disabled={
              requestingCloseTable ||
              session?.status === "closed" ||
              session?.closeTableRequest?.status === "pending" ||
              session?.closeTableRequest?.status === "approved"
            }
            style={{
              width: "100%",
              padding: "16px 20px",
              border: "2px solid #4b2918",
              borderRadius: "14px",
              background: "#ffffff",
              color: "#4b2918",
              fontSize: "16px",
              fontWeight: "700",
              cursor: requestingCloseTable ? "wait" : "pointer",
            }}
          >
            {requestingCloseTable
              ? "Sending Request..."
              : session?.closeTableRequest?.status === "pending"
              ? "⏳ Waiting for Staff Approval"
              : session?.closeTableRequest?.status === "approved" ||
                session?.status === "closed"
              ? "✅ Table Closed"
              : session?.closeTableRequest?.status === "rejected"
              ? "🔄 Request Closure Again"
              : "🔒 Request to Close Table"}
          </button>

          {/* REQUEST BILL */}
          <button
            type="button"
            onClick={handleRequestBill}
            disabled={requestingBill}
            style={{
              width: "100%",
              padding: "16px 20px",
              border: "2px solid #4b2918",
              borderRadius: "14px",
              background: requestingBill ? "#f3eee9" : "#ffffff",
              color: "#4b2918",
              fontSize: "16px",
              fontWeight: "700",
              cursor: requestingBill ? "not-allowed" : "pointer",
            }}
          >
            {requestingBill ? "Requesting Bill..." : "🧾 Request Bill"}
          </button>
        </div>
      )}

      {/* BILL COMPLETE MESSAGE */}
      {isBillRequested && (
        <div
          style={{
            width: "100%",
            maxWidth: "650px",
            margin: "0 auto",
            padding: "18px",
            boxSizing: "border-box",
            borderRadius: "14px",
            background: "#e8f8ed",
            color: "#218838",
            textAlign: "center",
            fontWeight: "700",
          }}
        >
          Thank you for dining with us! ❤️
        </div>
      )}
    </div>
  );
}

export default OrderStatus;
