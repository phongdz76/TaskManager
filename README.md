# Task Manager Monorepo

Task Manager is a full-stack app for authentication, task management, notifications, and reporting.

## Main Features

- Email/password auth + Google OAuth
- Forgot/reset password by email (token expiry: 15 minutes)
- Role-based app flow (`admin`, `user`)
- Task CRUD with:
  - checklist-based progress auto-sync
  - status update endpoint
  - pin/unpin task
  - overdue filtering
- In-app notifications (polling on frontend)
- Excel exports for tasks, users, and team summary

## Project Layout

```
TaskManager/
|-- backend/                     # Node.js + Express + MongoDB API
`-- frontend/
    `-- Task-Manager/            # React + Vite client app
```

## Quick File Map (File Nam O Dau)

- `backend/server.js`: app bootstrap, CORS, JSON middleware, route mounting
- `backend/routes/`: route definitions by module (`auth`, `users`, `tasks`, `reports`, `notifications`)
- `backend/controllers/`: request validation + business logic
- `backend/models/`: Mongoose schemas (`User`, `Task`, `Notification`)
- `backend/utils/teamMembersSummary.js`: shared team statistics logic
- `frontend/Task-Manager/src/App.jsx`: routing tree for auth/admin/user pages
- `frontend/Task-Manager/src/context/userContext.jsx`: auth state bootstrap and storage sync
- `frontend/Task-Manager/src/utils/apiPaths.js`: centralized API endpoints
- `frontend/Task-Manager/src/components/layouts/NotificationDropdown.jsx`: notification UI + polling actions

## Tech Stack

- Backend: Node.js, Express 5, MongoDB (Mongoose), JWT, Nodemailer, Multer, Cloudinary, ExcelJS
- Frontend: React 19, Vite 7, React Router, Axios, Tailwind CSS, Recharts

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB connection string
- Cloudinary account (image upload)
- Gmail SMTP App Password (forgot/reset password)

## Environment Variables

Create `backend/.env`:

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

# Optional: currently registration still creates role=user
ADMIN_INVITE_TOKEN=optional_value
```

Create `frontend/Task-Manager/.env` (optional):

```env
VITE_API_BASE_URL=http://localhost:8000
```

If not set, frontend defaults to `http://localhost:8000`.

## Run Locally

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

### 2) Frontend

```bash
cd frontend/Task-Manager
npm install
npm run dev
```

## API Mount Points

- `/api/auth`
- `/api/users`
- `/api/tasks`
- `/api/reports`
- `/api/notifications`

## Commit Convention

Su dung chuan Conventional Commits:

```
<type>(<scope>): <mo ta ngan gon>
```

- `type`:
  - `feat`: them tinh nang
  - `fix`: sua bug
  - `chore`: thay doi lat vat (build, config, tool)
  - `refactor`: cai thien code khong doi logic
  - `docs`: thay doi document
  - `test`: them hoac chinh sua test

Vi du:

- `feat(auth): add JWT authentication middleware`
- `fix(order): correct total calculation rounding issue`
- `chore(ci): add GitHub Actions workflow for tests`

## Push Branch dev

```bash
git checkout dev
git add .
git commit -m "docs(readme): update readme to match current backend frontend logic"
git push origin dev
```

## Security Notes

- Keep all secrets in `.env`
- Never commit real credentials or tokens
