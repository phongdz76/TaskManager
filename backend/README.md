# Task Manager — Backend API

REST API server cho ứng dụng quản lý công việc, xây dựng bằng **Node.js**, **Express 5**, và **MongoDB**.

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt](#cài-đặt)
- [Biến môi trường](#biến-môi-trường)
- [Khởi chạy server](#khởi-chạy-server)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Mô hình dữ liệu](#mô-hình-dữ-liệu)
- [API Reference](#api-reference)
  - [Auth](#auth-apiauthh)
  - [Users](#users-apiusers)
  - [Tasks](#tasks-apitasks)
  - [Reports](#reports-apireports)
- [Phân quyền](#phân-quyền)
- [Xác thực](#xác-thực)

---

## Tổng quan

Backend cung cấp các API để:

- Đăng ký, đăng nhập bằng email/mật khẩu hoặc Google OAuth
- Đặt lại mật khẩu qua email
- Quản lý người dùng (admin)
- Tạo, phân công, và theo dõi công việc (task)
- Theo dõi tiến độ qua checklist và trạng thái task
- Xuất báo cáo Excel cho task và người dùng

---

## Công nghệ sử dụng

| Thành phần      | Công nghệ                                |
| --------------- | ---------------------------------------- |
| Runtime         | Node.js (ES Modules)                     |
| Framework       | Express 5                                |
| Database        | MongoDB Atlas (Mongoose 9)               |
| Xác thực        | JWT (7 ngày) + Google OAuth 2.0 (tự xây) |
| Mã hoá mật khẩu | bcryptjs                                 |
| Upload ảnh      | Multer + Cloudinary                      |
| Gửi email       | Nodemailer (Gmail SMTP)                  |
| Xuất báo cáo    | ExcelJS (.xlsx)                          |

---

## Yêu cầu hệ thống

- Node.js >= 18
- Tài khoản [MongoDB Atlas](https://www.mongodb.com/atlas)
- Tài khoản [Cloudinary](https://cloudinary.com/)
- Tài khoản Gmail với **App Password** được bật
- (Tuỳ chọn) Google Cloud Console project để dùng Google OAuth

---

## Cài đặt

```bash
# 1. Clone repository
git clone <repo-url>
cd backend

# 2. Cài đặt dependencies
npm install

# 3. Tạo file .env từ template
cp .env.example .env
# Sau đó điền các giá trị vào file .env
```

---

## Biến môi trường

Sao chép file `.env.example` thành `.env` và điền đầy đủ:

```env
# MongoDB Atlas connection string
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>

# Port server lắng nghe
PORT=8000

# Khoá bí mật để ký JWT (đặt chuỗi ngẫu nhiên dài, phức tạp)
JWT_SECRET=your_super_secret_key

# Token mời để cấp quyền admin khi đăng ký (có thể bỏ trống nếu không dùng)
ADMIN_INVITE_TOKEN=your_admin_invite_token

# Google OAuth 2.0 (lấy từ Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/callback/google

# URL của frontend (dùng cho CORS và redirect sau OAuth)
CLIENT_URL=http://localhost:5173

# Cloudinary (lấy từ Dashboard > Settings > API Keys)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Gmail App Password (bật tại myaccount.google.com > Bảo mật > Mật khẩu ứng dụng)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

> **Lưu ý bảo mật:** File `.env` đã được thêm vào `.gitignore`, **không** commit file này lên Git.

---

## Khởi chạy server

```bash
# Môi trường production
npm start

# Môi trường development (tự động restart khi thay đổi file)
npm run dev
```

Server sẽ chạy tại `http://localhost:8000` (hoặc port trong `.env`).

---

## Cấu trúc thư mục

```
backend/
├── server.js              # Entry point, cấu hình Express và mount routes
├── .env.example           # Template biến môi trường
├── config/
│   ├── db.js              # Kết nối MongoDB
│   ├── cloudinary.js      # Cấu hình Cloudinary SDK
│   └── mailer.js          # Cấu hình Nodemailer + hàm gửi email
├── controllers/
│   ├── authController.js  # Đăng ký, đăng nhập, OAuth, đổi mật khẩu
│   ├── userController.js  # Quản lý người dùng (CRUD)
│   ├── taskController.js  # Quản lý công việc + dashboard
│   └── reportController.js# Xuất báo cáo Excel
├── middlewares/
│   ├── authMiddleware.js  # Xác thực JWT (protect) và kiểm tra quyền admin
│   └── uploadMiddleware.js# Multer + Cloudinary storage
├── models/
│   ├── User.js            # Schema người dùng
│   └── Task.js            # Schema công việc
└── routes/
    ├── authRoutes.js      # /api/auth/*
    ├── userRoutes.js      # /api/users/*
    ├── taskRoutes.js      # /api/tasks/*
    └── reportRoutes.js    # /api/reports/*
```

---

## Mô hình dữ liệu

### User

| Trường            | Kiểu   | Mô tả                                           |
| ----------------- | ------ | ----------------------------------------------- |
| `username`        | String | Tên hiển thị, bắt buộc                          |
| `email`           | String | Email duy nhất, bắt buộc                        |
| `password`        | String | Bcrypt hash; `null` với tài khoản Google        |
| `googleId`        | String | ID từ Google OAuth; `null` với tài khoản thường |
| `profileImageUrl` | String | URL ảnh đại diện (Cloudinary)                   |
| `role`            | String | `"user"` (mặc định) hoặc `"admin"`              |
| `createdAt`       | Date   | Tự động                                         |
| `updatedAt`       | Date   | Tự động                                         |

### Task

| Trường          | Kiểu                  | Mô tả                                                  |
| --------------- | --------------------- | ------------------------------------------------------ |
| `title`         | String                | Tiêu đề công việc, bắt buộc                            |
| `description`   | String                | Mô tả chi tiết                                         |
| `priority`      | String                | `"Low"` / `"Medium"` / `"High"` (mặc định: `"Medium"`) |
| `status`        | String                | `"Pending"` / `"In-Progress"` / `"Completed"`          |
| `dueDate`       | Date                  | Hạn hoàn thành                                         |
| `assignedTo`    | [ObjectId]            | Danh sách người được giao (ref: User)                  |
| `createdBy`     | ObjectId              | Admin tạo task (ref: User)                             |
| `attachments`   | [String]              | Danh sách URL file đính kèm                            |
| `todoChecklist` | [{ text, completed }] | Danh sách việc cần làm con                             |
| `progress`      | Number                | Phần trăm hoàn thành (0–100), tự tính từ checklist     |
| `createdAt`     | Date                  | Tự động                                                |
| `updatedAt`     | Date                  | Tự động                                                |

---

## API Reference

Tất cả response trả về JSON. Các route được bảo vệ yêu cầu header:

```
Authorization: Bearer <token>
```

---

### Auth `/api/auth`

#### `POST /api/auth/register` — Đăng ký

Tạo tài khoản mới với vai trò `user`.

**Body:**

```json
{
  "username": "Nguyen Van A",
  "email": "a@example.com",
  "password": "Password@123"
}
```

> Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, và ký tự đặc biệt.

**Response `201`:**

```json
{
  "token": "<jwt>",
  "user": {
    "_id": "...",
    "username": "Nguyen Van A",
    "email": "a@example.com",
    "role": "user",
    "profileImageUrl": null
  }
}
```

---

#### `POST /api/auth/login` — Đăng nhập

**Body:**

```json
{
  "email": "a@example.com",
  "password": "Password@123"
}
```

**Response `200`:**

```json
{
  "token": "<jwt>",
  "user": {
    "_id": "...",
    "username": "...",
    "email": "...",
    "role": "user",
    "profileImageUrl": null
  }
}
```

---

#### `POST /api/auth/forgot-password` — Quên mật khẩu

Gửi email chứa link đặt lại mật khẩu (hết hạn sau 15 phút).

**Body:**

```json
{ "email": "a@example.com" }
```

**Response `200`:**

```json
{ "message": "Password reset email sent" }
```

---

#### `POST /api/auth/reset-password` — Đặt lại mật khẩu

**Body:**

```json
{
  "token": "<reset-token-from-email>",
  "newPassword": "NewPassword@456"
}
```

**Response `200`:**

```json
{ "message": "Password reset successful" }
```

---

#### `GET /api/auth/profile` — Xem thông tin cá nhân `[Bảo vệ]`

**Response `200`:**

```json
{
  "_id": "...",
  "username": "...",
  "email": "...",
  "role": "user",
  "profileImageUrl": "https://..."
}
```

---

#### `PUT /api/auth/profile` — Cập nhật thông tin cá nhân `[Bảo vệ]`

**Body (tất cả tùy chọn):**

```json
{
  "username": "Tên mới",
  "email": "moi@example.com",
  "profileImageUrl": "https://...",
  "currentPassword": "Password@123",
  "newPassword": "NewPassword@456"
}
```

> Để đổi mật khẩu, bắt buộc phải truyền cả `currentPassword` và `newPassword`.

**Response `200`:**

```json
{ "user": { ... } }
```

---

#### `POST /api/auth/upload-image` — Upload ảnh đại diện `[Bảo vệ]`

**Content-Type:** `multipart/form-data`

| Field   | Kiểu | Mô tả                        |
| ------- | ---- | ---------------------------- |
| `image` | File | Ảnh JPG/JPEG/PNG, tối đa 5MB |

**Response `200`:**

```json
{
  "message": "File uploaded successfully",
  "imageUrl": "https://res.cloudinary.com/..."
}
```

---

#### `GET /api/auth/google` — Đăng nhập bằng Google

Chuyển hướng trình duyệt đến trang đồng ý của Google OAuth.

---

#### `GET /api/auth/callback/google` — Google OAuth Callback

Google redirect về đây sau khi người dùng đồng ý. Server tạo/tìm tài khoản rồi redirect về frontend kèm token:

```
<CLIENT_URL>/oauth-callback?token=<jwt>
```

---

### Users `/api/users`

> Tất cả route trong nhóm này đều yêu cầu xác thực. Các route có nhãn `[Admin]` chỉ admin mới gọi được.

---

#### `GET /api/users` — Danh sách người dùng `[Admin]`

Trả về tất cả tài khoản có `role: "user"`, kèm số task theo trạng thái.

**Response `200`:**

```json
[
  {
    "_id": "...",
    "username": "...",
    "email": "...",
    "profileImageUrl": null,
    "pendingTasks": 2,
    "inProgressTasks": 1,
    "completedTasks": 5
  }
]
```

---

#### `GET /api/users/admins` — Danh sách admin `[Admin]`

Trả về tất cả tài khoản có `role: "admin"`.

**Response `200`:** Mảng User object (không có password, không có googleId).

---

#### `GET /api/users/:id` — Chi tiết người dùng `[Bảo vệ]`

**Response `200`:** User object (không có password, không có googleId).

---

#### `PATCH /api/users/:id/role` — Cập nhật vai trò `[Admin]`

**Body:**

```json
{ "role": "admin" }
```

> Giá trị hợp lệ: `"user"` hoặc `"admin"`.

**Response `200`:**

```json
{ "message": "User role updated successfully", "user": { ... } }
```

---

#### `DELETE /api/users/:id` — Xoá người dùng `[Admin]`

Xoá người dùng và **toàn bộ task** được giao cho họ.

**Response `200`:**

```json
{ "message": "User deleted successfully" }
```

---

### Tasks `/api/tasks`

> Tất cả route yêu cầu xác thực. Các route nhãn `[Admin]` chỉ admin truy cập được.

---

#### `GET /api/tasks/dashboard-data` — Dashboard admin `[Admin]`

Thống kê tổng quan: số task theo trạng thái, phân bổ theo priority, 10 task gần nhất.

**Response `200`:**

```json
{
  "statistics": {
    "totalTasks": 20,
    "pendingTasks": 5,
    "inProgressTasks": 8,
    "completedTasks": 7
  },
  "charts": {
    "taskDistribution": { "Pending": 5, "In-Progress": 8, "Completed": 7 },
    "tasksByPriority": { "Low": 4, "Medium": 10, "High": 6 }
  },
  "recentTasks": [ ... ]
}
```

---

#### `GET /api/tasks/user-dashboard-data` — Dashboard người dùng `[Bảo vệ]`

Giống dashboard admin nhưng chỉ tính các task được giao cho người dùng hiện tại.

---

#### `GET /api/tasks` — Danh sách task `[Bảo vệ]`

- **Admin:** trả về tất cả task, populate `assignedTo`.
- **User:** trả về các task được giao cho mình.

Kèm trường `statusSummary` tổng số theo trạng thái.

**Response `200`:**

```json
{
  "tasks": [ ... ],
  "statusSummary": { "all": 10, "pendingTasks": 3, "inProgressTasks": 4, "completedTasks": 3 }
}
```

---

#### `GET /api/tasks/:id` — Chi tiết task `[Bảo vệ]`

Admin xem tất cả; user chỉ xem task của mình.

**Response `200`:** Task object đầy đủ với `assignedTo` được populate.

---

#### `POST /api/tasks` — Tạo task `[Admin]`

**Body:**

```json
{
  "title": "Tên công việc",
  "description": "Mô tả chi tiết",
  "priority": "High",
  "dueDate": "2026-04-01",
  "assignedTo": ["<userId1>", "<userId2>"],
  "attachments": ["https://..."],
  "todoChecklist": [{ "text": "Bước 1" }, { "text": "Bước 2" }]
}
```

| Trường          | Bắt buộc | Ghi chú                   |
| --------------- | -------- | ------------------------- |
| `title`         | Có       |                           |
| `description`   | Không    |                           |
| `priority`      | Không    | `Low` / `Medium` / `High` |
| `dueDate`       | Không    | ISO date string           |
| `assignedTo`    | Không    | Mảng User ID              |
| `attachments`   | Không    | Mảng URL                  |
| `todoChecklist` | Không    | Mảng `{ text: string }`   |

**Response `201`:** Task object vừa tạo.

---

#### `PUT /api/tasks/:id` — Cập nhật task `[Admin]`

Body tương tự `POST /api/tasks`, tất cả trường đều tùy chọn.

**Response `200`:** Task object sau khi cập nhật.

---

#### `DELETE /api/tasks/:id` — Xoá task `[Admin]`

**Response `200`:**

```json
{ "message": "Task deleted successfully" }
```

---

#### `PUT /api/tasks/:id/status` — Cập nhật trạng thái `[Bảo vệ]`

Admin hoặc người dùng được giao có thể cập nhật.

**Body:**

```json
{ "status": "In-Progress" }
```

> Khi chuyển sang `"Completed"`, toàn bộ mục trong `todoChecklist` sẽ được đánh dấu hoàn thành tự động.

**Response `200`:** Task object sau khi cập nhật.

---

#### `PUT /api/tasks/:id/todo` — Cập nhật checklist `[Bảo vệ]`

Admin hoặc người dùng được giao có thể cập nhật.

**Body:**

```json
{
  "todoChecklist": [
    { "text": "Bước 1", "completed": true },
    { "text": "Bước 2", "completed": false }
  ]
}
```

Server tự tính `progress` (%) và tự chuyển `status`:

- 0% → `"Pending"`
- 1–99% → `"In-Progress"`
- 100% → `"Completed"`

**Response `200`:** Task object sau khi cập nhật.

---

### Reports `/api/reports`

> Tất cả route yêu cầu **Admin**.

---

#### `GET /api/reports/export/tasks` — Xuất báo cáo task `[Admin]`

Tải về file Excel (`.xlsx`) chứa toàn bộ task.

**Các cột:** Task ID, Title, Description, Priority, Status, Assigned To, Due Date

---

#### `GET /api/reports/export/users` — Xuất báo cáo người dùng `[Admin]`

Tải về file Excel (`.xlsx`) chứa thống kê task của từng người dùng.

**Các cột:** Username, Email, Total Tasks, Pending, In-Progress, Completed

---

## Phân quyền

| Hành động                       | User | Admin |
| ------------------------------- | :--: | :---: |
| Đăng ký / Đăng nhập             |  ✓   |   ✓   |
| Xem / sửa thông tin cá nhân     |  ✓   |   ✓   |
| Upload ảnh đại diện             |  ✓   |   ✓   |
| Xem task được giao              |  ✓   |   ✓   |
| Cập nhật trạng thái / checklist |  ✓   |   ✓   |
| Xem tất cả task                 |  ✗   |   ✓   |
| Tạo / sửa / xoá task            |  ✗   |   ✓   |
| Quản lý người dùng              |  ✗   |   ✓   |
| Xem dashboard đầy đủ            |  ✗   |   ✓   |
| Xuất báo cáo Excel              |  ✗   |   ✓   |

---

## Xác thực

### JWT

- Token có hiệu lực **7 ngày**, ký bằng `JWT_SECRET`.
- Gửi qua header: `Authorization: Bearer <token>`
- Middleware `protect` xác thực token và gắn `req.user` vào request.
- Middleware `adminOnly` kiểm tra `req.user.role === "admin"`.

### Google OAuth

Luồng hoạt động:

```
Client                          Server                        Google
  |                               |                              |
  |--- GET /api/auth/google ----->|                              |
  |<-- redirect ------------------|--- redirect to OAuth ------->|
  |                               |<--- user approves ----------|
  |                               |--- exchange code for token --|
  |<-- redirect to CLIENT_URL    <|                              |
  |    ?token=<jwt>               |                              |
```

### Đặt lại mật khẩu

Token reset được ký bằng `JWT_SECRET + currentPasswordHash`, hết hạn sau **15 phút**. Token tự vô hiệu hoá ngay khi mật khẩu được thay đổi, ngăn sử dụng lại link cũ.
