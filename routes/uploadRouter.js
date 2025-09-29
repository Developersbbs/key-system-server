// // routes/uploadRouter.js
// console.log("🔧 Loading uploadRouter...");

// const express = require('express');
// const router = express.Router();
// const auth = require('../middlewares/auth');
// const allowRoles = require('../middlewares/allowRoles');

// // Import upload controller methods
// let uploadController;videoUpload.js
// try {
//   uploadController = require('../controllers/uploadController');
//   console.log("✅ Upload controller loaded successfully");
//   console.log("Available methods:", Object.keys(uploadController));
// } catch (error) {
//   console.error("❌ Failed to load upload controller:", error.message);
//   throw error;
// }

// const {
//   generateQRCodeUrl,
//   generatePaymentProofUrl,
//   generateVideoUploadUrl,
//   testUploadRoute
// } = uploadController;

// // Add middleware logging
// router.use((req, res, next) => {
//   console.log(`📤 Upload route: ${req.method} ${req.path}`);
//   next();
// });

// // Test route - NO authentication needed for debugging
// router.get('/test', (req, res) => {
//   console.log("🧪 Test route hit");
//   if (testUploadRoute) {
//     testUploadRoute(req, res);
//   } else {
//     res.json({
//       message: "Upload router is working but testUploadRoute is not available",
//       timestamp: new Date().toISOString(),
//       availableMethods: Object.keys(uploadController || {})
//     });
//   }
// });

// // QR Code upload route
// if (generateQRCodeUrl) {
//   router.post('/qr-code', auth, allowRoles(['member', 'admin']), generateQRCodeUrl);
//   console.log("✅ QR Code route registered");
// } else {
//   console.warn("⚠️ generateQRCodeUrl not found");
// }

// // Payment proof upload route
// if (generatePaymentProofUrl) {
//   router.post('/payment-proof', auth, allowRoles(['member', 'admin']), generatePaymentProofUrl);
//   console.log("✅ Payment proof route registered");
// } else {
//   console.warn("⚠️ generatePaymentProofUrl not found");
// }

// // Video upload route (admin only)
// if (generateVideoUploadUrl) {
//   router.post('/generate-upload-url', auth, allowRoles(['admin']), generateVideoUploadUrl);
//   console.log("✅ Video upload route registered");
// } else {
//   console.warn("⚠️ generateVideoUploadUrl not found");
// }

// // Debug route to list all registered routes
// router.get('/debug', (req, res) => {
//   const routes = [];
//   router.stack.forEach(layer => {
//     if (layer.route) {
//       routes.push({
//         path: layer.route.path,
//         methods: Object.keys(layer.route.methods)
//       });
//     }
//   });
  
//   res.json({
//     message: "Upload router debug info",
//     registeredRoutes: routes,
//     controllerMethods: Object.keys(uploadController || {}),
//     timestamp: new Date().toISOString()
//   });
// });

// console.log("✅ Upload router configured successfully");

// module.exports = router;