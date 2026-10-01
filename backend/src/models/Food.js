import mongoose from "mongoose";

const foodSchema = new mongoose.Schema(
  {
    restaurantId: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "Restaurant",
       required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    available: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Food = mongoose.model("Food", foodSchema);

export default Food;