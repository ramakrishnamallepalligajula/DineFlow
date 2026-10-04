import express from "express";
import {pairDevice} from "../services/printerAuthService.js";
const router=express.Router();
router.post("/pair",async(req,res)=>{try{return res.status(201).json({message:"Printer device paired successfully",...(await pairDevice(req.body))});}catch(e){return res.status(e.statusCode||500).json({message:e.statusCode?e.message:"Failed to pair printer device"});}});
export default router;
