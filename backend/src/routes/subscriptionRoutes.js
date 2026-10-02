import express from "express";

import Subscription from "../models/Subscription.js";
import plans from "../config/plans.js";

import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

/*
  GET CURRENT SUBSCRIPTION
*/

router.get(
  "/current",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const subscription =
        await Subscription.findOne({
          restaurantId: req.user.restaurantId,
        }).sort({
          createdAt: -1,
        });

      if (!subscription) {
        return res.status(404).json({
          message: "No subscription found",
        });
      }

      res.json(subscription);
    } catch (error) {
      console.error(
        "Get subscription error:",
        error
      );

      res.status(500).json({
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
    res.json(plans);
  }
);

/*
  CREATE PENDING SUBSCRIPTION
*/

router.post(
  "/select-plan",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const {
        plan,
        billingCycle,
      } = req.body;

      if (!plan || !billingCycle) {
        return res.status(400).json({
          message:
            "Plan and billing cycle are required",
        });
      }

      if (plan !== "dineflow") {
        return res.status(400).json({
          message: "Invalid plan",
        });
      }

      if (
        !plans[plan][billingCycle]
      ) {
        return res.status(400).json({
          message:
            "Invalid billing cycle",
        });
      }

      const amount =
        plans[plan][billingCycle].amount;

      const subscription =
        await Subscription.create({
          restaurantId:
            req.user.restaurantId,

          plan,

          billingCycle,

          status: "pending",

          amount,
        });

      res.status(201).json({
        message:
          "Subscription selected successfully",

        subscription,
      });
    } catch (error) {
      console.error(
        "Select subscription error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to select subscription",
      });
    }
  }
);

export default router;