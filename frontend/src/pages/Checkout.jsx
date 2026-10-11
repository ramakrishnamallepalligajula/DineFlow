
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "../context/useCart";
import { useNavigate, useParams } from "react-router-dom";
import "./Checkout.css";

function Checkout() {
  const { cart, totalItems, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const { tableId } = useParams();

  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [loadingTable, setLoadingTable] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("CASH");
  const [customerPhone, setCustomerPhone] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(false);

  const subtotal = Number(totalPrice || 0);
  const cgst = Number((subtotal * 0.025).toFixed(2));
  const sgst = Number((subtotal * 0.025).toFixed(2));
  const gst = Number((cgst + sgst).toFixed(2));
  const grandTotal = Number((subtotal + gst).toFixed(2));

  const formatRupees = (amount) =>
    Number(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    let cancelled = false;

    const loadTable = async () => {
      try {
        setLoadingTable(true);

        const API_URL = import.meta.env.VITE_API_URL;

        if (!API_URL) {
          throw new Error("VITE_API_URL is not configured.");
        }

        if (!tableId) {
          throw new Error("Table ID is missing. Please scan the table QR code again.");
        }

        const response = await fetch(
          `${API_URL}/api/tables/public/${encodeURIComponent(tableId)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load table.");
        }

        if (!data.table) {
          throw new Error("Table information was not returned.");
        }

        if (!cancelled) {
          setRestaurantId(data.table.restaurantId);
          setRestaurantName(data.table.restaurantName || "Restaurant");
          setTableNumber(
            data.table.tableNumber || tableId.replace("table-", "")
          );
        }
      } catch (error) {
        console.error("Failed to load checkout table:", error);

        if (!cancelled) {
          alert(`Failed to load restaurant: ${error.message}`);
        }
      } finally {
        if (!cancelled) {
          setLoadingTable(false);
        }
      }
    };

    if (tableId) {
      loadTable();
    } else {
      setLoadingTable(false);
    }

    return () => {
      cancelled = true;
    };
  }, [tableId]);

  const placeOrder = async () => {
    if (placingOrder) return;

    if (!cart || cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (!restaurantId) {
      alert("Restaurant information is unavailable. Please try again.");
      return;
    }

    const normalizedPhone = customerPhone.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      alert("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL;

    if (!API_URL) {
      alert("Server configuration error. Please try again later.");
      return;
    }

    const order = {
      customerPhone: normalizedPhone,
      whatsappConsent: Boolean(whatsappConsent),
      paymentMethod: selectedPaymentMethod,
      restaurantId,
      tableId,
      tableNumber,
      items: cart.map((item) => ({
        ...item,
        category: item.category || "Other",
      })),
      totalItems,
      // Informational subtotal only. The backend must calculate the final amount.
      totalPrice: subtotal,
    };

    try {
      setPlacingOrder(true);

      const recoveryStorageKey = `dineflow:recovery:${tableId}`;
      const idempotencyStorageKey = `dineflow:idempotency:${tableId}`;

      let recoveryToken = localStorage.getItem(recoveryStorageKey);

      if (!recoveryToken || !/^[a-f0-9-]{36}$/i.test(recoveryToken)) {
        recoveryToken = crypto.randomUUID();
        localStorage.setItem(recoveryStorageKey, recoveryToken);
      }

      let idempotencyKey = localStorage.getItem(idempotencyStorageKey);

      if (!idempotencyKey || !/^[a-f0-9-]{36}$/i.test(idempotencyKey)) {
        idempotencyKey = crypto.randomUUID();
        localStorage.setItem(idempotencyStorageKey, idempotencyKey);
      }

      const response = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Order-Recovery-Token": recoveryToken,
        },
        body: JSON.stringify({
          ...order,
          idempotencyKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to place order.");
      }

      if (!data.order?._id) {
        throw new Error("The server did not return the order ID.");
      }

      const orderWithRecoveryToken = {
        ...data.order,
        recoveryToken,
        paymentMethod: selectedPaymentMethod,
      };

      localStorage.setItem(
        "currentOrder",
        JSON.stringify(orderWithRecoveryToken)
      );

      localStorage.removeItem(recoveryStorageKey);
      localStorage.removeItem(idempotencyStorageKey);

      clearCart();
      setShowPaymentPopup(false);
      navigate("/order-status");
    } catch (error) {
      console.error("Order failed:", error);
      alert(`Failed to place order: ${error.message}`);
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loadingTable) {
    return (
      <div className="checkout-page">
        <motion.div
          className="checkout-loading"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="checkout-loading-icon"
            animate={{ rotate: [0, -8, 8, 0], y: [0, -5, 0] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            🛒
          </motion.div>
          <h2>Preparing your checkout</h2>
          <p>Loading your table information...</p>
        </motion.div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="checkout-page">
        <motion.div
          className="checkout-empty"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="checkout-empty-icon"
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            🛒
          </motion.div>

          <h1>Your cart is empty</h1>
          <p>Add some delicious food before checking out.</p>

          <motion.button
            type="button"
            className="back-menu-button"
            onClick={() => navigate(`/order/${tableId}`)}
            whileTap={{ scale: 0.96 }}
          >
            ← Back to Menu
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <motion.header
        className="checkout-header"
        initial={{ opacity: 0, y: -25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="checkout-header-icon"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
        >
          🛒
        </motion.div>

        <div>
          <span className="checkout-eyebrow">REVIEW YOUR ORDER</span>
          <h1>Checkout</h1>
          <p className="checkout-restaurant-name">{restaurantName}</p>
        </div>
      </motion.header>

      <motion.section
        className="checkout-table-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45 }}
      >
        <div className="checkout-table-icon">🪑</div>
        <div className="checkout-table-content">
          <span>YOUR TABLE</span>
          <strong>Table {tableNumber}</strong>
          <p>Your order will be served to this table.</p>
        </div>
        <div className="checkout-table-check">✓</div>
      </motion.section>

      <section className="checkout-section">
        <div className="checkout-section-heading">
          <div>
            <span>YOUR ORDER</span>
            <h2>
              {totalItems} {totalItems === 1 ? "Item" : "Items"}
            </h2>
          </div>

          <motion.div
            className="checkout-section-total"
            key={totalPrice}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            ₹{subtotal.toLocaleString("en-IN")}
          </motion.div>
        </div>

        <motion.div
          className="checkout-items"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.07 },
            },
          }}
        >
          <AnimatePresence>
            {cart.map((item, index) => (
              <motion.div
                className="checkout-item"
                key={item.id}
                layout
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0 },
                }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <div className="checkout-item-number">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="checkout-item-icon">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="order-item-image"
                    />
                  ) : (
                    <span>🍽️</span>
                  )}
                </div>

                <div className="checkout-item-info">
                  <h3>{item.name}</h3>
                  <p>
                    ₹{Number(item.price || 0).toLocaleString("en-IN")} ×{" "}
                    {item.quantity}
                  </p>
                </div>

                <motion.strong
                  className="checkout-item-total"
                  key={`${item.id}-${item.quantity}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  ₹
                  {Number(
                    Number(item.price || 0) * Number(item.quantity || 0)
                  ).toLocaleString("en-IN")}
                </motion.strong>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      <motion.section
        className="checkout-summary"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45 }}
      >
        <div className="summary-row">
          <span>Items</span>
          <strong>{totalItems}</strong>
        </div>

        <div className="summary-row">
          <span>Subtotal</span>
          <strong>₹{formatRupees(subtotal)}</strong>
        </div>

        <div className="summary-row">
          <span>CGST (2.5%)</span>
          <strong>₹{formatRupees(cgst)}</strong>
        </div>

        <div className="summary-row">
          <span>SGST (2.5%)</span>
          <strong>₹{formatRupees(sgst)}</strong>
        </div>

        <div className="summary-row">
          <span>Total GST (5%)</span>
          <strong>₹{formatRupees(gst)}</strong>
        </div>

        <div className="summary-divider" />

        <div className="summary-total">
          <div>
            <span>TOTAL PAYABLE</span>
            <small>Including 5% GST</small>
          </div>

          <motion.strong
            key={grandTotal}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            ₹{formatRupees(grandTotal)}
          </motion.strong>
        </div>
      </motion.section>

      <motion.section
        className="checkout-customer-card"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <div className="checkout-customer-heading">
          <div className="checkout-customer-icon" aria-hidden="true">
            📱
          </div>
          <div>
            <span className="checkout-customer-eyebrow">BILL DETAILS</span>
            <h2>Where should we send your bill?</h2>
            <p>
              Enter your mobile number to keep your bill linked to this order.
            </p>
          </div>
        </div>

        <label className="checkout-phone-label" htmlFor="customer-phone">
          Mobile number <span aria-hidden="true">*</span>
        </label>

        <div className="checkout-phone-field">
          <span className="checkout-phone-prefix">+91</span>
          <input
            id="customer-phone"
            name="customerPhone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10-digit mobile number"
            maxLength={10}
            value={customerPhone}
            onChange={(event) =>
              setCustomerPhone(
                event.target.value.replace(/\D/g, "").slice(0, 10)
              )
            }
            required
            aria-describedby="checkout-phone-help"
          />
        </div>

        <p id="checkout-phone-help" className="checkout-phone-help">
          No OTP required. We use this number for your order bill.
        </p>

        <label className="checkout-whatsapp-consent">
          <input
            type="checkbox"
            checked={whatsappConsent}
            onChange={(event) => setWhatsappConsent(event.target.checked)}
          />
          <span>
            I agree to receive my bill and order-related updates from{" "}
            <strong>{restaurantName}</strong> on WhatsApp at this number.
            <small>
              This is optional. You can place your order without WhatsApp
              messages.
            </small>
          </span>
        </label>
      </motion.section>

      <motion.div
        className="checkout-trust"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <span>✦</span>
        <p>Review your order carefully before placing it.</p>
      </motion.div>

      <motion.button
        type="button"
        className="place-order-button"
        onClick={() => setShowPaymentPopup(true)}
        disabled={placingOrder || cart.length === 0}
        whileHover={!placingOrder ? { y: -2, scale: 1.01 } : undefined}
        whileTap={!placingOrder ? { scale: 0.97 } : undefined}
      >
        <AnimatePresence mode="wait" initial={false}>
          {placingOrder ? (
            <motion.span
              key="placing"
              className="place-order-content"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              <span className="order-spinner">⟳</span>
              Placing Order...
            </motion.span>
          ) : (
            <motion.span
              key="place"
              className="place-order-content"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              <span>✓</span>
              Place Order
              <span>→</span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <button
        type="button"
        className="back-to-menu"
        onClick={() => navigate(`/order/${tableId}`)}
      >
        ← Continue browsing menu
      </button>

      <AnimatePresence>
        {showPaymentPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(event) => {
              if (event.target === event.currentTarget && !placingOrder) {
                setShowPaymentPopup(false);
              }
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="payment-popup-title"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: 24,
                width: "100%",
                maxWidth: 400,
                boxSizing: "border-box",
                color: "#4b2918",
              }}
            >
              <h2 id="payment-popup-title" style={{ marginTop: 0 }}>
                Choose Payment Method
              </h2>

              <p>
                Total payable: ₹{formatRupees(grandTotal)}
              </p>

              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("CASH")}
                disabled={placingOrder}
                aria-pressed={selectedPaymentMethod === "CASH"}
                style={{
                  width: "100%",
                  padding: 16,
                  marginBottom: 12,
                  borderRadius: 12,
                  border:
                    selectedPaymentMethod === "CASH"
                      ? "2px solid #218838"
                      : "1px solid #ddd",
                  background:
                    selectedPaymentMethod === "CASH" ? "#e8f8ed" : "#fff",
                  color: "#4b2918",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                💵 Cash — Pay Staff
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("ONLINE")}
                disabled={placingOrder}
                aria-pressed={selectedPaymentMethod === "ONLINE"}
                style={{
                  width: "100%",
                  padding: 16,
                  marginBottom: 20,
                  borderRadius: 12,
                  border:
                    selectedPaymentMethod === "ONLINE"
                      ? "2px solid #218838"
                      : "1px solid #ddd",
                  background:
                    selectedPaymentMethod === "ONLINE" ? "#e8f8ed" : "#fff",
                  color: "#4b2918",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                💳 Pay Online
              </button>

              <button
                type="button"
                onClick={placeOrder}
                disabled={placingOrder}
                style={{
                  width: "100%",
                  padding: 16,
                  border: "none",
                  borderRadius: 12,
                  background: "#4b2918",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: placingOrder ? "not-allowed" : "pointer",
                  opacity: placingOrder ? 0.7 : 1,
                }}
              >
                {placingOrder ? "Processing..." : "Confirm & Continue"}
              </button>

              <button
                type="button"
                onClick={() => setShowPaymentPopup(false)}
                disabled={placingOrder}
                style={{
                  width: "100%",
                  padding: 12,
                  marginTop: 8,
                  border: "none",
                  background: "transparent",
                  color: "#806653",
                  cursor: placingOrder ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Checkout;
