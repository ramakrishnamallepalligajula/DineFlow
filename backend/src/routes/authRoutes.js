import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Restaurant from "../models/Restaurant.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

/* =========================================================
   REGISTER
========================================================= */

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      restaurantName,
      restaurantPhone,
      restaurantAddress,
    } = req.body;

    /* -------------------------
       VALIDATION
    ------------------------- */

    if (
      !name ||
      !email ||
      !password ||
      !restaurantName
    ) {
      return res.status(400).json({
        message:
          "Name, email, password and restaurant name are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters",
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
      return res.status(400).json({
        message: "User already exists",
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
       CREATE USER
    ------------------------- */

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "admin",
    });

    /* -------------------------
       CREATE RESTAURANT
    ------------------------- */

    const restaurant = await Restaurant.create({
      name: restaurantName.trim(),
      email: normalizedEmail,
      phone: restaurantPhone?.trim() || "",
      address: restaurantAddress?.trim() || "",
      owner: user._id,
    });

    /* -------------------------
       CONNECT USER → RESTAURANT
    ------------------------- */

    user.restaurantId = restaurant._id;

    await user.save();

    /* -------------------------
       CREATE JWT
    ------------------------- */

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

    /* -------------------------
       RESPONSE
    ------------------------- */

    return res.status(201).json({
      message: "Registration successful",

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
      },
    });
  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    return res.status(500).json({
      message: "Server error during registration",
    });
  }
});


/* =========================================================
   LOGIN
========================================================= */

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    /* -------------------------
       VALIDATION
    ------------------------- */

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    /* -------------------------
       FIND USER
    ------------------------- */

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    /* -------------------------
       CHECK PASSWORD
    ------------------------- */

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    /* -------------------------
       FIND RESTAURANT
    ------------------------- */

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

    /* -------------------------
       CREATE JWT
    ------------------------- */

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    /* -------------------------
       RESPONSE
    ------------------------- */

    return res.status(200).json({
      message: "Login successful",

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
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      message: "Server error during login",
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

/* =========================================================
   GET CURRENT USER
========================================================= */

router.get(
  "/me",
  authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(
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
          restaurantId: user.restaurantId,
        },

        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          email: restaurant.email,
          phone: restaurant.phone,
          address: restaurant.address,
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