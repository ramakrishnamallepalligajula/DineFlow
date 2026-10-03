/*
import { useEffect, useState } from "react";
import { useCart } from "../context/useCart";
import { useNavigate, useParams } from "react-router-dom";

function Checkout() {
  const {
    cart,
    totalItems,
    totalPrice,
  } = useCart();

  const navigate = useNavigate();
  const { tableId } = useParams();

  const tableNumber = tableId?.replace("table-", "");

  // NEW: Store restaurant ID
  const [restaurantId, setRestaurantId] = useState(null);

  // NEW: Get restaurant ID from the table
  useEffect(() => {
    const loadTable = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL;

        const response = await fetch(
          `${API_URL}/api/tables/public/${tableId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load table"
          );
        }

        console.log("Table information:", data);

        setRestaurantId(data.table.restaurantId);
      } catch (error) {
        console.error(
          "❌ Failed to load restaurant:",
          error
        );

        alert(
          `Failed to load restaurant: ${error.message}`
        );
      }
    };

    if (tableId) {
      loadTable();
    }
  }, [tableId]);

  const placeOrder = async () => {

    // NEW: Don't place order before restaurant is loaded
    if (!restaurantId) {
      alert(
        "Restaurant information is still loading. Please try again."
      );
      return;
    }

    const order = {
      id: Date.now(),

      // NEW
      restaurantId: restaurantId,

      tableId: tableId,
      tableNumber: Number(tableNumber),

      items: cart.map((item) => ({
        ...item,
        category: item.category || "Other",
      })),

      totalItems: totalItems,
      totalPrice: totalPrice,
      status: "Order Received",
      createdAt: new Date().toISOString(),
    };

    const API_URL = import.meta.env.VITE_API_URL;

    console.log("Sending order:", order);

    try {
      const response = await fetch(
        `${API_URL}/api/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(order),
        }
      );

      const data = await response.json();

      console.log("Backend response:", data);
      console.log("MongoDB order:", data.order);
      console.log("MongoDB _id:", data.order?._id);

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to place order"
        );
      }

      // Make sure the MongoDB order contains an _id
      if (!data.order?._id) {
        throw new Error(
          "Order was created but MongoDB ID was not returned."
        );
      }

      // Save the MongoDB order
      localStorage.setItem(
        "currentOrder",
        JSON.stringify(data.order)
      );

      console.log(
        "Saved currentOrder:",
        localStorage.getItem("currentOrder")
      );

      navigate("/order-status");

    } catch (error) {
      console.error("Order failed:", error);

      alert(
        `Failed to place order: ${error.message}`
      );
    }
  };

  return (
    <div className="checkout-page">

      <h1>Checkout</h1>

      <div className="table-info">
        <h3>Table {tableNumber}</h3>

        <p>
          Your order will be served to this table.
          Thanks for ordering!
        </p>
      </div>

      <div className="checkout-items">

        {cart.map((item) => (
          <div
            className="checkout-item"
            key={item.id}
          >
            <div>
              <h3>{item.name}</h3>

              <p>
                ₹{item.price} × {item.quantity}
              </p>
            </div>

            <strong>
              ₹{item.price * item.quantity}
            </strong>
          </div>
        ))}

      </div>

      <div className="checkout-summary">

        <p>
          Total Items: {totalItems}
        </p>

        <h2>
          Total: ₹{totalPrice}
        </h2>

      </div>

      <button
        className="place-order-button"
        onClick={placeOrder}
      >
        Place Order
      </button>

    </div>
  );
}

export default Checkout; */

import { useEffect, useState } from "react";
import { useCart } from "../context/useCart";
import { useNavigate, useParams } from "react-router-dom";

function Checkout() {
  const {
    cart,
    totalItems,
    totalPrice,
    clearCart,
  } = useCart();

  const navigate = useNavigate();
  const { tableId } = useParams();

  const tableNumber =
    tableId?.replace("table-", "");

  const [restaurantId, setRestaurantId] =
    useState(null);

  const [placingOrder, setPlacingOrder] =
    useState(false);

  /*
    =========================================================
    LOAD TABLE INFORMATION
    =========================================================
  */

  useEffect(() => {
    let cancelled = false;

    const loadTable = async () => {
      try {
        const API_URL =
          import.meta.env.VITE_API_URL;

        const response = await fetch(
          `${API_URL}/api/tables/public/${tableId}`
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to load table"
          );
        }

        if (!data.table) {
          throw new Error(
            "Table information was not returned"
          );
        }

        if (!cancelled) {
          setRestaurantId(
            data.table.restaurantId
          );
        }
      } catch (error) {
        console.error(
          "❌ Failed to load restaurant:",
          error
        );

        if (!cancelled) {
          alert(
            `Failed to load restaurant: ${
              error.message
            }`
          );
        }
      }
    };

    if (tableId) {
      loadTable();
    }

    return () => {
      cancelled = true;
    };
  }, [tableId]);

  /*
    =========================================================
    PLACE ORDER
    =========================================================
  */

  const placeOrder = async () => {
    if (placingOrder) {
      return;
    }

    /*
      Don't allow an empty checkout.
    */

    if (!cart || cart.length === 0) {
      alert(
        "Your cart is empty."
      );

      return;
    }

    /*
      Restaurant information must be loaded
      before placing the order.
    */

    if (!restaurantId) {
      alert(
        "Restaurant information is still loading. Please try again."
      );

      return;
    }

    const API_URL =
      import.meta.env.VITE_API_URL;

    /*
      IMPORTANT:

      We intentionally DO NOT create:

      id: Date.now()

      anymore.

      The backend creates/reuses the table
      session and assigns the customer-facing
      orderId.
    */

    const order = {
      restaurantId,

      tableId,

      tableNumber: Number(
        tableNumber
      ),

      items: cart.map((item) => ({
        ...item,

        category:
          item.category || "Other",
      })),

      totalItems,

      totalPrice,
    };

    console.log(
      "📦 Sending order:",
      order
    );

    try {
      setPlacingOrder(true);

      const response =
        await fetch(
          `${API_URL}/api/orders`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(order),
          }
        );

      const data =
        await response.json();

      console.log(
        "📥 Backend response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to place order"
        );
      }

      /*
        =====================================================
        VERIFY ORDER
        =====================================================
      */

      if (!data.order?._id) {
        throw new Error(
          "Order was created but MongoDB ID was not returned."
        );
      }

      if (!data.order?.sessionId) {
        throw new Error(
          "Order was created but session ID was not returned."
        );
      }

      if (!data.order?.orderId) {
        throw new Error(
          "Order was created but order ID was not returned."
        );
      }

      /*
        =====================================================
        SAVE CURRENT ORDER
        =====================================================

        This is still the individual MongoDB order.

        Example:

        _id:
        68f123...

        orderId:
        1042

        sessionId:
        abc123

        orderSequence:
        2

        type:
        additional
      */

      localStorage.setItem(
        "currentOrder",
        JSON.stringify(
          data.order
        )
      );

      /*
        =====================================================
        SAVE TABLE SESSION
        =====================================================

        This allows the customer to continue
        the same table session after navigating
        around the app.
      */

      const sessionData = {
        sessionId:
          data.order.sessionId,

        orderId:
          data.order.orderId,

        tableId:
          data.order.tableId,

        tableNumber:
          data.order.tableNumber,

        orderCount:
          data.session?.orderCount ||
          data.order.orderSequence,

        status:
          data.session?.status ||
          "open",
      };

      localStorage.setItem(
        "tableSession",
        JSON.stringify(
          sessionData
        )
      );

      console.log(
        "💾 Saved table session:",
        sessionData
      );

      console.log(
        "🧾 Customer Order ID:",
        data.order.orderId
      );

      console.log(
        "🔢 Order Sequence:",
        data.order.orderSequence
      );

      console.log(
        "📦 Order Type:",
        data.order.type
      );

      /*
        =====================================================
        CLEAR CART
        =====================================================

        The customer has successfully submitted
        this order.

        The next order starts with an empty cart.
      */

      clearCart();

      /*
        =====================================================
        GO TO ORDER STATUS
        =====================================================
      */

      navigate(
        "/order-status"
      );
    } catch (error) {
      console.error(
        "❌ Order failed:",
        error
      );

      alert(
        `Failed to place order: ${
          error.message
        }`
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  /*
    =========================================================
    CHECKOUT UI
    =========================================================
  */

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>

      <div className="table-info">
        <h3>
          Table {tableNumber}
        </h3>

        <p>
          Your order will be served
          to this table.
        </p>
      </div>

      <div className="checkout-items">
        {cart.map((item) => (
          <div
            className="checkout-item"
            key={item.id}
          >
            <div>
              <h3>
                {item.name}
              </h3>

              <p>
                ₹{item.price} ×{" "}
                {item.quantity}
              </p>
            </div>

            <strong>
              ₹
              {item.price *
                item.quantity}
            </strong>
          </div>
        ))}
      </div>

      <div className="checkout-summary">
        <p>
          Total Items:{" "}
          {totalItems}
        </p>

        <h2>
          Total: ₹{totalPrice}
        </h2>
      </div>

      <button
        className="place-order-button"
        onClick={placeOrder}
        disabled={
          placingOrder ||
          cart.length === 0
        }
      >
        {placingOrder
          ? "Placing Order..."
          : "Place Order"}
      </button>
    </div>
  );
}

export default Checkout;