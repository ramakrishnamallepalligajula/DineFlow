import crypto from "crypto";
import PrinterDevice from "../models/PrinterDevice.js";
import PrinterPairingCode from "../models/PrinterPairingCode.js";
const ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const hash=v=>crypto.createHash("sha256").update(v).digest("hex");
const code=()=>Array.from({length:6},()=>ALPHABET[crypto.randomInt(ALPHABET.length)]).join("");
export async function createPairingCode(restaurantId){
 await PrinterPairingCode.updateMany({restaurantId,usedAt:null},{$set:{usedAt:new Date()}});
 const raw=code(); const expiresAt=new Date(Date.now()+10*60*1000);
 await PrinterPairingCode.create({restaurantId,codeHash:hash(raw),expiresAt});
 return {code:raw,expiresAt};
}
export async function pairDevice({
  code: rawCode,
  name,
  type,
  capabilities = {},
}) {
  if (!rawCode || !name || !type) {
    const e = new Error("code, name and type are required");
    e.statusCode = 400;
    throw e;
  }

  const normalizedCode = rawCode.trim().toUpperCase();
  const normalizedName = name.trim();

  // =========================================================
  // 1. FIND VALID PAIRING CODE
  // =========================================================

  const pairing = await PrinterPairingCode.findOne({
    codeHash: hash(normalizedCode),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).select("+codeHash");

  if (!pairing) {
    const e = new Error("Invalid or expired pairing code");
    e.statusCode = 401;
    throw e;
  }

  // =========================================================
  // 2. CHECK IF DEVICE ALREADY EXISTS
  // =========================================================

  let device = await PrinterDevice.findOne({
    restaurantId: pairing.restaurantId,
    name: normalizedName,
  });

  // =========================================================
  // 3. EXISTING DISABLED DEVICE
  // =========================================================

  if (device?.status === "DISABLED") {
    const e = new Error(
      "This printer bridge is disabled. Enable it before pairing again."
    );

    e.statusCode = 403;

    throw e;
  }

  // =========================================================
  // 4. GENERATE NEW DEVICE SECRET
  // =========================================================

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

  // =========================================================
  // 5. UPDATE EXISTING DEVICE
  // =========================================================

  if (device) {
    device = await PrinterDevice.findOneAndUpdate(
      {
        _id: device._id,
        restaurantId: pairing.restaurantId,
      },
      {
        $set: deviceData,
      },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  // =========================================================
  // 6. CREATE NEW DEVICE
  // =========================================================

  else {
    try {
      device = await PrinterDevice.create({
        restaurantId: pairing.restaurantId,
        ...deviceData,
      });
    } catch (error) {
      // -------------------------------------------------------
      // Handle race condition
      // -------------------------------------------------------

      if (error?.code === 11000) {
        console.error(
          "⚠️ Printer device already exists during pairing:",
          error
        );

        const e = new Error(
          "A printer bridge with this name is already paired."
        );

        e.statusCode = 409;

        throw e;
      }

      throw error;
    }
  }

  // =========================================================
  // 7. CONSUME PAIRING CODE
  // =========================================================

  const consumed = await PrinterPairingCode.findOneAndUpdate(
    {
      _id: pairing._id,
      usedAt: null,
    },
    {
      $set: {
        usedAt: new Date(),
      },
    },
    {
      new: true,
    }
  );

  // =========================================================
  // 8. SAFETY CHECK
  // =========================================================

  if (!consumed) {
    const e = new Error("Pairing code has already been used");

    e.statusCode = 409;

    throw e;
  }

  // =========================================================
  // 9. RETURN DEVICE CREDENTIALS
  // =========================================================

  return {
    deviceId: device._id.toString(),

    restaurantId: device.restaurantId.toString(),

    deviceSecret: secret,
  };
}
export async function authenticateDevice(deviceId,secret){
 if(!deviceId||!secret)return null;
 const d=await PrinterDevice.findOne({_id:deviceId,status:{$ne:"DISABLED"}}).select("+credentialHash");
 if(!d?.credentialHash)return null;
 const a=Buffer.from(hash(secret),"hex"), b=Buffer.from(d.credentialHash,"hex");
 return a.length===b.length&&crypto.timingSafeEqual(a,b)?d:null;
}
