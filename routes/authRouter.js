// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const {
  register,
  login,
  logout,
  getProfile,
} = require("../controllers/authController");
const authController = require("../controllers/authController");

router.post("/register", authController.register);

router.post("/login", authController.login);
router.post("/logout", auth, authController.logout);
router.get("/me", auth, authController.getProfile);

module.exports = router;
