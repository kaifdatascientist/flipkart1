const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./src/routes/authRoutes");
const productRoutes = require("./src/routes/productRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const app = express();
const server = http.createServer(app);

// 🔥 Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    "https://your-frontend-url.netlify.app",
    credentials: true,
  },
});

// Make io accessible everywhere
app.set("io", io);

// ================== COURIER STORE ==================
const activeCouriers = {}; // orderId → interval + coords

// ================== SOCKET EVENTS ==================
const { startCourier } = require("./src/socket/courierSimulator");

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("join-user-room", (userId) => {
    socket.join(userId);
  });

  socket.on("join-admin-room", () => {
    socket.join("admins");
  });

  // 👇 JOIN ORDER ROOM
  socket.on("join-order", (orderId) => {
    socket.join(orderId);
    console.log("📦 Joined order room:", orderId);
  });

  // 👇 START COURIER WHEN USER OPENS MAP
  socket.on("start-courier", ({ orderId, userLat, userLng }) => {
    console.log("🚀 Starting courier for:", orderId);
    startCourier(io, orderId, userLat, userLng);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});


// ================== COURIER SIMULATOR ==================
function startCourierSimulation(orderId, userLat, userLng) {
  // Prevent duplicate simulators
  if (activeCouriers[orderId]) return;

  // Start courier slightly away from user
  let courierLat = userLat + 0.02;
  let courierLng = userLng + 0.02;

  console.log(`🚚 Courier started for order ${orderId}`);

  const interval = setInterval(() => {
    // Move courier closer
    courierLat -= 0.001;
    courierLng -= 0.001;

    io.to(orderId).emit("courier-location", {
      orderId,
      lat: courierLat,
      lng: courierLng,
    });

    console.log(
      `📍 Courier → ${orderId}: ${courierLat.toFixed(
        4
      )}, ${courierLng.toFixed(4)}`
    );

    // Stop when near destination
    if (
      Math.abs(courierLat - userLat) < 0.001 &&
      Math.abs(courierLng - userLng) < 0.001
    ) {
      clearInterval(interval);
      delete activeCouriers[orderId];
      console.log(`📦 Courier reached destination for ${orderId}`);
    }
  }, 3000);

  activeCouriers[orderId] = interval;
}

// expose simulator
app.set("startCourierSimulation", startCourierSimulation);

// ================== MIDDLEWARE ==================
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// ================== ROUTES ==================
app.use("/api", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// ================== DATABASE ==================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);

// ================== START ==================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running with Socket.IO on port ${PORT}`)
);
