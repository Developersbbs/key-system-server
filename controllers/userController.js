// controllers/userController.js
const User = require('../models/User');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get public profile (for specific user ID)
exports.getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('name email chapter imageUrl designation state district');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error('Error fetching public profile:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update payment details
exports.updatePaymentDetails = async (req, res) => {
  try {
    const { upiId, qrCodeUrl, accountHolderName, accountNumber, ifscCode, bankName } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize paymentDetails if it doesn't exist
    if (!user.paymentDetails) {
      user.paymentDetails = {};
    }

    // Update payment details - only update fields that are provided
    if (upiId !== undefined) user.paymentDetails.upiId = upiId;
    if (qrCodeUrl !== undefined) user.paymentDetails.qrCodeUrl = qrCodeUrl;
    if (accountHolderName !== undefined) user.paymentDetails.accountHolderName = accountHolderName;
    if (accountNumber !== undefined) user.paymentDetails.accountNumber = accountNumber;
    if (ifscCode !== undefined) user.paymentDetails.ifscCode = ifscCode;
    if (bankName !== undefined) user.paymentDetails.bankName = bankName;

    await user.save();

    // Return user without sensitive data
    const updatedUser = await User.findById(user._id);
    res.status(200).json({
      message: 'Payment details updated successfully',
      user: updatedUser
    });

  } catch (err) {
    console.error('Error updating payment details:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// Update profile settings
exports.updateProfileSettings = async (req, res) => {
  try {
    const { showPhoneNumber, showPaymentDetails } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize profileSettings if it doesn't exist
    if (!user.profileSettings) {
      user.profileSettings = {};
    }

    // Update profile settings - only update fields that are provided
    if (showPhoneNumber !== undefined) user.profileSettings.showPhoneNumber = showPhoneNumber;
    if (showPaymentDetails !== undefined) user.profileSettings.showPaymentDetails = showPaymentDetails;

    await user.save();

    const updatedUser = await User.findById(user._id);
    res.status(200).json({
      message: 'Profile settings updated successfully',
      user: updatedUser
    });

  } catch (err) {
    console.error('Error updating profile settings:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update profile image
exports.updateProfileImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.imageUrl = imageUrl;
    await user.save();

    const updatedUser = await User.findById(user._id);
    res.status(200).json({
      message: 'Profile image updated successfully',
      user: updatedUser
    });

  } catch (err) {
    console.error('Error updating profile image:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// Get seller payment details (for buyers to see during transaction)
exports.getSellerPaymentDetails = async (req, res) => {
  try {
    const { sellerId } = req.params;

    // Validate sellerId
    if (!sellerId) {
      return res.status(400).json({ message: 'Seller ID is required' });
    }

    const seller = await User.findById(sellerId).select('paymentDetails profileSettings name');
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const publicPaymentDetails = seller.getPublicPaymentDetails();

    if (!publicPaymentDetails) {
      return res.status(403).json({ message: 'Seller has not shared payment details' });
    }

    res.status(200).json({
      sellerName: seller.name,
      paymentDetails: publicPaymentDetails
    });

  } catch (err) {
    console.error('Error fetching seller payment details:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};