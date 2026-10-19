import express from "express";
import crypto from "crypto";

import Order from "../models/Order.js";
import Table from "../models/Table.js";
import TableSession from "../models/TableSession.js";

import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";
import Restaurant from "../models/Restaurant.js";
import Bill from "../models/Bill.js";
import subscriptionMiddleware from "../middleware/subscriptionMiddleware.js";
import Food from "../models/Food.js";


const hashRecoveryToken = (token) =>
  crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

const isValidRecoveryToken = (token) =>
  typeof token === "string" &&
  /^[a-f0-9-]{36}$/i.test(token);

async function createKitchenPrintJob({ order, io }) {
  if (!order || !io) {
    return null;
  }

  // No kitchen printer integration is configured in this codebase.
  // Gracefully skip printer work without failing the order flow.
  return null;
}

const orderRoutes = (io) => {
  const router = express.Router();

  // =========================================================
  // CREATE ORDER
  // PUBLIC
  // =========================================================


router.post("/", async (req, res) => {
  try {
  const {
  tableId,
  items,
  idempotencyKey,
} = req.body;

const recoveryToken = req.get(
  "X-Order-Recovery-Token"
);

if (!isValidRecoveryToken(recoveryToken)) {
  return res.status(400).json({
    message: "A valid order recovery token is required.",
  });
}

    // 1. Validate the request.
    if (!tableId) {
      return res.status(400).json({
        message: "Table ID is required.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Add at least one item to your order.",
      });
    }

    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.trim().length < 8 ||
      idempotencyKey.trim().length > 128
    ) {
      return res.status(400).json({
        message: "A valid idempotency key is required.",
      });
    }

    // 2. Resolve the restaurant from the table.
    const table = await Table.findOne({ tableId });

    if (!table) {
      return res.status(404).json({
        message: "Table not found.",
      });
    }

    const restaurantId = table.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({
        message: "This table is not linked to a restaurant.",
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found.",
      });
    }

    // 3. Enforce the restaurant subscription.
    const subscription = restaurant.subscription;

    if (!subscription) {
      return res.status(403).json({
        message: "An active restaurant subscription is required.",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    const now = new Date();

    if (
      subscription.status === "TRIALING" &&
      (!subscription.trialEndsAt ||
        now >= new Date(subscription.trialEndsAt))
    ) {
      return res.status(403).json({
        message: "The restaurant's free trial has expired.",
        code: "TRIAL_EXPIRED",
      });
    }

    if (
      subscription.status === "ACTIVE" &&
      subscription.currentPeriodEnd &&
      now >= new Date(subscription.currentPeriodEnd)
    ) {
      return res.status(403).json({
        message: "The restaurant subscription has expired.",
        code: "SUBSCRIPTION_EXPIRED",
      });
    }

    if (
      !["TRIALING", "ACTIVE"].includes(subscription.status)
    ) {
      return res.status(403).json({
        message: "The restaurant subscription is not active.",
        code:
          subscription.status === "CANCELLED"
            ? "SUBSCRIPTION_CANCELLED"
            : "SUBSCRIPTION_EXPIRED",
      });
    }

    // 4. Online payment requires active onboarding.

    // 5. Make retries idempotent.
    const key = idempotencyKey.trim();

   const existingOrder = await Order.findOne({
  restaurantId,
  idempotencyKey: key,
}).select("+recoveryTokenHash");

if (existingOrder) {
  // A retry must prove possession of the original token.
  if (
    existingOrder.recoveryTokenHash !==
    hashRecoveryToken(recoveryToken)
  ) {
    return res.status(409).json({
      message:
        "This order request already exists. Reopen the original order from this device.",
    });
  }

  return res.status(200).json({
    message: "This order request was already received.",
    order: existingOrder.toObject(),
  });
}


    // 6. Validate item IDs and quantities.
    const requestedItems = items.map((item) => ({
      id: String(item.id || ""),
      quantity: Number(item.quantity),
    }));

    for (const item of requestedItems) {
      if (!/^[a-f\d]{24}$/i.test(item.id)) {
        return res.status(400).json({
          message: "An order contains an invalid food item ID.",
        });
      }

      if (
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      ) {
        return res.status(400).json({
          message: "Each item quantity must be between 1 and 99.",
        });
      }
    }

    // 7. Merge duplicate food IDs in the submitted cart.
    const quantities = new Map();

    for (const item of requestedItems) {
      const nextQuantity =
        (quantities.get(item.id) || 0) + item.quantity;

      if (nextQuantity > 99) {
        return res.status(400).json({
          message: "The quantity for an item cannot exceed 99.",
        });
      }

      quantities.set(item.id, nextQuantity);
    }

    const foodIds = [...quantities.keys()];

    // 8. Load foods belonging to THIS restaurant only.
    // Ignore all client-submitted names, categories and prices.
    const foods = await Food.find({
      _id: { $in: foodIds },
      restaurantId,
      available: true,
    });

    if (foods.length !== foodIds.length) {
      return res.status(400).json({
        message:
          "One or more items are unavailable or do not belong to this restaurant. Refresh the menu and try again.",
        code: "INVALID_OR_UNAVAILABLE_ITEMS",
      });
    }

    // 9. Calculate authoritative order items and totals.
    const foodById = new Map(
      foods.map((food) => [String(food._id), food])
    );

    const validatedItems = foodIds.map((id) => {
      const food = foodById.get(id);

      return {
        id: String(food._id),
        name: food.name,
        price: Number(food.price),
        category: food.category || "",
        quantity: quantities.get(id),
      };
    });

    const totalItems = validatedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const totalPrice = Number(
      validatedItems
        .reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        )
        .toFixed(2)
    );

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      return res.status(400).json({
        message: "The calculated order total is invalid.",
      });
    }

    // 10. Find or create the active table session.
    let session = await TableSession.findOne({
      restaurantId,
      tableId,
      status: { $in: ["open", "bill_requested"] },
    }).sort({ createdAt: -1 });

    if (session?.status === "bill_requested") {
      return res.status(409).json({
        message: "The bill has already been requested for this table.",
        code: "BILL_ALREADY_REQUESTED",
      });
    }

    if (!session) {
      session = await TableSession.create({
        restaurantId,
        tableId,
        tableNumber: String(table.tableNumber),
        orderId: Date.now(),
        sessionId: crypto.randomUUID(),
        orderCount: 0,
        status: "open",
      });
    }

    if (session.status !== "open") {
      return res.status(409).json({
        message:
          "This table is not available for ordering.",
      });
    }

    // This is provisional until payment is confirmed.
    // The session order count is NOT incremented here.
    const orderSequence = session.orderCount + 1;

    const order = await Order.create({
  restaurantId,
  orderId: session.orderId,
  sessionId: session.sessionId,
  orderSequence,
  type: orderSequence === 1 ? "initial" : "additional",
  tableId,
  tableNumber: String(table.tableNumber),
  items: validatedItems,
  totalItems,
  totalPrice,

  // Payment is selected after order creation.
  paymentStatus: "PENDING",
  status: "Order Received",

  idempotencyKey: key,
  recoveryTokenHash: hashRecoveryToken(recoveryToken),
});


session.orderCount += 1;
await session.save();

await Table.findOneAndUpdate(
  {
    tableId,
    restaurantId,
  },
  {
    status: "Occupied",
  }
);

io.to(`restaurant:${String(restaurantId)}`).emit(
  "new-order",
  order.toObject()
);

await createKitchenPrintJob({ order, io });

return res.status(201).json({
  message: "Order received and sent for kitchen processing.",
  order: order.toObject(),
  session: {
    sessionId: session.sessionId,
    orderId: session.orderId,
    orderCount: session.orderCount,
    status: session.status,
  },
});

  } catch (error) {
    console.error("Order creation failed:", error);

    // A concurrent retry may hit the unique index.
    if (error.code === 11000) {
      try {
        const duplicateTable = await Table.findOne({
          tableId: req.body?.tableId,
        }).select("restaurantId");
        const recoveryToken = req.get("X-Order-Recovery-Token");
        const existingOrder = duplicateTable?.restaurantId
          ? await Order.findOne({
              restaurantId: duplicateTable.restaurantId,
              idempotencyKey: req.body?.idempotencyKey,
            }).select("+recoveryTokenHash")
          : null;

        if (
          existingOrder &&
          isValidRecoveryToken(recoveryToken) &&
          existingOrder.recoveryTokenHash === hashRecoveryToken(recoveryToken)
        ) {
          const safeOrder = existingOrder.toObject();
          delete safeOrder.recoveryTokenHash;
          return res.status(200).json({
            message: "This order request was already received.",
            order: safeOrder,
          });
        }
      } catch (lookupError) {
        console.error(
          "Failed to recover duplicate order:",
          lookupError
        );
      }
    }

    return res.status(500).json({
      message: "Failed to create order.",
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
    subscriptionMiddleware,
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
        const { sessionId } = req.params;
        const recoveryToken = req.get("X-Order-Recovery-Token");

        if (!isValidRecoveryToken(recoveryToken)) {
          return res.status(401).json({
            message: "Valid order recovery token required.",
          });
        }

        const session = await TableSession.findOne({ sessionId });

        if (!session) {
          return res.status(404).json({
            message: "Table session not found",
          });
        }

        // A session ID is not an authorization credential by itself.
        // Require proof of possession of a recovery token belonging to an
        // order in this session before returning session-wide order data.
        const authorizedOrder = await Order.findOne({
          restaurantId: session.restaurantId,
          sessionId: session.sessionId,
          recoveryTokenHash: hashRecoveryToken(recoveryToken),
        }).select("_id");

        if (!authorizedOrder) {
          return res.status(403).json({
            message: "This recovery token cannot access the table session.",
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
  // 6. Keeps table occupied until payment and session closure
  // 7. Sends bill-requested to admin devices
  // =========================================================

  router.post(
    "/session/:sessionId/bill",
    async (req, res) => {
      try {
        const { sessionId } = req.params;
        const recoveryToken = req.get("X-Order-Recovery-Token");

        if (!isValidRecoveryToken(recoveryToken)) {
          return res.status(401).json({
            message: "Valid order recovery token required.",
          });
        }

        const session = await TableSession.findOne({ sessionId });

        if (!session) {
          return res.status(404).json({
            message: "Table session not found",
          });
        }

        const authorizedOrder = await Order.findOne({
          restaurantId: session.restaurantId,
          sessionId: session.sessionId,
          recoveryTokenHash: hashRecoveryToken(recoveryToken),
        }).select("_id");

        if (!authorizedOrder) {
          return res.status(403).json({
            message: "This recovery token cannot request the bill for this session.",
          });
        }

        // Repeated Request Bill calls are idempotent: return the existing bill
        // instead of creating a second bill or treating a network retry as an error.
        if (session.status === "bill_requested" && session.billId) {
          const existingBill = await Bill.findOne({
            _id: session.billId,
            restaurantId: session.restaurantId,
            sessionId: session.sessionId,
          });

          const existingOrders = await Order.find({
            restaurantId: session.restaurantId,
            sessionId: session.sessionId,
          }).sort({ orderSequence: 1, createdAt: 1 });

          if (!existingBill) {
            return res.status(409).json({
              message: "This session has requested a bill, but its bill record is missing. Contact staff.",
              code: "BILL_RECORD_MISSING",
            });
          }

          const existingBillData = {
            ...existingBill.toObject(),
            orders: existingOrders.map((order) => ({
              _id: order._id,
              orderId: order.orderId,
              orderSequence: order.orderSequence,
              type: order.type,
              items: order.items,
              totalItems: order.totalItems,
              totalPrice: order.totalPrice,
              status: order.status,
              createdAt: order.createdAt,
            })),
            totalPrice: existingBill.total,
            status: "bill_requested",
          };

          return res.json({
            message: "Bill was already requested for this session.",
            bill: existingBillData,
          });
        }

        if (session.status !== "open") {
          return res.status(409).json({
            message: "This table session is closed and cannot request a bill.",
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
    combinedItems.values());


        // ===================================================
        // GST CALCULATION — GST EXCLUSIVE PRICES
        // ===================================================


const GST_RATE = 5;
const CGST_RATE = 2.5;
const SGST_RATE = 2.5;

const subtotal = Number(Number(totalPrice).toFixed(2));

const cgst = Number(
  (subtotal * CGST_RATE / 100).toFixed(2)
);

const sgst = Number(
  (subtotal * SGST_RATE / 100).toFixed(2)
);

const tax = Number((cgst + sgst).toFixed(2));

const total = Number((subtotal + tax).toFixed(2));


// ===================================================
// SAVE BILL TO MONGODB
// ===================================================

const billNumber = Date.now();

const bill = await Bill.create({
  restaurantId: session.restaurantId,

  sessionId: session.sessionId,

  orderId: session.orderId,

  tableId: session.tableId,

  tableNumber: session.tableNumber,

  billNumber,

  orderCount: session.orderCount,

  items: finalItems,

  totalItems,

  subtotal,

  taxRate: GST_RATE,

  tax,

  cgst,

  sgst,

  total,

  status: "REQUESTED",

  paymentStatus: "UNPAID",
});

console.log("🧾 Bill saved to MongoDB:", bill._id);

        // ===================================================
        // UPDATE SESSION
        // ===================================================

        session.status =
          "bill_requested";
          session.billId = bill._id;


        await session.save();

        // Keep the table occupied until payment is confirmed and the
        // session is explicitly closed. Requesting a bill is not payment.

        // ===================================================
        // FINAL BILL DATA
        // ===================================================

        const billData = {

          _id: bill._id,
          billNumber: bill.billNumber,

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
                  sum + item.quantity,0),

          subtotal,

          taxRate: GST_RATE,

          tax,

          cgst,

          sgst,

          total,

          totalPrice: total,

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



  // Recover the customer's active order for this table.
// The table ID alone does not authorize access.
router.get("/recover/:tableId", async (req, res) => {
  try {
    const { tableId } = req.params;
    const token = req.get("X-Order-Recovery-Token");

    if (!isValidRecoveryToken(token)) {
      return res.status(401).json({
        message: "Valid recovery token required",
      });
    }

    const table = await Table.findOne({ tableId });

    if (!table) {
      return res.status(404).json({
        message: "Table not found",
      });
    }

    const session = await TableSession.findOne({
      restaurantId: table.restaurantId,
      tableId,
      status: { $in: ["open", "bill_requested"] },
    }).sort({ createdAt: -1 });

    if (!session) {
      return res.status(404).json({
        message: "No active order found",
      });
    }

    const order = await Order.findOne({
      restaurantId: table.restaurantId,
      tableId,
      sessionId: session.sessionId,
      recoveryTokenHash: hashRecoveryToken(token),
    })
      .select("+recoveryTokenHash")
      .sort({ createdAt: -1 });

    if (!order) {
      return res.status(404).json({
        message: "No recoverable order found",
      });
    }

    const recoveredOrder = order.toObject();
    delete recoveredOrder.recoveryTokenHash;

    return res.json({
  order: recoveredOrder,
  session: {
    sessionId: session.sessionId,
    orderId: session.orderId,
    tableId: session.tableId,
    tableNumber: session.tableNumber,
    status: session.status,
  },
});
  } catch (error) {
    console.error("Order recovery failed:", error);

    return res.status(500).json({
      message: "Unable to recover order",
    });
  }
});



  // =========================================================
  // CONFIRM CASH COLLECTION
  // POST /api/orders/:id/confirm-cash
  // ADMIN + STAFF
  // =========================================================

  router.post(
    "/:id/confirm-cash",
    authMiddleware,
    subscriptionMiddleware,
    requireRole("admin", "staff"),
    async (req, res) => {
      const mongoSession = await Order.startSession();

      let confirmedOrder = null;
      let alreadyPaid = false;

      try {
        if (!req.user?.restaurantId || !req.user?.userId) {
          return res.status(403).json({
            success: false,
            message: "Your account is not linked to a restaurant.",
          });
        }

        await mongoSession.withTransaction(async () => {
          const order = await Order.findOne({
            _id: req.params.id,
            restaurantId: req.user.restaurantId,
          }).session(mongoSession);

          if (!order) {
            const error = new Error("Order not found.");
            error.statusCode = 404;
            throw error;
          }

          // Make retries safe: never emit a second kitchen event.
          if (order.paymentStatus === "PAID") {
            alreadyPaid = true;
            confirmedOrder = order;
            return;
          }

          if (order.paymentMethod !== "CASH") {
            const error = new Error(
              "Only cash-at-table orders can be confirmed here."
            );
            error.statusCode = 409;
            throw error;
          }

          if (order.paymentStatus !== "PENDING") {
            const error = new Error(
              "This order is not awaiting cash collection."
            );
            error.statusCode = 409;
            throw error;
          }

          // Atomically claim the pending cash order.
          const paidOrder = await Order.findOneAndUpdate(
            {
              _id: order._id,
              restaurantId: req.user.restaurantId,
              paymentMethod: "CASH",
              paymentStatus: "PENDING",
            },
            {
              $set: {
                paymentStatus: "PAID",
                paidAt: new Date(),
                cashCollectedBy: req.user.userId,
                cashCollectedAt: new Date(),
              },
            },
            {
              new: true,
              session: mongoSession,
            }
          );

          if (!paidOrder) {
            const error = new Error(
              "The order payment was updated by another request. Refresh and retry."
            );
            error.statusCode = 409;
            throw error;
          }

          // Order count and sequence are assigned when the order is created.
          // Cash confirmation only updates payment; it must not increment the
          // count or re-dispatch the already-sent kitchen order.
          await Table.findOneAndUpdate(
            {
              tableId: paidOrder.tableId,
              restaurantId: req.user.restaurantId,
            },
            {
              $set: { status: "Occupied" },
            },
            { session: mongoSession }
          );

          confirmedOrder = paidOrder;
        });

        if (alreadyPaid) {
          return res.status(200).json({
            success: true,
            alreadyPaid: true,
            message: "This order has already been paid.",
            order: confirmedOrder,
          });
        }

        // The kitchen received this order at creation time. Emit only the
        // payment update here to avoid duplicate kitchen tickets.
        const orderData = confirmedOrder.toObject();

        io.to(
          `restaurant:${String(confirmedOrder.restaurantId)}`
        ).emit("order-payment-updated", orderData);

        return res.status(200).json({
          success: true,
          message: "Cash collected and order confirmed.",
          order: orderData,
        });
      } catch (error) {
        console.error("Cash collection confirmation failed:", error);

        return res.status(error.statusCode || 500).json({
          success: false,
          message:
            error.statusCode
              ? error.message
              : "Failed to confirm cash collection.",
        });
      } finally {
        await mongoSession.endSession();
      }
    }
  );


router.patch("/:id/payment-method", async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const recoveryToken = req.get(
      "X-Order-Recovery-Token"
    );

    if (!isValidRecoveryToken(recoveryToken)) {
      return res.status(401).json({
        message: "Valid recovery token required.",
      });
    }

    if (!["CASH", "ONLINE"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Choose CASH or ONLINE.",
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      recoveryTokenHash: hashRecoveryToken(recoveryToken),
    }).select("+recoveryTokenHash");

    if (!order) {
      return res.status(404).json({
        message: "Order not found or recovery token invalid.",
      });
    }

    if (order.paymentStatus !== "PENDING") {
      return res.status(409).json({
        message: "Payment is no longer pending.",
      });
    }

    if (
      order.paymentMethod &&
      order.paymentMethod !== paymentMethod
    ) {
      return res.status(409).json({
        message: "Payment method has already been selected.",
      });
    }

    if (paymentMethod === "ONLINE") {
      const restaurant = await Restaurant.findById(
        order.restaurantId
      );

      const settings = restaurant?.paymentSettings;

      if (
        !settings?.onlinePaymentsEnabled ||
        settings.onboardingStatus !== "ACTIVE" ||
        !settings.razorpayAccountId
      ) {
        return res.status(403).json({
          message: "Online payments are unavailable.",
          code: "ONLINE_PAYMENTS_UNAVAILABLE",
        });
      }
    }

    order.paymentMethod = paymentMethod;
    await order.save();

    const result = order.toObject();
    delete result.recoveryTokenHash;

    return res.json({
      success: true,
      order: result,
    });
  } catch (error) {
    console.error("Payment method selection failed:", error);

    return res.status(500).json({
      message: "Failed to select payment method.",
    });
  }
});


  // =========================================================
  // GET SINGLE ORDER
  // ADMIN + STAFF
  // =========================================================

  router.get(
    "/:id",
    authMiddleware,
    subscriptionMiddleware,
    requireRole("admin", "staff"),
    async (req, res) => {
      try {
        if (!req.user?.restaurantId) {
          return res.status(403).json({
            success: false,
            message: "Your account is not linked to a restaurant.",
          });
        }

        const order = await Order.findOne({
          _id: req.params.id,
          restaurantId: req.user.restaurantId,
        });

        if (!order) {
          return res.status(404).json({
            success: false,
            message: "Order not found.",
          });
        }

        return res.json({
          success: true,
          order,
        });
      } catch (error) {
        console.error("❌ Failed to fetch order:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to fetch order",
          error: error.message,
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
    subscriptionMiddleware,
    requireRole("admin", "staff"),
    async (req, res) => {
      try {
        if (!req.user.restaurantId) {
          return res.status(400).json({
            message: "User is not linked to a restaurant",
          });
        }

        const existingOrder = await Order.findOne({
          _id: req.params.id,
          restaurantId: req.user.restaurantId,
        });

        if (!existingOrder) {
          return res.status(404).json({
            message: "Order not found",
          });
        }

        // Kitchen status transitions are independent of payment. Orders are
        // dispatched immediately and may remain paymentStatus=PENDING.

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

        console.log("✅ Order status updated:", order.status);

        // ===================================================
        // IMPORTANT:
        // Do NOT make the table Available when one
        // individual order becomes Served.
        // The table belongs to the entire session.
        // It becomes Available only after:
        // Customer → Request Bill
        // ===================================================

        // ===================================================
        // SOCKET.IO
        // ===================================================

        io.to(`restaurant:${String(req.user.restaurantId)}`).emit(
          "order-status-updated",
          order.toObject()
        );

        return res.json({
          message: "Order status updated",
          order,
        });
      } catch (error) {
        console.error("❌ Failed to update status:", error);

        return res.status(500).json({
          message: "Failed to update status",
          error: error.message,
        });
      }
    }
  );

  return router;
};

export default orderRoutes;