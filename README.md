# Task Manager Monorepo

Task Manager is a full-stack web application for managing users, tasks, and reports.

## Project Layout

```
TaskManager/
├── backend/                  # Node.js + Express + MongoDB API
└── frontend/
    └── Task-Manager/         # React + Vite client app
```

## Tech Stack

- Backend: Node.js, Express 5, MongoDB (Mongoose), JWT, Cloudinary, Nodemailer
- Frontend: React 19, Vite 7, React Router, Axios, Tailwind CSS

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB connection string
- Cloudinary account (for image upload)
- SMTP credentials (for forgot-password email)

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
```

Create `frontend/Task-Manager/.env` (optional):

```env
VITE_API_BASE_URL=http://localhost:8000
```

If not provided, frontend falls back to `http://localhost:8000`.

## Run Locally

### 1) Start backend

```bash
cd backend
npm install
npm run dev
```

### 2) Start frontend

```bash
cd frontend/Task-Manager
npm install
npm run dev
```

Frontend runs on Vite default port (usually `http://localhost:5173`).

## Build for Production

```bash
cd frontend/Task-Manager
npm run build
npm run preview
```

```bash
cd backend
npm start
```

## Commit Convention

Use Conventional Commits:

```
<type>(<scope>): <short description>
```

Types:

- feat: add new feature
- fix: bug fix
- chore: tooling/config/build change
- refactor: internal code improvement without behavior change
- docs: documentation change
- test: add or update tests

Examples:

- feat(auth): add JWT authentication middleware
- fix(task): correct task status transition logic
- chore(ci): add GitHub Actions workflow for tests

## Notes

- Backend API routes are mounted under:
  - `/api/auth`
  - `/api/users`
  - `/api/tasks`
  - `/api/reports`
- Keep secrets in `.env` only. Never commit real credentials.
