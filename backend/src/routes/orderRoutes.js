/*
import express from "express";
import Order from "../models/Order.js";
import Table from "../models/Table.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const orderRoutes = (io) => {
  const router = express.Router();

  // =========================
  // CREATE ORDER
  // PUBLIC
  // =========================

  router.post("/", async (req, res) => {
    try {
      console.log("📦 Incoming order data:");
      console.log(JSON.stringify(req.body, null, 2));

      // Find the table using the tableId from the QR/order
      const table = await Table.findOne({
        tableId: req.body.tableId,
      });

      if (!table) {
        return res.status(404).json({
          message: "Table not found",
        });
      }

      // The table determines the restaurant.
      // Do NOT trust restaurantId sent by the customer.
      const restaurantId = table.restaurantId;

      if (!restaurantId) {
        return res.status(400).json({
          message: "Table is not linked to a restaurant",
        });
      }

      const order = await Order.create({
        restaurantId: restaurantId,

        orderId: req.body.id,
        tableId: req.body.tableId,
        tableNumber: table.tableNumber,

        items: req.body.items,
        totalItems: req.body.totalItems,
        totalPrice: req.body.totalPrice,

        status: req.body.status || "Order Received",
      });

      // Mark table as occupied
      await Table.findOneAndUpdate(
        {
          _id: table._id,
          restaurantId: restaurantId,
        },
        {
          status: "Occupied",
        }
      );

      console.log("✅ Order saved to MongoDB:");
      console.log(order);

      const orderData = order.toObject();

      console.log("⚡ Broadcasting new-order event...");

      /*io.emit(
        "new-order", 
        orderData
      );
      io.to(`restaurant:${restaurantId.toString()}`).emit(
              "new-order",
               orderData
            );

      console.log("✅ new-order event emitted");

      res.status(201).json({
        message: "Order created successfully",
        order: orderData,
      });
    } catch (error) {
      console.error("❌ Order creation failed:", error);

      if (error.name === "ValidationError") {
        console.error("❌ Mongoose validation errors:");

        Object.values(error.errors).forEach((validationError) => {
          console.error(`Field: ${validationError.path}`);
          console.error(`Message: ${validationError.message}`);
          console.error(`Value: ${validationError.value}`);
        });
      }

      if (error.code === 11000) {
        console.error("❌ Duplicate value:", error.keyValue);
      }

      res.status(500).json({
        message: "Failed to create order",
        error: error.message,
      });
    }
  });

  // =========================
  // GET ALL ORDERS
  // ADMIN + STAFF
  // =========================

  router.get(
    "/",
    authMiddleware,
    requireRole("admin", "staff"),
    async (req, res) => {
      try {
        if (!req.user.restaurantId) {
          return res.status(400).json({
            message: "User is not linked to a restaurant",
          });
        }

        // Only return orders belonging to this restaurant
        const orders = await Order.find({
          restaurantId: req.user.restaurantId,
        }).sort({ createdAt: -1 });

        res.json({
          orders,
        });
      } catch (error) {
        console.error("❌ Failed to fetch orders:", error);

        res.status(500).json({
          message: "Failed to fetch orders",
        });
      }
    }
  );

  // =========================
  // GET SINGLE ORDER
  // PUBLIC
  // =========================

  router.get("/:id", async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      res.json({
        order,
      });
    } catch (error) {
      console.error("❌ Failed to fetch order:", error);

      res.status(500).json({
        message: "Failed to fetch order",
      });
    }
  });

  // =========================
  // UPDATE ORDER STATUS
  // ADMIN + STAFF
  // =========================

  router.put(
    "/:id/status",
    authMiddleware,
    requireRole("admin", "staff"),
    async (req, res) => {
      try {
        if (!req.user.restaurantId) {
          return res.status(400).json({
            message: "User is not linked to a restaurant",
          });
        }

        // IMPORTANT:
        // Find the order AND make sure it belongs
        // to the logged-in user's restaurant.
        const order = await Order.findOneAndUpdate(
          {
            _id: req.params.id,
            restaurantId: req.user.restaurantId,
          },
          {
            status: req.body.status,
          },
          {
            returnDocument: "after",
            runValidators: true,
          }
        );

        if (!order) {
          return res.status(404).json({
            message: "Order not found",
          });
        }

        console.log(
          "✅ Order status updated:",
          order.status
        );

        // When order is served,
        // make the corresponding restaurant table available.
        if (order.status === "Served") {
          await Table.findOneAndUpdate(
            {
              tableId: order.tableId,
              restaurantId: req.user.restaurantId,
            },
            {
              status: "Available",
            }
          );

          console.log(
            `🟢 Table ${order.tableNumber} is now available`
          );
        }

        // Send updated status to connected clients
        /*io.emit(
          "order-status-updated",
          order.toObject()
        );
        io.to(`restaurant:${String(req.user.restaurantId)}`).emit(
                "order-status-updated",
                order.toObject()
            );

        res.json({
          message: "Order status updated",
          order,
        });
      } catch (error) {
        console.error(
          "❌ Failed to update status:",
          error
        );

        res.status(500).json({
          message: "Failed to update status",
          error: error.message,
        });
      }
    }
  );

  return router;
};

export default orderRoutes; */

import express from "express";
import crypto from "crypto";

import Order from "../models/Order.js";
import Table from "../models/Table.js";
import TableSession from "../models/TableSession.js";

import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const orderRoutes = (io) => {
  const router = express.Router();

  // =========================================================
  // CREATE ORDER
  // PUBLIC
  // =========================================================

  router.post("/", async (req, res) => {
    try {
      console.log("📦 Incoming order data:");
      console.log(
        JSON.stringify(req.body, null, 2)
      );

      const {
        tableId,
        items,
        totalItems,
        totalPrice,
      } = req.body;

      // =====================================================
      // VALIDATE BASIC DATA
      // =====================================================

      if (!tableId) {
        return res.status(400).json({
          message: "Table ID is required",
        });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          message: "Order must contain at least one item",
        });
      }

      // =====================================================
      // FIND TABLE
      // =====================================================

      const table = await Table.findOne({
        tableId,
      });

      if (!table) {
        return res.status(404).json({
          message: "Table not found",
        });
      }

      // =====================================================
      // RESTAURANT COMES FROM TABLE
      // NEVER TRUST CUSTOMER RESTAURANT ID
      // =====================================================

      const restaurantId =
        table.restaurantId;

      if (!restaurantId) {
        return res.status(400).json({
          message:
            "Table is not linked to a restaurant",
        });
      }

      // =====================================================
      // FIND ACTIVE TABLE SESSION
      // =====================================================

      let session =
        await TableSession.findOne({
          restaurantId,
          tableId,
          status: "open",
        }).sort({
          createdAt: -1,
        });

      // =====================================================
      // CREATE NEW SESSION
      // =====================================================

      if (!session) {
        const sessionId =
          crypto.randomUUID();

        // Generate a customer-facing order number.
        //
        // We use the current timestamp as a simple
        // unique starting point for the session.
        //
        // Example:
        // 1042
        //
        const orderId =
          Date.now();

        session =
          await TableSession.create({
            restaurantId,
            tableId,
            tableNumber: table.tableNumber,
            orderId,
            sessionId,
            orderCount: 0,
            status: "open",
          });

        console.log(
          "🟢 New table session created:",
          session.sessionId
        );

        console.log(
          "🧾 Customer Order ID:",
          session.orderId
        );
      } else {
        console.log(
          "🔄 Existing table session found:",
          session.sessionId
        );

        console.log(
          "🧾 Existing Order ID:",
          session.orderId
        );
      }

      // =====================================================
      // SAFETY CHECK
      // =====================================================

      if (session.status !== "open") {
        return res.status(400).json({
          message:
            "This table session is closed or the bill has already been requested.",
        });
      }

      // =====================================================
      // DETERMINE ORDER SEQUENCE
      // =====================================================

      const orderSequence =
        session.orderCount + 1;

      const orderType =
        orderSequence === 1
          ? "initial"
          : "additional";

      // =====================================================
      // CREATE ORDER
      // =====================================================

      const order = await Order.create({
        restaurantId,

        // SAME CUSTOMER-FACING ORDER ID
        // FOR THE ENTIRE SESSION
        orderId: session.orderId,

        // TABLE SESSION
        sessionId: session.sessionId,

        // 1, 2, 3...
        orderSequence,

        // initial / additional
        type: orderType,

        tableId,
        tableNumber: table.tableNumber,

        items,

        totalItems,
        totalPrice,

        status: "Order Received",
      });

      // =====================================================
      // UPDATE SESSION
      // =====================================================

      session.orderCount =
        orderSequence;

      await session.save();

      // =====================================================
      // MARK TABLE OCCUPIED
      // =====================================================

      await Table.findOneAndUpdate(
        {
          _id: table._id,
          restaurantId,
        },
        {
          status: "Occupied",
        }
      );

      // =====================================================
      // ORDER DATA
      // =====================================================

      const orderData =
        order.toObject();

      console.log(
        "✅ Order saved to MongoDB:"
      );

      console.log(orderData);

      console.log(
        "🧾 Order ID:",
        order.orderId
      );

      console.log(
        "🔢 Order sequence:",
        order.orderSequence
      );

      console.log(
        "📦 Order type:",
        order.type
      );

      console.log(
        "🆔 Session ID:",
        order.sessionId
      );

      // =====================================================
      // SOCKET.IO
      // =====================================================

      console.log(
        "⚡ Broadcasting new-order event..."
      );

      io.to(
        `restaurant:${restaurantId.toString()}`
      ).emit(
        "new-order",
        orderData
      );

      console.log(
        "✅ new-order event emitted"
      );

      // =====================================================
      // RESPONSE
      // =====================================================

      res.status(201).json({
        message:
          orderType === "initial"
            ? "Order created successfully"
            : "Additional order created successfully",

        order: orderData,

        session: {
          sessionId:
            session.sessionId,

          orderId:
            session.orderId,

          orderCount:
            session.orderCount,

          status:
            session.status,
        },
      });
    } catch (error) {
      console.error(
        "❌ Order creation failed:",
        error
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        console.error(
          "❌ Mongoose validation errors:"
        );

        Object.values(
          error.errors
        ).forEach(
          (validationError) => {
            console.error(
              `Field: ${validationError.path}`
            );

            console.error(
              `Message: ${validationError.message}`
            );

            console.error(
              `Value: ${validationError.value}`
            );
          }
        );
      }

      if (error.code === 11000) {
        console.error(
          "❌ Duplicate value:",
          error.keyValue
        );
      }

      res.status(500).json({
        message:
          "Failed to create order",
        error: error.message,
      });
    }
  });

  // =========================================================
  // GET ALL ORDERS
  // ADMIN + STAFF
  // =========================================================

  router.get(
    "/",
    authMiddleware,
    requireRole("admin", "staff"),
    async (req, res) => {
      try {
        if (!req.user.restaurantId) {
          return res.status(400).json({
            message:
              "User is not linked to a restaurant",
          });
        }

        const orders =
          await Order.find({
            restaurantId:
              req.user.restaurantId,
          }).sort({
            createdAt: -1,
          });

        res.json({
          orders,
        });
      } catch (error) {
        console.error(
          "❌ Failed to fetch orders:",
          error
        );

        res.status(500).json({
          message:
            "Failed to fetch orders",
        });
      }
    }
  );

  // =========================================================
  // GET SESSION ORDERS
  // PUBLIC
  //
  // Used by customer to retrieve all orders
  // belonging to the current table session.
  // =========================================================

  router.get(
    "/session/:sessionId",
    async (req, res) => {
      try {
        const {
          sessionId,
        } = req.params;

        const session =
          await TableSession.findOne({
            sessionId,
          });

        if (!session) {
          return res.status(404).json({
            message:
              "Table session not found",
          });
        }

        const orders =
          await Order.find({
            sessionId,
            restaurantId:
              session.restaurantId,
          }).sort({
            orderSequence: 1,
            createdAt: 1,
          });

        res.json({
          session,
          orders,
        });
      } catch (error) {
        console.error(
          "❌ Failed to fetch session orders:",
          error
        );

        res.status(500).json({
          message:
            "Failed to fetch session orders",
        });
      }
    }
  );

  // =========================================================
  // REQUEST BILL
  // PUBLIC
  //
  // Customer clicks "Request Bill".
  //
  // Backend:
  // 1. Finds session
  // 2. Finds ALL orders in session
  // 3. Combines all items
  // 4. Calculates final totals
  // 5. Changes session to bill_requested
  // 6. Makes table available
  // 7. Sends bill-requested to admin devices
  // =========================================================

  router.post(
    "/session/:sessionId/bill",
    async (req, res) => {
      try {
        const {
          sessionId,
        } = req.params;

        // ===================================================
        // FIND SESSION
        // ===================================================

        const session =
          await TableSession.findOne({
            sessionId,
          });

        if (!session) {
          return res.status(404).json({
            message:
              "Table session not found",
          });
        }

        // ===================================================
        // PREVENT DUPLICATE BILL REQUEST
        // ===================================================

        if (
          session.status !== "open"
        ) {
          return res.status(400).json({
            message:
              "Bill has already been requested for this table session.",
          });
        }

        // ===================================================
        // GET ALL ORDERS
        // ===================================================

        const orders =
          await Order.find({
            restaurantId:
              session.restaurantId,

            sessionId:
              session.sessionId,
          }).sort({
            orderSequence: 1,
            createdAt: 1,
          });

        if (!orders.length) {
          return res.status(400).json({
            message:
              "No orders found for this session.",
          });
        }

        // ===================================================
        // COMBINE ITEMS
        // ===================================================

        const combinedItems = new Map();

        let totalItems = 0;
        let totalPrice = 0;

        for (
          const order of orders
        ) {
          totalItems +=
            order.totalItems;

          totalPrice +=
            order.totalPrice;

          for (
            const item of order.items
          ) {
            const existing =
              combinedItems.get(
                item.id
              );

            if (existing) {
              existing.quantity +=
                item.quantity;
            } else {
              combinedItems.set(
                item.id,
                {
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  category:
                    item.category || "",
                  quantity:
                    item.quantity,
                }
              );
            }
          }
        }

        const finalItems =
          Array.from(
            combinedItems.values()
          );

        // ===================================================
        // UPDATE SESSION
        // ===================================================

        session.status =
          "bill_requested";

        await session.save();

        // ===================================================
        // MAKE TABLE AVAILABLE
        // ===================================================

        await Table.findOneAndUpdate(
          {
            tableId:
              session.tableId,

            restaurantId:
              session.restaurantId,
          },
          {
            status: "Available",
          }
        );

        // ===================================================
        // FINAL BILL DATA
        // ===================================================

        const billData = {
          sessionId:
            session.sessionId,

          restaurantId:
            session.restaurantId,

          orderId:
            session.orderId,

          tableId:
            session.tableId,

          tableNumber:
            session.tableNumber,

          orderCount:
            session.orderCount,

          orders: orders.map(
            (order) => ({
              _id: order._id,
              orderId:
                order.orderId,
              orderSequence:
                order.orderSequence,
              type: order.type,
              items:
                order.items,
              totalItems:
                order.totalItems,
              totalPrice:
                order.totalPrice,
              status:
                order.status,
              createdAt:
                order.createdAt,
            })
          ),

          items: finalItems,

          totalItems,

          totalQuantity:
            finalItems.reduce(
              (sum, item) =>
                sum + item.quantity,
              0
            ),

          totalPrice,

          status:
            "bill_requested",
        };

        console.log(
          "🧾 FINAL BILL REQUESTED:"
        );

        console.log(
          JSON.stringify(
            billData,
            null,
            2
          )
        );

        // ===================================================
        // SEND FINAL BILL TO RESTAURANT
        // ===================================================

        io.to(
          `restaurant:${String(
            session.restaurantId
          )}`
        ).emit(
          "bill-requested",
          billData
        );

        console.log(
          "✅ bill-requested event emitted"
        );

        // ===================================================
        // RESPONSE
        // ===================================================

        res.json({
          message:
            "Bill requested successfully",

          bill: billData,
        });
      } catch (error) {
        console.error(
          "❌ Bill request failed:",
          error
        );

        res.status(500).json({
          message:
            "Failed to request bill",

          error:
            error.message,
        });
      }
    }
  );

  // =========================================================
  // GET SINGLE ORDER
  // PUBLIC
  // =========================================================

  router.get(
    "/:id",
    async (req, res) => {
      try {
        const order =
          await Order.findById(
            req.params.id
          );

        if (!order) {
          return res.status(404).json({
            message:
              "Order not found",
          });
        }

        res.json({
          order,
        });
      } catch (error) {
        console.error(
          "❌ Failed to fetch order:",
          error
        );

        res.status(500).json({
          message:
            "Failed to fetch order",
        });
      }
    }
  );

  // =========================================================
  // UPDATE ORDER STATUS
  // ADMIN + STAFF
  // =========================================================

  router.put(
    "/:id/status",
    authMiddleware,
    requireRole("admin", "staff"),
    async (req, res) => {
      try {
        if (!req.user.restaurantId) {
          return res.status(400).json({
            message:
              "User is not linked to a restaurant",
          });
        }

        const order =
          await Order.findOneAndUpdate(
            {
              _id: req.params.id,

              restaurantId:
                req.user.restaurantId,
            },
            {
              status:
                req.body.status,
            },
            {
              returnDocument:
                "after",

              runValidators:
                true,
            }
          );

        if (!order) {
          return res.status(404).json({
            message:
              "Order not found",
          });
        }

        console.log(
          "✅ Order status updated:",
          order.status
        );

        // ===================================================
        // IMPORTANT:
        //
        // Do NOT make the table Available when one
        // individual order becomes Served.
        //
        // The table belongs to the entire session.
        //
        // It becomes Available only after:
        //
        // Customer → Request Bill
        //
        // ===================================================

        // ===================================================
        // SOCKET.IO
        // ===================================================

        io.to(
          `restaurant:${String(
            req.user.restaurantId
          )}`
        ).emit(
          "order-status-updated",
          order.toObject()
        );

        res.json({
          message:
            "Order status updated",

          order,
        });
      } catch (error) {
        console.error(
          "❌ Failed to update status:",
          error
        );

        res.status(500).json({
          message:
            "Failed to update status",

          error:
            error.message,
        });
      }
    }
  );

  return router;
};

export default orderRoutes;