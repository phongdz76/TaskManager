# Task Manager Frontend

Frontend client for the Task Manager system, built with React and Vite.

## Stack

- React 19
- Vite 7
- React Router
- Axios
- Tailwind CSS
- Recharts

## Requirements

- Node.js 18+
- npm 9+
- Running backend API

## Environment Variables

Create a `.env` file in this folder:

```env
VITE_API_BASE_URL=http://localhost:8000
```

If this variable is not set, the app still defaults to `http://localhost:8000`.

## Install

```bash
npm install
```

## Available Scripts

```bash
npm run dev      # Start local development server
npm run build    # Create production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Run in Development

```bash
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

## Main Folders

```
src/
├── components/   # Shared UI and feature components
├── pages/        # Route-level pages (Admin/Auth/User)
├── context/      # App-level contexts
├── hooks/        # Custom hooks
├── routes/       # Route guards and route helpers
└── utils/        # API config and helper utilities
```

## Backend Integration

- API base URL is configured in `src/utils/apiPaths.js`.
- Axios instance with auth token interceptor is in `src/utils/axiosInstance.js`.

## Notes

- Make sure backend CORS allows your frontend URL.
- Keep all environment values in `.env`, never hardcode secrets.
