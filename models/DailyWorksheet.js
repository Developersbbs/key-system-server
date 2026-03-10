const mongoose = require('mongoose');

const dailyWorksheetSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    name: {
        type: String,
        required: true,
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { timestamps: true });

// Prevent a user from submitting more than one worksheet per day
dailyWorksheetSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyWorksheet', dailyWorksheetSchema);
