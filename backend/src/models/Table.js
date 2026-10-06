import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    /*
      Table number / label.

      Supports:

      1
      2
      10
      AC-1
      AC_1
      NON-AC-1
      NON_AC_1
      VIP-1
      ROOF-1

      Stored as a string so restaurants can use
      custom table labels.
    */
    tableNumber: {
      type: String,
      required: true,
      trim: true,
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
  A table number / label only needs to be unique
  inside its own restaurant.

  Restaurant A → Table 1 ✅
  Restaurant B → Table 1 ✅

  Restaurant A → Table 1 again ❌

  Restaurant A → AC-1 ✅
  Restaurant A → NON-AC-1 ✅
  Restaurant A → VIP-1 ✅
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