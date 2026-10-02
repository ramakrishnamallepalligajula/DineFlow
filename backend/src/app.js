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


const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Restaurant API is running 🚀",
  });
});

export const setupRoutes = (io) => {
  console.log("🔥 setupRoutes() CALLED");

  console.log("🔥 Registering TABLE routes");

  app.use(
    "/api/tables",
    tableRoutes
  );
  
  app.use(
    "/api/orders",
    orderRoutes(io)
  );

  app.use(
    "/api/foods",
    foodRoutes
  );

  app.use(
    "/api/uploads",
    uploadRoutes
  );

  app.use(
    "/api/analytics", 
    analyticsRoutes
  );

  app.use(
    "/api/reports", 
    reportRoutes
  );

  app.use(
    "/api/auth", 
    authRoutes
  );
  
  app.use(
    "/api/restaurants",
    restaurantRoutes
  );
  app.use(
    "/api/subscriptions",
    subscriptionRoutes
  );
  app.use(
    "/api/payments",
    paymentRoutes
  );
};

export default app;