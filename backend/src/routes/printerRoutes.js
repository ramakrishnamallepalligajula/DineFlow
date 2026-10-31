
import express from "express";
import mongoose from "mongoose";

import PrinterDevice from "../models/PrinterDevice.js";
import User from "../models/User.js";

import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

import {
  createPairingCode,
  pairDevice,
} from "../services/printerAuthService.js";

const router = express.Router();

/*
=========================================================
PUBLIC DEVICE PAIRING
POST /api/printers/pair
=========================================================
*/

router.post("/pair", async (req, res) => {
  try {
    const { pairingCode } = req.body;

    const result = await pairDevice({ pairingCode });

    return res.status(200).json({
      success: true,
      message: "Device paired successfully.",
      device: {
        deviceId: result.deviceId,
        restaurantId: result.restaurantId,
        deviceName: result.deviceName,
        pairedAt: result.pairedAt,
      },
      // Returned only once. The Flutter app must store it securely.
      deviceToken: result.deviceToken,
    });
  } catch (error) {
    console.error("Printer pairing failed:", error.message);

    return res.status(400).json({
      success: false,
      message: "Invalid, expired or already-used pairing code.",
    });
  }
});

/*
=========================================================
PROTECTED ADMIN ROUTES
=========================================================
*/

router.use(authMiddleware);

/*
=========================================================
CREATE PAIRING CODE
ADMIN ONLY
POST /api/printers/pairing-code
=========================================================
*/

router.post(
  "/pairing-code",
  requireRole("admin"),
  async (req, res) => {
    try {
      const restaurantId = req.user.restaurantId;

      if (!mongoose.isValidObjectId(restaurantId)) {
        return res.status(403).json({
          success: false,
          message: "Your account is not linked to a restaurant.",
        });
      }

      const {
        deviceName,
        assignedUserId,
        capabilities,
      } = req.body;

      if (
        assignedUserId &&
        !mongoose.isValidObjectId(assignedUserId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID.",
        });
      }

      if (assignedUserId) {
        const assignedUser = await User.findOne({
          _id: assignedUserId,
          restaurantId,
        }).select("_id");

        if (!assignedUser) {
          return res.status(404).json({
            success: false,
            message: "Assigned user does not belong to your restaurant.",
          });
        }
      }

      const result = await createPairingCode({
        restaurantId,
        deviceName,
        assignedUserId: assignedUserId || null,
        capabilities,
      });

      return res.status(201).json({
        success: true,
        message: "Pairing code created successfully.",
        deviceId: result.deviceId,
        deviceName: result.deviceName,
        pairingCode: result.pairingCode,
        expiresAt: result.expiresAt,
      });
    } catch (error) {
      console.error("Pairing code creation failed:", error);

      return res.status(400).json({
        success: false,
        message: error.message || "Unable to create pairing code.",
      });
    }
  }
);

/*
=========================================================
GET ALL PRINTER DEVICES
ADMIN ONLY
GET /api/printers/devices
=========================================================
*/

router.get(
  "/devices",
  requireRole("admin"),
  async (req, res) => {
    try {
      const restaurantId = req.user.restaurantId;

      if (!mongoose.isValidObjectId(restaurantId)) {
        return res.status(403).json({
          success: false,
          message: "Your account is not linked to a restaurant.",
        });
      }

      const devices = await PrinterDevice.find({
        restaurantId,
      })
        .select(
          "-deviceTokenHash -pairingCodeHash -pairingCodeExpiresAt"
        )
        .populate("assignedUserId", "name email role")
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        success: true,
        devices,
      });
    } catch (error) {
      console.error("Fetching printer devices failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve printer devices.",
      });
    }
  }
);

/*
=========================================================
GET DEVICES ASSIGNED TO CURRENT STAFF MEMBER
ADMIN / STAFF
GET /api/printers/my-devices
=========================================================
*/

router.get(
  "/my-devices",
  requireRole("admin", "staff"),
  async (req, res) => {
    try {
      const devices = await PrinterDevice.find({
        restaurantId: req.user.restaurantId,
        assignedUserId: req.user.userId,
        status: { $ne: "DISABLED" },
      })
        .select(
          "-deviceTokenHash -pairingCodeHash -pairingCodeExpiresAt"
        )
        .lean();

      return res.json({
        success: true,
        devices,
      });
    } catch (error) {
      console.error("Fetching assigned printers failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve assigned printers.",
      });
    }
  }
);

/*
=========================================================
ASSIGN PRINTERS AND STAFF MEMBER
ADMIN ONLY
PUT /api/printers/devices/:deviceId/assignments
=========================================================
*/

router.put(
  "/devices/:deviceId/assignments",
  requireRole("admin"),
  async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { assignedUserId = null, assignments } = req.body;

      const restaurantId = req.user.restaurantId;

      if (
        !mongoose.isValidObjectId(deviceId) ||
        !mongoose.isValidObjectId(restaurantId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid device or restaurant ID.",
        });
      }

      if (
        assignedUserId !== null &&
        !mongoose.isValidObjectId(assignedUserId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID.",
        });
      }

      if (!Array.isArray(assignments) || assignments.length > 2) {
        return res.status(400).json({
          success: false,
          message: "Provide up to two printer assignments.",
        });
      }

      if (assignedUserId) {
        const user = await User.findOne({
          _id: assignedUserId,
          restaurantId,
        }).select("_id");

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "Assigned user does not belong to your restaurant.",
          });
        }
      }

      const allowedRoles = ["KITCHEN", "BILLING"];
      const allowedTypes = ["BLUETOOTH", "USB", "NETWORK"];

      const usedRoles = new Set();

      for (const assignment of assignments) {
        if (
          !allowedRoles.includes(assignment.printerRole) ||
          !allowedTypes.includes(assignment.connectionType) ||
          typeof assignment.printerName !== "string" ||
          !assignment.printerName.trim() ||
          ![58, 80].includes(Number(assignment.paperWidth))
        ) {
          return res.status(400).json({
            success: false,
            message: "One or more printer assignments are invalid.",
          });
        }

        if (usedRoles.has(assignment.printerRole)) {
          return res.status(400).json({
            success: false,
            message: "Each device can have only one assignment per printer role.",
          });
        }

        usedRoles.add(assignment.printerRole);
      }

      const device = await PrinterDevice.findOneAndUpdate(
        {
          _id: deviceId,
          restaurantId,
          status: { $ne: "DISABLED" },
        },
        {
          $set: {
            assignedUserId,
            printerAssignments: assignments.map((assignment) => ({
              printerRole: assignment.printerRole,
              printerName: assignment.printerName.trim(),
              connectionType: assignment.connectionType,
              connectionAddress: assignment.connectionAddress || null,
              paperWidth: Number(assignment.paperWidth),
              enabled: assignment.enabled !== false,
            })),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .select(
          "-deviceTokenHash -pairingCodeHash -pairingCodeExpiresAt"
        );

      if (!device) {
        return res.status(404).json({
          success: false,
          message: "Printer device not found.",
        });
      }

      return res.json({
        success: true,
        message: "Printer assignments updated successfully.",
        device,
      });
    } catch (error) {
      console.error("Printer assignment update failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update printer assignments.",
      });
    }
  }
);

/*
=========================================================
DISABLE PRINTER DEVICE
ADMIN ONLY
PATCH /api/printers/devices/:deviceId/disable
=========================================================
*/

router.patch(
  "/devices/:deviceId/disable",
  requireRole("admin"),
  async (req, res) => {
    try {
      const { deviceId } = req.params;
      const restaurantId = req.user.restaurantId;

      if (
        !mongoose.isValidObjectId(deviceId) ||
        !mongoose.isValidObjectId(restaurantId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid device or restaurant ID.",
        });
      }

      const device = await PrinterDevice.findOneAndUpdate(
        {
          _id: deviceId,
          restaurantId,
        },
        {
          $set: {
            status: "DISABLED",
            disabledAt: new Date(),
            deviceTokenHash: null,
          },
          $unset: {
            pairingCodeHash: "",
            pairingCodeExpiresAt: "",
          },
        },
        {
          new: true,
        }
      ).select(
        "-deviceTokenHash -pairingCodeHash -pairingCodeExpiresAt"
      );

      if (!device) {
        return res.status(404).json({
          success: false,
          message: "Printer device not found.",
        });
      }

      // Immediately disconnect existing sockets for this device.
      const io = req.app.get("io");

      if (io) {
        io.of("/printers")
          .in(`device:${deviceId}`)
          .disconnectSockets(true);
      }

      return res.json({
        success: true,
        message: "Printer device disabled successfully.",
        device,
      });
    } catch (error) {
      console.error("Disabling printer failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to disable printer device.",
      });
    }
  }
);

export default router;
