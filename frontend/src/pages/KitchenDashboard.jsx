import { useEffect, useMemo, useState } from "react";
import "./KitchenDashboard.css";

import socket from "../socket";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";

import AdminNavigation from "../components/AdminNavigation";

function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { user } = useAuth();

  // =========================================================
  // SOCKET.IO + RESTAURANT ROOM
  // =========================================================

  useEffect(() => {
    if (!user?.restaurantId) {
      console.log("⚠️ Restaurant ID not available yet");
      return;
    }

    const restaurantId = String(user.restaurantId);

    const handleConnect = () => {
      console.log("⚡ Connected to Socket.IO:", socket.id);
      console.log("🏪 Joining restaurant room:", restaurantId);

      socket.emit("join-restaurant", restaurantId);

      // Recover orders missed while disconnected.
      // eslint-disable-next-line react-hooks/immutability
      fetchOrders()
        .then((fetchedOrders) => {
          setOrders((currentOrders) => {
            const orderMap = new Map();

            fetchedOrders.forEach((order) => {
              orderMap.set(order._id, order);
            });

            currentOrders.forEach((order) => {
              if (!orderMap.has(order._id)) {
                orderMap.set(order._id, order);
              }
            });

            return Array.from(orderMap.values()).sort(
              (a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );
          });

          console.log("✅ Kitchen orders synchronized");
        })
        .catch((error) => {
          console.error(
            "❌ Failed to synchronize orders:",
            error
          );
        });
    };

    const handleNewOrder = (newOrder) => {
      console.log("⚡ NEW ORDER RECEIVED:", newOrder);

      const orderRestaurantId = String(newOrder.restaurantId);

      if (orderRestaurantId !== restaurantId) {
        console.log(
          "🚫 Ignored order from another restaurant"
        );
        return;
      }

      console.log("✅ Order belongs to this restaurant");

      setOrders((currentOrders) => {
        const alreadyExists = currentOrders.some(
          (order) => order._id === newOrder._id
        );

        if (alreadyExists) {
          console.log(
            "⚠️ Duplicate order ignored:",
            newOrder._id
          );
          return currentOrders;
        }

        return [newOrder, ...currentOrders];
      });
    };

    const handleOrderStatusUpdated = (updatedOrder) => {
      console.log(
        "⚡ ORDER STATUS UPDATED:",
        updatedOrder
      );

      const orderRestaurantId = String(
        updatedOrder.restaurantId
      );

      if (orderRestaurantId !== restaurantId) {
        console.log(
          "🚫 Ignored status update from another restaurant"
        );
        return;
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order._id === updatedOrder._id
            ? updatedOrder
            : order
        )
      );
    };

    socket.on("connect", handleConnect);
    socket.on("new-order", handleNewOrder);
    socket.on(
      "order-status-updated",
      handleOrderStatusUpdated
    );

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("new-order", handleNewOrder);
      socket.off(
        "order-status-updated",
        handleOrderStatusUpdated
      );
    };
  }, [user?.restaurantId]);

  // =========================================================
  // FETCH ORDERS
  // =========================================================

  const fetchOrders = async () => {
    const response = await apiFetch("/api/orders");

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to fetch orders"
      );
    }

    return data.orders || [];
  };

  // =========================================================
  // INITIAL LOADING
  // =========================================================

  useEffect(() => {
    if (!user?.restaurantId) {
      return;
    }

    let cancelled = false;

    const loadOrders = async () => {
      try {
        setLoading(true);

        const fetchedOrders = await fetchOrders();

        if (!cancelled) {
          setOrders(fetchedOrders);
        }
      } catch (error) {
        console.error(
          "Failed to fetch orders:",
          error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [user?.restaurantId]);

  // =========================================================
  // MANUAL REFRESH
  // =========================================================

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      const fetchedOrders = await fetchOrders();

      setOrders(fetchedOrders);
    } catch (error) {
      console.error(
        "Failed to refresh orders:",
        error
      );
    } finally {
      setRefreshing(false);
    }
  };

  // =========================================================
  // UPDATE ORDER STATUS
  // =========================================================

  const updateStatus = async (
    orderId,
    newStatus
  ) => {
    try {
      const response = await apiFetch(
        `/api/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update status"
        );
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order._id === orderId
            ? data.order
            : order
        )
      );
    } catch (error) {
      console.error(
        "Status update failed:",
        error
      );

      alert(
        error.message ||
          "Failed to update order status."
      );
    }
  };

  // =========================================================
  // STATUS HELPERS
  // =========================================================

  const getNextStatus = (status) => {
    switch (status) {
      case "Order Received":
        return "Accepted";

      case "Accepted":
        return "Preparing";

      case "Preparing":
        return "Ready";

      case "Ready":
        return "Served";

      default:
        return null;
    }
  };

  const getButtonText = (status) => {
    switch (status) {
      case "Order Received":
        return "Accept Order";

      case "Accepted":
        return "Start Preparing";

      case "Preparing":
        return "Mark Ready";

      case "Ready":
        return "Mark Served";

      default:
        return null;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Order Received":
        return "new";

      case "Accepted":
        return "accepted";

      case "Preparing":
        return "preparing";

      case "Ready":
        return "ready";

      case "Served":
        return "served";

      default:
        return "";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "Order Received":
        return "New";

      case "Accepted":
        return "Accepted";

      case "Preparing":
        return "Preparing";

      case "Ready":
        return "Ready";

      case "Served":
        return "Served";

      default:
        return status;
    }
  };

  // =========================================================
  // ORDER TIME
  // =========================================================

  const formatOrderTime = (createdAt) => {
    if (!createdAt) {
      return "Just now";
    }

    const createdTime =
      new Date(createdAt).getTime();

    // eslint-disable-next-line react-hooks/purity
    const currentTime = Date.now();

    const difference = Math.max(
      0,
      currentTime - createdTime
    );

    const minutes = Math.floor(
      difference / 60000
    );

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes === 1) {
      return "1 min ago";
    }

    if (minutes < 60) {
      return `${minutes} mins ago`;
    }

    const hours = Math.floor(
      minutes / 60
    );

    if (hours === 1) {
      return "1 hour ago";
    }

    return `${hours} hours ago`;
  };

  // =========================================================
  // ORDER COUNTS
  // =========================================================

  const orderCounts = useMemo(() => {
    return {
      all: orders.length,

      new: orders.filter(
        (order) =>
          order.status === "Order Received"
      ).length,

      accepted: orders.filter(
        (order) =>
          order.status === "Accepted"
      ).length,

      preparing: orders.filter(
        (order) =>
          order.status === "Preparing"
      ).length,

      ready: orders.filter(
        (order) =>
          order.status === "Ready"
      ).length,

      served: orders.filter(
        (order) =>
          order.status === "Served"
      ).length,
    };
  }, [orders]);

  // =========================================================
  // ACTIVE ORDERS
  // =========================================================

  const activeOrdersCount =
    orderCounts.new +
    orderCounts.accepted +
    orderCounts.preparing +
    orderCounts.ready;

  // =========================================================
  // FILTER ORDERS
  // =========================================================

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (activeFilter !== "All") {
      result = result.filter(
        (order) =>
          order.status === activeFilter
      );
    }

    if (searchQuery.trim()) {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      result = result.filter(
        (order) =>
          String(
            order.orderId || ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            order.tableNumber || ""
          )
            .toLowerCase()
            .includes(query)
      );
    }

    return result;
  }, [
    orders,
    activeFilter,
    searchQuery,
  ]);

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="kitchen-page">
        <AdminNavigation />

        <main className="kitchen-main">
          <div className="kitchen-loading">
            <div className="loading-spinner"></div>

            <h2>Loading kitchen</h2>

            <p>
              Connecting to your live order board...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================
  // DASHBOARD
  // =========================================================

  return (
    <div className="kitchen-page">
      <AdminNavigation />

      <main className="kitchen-main">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="kitchen-header">

          <div className="kitchen-header-copy">
            <div className="kitchen-live">
              <span className="kitchen-live-dot"></span>
              LIVE KITCHEN
            </div>

            <h1>Kitchen Order Board</h1>

            <p>
              Keep every order moving from
              received to served.
            </p>
          </div>

          <div className="kitchen-header-actions">

            <div className="kitchen-orders-indicator">
              <span>Active orders</span>
              <strong>
                {activeOrdersCount}
              </strong>
            </div>

            <button
              className="kitchen-refresh"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <span
                className={
                  refreshing
                    ? "refresh-icon spinning"
                    : "refresh-icon"
                }
              >
                ↻
              </span>

              {refreshing
                ? "Refreshing"
                : "Refresh"}
            </button>

          </div>
        </header>

        {/* =================================================
            STATUS OVERVIEW
        ================================================= */}

        <section className="kitchen-status-overview">

          <button
            className={`status-overview-card ${
              activeFilter === "All"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveFilter("All")
            }
          >
            <div className="status-overview-top">
              <span className="status-overview-icon neutral">
                ◉
              </span>

              <span className="status-overview-label">
                All orders
              </span>
            </div>

            <strong>
              {orderCounts.all}
            </strong>

            <span className="status-overview-description">
              Today's order queue
            </span>
          </button>

          <button
            className={`status-overview-card ${
              activeFilter === "Order Received"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveFilter(
                "Order Received"
              )
            }
          >
            <div className="status-overview-top">
              <span className="status-overview-icon new">
                !
              </span>

              <span className="status-overview-label">
                New
              </span>
            </div>

            <strong>
              {orderCounts.new}
            </strong>

            <span className="status-overview-description">
              Waiting for acceptance
            </span>
          </button>

          <button
            className={`status-overview-card ${
              activeFilter === "Accepted"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveFilter("Accepted")
            }
          >
            <div className="status-overview-top">
              <span className="status-overview-icon accepted">
                ✓
              </span>

              <span className="status-overview-label">
                Accepted
              </span>
            </div>

            <strong>
              {orderCounts.accepted}
            </strong>

            <span className="status-overview-description">
              Ready for preparation
            </span>
          </button>

          <button
            className={`status-overview-card ${
              activeFilter === "Preparing"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveFilter("Preparing")
            }
          >
            <div className="status-overview-top">
              <span className="status-overview-icon preparing">
                ●
              </span>

              <span className="status-overview-label">
                Preparing
              </span>
            </div>

            <strong>
              {orderCounts.preparing}
            </strong>

            <span className="status-overview-description">
              Currently in kitchen
            </span>
          </button>

          <button
            className={`status-overview-card ${
              activeFilter === "Ready"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveFilter("Ready")
            }
          >
            <div className="status-overview-top">
              <span className="status-overview-icon ready">
                ✓
              </span>

              <span className="status-overview-label">
                Ready
              </span>
            </div>

            <strong>
              {orderCounts.ready}
            </strong>

            <span className="status-overview-description">
              Waiting to be served
            </span>
          </button>

        </section>

        {/* =================================================
            TOOLBAR
        ================================================= */}

        <section className="kitchen-toolbar">

          <div className="kitchen-filter-tabs">

            {[
              {
                label: "All",
                value: "All",
                count: orderCounts.all,
              },
              {
                label: "New",
                value: "Order Received",
                count: orderCounts.new,
              },
              {
                label: "Accepted",
                value: "Accepted",
                count: orderCounts.accepted,
              },
              {
                label: "Preparing",
                value: "Preparing",
                count: orderCounts.preparing,
              },
              {
                label: "Ready",
                value: "Ready",
                count: orderCounts.ready,
              },
            ].map((filter) => (
              <button
                key={filter.value}
                className={
                  activeFilter === filter.value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter(
                    filter.value
                  )
                }
              >
                {filter.label}

                <span>
                  {filter.count}
                </span>
              </button>
            ))}

          </div>

          <div className="kitchen-search">

            <span className="search-icon">
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search order or table..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
            />

            {searchQuery && (
              <button
                className="search-clear"
                onClick={() =>
                  setSearchQuery("")
                }
              >
                ×
              </button>
            )}

          </div>

        </section>

        {/* =================================================
            ORDERS HEADER
        ================================================= */}

        <section className="kitchen-orders">

          <div className="kitchen-orders-header">

            <div>
              <div className="section-eyebrow">
                ORDER QUEUE
              </div>

              <h2>Active Orders</h2>

              <p>
                {filteredOrders.length}{" "}
                {filteredOrders.length === 1
                  ? "order"
                  : "orders"}{" "}
                currently displayed
              </p>
            </div>

            {(activeFilter !== "All" ||
              searchQuery) && (
              <button
                className="clear-filters"
                onClick={() => {
                  setActiveFilter("All");
                  setSearchQuery("");
                }}
              >
                Clear filters
              </button>
            )}

          </div>

          {/* =================================================
              EMPTY
          ================================================= */}

          {filteredOrders.length === 0 ? (
            <div className="kitchen-empty">

              <div className="kitchen-empty-icon">
                ✓
              </div>

              <h3>
                {searchQuery ||
                activeFilter !== "All"
                  ? "No matching orders"
                  : "Kitchen is clear"}
              </h3>

              <p>
                {searchQuery
                  ? "Try another order number or table."
                  : activeFilter !== "All"
                  ? "There are no orders in this status."
                  : "New customer orders will appear here automatically."}
              </p>

              {(searchQuery ||
                activeFilter !== "All") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveFilter("All");
                  }}
                >
                  View all orders
                </button>
              )}

            </div>
          ) : (

            /* =================================================
               ORDER GRID
            ================================================= */

            <div className="kitchen-order-grid">

              {filteredOrders.map((order) => {
                const nextStatus =
                  getNextStatus(
                    order.status
                  );

                const buttonText =
                  getButtonText(
                    order.status
                  );

                const statusClass =
                  getStatusClass(
                    order.status
                  );

                return (
                  <article
                    className={`kitchen-order-card ${statusClass}`}
                    key={order._id}
                  >

                    {/* CARD HEADER */}

                    <div className="order-card-header">

                      <div>
                        <span className="order-card-label">
                          ORDER
                        </span>

                        <h3>
                          #{order.orderId}
                        </h3>
                      </div>

                      <span
                        className={`order-status-badge ${statusClass}`}
                      >
                        <span></span>
                        {getStatusLabel(
                          order.status
                        )}
                      </span>

                    </div>

                    {/* TABLE + TIME */}

                    <div className="order-card-meta">

                      <div className="order-table">

                        <div className="order-table-icon">
                          T
                        </div>

                        <div>
                          <span>TABLE</span>

                          <strong>
                            {order.tableNumber}
                          </strong>
                        </div>

                      </div>

                      <div className="order-created">
                        {formatOrderTime(
                          order.createdAt
                        )}
                      </div>

                    </div>

                    {/* ITEMS */}

                    <div className="order-items-section">

                      <div className="order-items-header">
                        <span>Items</span>

                        <span>
                          {order.items.length}{" "}
                          {order.items.length ===
                          1
                            ? "item"
                            : "items"}
                        </span>
                      </div>

                      <div className="order-items-list">

                        {order.items.map(
                          (item, index) => (
                            <div
                              className="kitchen-order-item"
                              key={
                                item.id ||
                                `${item.name}-${index}`
                              }
                            >

                              <div className="item-qty">
                                {item.quantity}
                              </div>

                              <div className="item-info">
                                <strong>
                                  {item.name}
                                </strong>

                                <span>
                                  ₹{item.price} each
                                </span>
                              </div>

                              <strong className="item-price">
                                ₹
                                {item.price *
                                  item.quantity}
                              </strong>

                            </div>
                          )
                        )}

                      </div>

                    </div>

                    {/* TOTAL */}

                    <div className="order-total-row">

                      <span>
                        Order total
                      </span>

                      <strong>
                        ₹{order.totalPrice}
                      </strong>

                    </div>

                    {/* ACTION */}

                    {nextStatus ? (
                      <button
                        className={`kitchen-action ${statusClass}`}
                        onClick={() =>
                          updateStatus(
                            order._id,
                            nextStatus
                          )
                        }
                      >

                        <span className="action-icon">
                          {order.status ===
                            "Order Received" &&
                            "✓"}

                          {order.status ===
                            "Accepted" &&
                            "▶"}

                          {order.status ===
                            "Preparing" &&
                            "✓"}

                          {order.status ===
                            "Ready" &&
                            "✓"}
                        </span>

                        <span>
                          {buttonText}
                        </span>

                        <span className="action-arrow">
                          →
                        </span>

                      </button>
                    ) : (
                      <div className="order-completed">
                        <span>✓</span>
                        Order completed
                      </div>
                    )}

                  </article>
                );
              })}

            </div>
          )}

        </section>

      </main>
    </div>
  );
}

export default KitchenDashboard;