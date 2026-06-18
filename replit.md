# Team 1 — Revenue QC Root-Cause Agent · Project Workspace

A shared, no-login team workspace where a 4-person team aligns on their problem statement, brainstorms ideas (with voting), and tracks a 3-week project plan — all backed by a central Postgres DB so every visitor sees the same live data (frontend polls every ~5s).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run run-qc-agent` — trigger a QC Agent run (used by the Scheduled Deployment)
- Required env: `DATABASE_URL` — Postgres connection string
- QC Agent env (secrets): `TABLEAU_POD`, `TABLEAU_SITE`, `TABLEAU_PAT_NAME`, `TABLEAU_PAT_SECRET`, `TABLEAU_DATASOURCE_LUID`, `ANTHROPIC_API_KEY`. Optional: `TABLEAU_API_VERSION` (default `3.21`), `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`), `QC_AGENT_URL` (target for the scheduled script).

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Frontend: `artifacts/workspace-app/src` (single page at `/`, components under `src/components`)
- API routes: `artifacts/api-server/src/routes` (`problem.ts`, `ideas.ts`, `plan.ts`, `qc.ts`)
- QC Agent services: `artifacts/api-server/src/services` (`tableau.ts` — VizQL Data Service pull, `claude.ts` — Anthropic root-cause reasoning, `qcAgent.ts` — orchestration); secret startup check in `src/lib/secrets.ts`
- QC Agent UI: `artifacts/workspace-app/src/components/QcAgent.tsx`
- Scheduled trigger: `scripts/src/run-qc-agent.ts`
- API contract (source of truth): `lib/api-spec/openapi.yaml` → codegen into `lib/api-client-react` (hooks) and `lib/api-zod` (schemas)
- DB schema (source of truth): `lib/db/src/schema` (`problemCards.ts`, `ideas.ts`, `tasks.ts`)
- Theme/colors: `artifacts/workspace-app/src/index.css`

## Architecture decisions

- No auth by design — anyone with the URL can view/edit; brainstorm attribution is a free-text name field only.
- Shared state lives in Postgres; the frontend polls (`refetchInterval: 5000`) so teammates' edits appear without manual refresh. No localStorage for shared state.
- Problem cards are seeded rows keyed by `situation/complication/resolution/opportunity`; content is editable but rows are fixed.
- The 3-week plan's week metadata (title, date range, theme) is static in `plan.ts`; only tasks are stored in the DB. Tasks start empty; "Reset plan" deletes all tasks.

## QC Agent

- Pulls monitored metrics from a published Tableau data source via the VizQL Data Service (sign-in with a Personal Access Token, then `read-metadata` / `query-datasource`). PAT session token is cached ~110 min.
- Monitored metrics are configured in the DB (`qc_metric_config`): a measure field + aggregation, an optional dimension breakdown, and a per-metric threshold % (default 10).
- Each run snapshots current values (`qc_snapshots`) and compares to the previous snapshot per metric key. Flags: missing/null value, zero value, change beyond threshold %, or a dimension value that disappeared.
- For each deviation it calls Anthropic Claude (direct `@anthropic-ai/sdk`, the team's own `ANTHROPIC_API_KEY` — NOT the Replit proxy) for a directional indicator: `source_data | mapping_files | unclear` with confidence, explanation, and a recommended check. Claude failures degrade gracefully (deviation still recorded as `unclear`).
- Triggers: manual button (`POST /api/qc/run`), webhook (`POST /api/tableau-webhook`), and a Scheduled Deployment running `scripts/src/run-qc-agent.ts` — default cron `0 7 * * 1-5` (weekdays 07:00). Set `QC_AGENT_URL` to the published `/api/qc/run` URL in the scheduled job.
- "Test connection" (`POST /api/qc/test-connection`) returns connected status, data source name, and field count, or a clear error. Missing secrets are reported explicitly (no silent fallback) and logged once at server startup.

## Product

A shared team workspace: editable problem-statement cards, a brainstorm board with voting, a 3-week task plan with progress tracking, and a read-only scoring rubric, plus a live Demo Day countdown.

## User preferences

- Design: clean/corporate — red accent #CC0000, near-black #121212 text, neutral greys, white cards, rectangular uppercase-bold buttons, Arial/Helvetica/sans-serif. No emojis in the UI.

## Gotchas

- After changing any `lib/*` package (db schema, spec), run `pnpm run typecheck:libs` before leaf typechecks, or artifacts see stale declarations.
- After editing `openapi.yaml`, re-run `pnpm --filter @workspace/api-spec run codegen`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
