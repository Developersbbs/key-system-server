const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  videoUrl: String,
  documentUrl: String,
  isUnlocked: { type: Boolean, default: false },
  duration: Number, // in minutes
  timerEnabled: { type: Boolean, default: true },
  
  // Reference to MCQs instead of embedding them
  mcqs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mcq',
    default: []
  }],

  tasks: {
    type: [{
      type: { type: String, enum: ['online', 'offline'], required: true },
      title: String,
      description: String,
      deadline: Date,
      submissionLink: String // for online tasks
    }],
    default: []
  },
  
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.models.Chapter || mongoose.model('Chapter', chapterSchema);