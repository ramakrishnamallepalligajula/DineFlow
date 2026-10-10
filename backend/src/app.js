import "dotenv/config";
import express from "express";
import cors from "cors";

import orderRoutes from "./routes/orderRoutes.js";
import foodRoutes from "./routes/foodRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

import uploadRoutes from "./routes/uploadRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

import billPaymentRoutes from "./routes/billPaymentRoutes.js";
import billRoutes from "./routes/billRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";

const app = express();

/*
=========================================================
CORS CONFIGURATION
=========================================================
*/

const allowedOrigins = [
  "http://localhost:5173",
  "https://localhost:5173",
  "https://dinetoflow.in",
  "https://www.dinetoflow.in",
];

if (
  process.env.FRONTEND_URL &&
  !allowedOrigins.includes(process.env.FRONTEND_URL)
) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

console.log("🌐 Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as server-to-server requests
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked for origin: ${origin}`)
      );
    },
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Order-Recovery-Token",
    ],
  })
);

app.use(express.json());

/*
=========================================================
HEALTH CHECK
=========================================================
*/

app.get("/", (req, res) => {
  res.json({
    message:
      "Restaurant API is running 🚀",
  });
});

/*
=========================================================
ROUTES
=========================================================
*/

export const setupRoutes = (io) => {

  console.log(
    "🔥 setupRoutes() CALLED"
  );

  console.log(
    "🔥 Registering TABLE routes"
  );

  /*
  =========================
  TABLES
  =========================
  */

  app.use(
    "/api/tables",
    tableRoutes
  );

  /*
  =========================
  ORDERS
  =========================
  */

  app.use(
    "/api/orders",
    orderRoutes(io)
  );

  /*
  =========================
  FOODS
  =========================
  */

  app.use(
    "/api/foods",
    foodRoutes
  );

  /*
  =========================
  UPLOADS
  =========================
  */

  app.use(
    "/api/uploads",
    uploadRoutes
  );

  /*
  =========================
  ANALYTICS
  =========================
  */

  app.use(
    "/api/analytics",
    analyticsRoutes
  );

  /*
  =========================
  REPORTS
  =========================
  */

  app.use(
    "/api/reports",
    reportRoutes
  );

  /*
  =========================
  AUTH
  =========================
  */

  app.use(
    "/api/auth",
    authRoutes
  );

  /*
  =========================
  RESTAURANTS
  =========================
  */

  app.use(
    "/api/restaurants",
    restaurantRoutes
  );

  /*
  =========================
  SUBSCRIPTIONS
  =========================
  */

  app.use(
    "/api/subscriptions",
    subscriptionRoutes
  );

  /*
  =========================
  PAYMENTS
  =========================
  */

  app.use(
    "/api/payments",
    paymentRoutes
  );

  /*
   =======================
   ROZORPAY
   ======================= 
  */

  app.use(
    "/api/bill-payments",
    billPaymentRoutes
  );

  /*
  =======================
  BILL HISTORY
  =======================
  */

  app.use(
    "/api/bills", 
    billRoutes
  );
};

export default app;