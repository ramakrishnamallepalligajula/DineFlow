import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =========================================
   // SUBSCRIPTION
  // =========================================
subscription: {
  plan: {
    type: String,
    enum: ["BASIC", "PRO"],
    default: null,
  },

  billingPeriod: {
    type: String,
    enum: [
      "MONTHLY",
      "SIX_MONTHS",
      "TWELVE_MONTHS",
    ],
    default: null,
  },

  status: {
    type: String,
    enum: [
      "TRIALING",
      "ACTIVE",
      "EXPIRED",
      "CANCELLED",
    ],
    default: "TRIALING",
  },

  trialStartedAt: {
    type: Date,
    default: null,
  },

  trialEndsAt: {
    type: Date,
    default: null,
  },

  currentPeriodStart: {
    type: Date,
    default: null,
  },

  currentPeriodEnd: {
    type: Date,
    default: null,
  },
},

    // =========================================
    // GST / TAX SETTINGS
    // =========================================
    taxSettings: {
      gstEnabled: {
        type: Boolean,
        default: false,
      },

      gstRate: {
        type: Number,
        default: 5,
        min: 0,
      },
      gstin: {
        type: String,
        default: "",
        trim: true,
        uppercase: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);

export default Restaurant;