const mongoose = require("mongoose");

const systemConfigSchema = new mongoose.Schema(
  {
    // Zoom API Configuration
    zoomAccountId: {
      type: String,
      default: "",
    },
    zoomClientId: {
      type: String,
      default: "",
    },
    zoomClientSecret: {
      type: String,
      default: "",
    },
    // Optional: Override email to use as the Host for all meetings
    zoomHostEmail: {
      type: String,
      default: "",
    },

    // --- Payment Details ---
    payment: [
      {
        label: {
          type: String,
          default: ""
        },
        upiId: {
          type: String,
          default: "",
        },
        accountNumber: {
          type: String,
          default: "",
        },
        ifscCode: {
          type: String,
          default: "",
        },
        accountName: {
          type: String,
          default: "",
        },
        qrCodeUrl: {
          type: String,
          default: "",
        },
        bankImage1: {
          type: String,
          default: "",
        },
        bankImage2: {
          type: String,
          default: "",
        },
      },
    ],

    // --- Worksheet Settings ---
    worksheetSettings: {
      startHour: {
        type: Number,
        default: 6,
      },
      endHour: {
        type: Number,
        default: 24,
      },
      editWindowDays: {
        type: Number,
        default: 0, // 0 means only same day
      },
    },

    // --- Custom Tool Tags ---
    toolTags: {
      type: [String],
      default: [],
    },

    // Future configurations can be added here
  },
  {
    timestamps: true,
  },
);

// Ensure only one document exists
systemConfigSchema.statics.getConfig = async function () {
  const config = await this.findOne();
  if (config) return config;
  return await this.create({});
};

module.exports = mongoose.model("SystemConfig", systemConfigSchema);
