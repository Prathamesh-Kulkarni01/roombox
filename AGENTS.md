# Roombox AI Agent Guide

This file helps AI coding agents understand the Roombox codebase quickly and avoid common project-specific mistakes.

## Purpose
- Use this as the first reference for build/test commands, architecture boundaries, and deployment conventions.
- Preserve project-specific guidance while linking to authoritative docs when available.

## Key commands
Most important scripts are defined in `package.json`.

- `npm run dev` — start the app in local development mode with Firebase emulator-safe defaults.
- `npm run dev:emulator` — start local dev explicitly using Firebase emulators.
- `npm run dev:staging` — run with `.env.staging` for sandbox/cloud staging.
- `npm run dev:prod` — run with `.env.production` for production-like environment.
- `npm run build` — production build via `scripts/vercel-build.ts` and `ts-node`.
- `npm run lint` — run Next.js lint.
- `npm run typecheck` — run `tsc --noEmit`.

### Tests and quality gates
- `npm run test:e2e` — Playwright end-to-end tests.
- `npm run test:smoke` — Playwright smoke tests only.
- `npm run test:ui` — Vitest UI runner.
- `npm run test:framework`, `npm run test:application`, `npm run test:architecture`, `npm run test:contracts`, `npm run test:simulation` — targeted Vitest groups.
- `npm run quality-gate` — lint, typecheck, build, `vitest run --passWithNoTests`, and list Playwright tests.
- `npm run stability-check` — typecheck, lint, smoke tests.

### Certification and emulator workflows
- `npm run test:e2e-runner` — Playwright tests against local Firebase emulators.
- `npm run certify:golden`, `npm run certify:smoke`, `npm run certify:golden:standard`, `npm run certify:golden:enterprise`, etc. — certification flows executed inside Firebase emulators.
- `npm run certify:golden:headed`, `npm run certify:small:headed` — headed Playwright cert runs.

### Database and migration workflow
- `npm run migrate` — run migration runner in `scripts/migrations/runner.ts`.
- `npm run migrate:local` — apply migrations against local emulator.
- `npm run migrate:staging` — apply staging migrations using `.env.staging`.
- `npm run migrate:prod` — apply production migrations using `.env.production`.

## Architecture and project layout
- `src/` — main application source.
- `src/app/`, `src/components/`, `src/hooks/`, `src/context/`, `src/lib/` — app-level structure following Next.js conventions.
- `src/ai/` — AI-related helpers and dev tools.
- `lab/` — certification and validation tests used by `certify:*` scripts.
- `scripts/` — tooling, migrations, audits, verification, and build helpers.
- `public/` — public assets, service workers, and manifest files.
- `playwright/` — Playwright reports and test artifacts.

## Conventions and important notes
- The repo uses Next.js `16.x`, TypeScript, `vitest`, `playwright`, and `cypress`.
- Local development should default to emulator-safe environments. Avoid production data unless explicitly using `.env.production` or `npm run dev:prod`.
- Build is not a plain `next build`; it is orchestrated by `scripts/vercel-build.ts`.
- Migrations live in `scripts/migrations/` and should support dry-run and rollback paths.
- `ENVIRONMENT_GUIDE.md` is the source of truth for environment isolation and deployment rules.
- `README.md` describes the product domain and portal boundaries.

## Recommended workflow for agents
1. Identify the requested change.
2. Check `package.json` for existing scripts and workflows.
3. For runtime or deployment changes, consult `ENVIRONMENT_GUIDE.md`.
4. For test/integration work, prefer `lab/` certification patterns and `tests/` directories.
5. Preserve existing env-safe patterns and avoid editing production-only config unless the change is explicitly about production deployment.

## Helpful docs
- `README.md` — product overview and feature context.
- `ENVIRONMENT_GUIDE.md` — environment isolation, safe local development, and deployment workflow.
- `STABILITY.md` — stability and release expectations.
- `firebase.json`, `firestore.rules`, and `.env.*` — Firebase and environment configuration.

## When to update this file
- When scripts in `package.json` change.
- When the environment workflow in `ENVIRONMENT_GUIDE.md` changes.
- When new certification or test workflow directories are added.
