
import crypto from "crypto";
import mongoose from "mongoose";

import PrintJob from "../models/PrintJob.js";
import PrinterDevice from "../models/PrinterDevice.js";

/**
 * Find an enabled printer assignment for a role.
 */
function hasPrinterRole(device, printerRole) {
  return device.printerAssignments?.some(
    (assignment) =>
      assignment.enabled &&
      assignment.printerRole === printerRole
  );
}

/**
 * Save a print job.
 *
 * Jobs remain PENDING if no matching printer is online.
 */
export async function saveAndDispatchPrintJob({
  restaurantId,
  type,
  printerRole,
  sourceId,
  sessionId = null,
  payload,
  io,
  createdBy = null,
}) {
  if (!mongoose.isValidObjectId(restaurantId)) {
    throw new Error("Invalid restaurant ID.");
  }

  if (!["KOT", "BILL", "TEST"].includes(type)) {
    throw new Error("Invalid print job type.");
  }

  if (!["KITCHEN", "BILLING", "ANY"].includes(printerRole)) {
    throw new Error("Invalid printer role.");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Print job payload is required.");
  }

  if (
    typeof sourceId !== "string" ||
    !sourceId.trim()
  ) {
    throw new Error("Print job source ID is required.");
  }

  const dedupeKey = `${type}:${sourceId.trim()}`;

  const jobId = crypto.randomUUID();

  let job;

  try {
    job = await PrintJob.create({
      jobId,
      dedupeKey,
      restaurantId,
      type,
      printerRole,
      sourceId: sourceId.trim(),
      sessionId,
      payload,
      createdBy,
      status: "PENDING",
    });
  } catch (error) {
    if (error.code === 11000) {
      const existingJob = await PrintJob.findOne({
        restaurantId,
        dedupeKey,
      });

      if (existingJob) {
        return {
          job: existingJob,
          duplicate: true,
        };
      }
    }

    throw error;
  }

  // Attempt immediate delivery if a matching device is online.
  if (io) {
    await deliverPendingJobs(io.of("/printers"), restaurantId);
  }

  const updatedJob = await PrintJob.findById(job._id);

  return {
    job: updatedJob || job,
    duplicate: false,
  };
}

/**
 * Deliver pending jobs to an authenticated printer device.
 *
 * The caller must provide the authenticated device's
 * database record, not a client-supplied restaurant ID.
 */
export async function deliverPendingJobs(
  printerNamespace,
  restaurantId,
  deviceId = null
) {
  if (!printerNamespace) {
    throw new Error("Printer Socket.IO namespace is required.");
  }

  const deviceFilter = {
    restaurantId,
    status: "ONLINE",
  };

  if (deviceId) {
    deviceFilter._id = deviceId;
  }

  const devices = await PrinterDevice.find(deviceFilter);

  const deliveredJobs = [];

  for (const device of devices) {
    const assignments = device.printerAssignments || [];

    const roles = [
      ...new Set(
        assignments
          .filter((assignment) => assignment.enabled)
          .map((assignment) => assignment.printerRole)
      ),
    ];

    for (const role of roles) {
      const assignment = assignments.find(
        (item) =>
          item.enabled &&
          item.printerRole === role
      );

      if (!assignment) continue;

      const job = await PrintJob.findOneAndUpdate(
        {
          restaurantId,
          printerRole: role,
          status: "PENDING",
          attempts: { $lt: 5 },
          $or: [
            { deviceId: null },
            { deviceId: device._id },
          ],
        },
        {
          $set: {
            status: "DISPATCHED",
            deviceId: device._id,
            lastAttemptAt: new Date(),
            errorMessage: null,
          },
          $inc: {
            attempts: 1,
          },
        },
        {
          sort: { createdAt: 1 },
          new: true,
        }
      );

      if (!job) continue;

      const socketRoom = `device:${device._id}`;

      printerNamespace.to(socketRoom).emit(
        "printer:job",
        {
          jobId: job.jobId,
          type: job.type,
          printerRole: job.printerRole,
          payload: job.payload,
          createdAt: job.createdAt,
        }
      );

      deliveredJobs.push(job.jobId);
    }
  }

  return deliveredJobs;
}

/**
 * Record a successful physical print acknowledgement.
 */
export async function markPrintJobPrinted({
  jobId,
  deviceId,
}) {
  const job = await PrintJob.findOneAndUpdate(
    {
      jobId,
      deviceId,
      status: {
        $in: ["DISPATCHED", "PRINTING"],
      },
    },
    {
      $set: {
        status: "PRINTED",
        printedAt: new Date(),
        acknowledgedAt: new Date(),
        errorMessage: null,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!job) {
    throw new Error(
      "Print job not found or cannot be marked as printed."
    );
  }

  return job;
}

/**
 * Record a printing failure.
 */
export async function markPrintJobFailed({
  jobId,
  deviceId,
  errorMessage,
}) {
  const job = await PrintJob.findOneAndUpdate(
    {
      jobId,
      deviceId,
      status: {
        $in: ["DISPATCHED", "PRINTING"],
      },
    },
    {
      $set: {
        status: "FAILED",
        failedAt: new Date(),
        acknowledgedAt: new Date(),
        errorMessage: String(
          errorMessage || "Printing failed."
        ).slice(0, 1000),
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!job) {
    throw new Error(
      "Print job not found or cannot be marked as failed."
    );
  }

  return job;
}

/**
 * Retry a failed job.
 *
 * Restaurant ownership must be verified by the calling API route.
 */
export async function retryPrintJob({
  jobId,
  restaurantId,
  io,
}) {
  const job = await PrintJob.findOneAndUpdate(
    {
      jobId,
      restaurantId,
      status: "FAILED",
      attempts: { $lt: 5 },
    },
    {
      $set: {
        status: "PENDING",
        deviceId: null,
        errorMessage: null,
        failedAt: null,
        acknowledgedAt: null,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!job) {
    throw new Error(
      "Failed job not found or retry limit reached."
    );
  }

  if (io) {
    await deliverPendingJobs(
      io.of("/printers"),
      restaurantId
    );
  }

  return PrintJob.findById(job._id);
}

export default {
  saveAndDispatchPrintJob,
  deliverPendingJobs,
  markPrintJobPrinted,
  markPrintJobFailed,
  retryPrintJob,
};
