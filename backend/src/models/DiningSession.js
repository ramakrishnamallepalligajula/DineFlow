import mongoose from "mongoose";

const diningSessionSchema = new mongoose.Schema(
  {
    // =========================================
    // RESTAURANT
    // =========================================

    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    // =========================================
    // TABLE
    // =========================================

    tableId: {
      type: String,
      required: true,
      index: true,
    },

    tableNumber: {
      type: Number,
      required: true,
    },

    // =========================================
    // SESSION
    // =========================================

    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // =========================================
    // ORDER INFORMATION
    // =========================================

    orderCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalItems: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =========================================
    // SESSION STATUS
    // =========================================

    status: {
      type: String,
      enum: [
        "OPEN",
        "BILL_REQUESTED",
        "BILL_GENERATED",
        "PAID",
        "CLOSED",
        "CANCELLED",
      ],
      default: "OPEN",
      index: true,
    },

    // =========================================
    // BILL
    // =========================================

    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
      default: null,
      index: true,
    },

    billRequestedAt: {
      type: Date,
      default: null,
    },

    billGeneratedAt: {
      type: Date,
      default: null,
    },

    // =========================================
    // PAYMENT
    // =========================================

    paymentStatus: {
      type: String,
      enum: [
        "UNPAID",
        "PAID",
        "FAILED",
      ],
      default: "UNPAID",
    },

    paymentMethod: {
      type: String,
      enum: [
        "CASH",
        "UPI",
        "CARD",
        "OTHER",
      ],
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    // =========================================
    // SESSION CLOSED
    // =========================================

    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =========================================
// ONLY ONE ACTIVE DINING SESSION PER TABLE
// =========================================

diningSessionSchema.index(
  {
    restaurantId: 1,
    tableId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          "OPEN",
          "BILL_REQUESTED",
          "BILL_GENERATED",
        ],
      },
    },
  }
);

const DiningSession = mongoose.model(
  "DiningSession",
  diningSessionSchema
);

export default DiningSession;