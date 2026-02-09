// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // --- Standard User Fields ---
  email: {
    type: String,
    required: true,
    unique: true,
  },
  firebaseUID: {
    type: String,
    required: true,
    unique: true,
  },
  name: String,
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  imageUrl: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['member', 'admin'],
    default: 'member',
  },
  isSuperadmin: {
    type: Boolean,
    default: false
  },

  // User status and activation fields
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: false
  },

  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    default: null
  },


  // --- App-Specific Fields ---
  accessibleLevels: {
    type: [Number],
    default: [1] // New users start with access to Level 1 by default
  },

  // Track current level (for progression logic)
  currentLevel: {
    type: Number,
    default: 1
  },

  // Track completed chapters (MCQs completed)
  completedChapters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course.chapters'
  }],

  // Track unlocked courses (deprecated - now handled by sequential logic)
  unlockedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],

  // Track individual courses the user has completed
  completedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],

  // mcqResults with better structure
  mcqResults: [{
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    total: {
      type: Number,
      default: function () {
        return this.userAnswers ? Object.keys(this.userAnswers).length : 0;
      }
    },
    userAnswers: {
      type: Map,
      of: Number
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ✅ NEW: Video Progress Tracking
  videoProgress: [{
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
    watchedDuration: { type: Number, default: 0 }, // max seconds watched
    totalDuration: { type: Number, default: 0 },
    lastWatchedAt: { type: Date, default: Date.now },
    completed: { type: Boolean, default: false }
  }],

  // ENHANCED: Payment details for marketplace
  paymentDetails: {
    upiId: {
      type: String,
      default: ''
    },
    qrCodeUrl: {
      type: String,
      default: ''
    },
    accountHolderName: {
      type: String,
      default: ''
    },
    accountNumber: {
      type: String,
      default: ''
    },
    ifscCode: {
      type: String,
      default: ''
    },
    bankName: {
      type: String,
      default: ''
    }
  },

  // NEW: Profile settings for privacy control
  profileSettings: {
    showPhoneNumber: {
      type: Boolean,
      default: true
    },
    showPaymentDetails: {
      type: Boolean,
      default: true
    }
  },

  // NEW: Profile settings for privacy control

}, {
  timestamps: true,
});

// Virtual for effective accessible levels
userSchema.virtual('effectiveAccessibleLevels').get(function () {
  return this.batch?.accessibleLevels || this.accessibleLevels || [1];
});

// Virtual for getting next unlocked course in current level
userSchema.virtual('nextUnlockedCourse').get(function () {
  return null; // Placeholder - implement based on your needs
});

// Method to check if user can access a specific course
userSchema.methods.canAccessCourse = function (courseId, coursePosition, levelCourses) {
  const completedCourseIds = this.completedCourses.map(id => id.toString());

  if (completedCourseIds.includes(courseId.toString())) {
    return { canAccess: true, reason: 'Course already completed' };
  }

  if (coursePosition === 0) {
    return { canAccess: true, reason: 'First course in level' };
  }

  const previousCourses = levelCourses.slice(0, coursePosition);
  const allPreviousCompleted = previousCourses.every(prevCourse =>
    completedCourseIds.includes(prevCourse._id.toString())
  );

  if (allPreviousCompleted) {
    return { canAccess: true, reason: 'Previous courses completed' };
  } else {
    return { canAccess: false, reason: 'Previous courses must be completed first' };
  }
};

// Method to get course completion percentage
userSchema.methods.getCourseCompletionPercentage = function (courseChapterIds) {
  const completedChapterIds = this.mcqResults.map(result => result.chapterId.toString());
  const completedCount = courseChapterIds.filter(chapterId =>
    completedChapterIds.includes(chapterId.toString())
  ).length;

  return courseChapterIds.length > 0 ? Math.round((completedCount / courseChapterIds.length) * 100) : 0;
};

// Method to check if course is completed
userSchema.methods.isCourseCompleted = function (courseChapterIds) {
  const completedChapterIds = this.mcqResults.map(result => result.chapterId.toString());
  return courseChapterIds.every(chapterId =>
    completedChapterIds.includes(chapterId.toString())
  );
};

// Method to get level progress
userSchema.methods.getLevelProgress = function (levelCourses) {
  const completedCourseIds = this.completedCourses.map(id => id.toString());
  const completedCount = levelCourses.filter(course =>
    completedCourseIds.includes(course._id.toString())
  ).length;

  return {
    totalCourses: levelCourses.length,
    completedCourses: completedCount,
    progressPercentage: levelCourses.length > 0 ? Math.round((completedCount / levelCourses.length) * 100) : 0,
    isLevelComplete: completedCount === levelCourses.length
  };
};

// FIXED: Method to get public payment details (for buyers)
userSchema.methods.getPublicPaymentDetails = function () {
  // Check if user allows sharing payment details
  if (!this.profileSettings || !this.profileSettings.showPaymentDetails) {
    return null;
  }

  // Return only the payment details that exist and are not empty strings
  const publicDetails = {};

  if (this.paymentDetails?.upiId && this.paymentDetails.upiId.trim() !== '') {
    publicDetails.upiId = this.paymentDetails.upiId;
  }

  if (this.paymentDetails?.qrCodeUrl && this.paymentDetails.qrCodeUrl.trim() !== '') {
    publicDetails.qrCodeUrl = this.paymentDetails.qrCodeUrl;
  }

  if (this.paymentDetails?.accountHolderName && this.paymentDetails.accountHolderName.trim() !== '') {
    publicDetails.accountHolderName = this.paymentDetails.accountHolderName;
  }

  if (this.paymentDetails?.accountNumber && this.paymentDetails.accountNumber.trim() !== '') {
    // For security, show only last 4 digits
    publicDetails.accountNumber = `****${this.paymentDetails.accountNumber.slice(-4)}`;
  }

  if (this.paymentDetails?.ifscCode && this.paymentDetails.ifscCode.trim() !== '') {
    publicDetails.ifscCode = this.paymentDetails.ifscCode;
  }

  if (this.paymentDetails?.bankName && this.paymentDetails.bankName.trim() !== '') {
    publicDetails.bankName = this.paymentDetails.bankName;
  }

  // Return null if no payment details are available
  return Object.keys(publicDetails).length > 0 ? publicDetails : null;
};

// NEW: Method to update last active timestamp
userSchema.methods.updateLastActive = function () {
  this.lastActive = new Date();
  return this.save();
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);