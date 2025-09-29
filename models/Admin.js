const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  phone: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true,
    minlength: 6
  },

  role: {
    type: String,
    enum: ['superadmin', 'admin'],
    default: 'admin'
  },

  isActive: {
    type: Boolean,
    default: true
  },

  permissions: {
    canCreateCourse: { type: Boolean, default: true },
    canManageStudents: { type: Boolean, default: true },
    canScheduleMeetings: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: true }
  },

  profileImage: {
    type: String // URL or file path
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  lastLogin: Date
});

module.exports = mongoose.model('Admin', adminSchema);
