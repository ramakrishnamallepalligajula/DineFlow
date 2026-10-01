import express from "express";
import ExcelJS from "exceljs";

import Order from "../models/Order.js";

import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();


/* =========================================================
   SALES REPORT
========================================================= */

router.get(
  "/sales",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const restaurantId = req.user.restaurantId;

      /* =========================
         ONLY THIS RESTAURANT
      ========================= */

      const orders = await Order.find({
        restaurantId,
      })
        .sort({ createdAt: -1 })
        .lean();


      /* =========================
         EXCEL WORKBOOK
      ========================= */

      const workbook = new ExcelJS.Workbook();

      const worksheet =
        workbook.addWorksheet("Sales Report");


      /* =========================
         COLUMNS
      ========================= */

      worksheet.columns = [
        {
          header: "Order ID",
          key: "orderId",
          width: 15,
        },
        {
          header: "Table",
          key: "tableNumber",
          width: 12,
        },
        {
          header: "Items",
          key: "items",
          width: 40,
        },
        {
          header: "Total Items",
          key: "totalItems",
          width: 15,
        },
        {
          header: "Total Price",
          key: "totalPrice",
          width: 15,
        },
        {
          header: "Status",
          key: "status",
          width: 20,
        },
        {
          header: "Date",
          key: "date",
          width: 22,
        },
      ];


      /* =========================
         ADD ORDERS
      ========================= */

      for (const order of orders) {
        worksheet.addRow({
          orderId: order.orderId,

          tableNumber:
            order.tableNumber,

          items: order.items
            .map(
              (item) =>
                `${item.name} x${item.quantity}`
            )
            .join(", "),

          totalItems:
            order.totalItems,

          totalPrice:
            order.totalPrice,

          status:
            order.status,

          date:
            new Date(
              order.createdAt
            ).toLocaleString(),
        });
      }


      /* =========================
         HEADER STYLE
      ========================= */

      worksheet.getRow(1).font = {
        bold: true,
      };


      worksheet.getRow(1).alignment = {
        vertical: "middle",
      };


      /* =========================
         RESPONSE
      ========================= */

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.setHeader(
        "Content-Disposition",
        'attachment; filename="sales-report.xlsx"'
      );

      await workbook.xlsx.write(res);

      res.end();

    } catch (error) {
      console.error(
        "Sales report error:",
        error
      );

      res.status(500).json({
        message: "Failed to generate sales report",
      });
    }
  }
);


export default router;