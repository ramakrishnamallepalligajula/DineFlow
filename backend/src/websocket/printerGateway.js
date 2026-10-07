import PrinterDevice from "../models/PrinterDevice.js";

import Printer from "../models/Printer.js";

import PrintJob from "../models/PrintJob.js";


import { authenticateDevice } from "../services/printerAuthService.js";

import { deliverPendingJobs } from "../services/printJobService.js";

import Bill from "../models/Bill.js";



export const setupPrinterGateway = (io) => {

  console.log("========================================");

  console.log("🖨️ INITIALIZING DINEFLOW PRINTER GATEWAY");

  console.log("========================================");



  // Create dedicated printer namespace

  const ns = io.of("/printers");



  console.log("🖨️ Printer namespace created");

  console.log("📡 Namespace:", ns.name);



  // ========================================

  // PRINTER DEVICE + ADMIN AUTHENTICATION

  // ========================================

ns.use(async (socket, next) => {

  console.log("");
  console.log("🔐 Printer namespace authentication request");
  console.log("Socket ID:", socket.id);

  try {

    const {
      deviceId,
      deviceSecret,
    } = socket.handshake.auth || {};


    console.log(
      "Device ID:",
      deviceId || "MISSING"
    );

    console.log(
      "Device Secret:",
      deviceSecret
        ? "PROVIDED"
        : "MISSING"
    );


    // ========================================
    // VALIDATE CREDENTIALS
    // ========================================

    if (
      !deviceId ||
      !deviceSecret
    ) {

      console.log(
        "❌ Missing printer authentication credentials"
      );

      return next(
        new Error(
          "Printer authentication credentials missing"
        )
      );

    }


    // ========================================
    // AUTHENTICATE PRINTER DEVICE
    // ========================================

    const device =
      await authenticateDevice(
        deviceId,
        deviceSecret
      );


    if (!device) {

      console.log(
        "❌ Printer device authentication failed"
      );

      console.log(
        "Device ID:",
        deviceId
      );

      return next(
        new Error(
          "Printer device authentication failed"
        )
      );

    }


    console.log(
      "✅ Printer device authenticated"
    );

    console.log(
      "Device ID:",
      device._id.toString()
    );

    console.log(
      "Device Restaurant ID:",
      device.restaurantId
    );


    // ========================================
    // SUCCESSFUL AUTHENTICATION
    // ========================================

    console.log(
      "========================================"
    );

    console.log(
      "🟢 PRINTER AGENT AUTHENTICATED"
    );

    console.log(
      "Restaurant:",
      device.restaurantId
    );

    console.log(
      "Device:",
      device._id.toString()
    );

    console.log(
      "========================================"
    );


    socket.data.device = device;


    socket.data.user = {
      role: "printer-agent",
      restaurantId: device.restaurantId,
    };


    next();


  } catch (error) {

    console.error(
      "❌ Printer authentication error:"
    );

    console.error(error);

    next(
      new Error(
        "Printer device authentication failed"
      )
    );

  }

});


  // ========================================

  // PRINTER CONNECTION

  // ========================================



  ns.on("connection", async (socket) => {

    console.log("");

    console.log("========================================");

    console.log("🟢 PRINTER AGENT CONNECTED");

    console.log("========================================");



    try {

      const device = socket.data.device;



      if (!device) {

        console.error(
          "❌ No authenticated device attached to socket"
        );



        socket.disconnect(true);

        return;

      }



      const deviceId =
        device._id.toString();



      console.log(
        "Socket ID:",
        socket.id
      );

      console.log(
        "Device ID:",
        deviceId
      );

      console.log(
        "Restaurant ID:",
        device.restaurantId
      );

      console.log(
        "Namespace:",
        socket.nsp.name
      );



      // ========================================

      // JOIN DEVICE ROOM

      // ========================================



      const roomName =
        `printer-device:${deviceId}`;



      await socket.join(roomName);



      console.log(
        "🏠 Joined room:",
        roomName
      );



      // ========================================

      // MARK DEVICE ONLINE

      // ========================================



      await PrinterDevice.updateOne(

        {
          _id: device._id
        },

        {

          $set: {

            status: "ONLINE",

            lastSeenAt: new Date(),

          },

        }

      );



      console.log(
        "🟢 Printer device marked ONLINE"
      );



      // ========================================

      // DELIVER PENDING PRINT JOBS

      // ========================================



      console.log(
        "📦 Checking pending print jobs..."
      );



      await deliverPendingJobs(

        ns,

        device._id

      );



      console.log(
        "✅ Pending print jobs processed"
      );



    } catch (error) {

      console.error(
        "❌ Error while initializing printer connection:"
      );



      console.error(error);

    }



    // ========================================

    // HEARTBEAT

    // ========================================



    socket.on(

      "printer:heartbeat",

      async () => {

        try {

          await PrinterDevice.updateOne(

            {
              _id: socket.data.device._id
            },

            {

              $set: {

                status: "ONLINE",

                lastSeenAt: new Date(),

              },

            }

          );



          console.log(

            `💓 Heartbeat received from ${socket.data.device._id}`

          );

        } catch (error) {

          console.error(

            "❌ Heartbeat update failed:",

            error

          );

        }

      }

    );



    // ========================================

    // JOB RECEIVED

    // ========================================



    socket.on(

      "printer:job-received",

      async ({ jobId } = {}) => {

        try {

          if (!jobId) {

            console.log(

              "⚠️ printer:job-received called without jobId"

            );

            return;

          }



          console.log(

            "📥 Printer received job:",

            jobId

          );



          await PrintJob.findOneAndUpdate(

            {

              _id: jobId,

              deviceId: socket.data.device._id,

              restaurantId:
                socket.data.device.restaurantId,

              status: "PENDING",

            },

            {

              $set: {

                status: "PROCESSING",

                processingAt: new Date(),

                lastAttemptAt: new Date(),

              },

              $inc: {

                attempts: 1,

              },

            }

          );



          console.log(

            "🔄 Print job marked PROCESSING:",

            jobId

          );

        } catch (error) {

          console.error(

            "❌ printer:job-received error:",

            error

          );

        }

      }

    );
  /* ========================================
   JOB PRINTED
======================================== */

socket.on(
  "printer:job-printed",
  async ({ jobId } = {}) => {

    try {

      if (!jobId) {

        console.log(
          "⚠️ printer:job-printed called without jobId"
        );

        return;
      }


      console.log("");
      console.log(
        "========================================"
      );

      console.log(
        "✅ PRINTER REPORTED SUCCESS"
      );

      console.log(
        "Job ID:",
        jobId
      );


      /* ------------------------------------
         UPDATE PRINT JOB
      ------------------------------------ */

      const job =
        await PrintJob.findOneAndUpdate(
          {
            _id:
              jobId,

            deviceId:
              socket.data.device._id,

            restaurantId:
              socket.data.device.restaurantId,

            status: {
              $in: [
                "PENDING",
                "PROCESSING",
              ],
            },
          },

          {
            $set: {

              status:
                "PRINTED",

              printedAt:
                new Date(),

              error: {
                code:
                  null,

                message:
                  null,
              },
            },
          },

          {
            new:
              true,
          }
        );


      /* ------------------------------------
         JOB NOT FOUND
      ------------------------------------ */

      if (!job) {

        console.log(
          "⚠️ Print job not found or already completed:",
          jobId
        );

        console.log(
          "========================================"
        );

        return;
      }


      console.log(
        "🟢 Print job marked PRINTED:",
        jobId
      );


      /* ------------------------------------
         UPDATE BILL
      ------------------------------------ */

      if (
        job.type ===
        "BILLING_RECEIPT"
      ) {

        await Bill.findOneAndUpdate(
          {
            _id:
              job.orderId,

            restaurantId:
              socket.data.device.restaurantId,
          },

          {
            $set: {
              printedAt:
                new Date(),
            },
          }
        );


        console.log(
          "🧾 Bill marked as PRINTED:",
          job.orderId.toString()
        );
      }


      console.log(
        "========================================"
      );


    } catch (error) {

      console.error(
        "❌ printer:job-printed error:",
        error
      );

    }

  }
);



    // ========================================

    // JOB FAILED

    // ========================================



    socket.on(

      "printer:job-failed",

      async ({ jobId, error } = {}) => {

        try {

          if (!jobId) {

            console.log(

              "⚠️ printer:job-failed called without jobId"

            );

            return;

          }



          console.log(

            "❌ Printer failed job:",

            jobId

          );



          await PrintJob.findOneAndUpdate(

            {

              _id: jobId,

              deviceId: socket.data.device._id,

              restaurantId:
                socket.data.device.restaurantId,

              status: {

                $in: [

                  "PENDING",

                  "PROCESSING",

                ],

              },

            },

            {

              $set: {

                status: "FAILED",

                failedAt: new Date(),

                error: {

                  code:

                    error?.code ||

                    "PRINT_FAILED",

                  message:

                    error?.message ||

                    "Printer failed",

                },

              },

            }

          );



          console.log(

            "🔴 Print job marked FAILED:",

            jobId

          );

        } catch (error) {

          console.error(

            "❌ printer:job-failed error:",

            error

          );

        }

      }

    );



    // ========================================

    // DISCONNECT

    // ========================================



    socket.on(

      "disconnect",

      async (reason) => {

        try {

          console.log("");

          console.log(

            "🔴 PRINTER AGENT DISCONNECTED"

          );



          console.log(

            "Socket ID:",

            socket.id

          );



          console.log(

            "Device ID:",

            socket.data.device?._id?.toString()

          );



          console.log(

            "Reason:",

            reason

          );



          if (socket.data.device?._id) {

            await PrinterDevice.updateOne(

              {

                _id: socket.data.device._id,

              },

              {

                $set: {

                  status: "OFFLINE",

                },

              }

            );

          }

        } catch (error) {

          console.error(

            "❌ Disconnect handling error:",

            error

          );

        }

      }

    );

  });



  console.log("========================================");

  console.log("✅ PRINTER GATEWAY READY");

  console.log("📡 Namespace: /printers");

  console.log("========================================");



  return ns;

};