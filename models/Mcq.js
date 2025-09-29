const mongoose = require('mongoose');

const mcqSchema = new mongoose.Schema({
  question: { 
    type: String, 
    required: true 
  },
  options: [{
    type: String,
    required: true
  }],
  correctAnswerIndex: { 
    type: Number, 
    required: true 
  },
  explanation: String,
  chapterId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chapter',
    required: true 
  },
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course',
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.models.Mcq || mongoose.model('Mcq', mcqSchema);