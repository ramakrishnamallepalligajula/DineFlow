
import express from "express";
import multer from "multer";

import cloudinary from "../config/cloudinary.js";
import Restaurant from "../models/Restaurant.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

// ==========================================
// MULTER CONFIGURATION
// ==========================================

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, JPEG, PNG, WEBP and GIF images are allowed."
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// ==========================================
// CLOUDINARY UPLOAD HELPER
// ==========================================

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });
}

// ==========================================
// MULTER ERROR HANDLER
// ==========================================

function handleUpload(req, res, next, fieldName) {
  upload.single(fieldName)(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "Image is too large. Maximum allowed size is 10 MB.",
        });
      }

      return res.status(400).json({
        message: error.message,
      });
    }

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    next();
  });
}

// ==========================================
// FOOD IMAGE UPLOAD
// EXISTING FUNCTIONALITY
// ==========================================

router.post("/food-image", (req, res, next) => {
  handleUpload(req, res, next, "image");
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "No image selected.",
    });
  }

  try {
    const uploadResult = await uploadToCloudinary(
      req.file.buffer,
      {
        folder: "dineflow/food",
        resource_type: "image",
      }
    );

    return res.status(201).json({
      message: "Image uploaded successfully",
      imageUrl: uploadResult.secure_url,
    });
  } catch (error) {
    console.error(
      "Cloudinary food image upload failed:",
      error.message
    );

    return res.status(500).json({
      message: "Failed to upload image.",
    });
  }
});

// ==========================================
// RESTAURANT LOGO UPLOAD
// ADMIN ONLY
// ==========================================

router.post(
  "/restaurant-logo",
  authMiddleware,
  requireRole("admin"),
  (req, res, next) => {
    handleUpload(req, res, next, "logo");
  },
  async (req, res) => {
    try {
      if (!req.user.restaurantId) {
        return res.status(400).json({
          message: "Restaurant not linked to this account.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Please select a restaurant logo.",
        });
      }

      const restaurant = await Restaurant.findOne({
        _id: req.user.restaurantId,
        owner: req.user.userId,
      });

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found.",
        });
      }

      // Upload optimized logo to Cloudinary.
      const uploaded = await uploadToCloudinary(
        req.file.buffer,
        {
          folder: "dineflow/restaurant-logos",
          resource_type: "image",
          transformation: [
            {
              width: 576,
              height: 240,
              crop: "limit",
              background: "white",
              quality: "auto",
              fetch_format: "png",
            },
          ],
        }
      );

      const previousPublicId =
        restaurant.logo?.publicId || "";

      // Save the new logo.
      restaurant.logo = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      };

      await restaurant.save();

      // Delete the previous logo only after the new
      // logo has been successfully saved.
      if (
        previousPublicId &&
        previousPublicId !== uploaded.public_id
      ) {
        try {
          await cloudinary.uploader.destroy(previousPublicId);
        } catch (deleteError) {
          console.error(
            "Previous restaurant logo cleanup failed:",
            deleteError.message
          );
        }
      }

      return res.status(200).json({
        message: "Restaurant logo uploaded successfully.",
        logo: restaurant.logo,
      });
    } catch (error) {
      console.error(
        "Restaurant logo upload failed:",
        error.message
      );

      return res.status(500).json({
        message: "Failed to upload restaurant logo.",
      });
    }
  }
);

export default router;
