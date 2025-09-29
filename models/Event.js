const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true,
  },
  eventDate: {
    type: Date,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
    min: 0,
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Links to the user who created the event
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);