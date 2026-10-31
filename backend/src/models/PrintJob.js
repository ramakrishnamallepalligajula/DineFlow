
import mongoose from "mongoose";

const printJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    dedupeKey: {
      type: String,
      required: true,
    },

    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrinterDevice",
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: ["KOT", "BILL", "TEST"],
      required: true,
    },

    printerRole: {
      type: String,
      enum: ["KITCHEN", "BILLING", "ANY"],
      required: true,
    },

    sourceId: {
      type: String,
      default: null,
    },

    sessionId: {
      type: String,
      default: null,
      index: true,
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "DISPATCHED",
        "PRINTING",
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

    maxAttempts: {
      type: Number,
      default: 5,
      min: 1,
    },

    lastAttemptAt: {
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

    errorMessage: {
      type: String,
      default: null,
    },

    acknowledgedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate jobs for the same restaurant and source.
printJobSchema.index(
  {
    restaurantId: 1,
    dedupeKey: 1,
  },
  {
    unique: true,
  }
);

// Efficient pending-job lookup.
printJobSchema.index({
  restaurantId: 1,
  deviceId: 1,
  status: 1,
  createdAt: 1,
});

const PrintJob = mongoose.model(
  "PrintJob",
  printJobSchema
);

export default PrintJob;
