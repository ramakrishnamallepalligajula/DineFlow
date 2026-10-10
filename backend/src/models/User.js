import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      default: null,
      select: false,
    },

    // Firebase Authentication UID
    firebaseUid: {
      type: String,
      default: null,
      trim: true,
    },

    // Phone number in E.164 format, e.g. +919876543210
    phoneNumber: {
      type: String,
      default: null,
      trim: true,
    },

    role: {
      type: String,
      enum: ["admin", "staff"],
      default: "admin",
    },

    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce uniqueness only when an email or Firebase UID is present.
userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string" } },
  }
);

userSchema.index(
  { firebaseUid: 1 },
  {
    unique: true,
    partialFilterExpression: { firebaseUid: { $type: "string" } },
  }
);

userSchema.index(
  { phoneNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { phoneNumber: { $type: "string" } },
  }
);

const User = mongoose.model("User", userSchema);

export default User;
