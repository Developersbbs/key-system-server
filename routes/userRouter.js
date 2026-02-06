// routes/userRouter.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');
const User = require('../models/User');

// Import controller methods
const userController = require('../controllers/userController');
const {
  getProfile,
  getPublicProfile,
  updatePaymentDetails,
  updateProfileSettings,
  getSellerPaymentDetails
} = userController;

// --- Test route ---
router.get('/test', (req, res) => {
  res.json({
    message: 'User routes are working!',
    timestamp: new Date().toISOString(),
    availableMethods: Object.keys(userController)
  });
});

// --- Current user profile ---
if (typeof getProfile === 'function') {
  router.get('/profile', auth, allowRoles(['member', 'admin']), getProfile);
}

// --- Update payment details ---
if (typeof updatePaymentDetails === 'function') {
  router.put('/payment-details', auth, allowRoles(['member', 'admin']), updatePaymentDetails);
}

// --- Update profile settings ---
if (typeof updateProfileSettings === 'function') {
  router.put('/profile-settings', auth, allowRoles(['member', 'admin']), updateProfileSettings);
}

// --- Update profile image ---
if (typeof userController.updateProfileImage === 'function') {
  router.put('/profile-image', auth, allowRoles(['member', 'admin']), userController.updateProfileImage);
}

// --- Get public profile ---
if (typeof getPublicProfile === 'function') {
  router.get('/:id/public-profile', auth, getPublicProfile);
} else {
  console.warn('getPublicProfile not found in userController');
}

// --- Get seller payment details (buyer view) ---
if (typeof getSellerPaymentDetails === 'function') {
  router.get('/:sellerId/payment-details', auth, allowRoles(['member', 'admin']), getSellerPaymentDetails);
} else {
  console.warn('getSellerPaymentDetails not found in userController');
}

// Optional: Add other user routes here
// e.g., router.get('/all', auth, allowRoles(['admin']), getAllUsers);

module.exports = router;
