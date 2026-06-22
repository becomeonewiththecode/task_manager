To Do App.

Task manager for tracking daily activities and priorities.
Users can

- add
- complete
- delete tasks with a clean, minimal interface.

---

## Status Legend
- ✅ Done
- ❌ Not yet implemented
- ⏭ Deferred to Phase 2

---

## Core Features

- ✅ Add new tasks with a single text input and enter key
- ✅ Mark tasks as complete with a checkbox
- ✅ Delete tasks with a swipe gesture or delete button
- ✅ Filter view by all, active, or completed tasks
- ✅ Persist tasks to local storage so they survive page refreshes
- ✅ Support keyboard shortcuts for common actions (n for new task, / to focus search)

---

## Frontend

### Auth
- ✅ User login page with username/password
- ✅ 2FA (TOTP with QR code)
- ❌ OAuth logins (Gmail, GitHub, Facebook) — skeleton not yet built

### UI / Themes
- ✅ Mobile-responsive design
- ✅ Dark mode toggle with system preference detection
- ✅ 4 modern themes — Light, Dark, Ocean, Forest; theme selector in Settings > Appearance tab
- ✅ Drag and drop to reorder tasks and adjust priorities (dnd-kit)

### Task Management
- ✅ Priority levels (high, medium, low) with visual indicators
- ✅ Task categories/tags for better organization
- ✅ Recurring tasks with configurable intervals (daily, weekly, monthly)
- ✅ Per-occurrence completion tracking for recurring tasks (RecurringCompletion model)
- ✅ Subtasks and task dependencies
- ✅ Task templates
- ✅ Bulk operations (BulkActionBar component)
- ✅ Search functionality to find tasks by keyword
- ✅ Location field per task — 📍 link opens address in Google Maps
- ✅ Web link field per task — 🔗 link opens URL in new tab

### User Account
- ✅ Ability to change password and username (email)

### Data
- ✅ Export tasks to JSON (backup/restore via SettingsPage) — includes all fields: title, description, priority, status, dueDate, recurring, location, webLink, durationMinutes, sortOrder, parentId, categories, dependencies, timeEntries
- ✅ Import tasks from backup file (overwrites existing data on restore) — restores all fields including location, webLink, durationMinutes

### Notifications & Reminders
- ✅ Push notification system for task reminders and due dates (15 min before due)

### Analytics & Tracking
- ✅ Progress tracking / statistics dashboard (recharts, AnalyticsPage)
- ✅ Time tracking (TimerButton, TimeEntry)
- ✅ Activity feed showing recent changes

### Calendar
- ✅ Calendar view integration (CalendarPage)
- ✅ Click any calendar day to create a new task with the date pre-filled
- ✅ Tasks within each day sorted chronologically by due time; all-day tasks listed last
- ✅ Due time shown on task chips in day cells and expanded-day modal

### Internationalization
- ✅ i18n infrastructure (i18next, react-i18next)
- ❌ Additional locales — only English (en.json) exists

### Offline / PWA
- ✅ Offline support with service workers and local storage sync (vite-plugin-pwa + workbox)

### Share
- ✅ Task sharing via public links with expiration times (SharePage, TaskShare model)

### Push Notifications
- ✅ Backend notification scheduler (checks every 60s for tasks due in 15 minutes)
- ✅ Push subscription management (subscribe/unsubscribe via Redis)
- ✅ Frontend UI for enabling/disabling notifications (Settings > Notifications)
- ✅ Service worker push handler with notification display
- ✅ Notification retry on failure (email/push failures don't mark task as notified, allowing next cycle to retry)
- ⏭ Browser push requires HTTPS (currently plain HTTP on local network)

### Testing
- ❌ Unit/integration tests (Vitest + React Testing Library installed, no test files yet)
- ❌ End-to-end tests (Playwright installed, no test files yet)

---

## Technical Stack — Frontend

- ✅ React 18 with functional components and hooks
- ✅ TypeScript 5.x
- ✅ Tailwind CSS 3.x
- ✅ Vite 5.x with hot reload
- ✅ React Router for client-side navigation
- ✅ date-fns for date manipulation
- ✅ dnd-kit for drag and drop
- ✅ Zustand for global state management
- ✅ react-hook-form for form validation
- ✅ axios for HTTP requests
- ✅ react-hot-toast for notifications
- ✅ recharts for analytics charts
- ✅ ESLint + Prettier configured

---

## Backend

### API & Server
- ✅ Express.js + TypeScript
- ✅ RESTful CRUD endpoints for tasks, users, categories, templates
- ✅ JWT auth with refresh token support
- ✅ Rate limiting (express-rate-limit)
- ✅ Input validation and sanitization (zod)
- ✅ CORS configuration
- ✅ Helmet for security headers
- ✅ Compression middleware (gzip)
- ✅ Structured logging (pino)
- ✅ Error handling middleware with HTTP status codes
- ✅ Health check endpoint (`GET /health`)
- ✅ Centralized config validation (`/src/config/index.ts` with Zod)

### Auth & Security
- ✅ bcrypt password hashing
- ✅ JWT generation/verification
- ✅ Account lockout after failed login attempts
- ✅ TOTP-based 2FA (otplib + qrcode)
- ✅ Soft delete with deleted_at timestamps
- ❌ OAuth social login handlers

### Database
- ✅ PostgreSQL with Prisma ORM
- ✅ Full schema: Users, Tasks, Categories, Sessions, AuditLog, TimeEntries, TaskShares, TaskTemplates, TaskDependencies, TaskTags, MailConfig, MailTemplate, SystemSetting, RecurringCompletion
- ✅ Indexes on frequently queried columns
- ✅ Connection pooling
- ✅ Database migrations (Prisma)
- ✅ Seed scripts for development

### Performance
- ✅ Redis caching layer (ioredis)
- ❌ Background job queue (Bull/BullMQ) — needed for recurring task generation

### Notifications
- ✅ Email notifications via SMTP (nodemailer) with configurable templates
- ✅ Web Push notifications for task reminders
- ✅ Notification scheduler sends both push and email notifications 15 minutes before task is due
- ✅ Notification retry: if push or email fails, the scheduler retries on the next cycle instead of permanently losing the reminder

### Admin Panel
- ✅ Admin middleware with email whitelist (`ADMIN_EMAILS` env var)
- ✅ User management (list, view, edit, delete, ban/unban, reset password)
- ✅ System statistics (users, sessions)
- ✅ Health monitoring (database, Redis, uptime, memory)
- ✅ Service management (view status, restart backend/frontend/db/redis via Docker socket)
- ✅ Mail configuration (SMTP settings, test email, templates)
- ✅ Activity logging and audit trail
- ✅ Admin UI integrated into frontend (admin-only nav, no task/calendar/analytics)

### API Documentation
- ❌ OpenAPI/Swagger spec and interactive UI

### Testing
- ❌ Unit/integration tests (Vitest + Supertest installed, no test files yet)

---

## Deployment

- ✅ Multi-stage Dockerfiles for frontend and backend
- ✅ Separate containers: frontend, backend, PostgreSQL, Redis
- ✅ Docker Compose orchestration (`docker-compose.yml`)
- ✅ Volume mounts for DB persistence
- ✅ nginx.conf mounted as volume — config changes take effect on `docker compose up -d --force-recreate frontend` without rebuilding the image
- ✅ docker-compose.override.yml for local dev
- ✅ Backend health check (`curl -f http://localhost:4000/health`) — curl installed in production Docker image
- ✅ Resource limits (memory) on db (512 MB) and redis (128 MB); backend and frontend uncapped
- ✅ Frontend serves plain HTTP on port 3333 (no SSL) — simplifies local network access; HTTPS removed since no trusted cert
- ✅ `VITE_ADMIN_EMAILS` build arg passed through Docker Compose for admin panel visibility
- ⏭ CI/CD pipeline (GitHub Actions) — manual deploys via `docker-compose up -d` until Phase 2

---

## Phase 2 (Deferred)

- ⏭ Real-time collaboration (WebSockets or SSE)
- ⏭ Email notifications (requires background job queue first)
- ⏭ Mobile native apps (React Native)
- ⏭ Advanced analytics with more charts and insights
- ⏭ File attachments with cloud storage
- ⏭ Third-party integrations (Slack, Google Calendar, Trello import)
- ⏭ Voice input for task title (hook + UI built; blocked — Web Speech API requires HTTPS)
- ⏭ AI-powered task suggestions
- ⏭ Custom fields per task
- ⏭ CI/CD pipeline

---

## Remaining Phase 1 Work (Priority Order)

1. ✅ Notification / reminder system (frontend UI + backend push + email via SMTP) — implemented, requires HTTPS for browser push
2. ✅ Admin panel (user management, mail configuration, monitoring) — implemented
3. ❌ Background job queue (Bull/BullMQ) — needed for recurring task generation
4. ❌ OpenAPI/Swagger documentation
5. ❌ Additional i18n locales beyond English
6. ✅ 4 themes — Light, Dark, Ocean, Forest all functional; moved to Settings > Appearance
7. ❌ Test coverage (backend unit + API tests, frontend component + E2E tests)
8. ✅ Centralized env config validation (`/src/config/index.ts` with Zod)
9. ❌ OAuth social login (Gmail, GitHub, Facebook)
