import { API_PATHS } from "./apiPaths";
import axiosInstance from "./axiosInstance";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);

export const validateImageFile = (imageFile) => {
  if (!imageFile) {
    throw new Error("Please select an image file");
  }

  if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
    throw new Error("Only JPG and PNG image files are allowed");
  }

  if (imageFile.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Image size must be 5MB or smaller");
  }
};

export default async function uploadImage(imageFile) {
  validateImageFile(imageFile);

  const formData = new FormData();
  formData.append("image", imageFile);

  try {
    const response = await axiosInstance.post(
      API_PATHS.IMAGES.UPLOAD_IMAGE,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}
