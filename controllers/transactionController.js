const Transaction = require('../models/Transaction');
const Listing = require('../models/Listing');
const User = require('../models/User');

// --- Member Actions ---

// Create new transaction
exports.createTransaction = async (req, res) => {
  try {
    const { listingId, proofOfPaymentUrl, quantity, totalAmount, cryptoType } = req.body;
    const buyerId = req.user._id;

    // Validate required fields
    if (!listingId || !proofOfPaymentUrl) {
      return res.status(400).json({ message: 'Listing ID and proof of payment are required.' });
    }

    // For new transactions with quantity, validate additional fields
    if (quantity !== undefined || totalAmount !== undefined || cryptoType !== undefined) {
      if (!quantity || !totalAmount || !cryptoType) {
        return res.status(400).json({ message: 'When providing quantity, total amount and crypto type are also required.' });
      }
      
      // Validate quantity
      if (quantity <= 0) {
        return res.status(400).json({ message: 'Quantity must be greater than 0.' });
      }
    }

    // Check if listing exists and is available
    const listing = await Listing.findById(listingId).populate('postedBy', 'name email paymentDetails');
    if (!listing || listing.isSold) {
      return res.status(404).json({ message: 'Listing not available.' });
    }

    // Prevent users from buying their own items
    if (listing.postedBy._id.toString() === buyerId.toString()) {
      return res.status(400).json({ message: 'Cannot buy your own item.' });
    }

    // Check if seller has payment details configured
    const seller = listing.postedBy;
    if (!seller.paymentDetails || (!seller.paymentDetails.upiId && !seller.paymentDetails.qrCodeUrl)) {
      return res.status(400).json({ 
        message: 'Seller has not configured payment details. Transaction cannot proceed.' 
      });
    }

    // Validate quantity against available quantity (only if quantity is provided)
    if (quantity && quantity > listing.availableQuantity) {
      return res.status(400).json({ message: `Only ${listing.availableQuantity} ${listing.cryptoType} available.` });
    }

    // Check if user already has a pending transaction for this listing
    const existingTransaction = await Transaction.findOne({
      listing: listingId,
      buyer: buyerId,
      status: 'pending'
    });

    if (existingTransaction) {
      return res.status(400).json({ message: 'You already have a pending transaction for this item.' });
    }

    // Create transaction
    const transactionData = {
      listing: listingId,
      buyer: buyerId,
      seller: listing.postedBy._id,
      amount: totalAmount || listing.price, // Use totalAmount if provided, otherwise listing price
      proofOfPaymentUrl,
    };

    // Add optional fields if provided
    if (quantity !== undefined) transactionData.quantity = quantity;
    if (cryptoType !== undefined) transactionData.cryptoType = cryptoType;

    const transaction = await Transaction.create(transactionData);

    // Populate the transaction with listing and user details
    await transaction.populate([
      { path: 'listing', select: 'title price imageUrl' },
      { path: 'buyer', select: 'name email' },
      { path: 'seller', select: 'name email' }
    ]);

    res.status(201).json(transaction);
  } catch (err) {
    console.error('Error creating transaction:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// Get seller payment details for a specific listing
exports.getSellerPaymentDetails = async (req, res) => {
  try {
    const { listingId } = req.params;
    const buyerId = req.user._id;

    // Get the listing with seller details
    const listing = await Listing.findById(listingId)
      .populate('postedBy', 'name paymentDetails profileSettings');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Prevent users from viewing payment details of their own items
    if (listing.postedBy._id.toString() === buyerId.toString()) {
      return res.status(400).json({ message: 'Cannot view your own payment details' });
    }

    const seller = listing.postedBy;
    const publicPaymentDetails = seller.getPublicPaymentDetails();

    if (!publicPaymentDetails) {
      return res.status(403).json({ 
        message: 'Seller payment details are not available' 
      });
    }

    res.status(200).json({
      listingTitle: listing.title,
      listingPrice: listing.price,
      sellerName: seller.name,
      paymentDetails: publicPaymentDetails
    });

  } catch (err) {
    console.error('Error fetching seller payment details:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get user's transactions (both as buyer and seller)
exports.getUserTransactions = async (req, res) => {
  try {
    const userId = req.user._id;

    const transactions = await Transaction.find({
      $or: [{ buyer: userId }, { seller: userId }]
    })
    .populate('listing', 'title price imageUrl')
    .populate('buyer', 'name email')
    .populate('seller', 'name email')
    .populate('processedBy', 'name email')
    .sort({ createdAt: -1 });

    res.status(200).json(transactions);
  } catch (err) {
    console.error('Error fetching user transactions:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- Admin Actions ---

// Get all pending transactions
exports.getPendingTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: 'pending' })
      .populate('listing', 'title price imageUrl')
      .populate('buyer', 'name email phoneNumber')
      .populate('seller', 'name email phoneNumber')
      .sort({ createdAt: -1 });

    res.status(200).json(transactions);
  } catch (err) {
    console.error('Error fetching pending transactions:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get all transactions (admin view)
exports.getAllTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    const filter = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const transactions = await Transaction.find(filter)
      .populate('listing', 'title price imageUrl')
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalTransactions = await Transaction.countDocuments(filter);

    res.status(200).json({
      transactions,
      currentPage: page,
      totalPages: Math.ceil(totalTransactions / limit),
      totalTransactions
    });
  } catch (err) {
    console.error('Error fetching all transactions:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Approve transaction
exports.approveTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('listing')
      .populate('buyer', 'name email')
      .populate('seller', 'name email');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Transaction is not pending.' });
    }

    // Update transaction status
    transaction.status = 'approved';
    transaction.processedBy = req.user._id;
    transaction.processedAt = new Date();
    await transaction.save();

    // Handle quantity update for transactions that have quantity field
    const listing = transaction.listing;
    let quantityPurchased = 0;
    
    if (transaction.quantity && transaction.quantity > 0) {
      // New transaction format with quantity
      quantityPurchased = transaction.quantity;
      listing.availableQuantity = Math.max(0, listing.availableQuantity - quantityPurchased);
      
      // Mark as sold only if no quantity remaining
      if (listing.availableQuantity === 0) {
        listing.isSold = true;
      }
    } else {
      // Legacy transaction format - mark entire listing as sold
      listing.isSold = true;
      quantityPurchased = listing.availableQuantity;
      listing.availableQuantity = 0;
    }
    
    await listing.save();

    // Populate processedBy field
    await transaction.populate('processedBy', 'name email');

    res.status(200).json({
      message: 'Transaction approved successfully',
      transaction: transaction,
      listingId: listing._id,
      quantity: quantityPurchased
    });
  } catch (err) {
    console.error('Error approving transaction:', err);
    console.error('Transaction ID:', req.params.id);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      message: 'Server Error', 
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
};

// Reject transaction
exports.rejectTransaction = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Transaction is not pending.' });
    }

    transaction.status = 'rejected';
    transaction.processedBy = req.user._id;
    transaction.processedAt = new Date();
    if (reason) {
      transaction.rejectionReason = reason;
    }
    await transaction.save();

    await transaction.populate([
      { path: 'listing', select: 'title price' },
      { path: 'buyer', select: 'name email' },
      { path: 'seller', select: 'name email' },
      { path: 'processedBy', select: 'name email' }
    ]);

    res.status(200).json(transaction);
  } catch (err) {
    console.error('Error rejecting transaction:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};