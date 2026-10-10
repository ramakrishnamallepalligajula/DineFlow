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
    // RESTAURANT
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    // CUSTOMER-FACING ORDER ID
    orderId: {
      type: Number,
      required: true,
      index: true,
    },

    // TABLE SESSION
    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    orderSequence: {
      type: Number,
      required: true,
      min: 1,
    },

    type: {
      type: String,
      enum: ["initial", "additional"],
      default: "initial",
    },

    // TABLE
    tableId: {
      type: String,
      required: true,
      index: true,
    },

    tableNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // ORDER ITEMS
    items: {
      type: [orderItemSchema],
      required: true,
    },

    // TOTALS
    totalItems: {
      type: Number,
      required: true,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // ORDER STATUS
    status: {
      type: String,
      enum: ["Order Received", "Accepted"],
      default: "Order Received",
    },

    // PAYMENT METHOD
    paymentMethod: {
      type: String,
      enum: ["CASH", "ONLINE"],
      default: undefined,
    },

    // PAYMENT STATUS
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
      index: true,
    },

    // RAZORPAY REFERENCES
    razorpayOrderId: {
      type: String,
      default: undefined,
      trim: true,
    },

    razorpayPaymentId: {
      type: String,
      default: undefined,
      trim: true,
    },

    // Set only after verified payment or confirmed cash collection.
    paidAt: {
      type: Date,
      default: null,
    },

    // CASH COLLECTION AUDIT
    cashCollectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cashCollectedAt: {
      type: Date,
      default: null,
    },

    // UNIQUE REQUEST KEY FOR SAFE RETRIES
    idempotencyKey: {
      type: String,
      default: undefined,
      trim: true,
    },

    // SHA-256 HASH OF CUSTOMER RECOVERY TOKEN
    recoveryTokenHash: {
      type: String,
      default: undefined,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// SESSION ORDER LOOKUP
orderSchema.index({
  restaurantId: 1,
  sessionId: 1,
  createdAt: 1,
});

// TABLE ORDER LOOKUP
orderSchema.index({
  restaurantId: 1,
  tableId: 1,
  createdAt: 1,
});

// Prevent duplicate orders when the same request is retried.
orderSchema.index(
  {
    restaurantId: 1,
    idempotencyKey: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string" },
    },
  }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;