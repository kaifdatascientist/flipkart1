const Product = require("../models/Product");

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error("getProducts error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch products" });
  }
};

exports.getSellerProducts = async (req, res) => {
  try {
    // Verify user is authenticated (protect middleware already did this, but double-check)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    console.log("Fetching products for seller:", req.user.id);
    
    // Get products by seller field OR createdBy (backward compatibility)
    const products = await Product.find({
      $or: [
        { seller: req.user.id },
        { createdBy: req.user.id }
      ]
    });
    
    console.log(`Found ${products.length} products for seller ${req.user.id}`);
    
    res.json(products);
  } catch (error) {
    console.error("getSellerProducts error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch seller products" });
  }
};

exports.createProduct = async (req, res) => {
  try {
    // Debugging info to help reproduce 500 errors during development
    console.log("createProduct - body:", req.body);
    console.log("createProduct - files:", req.files);

    // Basic validation so we return a helpful 400 instead of a vague 500
    if (!req.body.name || !req.body.price) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    const imageUrls = (req.files || []).map((file) => {
      // multer-storage-cloudinary returns secure_url, url, or path
      return file.secure_url || file.url || file.path;
    }).filter(Boolean);

    if (req.files && req.files.length && imageUrls.length === 0) {
      console.warn("Uploaded files present but no URL field found. File objects:", req.files);
    }

    const product = await Product.create({
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      stock: req.body.stock,
      category: req.body.category,
      
      images: imageUrls,
      seller: req.user.id,
    });

    console.log("Product created:", product);

    // debug: include uploaded files metadata when ?debug=1 is provided
    if (req.query && req.query.debug === "1") {
      return res.status(201).json({ product, files: req.files });
    }

    res.status(201).json(product);
  } catch (error) {
    console.error("createProduct error:", error && error.stack ? error.stack : error);
    // include error.message for easier debugging in dev
    res.status(500).json({ message: error.message || "Product creation failed" });
  }
};


exports.updateProduct = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // If images were uploaded via multer (upload.array("images")), replace images array
    if (req.files && req.files.length) {
      updateData.images = req.files.map((file) => file.secure_url || file.url || file.path).filter(Boolean);
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Product not found" });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Product update failed" });
  }
};

exports.deleteProduct = async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Product deleted" });
};
