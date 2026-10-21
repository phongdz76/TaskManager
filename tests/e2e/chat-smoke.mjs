import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { chromium } from "playwright-core";
import mongoose from "../../backend/node_modules/mongoose/index.js";
import jwt from "../../backend/node_modules/jsonwebtoken/index.js";
import dotenv from "../../backend/node_modules/dotenv/lib/main.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const frontendDirectory = path.join(root, "frontend/Task-Manager");
const outputDirectory = path.join(root, ".cache/chat-smoke");
const browserPath = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
]
  .filter(Boolean)
  .find((candidate) => fs.existsSync(candidate));

assert.ok(
  browserPath,
  "Set CHROME_PATH to an installed Chrome/Edge executable",
);
fs.mkdirSync(outputDirectory, { recursive: true });

let database, server, socketServer, vite, browser;
let cloudinaryClient;
const useCloudinary = process.env.CHAT_SMOKE_CLOUDINARY === "true";
const errors = [];
const frontendAddress = "http://127.0.0.1:5174";
const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

try {
  // Always use an isolated replica set; never read the application's database.
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "chat-smoke-test-secret";
  process.env.CLIENT_URL = frontendAddress;
  if (useCloudinary) {
    const envPath = path.join(root, "backend/.env");
    const configured = fs.existsSync(envPath)
      ? dotenv.parse(fs.readFileSync(envPath))
      : {};
    for (const name of [
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ]) {
      process.env[name] ||= configured[name];
      assert.ok(process.env[name], `Cloudinary smoke test requires ${name}`);
    }
  }
  database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(database.getUri());

  const { createApp } = await import("../../backend/server.js");
  const { attachChatServer } = await import(
    "../../backend/realtime/socketServer.js"
  );
  const { default: User } = await import("../../backend/models/User.js");
  const { default: Task } = await import("../../backend/models/Task.js");
  const { default: Conversation } = await import(
    "../../backend/models/Conversation.js"
  );
  const { default: ConversationMember } = await import(
    "../../backend/models/ConversationMember.js"
  );
  const { default: Message } = await import("../../backend/models/Message.js");
  if (useCloudinary) {
    cloudinaryClient = (await import("../../backend/config/cloudinary.js"))
      .default;
  }
  await Promise.all([
    Conversation.init(),
    ConversationMember.init(),
    Message.init(),
  ]);

  const [alice, bob] = await User.create([
    { username: "Alice", email: "alice@chat-smoke.test" },
    { username: "Bob", email: "bob@chat-smoke.test" },
  ]);
  const task = await Task.create({
    title: "Chat integration task",
    createdBy: alice.id,
    assignedTo: [bob.id],
  });

  server = createServer(createApp());
  socketServer = await attachChatServer(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const backendAddress = `http://127.0.0.1:${server.address().port}`;

  vite = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "5174",
      "--strictPort",
    ],
    {
      cwd: frontendDirectory,
      env: {
        ...process.env,
        VITE_API_BASE_URL: backendAddress,
        VITE_CHAT_SOCKET_URL: backendAddress,
        VITE_CHAT_REALTIME: "true",
      },
      windowsHide: true,
      stdio: "pipe",
    },
  );
  let viteOutput = "";
  vite.stdout.on("data", (data) => {
    viteOutput += data;
  });
  vite.stderr.on("data", (data) => {
    viteOutput += data;
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (vite.exitCode !== null)
      throw new Error(`Frontend failed: ${viteOutput}`);
    try {
      if ((await fetch(frontendAddress)).ok) break;
    } catch {}
    if (attempt === 99) throw new Error("Frontend did not start");
    await wait(100);
  }

  browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
  });

  const createSession = async (user) => {
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
    });
    context.setDefaultTimeout(15000);
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    await context.addInitScript(
      ({ accessToken, origin }) => {
        if (location.origin === origin) {
          localStorage.setItem("token", accessToken);
        }
      },
      { accessToken: token, origin: frontendAddress },
    );
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    return { context, page, token };
  };

  const aliceSession = await createSession(alice);
  const bobSession = await createSession(bob);
  const alicePage = aliceSession.page;
  const bobPage = bobSession.page;
  const thread = (page) =>
    page.locator('section[aria-label="Cuộc trò chuyện"]');
  const sendText = async (page, text) => {
    await thread(page)
      .getByRole("textbox", { name: "Tin nhắn", exact: true })
      .fill(text);
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith("/messages") &&
        response.request().method() === "POST",
    );
    await thread(page)
      .getByRole("button", { name: "Gửi tin nhắn", exact: true })
      .click();
    assert.ok(
      (await saved).ok(),
      "Message must be saved before checking delivery",
    );
  };

  await Promise.all([
    alicePage.goto(`${frontendAddress}/user/chat`),
    bobPage.goto(`${frontendAddress}/user/chat`),
  ]);
  await alicePage
    .getByRole("button", { name: "Cuộc trò chuyện mới", exact: true })
    .click();
  await alicePage
    .getByRole("dialog")
    .getByRole("button", { name: /Bob/ })
    .click();
  await sendText(alicePage, "Hello Bob from the chat page");
  await bobPage
    .getByRole("button", { name: "Mở hội thoại Alice", exact: true })
    .click();
  await thread(bobPage)
    .getByText("Hello Bob from the chat page", { exact: true })
    .waitFor();
  await sendText(bobPage, "Hello Alice, received in realtime");
  await thread(alicePage)
    .getByText("Hello Alice, received in realtime", { exact: true })
    .waitFor();
  const directId = new URL(alicePage.url()).searchParams.get("conversation");
  await alicePage.reload();
  await thread(alicePage)
    .getByText("Hello Alice, received in realtime", { exact: true })
    .waitFor();
  console.log("PASS: two accounts exchange direct messages and reload history");

  await thread(alicePage)
    .getByRole("button", {
      name: "Trả lời tin nhắn: Hello Alice, received in realtime",
      exact: true,
    })
    .dblclick();
  await thread(alicePage)
    .getByText("Đang trả lời Bob", { exact: true })
    .waitFor();
  await sendText(alicePage, "Reply to Bob's previous message");
  await thread(bobPage)
    .locator("blockquote")
    .getByText("Hello Alice, received in realtime", { exact: true })
    .waitFor();
  const replyRecord = await Message.findOne({
    text: "Reply to Bob's previous message",
  });
  assert.ok(replyRecord.replyToMessageId);
  console.log("PASS: double-clicking a text bubble creates a persistent reply");

  if (useCloudinary) {
    const imageBuffer = fs.readFileSync(
      path.join(frontendDirectory, "public/iconweb.png"),
    );
    await thread(alicePage)
      .getByLabel("Chọn ảnh để gửi")
      .setInputFiles({
        name: "chat-smoke.png",
        mimeType: "image/png",
        buffer: imageBuffer,
      });
    const uploaded = alicePage.waitForResponse(
      (response) =>
        response.url().endsWith("/messages") &&
        response.request().method() === "POST",
      { timeout: 90000 },
    );
    await thread(alicePage)
      .getByRole("button", { name: "Gửi tin nhắn", exact: true })
      .click();
    const uploadResponse = await uploaded;
    assert.equal(
      uploadResponse.status(),
      201,
      "Real Cloudinary upload must succeed",
    );
    const uploadedMessage = await uploadResponse.json();
    assert.equal(uploadedMessage.type, "image");
    const image = thread(bobPage).getByRole("img", {
      name: "chat-smoke.png",
      exact: true,
    });
    await image.waitFor();
    await bobPage.waitForFunction(() =>
      [...document.images].some(
        (item) =>
          item.alt === "chat-smoke.png" &&
          item.complete &&
          item.naturalWidth > 0,
      ),
    );
    const stored = await Message.findById(uploadedMessage.id);
    assert.ok(stored.images[0].publicId.startsWith("task-manager/chat/"));
    console.log(
      "PASS: an image is uploaded to real Cloudinary and displayed to the other account",
    );
  }

  await alicePage.goto(`${frontendAddress}/user/task-details/${task.id}`);
  await alicePage
    .getByRole("button", { name: "Mở thảo luận", exact: true })
    .click();
  await sendText(alicePage, "Task discussion shared with Bob");
  await bobPage
    .getByRole("button", { name: `Mở hội thoại ${task.title}`, exact: true })
    .click();
  await thread(bobPage)
    .getByText("Task discussion shared with Bob", { exact: true })
    .waitFor();
  await sendText(bobPage, "Task reply from Bob");
  await thread(alicePage)
    .getByText("Task reply from Bob", { exact: true })
    .waitFor();
  console.log("PASS: task discussion and full chat share the same history");

  await alicePage
    .getByRole("button", { name: "Chat nhanh", exact: true })
    .click();
  await alicePage
    .getByRole("region", { name: "Danh sách chat nhanh", exact: true })
    .getByRole("button", { name: "Mở hội thoại Bob", exact: true })
    .click();
  const popup = alicePage.getByRole("region", {
    name: "Chat nhanh: Bob",
    exact: true,
  });
  await popup
    .getByRole("textbox", { name: "Tin nhắn", exact: true })
    .fill("Draft kept across routes");
  await popup
    .getByRole("button", { name: "Thu nhỏ cửa sổ Bob", exact: true })
    .click();
  const minimizedMessage = await fetch(
    `${backendAddress}/api/chat/conversations/${directId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bobSession.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Unread while popup minimized",
        clientMessageId: "minimized-message",
      }),
    },
  );
  assert.equal(minimizedMessage.status, 201);
  const minimizedSaved = await minimizedMessage.json();
  await alicePage
    .locator('#chat-launcher [aria-label="1 tin chưa đọc"]')
    .waitFor();
  const member = await ConversationMember.findOne({
    conversationId: directId,
    userId: alice.id,
  });
  assert.ok(
    member.lastReadSequence < minimizedSaved.sequence,
    "Minimized chat must not mark new messages read",
  );
  await popup
    .getByRole("button", { name: "Khôi phục cửa sổ Bob", exact: true })
    .click();
  await alicePage
    .getByRole("button", { name: "Dashboard", exact: true })
    .click();
  assert.equal(
    await popup
      .getByRole("textbox", { name: "Tin nhắn", exact: true })
      .inputValue(),
    "Draft kept across routes",
  );
  await popup
    .getByRole("button", { name: "Mở toàn màn hình Bob", exact: true })
    .click();
  assert.equal(
    await thread(alicePage)
      .getByRole("textbox", { name: "Tin nhắn", exact: true })
      .inputValue(),
    "Draft kept across routes",
  );
  await sendText(alicePage, "Sent once after expanding popup");
  assert.equal(
    await Message.countDocuments({
      conversationId: directId,
      text: "Sent once after expanding popup",
    }),
    1,
  );
  await alicePage.screenshot({
    path: path.join(outputDirectory, "desktop-chat.png"),
  });
  console.log(
    "PASS: floating chat persists across routes, shares drafts and sends once",
  );

  await aliceSession.context.setOffline(true);
  await thread(alicePage)
    .getByRole("textbox", { name: "Tin nhắn", exact: true })
    .fill("Retry after offline");
  await thread(alicePage)
    .getByRole("button", { name: "Gửi tin nhắn", exact: true })
    .click();
  await thread(alicePage).getByText("Gửi thất bại", { exact: true }).waitFor();
  await aliceSession.context.setOffline(false);
  const retried = alicePage.waitForResponse(
    (response) =>
      response.url().endsWith("/messages") &&
      response.request().method() === "POST",
  );
  await thread(alicePage)
    .getByRole("button", { name: "Thử lại", exact: true })
    .click();
  assert.ok((await retried).ok());
  assert.equal(
    await Message.countDocuments({
      conversationId: directId,
      text: "Retry after offline",
    }),
    1,
  );

  await aliceSession.context.setOffline(true);
  const missed = await fetch(
    `${backendAddress}/api/chat/conversations/${directId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bobSession.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Message sent while Alice was offline",
        clientMessageId: "missed-message",
      }),
    },
  );
  assert.equal(missed.status, 201);
  await aliceSession.context.setOffline(false);
  await thread(alicePage)
    .getByText("Message sent while Alice was offline", { exact: true })
    .waitFor();
  console.log(
    "PASS: offline retry is idempotent and reconnect restores missed messages",
  );

  await alicePage.setViewportSize({ width: 390, height: 844 });
  await alicePage
    .getByRole("button", { name: "Quay lại hội thoại", exact: true })
    .click();
  await alicePage
    .getByRole("button", { name: "Mở hội thoại Bob", exact: true })
    .click();
  await thread(alicePage)
    .getByRole("textbox", { name: "Tin nhắn", exact: true })
    .waitFor();
  assert.equal(
    await alicePage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await alicePage.evaluate(() =>
    document.documentElement.classList.add("dark"),
  );
  await alicePage.screenshot({
    path: path.join(outputDirectory, "mobile-chat-dark.png"),
    animations: "disabled",
  });
  console.log(
    "PASS: mobile conversation navigation and dark mode have no horizontal overflow",
  );

  await bobPage
    .getByRole("button", { name: "Chat nhanh", exact: true })
    .click();
  await bobPage
    .getByRole("region", { name: "Danh sách chat nhanh", exact: true })
    .getByRole("button", { name: "Mở hội thoại Alice", exact: true })
    .click();
  // Revoke Bob's access to the task currently shown in the main chat view.
  const response = await fetch(`${backendAddress}/api/tasks/${task.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${aliceSession.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assignedTo: [alice.id] }),
  });
  assert.equal(response.status, 200);
  await bobPage
    .getByRole("alert")
    .filter({ hasText: "không còn quyền" })
    .waitFor();
  console.log("PASS: a connected user's task chat closes on access revocation");

  const restored = await fetch(`${backendAddress}/api/tasks/${task.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${aliceSession.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assignedTo: [bob.id] }),
  });
  assert.equal(restored.status, 200);
  await thread(bobPage)
    .filter({
      has: bobPage.getByRole("heading", { name: task.title, exact: true }),
    })
    .getByText("Task reply from Bob", { exact: true })
    .waitFor();
  console.log(
    "PASS: assigning a member again restores chat access and history",
  );

  assert.deepEqual(errors, [], `Browser errors: ${errors.join("; ")}`);
  console.log(`Chat smoke test passed. Screenshots: ${outputDirectory}`);
} catch (error) {
  if (browser) {
    for (const [index, page] of browser
      .contexts()
      .flatMap((context) => context.pages())
      .entries()) {
      await page
        .screenshot({
          path: path.join(outputDirectory, `failure-${index}.png`),
        })
        .catch(() => {});
    }
  }
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  vite?.kill();
  if (socketServer) await new Promise((resolve) => socketServer.close(resolve));
  if (cloudinaryClient && mongoose.connection.readyState === 1) {
    const Message = mongoose.model("Message");
    const messages = await Message.find({ "images.0": { $exists: true } });
    for (const image of messages.flatMap((message) => message.images)) {
      if (image.publicId.startsWith("task-manager/chat/")) {
        await cloudinaryClient.uploader.destroy(image.publicId, {
          type: "authenticated",
          resource_type: "image",
          invalidate: true,
        });
      }
    }
    console.log("Cloudinary smoke-test images cleaned up");
  }
  await mongoose.disconnect();
  await database?.stop();
}
