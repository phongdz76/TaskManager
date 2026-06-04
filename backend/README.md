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
  - [Notifications](#notifications-apinotifications)
  - [Uploads](#uploads-apiupload)
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
- Quản lý trung tâm thông báo (notifications)
- Xuất báo cáo Excel
- Upload file/ảnh đính kèm

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
- Tài khoản MongoDB Atlas
- Tài khoản Cloudinary
- Tài khoản Gmail với App Password
- (Tuỳ chọn) Google Cloud project để dùng Google OAuth

---

## Cài đặt

```bash
# 1. Clone repository
git clone <repo-url>
cd backend

# 2. Cài dependencies
npm install

# 3. Tạo file .env
cp .env.example .env
```

---

## Biến môi trường

Sao chép file `.env.example` thành `.env` và điền:

```env
# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>

# Server
PORT=8000
JWT_SECRET=your_super_secret_key

# Frontend URL (CORS + OAuth redirect)
CLIENT_URL=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/callback/google

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Gmail SMTP
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password

# Optional (hiện tại register vẫn luôn tạo user role="user")
ADMIN_INVITE_TOKEN=optional_admin_token
```

> Lưu ý: Không commit file `.env` lên Git.

---

## Khởi chạy server

```bash
# Development
npm run dev

# Production
npm start
```

Server chạy tại `http://localhost:8000` (hoặc theo `PORT`).

---

## Cấu trúc thư mục

```text
backend/
├── server.js
├── config/
│   ├── db.js
│   ├── cloudinary.js
│   └── mailer.js
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── taskController.js
│   ├── reportController.js
│   └── notificationController.js
├── middlewares/
│   ├── authMiddleware.js
│   └── uploadMiddleware.js
├── models/
│   ├── User.js
│   ├── Task.js
│   └── Notification.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── taskRoutes.js
│   ├── reportRoutes.js
│   ├── notificationRoutes.js
│   └── uploadRoutes.js
└── utils/
    └── teamMembersSummary.js
```

---

## Mô hình dữ liệu

### User

| Trường            | Kiểu   | Mô tả                                         |
| ----------------- | ------ | --------------------------------------------- |
| `username`        | String | Bắt buộc, trim, 2-50 ký tự                    |
| `email`           | String | Bắt buộc, unique, lowercase                   |
| `password`        | String | Bcrypt hash; có thể `null` với Google account |
| `googleId`        | String | ID từ Google OAuth; có thể `null`             |
| `profileImageUrl` | String | URL ảnh đại diện, có thể `null`               |
| `role`            | String | `"user"` hoặc `"admin"`                       |
| `createdAt`       | Date   | Tự động                                       |
| `updatedAt`       | Date   | Tự động                                       |

> Trường `hasPassword` trong response profile là trường tính toán, không lưu trực tiếp trong schema.

### Task

| Trường          | Kiểu                  | Mô tả                                               |
| --------------- | --------------------- | --------------------------------------------------- |
| `title`         | String                | Bắt buộc, min 3, max 200                            |
| `description`   | String                | Tuỳ chọn, max 2000                                  |
| `priority`      | String                | `"Low"` / `"Medium"` / `"High"`                     |
| `status`        | String                | `"Pending"` / `"In-Progress"` / `"Completed"`       |
| `startDate`     | Date                  | Tuỳ chọn                                            |
| `dueDate`       | Date                  | Tuỳ chọn                                            |
| `assignedTo`    | [ObjectId]            | Danh sách user ID được giao                         |
| `createdBy`     | ObjectId              | Bắt buộc, user tạo task                             |
| `attachments`   | [String]              | Tuỳ chọn, tối đa 20 URL hợp lệ HTTP/HTTPS           |
| `todoChecklist` | [{ text, completed }] | Tuỳ chọn, tối đa 50 items, text mỗi item tối đa 500 |
| `progress`      | Number                | 0-100                                               |
| `isPinned`      | Boolean               | Ghim task                                           |
| `createdAt`     | Date                  | Tự động                                             |
| `updatedAt`     | Date                  | Tự động                                             |

### Notification

| Trường      | Kiểu     | Mô tả                                                                                                                                                  |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `recipient` | ObjectId | User nhận thông báo                                                                                                                                    |
| `message`   | String   | Nội dung thông báo                                                                                                                                     |
| `type`      | String   | `task_created`, `task_updated`, `task_deleted`, `task_assigned`, `progress_updated`, `checklist_completed`, `user_deleted`, `admin_granted`, `general` |
| `relatedId` | ObjectId | ID liên quan (task/user), tuỳ chọn                                                                                                                     |
| `isRead`    | Boolean  | Trạng thái đã đọc                                                                                                                                      |
| `createdAt` | Date     | Tự động                                                                                                                                                |
| `updatedAt` | Date     | Tự động                                                                                                                                                |

---

## API Reference

Tất cả endpoint private yêu cầu header:

```http
Authorization: Bearer <token>
```

Base routes:

- `/api/auth`
- `/api/users`
- `/api/tasks`
- `/api/reports`
- `/api/notifications`
- `/api/upload`

---

### Auth `/api/auth`

#### `POST /api/auth/register` — Đăng ký

**Body:**

```json
{
  "username": "Nguyen Van A",
  "email": "a@example.com",
  "password": "Password@123",
  "adminInviteToken": "optional"
}
```

**Validation chính:**

- `username`: 2-50 ký tự
- `email`: đúng định dạng
- `password`: tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số, ký tự đặc biệt

**Response `201`:**

```json
{
  "_id": "...",
  "name": "Nguyen Van A",
  "email": "a@example.com",
  "role": "user",
  "token": "<jwt>"
}
```

> Lưu ý: Luồng self-register hiện tại vẫn lưu role mặc định là `user`.

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
  "profileImageUrl": "https://...",
  "role": "user",
  "token": "<jwt>"
}
```

**Response `401` (Google-only account):**

```json
{
  "message": "This account uses Google Sign-In. Please login with Google."
}
```

---

#### `POST /api/auth/forgot-password` — Quên mật khẩu

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

**Response `404`:**

```json
{
  "message": "No account found with this email address"
}
```

---

#### `POST /api/auth/reset-password` — Đặt lại mật khẩu

**Body:**

```json
{
  "resetToken": "<token-from-email>",
  "newPassword": "NewPassword@456"
}
```

**Response `200`:**

```json
{ "message": "Password reset successful" }
```

---

#### `GET /api/auth/profile` — Lấy thông tin cá nhân `[Private]`

**Response `200`:**

```json
{
  "_id": "...",
  "username": "...",
  "email": "...",
  "profileImageUrl": "https://...",
  "role": "user",
  "googleId": null,
  "hasPassword": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

#### `PUT /api/auth/profile` — Cập nhật profile `[Private]`

**Body (tuỳ chọn):**

```json
{
  "username": "Tên mới",
  "email": "new@example.com",
  "profileImageUrl": "https://...",
  "currentPassword": "OldPassword@123",
  "newPassword": "NewPassword@456"
}
```

**Rule chính:**

- URL ảnh phải hợp lệ HTTP/HTTPS, tối đa 500 ký tự
- Tài khoản đã có mật khẩu: đổi mật khẩu bắt buộc có `currentPassword`
- Tài khoản Google-only: có thể set mật khẩu lần đầu bằng `newPassword`

**Response `200`:**

```json
{
  "_id": "...",
  "name": "Tên mới",
  "username": "Tên mới",
  "email": "new@example.com",
  "profileImageUrl": "https://...",
  "role": "user",
  "googleId": "...",
  "hasPassword": true,
  "token": "<jwt>"
}
```

---

#### `POST /api/auth/upload-image` — Upload ảnh đại diện `[Private]`

**Content-Type:** `multipart/form-data`

| Field   | Kiểu | Mô tả                    |
| ------- | ---- | ------------------------ |
| `image` | File | JPG/JPEG/PNG, tối đa 5MB |

**Response `200`:**

```json
{
  "message": "File uploaded successfully",
  "imageUrl": "https://res.cloudinary.com/..."
}
```

---

#### `GET /api/auth/google` — Bắt đầu Google OAuth

Redirect tới trang xác thực của Google.

---

#### `GET /api/auth/callback/google` — Callback Google OAuth

Sau khi xác thực Google thành công, backend redirect về frontend:

```text
<CLIENT_URL>/oauth-callback?token=<jwt>&name=<username>&role=<role>
```

---

### Users `/api/users`

#### `GET /api/users` — Danh sách user thường `[Admin]`

Trả về user role `user` + số lượng task theo trạng thái.

---

#### `GET /api/users/admins` — Danh sách admin `[Admin]`

Trả về user role `admin` + số lượng task theo trạng thái.

---

#### `GET /api/users/assignable` — Danh sách assignable users `[Private]`

Trả về `_id`, `username`, `email`, `profileImageUrl`, `role`.

---

#### `GET /api/users/team-members-summary` — Team summary `[Private]`

Response:

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

#### `GET /api/users/:id` — Chi tiết user `[Private]`

- Validate ObjectId
- 404 nếu không tồn tại

---

#### `PATCH /api/users/:id/role` — Cập nhật role `[Admin]`

**Body:**

```json
{ "role": "admin" }
```

**Rule:**

- Chỉ nhận `user` hoặc `admin`
- Không cho admin sửa role của admin khác
- Khi grant admin sẽ tạo notification

**Response `200`:**

```json
{ "message": "User role updated successfully" }
```

---

#### `DELETE /api/users/:id` — Xoá user `[Admin]`

**Rule:**

- Không cho xoá admin
- Xoá task do user đó tạo (`createdBy`)
- Gỡ user đó khỏi `assignedTo` của các task còn lại
- Tạo notification cho admin thao tác

**Response `200`:**

```json
{ "message": "User deleted successfully" }
```

---

### Tasks `/api/tasks`

#### `GET /api/tasks/dashboard-data` — Dashboard toàn hệ thống `[Admin]`

**Query params:**

- `page` (default: `1`)
- `limit` (default: `10`, max: `100`)

**Response gồm:**

- `statistics`: tổng task, pending, inProgress, completed, overdue
- `charts.taskDistribution`: Pending/In-Progress/Completed/All
- `charts.taskPriorityLevels`: Low/Medium/High
- `recentTasks`: có `completedTodoCount`, sort ghim trước (`isPinned`)
- `pagination`

---

#### `GET /api/tasks/user-dashboard-data` — Dashboard theo user `[Private]`

Tính trên tập task user đang đăng nhập được giao hoặc tự tạo.

**Query params:** giống dashboard-data.

---

#### `GET /api/tasks` — Danh sách task `[Private]`

**Query params:**

- `status`: `Pending` | `In-Progress` | `Completed` | `Overdue`
- `ignorePinned`: `true|false` (default: `false`)
- `page` (default `1`)
- `limit` (default `10`, max `100`)

**Rule truy cập dữ liệu:**

- Admin: xem tất cả task
- User: chỉ xem task được giao hoặc do mình tạo

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

#### `GET /api/tasks/:id` — Chi tiết task `[Private]`

Quyền xem: admin, assignee, hoặc creator.

---

#### `POST /api/tasks` — Tạo task `[Private]`

Tất cả user đăng nhập đều có quyền tạo.

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

**Validation chính:**

- `title`: 3-200 ký tự
- `description`: tối đa 2000
- `attachments`: tối đa 20 URL HTTP/HTTPS hợp lệ
- `todoChecklist`: tối đa 50 items, text <= 500
- `startDate`, `dueDate` không quá khứ
- `startDate` không lớn hơn `dueDate`
- Nếu không truyền `assignedTo`, mặc định assign cho creator

**Auto behavior:**

- Tự tính `progress`/`status` từ checklist
- Tạo notifications cho creator và assignees

**Response `201`:**

```json
{
  "message": "Task created successfully",
  "task": { "_id": "...", "title": "...", "status": "Pending" }
}
```

---

#### `PUT /api/tasks/:id` — Cập nhật task `[Private]`

Quyền: admin hoặc creator.

**Lưu ý:**

- Không cho cập nhật `status` trực tiếp ở endpoint này
- Nếu cập nhật checklist thì tự sync `progress`/`status`
- Vẫn validate `startDate <= dueDate` theo dữ liệu cuối cùng
- Tạo notifications sau khi cập nhật thành công

**Response `200`:**

```json
{
  "message": "Task updated successfully",
  "updatedTask": { "_id": "...", "title": "..." }
}
```

---

#### `DELETE /api/tasks/:id` — Xoá task `[Private]`

Quyền: admin hoặc creator.

Tạo notification cho creator/assignees liên quan.

**Response `200`:**

```json
{ "message": "Task deleted successfully" }
```

---

#### `PUT /api/tasks/:id/status` — Cập nhật status `[Private]`

Quyền: admin, assignee, hoặc creator.

**Body:**

```json
{ "status": "In-Progress" }
```

**Rule:**

- Nếu task không có checklist: set progress theo status (`0/50/100`)
- Nếu task có checklist:
  - set `Completed` -> auto complete toàn bộ checklist
  - nếu checklist đã 100%, không cho đổi về status khác cho đến khi bỏ tick item
- Tạo notifications cho các user liên quan

**Response `200`:**

```json
{
  "message": "Task status updated successfully",
  "task": { "_id": "...", "status": "In-Progress", "progress": 50 }
}
```

---

#### `PUT /api/tasks/:id/todo` — Cập nhật checklist `[Private]`

Quyền: admin, assignee, hoặc creator.

**Body:**

```json
{
  "todoChecklist": [
    { "text": "Bước 1", "completed": true },
    { "text": "Bước 2", "completed": false }
  ]
}
```

**Auto behavior:**

- Tự tính `progress`
- Tự set `status`:
  - `0%` -> `Pending`
  - `1-99%` -> `In-Progress`
  - `100%` -> `Completed`
- Tạo notifications cho user liên quan

**Response `200`:**

```json
{
  "message": "Task checklist updated successfully",
  "task": { "_id": "...", "status": "In-Progress", "progress": 50 }
}
```

---

#### `PATCH /api/tasks/:id/pin` — Ghim/Bỏ ghim task `[Private]`

Quyền: admin, assignee, hoặc creator.

**Response `200`:**

```json
{ "message": "Task pin status updated", "isPinned": true }
```

---

### Reports `/api/reports`

> Nhóm này trả file Excel `.xlsx`, không trả JSON data list.

#### `GET /api/reports/export/my-tasks` — Export task cá nhân `[Private]`

- Dữ liệu: task được giao hoặc do user hiện tại tạo
- File: `my_tasks.xlsx`

---

#### `GET /api/reports/export/team-members` — Export team members `[Private]`

- Dữ liệu: team members summary theo workspace
- File: `team_members_report.xlsx`

---

#### `GET /api/reports/export/tasks` — Export toàn bộ task `[Admin]`

- File: `tasks_report.xlsx`

---

#### `GET /api/reports/export/users` — Export báo cáo users `[Admin]`

- File: `users_report.xlsx`

---

### Notifications `/api/notifications`

#### `GET /api/notifications` — Lấy notifications `[Private]`

- Trả về tối đa 50 thông báo mới nhất của user hiện tại

**Response `200`:**

```json
[
  {
    "_id": "...",
    "recipient": "...",
    "message": "Task \"Fix login\" updated successfully",
    "type": "task_updated",
    "relatedId": "...",
    "isRead": false,
    "createdAt": "..."
  }
]
```

---

#### `PUT /api/notifications/read-all` — Đánh dấu đọc tất cả `[Private]`

**Response `200`:**

```json
{ "message": "All notifications marked as read" }
```

---

#### `PUT /api/notifications/:id/read` — Đánh dấu đã đọc 1 notification `[Private]`

- Validate ObjectId
- Chỉ cho phép đọc notification thuộc về chính user

**Response `200`:** Notification object đã cập nhật `isRead: true`.

---

#### `DELETE /api/notifications/clear-all` — Xoá tất cả notifications `[Private]`

**Response `200`:**

```json
{ "message": "All notifications deleted" }
```

---

### Uploads `/api/upload`

#### `POST /api/upload/image` — Upload ảnh chung `[Private]`

**Content-Type:** `multipart/form-data`

| Field   | Kiểu | Mô tả                |
| ------- | ---- | -------------------- |
| `image` | File | File ảnh đính kèm    |

**Response `200`:**

```json
{
  "message": "File uploaded successfully",
  "imageUrl": "https://res.cloudinary.com/..."
}
```

---

## Phân quyền

| Hành động                                | User | Admin |
| ---------------------------------------- | :--: | :---: |
| Đăng ký / đăng nhập / Google OAuth       |  ✓   |   ✓   |
| Xem / sửa profile                        |  ✓   |   ✓   |
| Upload ảnh đại diện                      |  ✓   |   ✓   |
| Xem assignable users, team summary       |  ✓   |   ✓   |
| Tạo task                                 |  ✓   |   ✓   |
| Xem task liên quan (assigned/created)    |  ✓   |   ✓   |
| Sửa / xoá task do mình tạo               |  ✓   |   ✓   |
| Cập nhật status/checklist task liên quan |  ✓   |   ✓   |
| Ghim / bỏ ghim task liên quan            |  ✓   |   ✓   |
| Xem dashboard toàn hệ thống              |  ✗   |   ✓   |
| Xem users/admins toàn hệ thống           |  ✗   |   ✓   |
| Cập nhật role user                       |  ✗   |   ✓   |
| Xoá user thường                          |  ✗   |   ✓   |
| Export `my-tasks`, `team-members`        |  ✓   |   ✓   |
| Export `tasks`, `users`                  |  ✗   |   ✓   |
| Xem/đọc/xoá notifications của chính mình |  ✓   |   ✓   |

---

## Xác thực

### JWT

- Token có hiệu lực 7 ngày (`expiresIn: "7d"`)
- Gửi qua header `Authorization: Bearer <token>`
- Middleware `protect` xác thực token và nạp user vào request
- Middleware `adminOnly` kiểm tra quyền admin

### Google OAuth

Flow tổng quát:

```text
Client -> GET /api/auth/google
Server -> redirect Google OAuth
Google -> callback /api/auth/callback/google
Server -> redirect CLIENT_URL/oauth-callback?token=...&name=...&role=...
```

### Đặt lại mật khẩu

- Reset token ký bằng `JWT_SECRET + currentPasswordHash`
- Thời hạn token: 15 phút
- Khi user đổi mật khẩu, token cũ tự vô hiệu
