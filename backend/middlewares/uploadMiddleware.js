import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "task-manager", // Folder name on Cloudinary
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 800, crop: "limit" }], // Optional: resize on upload
  },
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpeg, .png, and .jpg files are allowed!"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

export default upload;
