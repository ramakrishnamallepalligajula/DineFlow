
import { useCallback, useEffect, useMemo, useState } from "react";

import { RefreshCw, Wallet, CheckCircle2, Clock3 } from "lucide-react";

import AdminNavigation from "../components/AdminNavigation";
import { apiFetch } from "../services/api";

import "./KitchenDashboard.css";
import "./CashPayments.css";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

function CashPayments() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOrders = useCallback(async () => {
    const response = await apiFetch("/api/orders");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load orders.");
    }

    setOrders(Array.isArray(data.orders) ? data.orders : []);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialLoad = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await apiFetch("/api/orders");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load orders.");
        }

        if (!cancelled) {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load cash payments.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  const cashOrders = useMemo(
    () => orders.filter((order) => order.paymentMethod === "CASH"),
    [orders]
  );

  const pendingOrders = useMemo(
    () =>
      cashOrders.filter(
        (order) => order.paymentStatus === "PENDING"
      ),
    [cashOrders]
  );

  const collectedOrders = useMemo(
    () =>
      cashOrders.filter(
        (order) => order.paymentStatus === "PAID"
      ),
    [cashOrders]
  );

  const visibleOrders =
    activeTab === "pending" ? pendingOrders : collectedOrders;

  const pendingTotal = pendingOrders.reduce(
    (sum, order) => sum + (Number(order.totalPrice) || 0),
    0
  );

  const collectedTotal = collectedOrders.reduce(
    (sum, order) => sum + (Number(order.totalPrice) || 0),
    0
  );

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");
      setNotice("");
      await loadOrders();
    } catch (err) {
      setError(err.message || "Could not refresh payments.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleConfirmCash = async (order) => {
    const confirmed = window.confirm(
      `Confirm that ₹${Number(order.totalPrice || 0).toFixed(2)} ` +
      `has been collected for Table ${order.tableNumber ?? "—"}?`
    );

    if (!confirmed) return;

    try {
      setBusyOrderId(order._id);
      setError("");
      setNotice("");

      const response = await apiFetch(
        `/api/orders/${order._id}/confirm-cash`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Cash confirmation failed.");
      }

      await loadOrders();

      setNotice(
        `Cash payment for Table ${order.tableNumber ?? "—"} confirmed.`
      );
    } catch (err) {
      setError(err.message || "Could not confirm cash payment.");
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="kitchen-page">
      <AdminNavigation />

      <main className="kitchen-main cash-payments-main">
        <header className="cash-payments-header">
          <div>
            <span className="cash-payments-eyebrow">
              STAFF OPERATIONS
            </span>
            <h1>Cash Payments</h1>
            <p>
              Collect cash at the table and confirm the payment
              after receiving the full amount.
            </p>
          </div>

          <button
            className="cash-refresh-button"
            onClick={handleRefresh}
            disabled={refreshing}
            type="button"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "cash-spinning" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        <section className="cash-summary-grid">
          <div className="cash-summary-card">
            <div className="cash-summary-icon pending">
              <Clock3 size={21} />
            </div>
            <span>Awaiting collection</span>
            <strong>{pendingOrders.length}</strong>
            <p>{formatCurrency(pendingTotal)} to collect</p>
          </div>

          <div className="cash-summary-card">
            <div className="cash-summary-icon collected">
              <CheckCircle2 size={21} />
            </div>
            <span>Cash collected</span>
            <strong>{collectedOrders.length}</strong>
            <p>{formatCurrency(collectedTotal)} collected</p>
          </div>
        </section>

        {error && (
          <div className="cash-alert error" role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className="cash-alert success" role="status">
            {notice}
          </div>
        )}

        <section className="cash-orders-section">
          <div className="cash-orders-heading">
            <div>
              <h2>Table Collections</h2>
              <p>Review each order before confirming payment.</p>
            </div>

            <div className="cash-tabs">
              <button
                type="button"
                className={activeTab === "pending" ? "active" : ""}
                onClick={() => setActiveTab("pending")}
              >
                Pending ({pendingOrders.length})
              </button>

              <button
                type="button"
                className={activeTab === "collected" ? "active" : ""}
                onClick={() => setActiveTab("collected")}
              >
                Collected ({collectedOrders.length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="cash-empty-state">
              Loading cash payments...
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="cash-empty-state">
              <Wallet size={32} />
              <h3>
                {activeTab === "pending"
                  ? "No pending cash payments"
                  : "No collected payments yet"}
              </h3>
              <p>
                {activeTab === "pending"
                  ? "New cash orders will appear here when customers place them."
                  : "Payments confirmed by staff will appear here."}
              </p>
            </div>
          ) : (
            <div className="cash-orders-grid">
              {visibleOrders.map((order) => (
                <article className="cash-order-card" key={order._id}>
                  <div className="cash-order-card-top">
                    <div>
                      <span className="cash-order-table-label">
                        TABLE
                      </span>
                      <h3>Table {order.tableNumber ?? "—"}</h3>
                      <p>
                        Order #{order.orderId ?? order._id.slice(-6)}
                      </p>
                    </div>

                    <span
                      className={`cash-payment-badge ${
                        order.paymentStatus === "PAID"
                          ? "paid"
                          : "pending"
                      }`}
                    >
                      {order.paymentStatus === "PAID"
                        ? "Paid"
                        : "Awaiting cash"}
                    </span>
                  </div>

                  <div className="cash-order-items">
                    {Array.isArray(order.items) &&
                      order.items.map((item, index) => (
                        <div
                          className="cash-order-item"
                          key={`${item.id || item.name}-${index}`}
                        >
                          <span>
                            {item.name} <b>× {item.quantity}</b>
                          </span>
                          <span>
                            {formatCurrency(
                              (Number(item.price) || 0) *
                                (Number(item.quantity) || 0)
                            )}
                          </span>
                        </div>
                      ))}
                  </div>

                  <div className="cash-order-total">
                    <span>Total due</span>
                    <strong>{formatCurrency(order.totalPrice)}</strong>
                  </div>

                  <div className="cash-order-time">
                    Placed {formatDate(order.createdAt)}
                  </div>

                  {order.paymentStatus === "PAID" ? (
                    <div className="cash-collected-note">
                      <CheckCircle2 size={17} />
                      Cash collection confirmed
                      {order.cashCollectedAt
                        ? ` · ${formatDate(order.cashCollectedAt)}`
                        : ""}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="cash-confirm-button"
                      disabled={busyOrderId === order._id}
                      onClick={() => handleConfirmCash(order)}
                    >
                      <CheckCircle2 size={18} />
                      {busyOrderId === order._id
                        ? "Confirming..."
                        : "Mark as Paid"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default CashPayments;
