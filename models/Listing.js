// models/Listing.js - Updated with quantity fields
const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  cryptoType: { 
    type: String, 
    required: true,
    enum: ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'DOGE', 'MATIC', 'Other']
  },
  availableQuantity: { type: Number, required: true, min: 0 },
  minPurchase: { type: Number, default: 0 },
  maxPurchase: { type: Number },
  paymentMethods: [{ type: String }],
  terms: { type: String },
  
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isSold: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.models.Listing || mongoose.model('Listing', listingSchema);