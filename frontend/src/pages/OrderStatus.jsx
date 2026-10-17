
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";

const money = (value) => Number(value || 0).toFixed(2);

function OrderStatus() {
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [session, setSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [bill, setBill] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestingBill, setRequestingBill] = useState(false);
  const [payingCash, setPayingCash] = useState(false);
  const [payingOnline, setPayingOnline] = useState(false);
  const [message, setMessage] = useState("");

  const recoveryTokenFor = (tableId, savedOrder) =>
    savedOrder?.recoveryToken ||
    localStorage.getItem(`dineflow:recovery:${tableId}`);

  const getBill = async (sessionId) => {
    const response = await fetch(
      `${API_URL}/api/bill-payments/session/${encodeURIComponent(
        sessionId
      )}/bill`
    );

    const data = await response.json();

    if (
      response.status === 404 &&
      data.code === "BILL_NOT_CREATED"
    ) {
      return null;
    }

    if (!response.ok) {
      throw new Error(data.message || "Unable to load bill.");
    }

    return data.bill || null;
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const saved = JSON.parse(
          localStorage.getItem("currentOrder") || "null"
        );

        if (!saved?._id || !saved?.tableId) {
          throw new Error(
            "Order details were not found on this device."
          );
        }

        const token = recoveryTokenFor(saved.tableId, saved);

        if (!token) {
          throw new Error(
            "Order recovery token is missing. Reopen your order from the table menu."
          );
        }

        const response = await fetch(
          `${API_URL}/api/orders/recover/${encodeURIComponent(
            saved.tableId
          )}`,
          {
            headers: {
              "X-Order-Recovery-Token": token,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to recover order.");
        }

        if (cancelled) return;

        const recoveredOrder = {
          ...data.order,
          recoveryToken: token,
        };

        setOrder(recoveredOrder);

        localStorage.setItem(
          "currentOrder",
          JSON.stringify(recoveredOrder)
        );

        const sessionResponse = await fetch(
          `${API_URL}/api/orders/session/${encodeURIComponent(
            recoveredOrder.sessionId
          )}`,
          {
            headers: {
              "X-Order-Recovery-Token": token,
            },
          }
        );

        const sessionData = await sessionResponse.json();

        if (!sessionResponse.ok) {
          throw new Error(
            sessionData.message || "Unable to load table session."
          );
        }

        if (cancelled) return;

        setSession(sessionData.session || data.session || null);
        setOrders(sessionData.orders || [recoveredOrder]);

        const loadedBill = await getBill(recoveredOrder.sessionId);

        if (cancelled) return;

        setBill(loadedBill);

        localStorage.setItem(
          "tableSession",
          JSON.stringify(
            sessionData.session || data.session || {}
          )
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Unable to load order.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const isBillRequested =
    Boolean(bill) ||
    session?.status === "bill_requested" ||
    session?.status === "closed";

  const totals = useMemo(
    () =>
      orders.reduce(
        (result, item) => ({
          items: result.items + Number(item.totalItems || 0),
          subtotal: result.subtotal + Number(item.totalPrice || 0),
        }),
        { items: 0, subtotal: 0 }
      ),
    [orders]
  );

  const requestBill = async () => {
    if (requestingBill || !order?.sessionId || !order?.tableId) {
      return;
    }

    const token = recoveryTokenFor(order.tableId, order);

    if (!token) {
      setError("Order recovery token is missing.");
      return;
    }

    try {
      setRequestingBill(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/api/orders/session/${encodeURIComponent(
          order.sessionId
        )}/bill`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Order-Recovery-Token": token,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.bill) {
        throw new Error(data.message || "Unable to request bill.");
      }

      // Update the screen only after the backend confirms the bill.
      setBill(data.bill);

      const updatedSession = {
        ...session,
        sessionId: order.sessionId,
        tableId: order.tableId,
        status: "bill_requested",
        billId: data.bill._id,
      };

      setSession(updatedSession);

      localStorage.setItem(
        "tableSession",
        JSON.stringify(updatedSession)
      );

      setMessage("Bill requested successfully.");
    } catch (requestError) {
      setError(
        requestError.message || "Unable to request bill."
      );
    } finally {
      setRequestingBill(false);
    }
  };

  const payCash = async () => {
    if (payingCash || !bill?._id || !order?.sessionId) return;

    try {
      setPayingCash(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/api/bill-payments/cash`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billId: bill._id,
            sessionId: order.sessionId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to select cash payment.");
      }

      setBill(data.bill || bill);
      setMessage(
        "Cash selected. Please pay the staff. The bill remains unpaid until staff confirms collection."
      );
    } catch (paymentError) {
      setError(paymentError.message || "Cash payment failed.");
    } finally {
      setPayingCash(false);
    }
  };

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const existing = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );

      if (existing) {
        existing.addEventListener("load", () => resolve(true), {
          once: true,
        });
        existing.addEventListener("error", () => resolve(false), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const payOnline = async () => {
    if (payingOnline || !bill?._id || !order?.sessionId) return;

    try {
      setPayingOnline(true);
      setError("");
      setMessage("");

      const loaded = await loadRazorpay();

      if (!loaded) {
        throw new Error("Unable to load Razorpay. Check your connection.");
      }

      const createResponse = await fetch(
        `${API_URL}/api/bill-payments/create-order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billId: bill._id,
            sessionId: order.sessionId,
          }),
        }
      );

      const paymentData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(
          paymentData.message || "Unable to create payment order."
        );
      }

      const razorpay = new window.Razorpay({
        key: paymentData.key,
        amount: paymentData.amount,
        currency: paymentData.currency || "INR",
        name: bill.restaurantName || "DineFlow Restaurant",
        description: `Bill #${bill.billNumber}`,
        order_id: paymentData.orderId,

        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await fetch(
              `${API_URL}/api/bill-payments/verify`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  billId: bill._id,
                  sessionId: order.sessionId,
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

            setBill(verifyData.bill || bill);
            setMessage("Payment verified successfully.");
          } catch (verifyError) {
            setError(
              verifyError.message || "Payment verification failed."
            );
          } finally {
            setPayingOnline(false);
          }
        },

        modal: {
          ondismiss: () => setPayingOnline(false),
        },

        theme: { color: "#4b2918" },
      });

      razorpay.on("payment.failed", (event) => {
        setError(
          event.error?.description || "Online payment failed."
        );
        setPayingOnline(false);
      });

      razorpay.open();
    } catch (paymentError) {
      setError(paymentError.message || "Unable to start payment.");
      setPayingOnline(false);
    }
  };

  const orderAgain = () => {
    if (!order?.tableId || !bill?._id) return;

    // Clear only local pointers. The previous order and bill stay in MongoDB.
    localStorage.removeItem("currentOrder");
    localStorage.removeItem("tableSession");
    localStorage.removeItem(`dineflow:recovery:${order.tableId}`);
    localStorage.removeItem(`dineflow:idempotency:${order.tableId}`);

    navigate(`/order/${encodeURIComponent(order.tableId)}`);
  };

  if (loading) {
    return (
      <main style={styles.page}>
        <h2>Loading your order…</h2>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main style={styles.page}>
        <h2>Unable to load order</h2>
        <p role="alert">{error}</p>
        <button style={styles.secondaryButton} onClick={() => navigate(-1)}>
          Go Back
        </button>
      </main>
    );
  }

  if (!order) {
    return (
      <main style={styles.page}>
        <h2>No order found</h2>
        <p>Open the menu from your table to start an order.</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>
          {isBillRequested ? "Final Bill 🧾" : "Order Confirmation 🍽️"}
        </h1>
        <p style={styles.subtitle}>
          Table {order.tableNumber || order.tableId}
        </p>
        <p style={styles.subtitle}>
          Order #{order.orderId}
        </p>
      </header>

      {error && (
        <div role="alert" style={styles.error}>
          {error}
        </div>
      )}

      {message && (
        <div role="status" style={styles.success}>
          {message}
        </div>
      )}

      {!isBillRequested && (
        <section style={styles.confirmation}>
          <h2 style={{ marginTop: 0 }}>✅ Order received</h2>
          <p>
            Your order has been sent to the restaurant for kitchen
            processing. You can request the bill when you are ready.
          </p>
          <p style={styles.muted}>
            Requesting the bill does not charge you.
          </p>
        </section>
      )}

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>
          {isBillRequested ? "Items on your bill" : "Your order"}
        </h2>

        {orders.map((currentOrder, index) => (
          <div key={currentOrder._id || index} style={styles.orderBlock}>
            <div style={styles.orderHeading}>
              <strong>
                Order #{currentOrder.orderSequence || index + 1}
              </strong>
              <span>{currentOrder.status || "Order Received"}</span>
            </div>

            {(currentOrder.items || []).map((item, itemIndex) => (
              <div
                key={item.id || `${item.name}-${itemIndex}`}
                style={styles.itemRow}
              >
                <span>
                  {item.name} × {item.quantity}
                </span>
                <strong>
                  ₹{money(Number(item.price || 0) * Number(item.quantity || 0))}
                </strong>
              </div>
            ))}

            <div style={styles.subtotalRow}>
              <span>Order subtotal</span>
              <strong>₹{money(currentOrder.totalPrice)}</strong>
            </div>
          </div>
        ))}

        {!isBillRequested && (
          <div style={styles.totalRow}>
            <span>Session subtotal</span>
            <strong>₹{money(totals.subtotal)}</strong>
          </div>
        )}

        {!isBillRequested && (
          <p style={styles.muted}>
            Taxes will be shown on the final bill after you request it.
          </p>
        )}
      </section>

      {isBillRequested && bill && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Bill Summary 🧾</h2>

          <div style={styles.itemRow}>
            <span>Bill number</span>
            <strong>{bill.billNumber || "—"}</strong>
          </div>

          <div style={styles.itemRow}>
            <span>Subtotal</span>
            <strong>₹{money(bill.subtotal)}</strong>
          </div>

          <div style={styles.itemRow}>
            <span>CGST ({Number(bill.taxRate ?? 5) / 2}%)</span>
            <strong>₹{money(bill.cgst)}</strong>
          </div>

          <div style={styles.itemRow}>
            <span>SGST ({Number(bill.taxRate ?? 5) / 2}%)</span>
            <strong>₹{money(bill.sgst)}</strong>
          </div>

          <div style={styles.totalRow}>
            <span>Total including GST</span>
            <strong>₹{money(bill.total)}</strong>
          </div>

          <p style={styles.muted}>
            Payment status: {bill.paymentStatus || "UNPAID"}
          </p>

          {bill.paymentStatus === "PAID" ? (
            <div style={styles.success}>✅ Payment complete</div>
          ) : (
            <>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={payCash}
                disabled={payingCash}
              >
                {payingCash ? "Processing…" : "💵 Pay Cash"}
              </button>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={payOnline}
                disabled={payingOnline}
              >
                {payingOnline ? "Opening Razorpay…" : "💳 Pay Online"}
              </button>

              <p style={styles.muted}>
                Cash payments remain unpaid until staff confirms collection.
                Online payments are marked paid only after backend verification.
              </p>
            </>
          )}
        </section>
      )}

      {!isBillRequested ? (
        <>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => {
              if (order?.tableId) {
                // Preserve the current session and recovery data.
                navigate(`/order/${encodeURIComponent(order.tableId)}`);
              }
            }}
          >
            🍽️ Order Again
          </button>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={requestBill}
            disabled={requestingBill}
          >
            {requestingBill ? "Requesting bill…" : "🧾 Request Bill"}
          </button>
        </>
      ) : (
        <section style={styles.endSession}>
          <strong>Ordering has ended for this session.</strong>
          <p>
            Your bill request was recorded. This does not mean the bill
            has been paid or that staff has officially closed the table.
          </p>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={orderAgain}
            disabled={!bill?._id}
          >
            🍽️ Order Again
          </button>
        </section>
      )}
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    boxSizing: "border-box",
    padding: "24px 16px 48px",
    background: "#fffaf2",
    color: "#4b2918",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    maxWidth: "650px",
    margin: "0 auto 24px",
    textAlign: "center",
  },
  title: {
    margin: "0 0 10px",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(28px, 6vw, 42px)",
  },
  subtitle: {
    margin: "6px 0",
    color: "#806653",
  },
  card: {
    width: "100%",
    maxWidth: "650px",
    boxSizing: "border-box",
    margin: "0 auto 20px",
    padding: "22px",
    borderRadius: "18px",
    background: "#ffffff",
    boxShadow: "0 12px 30px rgba(63, 35, 18, 0.08)",
  },
  confirmation: {
    width: "100%",
    maxWidth: "650px",
    boxSizing: "border-box",
    margin: "0 auto 20px",
    padding: "20px",
    borderRadius: "16px",
    background: "#e8f8ed",
    border: "1px solid #b7e4c7",
    lineHeight: 1.6,
  },
  sectionTitle: {
    margin: "0 0 18px",
    fontFamily: "Georgia, serif",
  },
  orderBlock: {
    paddingBottom: "16px",
    marginBottom: "16px",
    borderBottom: "1px solid #eadaca",
  },
  orderHeading: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "10px",
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    padding: "10px 0",
    borderBottom: "1px solid #f1e7dd",
  },
  subtotalRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginTop: "12px",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginTop: "16px",
    paddingTop: "16px",
    borderTop: "1px solid #eadaca",
    fontSize: "19px",
    fontWeight: 800,
  },
  muted: {
    color: "#806653",
    fontSize: "13px",
    lineHeight: 1.6,
  },
  primaryButton: {
    display: "block",
    width: "100%",
    maxWidth: "650px",
    boxSizing: "border-box",
    margin: "0 auto 12px",
    padding: "16px 20px",
    border: "none",
    borderRadius: "14px",
    background: "#4b2918",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    margin: "12px auto",
    padding: "15px 20px",
    border: "2px solid #4b2918",
    borderRadius: "14px",
    background: "#ffffff",
    color: "#4b2918",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  endSession: {
    maxWidth: "650px",
    boxSizing: "border-box",
    margin: "0 auto",
    padding: "18px",
    borderRadius: "14px",
    background: "#fff4dc",
    color: "#875b00",
    lineHeight: 1.6,
  },
  success: {
    maxWidth: "650px",
    boxSizing: "border-box",
    margin: "0 auto 16px",
    padding: "14px",
    borderRadius: "12px",
    background: "#e8f8ed",
    color: "#218838",
    lineHeight: 1.6,
  },
  error: {
    maxWidth: "650px",
    boxSizing: "border-box",
    margin: "0 auto 16px",
    padding: "14px",
    borderRadius: "12px",
    background: "#fde8e7",
    color: "#b42318",
    lineHeight: 1.6,
  },
};

export default OrderStatus;
