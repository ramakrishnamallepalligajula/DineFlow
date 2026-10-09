import mongoose from "mongoose";

const printerDeviceSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    type: {
      type: String,
      enum: [
        "ANDROID_BRIDGE",
        "WINDOWS_AGENT",
        "RASPBERRY_PI",
        "MAC_AGENT",
        "NETWORK_GATEWAY",
      ],
      required: true,
    },

    status: {
      type: String,
      enum: ["ONLINE", "OFFLINE", "DISABLED"],
      default: "OFFLINE",
      index: true,
    },

    // Socket.IO connection state. This is intentionally not
    // persisted as a socket ID because a socket ID is ephemeral.
    lastSeenAt: {
      type: Date,
      default: null,
      index: true,
    },

    capabilities: {
      usb: { type: Boolean, default: false },
      network: { type: Boolean, default: false },
      bluetooth: { type: Boolean, default: false },
    },

    // Device credentials are added during the pairing phase.
    // Never store a raw device secret in MongoDB.
    credentialHash: {
      type: String,
      default: null,
      select: false,
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

// A device name only needs to be unique within a restaurant.
printerDeviceSchema.index(
  { restaurantId: 1, name: 1 },
  { unique: true }
);

const PrinterDevice = mongoose.model(
  "PrinterDevice",
  printerDeviceSchema
);

export default PrinterDevice;
