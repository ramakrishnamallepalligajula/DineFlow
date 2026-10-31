
import PrinterDevice from "../models/PrinterDevice.js";
import PrintJob from "../models/PrintJob.js";

import {
  verifyDeviceToken,
} from "../services/printerAuthService.js";

import {
  deliverPendingJobs,
  markPrintJobPrinted,
  markPrintJobFailed,
} from "../services/printJobService.js";

export function setupPrinterGateway(io) {
  const printerNamespace = io.of("/printers");

  // Authenticate every printer before allowing a connection.
  printerNamespace.use(async (socket, next) => {
    try {
      const { deviceId, deviceToken } =
        socket.handshake.auth || {};

      const device = await verifyDeviceToken({
        deviceId,
        deviceToken,
      });

      if (!device) {
        return next(
          new Error("Printer authentication failed.")
        );
      }

      socket.data.deviceId = String(device._id);
      socket.data.restaurantId = String(device.restaurantId);

      next();
    } catch (error) {
      console.error("Printer authentication error:", error);
      next(new Error("Printer authentication failed."));
    }
  });

  printerNamespace.on("connection", async (socket) => {
    const { deviceId, restaurantId } = socket.data;

    const deviceRoom = `device:${deviceId}`;

    console.log(`Printer connected: ${deviceId}`);

    try {
      // Join only the authenticated device's private room.
      await socket.join(deviceRoom);

      await PrinterDevice.updateOne(
        {
          _id: deviceId,
          restaurantId,
          status: { $in: ["OFFLINE", "ONLINE"] },
        },
        {
          $set: {
            status: "ONLINE",
            lastSeenAt: new Date(),
          },
        }
      );

      socket.emit("printer:connected", {
        success: true,
        deviceId,
        message: "Printer bridge connected successfully.",
      });

      // Deliver pending jobs after the device joins its room.
      await deliverPendingJobs(
        printerNamespace,
        restaurantId,
        deviceId
      );
    } catch (error) {
      console.error("Printer connection setup failed:", error);
      socket.disconnect(true);
      return;
    }

    // Android app reports that it has started printing.
    socket.on("printer:job-printing", async (data = {}) => {
      try {
        if (typeof data.jobId !== "string") return;

        const job = await PrintJob.findOneAndUpdate(
          {
            jobId: data.jobId,
            deviceId,
            restaurantId,
            status: "DISPATCHED",
          },
          {
            $set: {
              status: "PRINTING",
            },
          },
          {
            new: true,
          }
        );

        if (job) {
          socket.emit("printer:job-printing-ack", {
            jobId: job.jobId,
            success: true,
          });
        }
      } catch (error) {
        console.error("Printing status update failed:", error);
      }
    });

    // Android confirms that physical printing completed.
    socket.on("printer:job-printed", async (data = {}) => {
      try {
        if (typeof data.jobId !== "string") return;

        const job = await markPrintJobPrinted({
          jobId: data.jobId,
          deviceId,
        });

        socket.emit("printer:job-printed-ack", {
          jobId: job.jobId,
          success: true,
        });

        console.log(`Print completed: ${job.jobId}`);

        await deliverPendingJobs(
          printerNamespace,
          restaurantId,
          deviceId
        );
      } catch (error) {
        console.error("Print success acknowledgement failed:", error);

        socket.emit("printer:ack-error", {
          jobId: data.jobId,
          message: error.message,
        });
      }
    });

    // Android reports a printing failure.
    socket.on("printer:job-failed", async (data = {}) => {
      try {
        if (typeof data.jobId !== "string") return;

        const job = await markPrintJobFailed({
          jobId: data.jobId,
          deviceId,
          errorMessage: data.errorMessage,
        });

        socket.emit("printer:job-failed-ack", {
          jobId: job.jobId,
          success: true,
        });

        console.log(`Print failed: ${job.jobId}`);

        await deliverPendingJobs(
          printerNamespace,
          restaurantId,
          deviceId
        );
      } catch (error) {
        console.error("Print failure acknowledgement failed:", error);

        socket.emit("printer:ack-error", {
          jobId: data.jobId,
          message: error.message,
        });
      }
    });

    // Android sends periodic heartbeat messages.
    socket.on("printer:heartbeat", async () => {
      try {
        await PrinterDevice.updateOne(
          {
            _id: deviceId,
            restaurantId,
            status: "ONLINE",
          },
          {
            $set: {
              lastSeenAt: new Date(),
            },
          }
        );

        socket.emit("printer:heartbeat-ack", {
          success: true,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Printer heartbeat failed:", error);
      }
    });

    socket.on("disconnect", async (reason) => {
      try {
        // Do not mark a device offline if another authenticated
        // connection for the same device is still active.
        const remainingSockets = await printerNamespace
          .in(deviceRoom)
          .fetchSockets();

        if (remainingSockets.length === 0) {
          await PrinterDevice.updateOne(
            {
              _id: deviceId,
              restaurantId,
              status: "ONLINE",
            },
            {
              $set: {
                status: "OFFLINE",
              },
            }
          );
        }

        console.log(
          `Printer disconnected: ${deviceId}`,
          reason
        );
      } catch (error) {
        console.error("Printer disconnect update failed:", error);
      }
    });
  });

  console.log("Printer Socket.IO gateway initialized.");

  return printerNamespace;
}

export default setupPrinterGateway;
