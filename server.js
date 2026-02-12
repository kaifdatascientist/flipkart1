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


// ================== ALLOWED ORIGINS ==================
const allowedOrigins = [
  "http://localhost:3000",
  "https://flipkart-frontend-beta.vercel.app", // ← your real frontend
  "https://flipkart1-f0oe.onrender.com" // ← backend Render domain (allow testing from this origin)
];


// ================== SOCKET.IO ==================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// make io globally accessible
app.set("io", io);


// ================== COURIER STORE ==================
const activeCouriers = {};


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

  socket.on("join-order", (orderId) => {
    socket.join(orderId);
    console.log("📦 Joined order room:", orderId);
  });

  socket.on("start-courier", ({ orderId, userLat, userLng }) => {
    console.log("🚀 Starting courier for:", orderId);
    startCourier(io, orderId, userLat, userLng);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});


// ================== COURIER SIMULATION ==================
function startCourierSimulation(orderId, userLat, userLng) {
  if (activeCouriers[orderId]) return;

  let courierLat = userLat + 0.02;
  let courierLng = userLng + 0.02;

  console.log(`🚚 Courier started for order ${orderId}`);

  const interval = setInterval(() => {
    courierLat -= 0.001;
    courierLng -= 0.001;

    io.to(orderId).emit("courier-location", {
      orderId,
      lat: courierLat,
      lng: courierLng,
    });

    console.log(
      `📍 Courier → ${orderId}: ${courierLat.toFixed(4)}, ${courierLng.toFixed(4)}`
    );

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

app.set("startCourierSimulation", startCourierSimulation);


// ================== EXPRESS CORS ==================
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);


// ================== MIDDLEWARE ==================
app.use(express.json());

// Health endpoint for quick checks (Render and browsers)
app.get("/", (req, res) => res.status(200).send("OK"));

// Debug route: list registered routes (temporary)
app.get("/__routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // routes registered directly on the app
      const methods = Object.keys(middleware.route.methods).join(',');
      routes.push({ path: middleware.route.path, methods });
    } else if (middleware.name === 'router') {
      // router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods).join(',');
          routes.push({ path: handler.route.path, methods });
        }
      });
    }
  });
  res.json(routes);
});


// ================== ROUTES ==================
// Auth endpoints at root: /register, /login
app.use("/", authRoutes);

// Products endpoints at /products
app.use("/products", productRoutes);

// Orders endpoints at /orders
app.use("/orders", orderRoutes);


// ================== DATABASE ==================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);


// ================== SERVER START ==================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () =>
  console.log(`🚀 Server running with Socket.IO on port ${PORT}`)
);
