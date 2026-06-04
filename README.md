# Task Manager

Task Manager la du an full-stack quan ly cong viec, gom backend API (Express + MongoDB) va frontend (React + Vite).

## 1. Tong quan tinh nang

- Dang ky, dang nhap email/password
- Dang nhap Google OAuth
- Quen mat khau / dat lai mat khau qua email
- Phan quyen theo role admin va user
- Quan ly task: tao, sua, xoa, xem chi tiet
- Cap nhat status task, checklist va pin/unpin task
- Thong ke dashboard + bieu do
- Notification trong he thong
- Xuat bao cao Excel
- Upload file/anh dinh kem cho task

## 2. Cau truc du an

```text
TaskManager/
├── backend/
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   └── utils/
└── frontend/
    └── Task-Manager/
        ├── src/
        ├── public/
        └── vite.config.js
```

## 3. File nam o dau (map nhanh)

### 3.1 Backend

- backend/server.js: khoi tao Express app, middleware, mount routes
- backend/config/db.js: ket noi MongoDB
- backend/config/cloudinary.js: cau hinh Cloudinary
- backend/config/mailer.js: cau hinh gui email
- backend/routes/authRoutes.js: route xac thuc
- backend/routes/userRoutes.js: route nguoi dung
- backend/routes/taskRoutes.js: route task
- backend/routes/reportRoutes.js: route report
- backend/routes/notificationRoutes.js: route notification
- backend/routes/uploadRoutes.js: route upload file/anh
- backend/models/User.js: schema user
- backend/models/Task.js: schema task
- backend/models/Notification.js: schema notification

### 3.2 Backend controllers (phan ban muon doc)

- backend/controllers/authController.js:
  - register, login, forgot/reset password, profile, Google OAuth callback
- backend/controllers/userController.js:
  - lay danh sach user, cap nhat role, xoa user, profile user
- backend/controllers/taskController.js:
  - CRUD task, update status, update checklist, dashboard data, pin task
- backend/controllers/reportController.js:
  - xuat report Excel cho task/user/team
- backend/controllers/notificationController.js:
  - lay notification, mark read, clear notification

### 3.3 Frontend src

- frontend/Task-Manager/src/App.jsx: route tong va phan luong theo role
- frontend/Task-Manager/src/context/userContext.jsx: luu user state + token
- frontend/Task-Manager/src/routes/PrivateRoute.jsx: chan route theo role
- frontend/Task-Manager/src/utils/apiPaths.js: map endpoint API
- frontend/Task-Manager/src/utils/axiosInstance.js: axios instance + interceptor
- frontend/Task-Manager/src/pages/Admin/\*: man hinh admin
- frontend/Task-Manager/src/pages/User/\*: man hinh user
- frontend/Task-Manager/src/pages/Auth/\*: dang nhap/dang ky/quen mat khau
- frontend/Task-Manager/src/components/tasks/\*: cac component task dung chung

## 4. Cong nghe su dung

- Backend: Node.js, Express 5, MongoDB, Mongoose, JWT, Nodemailer, Cloudinary, Multer, ExcelJS
- Frontend: React 19, Vite 7, React Router, Axios, Tailwind CSS, Recharts

## 5. Yeu cau moi truong

- Node.js >= 18
- npm >= 9
- MongoDB URI
- Cloudinary account
- Gmail App Password

## 6. Bien moi truong

Tao file backend/.env:

```env
PORT=8000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret

CLIENT_URL=http://localhost:5173

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/callback/google

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

EMAIL_USER=your_email
EMAIL_PASS=your_app_password

ADMIN_INVITE_TOKEN=optional_value
```

Tao file frontend/Task-Manager/.env:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 7. Chay local

### 7.1 Backend

```bash
cd backend
npm install
npm run dev
```

### 7.2 Frontend

```bash
cd frontend/Task-Manager
npm install
npm run dev
```

## 8. API mount points

- /api/auth
- /api/users
- /api/tasks
- /api/reports
- /api/notifications
- /api/upload

## 9. Commit convention (Conventional Commits)

Su dung dung format sau:

```text
<type>(<scope>): <mo ta ngan gon>
```

Type hop le:

- feat: them tinh nang
- fix: sua bug
- chore: thay doi lat vat (build, config, tool)
- refactor: cai thien code khong doi logic
- docs: thay doi document
- test: them hoac chinh sua test

Vi du:

- feat(auth): add JWT authentication middleware
- fix(order): correct total calculation rounding issue
- chore(ci): add GitHub Actions workflow for tests

## 10. Quy trinh push len nhanh dev

```bash
git checkout dev
git pull origin dev
git add .
git commit -m "fix(tasks): keep back navigation source and allow dashboard status update"
git push origin dev
```

## 11. Bao mat

- Khong commit file .env
- Khong day key/secret/token that len repo
