const SystemConfig = require('../models/SystemConfig');

// Get System Configuration
exports.getSystemConfig = async (req, res) => {
    try {
        const config = await SystemConfig.getConfig();

        // Convert to object to modify return values safely
        const configObj = config.toObject();

        // Mask sensitive data for security (optional, depending on your admin trust level)
        // For now, we'll send it back so admins can see if it's set, but in a real prod env 
        // you might want to return '******' if it exists.
        // Let's decide to return the actual values strictly for Super Admins (which this route should be protected for)

        return res.status(200).json({
            success: true,
            config: configObj
        });
    } catch (error) {
        console.error('Error fetching system config:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch system configuration',
            error: error.message
        });
    }
};

// Update System Configuration
exports.updateSystemConfig = async (req, res) => {
    try {
        console.log("DEBUG: updateSystemConfig Body:", req.body);
        const { zoomAccountId, zoomClientId, zoomClientSecret, zoomHostEmail } = req.body;

        let config = await SystemConfig.getConfig();

        if (zoomAccountId !== undefined) config.zoomAccountId = zoomAccountId.trim();
        if (zoomClientId !== undefined) config.zoomClientId = zoomClientId.trim();
        if (zoomClientSecret !== undefined) config.zoomClientSecret = zoomClientSecret.trim();
        if (zoomHostEmail !== undefined) config.zoomHostEmail = zoomHostEmail.trim();

        // Bank Details
        const { upiId, accountNumber, ifscCode, accountName, qrCodeUrl, bankImage1, bankImage2 } = req.body;
        if (upiId !== undefined) config.upiId = upiId.trim();
        if (accountNumber !== undefined) config.accountNumber = accountNumber.trim();
        if (ifscCode !== undefined) config.ifscCode = ifscCode.trim();
        if (accountName !== undefined) config.accountName = accountName.trim();
        if (qrCodeUrl !== undefined) config.qrCodeUrl = qrCodeUrl.trim();
        if (bankImage1 !== undefined) config.bankImage1 = bankImage1.trim();
        if (bankImage2 !== undefined) config.bankImage2 = bankImage2.trim();

        await config.save();

        return res.status(200).json({
            success: true,
            message: 'System configuration updated successfully',
            config
        });
    } catch (error) {
        console.error('Error updating system config:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update system configuration',
            error: error.message
        });
    }
};

// Get Payment Information (Subset of config for members)
exports.getPaymentConfig = async (req, res) => {
    try {
        const config = await SystemConfig.getConfig();

        // Return only payment related fields
        const paymentConfig = {
            upiId: config.upiId,
            accountNumber: config.accountNumber,
            ifscCode: config.ifscCode,
            accountName: config.accountName,
            qrCodeUrl: config.qrCodeUrl,
            bankImage1: config.bankImage1,
            bankImage2: config.bankImage2
        };

        return res.status(200).json({
            success: true,
            config: paymentConfig
        });
    } catch (error) {
        console.error('Error fetching payment config:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payment information',
            error: error.message
        });
    }
};
