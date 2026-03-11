const mongoose = require("mongoose");

const processSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course"
  },

  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chapter"
  },

  attempts: {
    type: Number,
    default: 0
  },

  bestScore: {
    type: Number,
    default: 0
  },

  completed: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("Process", processSchema);