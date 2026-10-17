
import dotenv from "dotenv";
dotenv.config();

import http from "node:http";
import { Server } from "socket.io";
import app, { setupRoutes } from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL;

async function startServer() {
  try {
    // Connect to MongoDB before accepting requests.
    await connectDB();

    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: FRONTEND_URL,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      },
    });

    app.set("io", io);
    setupRoutes(io);

    io.on("connection", (socket) => {
      console.log("Socket connected:", socket.id);

      socket.on("join-restaurant", async (restaurantId) => {
        if (!restaurantId) return;

        // Retain the existing restaurant-room behavior.
        const roomName = `restaurant:${String(restaurantId)}`;
        await socket.join(roomName);

        console.log(`${socket.id} joined ${roomName}`);
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
      });
    });

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log("Socket.IO server is ready");
    });
  } catch (error) {
    console.error("Failed to start DineToFlow:", error);
    process.exit(1);
  }
}

startServer();