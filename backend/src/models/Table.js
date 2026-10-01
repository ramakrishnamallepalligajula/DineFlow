import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    tableNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    /*
      Public identifier used by QR codes.

      Example:

      Restaurant A
      Table 1 → table-550e8400...

      Restaurant B
      Table 1 → table-7c9e6679...

      Therefore tableId is globally unique.
    */
    tableId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "Available",
        "Occupied",
        "Inactive",
      ],
      default: "Available",
    },
  },
  {
    timestamps: true,
  }
);


/*
  A table number only needs to be unique
  inside its own restaurant.

  Restaurant A → Table 1 ✅
  Restaurant B → Table 1 ✅

  Restaurant A → Table 1 again ❌
*/
tableSchema.index(
  {
    restaurantId: 1,
    tableNumber: 1,
  },
  {
    unique: true,
  }
);


const Table = mongoose.model(
  "Table",
  tableSchema
);

export default Table;