# Task Manager Backend API

Backend service for Task Manager, built with Node.js, Express, and MongoDB.

## Overview

This API handles:

- Authentication (email/password + Google OAuth)
- Forgot/reset password flow by email
- User management and role updates
- Task lifecycle (create, assign, update, checklist, status, pin)
- Notification center
- Excel report exports

## Tech Stack

- Node.js (ES Modules)
- Express 5
- MongoDB + Mongoose
- JWT + bcryptjs
- Nodemailer (Gmail SMTP)
- Multer + Cloudinary
- ExcelJS

## Folder Structure

```
backend/
|-- server.js
|-- config/
|   |-- db.js
|   |-- cloudinary.js
|   `-- mailer.js
|-- controllers/
|   |-- authController.js
|   |-- userController.js
|   |-- taskController.js
|   |-- reportController.js
|   `-- notificationController.js
|-- middlewares/
|   |-- authMiddleware.js
|   `-- uploadMiddleware.js
|-- models/
|   |-- User.js
|   |-- Task.js
|   `-- Notification.js
|-- routes/
|   |-- authRoutes.js
|   |-- userRoutes.js
|   |-- taskRoutes.js
|   |-- reportRoutes.js
|   `-- notificationRoutes.js
`-- utils/
    `-- teamMembersSummary.js
```

## Environment Variables

Create `.env` in `backend/`:

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

# Optional. Current register flow still creates role=user.
ADMIN_INVITE_TOKEN=optional_value
```

## Run

```bash
npm install
npm run dev
```

## Global API Mounts

- `/api/auth`
- `/api/users`
- `/api/tasks`
- `/api/reports`
- `/api/notifications`

All private endpoints require:

```http
Authorization: Bearer <token>
```

## Data Models

### User

- `username`: String (required, 2-50)
- `email`: String (required, unique, lowercase)
- `password`: String | null (Google-only can be null)
- `googleId`: String | null
- `profileImageUrl`: String | null
- `role`: `user` | `admin`
- timestamps

### Task

- `title`: String (required)
- `description`: String
- `priority`: `Low` | `Medium` | `High`
- `status`: `Pending` | `In-Progress` | `Completed`
- `startDate`, `dueDate`: Date | null
- `assignedTo`: User[]
- `createdBy`: User
- `attachments`: String[]
- `todoChecklist`: `{ text, completed }[]`
- `progress`: Number (0-100)
- `isPinned`: Boolean
- timestamps

### Notification

- `recipient`: User (required)
- `message`: String (required)
- `type`:
  - `task_created`
  - `task_updated`
  - `task_deleted`
  - `task_assigned`
  - `progress_updated`
  - `checklist_completed`
  - `user_deleted`
  - `admin_granted`
  - `general`
- `relatedId`: ObjectId | null
- `isRead`: Boolean
- timestamps

## Endpoint Inventory

### Auth (`/api/auth`)

- `POST /register` (public): register user, validates username/email/password
- `POST /login` (public): login with email/password
- `POST /forgot-password` (public): send reset link (15 minutes token)
- `POST /reset-password` (public): reset password by token
- `GET /profile` (private): get current user profile
- `PUT /profile` (private): update profile and optional password
- `POST /upload-image` (private): upload profile image (max 5MB, jpg/jpeg/png)
- `GET /google` (public): redirect to Google OAuth
- `GET /callback/google` (public): OAuth callback and frontend redirect

### Users (`/api/users`)

- `GET /` (admin): list normal users + task counters
- `GET /admins` (admin): list admins + task counters
- `GET /assignable` (private): list users for assignment
- `GET /team-members-summary` (private): team stats summary
- `GET /:id` (private): get user by id
- `PATCH /:id/role` (admin): change role (`user`/`admin`)
- `DELETE /:id` (admin): delete non-admin user

### Tasks (`/api/tasks`)

- `GET /dashboard-data` (admin): system dashboard + charts + paginated recent tasks
- `GET /user-dashboard-data` (private): user dashboard for assigned/created tasks
- `GET /` (private): list tasks with status filter + pagination
- `GET /:id` (private): task detail (admin/assignee/creator)
- `POST /` (private): create task
- `PUT /:id` (private): update task (admin/creator)
- `DELETE /:id` (private): delete task (admin/creator)
- `PUT /:id/status` (private): update status (admin/assignee/creator)
- `PUT /:id/todo` (private): update checklist (admin/assignee/creator)
- `PATCH /:id/pin` (private): toggle pin

### Reports (`/api/reports`)

- `GET /export/my-tasks` (private): export own tasks to xlsx
- `GET /export/team-members` (private): export team summary to xlsx
- `GET /export/tasks` (admin): export all tasks to xlsx
- `GET /export/users` (admin): export users report to xlsx

### Notifications (`/api/notifications`)

- `GET /` (private): latest 50 notifications
- `PUT /read-all` (private): mark all as read
- `PUT /:id/read` (private): mark one notification as read
- `DELETE /clear-all` (private): delete all notifications

## Key Business Rules

- Self-registration always creates `role=user`.
- Task status and progress auto-sync with checklist updates.
- `PUT /api/tasks/:id` rejects direct `status` updates.
- Date validation compares date-only values (prevents time-of-day false failures).
- Regular users can only view tasks they created or are assigned to.
- Admin cannot delete admin accounts.

## Conventional Commit

Use this convention when committing backend changes:

```text
<type>(<scope>): <short description>
```

Examples:

- `feat(notification): add mark-all-as-read endpoint`
- `fix(task): prevent invalid past start date updates`
- `docs(backend): refresh endpoint inventory`
