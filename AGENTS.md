# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project

UnitTCMS is a self-hosted, open-source test case management system. Monorepo with three independent npm projects (`backend`, `frontend`, `docs`) plus root-level shared tooling (lint/format/unit tests) and a root `e2e` Playwright suite.

## Commands

This is a pnpm workspace (`pnpm-workspace.yaml`: `backend`, `frontend`, `docs`) with a single `pnpm-lock.yaml` at the root — `pnpm install` at the repo root installs all three packages. Run scripts from repo root unless noted.

```bash
pnpm run format:check      # prettier --check (frontend + backend)
pnpm run format            # prettier --write
pnpm run lint               # eslint (flat config at eslint.config.mjs, covers backend + frontend)
pnpm run lint:fix
pnpm test                   # vitest, watch mode — picks up *.test.ts/js anywhere outside node_modules/e2e
pnpm exec vitest run                              # single run (what CI does)
pnpm exec vitest run path/to/file.test.ts         # single test file
pnpm run coverage           # vitest run --coverage
```

E2E (Playwright specs live in `/e2e`, not under frontend or backend):

```bash
pnpm run e2e:dev     # builds+starts backend on :8001 and frontend on :8000 itself, then runs tests
pnpm run e2e:docker  # runs against the docker-compose stack — start that stack first
pnpm run report      # show last Playwright HTML report
pnpm exec playwright test e2e/first-user-signup.spec.ts --config playwright.dev.config.ts   # single spec
```

Backend (`cd backend`, or `pnpm --filter backend <script>` from root):

```bash
pnpm run dev      # tsoa spec-and-routes once, then two nodemon watchers (tsoa regen on controller change, ts-node server on :8001)
pnpm run build    # tsoa spec-and-routes + tsc -> dist/, copies swagger.json
pnpm run migrate  # sequelize db:migrate (sqlite file at backend/database/database.sqlite, or $DATABASE_PATH)
pnpm run seed     # sequelize db:seed:all
pnpm run drop     # sequelize db:migrate:undo:all
```

Frontend (`cd frontend`, or `pnpm --filter frontend <script>` from root):

```bash
pnpm run dev    # next dev -p 8000 (expects backend reachable per NEXT_PUBLIC_BACKEND_ORIGIN / frontend/config/config.ts)
pnpm run build
pnpm run start
pnpm run lint   # next lint, separate from root eslint
```

In local dev, frontend (`:8000`) and backend (`:8001`) run as separate processes; the frontend talks to the backend via `NEXT_PUBLIC_BACKEND_ORIGIN`. In production (`docker-compose up --build`, see `Dockerfile`/`entrypoint.js`), a single Node process mounts the backend Express app at `API_PATH` (default `/api`) in front of the Next.js handler, and runs migrations (and seeding, if `IS_DEMO=true`) on startup — there is no separate backend port in that mode.

## Backend architecture

Express + Sequelize (SQLite). Two routing mechanisms coexist — know which one to extend:

- **Legacy route-factory pattern** (almost all existing resources: projects, folders, cases, runs, runcases, members, tags, comments, attachments, steps, users, home). Each `backend/routes/<resource>/<action>.js` exports a default function `(sequelize) => express.Router()`. These are imported and `app.use()`-mounted by hand in `backend/server.ts`; nothing is auto-discovered. Models are also factory functions, `defineX(sequelize, DataTypes)` (see `backend/models/*.js`), called inside each route file rather than imported as singletons.
- **TSOA controllers** (`backend/controllers/*.ts`, decorator-based, e.g. `HealthController.ts`). `tsoa spec-and-routes` (run via `npm run dev`/`npm run build`, or manually with `npx tsoa spec-and-routes`) generates `backend/routes.ts` (registered in `server.ts` via `RegisterRoutes(app)`) and `backend/public/swagger.json`, served at `/api-docs`. **After adding/changing a controller you must regenerate** or the route won't exist and swagger will be stale.

Auth/permissions span two layers — read both before changing access control:

- `backend/middleware/auth.js`: `verifySignedIn` decodes the JWT from `Authorization: Bearer <token>` and sets `req.userId`; `verifyAdmin` checks the *global* role (`roles` in `backend/config/enums.js` / `authSettings.js`: `administrator` vs `user`).
- `backend/middleware/verifyVisible.js` / `verifyEditable.js`: *project-level* access. A project is visible if public, owned by the user, or the user is a `Member` (`memberRoles`: `manager`, `developer`, `reporter`). These middlewares resolve the owning `projectId` from whatever id is on the request (`folderId`, `caseId`, `runId`, `commentableId`, etc.) by walking the association chain, then check membership — there's a separate `verify*From<X>Id` function per entity because the lookup path differs.

DB: migrations in `backend/migrations/`, models in `backend/models/` (auto-loaded and associated by `backend/models/index.js` — adding a model file is enough, no manual registration). Numeric enum columns (status, priority, type, etc.) are mapped to labels in `backend/config/enums.js`, which must stay in sync with `frontend/config/selection.ts`.

## Frontend architecture

Next.js 14 App Router under `frontend/src/app/[locale]/...`. Routing mirrors the domain: `projects/[projectId]/{folders,runs,members,settings,home}`. Page-adjacent `*Control.ts` files (e.g. `runsControl.ts`, `foldersControl.ts`, `membersControl.ts`) hold the data-fetching/mutation logic for that route — there's no central `api/` client module, look for the control file next to the page.

- i18n via `next-intl`: locales are `de, en, pt-BR, zh-CN, ja` (`frontend/src/i18n/routing.ts`), URL always carries the locale prefix, strings live in `frontend/messages/`. Adding a language means adding it to `routing.ts` plus a messages file (see PR #260 referenced in README for a worked example).
- `frontend/utils/request.ts` + `token.ts`/`TokenProvider.tsx`: shared fetch wrapper that attaches the JWT.
- `frontend/config/config.ts`: resolves the backend base URL differently for SSR vs client and dev vs prod (see comments in that file) — use `Config.apiServer`, don't hardcode `/api` or a port.
- UI: HeroUI components + Tailwind; `frontend/components/` holds cross-route shared components, route-specific components live next to their page.

## Testing notes

- Backend route tests (`backend/routes/**/*.test.js`) use `vitest` + `supertest`, mounting just the one route's router on a bare `express()` app, and mock both the auth/visibility middleware and the Sequelize model factories (see `backend/routes/cases/index.test.js` for the pattern: `vi.mock('../../middleware/auth.js', ...)`, `vi.mock('../../models/cases.js', ...)`).
- The root `vitest.config.ts` has no `frontend`/`backend` split — it discovers test files anywhere in the repo (excluding `node_modules`, `dist`, `e2e`, `docs`).
- `docs/` is a separate Docusaurus site with its own `package.json`/lockfile and its own deploy workflow (`.github/workflows/deploy-docs.yml`) — it's not part of the root npm scripts.
