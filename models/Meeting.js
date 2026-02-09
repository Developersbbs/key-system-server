const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  meetingLink: { type: String, required: true },
  meetingDate: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ✅ NEW FIELDS
  zoomMeetingId: { type: String }, // Store Zoom's internal Meeting ID
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  recordingLink: { type: String }, // ✅ NEW FIELD: Link to the recorded session

  // ✅ NEW FIELDS for Meeting Records & Engagement
  momLink: { type: String }, // Link to MOM document (PDF/Doc)
  engagementProof: { type: String } // Link to Engagement Proof (Image)

}, { timestamps: true });

// Index for Leaderboard Performance
meetingSchema.index({ host: 1, meetingDate: -1 });

module.exports = mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);