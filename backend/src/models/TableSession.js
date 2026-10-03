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

    tableNumber: {
      type: Number,
      required: true,
    },

    // Customer-facing order number
    // Example: 1042
    orderId: {
      type: Number,
      required: true,
    },

    // Unique identifier for this table visit
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Number of orders placed during this session
    orderCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "open",
        "bill_requested",
        "closed",
      ],
      default: "open",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Only one active session per table
tableSessionSchema.index(
  {
    restaurantId: 1,
    tableId: 1,
    status: 1,
  }
);

const TableSession = mongoose.model(
  "TableSession",
  tableSessionSchema
);

export default TableSession;