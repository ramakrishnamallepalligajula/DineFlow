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

      /*
       * IMPORTANT:
       *
       * Do NOT accept paymentSettings from this
       * general restaurant update endpoint.
       *
       * We don't want a frontend request such as:
       *
       * onboardingStatus: "ACTIVE"
       *
       * to activate online payments.
       *
       * Razorpay onboarding will control the payment
       * activation status through the backend.
       */

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
// GET PAYMENT SETTINGS
// ==========================================
//
// Used by the admin Payment Settings UI.
//
// This endpoint only returns the payment state.
// It does NOT activate payments.
//
// ==========================================

router.get(
  "/payment-settings",
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
      // FIND RESTAURANT
      // ==========================================

      const restaurant =
        await Restaurant.findOne({
          _id: req.user.restaurantId,
          owner: req.user.userId,
        }).select(
          "name paymentSettings"
        );

      if (!restaurant) {
        return res.status(404).json({
          message:
            "Restaurant not found",
        });
      }

      // ==========================================
      // SAFE PAYMENT RESPONSE
      // ==========================================

      const paymentSettings =
        restaurant.paymentSettings || {};

      return res.status(200).json({
        paymentSettings: {
          onlinePaymentsEnabled:
            paymentSettings
              .onlinePaymentsEnabled === true,

          provider:
            paymentSettings.provider || null,

          onboardingStatus:
            paymentSettings.onboardingStatus ||
            "NOT_STARTED",

          razorpayAccountId:
            paymentSettings.razorpayAccountId ||
            null,

          activatedAt:
            paymentSettings.activatedAt ||
            null,
        },
      });
    } catch (error) {
      console.error(
        "❌ Failed to load payment settings:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to load payment settings",
      });
    }
  }
);

// ==========================================
// START RAZORPAY ONBOARDING
// ==========================================
//
// IMPORTANT:
//
// This is intentionally NOT connected to Razorpay
// yet.
//
// Once Razorpay Partner / Route onboarding is
// configured, this endpoint will create/start the
// actual restaurant onboarding process.
//
// ==========================================

router.post(
  "/payment-settings/onboarding",
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
      // ALREADY ACTIVE
      // ==========================================

      if (
        restaurant.paymentSettings
          ?.onboardingStatus === "ACTIVE"
      ) {
        return res.status(400).json({
          message:
            "Online payments are already active",
        });
      }

      // ==========================================
      // ALREADY PENDING
      // ==========================================

      if (
        restaurant.paymentSettings
          ?.onboardingStatus === "PENDING"
      ) {
        return res.status(200).json({
          message:
            "Razorpay onboarding is already in progress",

          onboardingStatus:
            "PENDING",
        });
      }

      /*
       * ==========================================
       * RAZORPAY ONBOARDING WILL BE IMPLEMENTED
       * HERE.
       * ==========================================
       *
       * Future flow:
       *
       * Restaurant
       *      ↓
       * DineFlow backend
       *      ↓
       * Razorpay onboarding API
       *      ↓
       * Business details
       *      ↓
       * Bank details
       *      ↓
       * KYC
       *      ↓
       * Razorpay verification
       *      ↓
       * ACTIVE
       *
       * We do NOT mark the restaurant as ACTIVE here.
       */

      return res.status(501).json({
        message:
          "Razorpay onboarding is not configured yet",
      });
    } catch (error) {
      console.error(
        "❌ Failed to start Razorpay onboarding:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to start Razorpay onboarding",
      });
    }
  }
);

// ==========================================
// DISABLE ONLINE PAYMENTS
// ==========================================
//
// Admin can disable online payments after
// onboarding.
//
// IMPORTANT:
// This does NOT delete the Razorpay account.
// It only prevents DineFlow customers from
// seeing online payment as an option.
//
// ==========================================

router.patch(
  "/payment-settings/disable",
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
      // DISABLE ONLINE PAYMENTS
      // ==========================================

      restaurant.paymentSettings =
        restaurant.paymentSettings || {};

      restaurant.paymentSettings
        .onlinePaymentsEnabled = false;

      await restaurant.save();

      console.log(
        "💳 Online payments disabled:",
        restaurant.name
      );

      return res.status(200).json({
        message:
          "Online payments disabled successfully",

        paymentSettings:
          restaurant.paymentSettings,
      });
    } catch (error) {
      console.error(
        "❌ Failed to disable online payments:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to disable online payments",
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

      const trialStartedAt = new Date();

      const trialEndsAt = new Date(
        Date.now() +
          3 * 24 * 60 * 60 * 1000
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