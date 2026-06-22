# Task Manager

Full-stack todo app — React/TypeScript frontend, Node.js/Express backend, PostgreSQL, Redis, Docker.

## Quick start (local dev)

```bash
# 1. Clone and set up env files
cp .env.example .env
cp backend/.env.example backend/.env   # fill in secrets

# 2. Start all services
docker compose -f docker-compose.yml up -d

# 3. Run database migrations + seed
docker compose -f docker-compose.yml exec backend npm run db:migrate
docker compose -f docker-compose.yml exec backend npm run db:seed

# 4. Open
# App: http://localhost:3333  (plain HTTP — no SSL required)
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
├── docker-compose.yml         # Local dev / self-hosted (builds from source, plain HTTP)
├── compose.yml                # Pre-built image deployment
├── frontend/
│   ├── nginx.conf             # Mounted into container; serves plain HTTP on port 80
│   └── src/
│       ├── components/        # Layout, TaskCard, TaskForm, FilterBar, BulkActionBar, Admin/
│       ├── hooks/             # useAuth, useTasks, useKeyboardShortcuts, useNotifications, etc.
│       ├── pages/             # Login, Register, Dashboard, Tasks, Calendar, Analytics, Settings, Templates, Share, Admin*
│       ├── services/          # Axios API clients (auth, tasks, users, categories, templates, admin, mail)
│       ├── store/             # Zustand (auth, tasks, ui, admin)
│       ├── types/             # Shared TypeScript types
│       └── i18n/              # i18next localization (English)
└── backend/
    ├── prisma/
    │   ├── schema.prisma      # DB schema (15 models: Users, Tasks, Categories, Sessions, MailConfig, RecurringCompletion, etc.)
    │   └── seed.ts            # Development seed data
    └── src/
        ├── config/            # Env validation (Zod)
        ├── controllers/       # Request handlers (9 files incl. admin, mail)
        ├── middleware/        # Auth, admin, error, rate limiting, validation
        ├── routes/            # /api/v1/auth|tasks|users|categories|templates|push|admin|mail
        ├── services/          # Business logic (11 files incl. admin, mail, notification scheduler)
        └── utils/             # JWT, bcrypt, pino logger, Redis client, audit
```

## API overview

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/register | — | Create account |
| POST | /api/v1/auth/login | — | Login (returns JWT pair) |
| POST | /api/v1/auth/refresh | — | Rotate tokens |
| POST | /api/v1/auth/logout | — | Invalidate session |
| POST | /api/v1/auth/totp/setup | ✓ | Get QR code for 2FA |
| POST | /api/v1/auth/totp/enable | ✓ | Confirm & enable 2FA |
| POST | /api/v1/auth/totp/disable | ✓ | Disable 2FA |

### Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/tasks | ✓ | List tasks (filter + paginate) |
| POST | /api/v1/tasks | ✓ | Create task |
| PUT | /api/v1/tasks/reorder | ✓ | Drag-drop reorder |
| PUT | /api/v1/tasks/:id | ✓ | Update task |
| DELETE | /api/v1/tasks/:id | ✓ | Soft delete |
| POST | /api/v1/tasks/bulk | ✓ | Bulk operations (complete, delete, change priority) |
| GET | /api/v1/tasks/:id/subtasks | ✓ | List subtasks |
| POST | /api/v1/tasks/:id/subtasks | ✓ | Create subtask |
| DELETE | /api/v1/tasks/:id/subtasks/:subtaskId | ✓ | Remove subtask |
| GET | /api/v1/tasks/:id/dependencies | ✓ | List dependencies |
| POST | /api/v1/tasks/:id/dependencies | ✓ | Add dependency |
| DELETE | /api/v1/tasks/:id/dependencies/:depId | ✓ | Remove dependency |
| POST | /api/v1/tasks/:id/occurrences/:date/toggle | ✓ | Toggle recurring occurrence completion |

### Time Tracking

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/tasks/:id/time-entries | ✓ | List time entries |
| POST | /api/v1/tasks/:id/time-entries | ✓ | Start timer |
| PUT | /api/v1/tasks/:id/time-entries/stop | ✓ | Stop timer |
| DELETE | /api/v1/tasks/:id/time-entries/:entryId | ✓ | Remove time entry |

### Task Sharing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/tasks/:id/shares | ✓ | Create share link |
| GET | /api/v1/tasks/:id/shares | ✓ | List share links |
| DELETE | /api/v1/tasks/:id/shares/:shareId | ✓ | Remove share link |
| GET | /api/v1/share/:token | — | View shared task (public) |

### Task Templates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/task-templates | ✓ | List templates |
| POST | /api/v1/task-templates | ✓ | Create template |
| PUT | /api/v1/task-templates/:id | ✓ | Update template |
| DELETE | /api/v1/task-templates/:id | ✓ | Delete template |

### Categories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/categories | ✓ | List categories |
| POST | /api/v1/categories | ✓ | Create category |
| PUT | /api/v1/categories/:id | ✓ | Update category |
| DELETE | /api/v1/categories/:id | ✓ | Delete category |

### Push Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/push/vapid-public-key | ✓ | Get VAPID public key |
| POST | /api/v1/push/subscribe | ✓ | Subscribe to push |
| DELETE | /api/v1/push/subscribe | ✓ | Unsubscribe from push |

### User Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/users/me | ✓ | Get profile |
| PUT | /api/v1/users/me | ✓ | Update profile |
| PUT | /api/v1/users/me/email | ✓ | Change email |
| PUT | /api/v1/users/me/password | ✓ | Change password |
| DELETE | /api/v1/users/me | ✓ | Delete account |
| GET | /api/v1/users/me/stats | ✓ | Completion stats |
| GET | /api/v1/users/me/analytics | ✓ | Analytics data (time series) |
| POST | /api/v1/users/me/export | ✓ | Export all data (JSON) |
| POST | /api/v1/users/me/import | ✓ | Import data from backup |
| GET | /api/v1/users/me/audit-log | ✓ | Audit log (paginated) |

### Admin (requires admin email)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/admin/users | ✓ | List all users (paginated, searchable) |
| GET | /api/v1/admin/users/:id | ✓ | Get user details + activity |
| PUT | /api/v1/admin/users/:id | ✓ | Update user (email, username) |
| DELETE | /api/v1/admin/users/:id | ✓ | Soft delete user |
| POST | /api/v1/admin/users/:id/reset-password | ✓ | Reset user password |
| POST | /api/v1/admin/users/:id/ban | ✓ | Ban user |
| POST | /api/v1/admin/users/:id/unban | ✓ | Unban user |
| GET | /api/v1/admin/users/:id/activity | ✓ | Get user activity |
| GET | /api/v1/admin/stats | ✓ | System statistics |
| GET | /api/v1/admin/health | ✓ | Detailed health check |
| GET | /api/v1/admin/activity | ✓ | Recent system activity |
| GET | /api/v1/admin/services | ✓ | List all Docker services with status |
| POST | /api/v1/admin/services/:name/restart | ✓ | Restart a Docker service (backend, frontend, db, redis) |

### Mail Configuration (requires admin email)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/mail/config | ✓ | Get SMTP configuration |
| PUT | /api/v1/mail/config | ✓ | Update SMTP settings |
| POST | /api/v1/mail/test | ✓ | Send test email |
| GET | /api/v1/mail/templates | ✓ | List email templates |
| GET | /api/v1/mail/templates/:id | ✓ | Get template |
| PUT | /api/v1/mail/templates/:id | ✓ | Update template |

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| N | New task |
| / | Focus search |
| B | Toggle sidebar |
| C | Open calendar |
| A | Open analytics |

> **Customizable:** Go to Settings > Shortcuts to reassign any key.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript 5, Tailwind 3, Vite 5, Zustand, dnd-kit, Recharts, react-hook-form, date-fns |
| Backend | Node 20, Express, TypeScript 5, Prisma, Zod, Pino, Nodemailer |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT (access 15m + refresh 7d), bcrypt, otplib (TOTP 2FA) |
| Push | Web Push API (VAPID keys) |
| i18n | i18next, react-i18next |
| Deploy | Docker + Docker Compose, nginx |

## Features

- **Task Management:** Create, edit, delete tasks with priorities (high/medium/low), categories, due dates, and recurring schedules
- **Recurring Completion Tracking:** Mark individual occurrences of recurring tasks as complete without affecting other days
- **Subtasks & Dependencies:** Break tasks into subtasks and set dependencies with automatic cycle detection
- **Bulk Operations:** Complete, delete, or change priority of multiple tasks at once
- **Time Tracking:** Start/stop timer per task with time entry history
- **Task Templates:** Save and reuse task templates for common workflows
- **Task Sharing:** Generate public links with expiration times for shared tasks
- **Calendar View:** Visual calendar with click-to-create and chronological task sorting
- **Analytics Dashboard:** Charts showing completion trends, priority breakdown, and time distribution
- **Push Notifications:** Browser notifications 15 minutes before tasks are due, with automatic retry on failure
- **Email Notifications:** Email reminders when SMTP is configured (integrated with push notifications, with retry on failure)
- **Themes:** 4 built-in themes (Light, Dark, Ocean, Forest) with CSS variable system
- **Keyboard Shortcuts:** Customizable shortcuts for quick actions
- **Data Export/Import:** Full JSON backup and restore including all task data
- **Audit Log:** Track all changes to tasks
- **PWA:** Offline support with service worker caching
- **2FA:** TOTP-based two-factor authentication with QR code setup
- **Admin Panel:** User management, mail configuration, and system monitoring (requires admin email)
