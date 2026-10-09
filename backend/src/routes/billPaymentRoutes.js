import express from "express";
import crypto from "crypto";

import Razorpay from "razorpay";

import Bill from "../models/Bill.js";
import BillPayment from "../models/BillPayments.js";

import Restaurant from "../models/Restaurant.js";
import { createBillingPrintJob } from "../services/printJobService.js";

const router = express.Router();


// ============================================================
// RAZORPAY INSTANCE
// ============================================================

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


// =========================================================
// CASH PAYMENT
// =========================================================

router.post("/cash", async (req, res) => {
  try {
    const { billId } = req.body;

    if (!billId) {
      return res.status(400).json({
        success: false,
        message: "Bill ID is required",
      });
    }

    const bill = await Bill.findById(billId);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    if (bill.paymentStatus === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Bill is already paid",
        bill,
      });
    }

    // Selecting cash requests a printed cash bill; it does not prove
    // that the restaurant has collected the cash. Keep the bill unpaid
    // until staff explicitly confirms collection.
    bill.paymentMethod = "CASH";
    bill.paymentReference = null;
    bill.paidAt = null;
    if (bill.status !== "PRINTED") {
      bill.status = "REQUESTED";
    }

    await bill.save();

    const restaurant = await Restaurant.findById(
      bill.restaurantId
    ).select("name taxSettings");

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const io = req.app.get("io");

    const printJob = await createBillingPrintJob({
      bill,
      restaurant,
      io,
    });

    console.log(
      `💵 CASH PAYMENT + PRINT JOB CREATED: ${bill.billNumber}`
    );

    return res.json({
      success: true,
      message: "Cash payment recorded successfully",
      bill,
      printJobId: printJob?._id || null,
    });
  } catch (error) {
    console.error(
      "❌ CASH PAYMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to process cash payment",
      error: error.message,
    });
  }
});


// ============================================================
// CREATE CUSTOMER BILL PAYMENT ORDER
// POST /api/bill-payments/create-order
// ============================================================

router.post("/create-order", async (req, res) => {
  try {
    const { billId } = req.body;

    if (!billId) {
      return res.status(400).json({
        success: false,
        message: "Bill ID is required.",
      });
    }

    // --------------------------------------------------------
    // FIND BILL
    // --------------------------------------------------------

    const bill = await Bill.findById(billId);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found.",
      });
    }

    // --------------------------------------------------------
    // ALREADY PAID
    // --------------------------------------------------------

    if (bill.paymentStatus === "PAID") {
      return res.status(400).json({
        success: false,
        message: "This bill has already been paid.",
      });
    }

    // --------------------------------------------------------
    // VALIDATE AMOUNT
    // --------------------------------------------------------

    const amount = Number(
      Number(bill.total).toFixed(2)
    );

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid bill amount.",
      });
    }

    // --------------------------------------------------------
    // CHECK RAZORPAY CONFIG
    // --------------------------------------------------------

    if (
      !process.env.RAZORPAY_KEY_ID ||
      !process.env.RAZORPAY_KEY_SECRET
    ) {
      console.error(
        "❌ Razorpay environment variables are missing."
      );

      return res.status(500).json({
        success: false,
        message: "Payment gateway is not configured.",
      });
    }

    // --------------------------------------------------------
    // CREATE RAZORPAY ORDER
    // --------------------------------------------------------

    const razorpayOrder =
      await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `bill_${bill.billNumber}`,
        notes: {
          restaurantId: String(
            bill.restaurantId
          ),
          billId: String(bill._id),
          billNumber: String(
            bill.billNumber
          ),
          sessionId: String(
            bill.sessionId
          ),
        },
      });

    // --------------------------------------------------------
    // SAVE BILL PAYMENT
    // --------------------------------------------------------

    const billPayment =
      await BillPayment.create({
        restaurantId:
          bill.restaurantId,

        billId: bill._id,

        provider: "razorpay",

        orderId:
          razorpayOrder.id,

        amount,

        currency: "INR",

        status: "created",
      });

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      key: process.env.RAZORPAY_KEY_ID,

      orderId:
        razorpayOrder.id,

      amount:
        razorpayOrder.amount,

      currency:
        razorpayOrder.currency,

      billId:
        bill._id,

      billPaymentId:
        billPayment._id,
    });

  } catch (error) {
    console.error(
      "❌ Create bill payment order failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to create payment order.",
    });
  }
});


// ============================================================
// VERIFY CUSTOMER BILL PAYMENT
// POST /api/bill-payments/verify
// ============================================================

router.post("/verify", async (req, res) => {
  try {
    const {
      billId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !billId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment verification data is incomplete.",
      });
    }

    // --------------------------------------------------------
    // FIND BILL
    // --------------------------------------------------------

    const bill = await Bill.findById(
      billId
    );

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found.",
      });
    }

    // --------------------------------------------------------
    // FIND PAYMENT
    // --------------------------------------------------------

    const billPayment =
      await BillPayment.findOne({
        billId: bill._id,
        orderId: razorpay_order_id,
      });

    if (!billPayment) {
      return res.status(404).json({
        success: false,
        message:
          "Bill payment record not found.",
      });
    }

    // --------------------------------------------------------
    // IDEMPOTENCY
    // --------------------------------------------------------

    if (
      billPayment.status === "paid" &&
      bill.paymentStatus === "PAID"
    ) {
      return res.status(200).json({
        success: true,
        message:
          "Payment was already verified.",
        bill,
      });
    }

    // --------------------------------------------------------
    // CREATE SIGNATURE
    // --------------------------------------------------------

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest("hex");

    // --------------------------------------------------------
    // COMPARE SIGNATURE
    // --------------------------------------------------------

    const generatedSignatureBuffer =
        Buffer.from(generatedSignature, "utf8");

    const receivedSignatureBuffer =
        Buffer.from(razorpay_signature, "utf8");

    const signaturesMatch =
        generatedSignatureBuffer.length ===
        receivedSignatureBuffer.length &&
        crypto.timingSafeEqual(
          generatedSignatureBuffer,
          receivedSignatureBuffer
        );

    if (!signaturesMatch) {
      billPayment.status = "failed";
      await billPayment.save();

      return res.status(400).json({
        success: false,
        message:
          "Invalid payment signature.",
      });
    }

    // --------------------------------------------------------
    // FETCH PAYMENT FROM RAZORPAY
    // --------------------------------------------------------

    const payment =
      await razorpay.payments.fetch(
        razorpay_payment_id
      );

    // --------------------------------------------------------
    // VALIDATE PAYMENT
    // --------------------------------------------------------

    const expectedAmount =
      Math.round(
        Number(bill.total) * 100
      );

    if (
      payment.order_id !==
      razorpay_order_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment order mismatch.",
      });
    }

    if (
      Number(payment.amount) !==
      expectedAmount
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount mismatch.",
      });
    }

    if (
      payment.currency !== "INR"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment currency mismatch.",
      });
    }

    if (
      payment.status !== "captured"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment has not been captured.",
      });
    }

    // --------------------------------------------------------
    // UPDATE BILL PAYMENT
    // --------------------------------------------------------

    billPayment.paymentId =
      razorpay_payment_id;

    billPayment.signature =
      razorpay_signature;

    billPayment.status = "paid";

    billPayment.paidAt =
      new Date();

    await billPayment.save();

    // --------------------------------------------------------
    // UPDATE BILL
    // --------------------------------------------------------

    bill.paymentStatus = "PAID";
    bill.paymentMethod = "ONLINE";
    bill.paymentReference = razorpay_payment_id;
    bill.paidAt = new Date();
    bill.status = "PAID";

    await bill.save();

    

    // --------------------------------------------------------
    // FIND RESTAURANT
    // --------------------------------------------------------

    const restaurant = await Restaurant.findById(
      bill.restaurantId
    ).select("name taxSettings");

    if (!restaurant) {
      console.error(
    `⚠️ Restaurant not found for paid bill ${bill.billNumber}`
  );

  return res.status(500).json({
    success: false,
    message: "Payment recorded, but restaurant configuration is missing.",
    bill,
  });
}

    // --------------------------------------------------------
    // GET SOCKET.IO
    // --------------------------------------------------------

    const io = req.app.get("io");

    // --------------------------------------------------------
    // CREATE BILLING PRINT JOB
    // --------------------------------------------------------

    let printJob = null;

try {
  printJob = await createBillingPrintJob({
    bill,
    restaurant,
    io,
  });

  console.log(
    `🧾 Online receipt print job: ${
      printJob?._id || "No billing printer configured"
    }`
  );
} catch (printError) {
  console.error(
    `⚠️ Online payment succeeded but receipt print job failed for bill ${bill.billNumber}:`,
    printError
  );
}
    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully.",
      bill,
      printJobId: printJob?._id || null,
    });

  } catch (error) {
    console.error(
      "❌ Bill payment verification failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Payment verification failed.",
    });
  }
});

export default router;