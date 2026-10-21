import { Server } from "socket.io";
import { createAdapter } from "@socket.io/mongo-adapter";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import { setChatIO } from "./chatEvents.js";

export async function attachChatServer(httpServer) {
  const origins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim());
  const io = new Server(httpServer, {
    cors: { origin: origins },
    maxHttpBufferSize: 16_384,
    allowRequest: (req, callback) =>
      callback(
        null,
        !req.headers.origin || origins.includes(req.headers.origin),
      ),
  });
  if (process.env.CHAT_SOCKET_ADAPTER === "mongo") {
    const name = "chatSocketEvents";
    try {
      await mongoose.connection.db.createCollection(name, {
        capped: true,
        size: 1_000_000,
      });
    } catch (error) {
      if (error.codeName !== "NamespaceExists") throw error;
    }
    io.adapter(createAdapter(mongoose.connection.db.collection(name)));
  }
  io.use(async (socket, next) => {
    try {
      const decoded = jwt.verify(
        socket.handshake.auth.token,
        process.env.JWT_SECRET,
      );
      if (!decoded.exp || !(await User.exists({ _id: decoded.id })))
        throw new Error();
      socket.data.userId = String(decoded.id);
      socket.data.expiresAt = decoded.exp * 1000;
      next();
    } catch {
      next(new Error("Not authorized, token failed"));
    }
  });
  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
    const expiry = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, socket.data.expiresAt - Date.now()),
    );
    expiry.unref?.();
    socket.once("disconnect", () => clearTimeout(expiry));
  });
  setChatIO(io);
  return io;
}
