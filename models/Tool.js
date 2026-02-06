const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['document', 'image', 'video', 'tutorial'],
        required: true
    },
    url: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String,
        // Optional, mainly for videos/tutorials
    }
}, { timestamps: true });

module.exports = mongoose.model('Tool', toolSchema);
