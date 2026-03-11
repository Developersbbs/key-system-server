const SystemConfig = require("../models/SystemConfig");

// Get System Configuration
exports.getSystemConfig = async (req, res) => {
  try {
    const config = await SystemConfig.getConfig();
    const configObj = config.toObject();
    return res.status(200).json({
      success: true,
      config: configObj,
    });
  } catch (error) {
    console.error("Error fetching system config:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch system configuration",
      error: error.message,
    });
  }
};

// Update System Configuration
exports.updateSystemConfig = async (req, res) => {
  try {
    console.log("DEBUG: updateSystemConfig Body:", req.body);
    const { zoomAccountId, zoomClientId, zoomClientSecret, zoomHostEmail } =
      req.body;

    let config = await SystemConfig.getConfig();

    // ── Zoom (unchanged) ──
    if (zoomAccountId !== undefined) config.zoomAccountId = zoomAccountId.trim();
    if (zoomClientId !== undefined) config.zoomClientId = zoomClientId.trim();
    if (zoomClientSecret !== undefined) config.zoomClientSecret = zoomClientSecret.trim();
    if (zoomHostEmail !== undefined) config.zoomHostEmail = zoomHostEmail.trim();

    // ── Payment Details (fixed) ──
    // Frontend sends 'payments', model field is 'payment'
    const { payments } = req.body;

    if (payments !== undefined && Array.isArray(payments)) {
      config.payment = payments.map((p) => ({
        label: p.label?.trim() || "",
        upiId: p.upiId?.trim() || "",
        accountNumber: p.accountNumber?.trim() || "",
        ifscCode: p.ifscCode?.trim() || "",
        accountName: p.accountName?.trim() || "",
        qrCodeUrl: p.qrCodeUrl?.trim() || "",
        bankImage1: p.bankImage1?.trim() || "",
        bankImage2: p.bankImage2?.trim() || "",
      }));
    }

    // ── Worksheet Settings ──
    const { worksheetSettings } = req.body;
    if (worksheetSettings) {
      if (worksheetSettings.startHour !== undefined) config.worksheetSettings.startHour = Number(worksheetSettings.startHour);
      if (worksheetSettings.endHour !== undefined) config.worksheetSettings.endHour = Number(worksheetSettings.endHour);
      if (worksheetSettings.editWindowDays !== undefined) config.worksheetSettings.editWindowDays = Number(worksheetSettings.editWindowDays);
    }

    await config.save();

    // Return saved config — rename model field 'payment' → 'payments' so
    // the frontend always receives a consistent key
    const saved = config.toObject();
    saved.payments = saved.payment;

    return res.status(200).json({
      success: true,
      message: "System configuration updated successfully",
      config: saved,
    });
  } catch (error) {
    console.error("Error updating system config:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update system configuration",
      error: error.message,
    });
  }
};

// Get Payment Information (Subset of config for members)
exports.getPaymentConfig = async (req, res) => {
  try {
    const config = await SystemConfig.getConfig();

    // Return the payments array for members to use
    const paymentConfig = {
      payments: config.payment || [],
    };

    return res.status(200).json({
      success: true,
      config: paymentConfig,
    });
  } catch (error) {
    console.error("Error fetching payment config:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment information",
      error: error.message,
    });
  }
};