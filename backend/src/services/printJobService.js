import PrintJob from "../models/PrintJob.js";
import Printer from "../models/Printer.js";

/* =========================================================
   EMIT PRINT JOB TO PRINTER AGENT
========================================================= */

const emitJob = async (printerNamespace, job) => {
  if (!printerNamespace) {
    console.error("❌ Printer namespace is missing");
    return false;
  }

  if (!job) {
    console.error("❌ Cannot emit empty print job");
    return false;
  }

  const deviceId = job.deviceId?.toString();

  if (!deviceId) {
    console.error("❌ Print job has no deviceId");
    return false;
  }

  const roomName = `printer-device:${deviceId}`;

  console.log("");
  console.log("========================================");
  console.log("🖨️ PRINT JOB DELIVERY");
  console.log("========================================");

  console.log("Job ID:", job._id.toString());
  console.log("Job Type:", job.type);
  console.log("Job Status:", job.status);

  console.log(
    "Restaurant ID:",
    job.restaurantId?.toString()
  );

  console.log(
    "Printer ID:",
    job.printerId?.toString()
  );

  console.log("Device ID:", deviceId);
  console.log("Room:", roomName);
  console.log("Namespace:", printerNamespace.name);

  /* =======================================================
     FIND PRINTER CONFIGURATION
  ======================================================= */

  const printer = await Printer.findOne({
    _id: job.printerId,
    restaurantId: job.restaurantId,
    enabled: true,
  }).select(
    "_id name role model connection"
  );

  if (!printer) {
    console.error(
      "❌ Printer configuration not found or disabled:",
      job.printerId?.toString()
    );

    return false;
  }

  if (!printer.connection?.type) {
    console.error(
      "❌ Printer has no connection type:",
      printer._id.toString()
    );

    return false;
  }

  console.log("🖨️ Printer configuration:", {
    printerId: printer._id.toString(),
    name: printer.name,
    role: printer.role,
    model: printer.model || "",
    connectionType: printer.connection.type,
    address: printer.connection.address || "",
    port: printer.connection.port || 9100,
  });

  /* =======================================================
     CHECK CONNECTED PRINTER AGENT
  ======================================================= */

  const socketsInRoom =
    printerNamespace.adapter.rooms.get(roomName);

  const socketCount =
    socketsInRoom?.size || 0;

  console.log(
    "Connected sockets:",
    socketCount
  );

  if (socketCount === 0) {
    console.log(
      "⚠️ NO PRINTER AGENT CONNECTED TO THIS DEVICE ROOM"
    );

    console.log(
      "⚠️ Job remains PENDING and will be delivered when agent reconnects."
    );

    console.log(
      "========================================"
    );

    return false;
  }

  /* =======================================================
     BUILD SOCKET PAYLOAD
  ======================================================= */

  const payload = {
    version: 1,

    type: "PRINT_JOB",

    jobType: job.type,

    jobId: job._id.toString(),

    printer: {
      id: printer._id.toString(),

      name: printer.name,

      role: printer.role,

      model: printer.model || "",

      connection: {
        type: printer.connection.type,

        address:
          printer.connection.address || "",

        port:
          printer.connection.port || 9100,
      },
    },

    payload: job.payload?.toObject
      ? job.payload.toObject()
      : job.payload,
  };

  console.log("");
  console.log("📤 Sending printer:print-job");

  console.log(
    "📤 Job ID:",
    payload.jobId
  );

  console.log(
    "📤 Job Type:",
    job.type
  );

  console.log(
    "📤 Printer:",
    JSON.stringify(
      payload.printer,
      null,
      2
    )
  );

  console.log(
    "📤 Payload:",
    JSON.stringify(
      payload.payload,
      null,
      2
    )
  );

  /* =======================================================
     EMIT TO DEVICE ROOM
  ======================================================= */

  printerNamespace
    .to(roomName)
    .emit(
      "printer:print-job",
      payload
    );

  console.log("");

  console.log(
    `✅ printer:print-job emitted to ${socketCount} socket(s)`
  );

  console.log(
    "========================================"
  );

  return true;
};


/* =========================================================
   KITCHEN PRINT JOB
========================================================= */

export async function createKitchenPrintJob({
  order,
  restaurant,
  io,
}) {
  console.log("");
  console.log("========================================");
  console.log("🍳 CREATING KITCHEN PRINT JOB");
  console.log("========================================");

  console.log(
    "Restaurant ID:",
    order.restaurantId?.toString()
  );

  console.log(
    "Order ID:",
    order._id?.toString()
  );

  console.log(
    "Order Number:",
    order.orderId
  );

  /* =======================================================
     FIND KITCHEN PRINTER
  ======================================================= */

  const printer = await Printer.findOne({
    restaurantId: order.restaurantId,
    role: "KITCHEN",
    enabled: true,
  }).sort({
    createdAt: 1,
  });

  /* =======================================================
     PRINTER NOT FOUND
  ======================================================= */

  if (!printer) {
    console.log(
      "❌ No enabled KITCHEN printer found"
    );

    console.log("========================================");

    return null;
  }

  console.log("");
  console.log("🖨️ KITCHEN PRINTER FOUND");
  console.log({
    printerId: printer._id?.toString(),
    deviceId: printer.deviceId?.toString(),
    role: printer.role,
    enabled: printer.enabled,
  });

  /* =======================================================
     VALIDATE DEVICE
  ======================================================= */

  if (!printer.deviceId) {
    console.error(
      "❌ Kitchen printer has no deviceId"
    );

    console.log("========================================");

    return null;
  }

  /* =======================================================
     BUILD KITCHEN PAYLOAD
  ======================================================= */

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

  console.log("");
  console.log("📦 KITCHEN PAYLOAD:");
  console.log(
    JSON.stringify(payload, null, 2)
  );

  /* =======================================================
     CREATE PRINT JOB
  ======================================================= */

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

    console.log("");
    console.log(
      "✅ Kitchen print job created:",
      job._id.toString()
    );

  } catch (error) {

    /* =====================================================
       DUPLICATE JOB
    ===================================================== */

    if (error.code === 11000) {
      console.log(
        "⚠️ Existing kitchen print job found"
      );

      job = await PrintJob.findOne({
        restaurantId: order.restaurantId,

        orderId: order._id,

        printerId: printer._id,

        type: "KITCHEN_ORDER",
      });

      if (!job) {
        throw error;
      }

      console.log(
        "Existing Job ID:",
        job._id.toString()
      );

      console.log(
        "Existing Job Status:",
        job.status
      );

    } else {
      throw error;
    }
  }

  /* =======================================================
     DELIVER TO ANDROID PRINTER BRIDGE
  ======================================================= */

  if (io && job) {
    const printerNamespace =
      io.of("/printers");

    if (job.status === "PENDING") {

      console.log("");
      console.log(
        "📤 Delivering kitchen job to printer agent..."
      );

      const delivered = emitJob(
        printerNamespace,
        job
      );

      if (delivered) {
        console.log(
          "✅ Kitchen job sent to Android printer bridge"
        );
      } else {
        console.log(
          "⚠️ Kitchen job was NOT delivered"
        );
      }

    } else {

      console.log(
        `ℹ️ Kitchen job ${job._id} is already ${job.status}`
      );
    }
  }

  console.log("========================================");

  return job;
}


/* =========================================================
   BILLING PRINT JOB
========================================================= */

export async function createBillingPrintJob({
  bill,
  restaurant,
  io,
}) {
  console.log("");
  console.log("========================================");
  console.log("🧾 CREATING BILLING PRINT JOB");
  console.log("========================================");

  console.log(
    "Restaurant ID:",
    bill.restaurantId?.toString()
  );

  console.log(
    "Bill ID:",
    bill._id?.toString()
  );

  console.log(
    "Bill Number:",
    bill.billNumber
  );

  /* =======================================================
     FIND BILLING PRINTER
  ======================================================= */

  const printer = await Printer.findOne({
    restaurantId: bill.restaurantId,
    role: "BILLING",
    enabled: true,
  }).sort({
    createdAt: 1,
  });

  console.log("");
  console.log("🖨️ BILLING PRINTER LOOKUP:");

  console.log({
    restaurantId:
      bill.restaurantId?.toString(),

    printerFound:
      !!printer,

    printerId:
      printer?._id?.toString(),

    deviceId:
      printer?.deviceId?.toString(),

    role:
      printer?.role,

    enabled:
      printer?.enabled,
  });

  /* =======================================================
     PRINTER NOT FOUND
  ======================================================= */

  if (!printer) {
    console.log(
      "❌ No enabled BILLING printer configured"
    );

    console.log("========================================");

    return null;
  }

  /* =======================================================
     VALIDATE DEVICE
  ======================================================= */

  if (!printer.deviceId) {
    console.error(
      "❌ Billing printer has no deviceId"
    );

    console.log("========================================");

    return null;
  }

  /* =======================================================
     BUILD BILLING PAYLOAD
  ======================================================= */

  // A cash-request bill is a separate job from a final paid receipt.
  // This lets a later successful online payment generate its own receipt.
  const billingJobType =
    bill.paymentMethod === "CASH" && bill.paymentStatus !== "PAID"
      ? "BILL"
      : "BILLING_RECEIPT";

  const payload = {
    sessionId:
      bill.sessionId,

    restaurantId:
      bill.restaurantId,

    billId:
      bill._id,

    restaurantName:
      restaurant?.name || "",

    gstin:
      restaurant?.taxSettings?.gstin || "",

    billDate:
      bill.createdAt,

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

    items:
      bill.items.map((item) => ({
        id:
          item.id,

        name:
          item.name,

        price:
          item.price,

        category:
          item.category || "",

        quantity:
          item.quantity,
      })),

    totalItems:
      bill.totalItems,

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

    totalPrice:
      bill.total,

    paymentMethod:
      bill.paymentMethod,

    paymentStatus:
      bill.paymentStatus,

    billStatus:
      bill.status,
  };

  /* =======================================================
     CREATE BILLING PRINT JOB
  ======================================================= */

  let job;

  try {
    job = await PrintJob.create({
      restaurantId:
        bill.restaurantId,

      /*
       * Billing job uses Bill._id
       * because PrintJob.orderId is
       * the generic source document ID.
       */
      orderId:
        bill._id,

      deviceId:
        printer.deviceId,

      printerId:
        printer._id,

      type:
        billingJobType,

      payload,
    });

    console.log("");
    console.log(
      "✅ NEW BILLING PRINT JOB CREATED"
    );

    console.log({
      jobId:
        job._id.toString(),

      deviceId:
        job.deviceId.toString(),

      printerId:
        job.printerId.toString(),

      restaurantId:
        job.restaurantId.toString(),

      type:
        job.type,

      status:
        job.status,
    });

  } catch (error) {

    /* =====================================================
       DUPLICATE JOB
    ===================================================== */

    if (error.code === 11000) {

      console.log(
        "⚠️ BILLING PRINT JOB ALREADY EXISTS"
      );

      job = await PrintJob.findOne({
        restaurantId:
          bill.restaurantId,

        orderId:
          bill._id,

        printerId:
          printer._id,

        type:
          billingJobType,
      });

      if (!job) {
        throw error;
      }

      console.log({
        existingJobId:
          job._id.toString(),

        status:
          job.status,

        deviceId:
          job.deviceId.toString(),
      });

    } else {
      throw error;
    }
  }

  /* =======================================================
     DELIVER BILLING JOB
  ======================================================= */

  if (io && job) {

    const printerNamespace =
      io.of("/printers");

    if (job.status === "PENDING") {

      console.log(
        "📤 Delivering billing job to printer agent..."
      );

      const delivered =
        await emitJob(
          printerNamespace,
          job
        );

      if (delivered) {
        console.log(
          "✅ Billing job sent to printer bridge"
        );
      } else {
        console.log(
          "⚠️ Billing job was NOT delivered"
        );
      }

    } else {

      console.log(
        `ℹ️ Billing job ${job._id} is already ${job.status}`
      );
    }
  }

  console.log(
    "========================================"
  );

  return job;
}


/* =========================================================
   DELIVER PENDING JOBS
========================================================= */

export async function deliverPendingJobs(
  printerNamespace,
  deviceId
) {
  console.log("");

  console.log(
    "📦 Checking pending jobs for device:",
    deviceId.toString()
  );

  const jobs =
    await PrintJob.find({
      deviceId,

      status: "PENDING",
    })
      .sort({
        createdAt: 1,
      })
      .limit(50);

  console.log(
    `📦 Found ${jobs.length} pending job(s)`
  );

  let delivered = 0;

  for (const job of jobs) {

    const sent =
      await emitJob(
        printerNamespace,
        job
      );

    if (sent) {
      delivered++;
    }
  }

  console.log(
    `📤 Delivered ${delivered}/${jobs.length} pending job(s)`
  );

  return delivered;
}