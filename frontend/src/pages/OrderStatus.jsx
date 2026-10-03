import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import socket from "../socket";

function OrderStatus() {
  const [order, setOrder] = useState(null);
  const [session, setSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [bill, setBill] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [requestingBill, setRequestingBill] =
    useState(false);

  const navigate = useNavigate();

  const API_URL =
    import.meta.env.VITE_API_URL;

  // =========================
  // LOAD ORDER + SESSION
  // =========================

  useEffect(() => {
    let cancelled = false;

    const loadOrderAndSession = async () => {
      try {
        setLoading(true);
        setError("");

        const savedOrder =
          localStorage.getItem("currentOrder");

        const savedSession =
          localStorage.getItem("tableSession");

        if (!savedOrder) {
          if (!cancelled) {
            setError("No active order found.");
            setLoading(false);
          }

          return;
        }

        const localOrder =
          JSON.parse(savedOrder);

        if (!localOrder._id) {
          if (!cancelled) {
            setError(
              "MongoDB order ID is missing."
            );
            setLoading(false);
          }

          return;
        }

        // =========================
        // FETCH CURRENT ORDER
        // =========================

        const orderResponse =
          await fetch(
            `${API_URL}/api/orders/${localOrder._id}`
          );

        const orderData =
          await orderResponse.json();

        if (!orderResponse.ok) {
          throw new Error(
            orderData.message ||
              "Failed to fetch order"
          );
        }

        if (cancelled) {
          return;
        }

        const currentOrder =
          orderData.order;

        setOrder(currentOrder);

        localStorage.setItem(
          "currentOrder",
          JSON.stringify(currentOrder)
        );

        // =========================
        // GET SESSION ID
        // =========================

        const sessionId =
          currentOrder.sessionId ||
          (savedSession
            ? JSON.parse(savedSession)
                ?.sessionId
            : null);

        if (!sessionId) {
          setOrders([currentOrder]);
          setLoading(false);
          return;
        }

        // =========================
        // FETCH ENTIRE SESSION
        // =========================

        const sessionResponse =
          await fetch(
            `${API_URL}/api/orders/session/${sessionId}`
          );

        const sessionData =
          await sessionResponse.json();

        if (!sessionResponse.ok) {
          throw new Error(
            sessionData.message ||
              "Failed to fetch table session"
          );
        }

        if (cancelled) {
          return;
        }

        setSession(
          sessionData.session
        );

        setOrders(
          sessionData.orders || []
        );

        // =========================
        // SAVE SESSION
        // =========================

        const savedSessionData = {
          sessionId:
            sessionData.session
              .sessionId,

          orderId:
            sessionData.session.orderId,

          tableId:
            sessionData.session.tableId,

          tableNumber:
            sessionData.session
              .tableNumber,

          orderCount:
            sessionData.session
              .orderCount,

          status:
            sessionData.session.status,
        };

        localStorage.setItem(
          "tableSession",
          JSON.stringify(
            savedSessionData
          )
        );

        setLoading(false);
      } catch (error) {
        console.error(
          "❌ Failed to load order/session:",
          error
        );

        if (!cancelled) {
          setError(
            error.message ||
              "Failed to load order"
          );

          setLoading(false);
        }
      }
    };

    loadOrderAndSession();

    return () => {
      cancelled = true;
    };
  }, [API_URL]);

  // =========================
  // REAL-TIME SOCKET UPDATES
  // =========================

  useEffect(() => {
    if (!order?.restaurantId) {
      return;
    }

    const restaurantId =
      String(order.restaurantId);

    socket.emit(
      "join-restaurant",
      restaurantId
    );

    // =========================
    // ORDER STATUS UPDATE
    // =========================

    const handleStatusUpdate = (
      updatedOrder
    ) => {
      console.log(
        "⚡ Order status updated:",
        updatedOrder
      );

      if (
        !updatedOrder?.sessionId ||
        updatedOrder.sessionId !==
          order.sessionId
      ) {
        return;
      }

      setOrders((currentOrders) =>
        currentOrders.map(
          (currentOrder) =>
            currentOrder._id ===
            updatedOrder._id
              ? updatedOrder
              : currentOrder
        )
      );

      setOrder((currentOrder) => {
        if (
          !currentOrder ||
          currentOrder._id !==
            updatedOrder._id
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

    // =========================
    // BILL REQUESTED
    // =========================

    const handleBillRequested = (
      billData
    ) => {
      console.log(
        "🧾 Bill requested:",
        billData
      );

      if (
        !billData?.sessionId ||
        billData.sessionId !==
          order.sessionId
      ) {
        return;
      }

      setBill(billData);

      setSession((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              status:
                "bill_requested",
            }
          : currentSession
      );

      localStorage.setItem(
        "tableSession",
        JSON.stringify({
          sessionId:
            billData.sessionId,
          orderId:
            billData.orderId,
          tableId:
            billData.tableId,
          tableNumber:
            billData.tableNumber,
          orderCount:
            billData.orderCount,
          status:
            "bill_requested",
        })
      );
    };

    socket.on(
      "order-status-updated",
      handleStatusUpdate
    );

    socket.on(
      "bill-requested",
      handleBillRequested
    );

    return () => {
      socket.off(
        "order-status-updated",
        handleStatusUpdate
      );

      socket.off(
        "bill-requested",
        handleBillRequested
      );
    };
  }, [
    order?.restaurantId,
    order?.sessionId,
  ]);

  // =========================
  // ORDER MORE FOOD
  // =========================

  const handleOrderMore = () => {
    if (!order?.tableId) {
      return;
    }

    if (
      session?.status ===
      "bill_requested"
    ) {
      return;
    }

    if (
      session?.status === "closed"
    ) {
      return;
    }

    navigate(
      `/order/${order.tableId}`
    );
  };

  // =========================
  // REQUEST BILL
  // =========================

  const handleRequestBill = async () => {
    if (
      requestingBill ||
      !order?.sessionId
    ) {
      return;
    }

    if (
      session?.status ===
      "bill_requested"
    ) {
      return;
    }

    if (
      session?.status === "closed"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Request the final bill for this table?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setRequestingBill(true);

      const response =
        await fetch(
          `${API_URL}/api/orders/session/${order.sessionId}/bill`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to request bill"
        );
      }

      console.log(
        "🧾 Final bill:",
        data.bill
      );

      setBill(data.bill);

      setSession((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              status:
                "bill_requested",
            }
          : currentSession
      );

      localStorage.setItem(
        "tableSession",
        JSON.stringify({
          sessionId:
            data.bill.sessionId,
          orderId:
            data.bill.orderId,
          tableId:
            data.bill.tableId,
          tableNumber:
            data.bill.tableNumber,
          orderCount:
            data.bill.orderCount,
          status:
            "bill_requested",
        })
      );
    } catch (error) {
      console.error(
        "❌ Bill request failed:",
        error
      );

      alert(
        error.message ||
          "Failed to request bill."
      );
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
        totals.totalItems +=
          currentOrder.totalItems || 0;

        totals.totalPrice +=
          currentOrder.totalPrice || 0;

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

  const getStatusStyle = (
    status
  ) => {
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

      case "Preparing":
        return {
          background: "#eaf4ff",
          color: "#2774c6",
        };

      case "Ready":
        return {
          background: "#e8f8ed",
          color: "#218838",
        };

      case "Served":
        return {
          background: "#e8f8ed",
          color: "#218838",
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
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        <h2>
          Loading order... 🍽️
        </h2>
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
          fontFamily:
            "Arial, sans-serif",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <h2>
          Something went wrong
        </h2>

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
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        <h2>
          No active order
        </h2>
      </div>
    );
  }

  const isBillRequested =
    session?.status ===
      "bill_requested" ||
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
        background:
          "linear-gradient(135deg, #fffaf2, #f4e8d9)",
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      {/* =========================
          HEADER
      ========================= */}

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
          {isBillRequested
            ? "Final Bill 🧾"
            : "Order Status 🍽️"}
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
            {orders.length === 1
              ? "order"
              : "orders"}{" "}
            in this session
          </div>
        )}
      </div>

      {/* =========================
          BILL REQUESTED MESSAGE
      ========================= */}

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

      {/* =========================
          SESSION ORDERS
      ========================= */}

      <div
        style={{
          width: "100%",
          maxWidth: "650px",
          margin: "0 auto",
        }}
      >
        {orders.map(
          (currentOrder, index) => {
            const statusStyle =
              getStatusStyle(
                currentOrder.status
              );

            return (
              <div
                key={
                  currentOrder._id
                }
                style={{
                  width: "100%",
                  marginBottom: "20px",
                  padding: "24px",
                  boxSizing: "border-box",
                  background: "#ffffff",
                  borderRadius: "22px",
                  boxShadow:
                    "0 15px 40px rgba(63, 35, 18, 0.10)",
                }}
              >
                {/* ORDER HEADER */}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
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
                      Order #
                      {currentOrder.orderSequence ||
                        index + 1}
                    </div>

                    <div
                      style={{
                        marginTop: "4px",
                        color: "#806653",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      {currentOrder.type ===
                      "initial"
                        ? "Initial Order"
                        : "Additional Order"}
                    </div>
                  </div>

                  <div
                    style={{
                      padding:
                        "8px 12px",
                      borderRadius:
                        "999px",
                      background:
                        statusStyle.background,
                      color:
                        statusStyle.color,
                      fontSize: "13px",
                      fontWeight: "700",
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {currentOrder.status}
                  </div>
                </div>

                {/* ITEMS */}

                <div
                  style={{
                    width: "100%",
                  }}
                >
                  {currentOrder.items.map(
                    (
                      item,
                      itemIndex
                    ) => (
                      <div
                        key={
                          item.id ||
                          `${item.name}-${itemIndex}`
                        }
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "1fr auto",
                          alignItems:
                            "center",
                          columnGap:
                            "20px",
                          width: "100%",
                          minHeight:
                            "52px",
                          padding:
                            "14px 0",
                          boxSizing:
                            "border-box",
                          borderBottom:
                            itemIndex ===
                            currentOrder
                              .items
                              .length -
                              1
                              ? "none"
                              : "1px solid #eadaca",
                        }}
                      >
                        <div
                          style={{
                            margin: "0",
                            padding: "0",
                            color:
                              "#3d2415",
                            fontSize:
                              "15px",
                            lineHeight:
                              "1.5",
                            fontWeight:
                              "500",
                          }}
                        >
                          {item.name} ×{" "}
                          {
                            item.quantity
                          }
                        </div>

                        <div
                          style={{
                            margin: "0",
                            padding: "0",
                            color:
                              "#4b2918",
                            fontSize:
                              "16px",
                            fontWeight:
                              "700",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          ₹
                          {item.price *
                            item.quantity}
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* ORDER TOTAL */}

                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    width: "100%",
                    marginTop: "18px",
                    paddingTop: "18px",
                    borderTop:
                      "1px solid #eadaca",
                  }}
                >
                  <div
                    style={{
                      color:
                        "#806653",
                      fontSize:
                        "14px",
                      fontWeight:
                        "600",
                    }}
                  >
                    Order Total
                  </div>

                  <div
                    style={{
                      color:
                        "#4b2918",
                      fontSize:
                        "18px",
                      fontWeight:
                        "800",
                    }}
                  >
                    ₹
                    {
                      currentOrder.totalPrice
                    }
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>

      {/* =========================
          SESSION TOTAL
      ========================= */}

      <div
        style={{
          width: "100%",
          maxWidth: "650px",
          margin: "0 auto 22px",
          padding: "24px",
          boxSizing: "border-box",
          background: "#ffffff",
          borderRadius: "22px",
          boxShadow:
            "0 15px 40px rgba(63, 35, 18, 0.10)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "12px",
            color: "#806653",
            fontSize: "15px",
            fontWeight: "600",
          }}
        >
          <span>
            Total Items
          </span>

          <span>
            {
              sessionTotals.totalItems
            }
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            paddingTop: "16px",
            borderTop:
              "1px solid #eadaca",
          }}
        >
          <span
            style={{
              color: "#4b2918",
              fontSize: "21px",
              fontWeight: "700",
            }}
          >
            Session Total
          </span>

          <strong
            style={{
              color: "#4b2918",
              fontSize: "24px",
              fontWeight: "800",
            }}
          >
            ₹
            {bill?.totalPrice ??
              sessionTotals.totalPrice}
          </strong>
        </div>
      </div>

      {/* =========================
          FINAL BILL DETAILS
      ========================= */}

      {bill && (
        <div
          style={{
            width: "100%",
            maxWidth: "650px",
            margin: "0 auto 22px",
            padding: "24px",
            boxSizing: "border-box",
            background: "#ffffff",
            borderRadius: "22px",
            boxShadow:
              "0 15px 40px rgba(63, 35, 18, 0.10)",
          }}
        >
          <h2
            style={{
              margin:
                "0 0 18px",
              color: "#4b2918",
              fontFamily:
                "Georgia, serif",
              fontSize: "24px",
            }}
          >
            Final Bill
          </h2>

          {bill.items?.map(
            (item, index) => (
              <div
                key={
                  item.id ||
                  `${item.name}-${index}`
                }
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: "15px",
                  padding:
                    "12px 0",
                  borderBottom:
                    index ===
                    bill.items
                      .length -
                      1
                      ? "none"
                      : "1px solid #eadaca",
                }}
              >
                <div
                  style={{
                    color:
                      "#3d2415",
                    fontSize:
                      "15px",
                  }}
                >
                  {item.name} ×{" "}
                  {item.quantity}
                </div>

                <strong
                  style={{
                    color:
                      "#4b2918",
                  }}
                >
                  ₹
                  {item.price *
                    item.quantity}
                </strong>
              </div>
            )
          )}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              marginTop: "18px",
              paddingTop: "18px",
              borderTop:
                "2px solid #4b2918",
              color: "#4b2918",
              fontSize: "22px",
              fontWeight: "800",
            }}
          >
            <span>
              Total
            </span>

            <span>
              ₹{bill.totalPrice}
            </span>
          </div>
        </div>
      )}

      {/* =========================
          ACTION BUTTONS
      ========================= */}

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
            onClick={
              handleOrderMore
            }
            style={{
              width: "100%",
              padding: "16px 20px",
              border: "none",
              borderRadius: "14px",
              background:
                "#4b2918",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow:
                "0 8px 20px rgba(75, 41, 24, 0.20)",
            }}
          >
            🍽️ Order More Food
          </button>

          {/* REQUEST BILL */}

          <button
            type="button"
            onClick={
              handleRequestBill
            }
            disabled={
              requestingBill
            }
            style={{
              width: "100%",
              padding: "16px 20px",
              border:
                "2px solid #4b2918",
              borderRadius: "14px",
              background:
                requestingBill
                  ? "#f3eee9"
                  : "#ffffff",
              color: "#4b2918",
              fontSize: "16px",
              fontWeight: "700",
              cursor:
                requestingBill
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {requestingBill
              ? "Requesting Bill..."
              : "🧾 Request Bill"}
          </button>
        </div>
      )}

      {/* =========================
          BILL COMPLETE MESSAGE
      ========================= */}

      {isBillRequested && (
        <div
          style={{
            width: "100%",
            maxWidth: "650px",
            margin: "0 auto",
            padding: "18px",
            boxSizing: "border-box",
            borderRadius: "14px",
            background: "#fff1e6",
            color: "#806653",
            textAlign: "center",
            fontSize: "14px",
            lineHeight: "1.6",
          }}
        >
          <strong
            style={{
              color: "#4b2918",
              fontSize: "16px",
            }}
          >
            Thank you! ❤️
          </strong>

          <br />

          Your final bill has been
          requested. Please wait for
          the restaurant staff.
        </div>
      )}
    </div>
  );
}

export default OrderStatus;