import mongoose from "mongoose";

const tableSessionSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    tableId: {
      type: String,
      required: true,
      index: true,
    },

    // Keep table labels as strings so both numeric and custom labels work.
    // Examples: "1", "10", "AC-1", "VIP-2".
    tableNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // Customer-facing order number.
    orderId: {
      type: Number,
      required: true,
    },

    // Unique identifier for this table visit.
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Number of orders placed during this session.
    orderCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
      default: null,
    },

    status: {
      type: String,
      enum: ["open", "bill_requested", "closed"],
      default: "open",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Only one open session is allowed per table.
tableSessionSchema.index(
  {
    restaurantId: 1,
    tableId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "open",
    },
  }
);

const TableSession = mongoose.model(
  "TableSession",
  tableSessionSchema
);

export default TableSession;
