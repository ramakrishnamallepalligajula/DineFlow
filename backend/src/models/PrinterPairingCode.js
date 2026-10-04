import mongoose from "mongoose";
const schema = new mongoose.Schema({
  restaurantId:{type:mongoose.Schema.Types.ObjectId,ref:"Restaurant",required:true,index:true},
  codeHash:{
    type:String,
    required:true,
    select:false
  },
  expiresAt:{
    type:Date,
    required:true
  },
  usedAt:{
    type:Date,
    default:null
  }
},{timestamps:true});
schema.index({expiresAt:1},{expireAfterSeconds:0});
export default mongoose.model("PrinterPairingCode",schema);
