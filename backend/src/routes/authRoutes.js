
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Restaurant from "../models/Restaurant.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

const TRIAL_DURATION_DAYS = 30;
const TRIAL_DURATION_MS =
  TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function normalizeGstin(gstin) {
  return String(gstin || "").trim().toUpperCase();
}

function createTrialDates() {
  const trialStartedAt = new Date();

  return {
    trialStartedAt,
    trialEndsAt: new Date(
      trialStartedAt.getTime() + TRIAL_DURATION_MS
    ),
  };
}

function createJwt(user, restaurant) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      restaurantId: restaurant._id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Consistent restaurant data for authentication responses.

function formatRestaurantData(restaurant) {
  return {
    id: restaurant._id,
    name: restaurant.name,
    email: restaurant.email,
    phone: restaurant.phone || "",
    address: restaurant.address || "",

    logo: {
      url: restaurant.logo?.url || "",
      publicId: restaurant.logo?.publicId || "",
    },

    taxSettings: {
      gstEnabled:
        restaurant.taxSettings?.gstEnabled === true,
      gstRate: restaurant.taxSettings?.gstRate ?? 5,
      gstin: restaurant.taxSettings?.gstin || "",
    },

    subscription: restaurant.subscription
      ? {
          plan: restaurant.subscription.plan,
          billingPeriod:
            restaurant.subscription.billingPeriod,
          status: restaurant.subscription.status,
          trialStartedAt:
            restaurant.subscription.trialStartedAt,
          trialEndsAt:
            restaurant.subscription.trialEndsAt,
          currentPeriodStart:
            restaurant.subscription.currentPeriodStart,
          currentPeriodEnd:
            restaurant.subscription.currentPeriodEnd,
        }
      : null,
  };
}

function formatAuthResponse(user, restaurant) {
  return {
    token: createJwt(user, restaurant),

    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      restaurantId: restaurant._id,
    },

    restaurant: formatRestaurantData(restaurant),
  };
}

function validateRestaurantInput({
  restaurantName,
  restaurantAddress,
  gstin,
}) {
  if (!restaurantName?.trim() || !restaurantAddress?.trim()) {
    return "Restaurant name and address are required.";
  }

  if (gstin && !GSTIN_REGEX.test(normalizeGstin(gstin))) {
    return "Please enter a valid 15-character GSTIN.";
  }

  return null;
}

// REGISTER — EMAIL/PASSWORD + 30-DAY TRIAL

router.post("/register", async (req, res) => {
  let createdUser = null;
  let createdRestaurant = null;

  try {
    const {
      name,
      email,
      password,
      restaurantName,
      restaurantAddress,
      gstin,
    } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !restaurantName?.trim() ||
      !restaurantAddress?.trim()
    ) {
      return res.status(400).json({
        message:
          "Name, email, password, restaurant name and address are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedGstin = normalizeGstin(gstin);

    if (normalizedGstin && !GSTIN_REGEX.test(normalizedGstin)) {
      return res.status(400).json({
        message: "Please enter a valid 15-character GSTIN.",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "admin",
    });

    createdUser = user;

    const { trialStartedAt, trialEndsAt } = createTrialDates();

    const restaurant = await Restaurant.create({
      name: restaurantName.trim(),
      email: normalizedEmail,
      address: restaurantAddress.trim(),
      owner: user._id,

      taxSettings: {
        gstEnabled: Boolean(normalizedGstin),
        gstRate: 5,
        gstin: normalizedGstin,
      },

      subscription: {
        plan: null,
        billingPeriod: null,
        status: "TRIALING",
        trialStartedAt,
        trialEndsAt,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
    });

    createdRestaurant = restaurant;

    user.restaurantId = restaurant._id;
    await user.save();

    const response = formatAuthResponse(user, restaurant);

    return res.status(201).json({
      message:
        "Registration successful. Your 30-day free trial has started.",
      ...response,
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (createdRestaurant?._id) {
      await Restaurant.deleteOne({
        _id: createdRestaurant._id,
      }).catch((cleanupError) => {
        console.error(
          "Restaurant cleanup failed:",
          cleanupError
        );
      });
    }

    if (createdUser?._id) {
      await User.deleteOne({
        _id: createdUser._id,
      }).catch((cleanupError) => {
        console.error("User cleanup failed:", cleanupError);
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with these details already exists.",
      });
    }

    return res.status(500).json({
      message: "Server error during registration.",
    });
  }
});

// EMAIL/PASSWORD LOGIN — ADMIN AND STAFF

router.post(["/login", "/staff-login"], async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+passwordHash");

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!user.restaurantId) {
      return res.status(403).json({
        message:
          "Your account is not linked to a restaurant. Please contact support.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const restaurant = await Restaurant.findById(
      user.restaurantId
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Your associated restaurant was not found.",
      });
    }

    const token = createJwt(user, restaurant);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },

      restaurant: formatRestaurantData(restaurant),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Server error during login.",
    });
  }
});

// CREATE STAFF

router.post(
  "/staff",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!name?.trim() || !email?.trim() || !password) {
        return res.status(400).json({
          message: "Name, email and password are required.",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await User.findOne({
        email: normalizedEmail,
      });

      if (existingUser) {
        return res.status(409).json({
          message: "User with this email already exists.",
        });
      }

      if (!req.user.restaurantId) {
        return res.status(403).json({
          message: "Admin account has no linked restaurant.",
        });
      }

      const restaurant = await Restaurant.findById(
        req.user.restaurantId
      );

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found.",
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const staff = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "staff",
        restaurantId: restaurant._id,
      });

      return res.status(201).json({
        message: "Staff account created successfully.",

        staff: {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          restaurantId: staff.restaurantId,
        },
      });
    } catch (error) {
      console.error("Create staff error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          message: "User with these details already exists.",
        });
      }

      return res.status(500).json({
        message: "Server error while creating staff.",
      });
    }
  }
);

// GET STAFF MEMBERS

router.get(
  "/staff",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const staff = await User.find({
        restaurantId: req.user.restaurantId,
        role: "staff",
      })
        .select("_id name email role restaurantId createdAt")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        staff: staff.map((member) => ({
          id: member._id,
          name: member.name,
          email: member.email,
          role: member.role,
          restaurantId: member.restaurantId,
          createdAt: member.createdAt,
        })),
      });
    } catch (error) {
      console.error("Get staff error:", error);

      return res.status(500).json({
        message: "Server error while fetching staff.",
      });
    }
  }
);

// GET CURRENT USER

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(
      req.user.userId
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const restaurant = user.restaurantId
      ? await Restaurant.findById(user.restaurantId)
      : null;

    if (!restaurant) {
      return res.status(404).json({
        message:
          "Restaurant associated with this account was not found.",
      });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },

      restaurant: formatRestaurantData(restaurant),
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      message: "Server error while fetching user.",
    });
  }
});

export default router;
