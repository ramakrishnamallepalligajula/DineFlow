import express from "express";

import Restaurant from "../models/Restaurant.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

// ==========================================
// GET CURRENT RESTAURANT
// ==========================================

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
          message: "Restaurant not linked to this user",
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
          message: "Restaurant name is required",
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
            message: "Invalid GST rate",
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
          message: "Restaurant not found",
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

      res.json({
        message:
          "Restaurant updated successfully",
        restaurant,
      });
    } catch (error) {
      console.error(
        "❌ Failed to update restaurant:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update restaurant",
      });
    }
  }
);

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
          message: "Restaurant not linked to this user",
        });
      }

      const {
        name,
        phone,
        address,
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          message: "Restaurant name is required",
        });
      }

      const restaurant = await Restaurant.findOneAndUpdate(
        {
          _id: req.user.restaurantId,
          owner: req.user.userId,
        },
        {
          name: name.trim(),
          phone: phone || "",
          address: address || "",
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found",
        });
      }

      console.log(
        "✅ Restaurant updated:",
        restaurant.name
      );

      res.json({
        message: "Restaurant updated successfully",
        restaurant,
      });
    } catch (error) {
      console.error(
        "❌ Failed to update restaurant:",
        error
      );

      res.status(500).json({
        message: "Failed to update restaurant",
      });
    }
  }
);

export default router;