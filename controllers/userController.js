// controllers/userController.js
const User = require("../models/User");

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get public profile (for specific user ID)
exports.getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select(
      "name email chapter imageUrl designation state district",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching public profile:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update payment details
exports.updatePaymentDetails = async (req, res) => {
  try {
    const {
      upiId,
      qrCodeUrl,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Initialize paymentDetails if it doesn't exist
    if (!user.paymentDetails) {
      user.paymentDetails = {};
    }

    // Update payment details - only update fields that are provided
    if (upiId !== undefined) user.paymentDetails.upiId = upiId;
    if (qrCodeUrl !== undefined) user.paymentDetails.qrCodeUrl = qrCodeUrl;
    if (accountHolderName !== undefined)
      user.paymentDetails.accountHolderName = accountHolderName;
    if (accountNumber !== undefined)
      user.paymentDetails.accountNumber = accountNumber;
    if (ifscCode !== undefined) user.paymentDetails.ifscCode = ifscCode;
    if (bankName !== undefined) user.paymentDetails.bankName = bankName;

    await user.save();

    // Return user without sensitive data
    const updatedUser = await User.findById(user._id);
    res.status(200).json({
      message: "Payment details updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error updating payment details:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Update profile settings
exports.updateProfileSettings = async (req, res) => {
  try {
    const { showPhoneNumber, showPaymentDetails } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Initialize profileSettings if it doesn't exist
    if (!user.profileSettings) {
      user.profileSettings = {};
    }

    // Update profile settings - only update fields that are provided
    if (showPhoneNumber !== undefined)
      user.profileSettings.showPhoneNumber = showPhoneNumber;
    if (showPaymentDetails !== undefined)
      user.profileSettings.showPaymentDetails = showPaymentDetails;

    await user.save();

    const updatedUser = await User.findById(user._id);
    res.status(200).json({
      message: "Profile settings updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error updating profile settings:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update profile image
exports.updateProfileImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.imageUrl = imageUrl;
    await user.save();

    const updatedUser = await User.findById(user._id);
    res.status(200).json({
      message: "Profile image updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error updating profile image:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const { name, phoneNumber, profileDetails } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update basic fields
    if (name !== undefined) {
      user.name = name;
    }

    if (phoneNumber !== undefined) {
      user.phoneNumber = phoneNumber;
    }

    // Initialize profileDetails if not exists
    if (!user.profileDetails) {
      user.profileDetails = {};
    }

    // Update profile details safely
    if (profileDetails) {
      if (profileDetails.address !== undefined) {
        user.profileDetails.address = profileDetails.address;
      }

      if (profileDetails.state !== undefined) {
        user.profileDetails.state = profileDetails.state;
      }

      if (profileDetails.district !== undefined) {
        user.profileDetails.district = profileDetails.district;
      }

      if (profileDetails.dob !== undefined) {
        user.profileDetails.dob = profileDetails.dob;
      }

      if (profileDetails.gender !== undefined) {
        user.profileDetails.gender = profileDetails.gender;
      }
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating profile:", error);

    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

exports.verifyPhone = async (req, res) => {
  try {
    const userId = req.user._id;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.phoneNumber = phoneNumber.startsWith("+91") ? phoneNumber : `+91${phoneNumber}`;
    user.phoneNumberVerified = true;
    await user.save();

    res.status(200).json({
      message: "Phone number verified successfully",
      user,
    });
  } catch (error) {
    console.error("Error verifying phone:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get seller payment details (for buyers to see during transaction)
exports.getSellerPaymentDetails = async (req, res) => {
  try {
    const { sellerId } = req.params;

    // Validate sellerId
    if (!sellerId) {
      return res.status(400).json({ message: "Seller ID is required" });
    }

    const seller = await User.findById(sellerId).select(
      "paymentDetails profileSettings name",
    );
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    const publicPaymentDetails = seller.getPublicPaymentDetails();

    if (!publicPaymentDetails) {
      return res
        .status(403)
        .json({ message: "Seller has not shared payment details" });
    }

    res.status(200).json({
      sellerName: seller.name,
      paymentDetails: publicPaymentDetails,
    });
  } catch (err) {
    console.error("Error fetching seller payment details:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


// Check if user completed entire program

exports.checkUserCompletion = async (req, res) => {
  try {

    const Course = require("../models/Course");

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const totalCourses = await Course.countDocuments();

    if (user.completedCourses.length >= totalCourses) {

      user.isComplete = true;

      if (!user.completionDate) {
        user.completionDate = new Date();
      }

      await user.save();

    }

    res.status(200).json({
      isComplete: user.isComplete,
      completionDate: user.completionDate
    });

  } catch (error) {

    console.error("Error checking completion:", error);

    res.status(500).json({
      message: "Server Error",
      error: error.message
    });

  }
};



// Get Leaderboard Users

exports.getLeaders = async (req, res) => {
  try {

    const leaders = await User.find({ isComplete: true })
      .select("name imageUrl completionDate")
      .sort({ completionDate: 1 });

    res.status(200).json(leaders);

  } catch (error) {

    console.error("Error fetching leaders:", error);

    res.status(500).json({
      message: "Server Error",
      error: error.message
    });

  }
};