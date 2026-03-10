const mongoose = require('mongoose');

const worksheetFieldSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true,
        trim: true
    },
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('WorksheetField', worksheetFieldSchema);
