const express = require('express');
const router = express.Router();
const systemConfigController = require('../controllers/systemConfigController');
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');

// All routes require admin authentication
router.use(auth);
router.use(allowRoles(['admin']));

// GET /api/system-config - Get current configuration
router.get('/', systemConfigController.getSystemConfig);

// PUT /api/system-config - Update configuration
router.put('/', systemConfigController.updateSystemConfig);

module.exports = router;
