import PrintJob from "../models/PrintJob.js";
import Printer from "../models/Printer.js";

const emitJob = (printerNamespace, job) => {
  printerNamespace
    .to(`printer-device:${job.deviceId.toString()}`)
    .emit("printer:print-job", {
      version: 1,
      type: "PRINT_JOB",
      jobId: job._id.toString(),
      payload: job.payload,
    });
};

export async function createKitchenPrintJob({ order, io }) {
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

  if (io) emitJob(io.of("/printers"), job);
  return job;
}

export async function deliverPendingJobs(printerNamespace, deviceId) {
  const jobs = await PrintJob.find({
    deviceId,
    status: "PENDING",
  })
    .sort({ createdAt: 1 })
    .limit(50);

  for (const job of jobs) emitJob(printerNamespace, job);
  return jobs.length;
}
