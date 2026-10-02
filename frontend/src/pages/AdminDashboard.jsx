import { useEffect, useState } from "react";

import "./AdminDashboard.css";

import RevenueChart from "../components/RevenueChart";
import FoodPerformance from "../components/FoodPerformance";
import CategoryPerformance from "../components/CategoryPerformance";
import PeakHours from "../components/PeakHours";
import AdminNavigation from "../components/AdminNavigation";

import { apiFetch } from "../services/api";
import socket from "../socket";

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);

  const [revenueData, setRevenueData] = useState([]);

  const [foodPerformance, setFoodPerformance] =
    useState([]);

  const [categoryPerformance, setCategoryPerformance] =
    useState([]);

  const [peakHours, setPeakHours] = useState([]);

  const [revenueDays, setRevenueDays] = useState(7);

  const [showMoreOrders, setShowMoreOrders] =
    useState(false);

  const [expandedSection, setExpandedSection] =
    useState(null);

  const [revenueSummary, setRevenueSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalItemsSold: 0,
    averageOrderValue: 0,
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* =========================================
     LOAD DASHBOARD
  ========================================= */

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        /* =========================
           DASHBOARD
        ========================= */

        const response = await apiFetch(
          "/api/analytics/dashboard"
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to load dashboard"
          );
        }

        setDashboard(data);

        /* =========================
           REVENUE
        ========================= */

        const revenueResponse = await apiFetch(
          `/api/analytics/revenue?days=${revenueDays}`
        );

        const revenueResult =
          await revenueResponse.json();

        if (!revenueResponse.ok) {
          throw new Error(
            revenueResult.message ||
              "Failed to load revenue analytics"
          );
        }

        setRevenueData(
          revenueResult.revenue || []
        );

        setRevenueSummary(
          revenueResult.summary || {
            totalRevenue: 0,
            totalOrders: 0,
            totalItemsSold: 0,
            averageOrderValue: 0,
          }
        );

        /* =========================
           FOOD PERFORMANCE
        ========================= */

        const foodResponse = await apiFetch(
          "/api/analytics/food-performance"
        );

        const foodResult =
          await foodResponse.json();

        if (!foodResponse.ok) {
          throw new Error(
            foodResult.message ||
              "Failed to load food performance"
          );
        }

        setFoodPerformance(
          foodResult.foodPerformance || []
        );

        /* =========================
           CATEGORY PERFORMANCE
        ========================= */

        const categoryResponse =
          await apiFetch(
            "/api/analytics/category-performance"
          );

        const categoryResult =
          await categoryResponse.json();

        if (!categoryResponse.ok) {
          throw new Error(
            categoryResult.message ||
              "Failed to load category performance"
          );
        }

        setCategoryPerformance(
          categoryResult.categoryPerformance || []
        );

        /* =========================
           PEAK HOURS
        ========================= */

        const peakResponse = await apiFetch(
          "/api/analytics/peak-hours"
        );

        const peakResult =
          await peakResponse.json();

        if (!peakResponse.ok) {
          throw new Error(
            peakResult.message ||
              "Failed to load peak hours"
          );
        }

        setPeakHours(
          peakResult.peakHours || []
        );
      } catch (error) {
        console.error(
          "Failed to load dashboard:",
          error
        );

        setError(
          error.message ||
            "Something went wrong while loading the dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();

    /* =========================
       LIVE ORDER REFRESH
    ========================= */

    const handleNewOrder = () => {
      loadDashboard();
    };

    socket.on(
      "new-order",
      handleNewOrder
    );

    return () => {
      socket.off(
        "new-order",
        handleNewOrder
      );
    };
  }, [revenueDays]);

  /* =========================================
     DOWNLOAD SALES REPORT
  ========================================= */

  const downloadSalesReport = async () => {
    try {
      const response = await apiFetch(
        "/api/reports/sales"
      );

      if (!response.ok) {
        throw new Error(
          "Failed to download sales report"
        );
      }

      const blob = await response.blob();

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        "restaurant-sales-report.xlsx";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Failed to download sales report:",
        error
      );

      alert(
        "Failed to download sales report."
      );
    }
  };

  /* =========================================
     ACCORDION
  ========================================= */

  const toggleSection = (section) => {
    setExpandedSection((current) =>
      current === section
        ? null
        : section
    );
  };

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="admin-dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner">
            ⟳
          </div>

          <h2>
            Loading your restaurant...
          </h2>

          <p>
            Preparing your business overview.
          </p>
        </div>
      </div>
    );
  }

  /* =========================================
     ERROR
  ========================================= */

  if (error) {
    return (
      <div className="admin-dashboard-page">
        <AdminNavigation />

        <main className="admin-dashboard-content">
          <div className="dashboard-error">
            <div className="error-icon">
              !
            </div>

            <h2>
              Unable to load dashboard
            </h2>

            <p>{error}</p>

            <button
              onClick={() =>
                window.location.reload()
              }
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  /* =========================================
     DASHBOARD DATA
  ========================================= */

  const {
    totalOrders = 0,
    activeOrders = 0,
    todayOrders = 0,
    todayRevenue = 0,
    totalFoods = 0,
    totalTables = 0,
  } = dashboard?.stats ||
  dashboard ||
  {};

  const recentOrders =
    dashboard?.recentOrders || [];

  const visibleOrders =
    recentOrders.slice(
      0,
      showMoreOrders ? 10 : 5
    );

  const topFoodPerformance =
    foodPerformance.slice(0, 5);

  const topFoods =
    dashboard?.topFoods || [];

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="admin-dashboard-page">
      <AdminNavigation />

      <main className="admin-dashboard-content">

        {/* =====================================
            HEADER
        ===================================== */}

        <header className="dashboard-header">

          <div className="dashboard-header-left">

            <span className="dashboard-eyebrow">
              RESTAURANT OVERVIEW
            </span>

            <h1>
              Your restaurant,
              <br />
              <span>at a glance.</span>
            </h1>

            <p>
              Monitor today's operations,
              revenue and customer activity
              from one place.
            </p>

          </div>

          <div className="dashboard-header-actions">

            <div className="dashboard-live-status">
              <span />
              Live
            </div>

            <button
              className="report-button"
              onClick={downloadSalesReport}
            >
              <span>↓</span>
              Download Report
            </button>

          </div>

        </header>

        {/* =====================================
            KPI CARDS
        ===================================== */}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>
              <span>TODAY</span>

              <h2>
                Business snapshot
              </h2>
            </div>

          </div>

          <div className="kpi-grid">

            {/* REVENUE */}

            <div className="kpi-card kpi-revenue">

              <div className="kpi-top">
                <div className="kpi-icon">
                  ₹
                </div>

                <span>
                  TODAY'S REVENUE
                </span>
              </div>

              <strong>
                ₹{Number(todayRevenue || 0).toLocaleString("en-IN")}
              </strong>

              <small>
                Revenue generated today
              </small>

            </div>

            {/* ORDERS */}

            <div className="kpi-card">

              <div className="kpi-top">
                <div className="kpi-icon">
                  #
                </div>

                <span>
                  TODAY'S ORDERS
                </span>
              </div>

              <strong>
                {todayOrders}
              </strong>

              <small>
                Orders received today
              </small>

            </div>

            {/* ACTIVE */}

            <div className="kpi-card">

              <div className="kpi-top">
                <div className="kpi-icon active">
                  ●
                </div>

                <span>
                  ACTIVE ORDERS
                </span>
              </div>

              <strong>
                {activeOrders}
              </strong>

              <small>
                Currently being processed
              </small>

            </div>

            {/* TOTAL ORDERS */}

            <div className="kpi-card">

              <div className="kpi-top">
                <div className="kpi-icon">
                  ↗
                </div>

                <span>
                  TOTAL ORDERS
                </span>
              </div>

              <strong>
                {totalOrders}
              </strong>

              <small>
                Orders recorded
              </small>

            </div>

            {/* TABLES */}

            <div className="kpi-card">

              <div className="kpi-top">
                <div className="kpi-icon">
                  □
                </div>

                <span>
                  TABLES
                </span>
              </div>

              <strong>
                {totalTables}
              </strong>

              <small>
                Restaurant tables
              </small>

            </div>

          </div>

        </section>

        {/* =====================================
            REVENUE + ACTIVITY
        ===================================== */}

        <section className="dashboard-main-grid">

          {/* REVENUE */}

          <div className="dashboard-card revenue-card">

            <div className="card-header">

              <div>
                <span className="card-eyebrow">
                  BUSINESS PERFORMANCE
                </span>

                <h2>
                  Revenue overview
                </h2>

                <p>
                  Track your revenue trend
                  across different periods.
                </p>
              </div>

              <div className="revenue-period-buttons">

                {[7, 30, 90].map(
                  (days) => (
                    <button
                      key={days}
                      className={
                        revenueDays === days
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setRevenueDays(days)
                      }
                    >
                      {days === 7
                        ? "7D"
                        : days === 30
                        ? "30D"
                        : "3M"}
                    </button>
                  )
                )}

              </div>

            </div>

            <div className="revenue-summary">

              <div className="revenue-total">

                <span>
                  Revenue
                </span>

                <strong>
                  ₹
                  {Number(
                    revenueSummary.totalRevenue || 0
                  ).toLocaleString("en-IN")}
                </strong>

                <small>
                  Selected period
                </small>

              </div>

              <div>
                <span>
                  Orders
                </span>

                <strong>
                  {revenueSummary.totalOrders}
                </strong>
              </div>

              <div>
                <span>
                  Items sold
                </span>

                <strong>
                  {revenueSummary.totalItemsSold}
                </strong>
              </div>

              <div>
                <span>
                  Avg. order
                </span>

                <strong>
                  ₹
                  {Number(
                    revenueSummary.averageOrderValue || 0
                  ).toLocaleString("en-IN")}
                </strong>
              </div>

            </div>

            <div className="revenue-chart-container">
              <RevenueChart
                data={revenueData}
              />
            </div>

          </div>

          {/* ACTIVITY */}

          <div className="dashboard-card activity-card">

            <div className="card-header">

              <div>
                <span className="card-eyebrow">
                  AT A GLANCE
                </span>

                <h2>
                  Restaurant activity
                </h2>
              </div>

              <div className="activity-icon">
                ✦
              </div>

            </div>

            <div className="activity-list">

              <div className="activity-row">

                <div className="activity-icon-box">
                  📦
                </div>

                <div>
                  <strong>
                    {totalOrders}
                  </strong>

                  <span>
                    Total orders
                  </span>
                </div>

              </div>

              <div className="activity-row">

                <div className="activity-icon-box">
                  🍔
                </div>

                <div>
                  <strong>
                    {totalFoods}
                  </strong>

                  <span>
                    Menu items
                  </span>
                </div>

              </div>

              <div className="activity-row">

                <div className="activity-icon-box">
                  🪑
                </div>

                <div>
                  <strong>
                    {totalTables}
                  </strong>

                  <span>
                    Restaurant tables
                  </span>
                </div>

              </div>

              <div className="activity-row">

                <div className="activity-icon-box">
                  🔥
                </div>

                <div>
                  <strong>
                    {activeOrders}
                  </strong>

                  <span>
                    Orders in progress
                  </span>
                </div>

                <span className="activity-live">
                  LIVE
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* =====================================
            RECENT ORDERS
        ===================================== */}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>
              <span>OPERATIONS</span>

              <h2>
                Recent orders
              </h2>
            </div>

            <span className="section-meta">
              {recentOrders.length} total
            </span>

          </div>

          <div className="orders-card">

            {recentOrders.length === 0 ? (
              <div className="empty-dashboard">

                <div>
                  📦
                </div>

                <h3>
                  No orders yet
                </h3>

                <p>
                  Customer orders will appear
                  here when they are placed.
                </p>

              </div>
            ) : (
              <>
                <div className="orders-table-header">

                  <span>
                    ORDER
                  </span>

                  <span>
                    TABLE
                  </span>

                  <span>
                    ITEMS
                  </span>

                  <span>
                    AMOUNT
                  </span>

                  <span>
                    STATUS
                  </span>

                </div>

                <div className="recent-orders">

                  {visibleOrders.map(
                    (order) => (

                      <div
                        className="recent-order"
                        key={order._id}
                      >

                        <div className="order-id">

                          <strong>
                            #{order.orderId}
                          </strong>

                        </div>

                        <div className="order-table">

                          <span className="table-number">
                            T{order.tableNumber}
                          </span>

                          <span>
                            Table
                          </span>

                        </div>

                        <div className="order-items">

                          {order.items?.length || 0}{" "}
                          {(order.items?.length || 0) === 1
                            ? "item"
                            : "items"}

                        </div>

                        <div className="order-amount">

                          ₹
                          {Number(
                            order.totalPrice || 0
                          ).toLocaleString("en-IN")}

                        </div>

                        <div>

                          <span
                            className={`status-badge ${
                              order.status
                                ?.toLowerCase()
                                .replaceAll(
                                  " ",
                                  "-"
                                )
                            }`}
                          >
                            {order.status}
                          </span>

                        </div>

                      </div>

                    )
                  )}

                </div>

                {recentOrders.length > 5 && (
                  <div className="orders-footer">

                    <button
                      className="orders-expand-button"
                      onClick={() =>
                        setShowMoreOrders(
                          !showMoreOrders
                        )
                      }
                    >
                      {showMoreOrders
                        ? "Show less ↑"
                        : `View all ${recentOrders.length} orders →`}
                    </button>

                  </div>
                )}

              </>
            )}

          </div>

        </section>

        {/* =====================================
            PERFORMANCE GRID
        ===================================== */}

        <section className="performance-grid">

          {/* TOP SELLERS */}

          <div className="dashboard-card">

            <div className="card-header">

              <div>
                <span className="card-eyebrow">
                  MENU PERFORMANCE
                </span>

                <h2>
                  Best sellers
                </h2>
              </div>

              <span className="card-meta">
                Top 5 items
              </span>

            </div>

            <div className="best-sellers-card">

              {topFoods.length === 0 ? (
                <div className="empty-dashboard">

                  <div>
                    🍽️
                  </div>

                  <h3>
                    No food sales yet
                  </h3>

                  <p>
                    Your best-selling menu
                    items will appear here.
                  </p>

                </div>
              ) : (
                <div className="best-sellers-list">

                  {topFoods
                    .slice(0, 5)
                    .map(
                      (food, index) => (

                        <div
                          className="best-seller-row"
                          key={food._id}
                        >

                          <div className="food-position">
                            {String(
                              index + 1
                            ).padStart(2, "0")}
                          </div>

                          <div className="food-placeholder">
                            🍴
                          </div>

                          <div className="food-info">

                            <strong>
                              {food._id}
                            </strong>

                            <span>
                              {food.quantity} sold
                            </span>

                          </div>

                          <div className="food-revenue">

                            <strong>
                              ₹
                              {Number(
                                food.revenue || 0
                              ).toLocaleString("en-IN")}
                            </strong>

                            <span>
                              Revenue
                            </span>

                          </div>

                        </div>

                      )
                    )}

                </div>
              )}

            </div>

          </div>

          {/* CATEGORY */}

          <div className="dashboard-card category-card">

            <div className="card-header">

              <div>
                <span className="card-eyebrow">
                  SALES BREAKDOWN
                </span>

                <h2>
                  Sales by category
                </h2>
              </div>

              <span className="card-meta">
                {categoryPerformance.length} categories
              </span>

            </div>

            <div className="category-performance-container">

              {categoryPerformance.length === 0 ? (
                <div className="empty-dashboard">

                  <div>
                    🏷️
                  </div>

                  <h3>
                    No category data yet
                  </h3>

                  <p>
                    Category sales will appear
                    after customers place orders.
                  </p>

                </div>
              ) : (
                <CategoryPerformance
                  categories={
                    categoryPerformance
                  }
                />
              )}

            </div>

          </div>

        </section>

        {/* =====================================
            DETAILED ANALYTICS
        ===================================== */}

        <section className="dashboard-section analytics-section">

          <div className="section-heading">

            <div>
              <span>
                DEEPER INSIGHTS
              </span>

              <h2>
                Business analytics
              </h2>
            </div>

            <span className="section-meta">
              Click to explore
            </span>

          </div>

          <div className="dashboard-accordion">

            {/* FOOD PERFORMANCE */}

            <div
              className={`accordion-card ${
                expandedSection ===
                "foodPerformance"
                  ? "expanded"
                  : ""
              }`}
            >

              <button
                className="accordion-header"
                onClick={() =>
                  toggleSection(
                    "foodPerformance"
                  )
                }
              >

                <div className="accordion-title">

                  <div className="accordion-icon">
                    📊
                  </div>

                  <div>

                    <h3>
                      Food performance
                    </h3>

                    <p>
                      Analyze your menu item
                      performance
                    </p>

                  </div>

                </div>

                <div className="accordion-right">

                  <span className="accordion-count">
                    {foodPerformance.length}
                  </span>

                  <span className="accordion-arrow">
                    {expandedSection ===
                    "foodPerformance"
                      ? "−"
                      : "+"}
                  </span>

                </div>

              </button>

              {expandedSection ===
                "foodPerformance" && (
                <div className="accordion-content">

                  <FoodPerformance
                    foods={
                      topFoodPerformance
                    }
                  />

                </div>
              )}

            </div>

            {/* CATEGORY PERFORMANCE */}

            <div
              className={`accordion-card ${
                expandedSection ===
                "categoryPerformance"
                  ? "expanded"
                  : ""
              }`}
            >

              <button
                className="accordion-header"
                onClick={() =>
                  toggleSection(
                    "categoryPerformance"
                  )
                }
              >

                <div className="accordion-title">

                  <div className="accordion-icon">
                    🏷️
                  </div>

                  <div>

                    <h3>
                      Category performance
                    </h3>

                    <p>
                      Compare revenue across
                      food categories
                    </p>

                  </div>

                </div>

                <div className="accordion-right">

                  <span className="accordion-count">
                    {categoryPerformance.length}
                  </span>

                  <span className="accordion-arrow">
                    {expandedSection ===
                    "categoryPerformance"
                      ? "−"
                      : "+"}
                  </span>

                </div>

              </button>

              {expandedSection ===
                "categoryPerformance" && (
                <div className="accordion-content">

                  <CategoryPerformance
                    categories={
                      categoryPerformance
                    }
                  />

                </div>
              )}

            </div>

            {/* PEAK HOURS */}

            <div
              className={`accordion-card ${
                expandedSection ===
                "peakHours"
                  ? "expanded"
                  : ""
              }`}
            >

              <button
                className="accordion-header"
                onClick={() =>
                  toggleSection(
                    "peakHours"
                  )
                }
              >

                <div className="accordion-title">

                  <div className="accordion-icon">
                    🕐
                  </div>

                  <div>

                    <h3>
                      Peak ordering hours
                    </h3>

                    <p>
                      Understand when customers
                      place orders
                    </p>

                  </div>

                </div>

                <div className="accordion-right">

                  <span className="accordion-count">
                    {peakHours.length}
                  </span>

                  <span className="accordion-arrow">
                    {expandedSection ===
                    "peakHours"
                      ? "−"
                      : "+"}
                  </span>

                </div>

              </button>

              {expandedSection ===
                "peakHours" && (
                <div className="accordion-content">

                  <PeakHours
                    hours={peakHours}
                  />

                </div>
              )}

            </div>

          </div>

        </section>

      </main>
    </div>
  );
}

export default AdminDashboard;