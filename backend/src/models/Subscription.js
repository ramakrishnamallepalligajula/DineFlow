import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["BASIC", "PRO"],
      required: true,
    },

    billingCycle: {
      type: String,
      enum: ["MONTHLY", "SIX_MONTHS", "TWELVE_MONTHS"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "active", "expired", "cancelled"],
      default: "pending",
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    startDate: {
      type: Date,
      default: null,
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    paymentProvider: {
      type: String,
      default: null,
    },

    paymentId: {
      type: String,
      default: null,
    },

    orderId: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({
  restaurantId: 1,
  createdAt: -1,
});

const Subscription = mongoose.model(
  "Subscription",
  subscriptionSchema
);

export default Subscription;
