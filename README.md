# Team 1 — Revenue QC Root-Cause Agent · Project Workspace

A shared, multi-user team workspace for a 4-person team running an internal "AI Team Challenge." It holds the team's problem statement, a brainstorm board, and a 3-week project plan with progress tracking.

All data lives in a central PostgreSQL database, so **everyone who opens the app URL sees the same, up-to-date content**. When one person edits something, teammates see it automatically — the frontend polls the server every ~5 seconds. There is **no login**: anyone with the URL can view and edit. For attribution on brainstorm ideas, contributors just type their name in a field (no accounts).

## Features

- **Problem statement** — four editable cards (Situation, Complication, Resolution, Opportunity), each with a Save button; edits persist to the server.
- **Brainstorm board** — add ideas with your name, upvote ideas, remove ideas; cards are sorted by vote count. All ideas and votes are shared.
- **3-week project plan** — three week blocks, each starting empty. Add tasks with a done checkbox, editable name, owner, and target date. Overall progress (percentage + progress bar) and per-week "X / Y done" counts. A "Reset plan" button restores the three empty weeks.
- **Scoring rubric reference** — read-only tiles showing the 100-point challenge rubric.
- **Live Demo Day countdown** in the header (days remaining to 2026-07-17).

## Tech stack

- **Monorepo:** pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend:** React + Vite, TanStack Query, Tailwind CSS (served at `/`)
- **Backend:** Express 5 REST API (served at `/api`)
- **Database:** PostgreSQL + Drizzle ORM
- **API contract:** OpenAPI spec → generated React Query hooks and Zod schemas (Orval)

## Project structure

```
artifacts/
  workspace-app/   # React + Vite frontend (the UI)
  api-server/      # Express REST API
lib/
  api-spec/        # OpenAPI spec (source of truth for the API)
  api-client-react/# generated React Query hooks
  api-zod/         # generated Zod schemas
  db/              # Drizzle schema + DB client
```

## Environment variables

| Variable       | Required | Description                                            |
| -------------- | -------- | ------------------------------------------------------ |
| `DATABASE_URL` | Yes      | PostgreSQL connection string used by the API + Drizzle |
| `PORT`         | Yes      | Port each service binds to (provided by the platform)  |
| `BASE_PATH`    | Yes      | Base URL path for the frontend (provided by platform)  |

When running on Replit these are provisioned automatically. For local development, set at least `DATABASE_URL` to a PostgreSQL instance.

## Running locally

Requires Node.js 24 and pnpm.

```bash
# 1. Install dependencies
pnpm install

# 2. Provide a Postgres connection string
export DATABASE_URL="postgres://user:password@host:5432/dbname"

# 3. Push the database schema
pnpm --filter @workspace/db run push

# 4. Run the API server (http://localhost:5000/api)
pnpm --filter @workspace/api-server run dev

# 5. In another terminal, run the frontend
pnpm --filter @workspace/workspace-app run dev
```

Regenerate API hooks/schemas after editing the OpenAPI spec:

```bash
pnpm --filter @workspace/api-spec run codegen
```

Typecheck everything:

```bash
pnpm run typecheck
```

## Deployment

This app is designed to deploy on Replit. The frontend builds to static files and the API server runs as a Node service; both are routed through Replit's reverse proxy (frontend at `/`, API at `/api`). Use Replit's Publish flow to deploy — the production database schema is applied automatically during publish. Once published, share the `.replit.app` URL with your team.
