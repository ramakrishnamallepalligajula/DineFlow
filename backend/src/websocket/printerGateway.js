import PrinterDevice from "../models/PrinterDevice.js";

import Printer from "../models/Printer.js";

import PrintJob from "../models/PrintJob.js";

import jwt from "jsonwebtoken";

import { authenticateDevice } from "../services/printerAuthService.js";

import { deliverPendingJobs } from "../services/printJobService.js";



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
        token,
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

      console.log(
        "Admin Token:",
        token
          ? "PROVIDED"
          : "MISSING"
      );



      // ========================================

      // VALIDATE CREDENTIALS

      // ========================================



      if (
        !token ||
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

      // AUTHENTICATE ADMIN JWT

      // ========================================



      let decoded;



      try {

        decoded = jwt.verify(
          token,
          process.env.JWT_SECRET
        );

      } catch (error) {

        console.log(
          "❌ Invalid or expired admin token"
        );

        return next(
          new Error(
            "Invalid or expired admin login"
          )
        );

      }



      console.log(
        "✅ Admin JWT authenticated"
      );

      console.log(
        "Admin User ID:",
        decoded.userId
      );

      console.log(
        "Admin Restaurant ID:",
        decoded.restaurantId
      );



      // ========================================

      // ONLY ADMIN CAN CONNECT PRINTER AGENT

      // ========================================



      if (decoded.role !== "admin") {

        console.log(
          "❌ Printer Agent login requires admin role"
        );

        return next(
          new Error(
            "Only restaurant admin can connect printer agent"
          )
        );

      }



      if (!decoded.restaurantId) {

        console.log(
          "❌ JWT does not contain restaurantId"
        );

        return next(
          new Error(
            "Restaurant information missing from login"
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

      // VERIFY SAME RESTAURANT

      // ========================================



      if (
        String(device.restaurantId) !==
        String(decoded.restaurantId)
      ) {

        console.log(
          "❌ RESTAURANT MISMATCH"
        );

        console.log(
          "Admin Restaurant:",
          decoded.restaurantId
        );

        console.log(
          "Device Restaurant:",
          device.restaurantId
        );

        return next(
          new Error(
            "Printer device belongs to another restaurant"
          )
        );

      }



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
        decoded.restaurantId
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

        userId: decoded.userId,

        role: decoded.role,

        restaurantId: decoded.restaurantId,

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



    // ========================================

    // JOB PRINTED

    // ========================================



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



          console.log(

            "✅ Printer successfully printed job:",

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

                status: "PRINTED",

                printedAt: new Date(),

                error: {

                  code: null,

                  message: null,

                },

              },

            }

          );



          console.log(

            "🟢 Print job marked PRINTED:",

            jobId

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