/*
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
*/

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
    // CUSTOMER-FACING ORDER ID
    // =========================
    //
    // This can be the SAME for multiple
    // orders belonging to one table session.
    //
    // Example:
    //
    // Order #1042
    // Order #1042 - Additional #2
    // Order #1042 - Additional #3
    //
    // MongoDB _id remains unique for
    // every individual order document.
    // =========================

    orderId: {
      type: Number,
      required: true,
      index: true,
    },

    // =========================
    // TABLE SESSION
    // =========================

    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    // =========================
    // ORDER SEQUENCE
    // =========================
    //
    // 1 = first order
    // 2 = second order
    // 3 = third order
    // =========================

    orderSequence: {
      type: Number,
      required: true,
      min: 1,
    },

    // =========================
    // ORDER TYPE
    // =========================

    type: {
      type: String,
      enum: [
        "initial",
        "additional",
      ],
      default: "initial",
    },

    // =========================
    // TABLE
    // =========================

    tableId: {
      type: String,
      required: true,
      index: true,
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

// =========================
// INDEXES
// =========================

// Quickly find all orders
// belonging to a table session.
orderSchema.index({
  restaurantId: 1,
  sessionId: 1,
  createdAt: 1,
});

// Quickly find orders for a table.
orderSchema.index({
  restaurantId: 1,
  tableId: 1,
  createdAt: 1,
});

const Order = mongoose.model(
  "Order",
  orderSchema
);

export default Order;