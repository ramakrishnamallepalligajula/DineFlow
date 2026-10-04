import mongoose from "mongoose";

const printerSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrinterDevice",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    role: {
      type: String,
      enum: ["KITCHEN", "BAR", "BILLING", "RECEIPT"],
      required: true,
      default: "KITCHEN",
    },

    connection: {
      type: {
        type: String,
        enum: ["USB", "NETWORK", "BLUETOOTH"],
        required: true,
      },

      // Optional metadata. Do not store credentials here.
      address: {
        type: String,
        trim: true,
        default: "",
      },
    },

    model: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    status: {
      type: String,
      enum: ["ONLINE", "OFFLINE", "UNKNOWN", "ERROR"],
      default: "UNKNOWN",
      index: true,
    },

    lastError: {
      code: {
        type: String,
        default: null,
      },
      message: {
        type: String,
        default: null,
      },
      at: {
        type: Date,
        default: null,
      },
    },

    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Printer names are unique only within a restaurant.
printerSchema.index(
  { restaurantId: 1, name: 1 },
  { unique: true }
);

// A printer belongs to one device. This index also makes
// printer lookup by device efficient.
printerSchema.index({ restaurantId: 1, deviceId: 1 });

const Printer = mongoose.model("Printer", printerSchema);

export default Printer;
