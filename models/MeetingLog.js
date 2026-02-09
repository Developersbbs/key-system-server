const mongoose = require('mongoose');

const meetingLogSchema = new mongoose.Schema({
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
    userName: {
        type: String,
        required: true
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    leftAt: {
        type: Date
    },
    duration: {
        type: Number, // Duration in minutes
        default: 0
    },
    attendanceProof: {
        type: String // URL to uploaded photo for in-person meetings
    }
}, { timestamps: true });

module.exports = mongoose.models.MeetingLog || mongoose.model('MeetingLog', meetingLogSchema);
