# Production Deployment Guide

This guide covers deploying the Task Manager using pre-built Docker images via `compose.yml`.

---

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- `openssl` installed on the host (for cert generation)
- Git (to clone the repo for config files)

---

## Step 1 — Clone the Repository

Only the config files are needed from the repo; the app images are pulled from Docker Hub.

```bash
git clone <your-repo-url> task_manager
cd task_manager
```

---

## Step 2 — Generate Self-Signed SSL Certificates

```bash
mkdir -p ssl

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/server.key \
  -out ssl/server.crt \
  -subj "/C=US/ST=State/L=City/O=TaskManager/CN=localhost"

chmod 600 ssl/server.key
```

> **Note:** The `CN` value should match your server's IP or hostname. For a real domain, replace `localhost` with your domain (e.g. `CN=myapp.example.com`).

To add Subject Alternative Names (SANs) for a specific IP/hostname:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/server.key \
  -out ssl/server.crt \
  -subj "/CN=192.168.1.100" \
  -addext "subjectAltName=IP:192.168.1.100,DNS:myapp.example.com"
```

---

## Step 3 — Create the Nginx Config with SSL

Replace `frontend/nginx.conf` with the following SSL-enabled configuration.

> Edit the `server_name` line to match your server's IP or hostname.

```nginx
# frontend/nginx.conf

# Redirect plain HTTP to HTTPS
server {
    listen 80;
    server_name _;
    return 301 https://$host:3333$request_uri;
}

# HTTPS server
server {
    listen 443 ssl;
    server_name localhost;          # <-- change to your IP or domain

    ssl_certificate     /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    root  /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # PWA service worker — never cache
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri =404;
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy → backend container
    location /api {
        proxy_pass         http://backend:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host       $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

The `compose.yml` mounts this file into the container at `/etc/nginx/conf.d/default.conf`.

---

## Step 4 — Configure the Backend Environment File

Create `backend/.env` (copy from the example and edit every value):

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env` with production values:

```dotenv
# backend/.env — PRODUCTION

NODE_ENV=production
PORT=4000

# ── Database ───────────────────────────────────────────────────────────────────
# Must match POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB in root .env
DATABASE_URL="postgresql://taskuser:STRONG_DB_PASS@db:5432/taskmanager"

# ── Redis ──────────────────────────────────────────────────────────────────────
REDIS_URL="redis://redis:6379"

# ── JWT ────────────────────────────────────────────────────────────────────────
# Generate with: openssl rand -hex 32
JWT_ACCESS_SECRET=REPLACE_WITH_64_CHAR_RANDOM_STRING
JWT_REFRESH_SECRET=REPLACE_WITH_DIFFERENT_64_CHAR_RANDOM_STRING
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── CORS / Frontend ────────────────────────────────────────────────────────────
# Use your server's actual IP or domain; port 3333 is the HTTPS port
FRONTEND_URL=https://192.168.1.100:3333

# ── TOTP (2FA) ────────────────────────────────────────────────────────────────
TOTP_APP_NAME=TaskManager

# ── Web Push (VAPID) ──────────────────────────────────────────────────────────
# Generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=REPLACE_WITH_GENERATED_PUBLIC_KEY
VAPID_PRIVATE_KEY=REPLACE_WITH_GENERATED_PRIVATE_KEY
VAPID_EMAIL=mailto:admin@yourdomain.com
```

### Generating required secrets

```bash
# JWT secrets (run twice, use different outputs for access vs refresh)
openssl rand -hex 32

# VAPID keys for Web Push notifications
npx web-push generate-vapid-keys
```

---

## Step 5 — Configure the Root Environment File

The root `.env` supplies Postgres credentials to the `db` container. Update the password to match `DATABASE_URL` above:

```dotenv
# .env (root)
POSTGRES_USER=taskuser
POSTGRES_PASSWORD=STRONG_DB_PASS    # must match DATABASE_URL
POSTGRES_DB=taskmanager
```

---

## Step 6 — Pull and Start the Containers

```bash
# Pull the latest pre-built images
docker compose -f compose.yml pull

# Start all services in the background
docker compose -f compose.yml up -d
```

### Verify all containers are running

```bash
docker compose -f compose.yml ps
```

Expected output — all services should show `healthy` or `running`:

```
NAME                        STATUS
task_manager-frontend-1     Up (healthy)
task_manager-backend-1      Up (healthy)
task-manager-postgres        Up (healthy)
task_manager-redis-1        Up (healthy)
```

### Check backend logs for startup errors

```bash
docker compose -f compose.yml logs backend --tail 50
```

On first boot the backend runs `prisma db push` to initialise the schema — this is normal.

---

## Step 7 — Access the App

| URL | Description |
|---|---|
| `https://<server-ip>:3333` | HTTPS (main access) |
| `http://<server-ip>:3334` | HTTP (redirects to HTTPS) |

Your browser will warn about the self-signed certificate. Click **Advanced → Proceed** to continue.

---

## Common Problems and Fixes

### Problem: Backend fails to start — `JWT_ACCESS_SECRET` too short

```
Error: secret must be at least 32 characters
```

**Fix:** Generate a proper secret and update `backend/.env`:

```bash
openssl rand -hex 32
# Update JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in backend/.env
docker compose -f compose.yml restart backend
```

---

### Problem: CORS errors in browser console

```
Access-Control-Allow-Origin header missing
```

**Fix:** `FRONTEND_URL` in `backend/.env` must exactly match the origin your browser uses (including protocol and port):

```dotenv
FRONTEND_URL=https://192.168.1.100:3333
```

Restart after changing:

```bash
docker compose -f compose.yml restart backend
```

---

### Problem: SSL certificate errors / nginx won't start

Symptoms: `frontend` container exits immediately; logs show `no such file or directory` for cert files.

**Fix:** Confirm certs exist and are in the right location:

```bash
ls -la ssl/
# Expected: server.crt  server.key
```

If missing, re-run Step 2. Then restart:

```bash
docker compose -f compose.yml restart frontend
```

---

### Problem: Database connection refused

```
Error: connect ECONNREFUSED db:5432
```

**Fix:** The `db` container may still be initialising. The `backend` service waits for the `healthy` condition, but if you changed DB credentials after the volume was already created the existing data won't match.

To reset the database (⚠ destroys all data):

```bash
docker compose -f compose.yml down -v
docker compose -f compose.yml up -d
```

---

### Problem: Push notifications not working

**Fix:** Generate real VAPID keys and update `backend/.env`:

```bash
npx web-push generate-vapid-keys
```

Copy both keys into `backend/.env`, then:

```bash
docker compose -f compose.yml restart backend
```

---

## Updating to a New Image Version

```bash
# Edit compose.yml to bump the image tag, e.g. v0.1 → v0.2
# Then:
docker compose -f compose.yml pull
docker compose -f compose.yml up -d
```

---

## Stopping and Removing

```bash
# Stop without removing data
docker compose -f compose.yml down

# Stop and remove all volumes (⚠ deletes database)
docker compose -f compose.yml down -v
```
