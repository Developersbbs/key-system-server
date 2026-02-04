const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
    // Zoom API Configuration
    zoomAccountId: {
        type: String,
        default: ''
    },
    zoomClientId: {
        type: String,
        default: ''
    },
    zoomClientSecret: {
        type: String,
        default: ''
    },
    // Optional: Override email to use as the Host for all meetings
    zoomHostEmail: {
        type: String,
        default: ''
    },

    // Future configurations can be added here
}, {
    timestamps: true
});

// Ensure only one document exists
systemConfigSchema.statics.getConfig = async function () {
    const config = await this.findOne();
    if (config) return config;
    return await this.create({});
};

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
