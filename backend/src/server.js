import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import app, {
  setupRoutes,
} from "./app.js";

import connectDB from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

// =========================
// MONGODB
// =========================

connectDB();

// =========================
// CREATE HTTP SERVER
// =========================

const server = http.createServer(app);

// =========================
// SOCKET.IO
// =========================

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
    ],
  },
});

// =========================
// CONNECT ROUTES TO SOCKET.IO
// =========================

setupRoutes(io);
// =========================
// START SERVER
// =========================

server.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );

  console.log(
    "Socket.IO server is ready ⚡"
  );
});

// =========================
// SOCKET CONNECTION
// =========================

io.on("connection", (socket) => {
  console.log(
    "⚡ Socket connected:",
    socket.id
  );

  // =========================
  // JOIN RESTAURANT ROOM
  // =========================

  socket.on("join-restaurant", async (restaurantId) => {
    if (!restaurantId) {
      console.log(
        "❌ Restaurant ID missing"
      );
      return;
    }

    const roomName =
      `restaurant:${String(restaurantId)}`;

    await socket.join(roomName);

    console.log(
      `🏪 Socket ${socket.id} joined ${roomName}`
    );

    // Check who is actually inside the room
    const socketsInRoom =
      await io.in(roomName).fetchSockets();

    console.log(
      `👥 Sockets currently in ${roomName}:`,
      socketsInRoom.map(
        (connectedSocket) =>
          connectedSocket.id
      )
    );
  });

  // =========================
  // DISCONNECT
  // =========================

  socket.on("disconnect", () => {
    console.log(
      "🔌 Socket disconnected:",
      socket.id
    );
  });
});