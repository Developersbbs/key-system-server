const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    title: { // specific title like 'Call with client'
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    type: {
        type: String,
        enum: ['Call', 'Meeting', 'Task', 'Other'],
        default: 'Other'
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'In Progress'],
        default: 'Completed' // Assuming logged activities are done
    },
    photo: {
        type: String, // URL to the uploaded photo
        required: false
    }
}, { timestamps: true });

// Index for Leaderboard Performance
activitySchema.index({ user: 1 });

module.exports = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
