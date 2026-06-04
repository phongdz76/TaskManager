import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// Generic upload route for any image (Attachments, Chat, etc.)
router.post("/image", protect, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    // Cloudinary returns the public URL in req.file.path
    const imageUrl = req.file.path;
    
    res.status(200).json({ 
      message: "File uploaded successfully", 
      imageUrl: imageUrl 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
