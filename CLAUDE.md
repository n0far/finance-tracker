# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Run everything (recommended):**
```bash
npm run dev          # starts backend (port 3001) + frontend (port 5173) concurrently
```

**Run individually:**
```bash
# Backend
cd backend && npm run dev    # nodemon, auto-restarts on changes
cd backend && npm start      # production, no auto-restart

# Frontend
cd frontend && npm run dev   # Vite dev server
cd frontend && npm run build # production build
cd frontend && npm run lint  # ESLint
```

**Install dependencies (all at once):**
```bash
npm run install:all
```

## Architecture

This is a monorepo with a React SPA frontend and an Express/SQLite backend. There is no test suite.

### Backend (`backend/`)

- **Runtime:** Node.js (CommonJS), Express
- **Database:** SQLite via `better-sqlite3` — file stored at `backend/data/finance.db`. Schema and indexes are defined inline in `db.js` using `CREATE TABLE IF NOT EXISTS`.
- **Auth:** JWT (7-day expiry), stored in `localStorage` on the client. `backend/middleware/auth.js` exposes `authMiddleware` used on all protected routes.
- **Validation:** Zod schemas live in `backend/schemas/`; applied via `backend/middleware/validate.js` which puts parsed data on `req.validated`.
- **Recurring transactions:** A background job (`backend/jobs/recurringJob.js`) runs every hour (and immediately on startup) to materialise due recurring rules into actual transactions.
- **New user registration** automatically seeds default categories via `seedCategories()` in `db.js`.

Route files mirror the feature areas: `auth`, `transactions`, `categories`, `budgets`, `savingsGoals`, `recurring`, `reports`.

### Frontend (`frontend/src/`)

- **Framework:** React 19, React Router v7, Tailwind CSS, Recharts, Axios, date-fns
- **API layer:** All HTTP calls go through `api/client.js` (an Axios instance with base `/api`). Vite proxies `/api` → `http://localhost:3001` in dev. Each feature has its own file under `api/`.
- **Auth state:** `context/AuthContext.jsx` — stores JWT token + user object in `localStorage`, provides `useAuth()` hook. A 401 response from the API automatically redirects to `/login`.
- **Global categories cache:** `context/CategoriesContext.jsx` — fetches categories once on login and exposes `useCategories()` + `refresh()`. Pages that mutate categories call `refresh()` afterward.
- **Toast notifications:** `context/ToastContext.jsx` — exposes `useToast()` / `addToast(message, type)`.
- **Routing:** `App.jsx` defines all routes. Protected routes are wrapped in `AppShell` (sidebar + topbar layout). `/transactions/:id/edit` and `/transactions/new` both render `TransactionForm`.

### Currency

All monetary values are displayed in Israeli New Shekel (₪). Formatting is centralised in `frontend/src/lib/format.js` (`formatCurrency` uses `he-IL` locale with `ILS`). Chart components (`CategoryDonutChart`, `MonthlyBarChart`, `SavingsLineChart`) each have a local copy of the same formatter — keep them in sync when changing currency settings.

### Environment

Backend reads `backend/.env` (via dotenv). The only meaningful variable is `JWT_SECRET` — defaults to a hardcoded string if not set.
