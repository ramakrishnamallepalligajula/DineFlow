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
      type: Number,
      required: true,
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

    // Amount before GST
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    // =========================================
    // GST SNAPSHOT
    // =========================================

    // GST rate that was active when this bill
    // was created.
    //
    // IMPORTANT:
    // We store this on the bill so changing the
    // restaurant GST setting later does NOT
    // change old bills.
    taxRate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Total GST amount
    //
    // This is kept as "tax" for compatibility
    // with the existing billing system.
    tax: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // CGST amount
    cgst: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // SGST amount
    sgst: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // =========================================
    // FINAL BILL TOTAL
    // =========================================

    // subtotal + GST
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
        "UPI",
        "CARD",
        "OTHER",
      ],
      default: null,
    },

    // =========================================
    // PRINTING
    // =========================================
    printedAt: {
      type: Date,
      default: null,
    },

    // =========================================
    // PAYMENT
    // =========================================
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