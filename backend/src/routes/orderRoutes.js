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
      );*/
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
        );*/
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

export default orderRoutes;