import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Restaurant from "../models/Restaurant.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";
import { firebaseAuth } from "../config/firebaseAdmin.js";

const router = express.Router();

// =========================================================
// FIREBASE AUTH — GOOGLE SIGN-IN / PHONE OTP
// =========================================================

router.post("/firebase", async (req, res) => {
  let createdUserId = null;
  let createdRestaurantId = null;

  try {
    const {
      idToken,
      name,
      contactEmail,
      restaurantName,
      restaurantAddress,
      gstin,
    } = req.body;

    if (!idToken) {
      return res.status(400).json({
        message: "Firebase ID token is required",
      });
    }

    // Firebase verifies the identity and token signature.
    const decoded = await firebaseAuth.verifyIdToken(idToken);

    const firebaseUid = decoded.uid;
    const verifiedEmail = decoded.email_verified
      ? decoded.email?.trim().toLowerCase()
      : null;
    const phoneNumber = decoded.phone_number || null;

    // Find an already-linked DineFlow account first.
    let user = await User.findOne({ firebaseUid });

    // Link an existing account only through a verified email.
    if (!user && verifiedEmail) {
      user = await User.findOne({ email: verifiedEmail });

      if (user && user.firebaseUid && user.firebaseUid !== firebaseUid) {
        return res.status(409).json({
          message:
            "This account is linked to another Firebase identity. Contact support.",
        });
      }
    }

    // Phone identity can match only an existing identical phone number.
    if (!user && phoneNumber) {
      user = await User.findOne({ phoneNumber });
    }


    // Firebase login is reserved for restaurant admins.
    // Staff must use their assigned email and password.
    if (user && user.role !== "admin") {
      return res.status(403).json({
        message:
          "Staff accounts must sign in with their assigned email and password.",
        code: "STAFF_PASSWORD_LOGIN_REQUIRED",
      });
    }


    if (user) {
      // Don't silently switch an account to a different Firebase UID.
      if (user.firebaseUid && user.firebaseUid !== firebaseUid) {
        return res.status(409).json({
          message: "This account is linked to another Firebase identity.",
        });
      }

      user.firebaseUid = firebaseUid;

      if (phoneNumber) {
        user.phoneNumber = phoneNumber;
      }

      if (!user.email && verifiedEmail) {
        user.email = verifiedEmail;
      }

      if (!user.name && (decoded.name || name)) {
        user.name = decoded.name || name;
      }

      await user.save();

      const restaurant = user.restaurantId
        ? await Restaurant.findById(user.restaurantId)
        : null;

      if (!restaurant) {
        return res.status(409).json({
          message:
            "Your account has no linked restaurant. Please complete restaurant setup.",
          requiresRestaurantSetup: true,
        });
      }

      const token = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          restaurantId: restaurant._id,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        message: "Firebase authentication successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          restaurantId: user.restaurantId,
        },
        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          email: restaurant.email,
          phone: restaurant.phone,
          address: restaurant.address,
          taxSettings: restaurant.taxSettings,
          subscription: restaurant.subscription,
        },
      });
    }

    // New users must complete restaurant setup.
    if (!restaurantName?.trim() || !restaurantAddress?.trim()) {
      return res.status(428).json({
        message: "Complete restaurant setup to create your DineFlow account.",
        requiresRestaurantSetup: true,
        firebaseUser: {
          name: decoded.name || name || "",
          email: verifiedEmail,
          phoneNumber,
        },
      });
    }

    // Phone-only accounts need a contact email because Restaurant.email
    // is required by the existing Restaurant schema.
    const normalizedContactEmail = (
      verifiedEmail || contactEmail || ""
    ).trim().toLowerCase();

    if (!normalizedContactEmail) {
      return res.status(400).json({
        message:
          "A contact email is required to register a restaurant with phone OTP.",
      });
    }

    // Never create a second account for an email already in use.
    const emailOwner = await User.findOne({
      email: normalizedContactEmail,
    });

    if (emailOwner) {
      return res.status(409).json({
        message:
          "This email already belongs to an account. Sign in using its linked method.",
      });
    }

    const normalizedGstin = String(gstin || "")
      .trim()
      .toUpperCase();

    const gstinRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

    if (normalizedGstin && !gstinRegex.test(normalizedGstin)) {
      return res.status(400).json({
        message: "Please enter a valid 15-character GSTIN",
      });
    }

    // Create a trial only for a genuinely new restaurant.
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(
      trialStartedAt.getTime() + 24 * 60 * 60 * 1000
    );

    const newUser = await User.create({
      name: (decoded.name || name || "DineFlow Owner").trim(),
      email: normalizedContactEmail,
      passwordHash: null,
      firebaseUid,
      phoneNumber,
      role: "admin",
    });

    createdUserId = newUser._id;

    const restaurant = await Restaurant.create({
      name: restaurantName.trim(),
      email: normalizedContactEmail,
      address: restaurantAddress.trim(),
      owner: newUser._id,
      taxSettings: {
        gstEnabled: false,
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

    createdRestaurantId = restaurant._id;

    newUser.restaurantId = restaurant._id;
    await newUser.save();

    const token = jwt.sign(
      {
        userId: newUser._id,
        role: newUser.role,
        restaurantId: restaurant._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Account created. Your 24-hour trial has started.",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        restaurantId: newUser.restaurantId,
      },
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        email: restaurant.email,
        address: restaurant.address,
        taxSettings: restaurant.taxSettings,
        subscription: restaurant.subscription,
      },
    });
  } catch (error) {
    console.error("Firebase authentication error:", error);

    // Clean up an incomplete new registration.
    if (createdRestaurantId) {
      await Restaurant.deleteOne({ _id: createdRestaurantId }).catch(
        (cleanupError) =>
          console.error("Restaurant cleanup failed:", cleanupError)
      );
    }

    if (createdUserId) {
      await User.deleteOne({ _id: createdUserId }).catch(
        (cleanupError) =>
          console.error("User cleanup failed:", cleanupError)
      );
    }

    if (
      error.code === "auth/argument-error" ||
      error.code === "auth/id-token-expired" ||
      error.code === "auth/id-token-revoked"
    ) {
      return res.status(401).json({
        message: "Firebase token is invalid or expired. Please sign in again.",
      });
    }

    return res.status(500).json({
      message: "Firebase authentication failed",
    });
  }
});
// =========================================================
// REGISTER — AUTOMATIC 24-HOUR FREE TRIAL
// =========================================================

router.post("/register", async (req, res) => {
  let createdUser = null;

  try {
    const {
      name,
      email,
      password,
      restaurantName,
      restaurantAddress,
      gstin,
    } = req.body;

    // -----------------------------------------------------
    // VALIDATION
    // -----------------------------------------------------

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !restaurantName?.trim() ||
      !restaurantAddress?.trim()
    ) {
      return res.status(400).json({
        message:
          "Name, email, password, restaurant name and address are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // -----------------------------------------------------
    // GSTIN — OPTIONAL
    // -----------------------------------------------------

    const normalizedGstin = String(gstin || "")
      .trim()
      .toUpperCase();

    const gstinRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

    if (
      normalizedGstin &&
      !gstinRegex.test(normalizedGstin)
    ) {
      return res.status(400).json({
        message: "Please enter a valid 15-character GSTIN",
      });
    }

    // -----------------------------------------------------
    // CHECK EXISTING USER
    // -----------------------------------------------------

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    // -----------------------------------------------------
    // CREATE USER
    // -----------------------------------------------------

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "admin",
    });

    createdUser = user;

    // -----------------------------------------------------
    // START 24-HOUR TRIAL AUTOMATICALLY
    // -----------------------------------------------------

    const trialStartedAt = new Date();

    const trialEndsAt = new Date(
      trialStartedAt.getTime() + 24 * 60 * 60 * 1000
    );

    // -----------------------------------------------------
    // CREATE RESTAURANT
    // -----------------------------------------------------

    const restaurant = await Restaurant.create({
      name: restaurantName.trim(),
      email: normalizedEmail,
      address: restaurantAddress.trim(),
      owner: user._id,

      taxSettings: {
        gstEnabled: false,
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

    // -----------------------------------------------------
    // LINK USER TO RESTAURANT
    // -----------------------------------------------------

    user.restaurantId = restaurant._id;
    await user.save();

    // -----------------------------------------------------
    // CREATE JWT
    // -----------------------------------------------------

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        restaurantId: restaurant._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // -----------------------------------------------------
    // RESPONSE
    // -----------------------------------------------------

    return res.status(201).json({
      message: "Registration successful. Your 24-hour free trial has started.",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },

      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        email: restaurant.email,
        address: restaurant.address,
        taxSettings: restaurant.taxSettings,
        subscription: restaurant.subscription,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Avoid leaving an orphaned user if restaurant creation fails.
    if (createdUser?._id) {
      try {
        await User.deleteOne({ _id: createdUser._id });
      } catch (cleanupError) {
        console.error(
          "Failed to clean up incomplete registration:",
          cleanupError
        );
      }
    }

    return res.status(500).json({
      message: "Server error during registration",
    });
  }
});

/* =========================================================
   LOGIN
========================================================= */



router.post(["/login", "/staff-login"], async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Password hash is excluded by default in the User schema.
    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+passwordHash");

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Email/password login is exclusively for staff.
    if (user.role !== "staff") {
      return res.status(403).json({
        message:
          "Please use Google Login to access your admin account.",
        code: "ADMIN_GOOGLE_LOGIN_REQUIRED",
      });
    }

    if (!user.restaurantId) {
      return res.status(403).json({
        message:
          "Your staff account is not linked to a restaurant. Contact your admin.",
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

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        restaurantId: restaurant._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Staff login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        email: restaurant.email,
        phone: restaurant.phone,
        address: restaurant.address,
        subscription: restaurant.subscription,
      },
    });
  } catch (error) {
    console.error("Staff login error:", error);

    return res.status(500).json({
      message: "Server error during staff login.",
    });
  }
});



/* =========================================================
   CREATE STAFF
========================================================= */

router.post(
  "/staff",authMiddleware,requireRole("admin"),
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
      } = req.body;

      /* -------------------------
         VALIDATION
      ------------------------- */

      if (!name || !email || !password) {
        return res.status(400).json({
          message: "Name, email and password are required",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters",
        });
      }

      const normalizedEmail = email
        .trim()
        .toLowerCase();

      /* -------------------------
         CHECK EXISTING USER
      ------------------------- */

      const existingUser = await User.findOne({
        email: normalizedEmail,
      });

      if (existingUser) {
        return res.status(409).json({
          message: "User with this email already exists",
        });
      }

      /* -------------------------
         HASH PASSWORD
      ------------------------- */

      const passwordHash = await bcrypt.hash(
        password,
        10
      );

      /* -------------------------
         CREATE STAFF
      ------------------------- */

      const staff = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "staff",

        // IMPORTANT:
        // Staff automatically belongs
        // to the admin's restaurant.
        restaurantId: req.user.restaurantId,
      });

      /* -------------------------
         RESPONSE
      ------------------------- */

      return res.status(201).json({
        message: "Staff account created successfully",

        staff: {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          restaurantId: staff.restaurantId,
        },
      });

    } catch (error) {
      console.error(
        "Create staff error:",
        error
      );

      return res.status(500).json({
        message: "Server error while creating staff",
      });
    }
  }
);

/* =========================================================
   GET STAFF MEMBERS
========================================================= */

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
      console.error(
        "Get staff error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error while fetching staff",
      });
    }
  }
);
// =========================================================
// GET CURRENT USER
// =========================================================

router.get(
  "/me",
  authMiddleware,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user.userId
        ).select("-passwordHash");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const restaurant =
        await Restaurant.findById(
          user.restaurantId
        );

      if (!restaurant) {
        return res.status(404).json({
          message:
            "Restaurant associated with this account was not found",
        });
      }

      return res.status(200).json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          restaurantId:
            user.restaurantId,
        },

        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          email: restaurant.email,
          phone: restaurant.phone,
          address: restaurant.address,

          subscription:
            restaurant.subscription
              ? {
                  plan:
                    restaurant.subscription.plan,

                  billingPeriod:
                    restaurant.subscription.billingPeriod,

                  status:
                    restaurant.subscription.status,

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
        },
      });
    } catch (error) {
      console.error(
        "Get current user error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error while fetching user",
      });
    }
  }
);



export default router;