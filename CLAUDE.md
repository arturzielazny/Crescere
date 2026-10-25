# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Crescere** (v0.1.0) - A pediatric growth tracker using WHO child growth standards.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server with HMR + the Worker API and a local D1 database
npm run build        # Create production build in dist/ (client + Worker)
npm run preview      # Build and serve the production build locally
npm run deploy       # Build, apply D1 migrations remotely, wrangler deploy
npm run test         # Front-end unit tests, then Worker tests
npm run test:watch   # Front-end unit tests in watch mode
npm run test:worker  # Worker tests only (run in workerd against real local D1)
npm run db:migrate:local   # Apply D1 migrations to the local database
npm run lint         # Check code with ESLint (src/, worker/, scripts/)
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format code with Prettier
npm run format:check # Check formatting without changes
```

**Pre-commit hooks:** Husky + lint-staged automatically runs ESLint, Prettier, and unit tests on every commit.

**Deployment:** Push to `master` triggers GitHub Actions: tests, D1 migrations, `wrangler deploy` to Cloudflare Workers (needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets).

## Architecture Overview

Svelte 5 SPA for pediatric growth monitoring, served by a Cloudflare Worker (`worker/`) that also provides the JSON API under `/api/*`, backed by Cloudflare D1 (SQLite).

### Core Data Flow

1. **State Management** (`src/stores/childStore.js`): Central `childStore` (writable) holds `children[]` array and `activeChildId`. Derived stores (`activeChild`, `measurementsWithZScores`) compute current selection and enriched data. All mutations use **optimistic updates** — the UI updates instantly, then an async API call runs in the background. On failure, the store rolls back and `dataError` is set.

2. **Persistence** (`src/lib/api.js` → `worker/data.js` → D1): `api.js` is a thin `fetch` client for the Worker. Tables: `users`, `sessions`, `children`, `measurements`, `user_preferences`, `child_shares`, `shared_child_access` (schema in `migrations/`). There is no row-level security: every Worker query must scope itself to the signed-in user. There is no localStorage persistence for child data.

3. **Authentication** (`src/stores/authStore.js` → `worker/auth.js`): cookie sessions (`HttpOnly`, hashed tokens in D1).
   - Guest: auto-created on first visit (`users` row with no email)
   - Save account (`claimAccount`): sets email + password on the same row, so all data stays attached
   - Email + password sign-in; change password requires the current one
   - No email is ever sent: no magic links, no verification, no reset email. Operators reset passwords with `scripts/set-password.js`.

4. **Z-Score Calculation** (`src/lib/zscore.js`): Implements WHO LMS method with two variants:
   - Standard LMS for length-for-age, head circumference-for-age
   - Bounded LMS for weight-for-age, weight-for-length (clamps at ±3 SD with linear extrapolation)

5. **WHO Reference Data** (`src/data/`): Four datasets in compact array format `{ [sex]: [[l,m,s], ...] }` where array index = day. Sex: 1=male, 2=female. Age range: 0-1826 days (0-5 years). WFL uses length strings as keys.

6. **Sharing** (`src/lib/share.js`, `worker/data.js`): token-based live sharing (`#live-share=<token>`). Named share links with read-only access. Both parties must be authenticated. Owner can revoke access at any time.

7. **i18n** (`src/stores/i18n.js`): English (en) and Polish (pl). Auto-detects browser language.

### Special Child Types

- **Example child** (`exampleChildId`): Client-side demo data, never synced. Auto-removed when user adds a real child.
- **Pending child** (`pendingChildIds`): Created locally but missing required fields (birthDate, sex). Synced to the backend once profile is complete.

### Key Data Models

```javascript
// Child
{ id: string, profile: { name, birthDate, sex }, measurements: [] }

// Measurement (weight in grams, length/headCirc in cm)
{ id: string, date: string, weight: number|null, length: number|null, headCirc: number|null }
```

### Charts

Charts use Chart.js (tree-shaken imports) organized into **vertical groups** (Weight, Length, Head Circumference, Weight-for-Length). Groups are drag-reorderable as a unit; individual charts are not. Chart types within each group:
- **Growth charts**: Raw measurements over time with WHO reference bands (±1SD, ±2SD)
- **Z-score charts**: Standard deviation scores over time
- **Velocity charts**: Daily gain rate between consecutive measurements

Chart features:
- Vertical "now" line at current age (chartjs-plugin-annotation)
- 4-level z-score coloring: green bold (±1SD), yellow (±1-2SD), red (±2-3SD), red bold (>±3SD)
- Future measurements as faded triangles
- Column count selector (2/3/4 groups per row)

Chart configuration is persisted in localStorage via `src/stores/chartStore.js` with automatic migration from the old flat format to the grouped format.

## Code Style

- 2-space indentation, single quotes, semicolons (enforced by Prettier)
- PascalCase for `.svelte` components, lowercase for `.js` utilities
- Tailwind CSS v4 via `@tailwindcss/vite` plugin (no separate tailwind.config.js)
- JavaScript with JSDoc type hints (`checkJs: true`)
- ESLint 9 flat config with Svelte plugin
- Prefix unused variables with `_` (e.g., `_err` in catch blocks)

## Svelte 5 Gotchas

**Always use optional chaining for derived store values in templates.** Even inside `{#if $store}` blocks, derived reactive variables can be momentarily undefined during render cycles:

```svelte
<!-- Wrong - can throw -->
{#if $activeChild}
  {profile.birthDate}
{/if}

<!-- Correct -->
{#if $activeChild}
  {profile?.birthDate}
{/if}
```

## Ideas & Backlog

`ideas.md` tracks improvement ideas, bugs, and feature requests. When working on items from this file:

1. Mark completed items by changing `☐` to `☑` and adding a short summary of what was done
2. When implementing a new feature or fix that corresponds to an ideas.md item, update it in the same commit
3. New ideas discovered during development can be added to the appropriate section

## Build Optimizations

Bundle: ~690 KB (215 KB gzipped)

1. **Tree-shaken Chart.js**: Only imports LineController, LineElement, PointElement, LinearScale, Filler, Legend, Tooltip.

2. **Compact WHO data**: Arrays `[l,m,s]` instead of objects. Run `node scripts/compress-who-data.js` to recompress if data changes.

## Cloudflare Workers + D1

- `wrangler.jsonc`: Worker config — D1 binding `DB`, rate limiter `AUTH_LIMITER`, `PASSWORD_ITERATIONS` var, daily cleanup cron, static assets (the built SPA) with `/api/*` routed to the Worker first.
- `worker/index.js`: router (route table), CSRF checks (same-origin + JSON content type for writes), error handling, `scheduled` cleanup.
- `migrations/`: D1 schema. Add changes as new numbered migration files; never edit an applied one.
- Worker tests (`worker/test/`) use `@cloudflare/vitest-plugin` (`vitest.worker.config.js`) and exercise the real `src/lib/api.js` through a fake browser with a cookie jar. Every new route needs a test that another user can't reach the data.
- `src/lib/__mocks__/api.js` is an in-memory stand-in for `api.js` used by `childStore` unit tests; keep it in sync with `api.js`.
- Dev: `@cloudflare/vite-plugin` runs the Worker and local D1 (`.wrangler/state/`) inside `vite`.
