import express from "express";
import {
  forgotPassword,
  getUserProfile,
  googleCallback,
  googleLogin,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  updateUserProfile,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// Auth Routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);

router.post(
  "/upload-image",
  protect,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      // Cloudinary returns the public URL in req.file.path
      const imageUrl = req.file.path;

      // Save URL to user's profileImageUrl in DB
      req.user.profileImageUrl = imageUrl;
      await req.user.save();

      res.status(200).json({ message: "File uploaded successfully", imageUrl });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

// Google OAuth Routes
router.get("/google", googleLogin);
router.get("/callback/google", googleCallback);

export default router;
