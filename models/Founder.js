const mongoose = require('mongoose');

const founderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    designation: {
        type: String,
        required: true,
        enum: ['Founder', 'Director', 'Senior Director', 'Key Leader'],
        trim: true
    },
    imageUrl: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    socialLinks: {
        linkedin: String,
        twitter: String,
        facebook: String,
        instagram: String
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Founder', founderSchema);
