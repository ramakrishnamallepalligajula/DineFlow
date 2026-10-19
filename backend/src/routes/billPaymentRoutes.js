
import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import mongoose from "mongoose";

import Bill from "../models/Bill.js";
import BillPayment from "../models/BillPayments.js";
import TableSession from "../models/TableSession.js";
import Order from "../models/Order.js";
import Table from "../models/Table.js";
import Restaurant from "../models/Restaurant.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function validSessionId(value) {
  return (
    typeof value === "string" &&
    value.length >= 16 &&
    value.length <= 128
  );
}

async function findBillForSession({ billId, sessionId }) {
  if (
    !mongoose.isValidObjectId(billId) ||
    !validSessionId(sessionId)
  ) {
    return { error: "INVALID_INPUT" };
  }

  const session = await TableSession.findOne({ sessionId })
    .select(
      "restaurantId sessionId billId status tableNumber orderId"
    )
    .lean();

  if (
    !session ||
    !session.billId ||
    String(session.billId) !== String(billId)
  ) {
    return { error: "SESSION_BILL_MISMATCH" };
  }

  const bill = await Bill.findOne({
    _id: billId,
    sessionId: session.sessionId,
    restaurantId: session.restaurantId,
  });

  if (!bill) {
    return { error: "BILL_NOT_FOUND" };
  }

  return { session, bill };
}

// CUSTOMER: select cash payment.
// This does not mark the bill paid or confirm cash collection.
// POST /api/bill-payments/cash
router.post("/cash", async (req, res) => {
  try {
    const { billId, sessionId } = req.body;

    if (!billId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "Bill ID and session ID are required.",
      });
    }

    const result = await findBillForSession({
      billId,
      sessionId,
    });

    if (result.error) {
      return res.status(
        result.error === "INVALID_INPUT" ? 400 : 404
      ).json({
        success: false,
        message:
          result.error === "INVALID_INPUT"
            ? "Invalid bill or session ID."
            : "Bill does not belong to this table session.",
      });
    }

    const { session, bill } = result;

    if (session.status === "closed") {
      return res.status(409).json({
        success: false,
        message: "This table session is already closed.",
      });
    }

    if (bill.paymentStatus === "PAID") {
      return res.status(409).json({
        success: false,
        message: "This bill has already been paid.",
        bill,
      });
    }

    bill.paymentMethod = "CASH";
    bill.paymentReference = null;
    bill.paidAt = null;

    if (bill.status !== "PRINTED") {
      bill.status = "REQUESTED";
    }

    await bill.save();

    return res.status(200).json({
      success: true,
      message:
        "Cash selected. Please pay restaurant staff and wait for staff confirmation.",
      bill,
      cashCollected: false,
    });
  } catch (error) {
    console.error("Cash selection failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to select cash payment.",
    });
  }
});

// CUSTOMER: create or reuse a Razorpay order.
// POST /api/bill-payments/create-order
router.post("/create-order", async (req, res) => {
  try {
    const { billId, sessionId } = req.body;

    if (!billId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "Bill ID and session ID are required.",
      });
    }

    const result = await findBillForSession({
      billId,
      sessionId,
    });

    if (result.error) {
      return res.status(
        result.error === "INVALID_INPUT" ? 400 : 404
      ).json({
        success: false,
        message:
          result.error === "INVALID_INPUT"
            ? "Invalid bill or session ID."
            : "Bill does not belong to this table session.",
      });
    }

    const { session, bill } = result;

    if (session.status === "closed" || bill.paymentStatus === "PAID") {
      return res.status(409).json({
        success: false,
        message: "This bill is already closed or paid.",
      });
    }

    const restaurant = await Restaurant.findById(bill.restaurantId)
      .select("paymentSettings")
      .lean();
    const paymentSettings = restaurant?.paymentSettings;

    if (
      !paymentSettings?.onlinePaymentsEnabled ||
      paymentSettings.onboardingStatus !== "ACTIVE" ||
      paymentSettings.provider !== "RAZORPAY" ||
      !paymentSettings.razorpayAccountId
    ) {
      return res.status(403).json({
        success: false,
        code: "ONLINE_PAYMENTS_NOT_ENABLED",
        message: "Online payments are not enabled for this restaurant.",
      });
    }

    if (
      !process.env.RAZORPAY_KEY_ID ||
      !process.env.RAZORPAY_KEY_SECRET
    ) {
      console.error(
        "Razorpay environment variables are missing."
      );

      return res.status(500).json({
        success: false,
        message: "Payment gateway is not configured.",
      });
    }

    const amount = Number(Number(bill.total).toFixed(2));

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid bill amount.",
      });
    }

    // Reuse a pending order for the same bill and amount.
    const existingPayment = await BillPayment.findOne({
      billId: bill._id,
      restaurantId: bill.restaurantId,
      status: "created",
      amount,
      currency: "INR",
    }).sort({ createdAt: -1 });

    if (existingPayment) {
      return res.status(200).json({
        success: true,
        key: process.env.RAZORPAY_KEY_ID,
        orderId: existingPayment.orderId,
        amount: Math.round(amount * 100),
        currency: "INR",
        billId: String(bill._id),
        billPaymentId: String(existingPayment._id),
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `bill_${bill.billNumber}_${Date.now()}`.slice(
        0,
        40
      ),
      notes: {
        restaurantId: String(bill.restaurantId),
        billId: String(bill._id),
        billNumber: String(bill.billNumber),
        sessionId: String(bill.sessionId),
      },
    });

    const billPayment = await BillPayment.create({
      restaurantId: bill.restaurantId,
      billId: bill._id,
      provider: "razorpay",
      orderId: razorpayOrder.id,
      amount,
      currency: "INR",
      status: "created",
    });

    return res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      billId: String(bill._id),
      billPaymentId: String(billPayment._id),
    });
  } catch (error) {
    console.error(
      "Create bill payment order failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create payment order.",
    });
  }
});

// CUSTOMER: verify Razorpay payment.
// A bad signature never mutates the payment state.
// POST /api/bill-payments/verify
router.post("/verify", async (req, res) => {
  try {
    const {
      billId,
      sessionId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !billId ||
      !sessionId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification data is incomplete.",
      });
    }

    const result = await findBillForSession({
      billId,
      sessionId,
    });

    if (result.error) {
      return res.status(
        result.error === "INVALID_INPUT" ? 400 : 404
      ).json({
        success: false,
        message:
          result.error === "INVALID_INPUT"
            ? "Invalid bill or session ID."
            : "Bill does not belong to this table session.",
      });
    }

    const { bill } = result;

    const billPayment = await BillPayment.findOne({
      billId: bill._id,
      restaurantId: bill.restaurantId,
      orderId: razorpay_order_id,
    });

    if (!billPayment) {
      return res.status(404).json({
        success: false,
        message: "Bill payment record not found.",
      });
    }

    if (billPayment.status === "paid") {
      if (bill.paymentStatus === "PAID") {
        return res.status(200).json({
          success: true,
          message: "Payment was already verified.",
          bill,
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "Payment is recorded but bill status needs reconciliation.",
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Payment gateway is not configured.",
      });
    }

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    const expectedBuffer = Buffer.from(
      expectedSignature,
      "utf8"
    );

    const receivedBuffer = Buffer.from(
      String(razorpay_signature),
      "utf8"
    );

    const signatureMatches =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      );

    if (!signatureMatches) {
      // Never let an invalid client request mark a payment failed.
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
      });
    }

    const payment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    const expectedAmountPaise = Math.round(
      Number(bill.total) * 100
    );

    if (payment.order_id !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: "Payment order mismatch.",
      });
    }

    if (
      Number(payment.amount) !== expectedAmountPaise ||
      Math.round(Number(billPayment.amount) * 100) !==
        expectedAmountPaise
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment amount mismatch.",
      });
    }

    if (payment.currency !== "INR") {
      return res.status(400).json({
        success: false,
        message: "Payment currency mismatch.",
      });
    }

    if (payment.status !== "captured") {
      return res.status(409).json({
        success: false,
        message: "Payment has not been captured yet.",
      });
    }

    // Keep bill, orders, session, table, and provider payment in sync.
    // Razorpay is verified before opening the database transaction.
    const now = new Date();
    const mongoSession = await mongoose.startSession();
    let updatedBill = null;
    let alreadyPaid = false;

    try {
      await mongoSession.withTransaction(async () => {
        const currentBill = await Bill.findOne({
          _id: bill._id,
          restaurantId: bill.restaurantId,
          sessionId: bill.sessionId,
        }).session(mongoSession);

        if (!currentBill) {
          const error = new Error("Bill not found.");
          error.statusCode = 404;
          throw error;
        }

        if (currentBill.paymentStatus === "PAID") {
          if (currentBill.paymentReference === razorpay_payment_id) {
            alreadyPaid = true;
            updatedBill = currentBill;
            await BillPayment.updateOne(
              { _id: billPayment._id },
              {
                $set: {
                  paymentId: razorpay_payment_id,
                  signature: razorpay_signature,
                  status: "paid",
                  paidAt: currentBill.paidAt || now,
                },
              },
              { session: mongoSession }
            );

            // Reconcile legacy/partially completed records on safe retries.
            await Order.updateMany(
              {
                restaurantId: bill.restaurantId,
                sessionId: bill.sessionId,
              },
              {
                $set: {
                  paymentStatus: "PAID",
                  paymentMethod: "ONLINE",
                  razorpayPaymentId: razorpay_payment_id,
                  paidAt: currentBill.paidAt || now,
                },
              },
              { session: mongoSession }
            );

            const reconciledSession = await TableSession.findOneAndUpdate(
              {
                sessionId: bill.sessionId,
                restaurantId: bill.restaurantId,
                billId: bill._id,
                status: { $in: ["open", "bill_requested", "closed"] },
              },
              { $set: { status: "closed" } },
              { new: true, session: mongoSession }
            );

            if (reconciledSession) {
              await Table.updateOne(
                {
                  restaurantId: bill.restaurantId,
                  tableId: reconciledSession.tableId,
                },
                { $set: { status: "Available" } },
                { session: mongoSession }
              );
            }
            return;
          }

          const error = new Error("This bill has already been paid with another payment.");
          error.statusCode = 409;
          throw error;
        }

        currentBill.paymentStatus = "PAID";
        currentBill.paymentMethod = "ONLINE";
        currentBill.paymentReference = razorpay_payment_id;
        currentBill.paidAt = now;
        currentBill.status = "PAID";
        await currentBill.save({ session: mongoSession });

        await Order.updateMany(
          {
            restaurantId: bill.restaurantId,
            sessionId: bill.sessionId,
          },
          {
            $set: {
              paymentStatus: "PAID",
              paymentMethod: "ONLINE",
              razorpayPaymentId: razorpay_payment_id,
              paidAt: now,
            },
          },
          { session: mongoSession }
        );

        const closedSession = await TableSession.findOneAndUpdate(
          {
            sessionId: bill.sessionId,
            restaurantId: bill.restaurantId,
            billId: bill._id,
            status: { $in: ["bill_requested", "closed"] },
          },
          { $set: { status: "closed" } },
          { new: true, session: mongoSession }
        );

        if (!closedSession) {
          const error = new Error("Table session could not be closed after payment.");
          error.statusCode = 409;
          throw error;
        }

        await Table.updateOne(
          {
            restaurantId: bill.restaurantId,
            tableId: closedSession.tableId,
          },
          { $set: { status: "Available" } },
          { session: mongoSession }
        );

        await BillPayment.updateOne(
          { _id: billPayment._id },
          {
            $set: {
              paymentId: razorpay_payment_id,
              signature: razorpay_signature,
              status: "paid",
              paidAt: now,
            },
          },
          { session: mongoSession }
        );

        updatedBill = currentBill;
      });
    } finally {
      await mongoSession.endSession();
    }

    return res.status(200).json({
      success: true,
      alreadyPaid,
      message: alreadyPaid
        ? "Payment was already verified."
        : "Payment verified successfully.",
      bill: updatedBill,
      printJobId: null,
    });
  } catch (error) {
    console.error(
      "Bill payment verification failed:",
      error
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Payment verification failed. Refresh the bill status before retrying.",
    });
  }
});

// STAFF: confirm that the cash for the entire bill was physically collected.
// POST /api/bill-payments/:billId/confirm-cash
router.post(
  "/:billId/confirm-cash",
  authMiddleware,
  requireRole("admin", "staff"),
  async (req, res) => {
    const mongoSession = await mongoose.startSession();
    let paidBill = null;
    let alreadyPaid = false;

    try {
      if (!req.user?.restaurantId || !req.user?.userId) {
        return res.status(403).json({
          success: false,
          message: "Your account is not linked to a restaurant.",
        });
      }

      if (!mongoose.isValidObjectId(req.params.billId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid bill ID.",
        });
      }

      await mongoSession.withTransaction(async () => {
        const bill = await Bill.findOne({
          _id: req.params.billId,
          restaurantId: req.user.restaurantId,
        }).session(mongoSession);

        if (!bill) {
          const error = new Error("Bill not found.");
          error.statusCode = 404;
          throw error;
        }

        if (bill.paymentStatus === "PAID") {
          if (bill.paymentMethod === "CASH") {
            alreadyPaid = true;
            paidBill = bill;
            return;
          }
          const error = new Error("This bill was already paid using another method.");
          error.statusCode = 409;
          throw error;
        }

        if (bill.paymentMethod !== "CASH") {
          const error = new Error("The customer has not selected cash payment for this bill.");
          error.statusCode = 409;
          throw error;
        }

        const tableSession = await TableSession.findOne({
          sessionId: bill.sessionId,
          restaurantId: bill.restaurantId,
          billId: bill._id,
          status: "bill_requested",
        }).session(mongoSession);

        if (!tableSession) {
          const error = new Error("The table session is not awaiting payment.");
          error.statusCode = 409;
          throw error;
        }

        const now = new Date();
        bill.paymentStatus = "PAID";
        bill.paymentMethod = "CASH";
        bill.paymentReference = `CASH-${bill._id}-${now.getTime()}`;
        bill.paidAt = now;
        bill.status = "PAID";
        await bill.save({ session: mongoSession });

        await Order.updateMany(
          {
            restaurantId: bill.restaurantId,
            sessionId: bill.sessionId,
          },
          {
            $set: {
              paymentStatus: "PAID",
              paymentMethod: "CASH",
              paidAt: now,
              cashCollectedBy: req.user.userId,
              cashCollectedAt: now,
            },
          },
          { session: mongoSession }
        );

        tableSession.status = "closed";
        await tableSession.save({ session: mongoSession });

        await Table.updateOne(
          {
            restaurantId: bill.restaurantId,
            tableId: tableSession.tableId,
          },
          { $set: { status: "Available" } },
          { session: mongoSession }
        );

        paidBill = bill;
      });

      return res.status(200).json({
        success: true,
        alreadyPaid,
        message: alreadyPaid
          ? "Cash payment has already been confirmed."
          : "Cash collection confirmed and table session closed.",
        bill: paidBill,
      });
    } catch (error) {
      console.error("Bill cash confirmation failed:", error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode
          ? error.message
          : "Unable to confirm cash collection.",
      });
    } finally {
      await mongoSession.endSession();
    }
  }
);

// CUSTOMER: recover an existing bill after page refresh.
// GET /api/bill-payments/session/:sessionId/bill
router.get(
  "/session/:sessionId/bill",
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      if (!validSessionId(sessionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid table session.",
        });
      }

      const session = await TableSession.findOne({
        sessionId,
      })
        .select(
          "restaurantId sessionId tableNumber orderId billId status"
        )
        .lean();

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Table session not found.",
        });
      }

      if (!session.billId) {
        return res.status(404).json({
          success: false,
          code: "BILL_NOT_CREATED",
          message: "Your bill has not been generated yet.",
        });
      }

      const bill = await Bill.findOne({
        _id: session.billId,
        restaurantId: session.restaurantId,
        sessionId: session.sessionId,
      })
        .select(
          "billNumber restaurantId sessionId orderId tableNumber items totalItems subtotal taxRate tax cgst sgst total status paymentStatus paymentMethod paymentReference paidAt createdAt"
        )
        .lean();

      if (!bill) {
        return res.status(404).json({
          success: false,
          message: "Bill not found for this table session.",
        });
      }

      return res.status(200).json({
        success: true,
        session: {
          sessionId: session.sessionId,
          tableNumber: session.tableNumber,
          status: session.status,
        },
        bill: {
          _id: String(session.billId),
          id: String(session.billId),
          billNumber: bill.billNumber,
          orderId: bill.orderId,
          tableNumber: bill.tableNumber,
          items: bill.items,
          totalItems: bill.totalItems,
          subtotal: bill.subtotal,
          taxRate: bill.taxRate,
          tax: bill.tax,
          cgst: bill.cgst,
          sgst: bill.sgst,
          total: bill.total,
          status: bill.status,
          paymentStatus: bill.paymentStatus,
          paymentMethod: bill.paymentMethod,
          paymentReference: bill.paymentReference,
          paidAt: bill.paidAt,
          createdAt: bill.createdAt,
        },
      });
    } catch (error) {
      console.error(
        "Customer bill recovery failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve your bill right now.",
      });
    }
  }
);

export default router;
