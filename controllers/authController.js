const admin = require("../config/firebase");
const User = require("../models/User");

const COOKIE_NAME = process.env.COOKIE_NAME || "session";
const isProd = process.env.NODE_ENV === "production";

// Helper to set Firebase session cookie
async function setSessionCookie(res, idToken, rememberMe) {
  const expiresInMs = rememberMe ? 5 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
  const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn: expiresInMs });
  res.cookie(COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax", // 'none' required for cross-origin cookies in production
    maxAge: expiresInMs,
    path: "/",
  });
}

// --- REGISTER ---
exports.register = async (req, res) => {
  try {
    const { idToken, name, email, phoneNumber } = req.body;
    if (!idToken || !name || !phoneNumber) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    let formattedPhone = phoneNumber.startsWith("+91") ? phoneNumber : `+91${phoneNumber}`;

    let existingUser = await User.findOne({ phoneNumber: formattedPhone });
    if (existingUser) {
      return res.status(409).json({ message: "This phone number is already registered. Please login." });
    }

    const decoded = await admin.auth().verifyIdToken(idToken, true);
    const uid = decoded.uid;

    const newUser = {
      firebaseUID: uid,
      phoneNumber: formattedPhone,
      name: name.trim(),
      role: "member",
      email: email || `${uid}@placeholder.email`,
    };

    const user = await User.create(newUser);

    return res.status(201).json({
      message: "Registered successfully",
      user,
      role: user.role
    });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// --- LOGIN ---
exports.login = async (req, res) => {
  try {
    const { idToken, rememberMe } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "idToken is required" });
    }

    const decoded = await admin.auth().verifyIdToken(idToken, true);
    const firebaseUID = decoded.uid;
    const phoneNumber = decoded.phone_number;

    // First try to find user by Firebase UID
    let user = await User.findOne({ firebaseUID });

    // If not found by UID, try to find by phone number and update the UID
    if (!user && phoneNumber) {
      const formattedPhone = phoneNumber.startsWith("+91") ? phoneNumber : `+91${phoneNumber}`;
      user = await User.findOne({ phoneNumber: formattedPhone });

      if (user) {
        // Update the Firebase UID to match current authentication
        user.firebaseUID = firebaseUID;
        await user.save();
        console.log(`Updated Firebase UID for user ${user._id} from phone number match`);
      }
    }

    if (!user) {
      return res.status(401).json({ message: "User not registered. Please register first." });
    }

    await setSessionCookie(res, idToken, !!rememberMe);
    return res.json({
      message: "Login successful",
      user,
      role: user.role
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(401).json({ message: err.message || "Invalid or expired token" });
  }
};

// --- GOOGLE AUTH ---
exports.googleAuth = async (req, res) => {
  try {
    const { idToken, rememberMe } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "idToken is required" });
    }

    const decoded = await admin.auth().verifyIdToken(idToken, true);
    const firebaseUID = decoded.uid;
    const email = decoded.email;
    const name = decoded.name || email.split("@")[0]; // Fallback to email prefix if no name
    const picture = decoded.picture || '';

    // First try to find user by Firebase UID
    let user = await User.findOne({ firebaseUID });

    // If not found by UID, try to find by email
    if (!user && email) {
      user = await User.findOne({ email });

      if (user) {
        // Update the Firebase UID to match current authentication
        user.firebaseUID = firebaseUID;
        // Optionally update other details if empty
        if (!user.imageUrl && picture) user.imageUrl = picture;
        await user.save();
        console.log(`Updated Firebase UID for user ${user._id} from email match`);
      }
    }

    // If user still doesn't exist, create a new one (Registration flow)
    if (!user) {
      const newUser = {
        firebaseUID,
        email,
        name,
        imageUrl: picture,
        role: "member",
        // phoneNumber is now sparse/optional, so we omit it
      };

      user = await User.create(newUser);
      console.log(`Created new Google Auth user ${user._id}`);
    }

    // Login successful
    await setSessionCookie(res, idToken, !!rememberMe);
    return res.json({
      message: "Google Authentication successful",
      user,
      role: user.role
    });
  } catch (err) {
    console.error("Google Auth error:", err);
    return res.status(401).json({ message: err.message || "Invalid or expired Google token" });
  }
};

// --- LOGOUT ---
exports.logout = async (req, res) => {
  try {
    res.clearCookie(COOKIE_NAME);
    return res.json({ message: "Logged out" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --- GET CURRENT USER PROFILE ---
exports.getProfile = async (req, res) => {
  if (req.user) {
    return res.status(200).json({ user: req.user });
  } else {
    return res.status(401).json({ message: "Not authenticated" });
  }
};