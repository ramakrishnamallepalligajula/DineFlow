
import crypto from "crypto";
import mongoose from "mongoose";
import PrinterDevice from "../models/PrinterDevice.js";

const PAIRING_CODE_TTL_MS = 90 * 1000;

// Use a dedicated secret so printer credentials are independent
// of your normal dashboard JWT signing secret.
function getPrinterSecret() {
  const secret = process.env.PRINTER_AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "PRINTER_AUTH_SECRET must be configured with at least 32 characters."
    );
  }

  return secret;
}

// Create a deterministic hash so we can look up a pairing code
// without storing the original code in MongoDB.
function hashCredential(value) {
  return crypto
    .createHmac("sha256", getPrinterSecret())
    .update(value)
    .digest("hex");
}

function safeCompare(first, second) {
  if (typeof first !== "string" || typeof second !== "string") {
    return false;
  }

  const firstBuffer = Buffer.from(first, "hex");
  const secondBuffer = Buffer.from(second, "hex");

  return (
    firstBuffer.length === secondBuffer.length &&
    firstBuffer.length > 0 &&
    crypto.timingSafeEqual(firstBuffer, secondBuffer)
  );
}

/**
 * ADMIN:
 * Register an Android bridge device and generate a temporary
 * pairing code.
 */
export async function createPairingCode({
  restaurantId,
  deviceName,
  assignedUserId = null,
  capabilities = {},
}) {
  if (!mongoose.isValidObjectId(restaurantId)) {
    throw new Error("Invalid restaurant ID.");
  }

  if (
    typeof deviceName !== "string" ||
    !deviceName.trim() ||
    deviceName.trim().length > 100
  ) {
    throw new Error("A valid device name is required.");
  }

  if (
    assignedUserId &&
    !mongoose.isValidObjectId(assignedUserId)
  ) {
    throw new Error("Invalid assigned user ID.");
  }

  const pairingCode = crypto
    .randomInt(100000, 100000)
    .toString();

  const expiresAt = new Date(
    Date.now() + PAIRING_CODE_TTL_MS
  );

  const device = await PrinterDevice.create({
    restaurantId,
    assignedUserId,
    deviceName: deviceName.trim(),
    deviceType: "ANDROID_BRIDGE",
    status: "PENDING",

    capabilities: {
      bluetooth: Boolean(capabilities.bluetooth),
      usb: Boolean(capabilities.usb),
      network: Boolean(capabilities.network),
    },

    pairingCodeHash: hashCredential(pairingCode),
    pairingCodeExpiresAt: expiresAt,
  });

  // Return the pairing code only once.
  return {
    deviceId: String(device._id),
    deviceName: device.deviceName,
    pairingCode,
    expiresAt,
  };
}

/**
 * ANDROID BRIDGE:
 * Verify a pairing code and issue a permanent device token.
 *
 * The raw token is returned only once.
 */
export async function pairDevice({ pairingCode }) {
  if (
    typeof pairingCode !== "string" ||
    !/^\d{8}$/.test(pairingCode)
  ) {
    throw new Error("Invalid or expired pairing code.");
  }

  const pairingCodeHash = hashCredential(pairingCode);
  const now = new Date();

  const device = await PrinterDevice.findOne({
    pairingCodeHash,
    pairingCodeExpiresAt: { $gt: now },
    status: "PENDING",
  }).select("+pairingCodeHash +pairingCodeExpiresAt");

  if (!device) {
    throw new Error("Invalid or expired pairing code.");
  }

  const deviceToken = crypto.randomBytes(32).toString("base64url");
  const deviceTokenHash = hashCredential(deviceToken);

  // Atomic update prevents the same pairing code from being reused.
  const pairedDevice = await PrinterDevice.findOneAndUpdate(
    {
      _id: device._id,
      pairingCodeHash,
      pairingCodeExpiresAt: { $gt: now },
      status: "PENDING",
    },
    {
      $set: {
        deviceTokenHash,
        pairedAt: now,
        status: "OFFLINE",
      },
      $unset: {
        pairingCodeHash: "",
        pairingCodeExpiresAt: "",
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!pairedDevice) {
    throw new Error("Pairing code has already been used or expired.");
  }

  return {
    deviceId: String(pairedDevice._id),
    restaurantId: String(pairedDevice.restaurantId),
    deviceName: pairedDevice.deviceName,
    deviceToken,
    pairedAt: pairedDevice.pairedAt,
  };
}

/**
 * PRINTER SOCKET:
 * Verify a device ID and its authentication token.
 */
export async function verifyDeviceToken({
  deviceId,
  deviceToken,
}) {
  if (
    !mongoose.isValidObjectId(deviceId) ||
    typeof deviceToken !== "string" ||
    !deviceToken
  ) {
    return null;
  }

  const device = await PrinterDevice.findOne({
    _id: deviceId,
    status: { $in: ["OFFLINE", "ONLINE"] },
  }).select("+deviceTokenHash");

  if (!device || !device.deviceTokenHash) {
    return null;
  }

  const suppliedHash = hashCredential(deviceToken);

  if (!safeCompare(suppliedHash, device.deviceTokenHash)) {
    return null;
  }

  return device;
}

export default {
  createPairingCode,
  pairDevice,
  verifyDeviceToken,
};
