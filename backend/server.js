import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { attachChatServer } from "./realtime/socketServer.js";
import Conversation from "./models/Conversation.js";
import ConversationMember from "./models/ConversationMember.js";
import Message from "./models/Message.js";

// Create the same Express application for the server and API tests.
export function createApp() {
  const app = express();
  const origins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim());

  app.use(
    cors({
      origin: origins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(express.json({ limit: "32kb" }));

  // API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/chat", chatRoutes);

  app.get("/", (req, res) => {
    res.json({ message: "Task Manager API is running" });
  });

  return app;
}

const app = createApp();
export default app;

// Local development server: REST and Socket.IO share one HTTP server.
if (process.env.NODE_ENV !== "test") {
  const ready = connectDB();
  if (!process.env.VERCEL) {
    await ready;
    await Promise.all([
      Conversation.init(),
      ConversationMember.init(),
      Message.init(),
    ]);
    const server = createServer(app);
    await attachChatServer(server);
    const port = process.env.PORT || 8000;
    server.listen(port, () => console.log(`Server is running on port ${port}`));
  }
}
