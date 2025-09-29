// controllers/listingController.js - Updated with quantity validation
const Listing = require('../models/Listing');
const mongoose = require('mongoose');

// Get all listings
exports.getAllListings = async (req, res) => {
  try {
    const listings = await Listing.find({ isSold: false, availableQuantity: { $gt: 0 } })
      .sort({ createdAt: -1 })
      .populate('postedBy', 'name rating')
      .lean();

    const validListings = listings.filter(listing => listing.postedBy);

    res.status(200).json(validListings);
  } catch (err) {
    console.error('Error fetching listings:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create new listing
exports.createListing = async (req, res) => {
  try {
    const { title, description, price, category, cryptoType, availableQuantity } = req.body;
    
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!description) missingFields.push('description');
    if (price === undefined) missingFields.push('price');
    // if (!category) missingFields.push('category'); // Commented out temporarily
    if (!cryptoType) missingFields.push('cryptoType');
    if (availableQuantity === undefined) missingFields.push('availableQuantity');
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        missingFields 
      });
    }

    const newListing = new Listing({
      title, 
      description, 
      price, 
      category, 
      cryptoType,
      availableQuantity,
      minPurchase: req.body.minPurchase || 0,
      maxPurchase: req.body.maxPurchase,
      paymentMethods: req.body.paymentMethods || [],
      terms: req.body.terms || '',
      postedBy: req.user._id,
    });
    
    const savedListing = await newListing.save();
    
    const populatedListing = await Listing.findById(savedListing._id)
      .populate('postedBy', 'name rating');
    
    res.status(201).json(populatedListing);
  } catch (err) {
    console.error('Error creating listing:', err);
    console.error('Request body:', req.body);
    res.status(500).json({ 
      message: 'Server Error',
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
};

// Update listing quantity after purchase
exports.updateListingQuantity = async (req, res) => {
  try {
    const { listingId, purchasedQuantity } = req.body;
    
    if (!listingId || !purchasedQuantity) {
      return res.status(400).json({ message: 'Listing ID and purchased quantity are required' });
    }
    
    if (purchasedQuantity <= 0) {
      return res.status(400).json({ message: 'Purchased quantity must be greater than 0' });
    }
    
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }
    
    if (listing.availableQuantity < purchasedQuantity) {
      return res.status(400).json({ message: 'Insufficient quantity available' });
    }
    
    // Update the quantity
    listing.availableQuantity = Math.max(0, listing.availableQuantity - purchasedQuantity);
    
    // Mark as sold if no quantity remaining
    if (listing.availableQuantity === 0) {
      listing.isSold = true;
    }
    
    await listing.save();
    
    console.log(`Updated listing ${listingId}: quantity reduced by ${purchasedQuantity}, remaining: ${listing.availableQuantity}`);
    
    res.status(200).json({
      message: 'Listing quantity updated successfully',
      listing: listing,
      updatedQuantity: listing.availableQuantity
    });
  } catch (err) {
    console.error('Error updating listing quantity:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// Delete a listing
exports.deleteListing = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid listing ID' });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }
    
    if (listing.postedBy.toString() !== req.user._id.toString() && !req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized to delete this listing' });
    }
    
    await Listing.findByIdAndDelete(id);
    res.status(200).json({ message: 'Listing deleted successfully' });
  } catch (err) {
    console.error('Error deleting listing:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};