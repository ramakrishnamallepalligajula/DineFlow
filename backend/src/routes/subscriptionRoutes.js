import express from "express";

import Subscription from "../models/Subscription.js";
import plans from "../config/plans.js";

import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

const billingCycles = {
  MONTHLY: "monthly",
  SIX_MONTHS: "sixMonths",
  TWELVE_MONTHS: "yearly",
};

/*
  GET CURRENT / LATEST SUBSCRIPTION
*/
router.get(
  "/current",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const subscription = await Subscription.findOne({
        restaurantId: req.user.restaurantId,
      }).sort({ createdAt: -1 });

      if (!subscription) {
        return res.status(404).json({
          message: "No subscription found",
        });
      }

      return res.json(subscription);
    } catch (error) {
      console.error("Get subscription error:", error);

      return res.status(500).json({
        message: "Failed to get subscription",
      });
    }
  }
);

/*
  GET AVAILABLE PLANS
*/
router.get(
  "/plans",
  authMiddleware,
  requireRole("admin"),
  (req, res) => {
    return res.json(plans);
  }
);

/*
  CREATE / REUSE PENDING SUBSCRIPTION

  This record is the payment ledger. The restaurant's
  actual access state is stored in Restaurant.subscription
  and is activated only after successful payment verification.
*/
router.post(
  "/select-plan",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { plan, billingCycle } = req.body;

      if (!plan || !billingCycle) {
        return res.status(400).json({
          message: "Plan and billing cycle are required",
        });
      }

      if (!plans[plan]) {
        return res.status(400).json({
          message: "Invalid plan",
        });
      }

      const planKey = billingCycles[billingCycle];

      if (!planKey || !plans[plan][planKey]) {
        return res.status(400).json({
          message: "Invalid billing cycle",
        });
      }

      const amount = plans[plan][planKey].amount;

      // Reuse the most recent pending subscription instead of
      // creating multiple pending records for repeated clicks.
      let subscription = await Subscription.findOne({
        restaurantId: req.user.restaurantId,
        status: "pending",
      }).sort({ createdAt: -1 });

      if (subscription) {
        subscription.plan = plan;
        subscription.billingCycle = billingCycle;
        subscription.amount = amount;
        await subscription.save();
      } else {
        subscription = await Subscription.create({
          restaurantId: req.user.restaurantId,
          plan,
          billingCycle,
          status: "pending",
          amount,
        });
      }

      return res.status(201).json({
        message: "Subscription selected successfully",
        subscription,
      });
    } catch (error) {
      console.error("Select subscription error:", error);

      return res.status(500).json({
        message: "Failed to select subscription",
      });
    }
  }
);

export default router;
