import Restaurant from "../models/Restaurant.js";

const subscriptionMiddleware = async (req, res, next) => {
  try {
    // ==========================================
    // CHECK RESTAURANT LINK
    // ==========================================

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
        message: "No subscription found",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    const now = new Date();

    // ==========================================
    // ACTIVE PAID SUBSCRIPTION
    // ==========================================

    if (subscription.status === "ACTIVE") {
      const periodEnd = subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd)
        : null;

      if (
        !periodEnd ||
        Number.isNaN(periodEnd.getTime())
      ) {
        return res.status(403).json({
          message:
            "Subscription expiry date is missing. Please contact support.",
          code: "SUBSCRIPTION_EXPIRY_MISSING",
        });
      }

      if (now >= periodEnd) {
        subscription.status = "EXPIRED";
        await restaurant.save();

        return res.status(403).json({
          message: "Your subscription has expired. Please renew.",
          code: "SUBSCRIPTION_EXPIRED",
        });
      }

      req.restaurant = restaurant;
      req.subscription = subscription;

      return next();
    }

    // ==========================================
    // 24-HOUR FREE TRIAL
    // ==========================================

    if (subscription.status === "TRIALING") {
      const trialStartedAt = subscription.trialStartedAt
        ? new Date(subscription.trialStartedAt)
        : null;

      const trialEndsAt = subscription.trialEndsAt
        ? new Date(subscription.trialEndsAt)
        : null;

      // Reject missing or invalid trial dates.
      if (
        !trialStartedAt ||
        Number.isNaN(trialStartedAt.getTime()) ||
        !trialEndsAt ||
        Number.isNaN(trialEndsAt.getTime()) ||
        trialEndsAt <= trialStartedAt
      ) {
        return res.status(403).json({
          message:
            "Trial dates are missing or invalid. Please contact support.",
          code: "TRIAL_DATES_INVALID",
        });
      }

      // Expire the trial once its end time is reached.
      if (now >= trialEndsAt) {
        subscription.status = "EXPIRED";
        await restaurant.save();

        return res.status(403).json({
          message:
            "Your 24-hour free trial has expired. Please subscribe.",
          code: "TRIAL_EXPIRED",
        });
      }

      req.restaurant = restaurant;
      req.subscription = subscription;

      return next();
    }

    // ==========================================
    // EXPIRED SUBSCRIPTION
    // ==========================================

    if (subscription.status === "EXPIRED") {
      return res.status(403).json({
        message:
          "Your subscription has expired. Please subscribe or renew.",
        code: "SUBSCRIPTION_EXPIRED",
      });
    }

    // ==========================================
    // CANCELLED SUBSCRIPTION
    // ==========================================

    if (subscription.status === "CANCELLED") {
      return res.status(403).json({
        message:
          "Your subscription has been cancelled. Please choose a plan.",
        code: "SUBSCRIPTION_CANCELLED",
      });
    }

    // ==========================================
    // ANY OTHER STATUS
    // ==========================================

    return res.status(403).json({
      message: "Subscription is not active.",
      code: "SUBSCRIPTION_INACTIVE",
    });
  } catch (error) {
    console.error("Subscription middleware error:", error);

    return res.status(500).json({
      message: "Failed to verify subscription",
    });
  }
};

export default subscriptionMiddleware;