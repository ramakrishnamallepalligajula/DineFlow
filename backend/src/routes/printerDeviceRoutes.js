import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

import PrinterDevice from "../models/PrinterDevice.js";
import Printer from "../models/Printer.js";
import PrintJob from "../models/PrintJob.js";

import {
  createPairingCode,
  pairDevice,
} from "../services/printerAuthService.js";

const router = express.Router();


// ========================================
// AGENT PAIRING
// No admin JWT required
// Pairing code is the authentication mechanism
// ========================================

router.post("/pair", async (req, res) => {
  try {
    const {
      code,
      name,
      type,
      capabilities,
    } = req.body;

    const result = await pairDevice({
      code,
      name,
      type,
      capabilities,
    });

    return res.status(201).json({
      message: "Printer agent paired successfully",
      ...result,
    });

  } catch (error) {

    console.error(
      "❌ Printer agent pairing failed:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      message:
        error.message ||
        "Failed to pair printer agent",
    });
  }
});


// ========================================
// ADMIN / STAFF ROUTES
// ========================================

router.use(
  authMiddleware,
  requireRole("admin", "staff")
);


// ========================================
// GENERATE PAIRING CODE
// ========================================

router.post("/pairing-code", async (req, res) => {

  if (req.user.role !== "admin") {
    return res.status(403).json({
      message:
        "Only restaurant admins can pair devices",
    });
  }

  try {

    const result =
      await createPairingCode(
        req.user.restaurantId
      );

    return res.status(201).json({
      message:
        "Printer pairing code created",
      ...result,
    });

  } catch (error) {

    console.error(
      "❌ Failed to create pairing code:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to create pairing code",
    });
  }
});


// ========================================
// GET DEVICES
// ========================================

router.get("/", async (req, res) => {

  const devices =
    await PrinterDevice
      .find({
        restaurantId:
          req.user.restaurantId,
      })
      .sort({
        createdAt: -1,
      });

  return res.json({
    devices,
  });
});


// ========================================
// GET DEVICE
// ========================================

router.get(
  "/:deviceId",
  async (req, res) => {

    const device =
      await PrinterDevice.findOne({
        _id: req.params.deviceId,
        restaurantId:
          req.user.restaurantId,
      });

    if (!device) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    const [
      printers,
      pendingJobs,
    ] = await Promise.all([

      Printer.find({
        deviceId: device._id,
        restaurantId:
          req.user.restaurantId,
      }),

      PrintJob.countDocuments({
        deviceId: device._id,
        restaurantId:
          req.user.restaurantId,

        status: {
          $in: [
            "PENDING",
            "PROCESSING",
            "FAILED",
          ],
        },
      }),

    ]);

    return res.json({
      device,
      printers,
      pendingJobs,
    });
  }
);


// ========================================
// DISABLE DEVICE
// ========================================

router.delete(
  "/:deviceId",
  async (req, res) => {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message:
          "Only restaurant admins can disable devices",
      });
    }

    const device =
      await PrinterDevice.findOneAndUpdate(
        {
          _id: req.params.deviceId,
          restaurantId:
            req.user.restaurantId,
        },
        {
          $set: {
            status: "DISABLED",
            disabledAt: new Date(),
          },
        },
        {
          new: true,
        }
      );

    if (!device) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    return res.json({
      message: "Device disabled",
      device,
    });
  }
);


export default router;