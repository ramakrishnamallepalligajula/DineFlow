import { io } from "socket.io-client";

const URL = `http://${window.location.hostname}:3000`;

// Reuse one socket even when Vite hot-reloads this file
const socket =
  globalThis.__appSocket ??
  (globalThis.__appSocket = io(URL, { transports: ["websocket"] }));

// TEMPORARY debug: logs every event this browser receives
socket.offAny();
socket.onAny((event, ...args) => console.log("📥 socket event:", event, args));
socket.on("disconnect", (reason) => console.log("🔌 disconnected:", reason));

export default socket;