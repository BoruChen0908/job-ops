# CLAUDE.md — job-ops fork (BoruChen0908)

## Project Overview

This is a fork of [DaKheera47/job-ops](https://github.com/DaKheera47/job-ops) — a self-hosted, Docker-based job search pipeline.

**Fork purpose:** Extend job-ops with AI Safety-focused job sources, custom scoring prompts, and dynamic search term expansion for internship hunting.

## Architecture

npm monorepo with 4 workspaces:

| Workspace | Path | Tech |
|-----------|------|------|
| orchestrator | `orchestrator/` | React 18 + Vite (client), Express (server), SQLite + Drizzle ORM |
| extractors | `extractors/*` | TypeScript plugin modules (7 built-in + custom) |
| shared | `shared/` | Shared types, Zod schemas, prompt templates |
| docs-site | `docs-site/` | Docusaurus |

### Pipeline flow

```
discover (extractors) → import (SQLite) → score (LLM) → select (topN) → tailor (LLM) → PDF (RxResume API)
```

### Extractor plugin system

Extractors are auto-discovered from `extractors/*/src/manifest.ts`. To add a new extractor:

1. Register source ID in `shared/src/extractors/index.ts` (EXTRACTOR_SOURCE_IDS + EXTRACTOR_SOURCE_METADATA)
2. Create `extractors/{name}/package.json` (type: "module"), `tsconfig.json`, `src/manifest.ts`, `src/run.ts`
3. Implement `ExtractorManifest` interface — the registry discovers it automatically

No changes needed to orchestrator code.

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
- See `AGENTS.md` for API response format, logging rules, SSE standards

## Fork-specific customizations (planned)

1. **New extractors:** SimplifyJobs GitHub JSON, SpeedyApply AI-College-Jobs, AI Safety job boards
2. **Scorer prompt tuning:** AI Safety keyword weighting in suitability scoring
3. **Dynamic term expansion:** LLM generates new search terms from discovered JDs

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
| Understand shared types | `shared/src/types/` (extractors, jobs, settings) |
