import mongoose from "mongoose";


/* =========================================================
   PRINT ITEM
========================================================= */

const printItemSchema = new mongoose.Schema(
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


/* =========================================================
   PRINT PAYLOAD
========================================================= */

const printPayloadSchema = new mongoose.Schema(
  {

    /* =====================================================
       COMMON / KITCHEN
    ===================================================== */

    orderNumber: {
      type: Number,
      default: null,
    },

    orderSequence: {
      type: Number,
      default: null,
      min: 1,
    },

    orderType: {
      type: String,
      enum: [
        "initial",
        "additional",
        null,
      ],
      default: null,
    },

    tableNumber: {
      type: String,
      default: null,
    },

    items: {
      type: [
        printItemSchema,
      ],
      default: [],
    },

    totalItems: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },


    /* =====================================================
       BILLING
    ===================================================== */

    sessionId: {
      type: String,
      default: null,
    },

    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null,
    },

    restaurantName: {
      type: String,
      default: "",
    },

    gstin: {
      type: String,
      default: "",
    },

    billDate: {
      type: Date,
      default: null,
    },

    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
      default: null,
    },

    billNumber: {
      type: Number,
      default: null,
    },

    orderId: {
      type: Number,
      default: null,
    },

    tableId: {
      type: String,
      default: null,
    },

    orderCount: {
      type: Number,
      default: null,
      min: 1,
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    cgst: {
      type: Number,
      default: 0,
      min: 0,
    },

    sgst: {
      type: Number,
      default: 0,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentMethod: {
  type: String,
  enum: [
    "CASH",
    "ONLINE",
    "UPI",
    "CARD",
    "OTHER",
    null,
  ],
  default: null,
},
  },

  {
    _id: false,
  }
);


/* =========================================================
   PRINT JOB
========================================================= */

const printJobSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    /*
     * For kitchen jobs this references Order._id.
     *
     * For billing jobs this references Bill._id.
     */
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
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

      enum: [
        "KITCHEN_ORDER",
        "BAR_ORDER",
        "BILL",
        "RECEIPT",
        "BILLING_RECEIPT",
      ],

      required: true,

      default:
        "KITCHEN_ORDER",
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

      default:
        "PENDING",

      index: true,
    },

    attempts: {
      type: Number,

      default: 0,

      min: 0,
    },

    /*
     * Immutable snapshot of what must be printed.
     */
    payload: {
      type:
        printPayloadSchema,

      required:
        true,
    },

    messageId: {
      type: String,

      default:
        null,
    },

    processingAt: {
      type: Date,

      default:
        null,
    },

    printedAt: {
      type: Date,

      default:
        null,
    },

    failedAt: {
      type: Date,

      default:
        null,
    },

    lastAttemptAt: {
      type: Date,

      default:
        null,
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
    timestamps:
      true,
  }
);


/* =========================================================
   IDEMPOTENCY
========================================================= */

printJobSchema.index(
  {
    restaurantId: 1,
    orderId: 1,
    printerId: 1,
    type: 1,
  },
  {
    unique: true,
  }
);


/* =========================================================
   QUEUE LOOKUP
========================================================= */

printJobSchema.index({
  restaurantId: 1,
  deviceId: 1,
  status: 1,
  createdAt: 1,
});


const PrintJob =
  mongoose.model(
    "PrintJob",
    printJobSchema
  );


export default PrintJob;