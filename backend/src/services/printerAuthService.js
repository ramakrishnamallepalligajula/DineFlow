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
export async function pairDevice({code:rawCode,name,type,capabilities={}}){
 if(!rawCode||!name||!type){const e=new Error("code, name and type are required");e.statusCode=400;throw e;}
 const pairing=await PrinterPairingCode.findOne({codeHash:hash(rawCode.trim().toUpperCase()),usedAt:null,expiresAt:{$gt:new Date()}}).select("+codeHash");
 if(!pairing){const e=new Error("Invalid or expired pairing code");e.statusCode=401;throw e;}
 const secret=crypto.randomBytes(32).toString("hex");
 const device=await PrinterDevice.create({restaurantId:pairing.restaurantId,name:name.trim(),type,capabilities:{usb:!!capabilities.usb,network:!!capabilities.network,bluetooth:!!capabilities.bluetooth},credentialHash:hash(secret),pairedAt:new Date()});
 pairing.usedAt=new Date(); await pairing.save();
 return {deviceId:device._id.toString(),restaurantId:device.restaurantId.toString(),deviceSecret:secret};
}
export async function authenticateDevice(deviceId,secret){
 if(!deviceId||!secret)return null;
 const d=await PrinterDevice.findOne({_id:deviceId,status:{$ne:"DISABLED"}}).select("+credentialHash");
 if(!d?.credentialHash)return null;
 const a=Buffer.from(hash(secret),"hex"), b=Buffer.from(d.credentialHash,"hex");
 return a.length===b.length&&crypto.timingSafeEqual(a,b)?d:null;
}
