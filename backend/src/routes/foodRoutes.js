import express from "express";
import Food from "../models/Food.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

/*
  GET ALL FOODS
  PUBLIC

  Customer QR ordering needs to access the menu
  without logging in.
*/
router.get("/", async (req, res) => {
  try {
    const { restaurantId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({
        message: "Restaurant ID is required",
      });
    }

    const foods = await Food.find({
      restaurantId,
    }).sort({ createdAt: -1 });

    res.json({ foods });
  } catch (error) {
    console.error("❌ Failed to fetch foods:", error);

    res.status(500).json({
      message: "Failed to fetch foods",
    });
  }
});

/*
  GET SINGLE FOOD
  PUBLIC
*/
router.get("/:id", async (req, res) => {
  try {
    const { restaurantId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({
        message: "Restaurant ID is required",
      });
    }

    const food = await Food.findOne({
      _id: req.params.id,
      restaurantId,
    });

    if (!food) {
      return res.status(404).json({
        message: "Food not found",
      });
    }

    res.json({ food });
  } catch (error) {
    console.error("❌ Failed to fetch food:", error);

    res.status(500).json({
      message: "Failed to fetch food",
    });
  }
});

/*
  CREATE FOOD
  ADMIN ONLY
*/
router.post(
  "/",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const {
        name,
        description,
        price,
        category,
        image,
        available,
      } = req.body;

      if (!name || price === undefined || !category) {
        return res.status(400).json({
          message: "Name, price and category are required",
        });
      }

      if (!req.user.restaurantId) {
        return res.status(400).json({
          message: "User is not linked to a restaurant",
        });
      }

      const food = await Food.create({
        restaurantId: req.user.restaurantId,
        name,
        description: description || "",
        price,
        category,
        image: image || "",
        available:
          available !== undefined ? available : true,
      });

      res.status(201).json({
        message: "Food created successfully",
        food,
      });
    } catch (error) {
      console.error("❌ Failed to create food:", error);

      res.status(500).json({
        message: "Failed to create food",
        error: error.message,
      });
    }
  }
);

/*
  UPDATE FOOD
  ADMIN ONLY
*/
router.put(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      if (!req.user.restaurantId) {
        return res.status(400).json({
          message: "User is not linked to a restaurant",
        });
      }

      const {
        name,
        description,
        price,
        category,
        image,
        available,
      } = req.body;

      const food = await Food.findOneAndUpdate(
        {
          _id: req.params.id,
          restaurantId: req.user.restaurantId,
        },
        {
          name,
          description,
          price,
          category,
          image,
          available,
        },
        {
          returnDocument: "after",
          runValidators: true,
        }
      );

      if (!food) {
        return res.status(404).json({
          message: "Food not found",
        });
      }

      res.json({
        message: "Food updated successfully",
        food,
      });
    } catch (error) {
      console.error("❌ Failed to update food:", error);

      res.status(500).json({
        message: "Failed to update food",
        error: error.message,
      });
    }
  }
);

/*
  DELETE FOOD
  ADMIN ONLY
*/
router.delete(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      if (!req.user.restaurantId) {
        return res.status(400).json({
          message: "User is not linked to a restaurant",
        });
      }

      const food = await Food.findOneAndDelete({
        _id: req.params.id,
        restaurantId: req.user.restaurantId,
      });

      if (!food) {
        return res.status(404).json({
          message: "Food not found",
        });
      }

      res.json({
        message: "Food deleted successfully",
      });
    } catch (error) {
      console.error("❌ Failed to delete food:", error);

      res.status(500).json({
        message: "Failed to delete food",
      });
    }
  }
);

export default router;