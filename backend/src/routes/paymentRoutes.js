import express from "express";
import crypto from "crypto";

import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

import Subscription from "../models/Subscription.js";
import Payment from "../models/Payment.js";
import Restaurant from "../models/Restaurant.js";

import razorpay from "../config/razorpay.js";

const router = express.Router();

const addBillingPeriod = (date, billingCycle) => {
  const result = new Date(date);

  if (billingCycle === "MONTHLY") {
    result.setMonth(result.getMonth() + 1);
  } else if (billingCycle === "TWELVE_MONTHS") {
    result.setFullYear(result.getFullYear() + 1);
  } else {
    throw new Error("Invalid billing cycle");
  }

  return result;
};

/*
=========================================================
CREATE RAZORPAY ORDER
POST /api/payments/create-order
=========================================================
*/

router.post(
  "/create-order",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const restaurantId = req.user.restaurantId;

      if (!restaurantId) {
        return res.status(400).json({
          message: "Restaurant is not linked to this account",
        });
      }

      if (
        !process.env.RAZORPAY_KEY_ID ||
        !process.env.RAZORPAY_KEY_SECRET
      ) {
        return res.status(500).json({
          message: "Razorpay credentials are not configured",
        });
      }

      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        owner: req.user.userId,
      });

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found",
        });
      }

      // Find the subscription selected by the frontend.
      const subscription = await Subscription.findOne({
        restaurantId,
        status: "pending",
      }).sort({ createdAt: -1 });

      if (!subscription) {
        return res.status(404).json({
          message: "No pending subscription found. Please select a plan again.",
        });
      }

      const amountInPaise = Math.round(
        Number(subscription.amount) * 100
      );

      if (
        !Number.isSafeInteger(amountInPaise) ||
        amountInPaise <= 0
      ) {
        return res.status(400).json({
          message: "Invalid subscription amount",
        });
      }

      // Create the order with Razorpay first.
      // Do not compare razorpay_order_id here:
      // Razorpay has not returned an order ID yet.
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `sub_${subscription._id}`,
        notes: {
          restaurantId: String(restaurantId),
          subscriptionId: String(subscription._id),
          billingCycle: subscription.billingCycle,
          plan: subscription.plan,
        },
      });

      // Save the newly created order against this subscription.
      subscription.orderId = razorpayOrder.id;
      await subscription.save();

      // Record the payment attempt.
      const payment = await Payment.create({
        restaurantId,
        subscriptionId: subscription._id,
        provider: "razorpay",
        orderId: razorpayOrder.id,
        amount: subscription.amount,
        currency: "INR",
        status: "created",
      });

      return res.status(201).json({
        message: "Razorpay order created successfully",
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID,
        },
        paymentId: payment._id,
        subscriptionId: subscription._id,
      });
    } catch (error) {
      console.error("Create Razorpay order error:", error);

      return res.status(500).json({
        message: "Failed to create payment order",
      });
    }
  }
);

/*
=========================================================
VERIFY RAZORPAY PAYMENT
POST /api/payments/verify
=========================================================
*/

router.post(
  "/verify",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
      } = req.body;

      if (
        !razorpay_payment_id ||
        !razorpay_order_id ||
        !razorpay_signature
      ) {
        return res.status(400).json({
          message: "Payment verification data is missing",
        });
      }

      if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({
          message: "Razorpay credentials are not configured",
        });
      }

      const restaurantId = req.user.restaurantId;

      if (!restaurantId) {
        return res.status(400).json({
          message: "Restaurant is not linked to this account",
        });
      }

      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        owner: req.user.userId,
      });

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found",
        });
      }

      const payment = await Payment.findOne({
        restaurantId,
        orderId: razorpay_order_id,
      });

      if (!payment) {
        return res.status(404).json({
          message: "Payment record not found",
        });
      }

      const subscription = await Subscription.findOne({
        _id: payment.subscriptionId,
        restaurantId,
      });

      if (!subscription) {
        return res.status(404).json({
          message: "Subscription not found",
        });
      }

      // The order ID comparison belongs here, during verification.
      if (subscription.orderId !== razorpay_order_id) {
        return res.status(400).json({
          message: "Order does not match the subscription",
        });
      }

      // Verify the Razorpay signature on the server.
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      const expected = Buffer.from(generatedSignature, "hex");
      const received = Buffer.from(razorpay_signature, "hex");

      if (
        expected.length !== received.length ||
        !crypto.timingSafeEqual(expected, received)
      ) {
        return res.status(400).json({
          message: "Invalid payment signature",
        });
      }

      // Confirm payment details directly with Razorpay.
      const razorpayPayment = await razorpay.payments.fetch(
        razorpay_payment_id
      );

      if (razorpayPayment.order_id !== razorpay_order_id) {
        return res.status(400).json({
          message: "Payment does not match the Razorpay order",
        });
      }

      if (razorpayPayment.status !== "captured") {
        return res.status(400).json({
          message: "Payment has not been captured yet",
          status: razorpayPayment.status,
        });
      }

      if (
        razorpayPayment.amount !==
        Math.round(Number(payment.amount) * 100)
      ) {
        return res.status(400).json({
          message: "Payment amount does not match",
        });
      }

      if (razorpayPayment.currency !== payment.currency) {
        return res.status(400).json({
          message: "Payment currency does not match",
        });
      }

      // Make repeated verification requests safe.
      if (payment.status === "paid") {
        return res.json({
          message: "Payment already verified",
          subscription,
          restaurant: {
            id: restaurant._id,
            subscription: restaurant.subscription,
          },
        });
      }

      if (subscription.status !== "pending") {
        return res.status(409).json({
          message: "Subscription is no longer pending",
        });
      }

      const startDate = new Date();

      // If renewing an active subscription, start after its current expiry.
      const existingExpiry = restaurant.subscription?.currentPeriodEnd;

      const effectiveStart =
        restaurant.subscription?.status === "ACTIVE" &&
        existingExpiry &&
        new Date(existingExpiry) > startDate
          ? new Date(existingExpiry)
          : startDate;

      const expiryDate = addBillingPeriod(
        effectiveStart,
        subscription.billingCycle
      );

      // Update the payment record.
      payment.paymentId = razorpay_payment_id;
      payment.signature = razorpay_signature;
      payment.status = "paid";
      payment.paidAt = new Date();

      await payment.save();

      // Activate the subscription ledger.
      subscription.status = "active";
      subscription.paymentProvider = "razorpay";
      subscription.paymentId = razorpay_payment_id;
      subscription.startDate = effectiveStart;
      subscription.expiryDate = expiryDate;

      await subscription.save();

      // Activate the restaurant subscription.
      restaurant.subscription = {
        plan: subscription.plan,
        billingPeriod: subscription.billingCycle,
        status: "ACTIVE",
        trialStartedAt:
          restaurant.subscription?.trialStartedAt || null,
        trialEndsAt:
          restaurant.subscription?.trialEndsAt || null,
        currentPeriodStart: effectiveStart,
        currentPeriodEnd: expiryDate,
      };

      await restaurant.save();

      return res.json({
        message: "Payment verified and subscription activated",
        subscription: {
          id: subscription._id,
          plan: subscription.plan,
          billingCycle: subscription.billingCycle,
          status: subscription.status,
          startDate: subscription.startDate,
          expiryDate: subscription.expiryDate,
        },
        restaurant: {
          id: restaurant._id,
          subscription: restaurant.subscription,
        },
      });
    } catch (error) {
      console.error("Payment verification error:", error);

      return res.status(500).json({
        message: "Failed to verify payment",
      });
    }
  }
);

export default router;
