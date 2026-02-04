const mongoose = require('mongoose');

const meetingMomSchema = new mongoose.Schema({
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Ensure unique combination of meeting and user to prevent duplicates
meetingMomSchema.index({ meetingId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('MeetingMom', meetingMomSchema);
