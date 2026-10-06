import Restaurant from "../models/Restaurant.js";

const subscriptionMiddleware = async (req, res, next) => {
  try {
    if (!req.user?.restaurantId) {
      return res.status(403).json({
        message: "Restaurant not linked to this user",
        code: "RESTAURANT_NOT_LINKED",
      });
    }

    const restaurant = await Restaurant.findById(
      req.user.restaurantId
    ).select("subscription name");

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found",
        code: "RESTAURANT_NOT_FOUND",
      });
    }

    const subscription = restaurant.subscription;

    if (!subscription) {
      return res.status(403).json({
        message: "No active subscription",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    // =========================
    // FREE TRIAL
    // =========================

    if (subscription.status === "TRIALING") {
      if (!subscription.trialEndsAt) {
        return res.status(403).json({
          message: "Trial configuration is invalid",
          code: "INVALID_TRIAL",
        });
      }

      const now = new Date();
      const trialEndsAt = new Date(subscription.trialEndsAt);

      if (now >= trialEndsAt) {
        subscription.status = "EXPIRED";

        await restaurant.save();

        return res.status(403).json({
          message: "Your 7-day free trial has expired",
          code: "TRIAL_EXPIRED",
        });
      }

      req.restaurant = restaurant;
      req.subscription = subscription;

      return next();
    }

    // =========================
    // ACTIVE SUBSCRIPTION
    // =========================

    if (subscription.status === "ACTIVE") {
      if (subscription.currentPeriodEnd) {
        const now = new Date();
        const periodEnd = new Date(
          subscription.currentPeriodEnd
        );

        if (now >= periodEnd) {
          subscription.status = "EXPIRED";

          await restaurant.save();

          return res.status(403).json({
            message: "Your subscription has expired",
            code: "SUBSCRIPTION_EXPIRED",
          });
        }
      }

      req.restaurant = restaurant;
      req.subscription = subscription;

      return next();
    }

    // =========================
    // EXPIRED
    // =========================

    if (subscription.status === "EXPIRED") {
      return res.status(403).json({
        message: "Your subscription has expired",
        code: "SUBSCRIPTION_EXPIRED",
      });
    }

    // =========================
    // CANCELLED
    // =========================

    if (subscription.status === "CANCELLED") {
      return res.status(403).json({
        message: "Your subscription has been cancelled",
        code: "SUBSCRIPTION_CANCELLED",
      });
    }

    return res.status(403).json({
      message: "Subscription is not active",
      code: "SUBSCRIPTION_INACTIVE",
    });
  } catch (error) {
    console.error("❌ Subscription middleware error:", error);

    return res.status(500).json({
      message: "Failed to verify subscription",
    });
  }
};

export default subscriptionMiddleware;