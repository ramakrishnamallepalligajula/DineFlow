import express from "express";
import crypto from "crypto";

import Table from "../models/Table.js";

import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();


/*
  GET TABLE BY TABLE ID
  PUBLIC
*/
router.get(
  "/public/:tableId",
  async (req, res) => {
    try {
      const table = await Table.findOne({
        tableId: req.params.tableId,
      }).select(
        "tableId tableNumber restaurantId status"
      );

      if (!table) {
        return res.status(404).json({
          message: "Table not found",
        });
      }

      if (table.status === "Inactive") {
        return res.status(400).json({
          message: "This table is currently inactive",
        });
      }

      res.json({
        table: {
          tableId: table.tableId,
          tableNumber: table.tableNumber,
          restaurantId: table.restaurantId,
        },
      });
    } catch (error) {
      console.error(
        "❌ Failed to fetch public table:",
        error
      );

      res.status(500).json({
        message: "Failed to fetch table",
      });
    }
  }
);


/*
  GET ALL TABLES
  ADMIN ONLY
*/
router.get(
  "/",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      if (!req.user.restaurantId) {
        return res.status(400).json({
          message: "User is not linked to a restaurant",
        });
      }

      const tables = await Table.find({
        restaurantId: req.user.restaurantId,
        status: { $ne: "Inactive" },
      }).sort({
        tableNumber: 1,
      });

      res.json({
        tables,
      });
    } catch (error) {
      console.error(
        "❌ Failed to fetch tables:",
        error
      );

      res.status(500).json({
        message: "Failed to fetch tables",
      });
    }
  }
);


/*
  CREATE TABLE
  ADMIN ONLY
*/
router.post(
  "/",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { tableNumber } = req.body;

      if (
        tableNumber === undefined ||
        tableNumber === null ||
        tableNumber === ""
      ) {
        return res.status(400).json({
          message: "Table number is required",
        });
      }

      const parsedTableNumber = Number(tableNumber);

      if (
        !Number.isInteger(parsedTableNumber) ||
        parsedTableNumber < 1
      ) {
        return res.status(400).json({
          message:
            "Table number must be a positive integer",
        });
      }

      if (!req.user.restaurantId) {
        return res.status(400).json({
          message:
            "User is not linked to a restaurant",
        });
      }

      const restaurantId = req.user.restaurantId;

      const existingTable = await Table.findOne({
        restaurantId,
        tableNumber: parsedTableNumber,
      });

      if (existingTable) {
        return res.status(400).json({
          message:
            `Table ${parsedTableNumber} already exists in your restaurant`,
        });
      }

      const tableId = `table-${crypto.randomUUID()}`;

      const table = await Table.create({
        restaurantId,
        tableNumber: parsedTableNumber,
        tableId,
        status: "Available",
      });

      res.status(201).json({
        message: "Table created successfully",
        table,
      });
    } catch (error) {
      console.error(
        "❌ Failed to create table:",
        error
      );

      if (error.code === 11000) {
        return res.status(409).json({
          message:
            "This table number already exists in your restaurant",
        });
      }

      res.status(500).json({
        message: "Failed to create table",
        error: error.message,
      });
    }
  }
);


/*
  UPDATE TABLE STATUS
  ADMIN ONLY
*/
router.put(
  "/:id/status",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!req.user.restaurantId) {
        return res.status(400).json({
          message:
            "User is not linked to a restaurant",
        });
      }

      const table = await Table.findOneAndUpdate(
        {
          _id: req.params.id,
          restaurantId: req.user.restaurantId,
        },
        {
          status,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!table) {
        return res.status(404).json({
          message: "Table not found",
        });
      }

      res.json({
        message: "Table status updated",
        table,
      });
    } catch (error) {
      console.error(
        "❌ Failed to update table status:",
        error
      );

      res.status(500).json({
        message: "Failed to update table status",
        error: error.message,
      });
    }
  }
);


/*
  REMOVE TABLE
  ADMIN ONLY

  Soft delete:
  We mark the table as Inactive instead of
  physically deleting it.
*/
console.log("🔥 DELETE TABLE ROUTE REGISTERED");
router.delete(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    console.log(
      "🗑 DELETE TABLE REQUEST:",
      req.params.id
    );

    try {
      if (!req.user.restaurantId) {
        return res.status(400).json({
          message:
            "User is not linked to a restaurant",
        });
      }

      const table = await Table.findOneAndUpdate(
        {
          _id: req.params.id,
          restaurantId: req.user.restaurantId,
        },
        {
          status: "Inactive",
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!table) {
        return res.status(404).json({
          message: "Table not found",
        });
      }

      return res.json({
        message: "Table removed successfully",
        table,
      });
    } catch (error) {
      console.error(
        "❌ Failed to remove table:",
        error
      );

      return res.status(500).json({
        message: "Failed to remove table",
      });
    }
  }
);


export default router;