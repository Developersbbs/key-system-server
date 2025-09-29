const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  listing: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Listing', 
    required: true 
  },
  buyer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  seller: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: false, // Made optional for backward compatibility
    min: 0,
    default: null
  },
  cryptoType: {
    type: String,
    required: false, // Made optional for backward compatibility
    default: null
  },
  proofOfPaymentUrl: { 
    type: String, 
    required: true 
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  // 🟢 NEW: Add rejection reason
  rejectionReason: {
    type: String,
    default: null
  },
  // 🟢 NEW: Add admin who processed the transaction
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // 🟢 NEW: Add processing timestamp
  processedAt: {
    type: Date,
    default: null
  }
}, { 
  timestamps: true 
});

// 🟢 NEW: Add index for better query performance
transactionSchema.index({ buyer: 1, status: 1 });
transactionSchema.index({ seller: 1, status: 1 });
transactionSchema.index({ listing: 1, buyer: 1 });

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);