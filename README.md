# Production Management Web App

Full-stack production management app for factory teams. It uses React, Vite, TypeScript, TailwindCSS, TanStack Query, Express, Prisma, PostgreSQL, Google OAuth, JWT HTTP-only cookies, RBAC, audit logs, Excel/PDF reports, Docker, and deployment-friendly env configuration.

## Structure

```text
frontend/
backend/
docker-compose.yml
.github/workflows/deploy.yml
README.md
```

## Features

- Email/password sign-in for local use, plus optional Google OAuth 2.0 sign-in with Passport.js.
- Persistent login through JWT stored in an HTTP-only cookie.
- Roles: `ADMIN` and `USER`.
- Single-screen production entry with company buttons, SKU tiles, touch-friendly numeric inputs, damage toggle, and capacity warning.
- Audit logs for create, update, and delete operations with previous values, new values, actor, and timestamp.
- Reports filtered by date range with Excel and PDF download.
- Admin tab for SKU management and user role changes.
- Simulated `Download App` ZIP endpoint.

## Environment Variables

Backend:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require&pgbouncer=true&connection_limit=1"
JWT_SECRET="long-random-secret"
GOOGLE_CLIENT_ID="google-oauth-client-id"
GOOGLE_CLIENT_SECRET="google-oauth-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/auth/google/callback"
FRONTEND_URL="http://localhost:5173"
PORT=5000
NODE_ENV="development"
```

Frontend:

```bash
VITE_API_URL="http://localhost:5000"
```

For Neon, use the pooled connection string when possible. Prisma works well with a pooled URL like:

```bash
DATABASE_URL="postgresql://...neon.tech/db?sslmode=require&pgbouncer=true&connection_limit=1"
```

## Local Development

1. Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Create env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Start PostgreSQL:

```bash
docker compose up postgres
```

4. Run Prisma migration and seed:

```bash
cd backend
npm run prisma:migrate
npm run seed
```

Seeded local users:

```text
admin@example.com / admin12345
user@example.com / user12345
```

5. Start backend and frontend:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000`

## Docker Usage

```bash
docker compose up --build
```

The compose file includes:

- `frontend`
- `backend`
- `postgres`

After the first boot, run migrations and seed data inside the backend container if needed:

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```

## Google OAuth Setup

Create an OAuth 2.0 Client ID in Google Cloud Console.

Authorized redirect URIs:

```text
http://localhost:5000/auth/google/callback
https://your-render-app.onrender.com/auth/google/callback
```

Set:

```bash
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL
```

The app works with email/password without Google credentials. `/auth/google` returns a setup message until Google credentials are present.

## Deployment

### Database: Neon

1. Create a Neon PostgreSQL project.
2. Copy the pooled connection string.
3. Add `?sslmode=require&pgbouncer=true&connection_limit=1` if it is not already present.
4. Set `DATABASE_URL` in Render.

### Backend: Render

Create a Web Service from `backend/`.

Build command:

```bash
npm install && npm run prisma:generate && npm run build
```

Start command:

```bash
npm run prisma:deploy && npm run start
```

Set env vars:

```bash
DATABASE_URL
JWT_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://your-render-app.onrender.com/auth/google/callback
FRONTEND_URL=https://your-vercel-app.vercel.app
NODE_ENV=production
```

The backend exposes `GET /health` so Render cold starts and health checks have a lightweight endpoint.

### Frontend: Vercel

Import the repository and set the project root to `frontend/`.

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```

Set:

```bash
VITE_API_URL=https://your-render-app.onrender.com
```

## RBAC

`ADMIN` can:

- Add, edit, and delete SKU.
- Edit production entries through the API.
- Change user roles.
- View all logs.

`USER` can:

- Create production entries.
- View logs.
- Download reports.

## API Summary

Auth:

- `POST /auth/login`
- `POST /auth/signup`
- `GET /auth/google`
- `GET /auth/google/callback`
- `GET /auth/me`
- `POST /auth/logout`

Users:

- `GET /users`
- `PATCH /users/:id/role`

SKU:

- `POST /sku`
- `GET /sku`
- `PUT /sku/:id`
- `DELETE /sku/:id`

Production:

- `POST /entries`
- `GET /entries`
- `PUT /entries/:id`

Logs:

- `GET /logs?date=YYYY-MM-DD`

Reports:

- `GET /reports?startDate=&endDate=&format=pdf|excel`
