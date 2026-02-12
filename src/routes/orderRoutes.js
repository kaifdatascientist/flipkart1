const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  placeOrder,
  myOrders,
  sellerOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

// USER
router.post("/place", protect, placeOrder);
router.get("/my", protect, myOrders);

// SELLER
router.get("/seller", protect, sellerOrders);
router.put("/:id/status", protect, updateOrderStatus);

module.exports = router;
