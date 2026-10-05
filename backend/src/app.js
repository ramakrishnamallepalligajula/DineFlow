import express from "express";
import cors from "cors";

import orderRoutes from "./routes/orderRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";
import foodRoutes from "./routes/foodRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

import uploadRoutes from "./routes/uploadRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

import printerDeviceRoutes from "./routes/printerDeviceRoutes.js";
import printerRoutes from "./routes/printerRoutes.js";
import printerAgentRoutes from "./routes/printerAgentRoutes.js";

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

// Add FRONTEND_URL from environment if it is different
if (
  process.env.FRONTEND_URL &&
  !allowedOrigins.includes(process.env.FRONTEND_URL)
) {
  allowedOrigins.push(
    process.env.FRONTEND_URL
  );
}

console.log(
  "🌐 Allowed CORS origins:",
  allowedOrigins
);

app.use(
  cors({
    origin: function (origin, callback) {

      // Allow requests without an Origin header.
      // Useful for server-to-server requests,
      // Postman, printer agent, etc.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log(
        "❌ CORS blocked origin:",
        origin
      );

      return callback(
        new Error(
          `CORS blocked origin: ${origin}`
        )
      );
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    credentials: true,

    optionsSuccessStatus: 204,
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
  =========================
  PRINTER DEVICES
  =========================
  */

  app.use(
    "/api/printer-devices",
    printerDeviceRoutes
  );

  /*
  =========================
  PRINTERS
  =========================
  */

  app.use(
    "/api/printers",
    printerRoutes
  );

  /*
  =========================
  PRINTER AGENT
  =========================
  */

  app.use(
    "/api/printer-agent",
    printerAgentRoutes
  );
};

export default app;