# CLAUDE.md — job-ops fork (BoruChen0908)

## Project Overview

This is a fork of [DaKheera47/job-ops](https://github.com/DaKheera47/job-ops) — a self-hosted, Docker-based job search pipeline.

**Fork purpose:** Extend job-ops with AI Safety-focused job sources, custom scoring prompts, and dynamic search term expansion for internship hunting.

## Architecture

npm monorepo with 4 workspaces:

| Workspace | Path | Tech |
|-----------|------|------|
| orchestrator | `orchestrator/` | React 18 + Vite (client), Express (server), SQLite + Drizzle ORM |
| extractors | `extractors/*` | TypeScript plugin modules (7 built-in + simplifyjobs) |
| shared | `shared/` | Shared types, Zod schemas, prompt templates |
| docs-site | `docs-site/` | Docusaurus |

### Pipeline flow

```
discover (extractors) → import (SQLite) → score (LLM) → extract terms (LLM) → select (topN) → tailor (LLM) → PDF (RxResume API)
```

### Extractor plugin system

Extractors are auto-discovered from `extractors/*/src/manifest.ts`. To add a new extractor:

1. Register source ID in `shared/src/extractors/index.ts` (EXTRACTOR_SOURCE_IDS + EXTRACTOR_SOURCE_METADATA)
2. Create `extractors/{name}/package.json` (type: "module"), `tsconfig.json`, `src/manifest.ts`, `src/run.ts`
3. Implement `ExtractorManifest` interface — the registry discovers it automatically

Also add source ID to `orchestrator/src/client/pages/orchestrator/utils.ts` (`getEnabledSources` whitelist) and to `Dockerfile` build/production stages.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | 5.9 |
| Frontend | React 18 + Vite | 4.x |
| Backend | Express.js | - |
| Database | SQLite + Drizzle ORM | - |
| UI | Radix UI + TailwindCSS 4 | - |
| State | React Query (@tanstack) | 5.x |
| Validation | Zod | - |
| Linter/Formatter | Biome (not ESLint/Prettier) | 2.3 |
| Testing | Vitest + Testing Library | 142 test files |
| Runtime | Node 22 (Volta pinned) | 22.22.1 |
| Python | Required for jobspy extractor | 3.x |

## Development

### Running locally

```bash
# Docker (production mode)
docker compose up -d
# App at http://localhost:3005

# Katherine's instance (port 3006)
docker compose -f docker-compose.katherine.yml up -d

# Dev mode (without Docker)
cd orchestrator && npm run dev
```

### Common commands

| Task | Command |
|------|---------|
| Run tests | `npm --workspace orchestrator run test:run` |
| Type check all | `npm run check:types` |
| Lint + format | `./orchestrator/node_modules/.bin/biome ci .` |
| Build client | `npm --workspace orchestrator run build:client` |
| DB migration | `cd orchestrator && npm run db:migrate` |
| Sync upstream | `git fetch upstream && git merge upstream/main` |

### CI-parity checks (run before committing)

```bash
./orchestrator/node_modules/.bin/biome ci .
npm run check:types:shared
npm --workspace orchestrator run check:types
npm --workspace gradcracker-extractor run check:types
npm --workspace ukvisajobs-extractor run check:types
npm --workspace orchestrator run build:client
npm --workspace orchestrator run test:run
```

If better-sqlite3 ABI mismatch: `npm --workspace orchestrator rebuild better-sqlite3`

### Code conventions

- Files: kebab-case (`email-router.ts`), Components: PascalCase (`ReadyPanel.tsx`)
- Tests: `*.test.ts` / `*.test.tsx`, co-located or in `tests/` dir
- Commits: conventional commits (`feat:`, `fix:`, `chore:`)
- Error handling: structured `{ ok, data/error, meta.requestId }` (see `AGENTS.md`)
- Patterns: Repository (data access) → Service (business logic) → Route (API)
- Vite aliases: `@/` → `src/`, `@client/` → `src/client/`, `@server/` → `src/server/`. Client-side hooks/queries use `@client/hooks/...`, not `@/hooks/...`
- See `AGENTS.md` for API response format, logging rules, SSE standards

## Fork-specific customizations

### Done
1. **SimplifyJobs extractor** — fetches intern/new-grad listings from SimplifyJobs GitHub JSON repos (Summer2026-Internships + New-Grad-Positions). Filters by active/visible status and search terms.
2. **Dynamic term expansion** — after scoring, LLM analyzes top JDs to discover new search terms. Stored in `recommended_terms` table, shown as accept/dismiss chips in Run Pipeline dialog. Accepted terms auto-merge into next pipeline run's search terms and appear in the search terms list immediately on accept.
3. **Extractor-level dedup** — all extractors now call `getExistingJobUrls()` and filter out already-known job URLs before returning results. Ensures per-term budget is spent on new listings, not re-discovering duplicates. Shared utility: `shared/src/utils/filter-existing-jobs.ts`.
4. **Multi-user support** — separate Docker instances via `docker-compose.katherine.yml` with bind-mount data isolation (`./data-katherine`). Each user gets their own DB, settings, and pipeline state.

### Planned
1. **More extractors:** SpeedyApply AI-College-Jobs, AI Safety job boards (aisafety.com/jobs, 80000hours.org)
2. **Scorer prompt tuning:** AI Safety keyword weighting in suitability scoring
3. **Deeper extractor dedup:** pass existing URLs into subprocess extractors (JobSpy, HiringCafe) so they skip known URLs during crawling, not just after

## Git workflow

- `origin` → `BoruChen0908/job-ops` (this fork)
- `upstream` → `DaKheera47/job-ops` (original)
- Sync upstream: `git fetch upstream && git merge upstream/main`

## Where to look

| I want to... | Look at... |
|--------------|-----------|
| Add a new job source | `shared/src/extractors/index.ts` + `extractors/{name}/` |
| Change AI scoring | `orchestrator/src/server/services/scorer.ts` |
| Change resume tailoring | `orchestrator/src/server/services/summary.ts` |
| Change AI prompts | `shared/src/prompt-template-definitions.ts` |
| Add an API endpoint | `orchestrator/src/server/api/routes/` |
| Add a UI page | `orchestrator/src/client/pages/` |
| Change DB schema | `orchestrator/src/server/db/schema.ts` |
| Change pipeline steps | `orchestrator/src/server/pipeline/steps/` |
| Configure LLM providers | `orchestrator/src/server/services/llm/providers/` |
| Change term expansion | `orchestrator/src/server/services/term-expansion.ts` + `pipeline/steps/extract-terms.ts` |
| Manage recommended terms | `orchestrator/src/server/repositories/recommended-terms.ts` + `api/routes/recommended-terms.ts` |
| Change extractor dedup | `shared/src/utils/filter-existing-jobs.ts` (utility) + each `extractors/*/manifest.ts` |
| Add another user instance | Copy `docker-compose.katherine.yml`, change container name, port, and data dir |
| Register a new prompt template | `shared/src/prompt-template-definitions.ts` AND `shared/src/settings-registry.ts` (both required) |
| Understand shared types | `shared/src/types/` (extractors, jobs, settings) |

## Architecture Notes (auto-generated by /deep-init)

Key module relationships and non-obvious dependencies discovered during architecture mapping.
See `.claude/rules/architecture-overview.md` for the full map, `.claude/architecture/mindmap_*_full.md` for call chains.

- **settingsRepo is the #1 cross-cut dependency** — 14+ service imports, 4 pipeline steps, 3 routes. Schema changes propagate widely. Always check `shared/src/settings-registry.ts` first.
- **SSE is the real-time backbone** — pipeline progress, ghostwriter streaming, and bulk job actions all flow through `infra/sse.ts` (server) / `lib/sse.ts` (client). Not WebSocket.
- **LLM ProviderStrategy pattern** — supports 5 providers with retry + capability fallback. Mode selection is cached per-provider. See `services/llm/providers/`.
- **Extractor registration requires 4 touch points** — shared registry, `manifest.ts`, Dockerfile COPY, client whitelist (`getEnabledSources`).
- **Dedup happens at extractor level** — `getExistingJobUrls()` filters before extraction, not after. Per-term budget is spent on new listings only.
