import express from "express";
import Food from "../models/Food.js";
import Restaurant from "../models/Restaurant.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";
import subscriptionMiddleware from "../middleware/subscriptionMiddleware.js";

const router = express.Router();

/*
=========================================================
PUBLIC CUSTOMER MENU
=========================================================

Customer scans QR and loads menu without logging in.

Subscription is checked manually because the customer
does not have a JWT.
*/

router.get("/public", async (req, res) => {
  try {
    const { restaurantId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({
        message: "Restaurant ID is required",
      });
    }

    // =========================================
    // FIND RESTAURANT
    // =========================================

    const restaurant = await Restaurant.findById(
      restaurantId
    ).select("subscription");

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    const subscription = restaurant.subscription;

    // =========================================
    // NO SUBSCRIPTION
    // =========================================

    if (!subscription) {
      return res.status(403).json({
        message:
          "This restaurant does not have an active subscription.",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    // =========================================
    // TRIAL
    // =========================================

    if (subscription.status === "TRIALING") {
      if (
        !subscription.trialEndsAt ||
        new Date() >= new Date(subscription.trialEndsAt)
      ) {
        subscription.status = "EXPIRED";

        await restaurant.save();

        return res.status(403).json({
          message:
            "This restaurant's free trial has expired.",
          code: "TRIAL_EXPIRED",
        });
      }
    }

    // =========================================
    // ACTIVE SUBSCRIPTION
    // =========================================

    if (subscription.status === "ACTIVE") {
      if (
        subscription.currentPeriodEnd &&
        new Date() >= new Date(
          subscription.currentPeriodEnd
        )
      ) {
        subscription.status = "EXPIRED";

        await restaurant.save();

        return res.status(403).json({
          message:
            "This restaurant's subscription has expired.",
          code: "SUBSCRIPTION_EXPIRED",
        });
      }
    }

    // =========================================
    // EXPIRED / CANCELLED
    // =========================================

    if (
      subscription.status === "EXPIRED" ||
      subscription.status === "CANCELLED"
    ) {
      return res.status(403).json({
        message:
          "This restaurant's subscription is not active.",
        code:
          subscription.status === "EXPIRED"
            ? "SUBSCRIPTION_EXPIRED"
            : "SUBSCRIPTION_CANCELLED",
      });
    }

    // =========================================
    // GET MENU
    // =========================================

    const foods = await Food.find({
      restaurantId,
    }).sort({
      createdAt: -1,
    });

    res.json({
      foods,
    });
  } catch (error) {
    console.error(
      "❌ Failed to fetch public foods:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch menu",
    });
  }
});


/*
=========================================================
PROTECTED ADMIN / STAFF ROUTES
=========================================================
*/

router.use(authMiddleware);
router.use(subscriptionMiddleware);


/*
=========================================================
GET ALL FOODS
ADMIN / STAFF
=========================================================
*/

router.get("/", async (req, res) => {
  try {
    if (!req.user.restaurantId) {
      return res.status(400).json({
        message: "User is not linked to a restaurant",
      });
    }

    const foods = await Food.find({
      restaurantId: req.user.restaurantId,
    }).sort({
      createdAt: -1,
    });

    res.json({
      foods,
    });
  } catch (error) {
    console.error(
      "❌ Failed to fetch foods:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch foods",
    });
  }
});


/*
=========================================================
GET SINGLE FOOD
ADMIN / STAFF
=========================================================
*/

router.get("/:id", async (req, res) => {
  try {
    if (!req.user.restaurantId) {
      return res.status(400).json({
        message: "User is not linked to a restaurant",
      });
    }

    const food = await Food.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!food) {
      return res.status(404).json({
        message: "Food not found",
      });
    }

    res.json({
      food,
    });
  } catch (error) {
    console.error(
      "❌ Failed to fetch food:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch food",
    });
  }
});


/*
=========================================================
CREATE FOOD
ADMIN ONLY
=========================================================
*/

router.post(
  "/",
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

      if (
        !name ||
        price === undefined ||
        !category
      ) {
        return res.status(400).json({
          message:
            "Name, price and category are required",
        });
      }

      if (!req.user.restaurantId) {
        return res.status(400).json({
          message:
            "User is not linked to a restaurant",
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
          available !== undefined
            ? available
            : true,
      });

      res.status(201).json({
        message: "Food created successfully",
        food,
      });
    } catch (error) {
      console.error(
        "❌ Failed to create food:",
        error
      );

      res.status(500).json({
        message: "Failed to create food",
        error: error.message,
      });
    }
  }
);


/*
=========================================================
UPDATE FOOD
ADMIN ONLY
=========================================================
*/

router.put(
  "/:id",
  requireRole("admin"),
  async (req, res) => {
    try {
      if (!req.user.restaurantId) {
        return res.status(400).json({
          message:
            "User is not linked to a restaurant",
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

      const food =
        await Food.findOneAndUpdate(
          {
            _id: req.params.id,
            restaurantId:
              req.user.restaurantId,
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
      console.error(
        "❌ Failed to update food:",
        error
      );

      res.status(500).json({
        message: "Failed to update food",
        error: error.message,
      });
    }
  }
);


/*
=========================================================
DELETE FOOD
ADMIN ONLY
=========================================================
*/

router.delete(
  "/:id",
  requireRole("admin"),
  async (req, res) => {
    try {
      if (!req.user.restaurantId) {
        return res.status(400).json({
          message:
            "User is not linked to a restaurant",
        });
      }

      const food =
        await Food.findOneAndDelete({
          _id: req.params.id,
          restaurantId:
            req.user.restaurantId,
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
      console.error(
        "❌ Failed to delete food:",
        error
      );

      res.status(500).json({
        message: "Failed to delete food",
      });
    }
  }
);

export default router;