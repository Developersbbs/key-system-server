const express = require('express');
const router = express.Router();
const systemConfigController = require('../controllers/systemConfigController');
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');

// All routes require authentication
router.use(auth);

// GET /api/system-config - Get current configuration (Admin only)
router.get('/', allowRoles(['admin']), systemConfigController.getSystemConfig);

// GET /api/system-config/payment-info - Get payment configuration (Admin and Member)
router.get('/payment-info', allowRoles(['admin', 'member']), systemConfigController.getPaymentConfig);

// PUT /api/system-config - Update configuration (Admin only)
router.put('/', allowRoles(['admin']), systemConfigController.updateSystemConfig);

module.exports = router;
