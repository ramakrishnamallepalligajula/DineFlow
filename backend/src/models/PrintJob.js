import mongoose from "mongoose";

const printItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const printPayloadSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: Number,
      required: true,
    },

    orderSequence: {
      type: Number,
      required: true,
      min: 1,
    },

    orderType: {
      type: String,
      enum: ["initial", "additional"],
      required: true,
    },

    tableNumber: {
      type: Number,
      required: true,
    },

    items: {
      type: [printItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Print payload must contain at least one item",
      },
    },

    totalItems: {
      type: Number,
      required: true,
      min: 1,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const printJobSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrinterDevice",
      required: true,
      index: true,
    },

    printerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Printer",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["KITCHEN_ORDER", "BAR_ORDER", "BILL", "RECEIPT"],
      required: true,
      default: "KITCHEN_ORDER",
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "PROCESSING",
        "PRINTED",
        "FAILED",
        "CANCELLED",
      ],
      default: "PENDING",
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Immutable snapshot of exactly what should be printed.
    payload: {
      type: printPayloadSchema,
      required: true,
    },

    messageId: {
      type: String,
      default: null,
    },

    processingAt: {
      type: Date,
      default: null,
    },

    printedAt: {
      type: Date,
      default: null,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    error: {
      code: {
        type: String,
        default: null,
      },
      message: {
        type: String,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Primary idempotency guard: the same order cannot create the same
// print type twice for the same printer.
printJobSchema.index(
  {
    restaurantId: 1,
    orderId: 1,
    printerId: 1,
    type: 1,
  },
  { unique: true }
);

// Efficient queue queries for a device.
printJobSchema.index({
  restaurantId: 1,
  deviceId: 1,
  status: 1,
  createdAt: 1,
});

const PrintJob = mongoose.model("PrintJob", printJobSchema);

export default PrintJob;
