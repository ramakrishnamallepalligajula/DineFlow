import express from "express";
import cors from "cors";

import orderRoutes from "./routes/orderRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";
import foodRoutes from "./routes/foodRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

//import path from "path";
//import { fileURLToPath } from "url";

import uploadRoutes from "./routes/uploadRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";



const app = express();
//const __filename = fileURLToPath(import.meta.url);
//const __dirname = path.dirname(__filename);

//app.use(
//  "/uploads",
//  express.static(
//    path.join(__dirname, "../uploads")
//  )
//);

//app.use(
//  cors({
//    origin: process.env.FRONTEND_URL, /*"http://localhost:5173",*/
//  })
//);

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
};

export default app;