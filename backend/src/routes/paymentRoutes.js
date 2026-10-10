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
  } else if (billingCycle === "SIX_MONTHS") {
    result.setMonth(result.getMonth() + 6);
  } else if (billingCycle === "TWELVE_MONTHS") {
    result.setFullYear(result.getFullYear() + 1);
  } else {
    throw new Error("Invalid billing cycle");
  }

  return result;
};

/*
  CREATE RAZORPAY ORDER
*/
router.post(
  "/create-order",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const restaurantId = req.user.restaurantId;

      if (!process.env.RAZORPAY_KEY_ID) {
        return res.status(500).json({
          message: "Razorpay Key ID is not configured",
        });
      }

      if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({
          message: "Razorpay Key Secret is not configured",
        });
      }

      const subscription = await Subscription.findOne({
        restaurantId,
        status: "pending",
      }).sort({ createdAt: -1 });

      if (!subscription) {
        return res.status(404).json({
          message: "No pending subscription found",
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

      if (subscription.orderId !== razorpay_order_id) {
          return res.status(400).json({
            message: "Order does not match the subscription",
            });
          }

      const amountInPaise = Math.round(
        subscription.amount * 100
      );

      if (amountInPaise <= 0) {
        return res.status(400).json({
          message: "Invalid subscription amount",
        });
      }

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

      const payment = await Payment.create({
        restaurantId,
        subscriptionId: subscription._id,
        provider: "razorpay",
        orderId: razorpayOrder.id,
        amount: subscription.amount,
        currency: "INR",
        status: "created",
      });

      subscription.orderId = razorpayOrder.id;
      await subscription.save();

      return res.status(201).json({
        message: "Razorpay order created",
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
  VERIFY RAZORPAY PAYMENT
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

      const restaurantId = req.user.restaurantId;

      const payment = await Payment.findOne({
        restaurantId,
        orderId: razorpay_order_id,
      });

      if (!payment) {
        return res.status(404).json({
          message: "Payment record not found",
        });
      }

      const generatedSignature = crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(
          `${payment.orderId}|${razorpay_payment_id}`
        )
        .digest("hex");

      const expected = Buffer.from(generatedSignature, "utf8");
      const received = Buffer.from(razorpay_signature, "utf8");

      if (
        expected.length !== received.length ||
        !crypto.timingSafeEqual(expected, received)
      ) {
        return res.status(400).json({
          message: "Invalid payment signature",
        });
      }

      const razorpayPayment = await razorpay.payments.fetch(
        razorpay_payment_id
      );

      if (razorpayPayment.status !== "captured") {
        return res.status(400).json({
          message: "Payment has not been captured yet",
          status: razorpayPayment.status,
        });
      }

      if (razorpayPayment.order_id !== payment.orderId) {
        return res.status(400).json({
          message: "Payment does not match the order",
        });
      }

      if (
        razorpayPayment.amount !==
        Math.round(payment.amount * 100)
      ) {
        return res.status(400).json({
          message: "Payment amount does not match",
        });
      }

      if (payment.status === "paid") {
        const existingSubscription = await Subscription.findById(
          payment.subscriptionId
        );

        return res.json({
          message: "Payment already verified",
          subscription: existingSubscription,
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

      const startDate = new Date();
      const expiryDate = addBillingPeriod(
        startDate,
        subscription.billingCycle
      );

      payment.paymentId = razorpay_payment_id;
      payment.signature = razorpay_signature;
      payment.status = "paid";
      payment.paidAt = new Date();
      await payment.save();

      subscription.status = "active";
      subscription.paymentProvider = "razorpay";
      subscription.paymentId = razorpay_payment_id;
      subscription.startDate = startDate;
      subscription.expiryDate = expiryDate;
      await subscription.save();

      // IMPORTANT: Restaurant.subscription is the single source of
      // truth used by ProtectedRoute and public customer ordering.
      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        owner: req.user.userId,
      });

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found",
        });
      }

      restaurant.subscription = {
        plan: subscription.plan,
        billingPeriod: subscription.billingCycle,
        status: "ACTIVE",
        trialStartedAt:
          restaurant.subscription?.trialStartedAt || null,
        trialEndsAt:
          restaurant.subscription?.trialEndsAt || null,
        currentPeriodStart: startDate,
        currentPeriodEnd: expiryDate,
      };

      await restaurant.save();

      return res.json({
        message: "Payment verified successfully",
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
