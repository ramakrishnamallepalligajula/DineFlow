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

    // =========================================
    // PAYMENT SETTINGS
    // =========================================
    paymentSettings: {
      // Customer online payments can only be
      // enabled after Razorpay onboarding is ACTIVE.
      onlinePaymentsEnabled: {
        type: Boolean,
        default: false,
      },

      // Payment provider
      provider: {
        type: String,
        enum: ["RAZORPAY"],
        default: null,
      },

      // Razorpay onboarding / account status
      onboardingStatus: {
        type: String,
        enum: [
          "NOT_STARTED",
          "PENDING",
          "ACTIVE",
          "REJECTED",
          "SUSPENDED",
        ],
        default: "NOT_STARTED",
      },

      // Razorpay linked/merchant account ID.
      // Do NOT store bank account number here.
      razorpayAccountId: {
        type: String,
        default: null,
        trim: true,
      },

      // When Razorpay onboarding became active
      activatedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

const Restaurant = mongoose.model(
  "Restaurant",
  restaurantSchema
);

export default Restaurant;