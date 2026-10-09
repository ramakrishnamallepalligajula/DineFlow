import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import dineToFlowImage from "../assets/DineToFlow-new.png";

import {
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

import "./Home.css";




const flowStages = [

  {

    number: "01",

    label: "CUSTOMER",

    title: "Scan the QR",

    text: "The guest scans the DineFlow code at the table.",

    status: "Waiting for guest",

  },

  {

    number: "02",

    label: "MENU",

    title: "Menu opens",

    text: "The restaurant menu appears instantly on the guest's phone.",

    status: "Menu ready",

  },

  {

    number: "03",

    label: "ORDER",

    title: "Order placed",

    text: "The guest selects items and sends the order to the kitchen.",

    status: "Order #1048 placed",

  },

  {

    number: "04",

    label: "KITCHEN",

    title: "Kitchen accepts",

    text: "The kitchen receives the order and starts preparing it.",

    status: "Preparing order",

  },

  {

    number: "05",

    label: "SERVICE",

    title: "Serve the table",

    text: "The team sees when it is ready and serves the guest.",

    status: "Ready to serve",

  },

];



const features = [

  {

    eyebrow: "GUEST EXPERIENCE",

    title: "Ordering that feels effortless.",

    text: "Give every table a fast digital menu and ordering experience.",

    icon: "⌁",

  },

  {

    eyebrow: "KITCHEN",

    title: "Every order, exactly where it belongs.",

    text: "Keep kitchen staff synchronized with live order status and KOT workflows.",

    icon: "◉",

  },

  {

    eyebrow: "MENU",

    title: "Change once. Update everywhere.",

    text: "Manage dishes, prices, categories and availability from one place.",

    icon: "□",

  },

  {

    eyebrow: "TABLES",

    title: "Know every table at a glance.",

    text: "Create tables, pair codes and understand what is happening on the floor.",

    icon: "○",

  },

  {

    eyebrow: "TEAM",

    title: "Everyone sees what they need.",

    text: "Keep staff access simple and give each role the right tools.",

    icon: "△",

  },

  {

    eyebrow: "ANALYTICS",

    title: "Turn orders into decisions.",

    text: "See revenue, order activity and restaurant performance from one dashboard.",

    icon: "↗",

  },

];



function PhoneMockup() {

  return (

    <div className="df-phone">

      <div className="df-phone-speaker" />

      <div className="df-phone-screen">

        <div className="df-phone-top">

          <span>DineFlow</span>

          <span className="df-phone-live">● LIVE</span>

        </div>



        <div className="df-phone-title">Good evening</div>

        <div className="df-phone-subtitle">Table 05 · Your table menu</div>



        <div className="df-menu-item">

          <div className="df-food-image food-one" />

          <div>

            <strong>Chicken Biryani</strong>

            <span>₹220</span>

          </div>

          <button>+</button>

        </div>



        <div className="df-menu-item">

          <div className="df-food-image food-two" />

          <div>

            <strong>Paneer Tikka</strong>

            <span>₹220</span>

          </div>

          <button>+</button>

        </div>



        <div className="df-menu-item">

          <div className="df-food-image food-three" />

          <div>

            <strong>Pasta Alfredo</strong>

            <span>₹230</span>

          </div>

          <button>+</button>

        </div>



        <div className="df-cart-bar">

          <span>3 items</span>

          <strong>₹670</strong>

          <b>View cart →</b>

        </div>

      </div>

    </div>

  );

}



function KitchenMockup() {

  return (

    <div className="df-kitchen">

      <div className="df-kitchen-top">

        <div>

          <span className="df-kicker">KITCHEN</span>

          <strong>Live orders</strong>

        </div>

        <span className="df-live-pill">●  LIVE</span>

      </div>



      <div className="df-kitchen-columns">

        <div>

          <small>NEW · 03</small>

          <div className="df-order-card active">

            <strong>#1048 · TABLE 08</strong>

            <span>Chicken Biryani × 2</span>

            <span>Paneer Tikka × 1</span>

            <b>Start preparing</b>

          </div>

        </div>



        <div>

          <small>PREPARING · 02</small>

          <div className="df-order-card">

            <strong>#1047 · TABLE 03</strong>

            <span>Pizza × 1</span>

            <span>Cold Coffee × 2</span>

            <b>12 min</b>

          </div>

        </div>



        <div>

          <small>READY · 04</small>

          <div className="df-order-card ready-card">

            <strong>#1046 · TABLE 12</strong>

            <span>Veg Noodles × 2</span>

            <span>Spring Roll × 1</span>

            <b>Ready</b>

          </div>

        </div>

      </div>

    </div>

  );

}



function DashboardMockup() {

  return (

    <div className="df-dashboard">

      <div className="df-dashboard-sidebar">

        <div className="df-mini-logo">DF</div>

        <span className="selected">⌂</span>

        <span>□</span>

        <span>◫</span>

        <span>○</span>

        <span>↗</span>

        <span>⚙</span>

      </div>



      <div className="df-dashboard-main">

        <div className="df-dashboard-header">

          <div>

            <span className="df-kicker">TODAY</span>

            <h3>Restaurant overview</h3>

          </div>

          <div className="df-avatar">RK</div>

        </div>



        <div className="df-metric-row">

          <div>

            <span>ORDERS</span>

            <strong>128</strong>

            <b>+18.4%</b>

          </div>

          <div>

            <span>REVENUE</span>

            <strong>₹24.8K</strong>

            <b>+12.8%</b>

          </div>

          <div>

            <span>ACTIVE TABLES</span>

            <strong>12</strong>

            <b className="orange">Live now</b>

          </div>

        </div>



        <div className="df-dashboard-grid">

          <div className="df-revenue">

            <div className="df-chart-head">

              <div>

                <strong>Revenue</strong>

                <span>Last 7 days</span>

              </div>

              <b>₹86.4K</b>

            </div>

            <div className="df-chart">

              {[34, 48, 41, 64, 55, 78, 92].map((height, index) => (

                <motion.i

                  key={index}

                  initial={{ height: 0 }}

                  whileInView={{ height: `${height}%` }}

                  viewport={{ once: true }}

                  transition={{ delay: index * 0.06, duration: 0.65 }}

                />

              ))}

            </div>

          </div>



          <div className="df-live-orders">

            <div className="df-chart-head">

              <div>

                <strong>Live orders</strong>

                <span>Kitchen</span>

              </div>

              <b className="orange">LIVE</b>

            </div>

            <div className="df-live-order-row">

              <span>🍛</span>

              <div>

                <strong>#1048</strong>

                <small>Table 08 · 3 items</small>

              </div>

              <b>Preparing</b>

            </div>

            <div className="df-live-order-row">

              <span>🍕</span>

              <div>

                <strong>#1047</strong>

                <small>Table 03 · 2 items</small>

              </div>

              <b className="green">Ready</b>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}





function OrderFlowDemo() {

  const [activeStage, setActiveStage] = useState(0);

  const [isPaused, setIsPaused] = useState(false);



  useEffect(() => {

    if (isPaused) return undefined;



const timer = window.setInterval(() => {
      setActiveStage((current) => (current + 1) % flowStages.length);

    }, 3200);



    return () => window.clearInterval(timer);

  }, [isPaused]);



  const stage = flowStages[activeStage];



  return (

    <div

      className="df-live-flow"

      onMouseEnter={() => setIsPaused(true)}

      onMouseLeave={() => setIsPaused(false)}

    >

      <div className="df-live-flow-head">

        <div>

          <span className="df-section-label">LIVE ORDER JOURNEY</span>

          <h3>Watch an order move through DineFlow.</h3>

        </div>

        <span className="df-live-indicator">

          <i />

          LIVE

        </span>

      </div>



      <div className="df-flow-stage-selector" role="tablist" aria-label="Order journey stages">

        {flowStages.map((item, index) => (

          <button

            key={item.number}

            type="button"

            className={activeStage === index ? "active" : ""}

            onClick={() => setActiveStage(index)}

            role="tab"

            aria-selected={activeStage === index}

          >

            <span>{item.number}</span>

            {item.label}

          </button>

        ))}

      </div>



      <div className="df-live-scene">

        <div className="df-scene-node df-customer-node">

          <motion.div

            className="df-scene-phone"

            animate={{

              y: activeStage === 0 || activeStage === 1 ? [0, -7, 0] : 0,

              rotate: activeStage === 0 ? [-1, 1, -1] : 0,

            }}

            transition={{

              duration: 2.2,

              repeat: activeStage <= 1 ? Infinity : 0,

              ease: "easeInOut",

            }}

          >

            <div className="df-scene-notch" />

            <div className="df-scene-phone-screen">

              <div className="df-scene-status">

                <span>DineFlow</span>

                <small>Table 05</small>

              </div>



              <motion.div

                className="df-qr-screen"

                animate={{

                  opacity: activeStage === 0 ? 1 : 0,

                  scale: activeStage === 0 ? 1 : 0.94,

                }}

              >

               
<div className="df-large-qr">
  {Array.from({ length: 49 }).map((_, i) => (
    <i
      key={i}
      className={i % 2 === 0 || i % 5 === 0 ? "on" : ""}
    />
  ))}
</div>


                <strong>Scan to order</strong>

                <span>TABLE 05</span>

              </motion.div>



              <motion.div

                className="df-menu-screen"

                animate={{

                  opacity: activeStage >= 1 ? 1 : 0,

                  x: activeStage >= 1 ? 0 : 18,

                }}

              >

                <span className="df-screen-kicker">YOUR MENU</span>

                <strong>Good evening</strong>



                <div className="df-screen-food">

                  <span className="df-food-thumb one" />

                  <div>

                    <b>Chicken Biryani</b>

                    <small>₹220</small>

                  </div>

                  <em>+</em>

                </div>



                <div className="df-screen-food">

                  <span className="df-food-thumb two" />

                  <div>

                    <b>Paneer Tikka</b>

                    <small>₹220</small>

                  </div>

                  <em>+</em>

                </div>



                <motion.div

                  className="df-screen-order"

                  animate={{

                    opacity: activeStage >= 2 ? 1 : 0,

                    y: activeStage >= 2 ? 0 : 12,

                  }}

                >

                  <span>2 items</span>

                  <b>₹440</b>

                  <strong>Order placed ✓</strong>

                </motion.div>

              </motion.div>

            </div>

          </motion.div>



          <span className="df-scene-label">CUSTOMER</span>

          <strong>Guest phone</strong>

        </div>



        <div className="df-flow-connection">

          <motion.div

            className="df-flow-orbit"

            animate={{

              x: activeStage >= 2 ? ["0%", "100%", "0%"] : "0%",

              opacity: activeStage >= 2 ? [0.25, 1, 0.25] : 0.35,

            }}

            transition={{

              duration: 2.2,

              repeat: activeStage >= 2 ? Infinity : 0,

              ease: "easeInOut",

            }}

          />

          <div className="df-connection-line" />

          <span>{stage.status}</span>

        </div>



        <div className="df-scene-node df-kitchen-node">

          <motion.div

            className="df-kitchen-screen"

            animate={{

              scale: activeStage >= 3 ? [1, 1.012, 1] : 1,

            }}

            transition={{

              duration: 1.5,

              repeat: activeStage >= 3 ? Infinity : 0,

            }}

          >

            <div className="df-mini-window-bar">

              <i />

              <i />

              <i />

              <span>KITCHEN · DINEFLOW</span>

            </div>



            <div className="df-kitchen-screen-head">

              <div>

                <span>LIVE KITCHEN</span>

                <strong>Order #1048</strong>

              </div>

              <b className={activeStage >= 4 ? "ready" : ""}>

                {activeStage >= 4 ? "READY" : activeStage >= 3 ? "PREPARING" : "NEW"}

              </b>

            </div>



            <div className="df-kitchen-order">

              <div>

                <span>02 ×</span>

                <strong>Chicken Biryani</strong>

              </div>

              <small>Table 05</small>

            </div>



            <div className="df-kitchen-order">

              <div>

                <span>01 ×</span>

                <strong>Paneer Tikka</strong>

              </div>

              <small>Table 05</small>

            </div>



            <motion.div

              className="df-kitchen-action"

              animate={{

                opacity: activeStage >= 3 ? 1 : 0.4,

              }}

            >

              {activeStage >= 4 ? "✓ Order ready — serve table" : "Accept & start preparing →"}

            </motion.div>

          </motion.div>



          <span className="df-scene-label">KITCHEN</span>

          <strong>KOT / Kitchen screen</strong>

        </div>

      </div>



      <div className="df-live-caption" aria-live="polite">

        <div>

          <span>{stage.number}</span>

          <small>{stage.label}</small>

        </div>

        <div>

          <strong>{stage.title}</strong>

          <p>{stage.text}</p>

        </div>

        <button

          type="button"

          onClick={() => setActiveStage((activeStage + 1) % flowStages.length)}

        >

          Next step <span>→</span>

        </button>

      </div>

    </div>

  );

}



function Home() {

  const navigate = useNavigate();

  const heroRef = useRef(null);



  const { scrollYProgress } = useScroll({

    target: heroRef,

    offset: ["start start", "end start"],

  });



  const heroPhoneY = useTransform(scrollYProgress, [0, 1], [0, 160]);

  const heroPhoneRotate = useTransform(scrollYProgress, [0, 1], [4, -2]);

  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const smoothPhoneY = useSpring(heroPhoneY, {

    stiffness: 90,

    damping: 20,

  });



  const scrollTo = (id) => {

    document.getElementById(id)?.scrollIntoView({

      behavior: "smooth",

      block: "start",

    });

  };



  return (

    <div className="dineflow-page">

      <header className="df-navbar">

        <button className="df-brand" onClick={() => navigate("/")}>

          <span className="df-brand-mark">DF</span>

          <span>

            <strong>DineFlow</strong>

            <small>RESTAURANT OS</small>

          </span>

        </button>



        <nav>

          <button onClick={() => scrollTo("story")}>How it works</button>

          <button onClick={() => scrollTo("features")}>Features</button>

          <button onClick={() => scrollTo("pricing")}>Pricing</button>

        </nav>



        <div className="df-nav-actions">

          <button className="df-login" onClick={() => navigate("/login")}>

            Login

          </button>

          <button className="df-nav-cta" onClick={() => navigate("/register")}>

            Get started <span>↗</span>

          </button>

        </div>

      </header>

      <main>
        <div className="df-top-banner">
          <img
  src={dineToFlowImage}
  alt="DineToFlow - Order, Kitchen, Serve, Grow"
/>
        </div>

        <section className="df-hero" ref={heroRef}>

          <div className="df-hero-backdrop" />



          <div className="df-hero-content">

            <motion.div

              className="df-eyebrow"

              initial={{ opacity: 0, y: 18 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ duration: 0.7 }}

            >

              RESTAURANT OPERATING SYSTEM

            </motion.div>



            <motion.h1

              initial={{ opacity: 0, y: 30 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ duration: 0.8, delay: 0.08 }}

            >

              Every table

              <br />

              has a story.

              <em>DineFlow</em>

              <br />

              connects them all.

            </motion.h1>



            <motion.p

              initial={{ opacity: 0, y: 22 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ duration: 0.7, delay: 0.18 }}

            >

              From the first scan to the final payment, DineFlow connects

              ordering, kitchen operations, tables, staff and insights in one

              continuous flow.

            </motion.p>



            <motion.div

              className="df-hero-actions"

              initial={{ opacity: 0, y: 18 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ duration: 0.7, delay: 0.28 }}

            >

              <button

                className="df-button-primary"

                onClick={() => navigate("/register")}

              >

                Start with DineFlow <span>→</span>

              </button>

              <button

                className="df-button-ghost"

                onClick={() => scrollTo("story")}

              >

                See the flow <span>↓</span>

              </button>

            </motion.div>



            <motion.div

              className="df-hero-meta"

              initial={{ opacity: 0 }}

              animate={{ opacity: 1 }}

              transition={{ duration: 0.8, delay: 0.42 }}

            >

              <span>● Setup in minutes</span>

              <span>◌ No app download</span>

              <span>◇ Works across devices</span>

            </motion.div>

          </div>



          <motion.div

            className="df-hero-product"

            style={{

              y: smoothPhoneY,

              rotate: heroPhoneRotate,

              opacity: heroOpacity,

            }}

          >

            <div className="df-qr-card">

              <div className="df-qr-grid">

                {Array.from({ length: 49 }).map((_, i) => (

                  <i key={i} className={i % 3 === 0 || i % 7 === 0 ? "on" : ""} />

                ))}

              </div>

              <strong>DineFlow</strong>

              <span>SCAN TO ORDER</span>

              <small>TABLE 05</small>

            </div>



            <PhoneMockup />



            <motion.div

              className="df-floating-note note-one"

              animate={{ y: [0, -8, 0] }}

              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}

            >

              <span>01</span>

              Guest scans

            </motion.div>



            <motion.div

              className="df-floating-note note-two"

              animate={{ y: [0, 8, 0] }}

              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}

            >

              <span>02</span>

              Order arrives

            </motion.div>

          </motion.div>

        </section>



        <section className="df-story" id="story">

          <div className="df-section-heading">

            <span className="df-section-label">THE DINEFLOW STORY</span>

            <h2>

              From scan

              <br />

              <em>to serve.</em>

            </h2>

            <p>

              This is what DineFlow does behind the scenes: the guest starts

              the journey, the order travels to the kitchen, and your team

              takes it from there.

            </p>

          </div>



          <OrderFlowDemo />

        </section>



        <section className="df-kitchen-section">

          <div className="df-kitchen-copy">

            <span className="df-section-label">BEHIND THE SCENES</span>

            <h2>

              When the guest

              <br />

              <em>presses order,</em>

              <br />

              the kitchen already knows.

            </h2>

            <p>

              No running between tables. No handwritten slips. No guessing

              what comes next. Orders move from the guest's phone to your

              kitchen workflow in seconds.

            </p>

            <div className="df-check-list">

              <span>✓ Real-time order updates</span>

              <span>✓ KOT-ready workflow</span>

              <span>✓ Clear order status</span>

            </div>

          </div>



          <motion.div

            className="df-kitchen-visual"

            initial={{ opacity: 0, x: 50 }}

            whileInView={{ opacity: 1, x: 0 }}

            viewport={{ once: true, amount: 0.25 }}

            transition={{ duration: 0.8 }}

          >

            <KitchenMockup />

          </motion.div>

        </section>



        <section className="df-features" id="features">

          <div className="df-section-heading centered">

            <span className="df-section-label">ONE SYSTEM</span>

            <h2>

              Everything connected.

              <br />

              <em>Nothing scattered.</em>

            </h2>

            <p>

              DineFlow brings the moving parts of your restaurant into one

              operating system.

            </p>

          </div>



          <div className="df-feature-grid">

            {features.map((feature, index) => (

              <motion.article

                className={`df-feature-card ${index === 0 ? "featured" : ""}`}

                key={feature.title}

                initial={{ opacity: 0, y: 25 }}

                whileInView={{ opacity: 1, y: 0 }}

                viewport={{ once: true, amount: 0.2 }}

                transition={{ duration: 0.6, delay: (index % 3) * 0.08 }}

                whileHover={{ y: -6 }}

              >

                <div className="df-feature-icon">{feature.icon}</div>

                <span>{feature.eyebrow}</span>

                <h3>{feature.title}</h3>

                <p>{feature.text}</p>

                <div className="df-feature-arrow">↗</div>

              </motion.article>

            ))}

          </div>

        </section>



        <section className="df-owner-section">

          <div className="df-owner-copy">

            <span className="df-section-label">FOR THE OWNER</span>

            <h2>

              Stop chasing

              <br />

              <em>the restaurant.</em>

            </h2>

            <p>

              Open DineFlow and see what matters: orders, revenue, tables and

              activity. Your restaurant keeps moving while you get the clarity

              to make better decisions.

            </p>



            <div className="df-owner-metrics">

              <div>

                <strong>128</strong>

                <span>Orders today</span>

              </div>

              <div>

                <strong>₹24.8K</strong>

                <span>Revenue today</span>

              </div>

              <div>

                <strong>12</strong>

                <span>Active tables</span>

              </div>

            </div>

          </div>



          <motion.div

            className="df-dashboard-wrap"

            initial={{ opacity: 0, scale: 0.94, x: 40 }}

            whileInView={{ opacity: 1, scale: 1, x: 0 }}

            viewport={{ once: true, amount: 0.2 }}

            transition={{ duration: 0.85 }}

          >

            <DashboardMockup />

          </motion.div>

        </section>



        <section className="df-proof">

          <div className="df-proof-number">

            <span>BUILT AROUND THE RESTAURANT</span>

            <strong>One flow.</strong>

          </div>



          <div className="df-proof-items">

            <div>

              <strong>QR</strong>

              <span>Ordering</span>

            </div>

            <div>

              <strong>KOT</strong>

              <span>Kitchen</span>

            </div>

            <div>

              <strong>POS</strong>

              <span>Operations</span>

            </div>

            <div>

              <strong>BI</strong>

              <span>Insights</span>

            </div>

          </div>

        </section>



        <section className="df-pricing" id="pricing">

          <div className="df-pricing-copy">

            <span className="df-section-label">SIMPLE BY DESIGN</span>

            <h2>

              Start small.

              <br />

              <em>Grow without switching.</em>

            </h2>

            <p>

              Give your restaurant one connected system today and expand as

              your operation grows.

            </p>

          </div>



          <motion.div

            className="df-price-card"

            initial={{ opacity: 0, y: 30 }}

            whileInView={{ opacity: 1, y: 0 }}

            viewport={{ once: true, amount: 0.3 }}

            transition={{ duration: 0.7 }}

          >

            <span className="df-price-label">RESTAURANT OS</span>

            <h3>Everything you need to start.</h3>

            <p>

              QR ordering, digital menu, kitchen workflow, tables, order

              tracking and restaurant dashboard.

            </p>



            <div className="df-price-features">

              <span>✓ QR ordering</span>

              <span>✓ Digital menu</span>

              <span>✓ Kitchen operations</span>

              <span>✓ Table management</span>

              <span>✓ Order tracking</span>

              <span>✓ Business dashboard</span>

            </div>



            <button

              className="df-button-primary"

              onClick={() => navigate("/register")}

            >

              Get started <span>→</span>

            </button>

          </motion.div>

        </section>



        <section className="df-final-cta">

          <div className="df-final-glow" />

          <span className="df-section-label">THE NEXT TABLE IS YOURS</span>

          <h2>

            Your restaurant.

            <br />

            <em>One connected flow.</em>

          </h2>

          <p>

            Bring ordering, kitchen operations and business insights together

            with DineFlow.

          </p>

          <button

            className="df-button-primary"

            onClick={() => navigate("/register")}

          >

            Start with DineFlow <span>→</span>

          </button>

        </section>

      </main>



      <footer className="df-footer">

        <div className="df-footer-brand">

          <button className="df-brand" onClick={() => navigate("/")}>

            <span className="df-brand-mark">DF</span>

            <span>

              <strong>DineFlow</strong>

              <small>RESTAURANT OS</small>

            </span>

          </button>

          <p>The operating system for modern restaurants.</p>

        </div>



        <div className="df-footer-links">

          <div>

            <span>PRODUCT</span>

            <button onClick={() => scrollTo("features")}>Features</button>

            <button onClick={() => scrollTo("story")}>How it works</button>

            <button onClick={() => scrollTo("pricing")}>Pricing</button>

          </div>

          <div>

            <span>ACCOUNT</span>

            <button onClick={() => navigate("/login")}>Login</button>

            <button onClick={() => navigate("/register")}>Get started</button>

          </div>

        </div>



        <div className="df-footer-bottom">

          © 2026 DineFlow. Restaurant OS.

        </div>

      </footer>

    </div>

  );

}



export default Home;
