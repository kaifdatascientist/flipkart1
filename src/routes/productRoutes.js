const express = require("express");
const {
  getProducts,
  getSellerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

// PUBLIC
router.get("/products", getProducts);

// SELLER – GET OWN PRODUCTS (must be before /:id route)
router.get("/products/seller/me", protect, getSellerProducts);

// ADMIN ONLY – CREATE PRODUCT WITH 1–10 IMAGES
router.post(
  "/products",
  protect,
  adminOnly,
  upload.array("images", 10), 
  createProduct
);

// ADMIN ONLY – UPDATE / DELETE (allow image upload)
router.put("/products/:id", protect, adminOnly, upload.array("images", 10), updateProduct);
router.delete("/products/:id", protect, adminOnly, deleteProduct);

module.exports = router;
