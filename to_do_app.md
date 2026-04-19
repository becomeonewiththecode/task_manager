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
- ❌ 4 modern themes — ThemeProvider exists but full theme set needs verification
- ✅ Drag and drop to reorder tasks and adjust priorities (dnd-kit)

### Task Management
- ✅ Priority levels (high, medium, low) with visual indicators
- ✅ Task categories/tags for better organization
- ✅ Recurring tasks with configurable intervals (daily, weekly, monthly)
- ✅ Subtasks and task dependencies
- ✅ Task templates
- ✅ Bulk operations (BulkActionBar component)
- ✅ Search functionality to find tasks by keyword

### User Account
- ✅ Ability to change password and username (email)

### Data
- ❌ Export tasks to CSV or JSON
- ❌ Import tasks from other todo apps

### Notifications & Reminders
- ❌ Notification system for task reminders and due dates

### Analytics & Tracking
- ✅ Progress tracking / statistics dashboard (recharts, AnalyticsPage)
- ✅ Time tracking (TimerButton, TimeEntry)
- ✅ Activity feed showing recent changes

### Calendar
- ✅ Calendar view integration (CalendarPage)

### Internationalization
- ✅ i18n infrastructure (i18next, react-i18next)
- ❌ Additional locales — only English (en.json) exists

### Offline / PWA
- ✅ Offline support with service workers and local storage sync (vite-plugin-pwa + workbox)

### Share
- ✅ Task sharing via public links with expiration times (SharePage, TaskShare model)

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
- ❌ Health check endpoint — not confirmed present
- ❌ Centralized config validation — no `/src/config/` directory

### Auth & Security
- ✅ bcrypt password hashing
- ✅ JWT generation/verification
- ✅ Account lockout after failed login attempts
- ✅ TOTP-based 2FA (otplib + qrcode)
- ✅ Soft delete with deleted_at timestamps
- ❌ OAuth social login handlers

### Database
- ✅ PostgreSQL with Prisma ORM
- ✅ Full schema: Users, Tasks, Categories, Sessions, AuditLog, TimeEntries, TaskShares, TaskTemplates, TaskDependencies, TaskTags
- ✅ Indexes on frequently queried columns
- ✅ Connection pooling
- ✅ Database migrations (Prisma)
- ✅ Seed scripts for development

### Performance
- ✅ Redis caching layer (ioredis)
- ❌ Background job queue (Bull/BullMQ) — needed for email notifications, recurring task generation

### Notifications
- ❌ Email notifications for task reminders — no mailer service

### API Documentation
- ❌ OpenAPI/Swagger spec and interactive UI

### Testing
- ❌ Unit/integration tests (Vitest + Supertest installed, no test files yet)

---

## Deployment

- ✅ Multi-stage Dockerfiles for frontend and backend
- ✅ Separate containers: frontend, backend, PostgreSQL, Redis
- ✅ Docker Compose orchestration
- ✅ Volume mounts for DB persistence
- ✅ docker-compose.override.yml for local dev
- ❌ Health checks configured per container
- ❌ Resource limits (CPU/memory) per service
- ⏭ CI/CD pipeline (GitHub Actions) — manual deploys via `docker-compose up -d` until Phase 2

---

## Phase 2 (Deferred)

- ⏭ Real-time collaboration (WebSockets or SSE)
- ⏭ Email notifications (requires background job queue first)
- ⏭ Mobile native apps (React Native)
- ⏭ Advanced analytics with more charts and insights
- ⏭ File attachments with cloud storage
- ⏭ Third-party integrations (Slack, Google Calendar, Trello import)
- ⏭ Voice input for adding tasks (useVoiceInput hook scaffolded)
- ⏭ Customizable keyboard shortcuts (useKeyboardShortcuts scaffolded)
- ⏭ AI-powered task suggestions
- ⏭ Custom fields per task
- ⏭ CI/CD pipeline

---

## Remaining Phase 1 Work (Priority Order)

1. ❌ Health check endpoint (`GET /api/health`)
2. ❌ Export tasks to CSV / JSON
3. ❌ Import tasks from other todo apps
4. ❌ Notification / reminder system (frontend UI + backend trigger)
5. ❌ Background job queue (Bull/BullMQ) — prerequisite for notifications and recurring tasks
6. ❌ OpenAPI/Swagger documentation
7. ❌ Additional i18n locales beyond English
8. ❌ 4 themes — verify/complete theme switcher
9. ❌ Test coverage (backend unit + API tests, frontend component + E2E tests)
10. ❌ Docker health checks and resource limits per service
11. ❌ Centralized env config validation (`/src/config/`)
12. ❌ OAuth social login (Gmail, GitHub, Facebook)
