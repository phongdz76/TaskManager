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
- Chat ca nhan, thao luan theo task va cua so chat noi

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
- /api/chat

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

## 12. Kiem thu va bao cao

Cai dependencies trong `backend`, `frontend/Task-Manager` va `tests` truoc khi chay.

Tu thu muc `tests`:

```bash
npm test                # Chay backend, sau do frontend
npm run test:backend    # Chi backend
npm run test:frontend   # Chuyen sang bo test trong frontend/Task-Manager
```

- Backend tests: `tests/backend-tests/` (MongoDB Memory Server, khong dung database that).
- Frontend tests: `frontend/Task-Manager/src/tests/`.
- Frontend build/lint: chay `npm run build` va `npm run lint` trong `frontend/Task-Manager`.

## 13. Su dung chat

Backend van khoi chay tu `backend/server.js`: `npm run dev` (mac dinh port 8000).
Frontend: `npm run dev` trong `frontend/Task-Manager`, sau do mo http://localhost:5173.

- Dang nhap va chon **Chat** trong menu. **Cuoc tro chuyen moi** mo danh ba de chat 1-1.
- Trong **Team Members**, bam **Nhan tin** de mo chat nhanh.
- Trong chi tiet task, bam **Mo thao luan** de trao doi cung nguoi tao/nguoi duoc giao.
- Nut chat o goc duoi ben phai mo danh sach chat nhanh; cua so noi giu ban nhap khi doi trang.
- Bam 1 hoac 2 lan vao o van ban cua tin nhan de chon **Tra loi**. Tin trich dan hien tren o nhap; bam X de huy.
- Nut anh trong o nhap cho phep chon toi da 4 anh JPG/PNG, moi anh toi da 5 MB; co the dan anh tu clipboard.
- Anh duoc luu rieng tu tren Cloudinary. API kiem tra quyen hoi thoai truoc khi tai anh; khong tra URL Cloudinary cong khai.

Chat luu tin bang MongoDB transaction, can Atlas hoac MongoDB replica set. MongoDB standalone khong ho tro gui tin chat.
`CLIENT_URL` trong backend phai chua origin cua frontend; nhieu origin cach nhau bang dau phay.
Mau cau hinh frontend nam o `frontend/Task-Manager/.env.example`.

Socket.IO va REST dung chung HTTP server khi chay Node. Neu chi chay REST tren Vercel,
dat `VITE_CHAT_REALTIME=false` de dong bo moi 15 giay, hoac cau hinh `VITE_CHAT_SOCKET_URL`
tro den Node server chay Socket.IO cung database. Khi chay nhieu Node instance, dat
`CHAT_SOCKET_ADAPTER=mongo` tren tat ca instance de dong bo su kien va thu hoi quyen.

Kiem thu trinh duyet voi hai tai khoan, dung database replica set tam rieng biet:

```bash
cd tests
npm run test:chat:e2e
```

Can Chrome/Edge da cai (hoac dat `CHROME_PATH`); khong can tai browser moi.
Anh kiem tra luu trong `.cache/chat-smoke/`. Kiem thu nay khong dung database trong `backend/.env`.

De kiem tra upload Cloudinary that tren PowerShell:

```powershell
$env:CHAT_SMOKE_CLOUDINARY = 'true'
npm run test:chat:e2e
```

Bai kiem tra chi doc ba bien `CLOUDINARY_*` tu `backend/.env`, van dung database tam.
Anh kiem tra duoc xoa khoi Cloudinary sau khi chay xong. Cac khoa Cloudinary chi nam o backend.

Tu thu muc goc, xuat ket qua hai bo test ra CSV de mo bang Excel:

```bash
node generate_csv.js
```

File `Test_Results.csv`, cac bao cao JSON, coverage va cache duoc bo qua boi `.gitignore`.
