import { randomUUID } from "node:crypto";
import cloudinary from "../config/cloudinary.js";
import Message from "../models/Message.js";
import {
  createChatError,
  getConversationAccess,
  validateChatId,
} from "./chatAccessService.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateChatImageFiles(files) {
  if (files.length > 4) throw createChatError(400, "Select at most 4 images");

  for (const file of files) {
    const isPng = file.buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = file.buffer
      .subarray(0, 3)
      .equals(Buffer.from([255, 216, 255]));
    const matchesType =
      (isPng && file.mimetype === "image/png") ||
      (isJpeg && file.mimetype === "image/jpeg");

    if (!matchesType)
      throw createChatError(400, "File contents must be JPG or PNG images");
    if (file.size > MAX_IMAGE_BYTES)
      throw createChatError(413, "Each image must be 5MB or smaller");
  }
}

export async function deleteChatImages(images) {
  const results = await Promise.allSettled(
    images.map((image) =>
      cloudinary.uploader.destroy(image.publicId, {
        resource_type: "image",
        type: "authenticated",
        invalidate: true,
      }),
    ),
  );

  for (const result of results) {
    if (result.status === "rejected")
      console.error("Chat image cleanup failed");
  }
}

export async function storeChatImages(conversationId, files) {
  if (!files.length) return [];

  const config = cloudinary.config();
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    throw createChatError(503, "Cloudinary is not configured");
  }

  const images = [];

  try {
    for (const file of files) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: `task-manager/chat/${conversationId}/${randomUUID()}`,
            resource_type: "image",
            type: "authenticated",
            allowed_formats: ["jpg", "png"],
            overwrite: false,
            timeout: 60000,
          },
          (error, uploaded) => (error ? reject(error) : resolve(uploaded)),
        );

        stream.end(file.buffer);
      });

      images.push({
        publicId: result.public_id,
        format: result.format,
        originalName:
          file.originalname.replace(/[\r\n/\\]/g, "_").slice(0, 100) || "image",
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      });
    }

    return images;
  } catch {
    await deleteChatImages(images);
    throw createChatError(502, "Image upload failed. Please try again.");
  }
}

export async function getChatImage(
  conversationId,
  messageId,
  imageId,
  viewerId,
) {
  validateChatId(messageId);
  validateChatId(imageId);
  await getConversationAccess(conversationId, viewerId);

  const message = await Message.findOne({ _id: messageId, conversationId });
  const image = message?.images.id(imageId);
  if (!image) throw createChatError(404, "Image not found");

  const url = cloudinary.url(image.publicId, {
    resource_type: "image",
    type: "authenticated",
    sign_url: true,
    secure: true,
    format: image.format,
  });

  let data;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (
      !response.ok ||
      Number(response.headers.get("content-length")) > MAX_IMAGE_BYTES
    )
      throw new Error();
    data = Buffer.from(await response.arrayBuffer());
    if (data.length > MAX_IMAGE_BYTES) throw new Error();
  } catch {
    throw createChatError(502, "Image unavailable. Please try again.");
  }

  // A reassignment during the upstream download must also revoke this request.
  await getConversationAccess(conversationId, viewerId);
  return {
    data,
    contentType: image.format === "png" ? "image/png" : "image/jpeg",
  };
}
