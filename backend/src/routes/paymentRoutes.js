import express from "express";
import crypto from "crypto";

import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

import Subscription from "../models/Subscription.js";
import Payment from "../models/Payment.js";

import razorpay from "../config/razorpay.js";

const router = express.Router();

/*
  CREATE RAZORPAY ORDER
*/

router.post(
  "/create-order",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const restaurantId =
        req.user.restaurantId;

      if (!process.env.RAZORPAY_KEY_ID) {
        return res.status(500).json({
          message:
            "Razorpay Key ID is not configured",
        });
      }

      if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({
          message:
            "Razorpay Key Secret is not configured",
        });
      }

      const subscription =
        await Subscription.findOne({
          restaurantId,
          status: "pending",
        }).sort({
          createdAt: -1,
        });

      if (!subscription) {
        return res.status(404).json({
          message:
            "No pending subscription found",
        });
      }

      const amountInPaise =
        Math.round(subscription.amount * 100);

      if (amountInPaise <= 0) {
        return res.status(400).json({
          message:
            "Invalid subscription amount",
        });
      }

      const razorpayOrder =
        await razorpay.orders.create({
          amount: amountInPaise,

          currency: "INR",

          receipt:
            `sub_${subscription._id}`,

          notes: {
            restaurantId:
              String(restaurantId),

            subscriptionId:
              String(subscription._id),

            billingCycle:
              subscription.billingCycle,
          },
        });

      const payment =
        await Payment.create({
          restaurantId,

          subscriptionId:
            subscription._id,

          provider: "razorpay",

          orderId:
            razorpayOrder.id,

          amount:
            subscription.amount,

          currency: "INR",

          status: "created",
        });

      /*
        Store Razorpay order ID
        in the subscription.
      */

      subscription.orderId =
        razorpayOrder.id;

      await subscription.save();

      return res.status(201).json({
        message:
          "Razorpay order created",

        order: {
          id:
            razorpayOrder.id,

          amount:
            razorpayOrder.amount,

          currency:
            razorpayOrder.currency,

          key:
            process.env.RAZORPAY_KEY_ID,
        },

        paymentId:
          payment._id,

        subscriptionId:
          subscription._id,
      });
    } catch (error) {
      console.error(
        "Create Razorpay order error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create payment order",
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
        razorpay_signature,
      } = req.body;

      if (
        !razorpay_payment_id ||
        !razorpay_signature
      ) {
        return res.status(400).json({
          message:
            "Payment verification data is missing",
        });
      }

      const restaurantId =
        req.user.restaurantId;

      /*
        Find the latest created payment
        belonging to this restaurant.
      */

      const payment =
        await Payment.findOne({
          restaurantId,

          status: "created",
        }).sort({
          createdAt: -1,
        });

      if (!payment) {
        return res.status(404).json({
          message:
            "Payment record not found",
        });
      }

      /*
        Generate Razorpay signature
        using the server-side secret.
      */

      const generatedSignature =
        crypto
          .createHmac(
            "sha256",
            process.env.RAZORPAY_KEY_SECRET
          )
          .update(
            `${payment.orderId}|${razorpay_payment_id}`
          )
          .digest("hex");

      /*
        Compare generated signature
        with Razorpay signature.
      */

      if (
        !crypto.timingSafeEqual(
          Buffer.from(
            generatedSignature
          ),
          Buffer.from(
            razorpay_signature
          )
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid payment signature",
        });
      }

      /*
        Fetch payment directly from
        Razorpay and confirm capture.
      */

      const razorpayPayment =
        await razorpay.payments.fetch(
          razorpay_payment_id
        );

      if (
        razorpayPayment.status !==
        "captured"
      ) {
        return res.status(400).json({
          message:
            "Payment has not been captured yet",

          status:
            razorpayPayment.status,
        });
      }

      /*
        Confirm that the Razorpay payment
        belongs to the order stored in our DB.
      */

      if (
        razorpayPayment.order_id !==
        payment.orderId
      ) {
        return res.status(400).json({
          message:
            "Payment does not match the order",
        });
      }

      /*
        Confirm the amount.
      */

      if (
        razorpayPayment.amount !==
        Math.round(payment.amount * 100)
      ) {
        return res.status(400).json({
          message:
            "Payment amount does not match",
        });
      }

      /*
        Prevent duplicate verification.
      */

      if (payment.status === "paid") {
        return res.json({
          message:
            "Payment already verified",
        });
      }

      /*
        Update payment record.
      */

      payment.paymentId =
        razorpay_payment_id;

      payment.signature =
        razorpay_signature;

      payment.status = "paid";

      payment.paidAt = new Date();

      await payment.save();

      /*
        Find related subscription.
      */

      const subscription =
        await Subscription.findById(
          payment.subscriptionId
        );

      if (!subscription) {
        return res.status(404).json({
          message:
            "Subscription not found",
        });
      }

      /*
        Calculate subscription dates.
      */

      const startDate =
        new Date();

      const expiryDate =
        new Date(startDate);

      if (
        subscription.billingCycle ===
        "monthly"
      ) {
        expiryDate.setMonth(
          expiryDate.getMonth() + 1
        );
      }

      if (
        subscription.billingCycle ===
        "yearly"
      ) {
        expiryDate.setFullYear(
          expiryDate.getFullYear() + 1
        );
      }

      /*
        Activate subscription.
      */

      subscription.status =
        "active";

      subscription.paymentProvider =
        "razorpay";

      subscription.paymentId =
        razorpay_payment_id;

      subscription.startDate =
        startDate;

      subscription.expiryDate =
        expiryDate;

      await subscription.save();

      /*
        Send successful response.
      */

      return res.json({
        message:
          "Payment verified successfully",

        subscription: {
          id:
            subscription._id,

          plan:
            subscription.plan,

          billingCycle:
            subscription.billingCycle,

          status:
            subscription.status,

          startDate:
            subscription.startDate,

          expiryDate:
            subscription.expiryDate,
        },
      });
    } catch (error) {
      console.error(
        "Payment verification error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to verify payment",
      });
    }
  }
);

export default router;