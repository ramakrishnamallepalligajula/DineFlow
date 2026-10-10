import mongoose from "mongoose";

const billItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      default: "",
      trim: true,
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

const billSchema = new mongoose.Schema(
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
    // TABLE SESSION
    // =========================================
    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    // Customer-facing order number
    orderId: {
      type: Number,
      required: true,
    },

    tableId: {
      type: String,
      required: true,
    },

    tableNumber: {
      // Supports values such as:
      // 1
      // AC-1
      // VIP-2
      type: String,
      required: true,
      trim: true,
    },

    // =========================================
    // BILL NUMBER
    // =========================================
    billNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    // =========================================
    // ORDERS INCLUDED IN THIS BILL
    // =========================================
    orderCount: {
      type: Number,
      required: true,
      min: 1,
    },

    items: {
      type: [billItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Bill must contain at least one item",
      },
    },

    totalItems: {
      type: Number,
      required: true,
      min: 1,
    },

    // =========================================
    // BILL CALCULATION
    // =========================================

    // GST-exclusive taxable amount
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    // =========================================
    // GST SNAPSHOT
    // =========================================

    // 5% total GST
    // 2.5% CGST + 2.5% SGST
    taxRate: {
      type: Number,
      required: true,
      min: 0,
      default: 5,
    },

    // Total GST amount
    tax: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // CGST = 2.5%
    cgst: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // SGST = 2.5%
    sgst: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // =========================================
    // FINAL BILL TOTAL
    // =========================================

    // GST-inclusive final amount
    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // =========================================
    // BILL STATUS
    // =========================================
    status: {
      type: String,
      enum: [
        "REQUESTED",
        "PRINTING",
        "PRINTED",
        "PAID",
        "CANCELLED",
      ],
      default: "REQUESTED",
      index: true,
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
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: [
        "CASH",
        "ONLINE",
        "UPI",
        "CARD",
        "OTHER",
      ],
      default: null,
    },

    // Razorpay payment/order reference
    paymentReference: {
      type: String,
      default: null,
      index: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },

  },
  {
    timestamps: true,
  }
);

// =========================================
// ONE BILL PER DINING SESSION
// =========================================

billSchema.index(
  {
    restaurantId: 1,
    sessionId: 1,
  },
  {
    unique: true,
  }
);

const Bill = mongoose.model("Bill", billSchema);

export default Bill;