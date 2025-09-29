const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: String,
  image: String,
  chapters: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chapter',
    default: [] 
  }],
  isPublished: { type: Boolean, default: false },
  isApproved: { 
    type: Boolean, 
    default: false
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
}, { timestamps: true });

module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);