
import express from "express";
import crypto from "crypto";

import Table from "../models/Table.js";
import TableSession from "../models/TableSession.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";

import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";
import subscriptionMiddleware from "../middleware/subscriptionMiddleware.js";

const router = express.Router();

/*
=========================================================
PUBLIC CUSTOMER QR ROUTE
GET TABLE BY TABLE ID
=========================================================
*/

router.get("/public/:tableId", async (req, res) => {
  try {
    const table = await Table.findOne({
      tableId: req.params.tableId,
    }).select("tableId tableNumber restaurantId status");

    if (!table) {
      return res.status(404).json({
        message: "Table not found",
      });
    }

    if (table.status === "Inactive") {
      return res.status(400).json({
        message: "This table is currently inactive",
      });
    }

    const restaurant = await Restaurant.findById(
      table.restaurantId
    ).select("name");

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant linked to this table was not found",
      });
    }

    return res.json({
      table: {
        tableId: table.tableId,
        tableNumber: table.tableNumber,
        restaurantId: table.restaurantId,
        restaurantName: restaurant.name,
      },
    });
  } catch (error) {
    console.error("Failed to fetch public table:", error);

    return res.status(500).json({
      message: "Failed to fetch table",
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
GET OCCUPIED TABLES AND OPEN SESSIONS
ADMIN AND STAFF
GET /api/tables/staff/occupied
=========================================================
*/

router.get(
  "/staff/occupied",
  requireRole("admin", "staff"),
  async (req, res) => {
    try {
      const restaurantId = req.user.restaurantId;

      if (!restaurantId) {
        return res.status(400).json({
          message: "User is not linked to a restaurant",
        });
      }

      const sessions = await TableSession.find({
        restaurantId,
        status: {
          $in: ["open", "bill_requested"],
        },
      })
        .sort({ updatedAt: -1 })
        .lean();

      if (sessions.length === 0) {
        return res.json({
          sessions: [],
          totalSessions: 0,
        });
      }

      const tableIds = [
        ...new Set(sessions.map((session) => session.tableId)),
      ];

      const tables = await Table.find({
        restaurantId,
        tableId: {
          $in: tableIds,
        },
      })
        .select("tableId tableNumber status")
        .lean();

      const tableMap = new Map(
        tables.map((table) => [table.tableId, table])
      );

      const sessionIds = sessions.map(
        (session) => session.sessionId
      );

      const orders = await Order.find({
        restaurantId,
        sessionId: {
          $in: sessionIds,
        },
      })
        .select(
          "sessionId items totalAmount total paymentStatus paymentMethod status createdAt"
        )
        .sort({ createdAt: 1 })
        .lean();

      const ordersBySession = new Map();

      for (const order of orders) {
        if (!ordersBySession.has(order.sessionId)) {
          ordersBySession.set(order.sessionId, []);
        }

        ordersBySession.get(order.sessionId).push(order);
      }

      const result = sessions.map((session) => {
        const sessionOrders =
          ordersBySession.get(session.sessionId) || [];

        const total = sessionOrders.reduce((sum, order) => {
          const amount =
            Number(order.totalAmount ?? order.total ?? 0);

          return sum + (Number.isFinite(amount) ? amount : 0);
        }, 0);

        const paidTotal = sessionOrders.reduce((sum, order) => {
          if (order.paymentStatus !== "PAID") {
            return sum;
          }

          const amount =
            Number(order.totalAmount ?? order.total ?? 0);

          return sum + (Number.isFinite(amount) ? amount : 0);
        }, 0);

        const table = tableMap.get(session.tableId);

        return {
          sessionId: session.sessionId,
          tableId: session.tableId,
          tableNumber:
            table?.tableNumber ?? session.tableNumber,
          tableStatus: table?.status ?? "Unknown",
          sessionStatus: session.status,
          orderCount: sessionOrders.length,
          total,
          paidTotal,
          paymentComplete: sessionOrders.every(
            (order) => order.paymentStatus === "PAID"
          ),
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          orders: sessionOrders.map((order) => ({
            sessionId: order.sessionId,
            items: order.items,
            totalAmount:
              order.totalAmount ?? order.total ?? 0,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            status: order.status,
            createdAt: order.createdAt,
          })),
        };
      });

      return res.json({
        sessions: result,
        totalSessions: result.length,
      });
    } catch (error) {
      console.error("Failed to fetch occupied tables:", error);

      return res.status(500).json({
        message: "Failed to fetch occupied tables",
      });
    }
  }
);

/*
=========================================================
CLOSE TABLE SESSION
ADMIN AND STAFF
POST /api/tables/staff/sessions/:sessionId/close

An order must be paid before its session can be closed.
This endpoint does not mark orders as paid.
=========================================================
*/

router.post(
  "/staff/sessions/:sessionId/close",
  requireRole("admin", "staff"),
  async (req, res) => {
    try {
      const restaurantId = req.user.restaurantId;
      const { sessionId } = req.params;

      if (!restaurantId) {
        return res.status(400).json({
          message: "User is not linked to a restaurant",
        });
      }

      const session = await TableSession.findOne({
        restaurantId,
        sessionId,
      });

      if (!session) {
        return res.status(404).json({
          message: "Table session not found",
        });
      }

      if (
        !["open", "bill_requested"].includes(session.status)
      ) {
        return res.status(400).json({
          message: "This table session is already closed",
        });
      }

      const orders = await Order.find({
        restaurantId,
        sessionId,
      }).select("_id paymentStatus");

      const unpaidOrders = orders.filter(
        (order) => order.paymentStatus !== "PAID"
      );

      if (unpaidOrders.length > 0) {
        return res.status(409).json({
          message:
            "Cannot close this table. All orders must be paid first.",
          unpaidOrders: unpaidOrders.length,
        });
      }

      /*
       * Recheck the current session state when updating,
       * so a session already closed by another request
       * is not treated as newly closed.
       */
      const closedSession = await TableSession.findOneAndUpdate(
        {
          _id: session._id,
          restaurantId,
          status: {
            $in: ["open", "bill_requested"],
          },
        },
        {
          $set: {
            status: "closed",
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!closedSession) {
        return res.status(409).json({
          message:
            "This table session has already been closed or changed.",
        });
      }

      const table = await Table.findOneAndUpdate(
        {
          restaurantId,
          tableId: closedSession.tableId,
          status: "Occupied",
        },
        {
          $set: {
            status: "Available",
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      return res.json({
        message: "Table session closed successfully",
        session: {
          sessionId: closedSession.sessionId,
          tableId: closedSession.tableId,
          tableNumber: closedSession.tableNumber,
          status: closedSession.status,
        },
        tableStatus: table?.status ?? null,
      });
    } catch (error) {
      console.error("Failed to close table session:", error);

      return res.status(500).json({
        message: "Failed to close table session",
      });
    }
  }
);

/*
=========================================================
GET ALL TABLES
ADMIN ONLY
=========================================================
*/

router.get(
  "/",
  requireRole("admin"),
  async (req, res) => {
    try {
      if (!req.user.restaurantId) {
        return res.status(400).json({
          message: "User is not linked to a restaurant",
        });
      }

      const tables = await Table.find({
        restaurantId: req.user.restaurantId,
        status: {
          $ne: "Inactive",
        },
      }).sort({
        tableNumber: 1,
      });

      return res.json({
        tables,
      });
    } catch (error) {
      console.error("Failed to fetch tables:", error);

      return res.status(500).json({
        message: "Failed to fetch tables",
      });
    }
  }
);

/*
=========================================================
CREATE TABLE
ADMIN ONLY
=========================================================
*/

router.post(
  "/",
  requireRole("admin"),
  async (req, res) => {
    try {
      const { tableNumber } = req.body;

      if (
        tableNumber === undefined ||
        tableNumber === null ||
        tableNumber === ""
      ) {
        return res.status(400).json({
          message: "Table number is required",
        });
      }

      const normalizedTableNumber = String(tableNumber)
        .trim()
        .toUpperCase();

      if (!normalizedTableNumber) {
        return res.status(400).json({
          message: "Table number is required",
        });
      }

      if (normalizedTableNumber.length > 50) {
        return res.status(400).json({
          message: "Table number must be 50 characters or less",
        });
      }

      if (!req.user.restaurantId) {
        return res.status(400).json({
          message: "User is not linked to a restaurant",
        });
      }

      const restaurantId = req.user.restaurantId;

      const existingTable = await Table.findOne({
        restaurantId,
        tableNumber: normalizedTableNumber,
      });

      if (existingTable) {
        return res.status(400).json({
          message: `Table ${normalizedTableNumber} already exists in your restaurant`,
        });
      }

      const tableId = `table-${crypto.randomUUID()}`;

      const table = await Table.create({
        restaurantId,
        tableNumber: normalizedTableNumber,
        tableId,
        status: "Available",
      });

      return res.status(201).json({
        message: "Table created successfully",
        table,
      });
    } catch (error) {
      console.error("Failed to create table:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          message:
            "This table number already exists in your restaurant",
        });
      }

      return res.status(500).json({
        message: "Failed to create table",
        error: error.message,
      });
    }
  }
);

/*
=========================================================
UPDATE TABLE STATUS
ADMIN ONLY
=========================================================
*/

router.put(
  "/:id/status",
  requireRole("admin"),
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!["Available", "Occupied", "Inactive"].includes(status)) {
        return res.status(400).json({
          message: "Invalid table status",
        });
      }

      if (!req.user.restaurantId) {
        return res.status(400).json({
          message: "User is not linked to a restaurant",
        });
      }

      const table = await Table.findOneAndUpdate(
        {
          _id: req.params.id,
          restaurantId: req.user.restaurantId,
        },
        {
          $set: {
            status,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!table) {
        return res.status(404).json({
          message: "Table not found",
        });
      }

      return res.json({
        message: "Table status updated",
        table,
      });
    } catch (error) {
      console.error("Failed to update table status:", error);

      return res.status(500).json({
        message: "Failed to update table status",
        error: error.message,
      });
    }
  }
);

/*
=========================================================
REMOVE TABLE
ADMIN ONLY
SOFT DELETE
=========================================================
*/

router.delete(
  "/:id",
  requireRole("admin"),
  async (req, res) => {
    try {
      if (!req.user.restaurantId) {
        return res.status(400).json({
          message: "User is not linked to a restaurant",
        });
      }

      const table = await Table.findOneAndUpdate(
        {
          _id: req.params.id,
          restaurantId: req.user.restaurantId,
        },
        {
          $set: {
            status: "Inactive",
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!table) {
        return res.status(404).json({
          message: "Table not found",
        });
      }

      return res.json({
        message: "Table removed successfully",
        table,
      });
    } catch (error) {
      console.error("Failed to remove table:", error);

      return res.status(500).json({
        message: "Failed to remove table",
      });
    }
  }
);

export default router;
