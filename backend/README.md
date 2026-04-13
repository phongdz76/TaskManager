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
  - [Auth](#auth-apiauth)
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
- Quản lý người dùng và phân quyền
- Tạo, phân công, theo dõi tiến độ công việc
- Cập nhật checklist, trạng thái, ghim task
- Xuất báo cáo Excel (task, người dùng, task cá nhân, team members)

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
│   ├── userController.js  # Quản lý người dùng
│   ├── taskController.js  # Quản lý công việc + dashboard
│   └── reportController.js# Xuất báo cáo Excel
├── middlewares/
│   ├── authMiddleware.js  # Xác thực JWT (protect) và kiểm tra quyền admin
│   └── uploadMiddleware.js# Multer + Cloudinary storage
├── models/
│   ├── User.js            # Schema người dùng
│   └── Task.js            # Schema công việc
├── routes/
│   ├── authRoutes.js      # /api/auth/*
│   ├── userRoutes.js      # /api/users/*
│   ├── taskRoutes.js      # /api/tasks/*
│   └── reportRoutes.js    # /api/reports/*
└── utils/
    └── teamMembersSummary.js
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

> Trường `hasPassword` xuất hiện trong một số response (`/api/auth/profile`, `/api/auth/profile` update) là trường tính toán, **không** lưu trực tiếp trong schema.

### Task

| Trường          | Kiểu                  | Mô tả                                                            |
| --------------- | --------------------- | ---------------------------------------------------------------- |
| `title`         | String                | Tiêu đề công việc, bắt buộc                                      |
| `description`   | String                | Mô tả chi tiết                                                   |
| `priority`      | String                | `"Low"` / `"Medium"` / `"High"` (mặc định: `"Medium"`)           |
| `status`        | String                | `"Pending"` / `"In-Progress"` / `"Completed"`                    |
| `startDate`     | Date                  | Ngày bắt đầu                                                     |
| `dueDate`       | Date                  | Hạn hoàn thành                                                   |
| `assignedTo`    | [ObjectId]            | Danh sách người được giao (ref: User)                            |
| `createdBy`     | ObjectId              | Người tạo task (ref: User)                                       |
| `attachments`   | [String]              | Danh sách URL file đính kèm                                      |
| `todoChecklist` | [{ text, completed }] | Checklist việc cần làm                                           |
| `progress`      | Number                | Phần trăm hoàn thành (0-100), được đồng bộ theo checklist/status |
| `isPinned`      | Boolean               | Trạng thái ghim task trên danh sách                              |
| `createdAt`     | Date                  | Tự động                                                          |
| `updatedAt`     | Date                  | Tự động                                                          |

**Rule đồng bộ status/progress hiện tại:**

- Khi cập nhật `todoChecklist`, hệ thống tự tính `progress` và đồng bộ `status`.
- Với endpoint `PUT /api/tasks/:id/status`:
  - Nếu task **không có checklist**: cho phép đổi status tự do, progress đặt về `0/50/100` tương ứng.
  - Nếu task **có checklist**: đặt `Completed` sẽ auto check toàn bộ checklist.

---

## API Reference

Tất cả response trả về JSON (trừ endpoint export Excel). Các route bảo vệ yêu cầu header:

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
  "password": "Password@123",
  "profileImageUrl": "https://..."
}
```

> `profileImageUrl` là tùy chọn. Mật khẩu phải có tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, chữ số, ký tự đặc biệt.

**Response `201`:**

```json
{
  "_id": "...",
  "name": "Nguyen Van A",
  "email": "a@example.com",
  "profileImageUrl": null,
  "role": "user",
  "token": "<jwt>"
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
  "_id": "...",
  "name": "Nguyen Van A",
  "email": "a@example.com",
  "profileImageUrl": null,
  "role": "user",
  "token": "<jwt>"
}
```

> Nếu tài khoản là Google-only (không có mật khẩu), API trả `401` với thông báo đăng nhập bằng Google.

---

#### `POST /api/auth/forgot-password` — Quên mật khẩu

Gửi email chứa link đặt lại mật khẩu (hết hạn sau 15 phút).

**Body:**

```json
{ "email": "a@example.com" }
```

**Response `200`:**

```json
{
  "message": "If that email is registered, a password reset link has been sent"
}
```

**Response `404` (email không tồn tại):**

```json
{ "message": "No account found with this email address" }
```

---

#### `POST /api/auth/reset-password` — Đặt lại mật khẩu

**Body:**

```json
{
  "resetToken": "<reset-token-from-email>",
  "newPassword": "NewPassword@456"
}
```

**Response `200`:**

```json
{ "message": "Password reset successful" }
```

---

#### `GET /api/auth/profile` — Lấy thông tin cá nhân `[Bảo vệ]`

**Response `200`:**

```json
{
  "_id": "...",
  "username": "...",
  "email": "...",
  "role": "user",
  "profileImageUrl": "https://...",
  "googleId": null,
  "hasPassword": true,
  "createdAt": "...",
  "updatedAt": "..."
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

**Rule đổi mật khẩu:**

- Tài khoản đã có mật khẩu: cần `currentPassword` + `newPassword`.
- Tài khoản Google-only (`password = null`): có thể set `newPassword` lần đầu, không cần `currentPassword`.

**Response `200`:**

```json
{
  "_id": "...",
  "name": "Tên mới",
  "username": "Tên mới",
  "email": "moi@example.com",
  "profileImageUrl": "https://...",
  "role": "user",
  "googleId": "...",
  "hasPassword": true,
  "token": "<jwt>"
}
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

Chuyển hướng trình duyệt đến trang consent của Google OAuth.

---

#### `GET /api/auth/callback/google` — Google OAuth Callback

Google redirect về đây sau khi người dùng đồng ý. Server tạo/tìm user, phát JWT và redirect về frontend:

```
<CLIENT_URL>/oauth-callback?token=<jwt>&name=<username>&role=<role>
```

---

### Users `/api/users`

> Tất cả route nhóm này yêu cầu xác thực. Một số route chỉ dành cho admin.

---

#### `GET /api/users` — Danh sách user thường `[Admin]`

Trả về user có `role: "user"`, kèm thống kê task theo trạng thái.

**Response `200`:**

```json
[
  {
    "_id": "...",
    "username": "...",
    "email": "...",
    "profileImageUrl": null,
    "role": "user",
    "pendingTasks": 2,
    "inProgressTasks": 1,
    "completedTasks": 5
  }
]
```

---

#### `GET /api/users/admins` — Danh sách admin `[Admin]`

Trả về user có `role: "admin"`, kèm thống kê task theo trạng thái.

---

#### `GET /api/users/assignable` — Danh sách user có thể assign `[Bảo vệ]`

Dành cho mọi user đã đăng nhập.

**Response `200`:**

```json
[
  {
    "_id": "...",
    "username": "...",
    "email": "...",
    "profileImageUrl": "...",
    "role": "user"
  }
]
```

---

#### `GET /api/users/team-members-summary` — Tổng hợp team members `[Bảo vệ]`

Trả về thống kê workspace-wide (không gồm user hiện tại).

**Response `200`:**

```json
{
  "teamMembers": [
    {
      "_id": "...",
      "username": "...",
      "email": "...",
      "role": "user",
      "profileImageUrl": "...",
      "taskCount": 8,
      "pendingTasks": 2,
      "inProgressTasks": 3,
      "completedTasks": 3,
      "overdueTasks": 1,
      "totalProgress": 520,
      "completionLevel": 65
    }
  ]
}
```

---

#### `GET /api/users/:id` — Chi tiết user `[Bảo vệ]`

Mọi user đăng nhập đều có thể gọi.

---

#### `PATCH /api/users/:id/role` — Cập nhật vai trò `[Admin]`

**Body:**

```json
{ "role": "admin" }
```

> Giá trị hợp lệ: `"user"` hoặc `"admin"`.
> Admin **không thể sửa role của admin khác**.

**Response `200`:**

```json
{ "message": "User role updated successfully" }
```

---

#### `DELETE /api/users/:id` — Xoá user `[Admin]`

- Không cho xoá tài khoản admin.
- Khi xoá user thường, hệ thống xoá các task có user đó trong `assignedTo`.

**Response `200`:**

```json
{ "message": "User deleted successfully" }
```

---

### Tasks `/api/tasks`

> Tất cả route nhóm task yêu cầu xác thực.

---

#### `GET /api/tasks/dashboard-data` — Dashboard tổng quan `[Admin]`

**Query params (tuỳ chọn):**

- `page` (mặc định `1`)
- `limit` (mặc định `10`)

**Response `200`:**

```json
{
  "statistics": {
    "totalTasks": 20,
    "pendingTasks": 5,
    "inProgressTasks": 8,
    "completedTasks": 7,
    "overdueTasks": 3
  },
  "charts": {
    "taskDistribution": {
      "Pending": 5,
      "In-Progress": 8,
      "Completed": 7,
      "All": 20
    },
    "taskPriorityLevels": {
      "Low": 4,
      "Medium": 10,
      "High": 6
    }
  },
  "recentTasks": [
    {
      "_id": "...",
      "title": "...",
      "status": "In-Progress",
      "priority": "High",
      "isPinned": false,
      "completedTodoCount": 2
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalTasks": 20,
    "limit": 10
  }
}
```

---

#### `GET /api/tasks/user-dashboard-data` — Dashboard theo user `[Bảo vệ]`

Thống kê trên tập task user đang đăng nhập được giao hoặc tự tạo.

**Query params:** giống `dashboard-data`.

---

#### `GET /api/tasks` — Danh sách task `[Bảo vệ]`

**Quyền truy cập dữ liệu:**

- `admin`: thấy tất cả task.
- `user`: chỉ thấy task được giao hoặc do chính mình tạo.

**Query params (tuỳ chọn):**

- `status`: `Pending` | `In-Progress` | `Completed` | `Overdue`
- `ignorePinned`: `true`/`false` (mặc định `false`)
- `page` (mặc định `1`)
- `limit` (mặc định `10`)

**Response `200`:**

```json
{
  "tasks": [
    {
      "_id": "...",
      "title": "...",
      "status": "Pending",
      "isPinned": true,
      "progress": 0,
      "completedTodoCount": 0,
      "assignedTo": [{ "_id": "...", "username": "..." }],
      "createdBy": { "_id": "...", "username": "..." }
    }
  ],
  "statusSummary": {
    "total": 12,
    "pending": 4,
    "inProgress": 5,
    "completed": 3,
    "overdue": 2
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalTasks": 12,
    "limit": 10
  }
}
```

---

#### `GET /api/tasks/:id` — Chi tiết task `[Bảo vệ]`

Task được trả về có `assignedTo` và `createdBy` đã populate.

**Quyền:** admin, người được assign, hoặc người tạo task.

---

#### `POST /api/tasks` — Tạo task `[Bảo vệ]`

Tất cả user đã đăng nhập đều có thể tạo task.

**Body:**

```json
{
  "title": "Tên công việc",
  "description": "Mô tả chi tiết",
  "priority": "High",
  "startDate": "2026-04-20",
  "dueDate": "2026-04-30",
  "assignedTo": ["<userId1>", "<userId2>"],
  "attachments": ["https://..."],
  "todoChecklist": [
    { "text": "Bước 1", "completed": false },
    { "text": "Bước 2", "completed": true }
  ]
}
```

**Rule chính:**

- `title` bắt buộc, tối đa 200 ký tự.
- `description` tối đa 2000 ký tự.
- `priority`: `Low`/`Medium`/`High`.
- `startDate`, `dueDate` không được ở quá khứ khi tạo mới.
- Nếu không truyền `assignedTo`, mặc định assign cho người tạo.
- Nếu có `todoChecklist`, server tự tính `progress` và `status` ban đầu.

**Response `201`:**

```json
{
  "message": "Task created successfully",
  "task": { "_id": "...", "title": "...", "status": "Pending" }
}
```

---

#### `PUT /api/tasks/:id` — Cập nhật task `[Bảo vệ]`

**Quyền:** admin hoặc người tạo task.

**Body:** tương tự `POST /api/tasks`, mọi trường đều tùy chọn.

**Lưu ý:**

- Không cho cập nhật `status` trực tiếp ở endpoint này.
- Nếu cập nhật `todoChecklist`, server tự sync `progress` + `status`.

**Response `200`:**

```json
{
  "message": "Task updated successfully",
  "updatedTask": { "_id": "...", "title": "..." }
}
```

---

#### `DELETE /api/tasks/:id` — Xoá task `[Bảo vệ]`

**Quyền:** admin hoặc người tạo task.

**Response `200`:**

```json
{ "message": "Task deleted successfully" }
```

---

#### `PUT /api/tasks/:id/status` — Cập nhật trạng thái `[Bảo vệ]`

**Quyền:** admin, người được assign, hoặc người tạo task.

**Body:**

```json
{ "status": "In-Progress" }
```

**Rule xử lý:**

- Task không có checklist: status đổi tự do, progress set theo status (`0/50/100`).
- Task có checklist:
  - Đổi sang `Completed` -> auto tick toàn bộ checklist.
  - Nếu checklist đã 100% completed, không cho đổi về trạng thái khác cho tới khi bỏ tick một số item.

**Response `200`:**

```json
{
  "message": "Task status updated successfully",
  "task": { "_id": "...", "status": "In-Progress", "progress": 50 }
}
```

---

#### `PUT /api/tasks/:id/todo` — Cập nhật checklist `[Bảo vệ]`

**Quyền:** admin, người được assign, hoặc người tạo task.

**Body:**

```json
{
  "todoChecklist": [
    { "text": "Bước 1", "completed": true },
    { "text": "Bước 2", "completed": false }
  ]
}
```

Server tự tính `progress` và `status` theo checklist.

**Response `200`:**

```json
{
  "message": "Task checklist updated successfully",
  "task": { "_id": "...", "status": "In-Progress", "progress": 50 }
}
```

---

#### `PATCH /api/tasks/:id/pin` — Ghim/Bỏ ghim task `[Bảo vệ]`

**Quyền:** admin, người được assign, hoặc người tạo task.

**Response `200`:**

```json
{ "message": "Task pin status updated", "isPinned": true }
```

---

### Reports `/api/reports`

> Các endpoint nhóm này trả file Excel (`.xlsx`) thay vì JSON.

---

#### `GET /api/reports/export/my-tasks` — Xuất task của tôi `[Bảo vệ]`

Mọi user đăng nhập đều dùng được.

- Nguồn dữ liệu: task được giao cho tôi hoặc do tôi tạo.
- File xuất: `my_tasks.xlsx`.

---

#### `GET /api/reports/export/team-members` — Xuất thống kê thành viên `[Bảo vệ]`

Mọi user đăng nhập đều dùng được.

- Dữ liệu team members theo workspace-wide.
- File xuất: `team_members_report.xlsx`.

---

#### `GET /api/reports/export/tasks` — Xuất toàn bộ task `[Admin]`

- Chỉ admin.
- File xuất: `tasks_report.xlsx`.

---

#### `GET /api/reports/export/users` — Xuất thống kê user `[Admin]`

- Chỉ admin.
- File xuất: `users_report.xlsx`.

---

## Phân quyền

| Hành động                                | User | Admin |
| ---------------------------------------- | :--: | :---: |
| Đăng ký / Đăng nhập / Google OAuth       |  ✓   |   ✓   |
| Xem / sửa thông tin cá nhân              |  ✓   |   ✓   |
| Upload ảnh đại diện                      |  ✓   |   ✓   |
| Xem danh sách assignable users           |  ✓   |   ✓   |
| Xem team members summary                 |  ✓   |   ✓   |
| Xem task được giao hoặc do mình tạo      |  ✓   |   ✓   |
| Tạo task                                 |  ✓   |   ✓   |
| Sửa / xoá task do mình tạo               |  ✓   |   ✓   |
| Cập nhật status/checklist task liên quan |  ✓   |   ✓   |
| Ghim / bỏ ghim task liên quan            |  ✓   |   ✓   |
| Xem tất cả user/admin                    |  ✗   |   ✓   |
| Cập nhật role user                       |  ✗   |   ✓   |
| Xoá user thường                          |  ✗   |   ✓   |
| Dashboard tổng quan hệ thống             |  ✗   |   ✓   |
| Export `my-tasks`, `team-members`        |  ✓   |   ✓   |
| Export `tasks`, `users`                  |  ✗   |   ✓   |

---

## Xác thực

### JWT

- Token có hiệu lực **7 ngày**, ký bằng `JWT_SECRET`.
- Gửi qua header: `Authorization: Bearer <token>`.
- Middleware `protect` xác thực token và nạp `req.user`.
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
  |    ?token=<jwt>&name=...      |                              |
```

### Đặt lại mật khẩu

- Token reset được ký bằng `JWT_SECRET + currentPasswordHash`.
- Thời hạn token: **15 phút**.
- Khi người dùng đổi mật khẩu thành công, các reset token cũ tự vô hiệu.
