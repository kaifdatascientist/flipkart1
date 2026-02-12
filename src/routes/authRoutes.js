const express = require("express");
const { register, login } = require("../controllers/authController");

const router = express.Router();

// Informational GET endpoints so visiting these in a browser shows a helpful message
// (the API uses POST for these actions).
router.get("/register", (req, res) => {
	res.status(200).json({
		message:
			"POST /register with JSON {name, email, password} to create an account.",
	});
});

router.get("/login", (req, res) => {
	res.status(200).json({
		message:
			"POST /login with JSON {email, password} to authenticate and receive a token.",
	});
});

router.post("/register", register);
router.post("/login", login);

module.exports = router;
