import { useEffect, useState } from "react";
import socket from "../socket";

function OrderStatus() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadOrder = async () => {
      try {
        const savedOrder =
          localStorage.getItem("currentOrder");

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

        const response = await fetch(
          `http://localhost:3000/api/orders/${localOrder._id}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch order"
          );
        }

        if (!cancelled) {
          setOrder(data.order);

          localStorage.setItem(
            "currentOrder",
            JSON.stringify(data.order)
          );

          setLoading(false);
        }
      } catch (error) {
        console.error(
          "Failed to fetch order:",
          error
        );

        if (!cancelled) {
          setError(error.message);
          setLoading(false);
        }
      }
    };

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, []);

  // Real-time order status updates
  useEffect(() => {
    if (!order?.restaurantId) {
      return;
    }

    socket.emit(
      "join-restaurant",
      order.restaurantId
    );

    const handleStatusUpdate = (updatedOrder) => {
      console.log(
        "⚡ Order status updated:",
        updatedOrder
      );

      setOrder((currentOrder) => {
        if (
          !currentOrder ||
          currentOrder._id !== updatedOrder._id
        ) {
          return currentOrder;
        }

        localStorage.setItem(
          "currentOrder",
          JSON.stringify(updatedOrder)
        );

        return updatedOrder;
      });
    };

    socket.on(
      "order-status-updated",
      handleStatusUpdate
    );

    return () => {
      socket.off(
        "order-status-updated",
        handleStatusUpdate
      );
    };
  }, [order]);

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
        <h2>Loading order...</h2>
      </div>
    );
  }

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
        }}
      >
        <h2>Something went wrong</h2>
        <p>{error}</p>
      </div>
    );
  }

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

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        padding: "60px 20px",
        boxSizing: "border-box",
        background:
          "linear-gradient(135deg, #fffaf2, #f4e8d9)",
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
          Order Confirmed 🎉
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
      </div>

      {/* ORDER CARD */}
      <div
        style={{
          width: "100%",
          maxWidth: "650px",
          margin: "0 auto",
          padding: "28px",
          boxSizing: "border-box",
          background: "#ffffff",
          borderRadius: "22px",
          boxShadow:
            "0 15px 40px rgba(63, 35, 18, 0.12)",
        }}
      >
        {/* STATUS */}
        <div
          style={{
            width: "100%",
            padding: "14px",
            marginBottom: "22px",
            boxSizing: "border-box",
            borderRadius: "12px",
            background: "#fff1e6",
            color: "#d96525",
            textAlign: "center",
            fontSize: "18px",
            fontWeight: "700",
          }}
        >
          Status: {order.status}
        </div>

        {/* ITEMS */}
        <div
          style={{
            width: "100%",
          }}
        >
          {order.items.map((item, index) => (
            <div
              key={item.id}
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
                  index === order.items.length - 1
                    ? "none"
                    : "1px solid #eadaca",
              }}
            >
              <div
                style={{
                  margin: "0",
                  padding: "0",
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
                  margin: "0",
                  padding: "0",
                  color: "#4b2918",
                  fontSize: "16px",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                }}
              >
                ₹{item.price * item.quantity}
              </div>
            </div>
          ))}
        </div>

        {/* TOTAL */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginTop: "22px",
            paddingTop: "20px",
            borderTop: "1px solid #eadaca",
          }}
        >
          <div
            style={{
              color: "#4b2918",
              fontSize: "21px",
              fontWeight: "700",
            }}
          >
            Total
          </div>

          <div
            style={{
              color: "#4b2918",
              fontSize: "21px",
              fontWeight: "800",
            }}
          >
            ₹{order.totalPrice}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderStatus;