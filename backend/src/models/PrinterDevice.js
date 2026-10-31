
import mongoose from "mongoose";

const printerAssignmentSchema = new mongoose.Schema(
  {
    printerRole: {
      type: String,
      enum: ["KITCHEN", "BILLING"],
      required: true,
    },

    printerName: {
      type: String,
      required: true,
      trim: true,
    },

    connectionType: {
      type: String,
      enum: ["BLUETOOTH", "USB", "NETWORK"],
      required: true,
    },

    // Used for Bluetooth address, network IP or USB identifier.
    connectionAddress: {
      type: String,
      default: null,
      trim: true,
    },

    paperWidth: {
      type: Number,
      enum: [58, 80],
      default: 80,
    },

    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const printerDeviceSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    assignedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    deviceName: {
      type: String,
      required: true,
      trim: true,
    },

    deviceType: {
      type: String,
      enum: ["ANDROID_BRIDGE"],
      default: "ANDROID_BRIDGE",
    },
    pairingCodeHash: {
       type: String,
       default: null,
       select: false,
    },

    pairingCodeExpiresAt: {
        type: Date,
        default: null,
        select: false,
    },

    // Hashed authentication token. Never return this in API responses.
    deviceTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    status: {
      type: String,
      enum: ["PENDING", "ONLINE", "OFFLINE", "DISABLED"],
      default: "PENDING",
      index: true,
    },

    capabilities: {
      bluetooth: { type: Boolean, default: false },
      usb: { type: Boolean, default: false },
      network: { type: Boolean, default: false },
    },

    printerAssignments: {
      type: [printerAssignmentSchema],
      default: [],
    },

    lastSeenAt: {
      type: Date,
      default: null,
    },

    pairedAt: {
      type: Date,
      default: null,
    },

    disabledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Supports restaurant-specific device management.
printerDeviceSchema.index({
  restaurantId: 1,
  status: 1,
});

// Supports staff device lookup.
printerDeviceSchema.index({
  restaurantId: 1,
  assignedUserId: 1,
});

const PrinterDevice = mongoose.model(
  "PrinterDevice",
  printerDeviceSchema
);

export default PrinterDevice;
