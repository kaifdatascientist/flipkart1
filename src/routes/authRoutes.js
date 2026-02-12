const express = require("express");
const { register, login } = require("../controllers/authController");

const router = express.Router();

// Informational GET endpoints so visiting the routes in a browser
// shows a helpful message instead of 404 (API uses POST for these).
router.get("/register", (req, res) => {
	res.status(200).json({
		message:
			"This endpoint accepts POST requests. Send POST /register with JSON {name, email, password} to create an account.",
	});
});

router.get("/login", (req, res) => {
	res.status(200).json({
		message:
			"This endpoint accepts POST requests. Send POST /login with JSON {email, password} to authenticate.",
	});
});

router.post("/register", register);
router.post("/login", login);

module.exports = router;
