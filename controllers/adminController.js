const User = require('../models/User');

/**
 * @desc    Get all users with the 'member' role
 * @route   GET /api/admin/members
 * @access  Admin
 */
exports.getAllMembers = async (req, res) => {
  try {
    const members = await User.find({ role: 'member' })
      .populate('batch', 'name')
      .select('-firebaseUID -__v'); // Don't expose sensitive data
    res.status(200).json(members);
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @desc    Get all users with the 'admin' role
 * @route   GET /api/admin/admins
 * @access  Admin
 */
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' })
      .populate('batch', 'name')
      .select('-firebaseUID -__v'); // Don't expose sensitive data
    res.status(200).json(admins);
  } catch (err) {
    console.error('Error fetching admins:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @desc    Get all users (admins and members) for selection
 * @route   GET /api/admin/users
 * @access  Admin
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('name email role')
      .sort({ name: 1 });
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @desc    Update a user's role
 * @route   PUT /api/admin/users/:userId/role
 * @access  Admin
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (req.user._id.toString() === userToUpdate._id.toString() && role === 'member') {
      return res.status(400).json({ message: 'Admins cannot demote themselves.' });
    }

    userToUpdate.role = role;
    await userToUpdate.save();

    res.status(200).json({
      message: 'User role updated successfully',
      user: userToUpdate
    });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @desc    Update a user's access to a course
 * @route   PUT /api/admin/users/:userId/access
 * @access  Admin
 */
exports.updateCourseAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    const { courseId, hasAccess } = req.body;

    if (!courseId || typeof hasAccess !== 'boolean') {
      return res.status(400).json({ message: 'Course ID and access status are required.' });
    }

    let user;
    if (hasAccess) {
      // Add the courseId to the user's unlockedCourses array (based on your User model)
      user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { unlockedCourses: courseId } },
        { new: true }
      );
    } else {
      // Remove the courseId from the array
      user = await User.findByIdAndUpdate(
        userId,
        { $pull: { unlockedCourses: courseId } },
        { new: true }
      );
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      message: 'Course access updated successfully',
      user: user
    });
  } catch (err) {
    console.error('Error updating course access:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @desc    Update a user's accessible levels
 * @route   PUT /api/admin/users/:userId/levels
 * @access  Admin
 */
exports.updateUserLevels = async (req, res) => {
  try {
    const { levels } = req.body; // Expecting an array of numbers, e.g., [1, 2, 5]
    const { userId } = req.params;

    if (!Array.isArray(levels) || levels.some(level => typeof level !== 'number')) {
      return res.status(400).json({ message: 'Levels must be an array of numbers.' });
    }

    const userToUpdate = await User.findByIdAndUpdate(
      userId,
      { accessibleLevels: levels },
      { new: true }
    ).select('-firebaseUID');

    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      message: 'User levels updated successfully',
      user: userToUpdate
    });
  } catch (err) {
    console.error('Error updating user levels:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @desc    Update a user's status (active/inactive)
 * @route   PUT /api/admin/users/:userId/status
 * @access  Admin
 */
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, isActive } = req.body;

    // Validate status if provided
    if (status && !['active', 'inactive', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({
        message: 'Invalid status. Must be one of: active, inactive, suspended, pending'
      });
    }

    // Validate isActive if provided
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: 'isActive must be a boolean value'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === userId && (isActive === false || status === 'inactive')) {
      return res.status(400).json({
        message: 'Admins cannot deactivate themselves'
      });
    }

    // Update fields if provided
    if (status !== undefined) {
      user.status = status;
    }

    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    await user.save();

    res.status(200).json({
      message: 'User status updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isActive: user.isActive,
        currentLevel: user.currentLevel,
        accessibleLevels: user.accessibleLevels
      }
    });

  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: 'Server Error' });
  }
};
/**
 * @desc    Update user details (name, email, phone)
 * @route   PUT /api/admin/users/:userId
 * @access  Admin
 */
exports.updateUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phoneNumber } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;

    await user.save();

    res.status(200).json({
      message: 'User details updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive
      }
    });

  } catch (err) {
    console.error('Error updating user details:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};
