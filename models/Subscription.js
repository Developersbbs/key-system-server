const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        default: 10 // $10 USD
    },
    currency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'INR']
    },
    paymentScreenshot: {
        type: String, // Firebase Storage URL
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: {
        type: String,
        default: null
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    processedAt: {
        type: Date,
        default: null
    },
    validUntil: {
        type: Date,
        default: null // Will be set to 1 year from approval
    }
}, {
    timestamps: true
});

// Index for faster queries
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
