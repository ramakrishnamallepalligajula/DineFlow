import { useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">

      {/* =========================
          NAVBAR
      ========================= */}

      <header className="home-navbar">

        <div
          className="home-logo"
          onClick={() => navigate("/")}
        >
          <div className="home-logo-icon">
            🍽️
          </div>

          <div>
            <div className="home-logo-name">
              DineFlow
            </div>

            <div className="home-logo-tagline">
              Restaurant OS
            </div>
          </div>
        </div>

        <nav className="home-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <div className="home-nav-actions">

          <button
            className="home-login-button"
            onClick={() => navigate("/login")}
          >
            Login
          </button>

          <button
            className="home-nav-cta"
            onClick={() => navigate("/register")}
          >
            Get Started
          </button>

        </div>

      </header>


      {/* =========================
          HERO
      ========================= */}

      <main>

        <section className="home-hero">

          <div className="home-hero-content">

            <div className="home-badge">
              <span className="home-badge-dot"></span>
              Built for modern restaurants
            </div>

            <h1>
              Run your restaurant.
              <span> Not your paperwork.</span>
            </h1>

            <p>
              DineFlow brings QR ordering, kitchen operations,
              menu management, tables, staff and business insights
              into one simple restaurant operating system.
            </p>

            <div className="home-hero-actions">

              <button
                className="home-primary-button"
                onClick={() => navigate("/register")}
              >
                Start Your Restaurant
                <span>→</span>
              </button>

              <button
                className="home-secondary-button"
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
              >
                See How It Works
              </button>

            </div>

            <div className="home-hero-note">
              <span>✓</span>
              Setup in minutes
              <span>✓</span>
              No complicated hardware
            </div>

          </div>


          {/* DASHBOARD PREVIEW */}

          <div className="home-dashboard-wrapper">

            <div className="home-dashboard-glow"></div>

            <div className="home-dashboard">

              <div className="home-dashboard-top">

                <div>
                  <span className="home-dashboard-label">
                    TODAY
                  </span>

                  <h3>
                    Good evening 👋
                  </h3>
                </div>

                <div className="home-dashboard-profile">
                  RK
                </div>

              </div>


              <div className="home-stats">

                <div className="home-stat-card">
                  <span>Orders</span>
                  <strong>128</strong>
                  <small>↑ 18.4%</small>
                </div>

                <div className="home-stat-card">
                  <span>Revenue</span>
                  <strong>₹24.8K</strong>
                  <small>↑ 12.8%</small>
                </div>

                <div className="home-stat-card">
                  <span>Active</span>
                  <strong>12</strong>
                  <small className="home-stat-orange">
                    Live now
                  </small>
                </div>

              </div>


              <div className="home-dashboard-body">

                <div className="home-chart-card">

                  <div className="home-card-header">
                    <div>
                      <strong>Revenue</strong>
                      <span>Last 7 days</span>
                    </div>

                    <span className="home-chart-value">
                      ₹86.4K
                    </span>
                  </div>

                  <div className="home-chart">

                    <div className="home-chart-line line-one"></div>
                    <div className="home-chart-line line-two"></div>
                    <div className="home-chart-line line-three"></div>

                    <div className="home-chart-bars">
                      <span style={{ height: "35%" }}></span>
                      <span style={{ height: "52%" }}></span>
                      <span style={{ height: "43%" }}></span>
                      <span style={{ height: "68%" }}></span>
                      <span style={{ height: "55%" }}></span>
                      <span style={{ height: "82%" }}></span>
                      <span style={{ height: "94%" }}></span>
                    </div>

                  </div>

                </div>


                <div className="home-orders-card">

                  <div className="home-card-header">
                    <div>
                      <strong>Live Orders</strong>
                      <span>Kitchen</span>
                    </div>

                    <div className="home-live-dot">
                      LIVE
                    </div>
                  </div>

                  <div className="home-order">
                    <div className="home-order-icon">
                      🍔
                    </div>

                    <div>
                      <strong>#1048</strong>
                      <span>Table 08 · 3 items</span>
                    </div>

                    <b>Preparing</b>
                  </div>

                  <div className="home-order">
                    <div className="home-order-icon">
                      🍕
                    </div>

                    <div>
                      <strong>#1047</strong>
                      <span>Table 03 · 2 items</span>
                    </div>

                    <b className="ready">
                      Ready
                    </b>
                  </div>

                  <div className="home-order">
                    <div className="home-order-icon">
                      🍜
                    </div>

                    <div>
                      <strong>#1046</strong>
                      <span>Table 12 · 4 items</span>
                    </div>

                    <b>
                      Preparing
                    </b>
                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =========================
            TRUST STRIP
        ========================= */}

        <section className="home-trust">

          <span>Everything your restaurant needs to operate smarter.</span>

          <div>
            <b>QR Ordering</b>
            <b>Kitchen</b>
            <b>Tables</b>
            <b>Menu</b>
            <b>Analytics</b>
          </div>

        </section>


        {/* =========================
            HOW IT WORKS
        ========================= */}

        <section
          className="home-section home-how"
          id="how-it-works"
        >

          <div className="home-section-heading">

            <span className="home-section-eyebrow">
              HOW IT WORKS
            </span>

            <h2>
              From table to kitchen,
              <br />
              without the chaos.
            </h2>

            <p>
              DineFlow connects the entire ordering journey
              so your team can focus on serving guests.
            </p>

          </div>


          <div className="home-steps">

            <div className="home-step">

              <div className="home-step-number">
                01
              </div>

              <div className="home-step-icon">
                📱
              </div>

              <h3>
                Guest scans QR
              </h3>

              <p>
                Customers scan the QR code at their table
                and instantly open your digital menu.
              </p>

            </div>


            <div className="home-step">

              <div className="home-step-number">
                02
              </div>

              <div className="home-step-icon">
                🛒
              </div>

              <h3>
                Customer orders
              </h3>

              <p>
                Guests browse your menu, add items and
                place their order directly from their phone.
              </p>

            </div>


            <div className="home-step">

              <div className="home-step-number">
                03
              </div>

              <div className="home-step-icon">
                👨‍🍳
              </div>

              <h3>
                Kitchen receives
              </h3>

              <p>
                Orders appear instantly in the kitchen,
                keeping your staff synchronized.
              </p>

            </div>


            <div className="home-step">

              <div className="home-step-number">
                04
              </div>

              <div className="home-step-icon">
                📊
              </div>

              <h3>
                Owner understands
              </h3>

              <p>
                Track orders, revenue, menu performance
                and restaurant activity from one dashboard.
              </p>

            </div>

          </div>

        </section>


        {/* =========================
            FEATURES
        ========================= */}

        <section
          className="home-section home-features"
          id="features"
        >

          <div className="home-section-heading">

            <span className="home-section-eyebrow">
              ONE PLATFORM
            </span>

            <h2>
              Everything your restaurant needs.
            </h2>

            <p>
              Replace disconnected tools with one operating
              system built around the way restaurants actually work.
            </p>

          </div>


          <div className="home-feature-grid">

            <div className="home-feature-card home-feature-large">

              <div className="home-feature-icon">
                📱
              </div>

              <div>
                <span className="home-feature-label">
                  CUSTOMER EXPERIENCE
                </span>

                <h3>
                  QR ordering that just works.
                </h3>

                <p>
                  Give every table a digital ordering experience.
                  No app downloads. No waiting for menus.
                </p>
              </div>

              <div className="home-phone-preview">
                <div className="home-phone">
                  <div className="home-phone-notch"></div>

                  <span>YOUR MENU</span>

                  <strong>
                    Today's Specials
                  </strong>

                  <div className="home-phone-food">
                    <span>🍕</span>
                    <div>
                      <b>Margherita Pizza</b>
                      <small>₹299</small>
                    </div>
                  </div>

                  <div className="home-phone-food">
                    <span>🍔</span>
                    <div>
                      <b>Classic Burger</b>
                      <small>₹249</small>
                    </div>
                  </div>

                </div>
              </div>

            </div>


            <div className="home-feature-card">

              <div className="home-feature-icon">
                👨‍🍳
              </div>

              <span className="home-feature-label">
                OPERATIONS
              </span>

              <h3>
                Keep the kitchen moving.
              </h3>

              <p>
                Live orders flow directly to your kitchen
                so your team always knows what comes next.
              </p>

              <div className="home-mini-status">
                <span></span>
                12 orders in progress
              </div>

            </div>


            <div className="home-feature-card">

              <div className="home-feature-icon">
                📊
              </div>

              <span className="home-feature-label">
                BUSINESS INTELLIGENCE
              </span>

              <h3>
                Know your numbers.
              </h3>

              <p>
                Understand revenue, orders, popular items
                and restaurant activity at a glance.
              </p>

              <div className="home-mini-bars">
                <span style={{ height: "35%" }}></span>
                <span style={{ height: "60%" }}></span>
                <span style={{ height: "45%" }}></span>
                <span style={{ height: "80%" }}></span>
                <span style={{ height: "68%" }}></span>
                <span style={{ height: "92%" }}></span>
              </div>

            </div>


            <div className="home-feature-card">

              <div className="home-feature-icon">
                👥
              </div>

              <span className="home-feature-label">
                TEAM
              </span>

              <h3>
                Give your team the right tools.
              </h3>

              <p>
                Manage staff access and keep everyone
                focused on their part of the operation.
              </p>

            </div>


            <div className="home-feature-card">

              <div className="home-feature-icon">
                🪑
              </div>

              <span className="home-feature-label">
                TABLES
              </span>

              <h3>
                Every table, organized.
              </h3>

              <p>
                Generate QR codes and manage your
                restaurant's tables from one place.
              </p>

            </div>


            <div className="home-feature-card">

              <div className="home-feature-icon">
                🍔
              </div>

              <span className="home-feature-label">
                MENU
              </span>

              <h3>
                Your menu, under control.
              </h3>

              <p>
                Add dishes, update prices, manage availability
                and keep your digital menu current.
              </p>

            </div>

          </div>

        </section>


        {/* =========================
            OPERATING SYSTEM
        ========================= */}

        <section className="home-os-section">

          <div className="home-os-content">

            <span className="home-section-eyebrow">
              YOUR RESTAURANT. ONE SYSTEM.
            </span>

            <h2>
              Less switching.
              <br />
              More serving.
            </h2>

            <p>
              DineFlow connects the front of house,
              kitchen and owner into one continuous workflow.
            </p>

            <div className="home-os-list">

              <div>
                <span>✓</span>
                Orders move instantly to the kitchen
              </div>

              <div>
                <span>✓</span>
                Restaurant data stays connected
              </div>

              <div>
                <span>✓</span>
                Staff see only what they need
              </div>

              <div>
                <span>✓</span>
                Owners get one clear view of the business
              </div>

            </div>

            <button
              className="home-primary-button"
              onClick={() => navigate("/register")}
            >
              Build Your Restaurant
              <span>→</span>
            </button>

          </div>


          <div className="home-os-visual">

            <div className="home-os-window">

              <div className="home-os-window-top">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <div className="home-os-window-content">

                <div className="home-os-sidebar">
                  <strong>DF</strong>
                  <i>▦</i>
                  <i>⌁</i>
                  <i>◫</i>
                  <i>⚙</i>
                </div>

                <div className="home-os-main">

                  <span>OVERVIEW</span>

                  <h3>
                    Restaurant performance
                  </h3>

                  <div className="home-os-metrics">

                    <div>
                      <small>ORDERS</small>
                      <strong>1,284</strong>
                    </div>

                    <div>
                      <small>REVENUE</small>
                      <strong>₹2.48L</strong>
                    </div>

                  </div>

                  <div className="home-os-graph">
                    <span style={{ height: "30%" }}></span>
                    <span style={{ height: "48%" }}></span>
                    <span style={{ height: "38%" }}></span>
                    <span style={{ height: "65%" }}></span>
                    <span style={{ height: "55%" }}></span>
                    <span style={{ height: "76%" }}></span>
                    <span style={{ height: "91%" }}></span>
                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =========================
            PRICING
        ========================= */}

        <section
          className="home-section home-pricing"
          id="pricing"
        >

          <div className="home-section-heading">

            <span className="home-section-eyebrow">
              SIMPLE PRICING
            </span>

            <h2>
              Start simple. Grow with DineFlow.
            </h2>

            <p>
              Choose the setup that fits your restaurant today.
            </p>

          </div>


          <div className="home-pricing-card">

            <div>
              <span className="home-pricing-label">
                STARTER
              </span>

              <h3>
                Restaurant OS
              </h3>

              <p>
                Everything you need to digitize your
                restaurant ordering workflow.
              </p>
            </div>

            <div className="home-pricing-features">

              <span>✓ QR ordering</span>
              <span>✓ Digital menu</span>
              <span>✓ Kitchen dashboard</span>
              <span>✓ Table management</span>
              <span>✓ Order tracking</span>
              <span>✓ Restaurant dashboard</span>

            </div>

            <button
              onClick={() => navigate("/register")}
            >
              Get Started
              <span>→</span>
            </button>

          </div>

        </section>


        {/* =========================
            FINAL CTA
        ========================= */}

        <section className="home-final-cta">

          <div className="home-final-cta-content">

            <span className="home-section-eyebrow">
              READY WHEN YOU ARE
            </span>

            <h2>
              Your restaurant deserves
              <br />
              a better operating system.
            </h2>

            <p>
              Bring ordering, operations and insights
              together with DineFlow.
            </p>

            <button
              className="home-primary-button"
              onClick={() => navigate("/register")}
            >
              Start with DineFlow
              <span>→</span>
            </button>

          </div>

        </section>

      </main>


      {/* =========================
          FOOTER
      ========================= */}

      <footer className="home-footer">

        <div className="home-footer-brand">

          <div className="home-logo">

            <div className="home-logo-icon">
              🍽️
            </div>

            <div>
              <div className="home-logo-name">
                DineFlow
              </div>

              <div className="home-logo-tagline">
                Restaurant OS
              </div>
            </div>

          </div>

          <p>
            The operating system for modern restaurants.
          </p>

        </div>


        <div className="home-footer-links">

          <div>
            <strong>PRODUCT</strong>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>

          <div>
            <strong>ACCOUNT</strong>
            <button onClick={() => navigate("/login")}>
              Login
            </button>
            <button onClick={() => navigate("/register")}>
              Get Started
            </button>
          </div>

        </div>

      </footer>


      <div className="home-footer-bottom">
        © 2026 DineFlow. Restaurant OS.
      </div>

    </div>
  );
}

export default Home;