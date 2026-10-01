import express from "express";
import mongoose from "mongoose";

import Order from "../models/Order.js";
import Food from "../models/Food.js";
import Table from "../models/Table.js";

import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

/* =========================================================
   DASHBOARD
========================================================= */

router.get(
  "/dashboard",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const restaurantId = new mongoose.Types.ObjectId(
        req.user.restaurantId
      );

      /* =========================
         TODAY RANGE
      ========================= */

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      /* =========================
         TODAY REVENUE + ORDERS
      ========================= */

      const todayStats = await Order.aggregate([
        {
          $match: {
            restaurantId,
            createdAt: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
          },
        },

        {
          $group: {
            _id: null,

            revenue: {
              $sum: "$totalPrice",
            },

            orders: {
              $sum: 1,
            },
          },
        },
      ]);

      const todayRevenue =
        todayStats[0]?.revenue || 0;

      const todayOrders =
        todayStats[0]?.orders || 0;

      /* =========================
         TOTAL ORDERS
      ========================= */

      const totalOrders =
        await Order.countDocuments({
          restaurantId,
        });

      /* =========================
         ACTIVE ORDERS
      ========================= */

      const activeOrders =
        await Order.countDocuments({
          restaurantId,
          status: {
            $ne: "Served",
          },
        });

      /* =========================
         TOTAL TABLES
      ========================= */

      const totalTables =
        await Table.countDocuments({
          restaurantId,
        });

      /* =========================
         TOTAL FOODS
      ========================= */

      const totalFoods =
        await Food.countDocuments({
          restaurantId,
        });

      /* =========================
         RECENT ORDERS
      ========================= */

      const recentOrders =
        await Order.find({
          restaurantId,
        })
          .sort({
            createdAt: -1,
          })
          .limit(10)
          .lean();

      /* =========================
         TOP SELLING FOODS
      ========================= */

      const topFoods =
        await Order.aggregate([
          {
            $match: {
              restaurantId,
            },
          },

          {
            $unwind: "$items",
          },

          {
            $group: {
              _id: "$items.name",

              quantity: {
                $sum: "$items.quantity",
              },

              revenue: {
                $sum: {
                  $multiply: [
                    "$items.price",
                    "$items.quantity",
                  ],
                },
              },
            },
          },

          {
            $sort: {
              quantity: -1,
            },
          },

          {
            $limit: 5,
          },
        ]);

      /* =========================
         RESPONSE
      ========================= */

      res.json({
        stats: {
          totalOrders,
          activeOrders,
          todayOrders,
          todayRevenue,
          totalFoods,
          totalTables,
        },

        recentOrders,

        topFoods,
      });
    } catch (error) {
      console.error(
        "Dashboard analytics error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load dashboard analytics",
      });
    }
  }
);


/* =========================================================
   REVENUE
========================================================= */

router.get(
  "/revenue",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const restaurantId = req.user.restaurantId;

      const days = Math.min(
        Math.max(
          parseInt(req.query.days) || 7,
          1
        ),
        90
      );

      /* =========================
         DATE RANGE
      ========================= */

      const startDate = new Date();

      startDate.setHours(
        0,
        0,
        0,
        0
      );

      startDate.setDate(
        startDate.getDate() - (days - 1)
      );

      const endDate = new Date();

      endDate.setHours(
        23,
        59,
        59,
        999
      );

      /* =========================
         GET ORDERS
      ========================= */

      const orders = await Order.find({
        restaurantId,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })
        .sort({
          createdAt: 1,
        })
        .lean();

      /* =========================
         CREATE DAILY DATA
      ========================= */

      const revenueMap = new Map();

      for (const order of orders) {
        const date = new Date(
          order.createdAt
        );

        const dateString =
          date.toLocaleDateString(
            "en-CA",
            {
              timeZone: "Asia/Kolkata",
            }
          );

        if (!revenueMap.has(dateString)) {
          revenueMap.set(dateString, {
            revenue: 0,
            orders: 0,
            totalItemsSold: 0,
          });
        }

        const day =
          revenueMap.get(dateString);

        day.revenue +=
          Number(order.totalPrice) || 0;

        day.orders += 1;

        day.totalItemsSold +=
          Number(order.totalItems) || 0;
      }

      /* =========================
         FILL ALL DATES
      ========================= */

      const revenue = [];

      for (
        let i = 0;
        i < days;
        i++
      ) {
        const date =
          new Date(startDate);

        date.setDate(
          startDate.getDate() + i
        );

        const dateString =
          date.toLocaleDateString(
            "en-CA",
            {
              timeZone: "Asia/Kolkata",
            }
          );

        const data =
          revenueMap.get(
            dateString
          );

        revenue.push({
          date: dateString,

          revenue:
            data?.revenue || 0,

          orders:
            data?.orders || 0,

          totalItemsSold:
            data?.totalItemsSold || 0,
        });
      }

      /* =========================
         SUMMARY
      ========================= */

      const totalRevenue =
        revenue.reduce(
          (sum, day) =>
            sum + day.revenue,
          0
        );

      const totalOrders =
        revenue.reduce(
          (sum, day) =>
            sum + day.orders,
          0
        );

      const totalItemsSold =
        revenue.reduce(
          (sum, day) =>
            sum + day.totalItemsSold,
          0
        );

      const averageOrderValue =
        totalOrders > 0
          ? totalRevenue / totalOrders
          : 0;

      /* =========================
         RESPONSE
      ========================= */

      res.json({
        revenue,

        summary: {
          totalRevenue,
          totalOrders,
          totalItemsSold,
          averageOrderValue,
        },
      });
    } catch (error) {
      console.error(
        "Revenue analytics error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load revenue analytics",
      });
    }
  }
);


/* =========================================================
   FOOD PERFORMANCE
========================================================= */

router.get(
  "/food-performance",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const restaurantId =
        new mongoose.Types.ObjectId(
          req.user.restaurantId
        );

      const foodPerformance =
        await Order.aggregate([
          {
            $match: {
              restaurantId,
            },
          },

          {
            $unwind: "$items",
          },

          {
            $group: {
              _id: "$items.name",

              quantity: {
                $sum:
                  "$items.quantity",
              },

              revenue: {
                $sum: {
                  $multiply: [
                    "$items.price",
                    "$items.quantity",
                  ],
                },
              },
            },
          },

          {
            $sort: {
              revenue: -1,
            },
          },
        ]);

      res.json({
        foodPerformance,
      });
    } catch (error) {
      console.error(
        "Food performance error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load food performance",
      });
    }
  }
);


/* =========================================================
   CATEGORY PERFORMANCE
========================================================= */

router.get(
  "/category-performance",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const restaurantId =
        new mongoose.Types.ObjectId(
          req.user.restaurantId
        );

      const categoryPerformance =
        await Order.aggregate([
          {
            $match: {
              restaurantId,
            },
          },

          {
            $unwind: "$items",
          },

          {
            $group: {
              _id:
                "$items.category",

              quantity: {
                $sum:
                  "$items.quantity",
              },

              revenue: {
                $sum: {
                  $multiply: [
                    "$items.price",
                    "$items.quantity",
                  ],
                },
              },
            },
          },

          {
            $sort: {
              revenue: -1,
            },
          },
        ]);

      res.json({
        categoryPerformance,
      });
    } catch (error) {
      console.error(
        "Category performance error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load category performance",
      });
    }
  }
);


/* =========================================================
   PEAK HOURS
========================================================= */

router.get(
  "/peak-hours",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const restaurantId =
        new mongoose.Types.ObjectId(
          req.user.restaurantId
        );

      const peakHours =
        await Order.aggregate([
          {
            $match: {
              restaurantId,
            },
          },

          {
            $group: {
              _id: {
                $hour:
                  "$createdAt",
              },

              orders: {
                $sum: 1,
              },

              revenue: {
                $sum:
                  "$totalPrice",
              },
            },
          },

          {
            $sort: {
              _id: 1,
            },
          },
        ]);

      res.json({
        peakHours,
      });
    } catch (error) {
      console.error(
        "Peak hours error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load peak hours",
      });
    }
  }
);


export default router;