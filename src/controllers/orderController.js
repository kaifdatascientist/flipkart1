const Order = require("../models/Order");
const Product = require("../models/Product");
const { startCourier } = require("../socket/courierSimulator");

/**
 * =========================
 * PLACE ORDER (USER)
 * =========================
 * - User clicks Buy Now
 * - Order created with PENDING status
 * - Seller is detected from product
 */
exports.placeOrder = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    let totalAmount = 0;
    let sellerId = null;
    const productsWithPrice = [];

    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      totalAmount += product.price * item.quantity;
      sellerId = product.seller || product.createdBy;

      productsWithPrice.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    const order = await Order.create({
      user: req.user.id,
      seller: sellerId,
      products: productsWithPrice,
      totalAmount,
      status: "PENDING",
    });

    // 🔔 Notify ADMIN about new order
    const io = req.app.get("io");
    io.to("admins").emit("new-order", order);

    res.status(201).json({
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.error("Place order error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * =========================
 * USER: MY ORDERS
 * =========================
 */
exports.myOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("products.product")
      .populate("seller", "name email");

    res.json(orders);
  } catch (error) {
    console.error("My orders error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * =========================
 * SELLER: VIEW ORDERS
 * =========================
 */
exports.sellerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ seller: req.user.id })
      .populate("user", "name email")
      .populate("products.product");

    res.json(orders);
  } catch (error) {
    console.error("Seller orders error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * =========================
 * SELLER: UPDATE STATUS
 * =========================
 * - CONFIRMED → start courier
 * - REJECTED / DELIVERED → update only
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["CONFIRMED", "REJECTED", "DELIVERED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    order.status = status;
    await order.save();

    const io = req.app.get("io");

    // 🚚 START COURIER WHEN CONFIRMED
 



    // 🔔 Notify USER
    io.to(order.user.toString()).emit("order-status-updated", {
      orderId: order._id,
      status: order.status,
    });

    res.json({
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ error: error.message });
  }
};
