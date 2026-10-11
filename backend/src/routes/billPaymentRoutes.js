
import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import mongoose from "mongoose";

import Bill from "../models/Bill.js";
import BillPayment from "../models/BillPayments.js";
import TableSession from "../models/TableSession.js";

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

    const { bill } = result;

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

    const { bill } = result;

    if (bill.paymentStatus === "PAID") {
      return res.status(409).json({
        success: false,
        message: "This bill has already been paid.",
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

    // Atomically claim an unpaid bill to reduce double confirmation.
    const now = new Date();

    const updatedBill = await Bill.findOneAndUpdate(
      {
        _id: bill._id,
        restaurantId: bill.restaurantId,
        sessionId: bill.sessionId,
        paymentStatus: { $ne: "PAID" },
      },
      {
        $set: {
          paymentStatus: "PAID",
          paymentMethod: "ONLINE",
          paymentReference: razorpay_payment_id,
          paidAt: now,
          status: "PAID",
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedBill) {
      const latestBill = await Bill.findById(bill._id);

      if (
        latestBill?.paymentStatus === "PAID" &&
        latestBill.paymentReference === razorpay_payment_id
      ) {
        billPayment.paymentId = razorpay_payment_id;
        billPayment.signature = razorpay_signature;
        billPayment.status = "paid";
        billPayment.paidAt = latestBill.paidAt || now;
        await billPayment.save();

        return res.status(200).json({
          success: true,
          message: "Payment was already verified.",
          bill: latestBill,
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "Bill has already been paid or changed. Please refresh the bill.",
      });
    }

    billPayment.paymentId = razorpay_payment_id;
    billPayment.signature = razorpay_signature;
    billPayment.status = "paid";
    billPayment.paidAt = now;
    await billPayment.save();

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully.",
      bill: updatedBill,
      printJobId: null,
    });
  } catch (error) {
    console.error(
      "Bill payment verification failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Payment verification failed. Refresh the bill status before retrying.",
    });
  }
});

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
