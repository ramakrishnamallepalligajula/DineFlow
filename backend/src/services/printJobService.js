import PrintJob from "../models/PrintJob.js";
import Printer from "../models/Printer.js";

const emitJob = (printerNamespace, job) => {
  const roomName = `printer-device:${job.deviceId.toString()}`;

  console.log("========================================");
  console.log("🖨️ EMITTING PRINT JOB");
  console.log("========================================");
  console.log("Job ID:", job._id.toString());
  console.log("Job Type:", job.type);
  console.log("Device ID:", job.deviceId.toString());
  console.log("Room:", roomName);
  console.log("Status:", job.status);
  console.log(
    "Namespace:",
    printerNamespace.name
  );

  const socketsInRoom =
    printerNamespace.adapter.rooms.get(roomName);

  console.log(
    "Sockets in room:",
    socketsInRoom
      ? socketsInRoom.size
      : 0
  );

  printerNamespace
    .to(roomName)
    .emit("printer:print-job", {
      version: 1,
      type: "PRINT_JOB",
      jobId: job._id.toString(),
      payload: job.payload,
    });

  console.log("✅ PRINT JOB EVENT EMITTED");
  console.log("========================================");
};

export async function createKitchenPrintJob({
  order,
  restaurant,
  io,
}) {
  const printer = await Printer.findOne({
    restaurantId: order.restaurantId,
    role: "KITCHEN",
    enabled: true,
  }).sort({ createdAt: 1 });

  if (!printer) return null;

  const payload = {
    orderNumber: order.orderId,
    orderSequence: order.orderSequence,
    orderType: order.type,
    tableNumber: order.tableNumber,

    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category || "",
      quantity: item.quantity,
    })),

    totalItems: order.totalItems,
    totalPrice: order.totalPrice,
  };

  let job;

  try {
    job = await PrintJob.create({
      restaurantId: order.restaurantId,
      orderId: order._id,
      deviceId: printer.deviceId,
      printerId: printer._id,
      type: "KITCHEN_ORDER",
      payload,
    });
  } catch (error) {
    if (error.code === 11000) {
      return PrintJob.findOne({
        restaurantId: order.restaurantId,
        orderId: order._id,
        printerId: printer._id,
        type: "KITCHEN_ORDER",
      });
    }

    throw error;
  }

  if (io) {
    emitJob(io.of("/printers"), job);
  }

  return job;
};

export async function createBillingPrintJob({
  bill,
  restaurant,
  io,
}) {
  const printer = await Printer.findOne({
    restaurantId: bill.restaurantId,
    role: "BILLING",
    enabled: true,
  }).sort({ createdAt: 1 });

  console.log(
    "🖨️ BILLING PRINTER LOOKUP:",
    {
      restaurantId: String(
        bill.restaurantId
      ),
      printerFound: !!printer,
      printerId:
        printer?._id?.toString(),
      deviceId:
        printer?.deviceId?.toString(),
      role: printer?.role,
      enabled: printer?.enabled,
    }
  );

  // No billing printer configured.
  // Bill remains safely stored in MongoDB.
  if (!printer) return null;

  const payload = {
    sessionId: bill.sessionId,

    restaurantId:
      bill.restaurantId,

    billId: bill._id,

    // ==========================================
    // RESTAURANT INFORMATION
    // ==========================================

    restaurantName:
      restaurant?.name || "",

    gstin:
      restaurant?.taxSettings?.gstin || "",

    // ==========================================
    // BILL DATE / TIME SOURCE
    // ==========================================

    billDate:
      bill.createdAt,

    // ==========================================
    // BILL INFORMATION
    // ==========================================

    billNumber:
      bill.billNumber,

    orderId:
      bill.orderId,

    tableId:
      bill.tableId,

    tableNumber:
      bill.tableNumber,

    orderCount:
      bill.orderCount,

    // ==========================================
    // ITEMS
    // ==========================================

    items: bill.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category:
        item.category || "",
      quantity:
        item.quantity,
    })),

    totalItems:
      bill.totalItems,

    // ==========================================
    // GST / BILL TOTALS
    // ==========================================

    subtotal:
      bill.subtotal,

    taxRate:
      bill.taxRate,

    cgst:
      bill.cgst,

    sgst:
      bill.sgst,

    tax:
      bill.tax,

    total:
      bill.total,

    // Keep this populated for
    // generic print payload compatibility.
    totalPrice:
      bill.total,
  };

  let job;

  try {
    job = await PrintJob.create({
      restaurantId:
        bill.restaurantId,

      // PrintJob.orderId is a generic ObjectId.
      // For billing jobs, it points to the Bill document.
      orderId:
        bill._id,

      deviceId:
        printer.deviceId,

      printerId:
        printer._id,

      type:
        "BILLING_RECEIPT",

      payload,
    });
  } catch (error) {
    // Idempotency:
    // Don't create duplicate billing jobs
    // for the same bill + printer.
    if (error.code === 11000) {
      return PrintJob.findOne({
        restaurantId:
          bill.restaurantId,

        orderId:
          bill._id,

        printerId:
          printer._id,

        type:
          "BILLING_RECEIPT",
      });
    }

    throw error;
  }

  if (io) {
    emitJob(
      io.of("/printers"),
      job
    );
  }

  return job;
}

export async function deliverPendingJobs(
  printerNamespace,
  deviceId
) {
  const jobs = await PrintJob.find({
    deviceId,
    status: "PENDING",
  })
    .sort({
      createdAt: 1,
    })
    .limit(50);

  for (const job of jobs) {
    emitJob(
      printerNamespace,
      job
    );
  }

  return jobs.length;
}