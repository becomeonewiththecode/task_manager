# Task Manager

Full-stack todo app — React/TypeScript frontend, Node.js/Express backend, PostgreSQL, Redis, Docker.

## Quick start (local dev)

```bash
# 1. Clone and set up env files
cp .env.example .env
cp backend/.env.example backend/.env   # fill in secrets

# 2. Start all services
docker compose up -d

# 3. Run database migrations + seed
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed

# 4. Open
# App: http://localhost:3333
# Demo login: demo@example.com / Password123!
```

## Local dev without Docker

```bash
# Backend
cd backend && npm install
cp .env.example .env   # set DATABASE_URL + REDIS_URL to local instances
npm run db:migrate
npm run dev            # http://localhost:4000

# Frontend (separate terminal)
cd frontend && npm install
npm run dev            # http://localhost:3333
```

## Project structure

```
task_manager/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # DB schema (Users, Tasks, Categories, Sessions)
│   └── src/
│       ├── config/            # Env validation (zod)
│       ├── controllers/       # Request handlers
│       ├── middleware/        # Auth, error, rate limiting, validation
│       ├── routes/            # /api/v1/auth|tasks|users|categories
│       ├── services/          # Business logic
│       └── utils/             # JWT, bcrypt, pino logger, Redis client
└── frontend/
    └── src/
        ├── components/        # Layout, TaskCard, TaskForm, FilterBar
        ├── hooks/             # useAuth, useTasks
        ├── pages/             # Login, Register, Dashboard, Tasks, Settings
        ├── services/          # Axios API clients
        ├── store/             # Zustand (auth, tasks, ui/theme)
        └── types/             # Shared TypeScript types
```

## API overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/register | — | Create account |
| POST | /api/v1/auth/login | — | Login (returns JWT pair) |
| POST | /api/v1/auth/refresh | — | Rotate tokens |
| POST | /api/v1/auth/logout | — | Invalidate session |
| POST | /api/v1/auth/totp/setup | ✓ | Get QR code |
| POST | /api/v1/auth/totp/enable | ✓ | Confirm & enable 2FA |
| POST | /api/v1/auth/totp/disable | ✓ | Disable 2FA |
| GET | /api/v1/tasks | ✓ | List tasks (filter + paginate) |
| POST | /api/v1/tasks | ✓ | Create task |
| PUT | /api/v1/tasks/reorder | ✓ | Drag-drop reorder |
| PUT | /api/v1/tasks/:id | ✓ | Update task |
| DELETE | /api/v1/tasks/:id | ✓ | Soft delete |
| GET | /api/v1/users/me | ✓ | Profile |
| GET | /api/v1/users/me/stats | ✓ | Completion stats |
| PUT | /api/v1/users/me/email | ✓ | Change email |
| PUT | /api/v1/users/me/password | ✓ | Change password |
| GET | /api/v1/categories | ✓ | List categories |
| POST | /api/v1/categories | ✓ | Create category |

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| N | New task |
| / | Focus search |

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript 5, Tailwind 3, Vite 5, Zustand, dnd-kit |
| Backend | Node 20, Express, TypeScript 5, Prisma, Zod |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT (access 15m + refresh 7d), bcrypt, otplib (TOTP 2FA) |
| Deploy | Docker + Docker Compose |
