import express from "express";
import mongoose from "mongoose";

import Bill from "../models/Bill.js";
import Restaurant from "../models/Restaurant.js";

import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

import plans from "../config/plans.js";

const router = express.Router();

const PRO_BILL_RETENTION_DAYS = 90;

// Normalize plan names because older records may use
// "PRO", "Pro", or "Premium".
function normalizePlan(plan) {
  return String(plan || "")
    .trim()
    .toUpperCase();
}

function getRestaurantId(req) {
  return (
    req.user?.restaurantId ||
    req.user?.restaurant?._id ||
    null
  );
}

/*
=========================================================
SUBSCRIPTION ACCESS + RETENTION
=========================================================
*/
async function getBillHistoryAccess(restaurantId) {
  const restaurant = await Restaurant.findById(
    restaurantId
  ).select("subscription");

  if (!restaurant || !restaurant.subscription) {
    return {
      allowed: false,
      status: 403,
      message:
        "An active subscription is required to access bill history.",
    };
  }

  const subscription = restaurant.subscription;
  const now = new Date();

  const subscriptionStatus = String(
    subscription.status || ""
  ).toUpperCase();

  // An expired trial cannot access bill history.
  if (subscriptionStatus === "TRIALING") {
    const trialEnd = subscription.trialEndsAt
      ? new Date(subscription.trialEndsAt)
      : null;

    if (!trialEnd || now >= trialEnd) {
      if (
        !subscription.trialEndsAt ||
        !Number.isNaN(trialEnd?.getTime())
      ) {
        subscription.status = "EXPIRED";
        await restaurant.save();
      }

      return {
        allowed: false,
        status: 403,
        message:
          "Your subscription has expired. Renew to access bill history.",
      };
    }
  }

  // Paid subscription must be active and within its period.
  if (subscriptionStatus !== "ACTIVE") {
    return {
      allowed: false,
      status: 403,
      message:
        "Your subscription is not active. Renew to access bill history.",
    };
  }

  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null;

  if (
    !periodEnd ||
    Number.isNaN(periodEnd.getTime()) ||
    now >= periodEnd
  ) {
    subscription.status = "EXPIRED";
    await restaurant.save();

    return {
      allowed: false,
      status: 403,
      message:
        "Your subscription has expired. Renew to access bill history.",
    };
  }

  
  const plan = normalizePlan(subscription.plan);
  const planConfig = plans[plan];

  if (!planConfig) {
    return {
      allowed: false,
      status: 403,
      message: "Bill history is not available for your current plan.",
    };
  }

  const retentionDays = planConfig.billRetentionDays;

  // null means unlimited retention.
  if (retentionDays === null) {
    return {
      allowed: true,
      plan,
      retentionDays: null,
      cutoffDate: null,
      subscriptionEndsAt: periodEnd,
    };
  }

  if (!Number.isInteger(retentionDays) || retentionDays < 0) {
    return {
      allowed: false,
      status: 403,
      message: "Bill retention is not configured correctly.",
    };
  }

  const cutoffDate = new Date(now);
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - retentionDays);

  return {
    allowed: true,
    plan,
    retentionDays,
    cutoffDate,
    subscriptionEndsAt: periodEnd,
  };
}

router.use(authMiddleware, requireRole("admin"));

/*
=========================================================
GET BILL HISTORY
GET /api/bills
=========================================================
*/
router.get("/", async (req, res) => {
  try {
    const restaurantId = getRestaurantId(req);

    if (
      !restaurantId ||
      !mongoose.isValidObjectId(restaurantId)
    ) {
      return res.status(403).json({
        message:
          "Your account is not linked to a restaurant.",
      });
    }

    const access = await getBillHistoryAccess(
      restaurantId
    );

    if (!access.allowed) {
      return res.status(access.status).json({
        message: access.message,
        code: "BILL_HISTORY_SUBSCRIPTION_REQUIRED",
      });
    }

    const filter = {
      restaurantId,
    };

    // Enforce retention in MongoDB, not only in React.
    if (access.cutoffDate) {
      filter.createdAt = {
        $gte: access.cutoffDate,
      };
    }

    const {
      search,
      paymentStatus,
      status,
      from,
      to,
    } = req.query;

    if (paymentStatus && paymentStatus !== "ALL") {
      if (
        !["UNPAID", "PAID", "FAILED"].includes(
          paymentStatus
        )
      ) {
        return res.status(400).json({
          message: "Invalid payment status.",
        });
      }

      filter.paymentStatus = paymentStatus;
    }

    if (status && status !== "ALL") {
      if (
        ![
          "REQUESTED",
          "PRINTING",
          "PRINTED",
          "PAID",
          "CANCELLED",
        ].includes(status)
      ) {
        return res.status(400).json({
          message: "Invalid bill status.",
        });
      }

      filter.status = status;
    }

    // Intersect user-selected dates with the plan cutoff.
    if (from || to) {
      filter.createdAt = filter.createdAt || {};

      if (from) {
        const start = new Date(`${from}T00:00:00.000Z`);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            message: "Invalid start date.",
          });
        }

        filter.createdAt.$gte = access.cutoffDate
          ? new Date(
              Math.max(
                start.getTime(),
                access.cutoffDate.getTime()
              )
            )
          : start;
      }

      if (to) {
        const end = new Date(`${to}T23:59:59.999Z`);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            message: "Invalid end date.",
          });
        }

        filter.createdAt.$lte = end;
      }
    }

    if (
      typeof search === "string" &&
      search.trim()
    ) {
      const term = search.trim();

     const escaped = term.replace(
          /[.*+?^${}()|[\]\\]/g, "\\$&");

      const searchConditions = [
        {
          tableNumber: {
            $regex: escaped,
            $options: "i",
          },
        },
      ];

      const numericBillNumber = Number(
        term.replace(/^DF-/i, "")
      );

      if (
        Number.isSafeInteger(numericBillNumber) &&
        numericBillNumber >= 0
      ) {
        searchConditions.push({
          billNumber: numericBillNumber,
        });
      }

      filter.$or = searchConditions;
    }

    const requestedLimit = Number.parseInt(
      req.query.limit,
      10
    );

    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 100;

    const [bills, totals] = await Promise.all([
      Bill.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),

      Bill.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,

            totalBills: { $sum: 1 },

            revenue: {
              $sum: {
                $cond: [
                  { $eq: ["$paymentStatus", "PAID"] },
                  "$total",
                  0,
                ],
              },
            },

            paidBills: {
              $sum: {
                $cond: [
                  { $eq: ["$paymentStatus", "PAID"] },
                  1,
                  0,
                ],
              },
            },

            pendingBills: {
              $sum: {
                $cond: [
                  { $eq: ["$paymentStatus", "UNPAID"] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const summary = totals[0] || {
      totalBills: 0,
      revenue: 0,
      paidBills: 0,
      pendingBills: 0,
    };

    delete summary._id;

    return res.json({
      bills,
      summary,
      limit,
      retention: {
        plan: access.plan,
        days: access.retentionDays,
        cutoffDate: access.cutoffDate,
        subscriptionEndsAt: access.subscriptionEndsAt,
      },
    });
  } catch (error) {
    console.error("Bill history error:", error);

    return res.status(500).json({
      message: "Failed to retrieve bill history.",
    });
  }
});

/*
=========================================================
GET ONE BILL
GET /api/bills/:billId
=========================================================
*/
router.get("/:billId", async (req, res) => {
  try {
    const restaurantId = getRestaurantId(req);

    if (
      !restaurantId ||
      !mongoose.isValidObjectId(restaurantId)
    ) {
      return res.status(403).json({
        message:
          "Your account is not linked to a restaurant.",
      });
    }

    const access = await getBillHistoryAccess(
      restaurantId
    );

    if (!access.allowed) {
      return res.status(access.status).json({
        message: access.message,
        code: "BILL_HISTORY_SUBSCRIPTION_REQUIRED",
      });
    }

    if (!mongoose.isValidObjectId(req.params.billId)) {
      return res.status(400).json({
        message: "Invalid bill ID.",
      });
    }

    const filter = {
      _id: req.params.billId,
      restaurantId,
    };

    if (access.cutoffDate) {
      filter.createdAt = {
        $gte: access.cutoffDate,
      };
    }

    const bill = await Bill.findOne(filter).lean();

    if (!bill) {
      return res.status(404).json({
        message:
          "Bill not found or outside your plan's history period.",
      });
    }

    return res.json({ bill });
  } catch (error) {
    console.error("Bill details error:", error);

    return res.status(500).json({
      message: "Failed to retrieve bill details.",
    });
  }
});

export default router;