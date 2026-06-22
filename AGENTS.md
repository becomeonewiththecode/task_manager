# AGENTS.md

## Project Structure

Two independent packages with no shared code:
- `backend/` — Node.js/Express + Prisma + PostgreSQL + Redis
- `frontend/` — React + Vite + Zustand + Tailwind

Each has its own `package.json`, `tsconfig.json`, Dockerfile, and npm scripts.

## Local Dev (Docker)

```bash
cp .env.example .env
cp backend/.env.example backend/.env   # edit secrets

docker compose -f docker-compose.yml up -d
docker compose -f docker-compose.yml exec backend npm run db:migrate
docker compose -f docker-compose.yml exec backend npm run db:seed
```

App: http://localhost:3333 | Demo: demo@example.com / Password123!

## Local Dev (No Docker)

Backend needs PostgreSQL + Redis running locally. Update `backend/.env` DATABASE_URL and REDIS_URL accordingly.

```bash
# Backend (terminal 1)
cd backend && npm install && npm run db:migrate && npm run dev  # http://localhost:4000

# Frontend (terminal 2)
cd frontend && npm install && npm run dev  # http://localhost:3333
```

## Commands

| Action | Command |
|--------|---------|
| Backend dev server | `cd backend && npm run dev` |
| Backend lint | `cd backend && npm run lint` |
| Backend build | `cd backend && npm run build` |
| Backend db migrate | `cd backend && npm run db:migrate` |
| Backend db seed | `cd backend && npm run db:seed` |
| Frontend dev server | `cd frontend && npm run dev` |
| Frontend lint | `cd frontend && npm run lint` |
| Frontend build | `cd frontend && npm run build` |

## Gotchas

- **Two compose files**: `docker-compose.yml` (local dev, builds from source) vs `compose.yml` (production, pulls pre-built images). Don't mix them up.
- **Backend auto-pushes schema**: `start.sh` runs `prisma db push --accept-data-loss` on container start — no migration deploy step needed in production.
- **Backend health check differs**: `docker-compose.yml` uses `wget`, `compose.yml` uses `curl`. Both target `http://localhost:4000/health`.
- **Frontend nginx proxy**: In Docker, frontend proxies `/api` to `http://backend:4000`. Outside Docker, frontend calls backend directly.
- **Admin access**: Controlled by `ADMIN_EMAILS` env var in `backend/.env`. Must match the logged-in user's email.
- **No tests yet**: Vitest is installed in both packages but no test files exist.
- **Prisma migrations gitignored**: `prisma/migrations/` is in `.gitignore`. Schema changes are pushed directly, not via migration files.
- **ESLint/Prettier are no-ops**: Both packages install ESLint + Prettier and define `lint`/`format` scripts, but neither has a config file (`.eslintrc`, `eslint.config.*`, `.prettierrc`). Running `npm run lint` applies no rules. Don't rely on lint to catch issues.
- **Backend validates env on startup**: Uses Zod in `backend/src/config/index.ts`. Invalid env causes `process.exit(1)`. JWT secrets must be ≥32 chars.
- **Path aliases**: Frontend uses `@/` → `src/` (Vite + tsconfig). Backend has no aliases — uses relative imports.
- **PWA**: Frontend is a PWA via `vite-plugin-pwa` + Workbox. Service worker at `src/sw.ts`. No-cache headers for `sw.js` in nginx.
- **`frontend/.env` is checked in**: Contains `VITE_ADMIN_EMAILS`. Not gitignored at the subdirectory level.
