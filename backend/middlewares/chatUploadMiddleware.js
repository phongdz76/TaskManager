import multer from "multer";
import { getConversationAccess } from "../services/chatAccessService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 4, fields: 3, fieldSize: 16000 },
  fileFilter: (req, file, callback) => {
    if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
      const error = new Error("Only JPG and PNG images are allowed");
      error.status = 400;
      callback(error);
      return;
    }

    callback(null, true);
  },
}).array("images", 4);

// Check access before buffering files. Cloudinary upload happens only after
// validating all fields, files and the message being replied to.
export const uploadChatImages = async (req, res, next) => {
  try {
    await getConversationAccess(req.params.id, req.user._id);
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({
        message: error.status ? error.message : "Chat service unavailable",
      });
  }

  upload(req, res, (error) => {
    if (!error) return next();

    const isTooLarge = error.code === "LIMIT_FILE_SIZE";
    res.status(isTooLarge ? 413 : 400).json({
      message: isTooLarge
        ? "Each image must be 5MB or smaller"
        : error.status
          ? error.message
          : "Select at most 4 JPG or PNG images",
    });
  });
};
