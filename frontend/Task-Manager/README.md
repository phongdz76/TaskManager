# Task Manager Frontend

Frontend app for Task Manager, built with React + Vite.

## Stack

- React 19
- Vite 7
- React Router
- Axios
- Tailwind CSS
- Recharts
- react-hot-toast
- moment

## Requirements

- Node.js 18+
- npm 9+
- Running backend API

## Environment Variable

Create `.env` in this folder:

```env
VITE_API_BASE_URL=http://localhost:8000
```

If not set, frontend falls back to `http://localhost:8000`.

## Install and Run

```bash
npm install
npm run dev
```

## Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## App Routing

Routes are defined in `src/App.jsx` with role-based guards via `src/routes/PrivateRoute.jsx`.

Public routes:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/oauth-callback`

Admin routes:

- `/admin/dashboard`
- `/admin/create-task`
- `/admin/tasks/create`
- `/admin/tasks/edit/:id`
- `/admin/task-details/:id`
- `/admin/tasks`
- `/admin/team-members`
- `/admin/users`
- `/admin/all-user-tasks`
- `/admin/profile`

User routes:

- `/user/dashboard`
- `/user/create-task`
- `/user/tasks/edit/:id`
- `/user/my-tasks`
- `/user/task-details/:id`
- `/user/team-members`
- `/user/profile`

## Key File Map

- `src/App.jsx`: route tree and role segmentation
- `src/context/userContext.jsx`: user auth state, token bootstrap from localStorage
- `src/utils/apiPaths.js`: centralized endpoint paths
- `src/utils/axiosInstance.js`: auth header + 401 redirect interceptor
- `src/components/layouts/NavBar.jsx`: top bar and notification dropdown mount
- `src/components/layouts/NotificationDropdown.jsx`: notifications polling and actions
- `src/pages/Admin/*`: admin pages
- `src/pages/User/*`: user pages
- `src/pages/Auth/*`: auth pages

## Notification UI Behavior

`NotificationDropdown` supports:

- Poll notifications every 5 seconds
- Show unread badge on bell icon
- Mark single item as read on click
- Mark all as read
- Clear all notifications with confirm modal

## Task Attachments

Task create/edit screens support:

- Upload image attachments to Cloudinary
- Paste file links manually
- Preview images on create/edit and details screens

## API Integration

- Base URL: `src/utils/apiPaths.js`
- Auth token attached by Axios request interceptor
- On HTTP 401 with auth header, token is cleared and user is redirected to `/login`
- Upload endpoint: `/api/upload/image` mapped in `API_PATHS.IMAGES.UPLOAD_GENERAL_IMAGE`

## Conventional Commit

Use:

```text
<type>(<scope>): <short description>
```

Examples:

- `feat(frontend): add notification dropdown polling`
- `fix(auth-ui): redirect to login on expired token`
- `docs(frontend): refresh route documentation`
