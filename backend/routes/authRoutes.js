import express from "express";
import {
  forgotPassword,
  getUserProfile,
  googleCallback,
  googleLogin,
  loginUser,
  registerUser,
  resetPassword,
  updateUserProfile,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// Auth Routes
router.post("/register", registerUser); // Registration route (open to all)
router.post("/login", loginUser); // Login route (open to all)
router.post("/forgot-password", forgotPassword); // Forgot password route (open to all)
router.post("/reset-password", resetPassword); // Reset password route (open to all, but requires token)
router.get("/profile", protect, getUserProfile); // Get user profile route (requires authentication)
router.put("/profile", protect, updateUserProfile); // Update user profile route (requires authentication)

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
); // Route to upload profile image (requires authentication)

// Google OAuth Routes
router.get("/google", googleLogin); // Route to initiate Google OAuth login
router.get("/callback/google", googleCallback); // Route to handle Google OAuth callback

export default router;
