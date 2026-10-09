import crypto from "crypto";
import PrinterDevice from "../models/PrinterDevice.js";
import PrinterPairingCode from "../models/PrinterPairingCode.js";
import Printer from "../models/Printer.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const hash = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const generateCode = () =>
  Array.from({ length: 6 }, () =>
    ALPHABET[crypto.randomInt(ALPHABET.length)]
  ).join("");

export async function createPairingCode(restaurantId) {
  await PrinterPairingCode.updateMany(
    { restaurantId, usedAt: null },
    { $set: { usedAt: new Date() } }
  );
  const raw = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await PrinterPairingCode.create({
    restaurantId,
    codeHash: hash(raw),
    expiresAt,
  });
  return { code: raw, expiresAt };
}

export async function pairDevice({
  code: rawCode,
  name,
  type,
  capabilities = {},
  role,
  printerName,
  printerAddress,
  model = "",
}) {
  if (!rawCode || !name || !type) {
    const error = new Error("code, name and type are required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedCode = String(rawCode).trim().toUpperCase();
  const normalizedName = String(name).trim();
  const normalizedRole = role
    ? String(role).trim().toUpperCase()
    : null;

  if (normalizedRole && !["KITCHEN", "BILLING"].includes(normalizedRole)) {
    const error = new Error("role must be KITCHEN or BILLING");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedRole && (!printerAddress || !String(printerAddress).trim())) {
    const error = new Error("printerAddress is required when assigning a printer role");
    error.statusCode = 400;
    throw error;
  }

  const pairing = await PrinterPairingCode.findOne({
    codeHash: hash(normalizedCode),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).select("+codeHash");

  if (!pairing) {
    const error = new Error("Invalid or expired pairing code");
    error.statusCode = 401;
    throw error;
  }

  let device = await PrinterDevice.findOne({
    restaurantId: pairing.restaurantId,
    name: normalizedName,
  });

  if (device?.status === "DISABLED") {
    const error = new Error(
      "This printer device is disabled. An administrator must enable it before pairing again."
    );
    error.statusCode = 403;
    throw error;
  }

  const secret = crypto.randomBytes(32).toString("hex");
  const deviceData = {
    name: normalizedName,
    type,
    capabilities: {
      usb: !!capabilities.usb,
      network: !!capabilities.network,
      bluetooth: !!capabilities.bluetooth,
    },
    credentialHash: hash(secret),
    pairedAt: new Date(),
    status: "OFFLINE",
    disabledAt: null,
  };

  if (device) {
    device = await PrinterDevice.findOneAndUpdate(
      { _id: device._id, restaurantId: pairing.restaurantId },
      { $set: deviceData },
      { new: true, runValidators: true }
    );
  } else {
    try {
      device = await PrinterDevice.create({
        restaurantId: pairing.restaurantId,
        ...deviceData,
      });
    } catch (error) {
      if (error?.code === 11000) {
        const conflict = new Error("A printer device with this name is already paired.");
        conflict.statusCode = 409;
        throw conflict;
      }
      throw error;
    }
  }

  const consumed = await PrinterPairingCode.findOneAndUpdate(
    { _id: pairing._id, usedAt: null },
    { $set: { usedAt: new Date() } },
    { new: true }
  );

  if (!consumed) {
    const error = new Error("Pairing code has already been used");
    error.statusCode = 409;
    throw error;
  }

  let printer = null;
  if (normalizedRole) {
    // One Android station owns one local Bluetooth printer.
    // Re-pairing the same station updates its role and printer address.
    printer = await Printer.findOneAndUpdate(
      {
        restaurantId: pairing.restaurantId,
        deviceId: device._id,
      },
      {
        $set: {
          name: String(printerName || `${normalizedRole} Printer`).trim(),
          role: normalizedRole,
          connection: {
            type: "BLUETOOTH",
            address: String(printerAddress).trim(),
            port: 9100,
          },
          model: String(model || "").trim(),
          enabled: true,
          status: "UNKNOWN",
          lastError: { code: null, message: null, at: null },
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  return {
    deviceId: device._id.toString(),
    restaurantId: device.restaurantId.toString(),
    deviceSecret: secret,
    role: normalizedRole,
    printerId: printer?._id?.toString() || null,
  };
}

export async function authenticateDevice(deviceId, secret) {
  if (!deviceId || !secret) return null;
  const device = await PrinterDevice.findOne({
    _id: deviceId,
    status: { $ne: "DISABLED" },
  }).select("+credentialHash");
  if (!device?.credentialHash) return null;

  const actual = Buffer.from(hash(secret), "hex");
  const expected = Buffer.from(device.credentialHash, "hex");
  return actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
    ? device
    : null;
}
