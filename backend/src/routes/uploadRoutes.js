import express from "express";
import multer from "multer";

import cloudinary from "../config/cloudinary.js";

const router = express.Router();

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

router.post("/food-image", (req, res) => {
  upload.single("image")(req, res, async (error) => {
    // Multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message:
            "Image is too large. Maximum allowed size is 10 MB.",
        });
      }

      return res.status(400).json({
        message: error.message,
      });
    }

    // Custom file filter errors
    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    // No file
    if (!req.file) {
      return res.status(400).json({
        message: "No image selected.",
      });
    }

    try {
      const uploadResult = await new Promise(
        (resolve, reject) => {
          const uploadStream =
            cloudinary.uploader.upload_stream(
              {
                folder: "dineflow/food",
                resource_type: "image",
              },
              (uploadError, result) => {
                if (uploadError) {
                  reject(uploadError);
                } else {
                  resolve(result);
                }
              }
            );

          uploadStream.end(req.file.buffer);
        }
      );

      return res.status(201).json({
        message: "Image uploaded successfully",
        imageUrl: uploadResult.secure_url,
      });
    } catch (uploadError) {
      console.error(
        "Cloudinary upload failed:",
        uploadError.message
      );

      return res.status(500).json({
        message: "Failed to upload image.",
      });
    }
  });
});

export default router;