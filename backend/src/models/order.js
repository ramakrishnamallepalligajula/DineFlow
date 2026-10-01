import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    category: {
      type: String,
      default: "",
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    // =========================
    // RESTAURANT
    // =========================

    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    // =========================
    // ORDER ID
    // =========================

    orderId: {
      type: Number,
      required: true,
      unique: true,
    },

    // =========================
    // TABLE
    // =========================

    tableId: {
      type: String,
      required: true,
    },

    tableNumber: {
      type: Number,
      required: true,
    },

    // =========================
    // ORDER ITEMS
    // =========================

    items: {
      type: [orderItemSchema],
      required: true,
    },

    // =========================
    // TOTALS
    // =========================

    totalItems: {
      type: Number,
      required: true,
    },

    totalPrice: {
      type: Number,
      required: true,
    },

    // =========================
    // ORDER STATUS
    // =========================

    status: {
      type: String,
      enum: [
        "Order Received",
        "Accepted",
        "Preparing",
        "Ready",
        "Served",
      ],
      default: "Order Received",
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model(
  "Order",
  orderSchema
);

export default Order;