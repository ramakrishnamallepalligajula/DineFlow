/* eslint-disable no-undef */

/* eslint-disable no-unused-vars */

import { useEffect, useState } from "react";

import "./AdminDashboard.css";

import RevenueChart from "../components/RevenueChart";

import CategoryPerformance from "../components/CategoryPerformance";

import AdminNavigation from "../components/AdminNavigation";

import PrinterManagement from "../components/PrinterManagement";

import OnboardingTour from "../components/onboarding/OnboardingTour";

import { useAuth } from "../context/AuthContext";

import { apiFetch } from "../services/api";

import socket from "../socket";

import { motion } from "motion/react";

import { Armchair, LayoutDashboard } from "lucide-react";





const useCountUp = (target, duration = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const numericTarget = Number(target) || 0;

    if (numericTarget === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCount(0);
      return;
    }

    const startTime = performance.now();
    let animationFrameId;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setCount(Math.floor(numericTarget * easedProgress));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(numericTarget);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration]);

  return count;
};


function AdminDashboard() {







  const [dashboard, setDashboard] = useState(null);



  const { restaurant } = useAuth();





  const [revenueData, setRevenueData] = useState([]);







  const [foodPerformance, setFoodPerformance] =



    useState([]);







  const [categoryPerformance, setCategoryPerformance] =



    useState([]);







  const [peakHours, setPeakHours] = useState([]);







  const [revenueDays, setRevenueDays] = useState(7);







  const [showMoreOrders, setShowMoreOrders] =



    useState(false);



  const [expandedSessionIds, setExpandedSessionIds] =



    useState(new Set());







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

  const animatedRevenue = useCountUp(
    dashboard?.stats?.todayRevenue ?? 0,
    1200
  );

  const animatedTodayOrders = useCountUp(
    dashboard?.stats?.todayOrders ?? 0,
    900
  );

  const animatedActiveOrders = useCountUp(
    dashboard?.stats?.activeOrders ?? 0,
    800
  );

  const animatedTotalOrders = useCountUp(
    dashboard?.stats?.totalOrders ?? 0,
    1000
  );

  const animatedTables = useCountUp(
    dashboard?.stats?.totalTables ?? 0,
    700
  );





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



        \========================= */







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



        \========================= */







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



        \========================= */







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



        \========================= */







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



        \========================= */







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



    \========================= */







    const handleDashboardRefresh = () => {



      loadDashboard();



    };







    socket.on("new-order", handleDashboardRefresh);



    socket.on("dining-session-updated", handleDashboardRefresh);



    socket.on("bill-requested", handleDashboardRefresh);



    socket.on("order-status-updated", handleDashboardRefresh);







    return () => {



      socket.off("new-order", handleDashboardRefresh);



      socket.off("dining-session-updated", handleDashboardRefresh);



      socket.off("bill-requested", handleDashboardRefresh);



      socket.off("order-status-updated", handleDashboardRefresh);



    };



  }, [revenueDays]);





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

  const recentOrders =



    dashboard?.recentOrders || [];







  const activeSessions =



    dashboard?.activeSessions || [];







  const toggleSession = (sessionId) => {



    setExpandedSessionIds((current) => {



      const next = new Set(current);



      if (next.has(sessionId)) {



        next.delete(sessionId);



      } else {



        next.add(sessionId);



      }



      return next;



    });



  };







  const visibleOrders =



    recentOrders.slice(



      0,



      showMoreOrders ? 10 : 5



    );







  const topFoodPerformance =



    foodPerformance.slice(0, 5);







  const topFoods =



    dashboard?.topFoods || [];



  // =========================================

// SUBSCRIPTION INFO

// =========================================



const subscription =

  restaurant?.subscription || null;



const subscriptionStatus = String(

  subscription?.status || ""

).toUpperCase();



const planType =

  subscription?.plan?.type || null;



const billingPeriod =

  subscription?.billingPeriod || null;



const getDaysRemaining = (date) => {

  if (!date) {

    return null;

  }



  const endDate = new Date(date);



  if (Number.isNaN(endDate.getTime())) {

    return null;

  }



  const now = new Date();



  const difference =

    endDate.getTime() - now.getTime();



  return Math.max(

    0,

    Math.ceil(

      difference / (1000 * 60 * 60 * 24)

    )

  );

};



const trialDaysRemaining =

  getDaysRemaining(

    subscription?.trialEndsAt

  );



const planDaysRemaining =

  getDaysRemaining(

    subscription?.currentPeriodEnd

  );



const formatSubscriptionDate = (date) => {

  if (!date) {

    return "—";

  }



  const parsedDate = new Date(date);



  if (Number.isNaN(parsedDate.getTime())) {

    return "—";

  }



  return parsedDate.toLocaleDateString(

    "en-IN",

    {

      day: "numeric",

      month: "short",

      year: "numeric",

    }

  );

};



const getPlanName = () => {

  if (!planType) {

    return "FREE TRIAL";

  }



  return String(planType)

    .toUpperCase();

};



const getBillingLabel = () => {

  if (!billingPeriod) {

    return "";

  }



  return String(billingPeriod)

    .toLowerCase()

    .replace(

      /^\w/,

      (letter) => letter.toUpperCase()

    );

};



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



          </div>







        </header>







{/* =====================================

    KPI CARDS

===================================== */}



<section className="dashboard-section">
  <div className="section-heading">
    <div>
      <span>TODAY</span>
      <h2>Business snapshot</h2>
    </div>
  </div>

  <motion.div
    className="kpi-grid"
    initial="hidden"
    animate="visible"
    variants={{
      hidden: {},
      visible: {
        transition: { staggerChildren: 0.1 },
      },
    }}
  >
    {/* REVENUE */}
    <motion.div
      className="kpi-card kpi-revenue"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: "easeOut" },
        },
      }}
      whileHover={{
        y: -5,
        scale: 1.015,
        transition: { duration: 0.2 },
      }}
    >
      <div className="kpi-top">
        <motion.div
          className="kpi-icon"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          ₹
        </motion.div>
        <span>TODAY'S REVENUE</span>
      </div>
      <strong className="kpi-number">
        ₹{animatedRevenue.toLocaleString("en-IN")}
      </strong>
      <small>Revenue generated today</small>
    </motion.div>

    {/* TODAY'S ORDERS */}
    <motion.div
      className="kpi-card"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: "easeOut" },
        },
      }}
      whileHover={{
        y: -5,
        scale: 1.015,
        transition: { duration: 0.2 },
      }}
    >
      <div className="kpi-top">
        <motion.div
          className="kpi-icon"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          #
        </motion.div>
        <span>TODAY'S ORDERS</span>
      </div>
      <strong className="kpi-number">{animatedTodayOrders}</strong>
      <small>Orders received today</small>
    </motion.div>

    {/* ACTIVE ORDERS */}
    <motion.div
      className="kpi-card"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: "easeOut" },
        },
      }}
      whileHover={{
        y: -5,
        scale: 1.015,
        transition: { duration: 0.2 },
      }}
    >
      <div className="kpi-top">
        <motion.div
          className="kpi-icon active"
          animate={{ scale: [1, 1.12, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          ●
        </motion.div>
        <span>ACTIVE ORDERS</span>
      </div>
      <strong className="kpi-number">{animatedActiveOrders}</strong>
      <small>Currently being processed</small>
    </motion.div>

    {/* TOTAL ORDERS */}
    <motion.div
      className="kpi-card"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: "easeOut" },
        },
      }}
      whileHover={{
        y: -5,
        scale: 1.015,
        transition: { duration: 0.2 },
      }}
    >
      <div className="kpi-top">
        <motion.div
          className="kpi-icon"
          animate={{ x: [0, 2, 0], y: [0, -2, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          ↗
        </motion.div>
        <span>TOTAL ORDERS</span>
      </div>
      <strong className="kpi-number">{animatedTotalOrders}</strong>
      <small>Orders recorded</small>
    </motion.div>

    {/* TABLES */}
    <motion.div
      className="kpi-card"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: "easeOut" },
        },
      }}
      whileHover={{
        y: -5,
        scale: 1.015,
        transition: { duration: 0.2 },
      }}
    >
      <div className="kpi-top">
        <motion.div
          className="kpi-icon"
          whileHover={{ scale: 1.12, rotate: 3 }}
        >
          <Armchair size={20} strokeWidth={2} />
        </motion.div>
        <span>TABLES</span>
      </div>
      <strong className="kpi-number">{animatedTables}</strong>
      <small>Restaurant tables</small>
    </motion.div>
  </motion.div>
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







      <div className="dashboard-card subscription-card">



  <div className="card-header">



    <div>

      <span className="card-eyebrow">

        PLAN & BILLING

      </span>



      <h2>

        Subscription

      </h2>

    </div>



    <div className="activity-icon">

      💳

    </div>



  </div>





  {/* CURRENT PLAN */}



  <div

    style={{

      display: "flex",

      alignItems: "center",

      justifyContent: "space-between",

      gap: "12px",

      padding: "16px 0",

      borderBottom: "1px solid #eee3d9",

    }}

  >



    <div>



      <span

        style={{

          display: "block",

          color: "#968378",

          fontSize: "10px",

          fontWeight: 700,

          marginBottom: "5px",

          letterSpacing: "0.5px",

        }}

      >

        CURRENT PLAN

      </span>



      <h3

        style={{

          margin: 0,

          color: "#34241c",

          fontSize: "22px",

          fontWeight: 800,

        }}

      >

        {getPlanName()}

      </h3>



      {getBillingLabel() && (

        <span

          style={{

            display: "block",

            marginTop: "4px",

            color: "#968378",

            fontSize: "11px",

          }}

        >

          {getBillingLabel()} billing

        </span>

      )}



    </div>





    <span

      style={{

        padding: "7px 11px",

        borderRadius: "999px",

        background:

          subscriptionStatus === "ACTIVE"

            ? "#e8f8ed"

            : subscriptionStatus === "TRIALING"

              ? "#fff4df"

              : "#f3f3f3",

        color:

          subscriptionStatus === "ACTIVE"

            ? "#218838"

            : subscriptionStatus === "TRIALING"

              ? "#b56b00"

              : "#777",

        fontSize: "10px",

        fontWeight: 800,

      }}

    >

      {subscriptionStatus === "ACTIVE"

        ? "ACTIVE"

        : subscriptionStatus === "TRIALING"

          ? "TRIAL"

          : subscriptionStatus || "NO PLAN"}

    </span>



  </div>





  {/* FREE TRIAL */}



  <div

    style={{

      display: "flex",

      alignItems: "center",

      justifyContent: "space-between",

      gap: "12px",

      padding: "16px 0",

      borderBottom: "1px solid #eee3d9",

    }}

  >



    <div

      style={{

        display: "flex",

        alignItems: "center",

        gap: "12px",

      }}

    >



      <div

        style={{

          width: "38px",

          height: "38px",

          display: "flex",

          alignItems: "center",

          justifyContent: "center",

          borderRadius: "10px",

          background: "#fff4df",

          fontSize: "18px",

        }}

      >

        🎁

      </div>



      <div>



        <strong

          style={{

            display: "block",

            color: "#4b382d",

            fontSize: "12px",

          }}

        >

          Free trial

        </strong>



        <span

          style={{

            display: "block",

            marginTop: "3px",

            color: "#968378",

            fontSize: "10px",

          }}

        >

          {subscription?.trialEndsAt

            ? `Ends ${formatSubscriptionDate(

                subscription.trialEndsAt

              )}`

            : "No trial information"}

        </span>



      </div>



    </div>





    <strong

      style={{

        color:

          subscriptionStatus === "TRIALING"

            ? "#d97732"

            : "#6f6259",

        fontSize: "12px",

        whiteSpace: "nowrap",

      }}

    >

      {subscription?.trialEndsAt

        ? subscriptionStatus === "TRIALING"

          ? trialDaysRemaining === 0

            ? "Ends today"

            : `${trialDaysRemaining} days left`

          : "Completed"

        : "—"}

    </strong>



  </div>





  {/* ACTIVE PLAN */}



  <div

    style={{

      display: "flex",

      alignItems: "center",

      justifyContent: "space-between",

      gap: "12px",

      padding: "16px 0",

    }}

  >



    <div

      style={{

        display: "flex",

        alignItems: "center",

        gap: "12px",

      }}

    >



      <div

        style={{

          width: "38px",

          height: "38px",

          display: "flex",

          alignItems: "center",

          justifyContent: "center",

          borderRadius: "10px",

          background: "#e8f8ed",

          fontSize: "18px",

        }}

      >

        💳

      </div>



      <div>



        <strong

          style={{

            display: "block",

            color: "#4b382d",

            fontSize: "12px",

          }}

        >

          Active plan

        </strong>



        <span

          style={{

            display: "block",

            marginTop: "3px",

            color: "#968378",

            fontSize: "10px",

          }}

        >

          {subscription?.currentPeriodEnd

            ? `Ends ${formatSubscriptionDate(

                subscription.currentPeriodEnd

              )}`

            : subscriptionStatus === "TRIALING"

              ? "Starts after trial"

              : "No active plan"}

        </span>



      </div>



    </div>





    <div

      style={{

        textAlign: "right",

      }}

    >



      <strong

        style={{

          display: "block",

          color:

            subscriptionStatus === "ACTIVE"

              ? "#218838"

              : "#6f6259",

          fontSize: "12px",

          whiteSpace: "nowrap",

        }}

      >

        {subscriptionStatus === "ACTIVE"

          ? planDaysRemaining === 0

            ? "Ends today"

            : `${planDaysRemaining} days left`

          : subscriptionStatus === "TRIALING"

            ? "Not active"

            : "—"}

      </strong>



    </div>



  </div>





  {/* STATUS MESSAGE */}



  {subscriptionStatus === "TRIALING" && (

    <div

      style={{

        padding: "11px 12px",

        borderRadius: "10px",

        background: "#fff8ed",

        color: "#8a6334",

        fontSize: "11px",

        lineHeight: 1.4,

      }}

    >

      🎁 Your free trial is currently active.

    </div>

  )}



  {subscriptionStatus === "ACTIVE" && (

    <div

      style={{

        padding: "11px 12px",

        borderRadius: "10px",

        background: "#f1faf4",

        color: "#39724a",

        fontSize: "11px",

        lineHeight: 1.4,

      }}

    >

      ✓ Your DineFlow subscription is active.

    </div>

  )}



  {(subscriptionStatus === "EXPIRED" ||

    subscriptionStatus === "CANCELLED") && (

    <div

      style={{

        padding: "11px 12px",

        borderRadius: "10px",

        background: "#fff1e6",

        color: "#b44d1d",

        fontSize: "11px",

        lineHeight: 1.4,

      }}

    >

      ⚠️ Your subscription needs attention.

    </div>

  )}



</div>          





        </section>







        {/* =====================================

            ACTIVE DINING SESSIONS

        ===================================== */}



        <section className="dashboard-section active-dining-section">

          <div className="section-heading">

            <div>

              <span>LIVE OPERATIONS</span>

              <h2>Active dining sessions</h2>

              <p className="active-dining-subtitle">

                One card per occupied table. Additional orders update the same session.

              </p>

            </div>

            <button

              className="active-dining-refresh"

              onClick={() => window.location.reload()}

            >

              ↻ Refresh

            </button>

          </div>



          {activeSessions.length === 0 ? (

            <div className="active-dining-empty">

              <strong>No active dining sessions</strong>

              <span>Customer orders will appear here automatically.</span>

            </div>

          ) : (

            <div className="active-dining-grid">

              {activeSessions.map((session) => {

                const expanded = expandedSessionIds.has(session.sessionId);

                const billRequested = session.status === "bill_requested";

                return (

                  <article className={`active-dining-card${billRequested ? " bill-requested" : ""}`} key={session.sessionId}>

                    <div className="active-dining-card-header">

                      <div>

                        <span className="active-dining-label">TABLE</span>

                        <h3>{session.tableNumber}</h3>

                      </div>

                      <span className={`active-dining-status ${billRequested ? "bill" : "open"}`}>

                        {billRequested ? "BILL REQUESTED" : "OPEN"}

                      </span>

                    </div>



                    <div className="active-dining-metrics">

                      <div><span>Orders</span><strong>{session.orderCount}</strong></div>

                      <div><span>Items</span><strong>{session.totalItems}</strong></div>

                      <div><span>Total</span><strong>₹{Number(session.totalPrice || 0).toLocaleString("en-IN")}</strong></div>

                    </div>



                    {billRequested && (

                      <div className="active-dining-bill-alert">

                        🔔 Customer has requested the final bill.

                      </div>

                    )}



                    <button className="active-dining-orders-button" onClick={() => toggleSession(session.sessionId)}>

                      {expanded ? "Hide orders" : "View orders"}

                    </button>



                    {expanded && (

                      <div className="active-dining-order-list">

                        {session.orders.map((order) => (

                          <div className="active-dining-order" key={order._id}>

                            <div className="active-dining-order-top">

                              <strong>Order {order.orderSequence}</strong>

                              <strong>₹{Number(order.totalPrice || 0).toLocaleString("en-IN")}</strong>

                            </div>

                            {order.items.map((item, itemIndex) => (

                              <div className="active-dining-item" key={`${order._id}-${item.id || itemIndex}`}>

                                <span>{item.name} × {item.quantity}</span>

                                <strong>₹{Number(item.total || 0).toLocaleString("en-IN")}</strong>

                              </div>

                            ))}

                          </div>

                        ))}

                      </div>

                    )}

                  </article>

                );

              })}

            </div>

          )}

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



                            \#{order.orderId}



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

      </main>

      <OnboardingTour

      restaurantId={restaurant?._id}

    />



    </div>



  );



}







export default AdminDashboard;