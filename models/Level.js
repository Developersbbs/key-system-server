const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  levelNumber: {
    type: Number,
    required: true,
    unique: true,
    min: 1
  },
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }]
}, { timestamps: true });

module.exports = mongoose.models.Level || mongoose.model('Level', levelSchema);