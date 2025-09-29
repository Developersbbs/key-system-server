// middlewares/auth.js
const admin = require("../config/firebase");
const User = require("../models/User");

const COOKIE_NAME = process.env.COOKIE_NAME || "session";

async function auth(req, res, next) {
  try {
    const sessionCookie = req.cookies?.[COOKIE_NAME];
    const authHeader = req.headers.authorization || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    let decoded;
    if (sessionCookie) {
      decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
    } else if (bearer) {
      decoded = await admin.auth().verifyIdToken(bearer, true);
    } else {
      return res.status(401).json({ message: "Unauthorized: No token" });
    }

    // 🔹 Attach Firebase info
    req.firebase = {
      uid: decoded.uid,
      email: decoded.email || null,
      phoneNumber: decoded.phone_number || null,
    };

    // 🔹 Ensure Mongo user exists
    let user = await User.findOne({ firebaseUID: decoded.uid });
    if (!user) {
      user = await User.create({
        firebaseUID: decoded.uid,
        email: decoded.email || null,
        name: decoded.name || "Anonymous",
        role: "member",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ message: "Unauthorized: Invalid/expired token" });
  }
}

module.exports = auth;
