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
    bom: {
        type: String,
        default: '',
    },
    bdm: {
        type: String,
        default: '',
    },
    tm: {
        type: String,
        default: '',
    },
    sCall: {
        type: String,
        default: '',
    },
    jCall: {
        type: String,
        default: '',
    },
    stp1Name: {
        type: String,
        default: '',
    },
    stp2Name: {
        type: String,
        default: '',
    },
    register: {
        type: String,
        default: '',
    },
    staking: {
        type: String,
        default: '',
    },
    income: {
        type: String,
        default: '',
    }
}, { timestamps: true });

// Prevent a user from submitting more than one worksheet per day
dailyWorksheetSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyWorksheet', dailyWorksheetSchema);
