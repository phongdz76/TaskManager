import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { beforeAll, afterEach, afterAll } from "vitest";

let mongoServer;

beforeAll(async () => {
  // Set test environment variables
  process.env.JWT_SECRET = "test-jwt-secret-key-for-testing";
  process.env.ADMIN_INVITE_TOKEN = "test-admin-invite-token";
  process.env.CLIENT_URL = "http://localhost:5173";
  process.env.EMAIL_USER = "test@example.com";
  process.env.EMAIL_PASS = "test-password";

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Disconnect any existing connection first
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri);
});

afterEach(async () => {
  // Clear all collections between tests for isolation
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});
