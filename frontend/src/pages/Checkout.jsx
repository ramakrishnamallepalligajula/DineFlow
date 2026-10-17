
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
  const subtotal = Number(totalPrice || 0);

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
          throw new Error(
            "Table ID is missing. Please scan the table QR code again."
          );
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

    const API_URL = import.meta.env.VITE_API_URL;

    if (!API_URL) {
      alert("Server configuration error. Please try again later.");
      return;
    }

    const order = {
      restaurantId,
      tableId,
      tableNumber,
      items: cart.map((item) => ({
        ...item,
        category: item.category || "Other",
      })),
      totalItems,
      // The backend must calculate the authoritative final amount.
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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to place order.");
      }

      if (!data.order?._id) {
        throw new Error("The server did not return the order ID.");
      }

      const orderWithRecoveryToken = {
        ...data.order,
        recoveryToken,
      };

      localStorage.setItem(
        "currentOrder",
        JSON.stringify(orderWithRecoveryToken)
      );

      localStorage.removeItem(recoveryStorageKey);
      localStorage.removeItem(idempotencyStorageKey);

      clearCart();

      // The order is saved. Open the existing order-status page.
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

      {/* Checkout summary: GST breakdown is intentionally hidden here. */}
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
          <span>Order subtotal</span>
          <strong>₹{formatRupees(subtotal)}</strong>
        </div>

        <div className="summary-divider" />

        <div className="summary-total">
          <div>
            <span>ITEMS TOTAL</span>
            <small>Final bill available after ordering</small>
          </div>

          <motion.strong
            key={subtotal}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            ₹{formatRupees(subtotal)}
          </motion.strong>
        </div>
      </motion.section>

      {/* Mobile number and WhatsApp consent will be collected when the
          customer requests the final bill on OrderStatus. */}

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
        onClick={placeOrder}
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
    </div>
  );
}

export default Checkout;
