const express = require('express');
const router = express.Router();
const multer = require('multer');
const subscriptionController = require('../controllers/subscriptionController');
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// User routes
router.post('/create', auth, subscriptionController.createSubscription);
router.post('/upload-proof', auth, upload.single('paymentProof'), subscriptionController.uploadPaymentProof);
router.get('/my-subscription', auth, subscriptionController.getMySubscription);

// Admin routes
router.get('/admin/pending', auth, allowRoles('admin', 'superadmin'), subscriptionController.getPendingSubscriptions);
router.get('/admin/all', auth, allowRoles('admin', 'superadmin'), subscriptionController.getAllSubscriptions);
router.put('/admin/:id/approve', auth, allowRoles('admin', 'superadmin'), subscriptionController.approveSubscription);
router.put('/admin/:id/reject', auth, allowRoles('admin', 'superadmin'), subscriptionController.rejectSubscription);

module.exports = router;
