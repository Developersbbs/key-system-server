const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { bucket } = require('../config/firebase');
const { log } = require('../utils/logger');

// Create a new subscription request
exports.createSubscription = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get user's current active status
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user already has a pending subscription
        const pendingSubscription = await Subscription.findOne({
            user: userId,
            status: 'pending'
        });

        if (pendingSubscription) {
            return res.status(400).json({
                message: 'You already have a pending subscription request',
                subscription: pendingSubscription
            });
        }

        // Only block if user is ACTIVE and has a valid approved subscription
        if (user.isActive) {
            const activeSubscription = await Subscription.findOne({
                user: userId,
                status: 'approved',
                validUntil: { $gt: new Date() }
            });

            if (activeSubscription) {
                return res.status(400).json({
                    message: 'You already have an active subscription',
                    subscription: activeSubscription
                });
            }
        }

        // If user is inactive, allow them to create a new subscription
        // (even if they have an old approved subscription)
        const subscription = new Subscription({
            user: userId,
            amount: req.body.amount || 10,
            currency: req.body.currency || 'USD'
        });

        await subscription.save();

        res.status(201).json({
            success: true,
            message: 'Subscription request created successfully',
            subscription
        });
    } catch (error) {
        console.error('Create subscription error:', error);
        res.status(500).json({
            message: 'Failed to create subscription request',
            error: error.message
        });
    }
};

// Upload payment proof (screenshot) - Direct backend upload (NO CORS)
exports.uploadPaymentProof = async (req, res) => {
    try {
        log('📸 Payment proof upload request received');
        log(`Body: ${JSON.stringify(req.body)}`);
        log(`File: ${req.file ? JSON.stringify({ name: req.file.originalname, size: req.file.size, type: req.file.mimetype }) : 'No file'}`);

        const { subscriptionId } = req.body;
        const userId = req.user._id;
        const uploadedFile = req.file; // File from multer

        if (!uploadedFile) {
            log('❌ No file uploaded');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Validate file size (5MB limit)
        if (uploadedFile.size > 5 * 1024 * 1024) {
            log('❌ File too large: ' + uploadedFile.size);
            return res.status(400).json({ message: 'File size exceeds 5MB limit' });
        }

        // Validate file type (images only)
        if (!uploadedFile.mimetype.startsWith('image/')) {
            log('❌ Invalid file type: ' + uploadedFile.mimetype);
            return res.status(400).json({ message: 'Only image files are allowed' });
        }

        log('✅ File validation passed');
        log('🔍 Finding subscription: ' + subscriptionId);

        // Find subscription
        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            user: userId
        });

        if (!subscription) {
            log('❌ Subscription not found');
            return res.status(404).json({ message: 'Subscription not found' });
        }

        if (subscription.status !== 'pending') {
            log('❌ Subscription not pending: ' + subscription.status);
            return res.status(400).json({ message: 'Cannot upload proof for non-pending subscription' });
        }

        log('✅ Subscription found and validated');

        // Generate Firebase Storage path
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const sanitizedFileName = uploadedFile.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `payment-proofs/${timestamp}-${randomString}-${sanitizedFileName}`;

        log('📁 Firebase path: ' + filePath);
        log('☁️ Uploading to Firebase from backend...');

        // Upload to Firebase Storage FROM BACKEND (no CORS issues)
        const firebaseFile = bucket.file(filePath);

        await firebaseFile.save(uploadedFile.buffer, {
            metadata: {
                contentType: uploadedFile.mimetype,
            },
        });
        log('✅ File uploaded to Firebase Storage');

        // Make the file public
        await firebaseFile.makePublic();
        log('✅ File made public');

        // Generate public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        log('🔗 Public URL: ' + publicUrl);

        // Update subscription
        subscription.paymentScreenshot = publicUrl;
        await subscription.save();
        log('✅ Subscription updated');

        res.json({
            success: true,
            fileUrl: publicUrl,
            message: 'Payment proof uploaded successfully'
        });
    } catch (error) {
        log('❌ Upload payment proof error: ' + error.message);
        log('Error stack: ' + error.stack);
        res.status(500).json({
            message: 'Failed to upload payment proof',
            error: error.message
        });
    }
};

// Get user's subscription status
exports.getMySubscription = async (req, res) => {
    try {
        const userId = req.user._id;

        const subscription = await Subscription.findOne({ user: userId })
            .sort({ createdAt: -1 })
            .populate('processedBy', 'name email');

        res.json({
            success: true,
            subscription
        });
    } catch (error) {
        console.error('Get my subscription error:', error);
        res.status(500).json({
            message: 'Failed to fetch subscription',
            error: error.message
        });
    }
};

// Admin: Get all pending subscriptions
exports.getPendingSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ status: 'pending' })
            .populate('user', 'name email phone')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            subscriptions
        });
    } catch (error) {
        console.error('Get pending subscriptions error:', error);
        res.status(500).json({
            message: 'Failed to fetch pending subscriptions',
            error: error.message
        });
    }
};

// Admin: Get all subscriptions (with filters)
exports.getAllSubscriptions = async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const subscriptions = await Subscription.find(filter)
            .populate('user', 'name email phone')
            .populate('processedBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            subscriptions
        });
    } catch (error) {
        console.error('Get all subscriptions error:', error);
        res.status(500).json({
            message: 'Failed to fetch subscriptions',
            error: error.message
        });
    }
};

// Admin: Approve subscription
exports.approveSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;

        const subscription = await Subscription.findById(id).populate('user');

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        if (subscription.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending subscriptions can be approved' });
        }

        // Update subscription
        subscription.status = 'approved';
        subscription.processedBy = adminId;
        subscription.processedAt = new Date();
        subscription.validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
        await subscription.save();

        // Activate user account
        await User.findByIdAndUpdate(subscription.user._id, {
            isActive: true
        });

        res.json({
            success: true,
            message: 'Subscription approved and user activated',
            subscription
        });
    } catch (error) {
        console.error('Approve subscription error:', error);
        res.status(500).json({
            message: 'Failed to approve subscription',
            error: error.message
        });
    }
};

// Admin: Reject subscription
exports.rejectSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.user._id;

        const subscription = await Subscription.findById(id);

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        if (subscription.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending subscriptions can be rejected' });
        }

        // Update subscription
        subscription.status = 'rejected';
        subscription.rejectionReason = reason || 'Payment verification failed';
        subscription.processedBy = adminId;
        subscription.processedAt = new Date();
        await subscription.save();

        res.json({
            success: true,
            message: 'Subscription rejected',
            subscription
        });
    } catch (error) {
        console.error('Reject subscription error:', error);
        res.status(500).json({
            message: 'Failed to reject subscription',
            error: error.message
        });
    }
};
