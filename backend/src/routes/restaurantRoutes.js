import express from "express";

import Restaurant from "../models/Restaurant.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

// ==========================================
// UPDATE CURRENT RESTAURANT
// ==========================================

router.put(
  "/me",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      if (!req.user.restaurantId) {
        return res.status(400).json({
          message:
            "Restaurant not linked to this user",
        });
      }

      const {
        name,
        phone,
        address,
        taxSettings,
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          message:
            "Restaurant name is required",
        });
      }

      // ==========================================
      // TAX / GST SETTINGS
      // ==========================================

      let updatedTaxSettings;

      if (taxSettings) {
        const gstEnabled =
          taxSettings.gstEnabled === true;

        const gstRate = Number(
          taxSettings.gstRate ?? 5
        );

        const gstin = String(
          taxSettings.gstin ?? ""
        )
          .trim()
          .toUpperCase();

        if (
          !Number.isFinite(gstRate) ||
          gstRate < 0
        ) {
          return res.status(400).json({
            message:
              "Invalid GST rate",
          });
        }

        updatedTaxSettings = {
          gstEnabled,
          gstRate,
          gstin,
        };
      }

      // ==========================================
      // UPDATE RESTAURANT
      // ==========================================

      const updateData = {
        name: name.trim(),
        phone: phone || "",
        address: address || "",
      };

      if (updatedTaxSettings) {
        updateData.taxSettings =
          updatedTaxSettings;
      }

      const restaurant =
        await Restaurant.findOneAndUpdate(
          {
            _id: req.user.restaurantId,
            owner: req.user.userId,
          },
          updateData,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!restaurant) {
        return res.status(404).json({
          message:
            "Restaurant not found",
        });
      }

      console.log(
        "✅ Restaurant updated:",
        restaurant.name
      );

      console.log(
        "🧾 Tax settings:",
        restaurant.taxSettings
      );

      return res.json({
        message:
          "Restaurant updated successfully",

        restaurant,
      });
    } catch (error) {
      console.error(
        "❌ Failed to update restaurant:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update restaurant",
      });
    }
  }
);

// ==========================================
// START 7-DAY FREE TRIAL
// ==========================================

router.post(
  "/start-trial",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      // ==========================================
      // CHECK RESTAURANT LINK
      // ==========================================

      if (!req.user.restaurantId) {
        return res.status(400).json({
          message:
            "Restaurant not linked to this user",
        });
      }

      // ==========================================
      // GET SELECTED PLAN
      // ==========================================

      const {
        plan,
        billingPeriod,
      } = req.body;

      const allowedPlans = [
        "BASIC",
        "PRO",
      ];

      const allowedBillingPeriods = [
        "MONTHLY",
        "SIX_MONTHS",
        "TWELVE_MONTHS",
      ];

      // ==========================================
      // VALIDATE PLAN
      // ==========================================

      if (!allowedPlans.includes(plan)) {
        return res.status(400).json({
          message:
            "Invalid subscription plan",
        });
      }

      // ==========================================
      // VALIDATE BILLING PERIOD
      // ==========================================

      if (
        !allowedBillingPeriods.includes(
          billingPeriod
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid billing period",
        });
      }

      // ==========================================
      // FIND RESTAURANT
      // ==========================================

      const restaurant =
        await Restaurant.findOne({
          _id: req.user.restaurantId,
          owner: req.user.userId,
        });

      if (!restaurant) {
        return res.status(404).json({
          message:
            "Restaurant not found",
        });
      }

      // ==========================================
      // PREVENT MULTIPLE FREE TRIALS
      // ==========================================

      if (
        restaurant.subscription?.trialStartedAt
      ) {
        return res.status(400).json({
          message:
            "Free trial has already been used",
        });
      }

      // ==========================================
      // CREATE TRIAL DATES
      // ==========================================

      /*const trialStartedAt = new Date();

      const trialEndsAt = new Date(
        trialStartedAt
      );

      trialEndsAt.setDate(
        trialEndsAt.getDate() + 3
      );*/

      const trialStartedAt = new Date();

      const trialEndsAt = new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000
        );

      // ==========================================
      // SAVE SUBSCRIPTION
      // ==========================================

      restaurant.subscription = {
        plan,
        billingPeriod,
        status: "TRIALING",

        trialStartedAt,
        trialEndsAt,

        currentPeriodStart: null,
        currentPeriodEnd: null,
      };

      await restaurant.save();

      // ==========================================
      // LOG
      // ==========================================

      console.log(
        "🎉 7-day trial started:",
        {
          restaurant:
            restaurant.name,

          restaurantId:
            restaurant._id,

          plan,

          billingPeriod,

          trialStartedAt,

          trialEndsAt,
        }
      );

      // ==========================================
      // RESPONSE
      // ==========================================

      return res.status(200).json({
        message:
          "7-day free trial started successfully",

        subscription:
          restaurant.subscription,

        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
        },
      });
    } catch (error) {
      console.error(
        "❌ Failed to start free trial:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to start free trial",
      });
    }
  }
);

export default router;