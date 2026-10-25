# Developer Onboarding Guide

Welcome to **Crescere** — a pediatric growth tracker built with Svelte 5 on Cloudflare Workers + D1. This guide covers everything you need to get the project running locally, understand the architecture, and start contributing.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Local Database](#local-database)
- [Project Structure](#project-structure)
- [Architecture Deep Dive](#architecture-deep-dive)
- [Data Flow](#data-flow)
- [Authentication](#authentication)
- [Sharing System](#sharing-system)
- [Charts](#charts)
- [Internationalization](#internationalization)
- [Testing](#testing)
- [Code Style & Linting](#code-style--linting)
- [Deployment](#deployment)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js** 20+
- **npm** (bundled with Node)

That's all. Wrangler (the Cloudflare CLI) is a dev dependency, and the local Worker runtime and D1 database run inside `npm run dev` — no Docker, no accounts.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/arturzielazny/Crescere.git
cd Crescere
npm install

# 2. Start dev server (applies D1 migrations to the local database first)
npm run dev
```

The app will be available at **http://localhost:5173/**. The Svelte app gets hot reloading, and requests to `/api/*` run the Worker (`worker/index.js`) against a local D1 database, through `@cloudflare/vite-plugin`.

## Local Database

The local D1 database is a SQLite file under `.wrangler/state/` (git-ignored). It persists between runs of `npm run dev`.

### Database schema

Migrations are in `migrations/`, applied in order by Wrangler:

1. **`0001_initial_schema.sql`**:
   - `users` (id, email, password_hash) — a guest user has no email and no password
   - `sessions` (token_hash, user_id, expires_at) — only a SHA-256 of the session token is stored
   - `children` (id, user_id, name, birth_date, sex, created_at, updated_at)
   - `measurements` (id, child_id, date, weight, length, head_circ)
   - `user_preferences` (user_id, active_child_id)
   - `child_shares` (token-based named share links)
   - `shared_child_access` (who accepted which shares)

There is no row-level security in D1: **every query in `worker/data.js` scopes itself to the signed-in user**. Keep that true when adding routes, and add an isolation test (see `worker/test/data.test.js`).

### Useful commands

```bash
npm run db:migrate:local    # Apply pending migrations to the local database
npx wrangler d1 execute crescere --local --command "SELECT * FROM users"
npx wrangler d1 migrations create crescere my_change   # New migration file
rm -rf .wrangler/state      # Wipe the local database (then npm run dev)
```

## Project Structure

```
crescere/
├── wrangler.jsonc              # Worker config: D1 binding, rate limiter, cron, assets
├── migrations/                 # D1 schema migrations (SQL)
├── worker/                     # Cloudflare Worker (the backend)
│   ├── index.js                # Router, CSRF checks, error handling, cron handler
│   ├── auth.js                 # Guest users, claiming, sign-in, sessions, cleanup
│   ├── data.js                 # Children, measurements, preferences, sharing
│   ├── password.js             # PBKDF2 password hashing (WebCrypto)
│   ├── http.js                 # JSON responses and input validation
│   └── test/                   # Worker tests (run inside workerd with real D1)
├── .github/workflows/
│   └── deploy.yml              # Cloudflare deployment (master → production)
├── .husky/
│   └── pre-commit              # Runs lint-staged + tests before each commit
├── scripts/
│   ├── compress-who-data.js    # Recompress WHO reference data
│   ├── set-password.js         # Reset a user's password in D1 (no email reset exists)
│   ├── migrate-from-supabase.js  # One-off export of a Supabase account to D1 SQL
│   ├── analyze.js              # Runs all code analysis tools
│   └── lighthouse.js           # Lighthouse audit
├── src/
│   ├── main.js                 # App entry point
│   ├── app.css                 # Global styles (Tailwind v4 import)
│   ├── App.svelte              # Root component (auth bootstrap, share links, layout)
│   ├── components/             # Svelte UI components
│   │   ├── AuthModal.svelte          # Sign in / save account / change password
│   │   ├── UserMenu.svelte
│   │   ├── OnboardingBanner.svelte
│   │   ├── ChildList.svelte
│   │   ├── MeasurementTable.svelte
│   │   ├── ChartGrid.svelte          # Chart group layout + drag reorder
│   │   ├── GrowthMetricChart.svelte  # Raw measurement charts
│   │   ├── ZScoreChart.svelte        # Z-score deviation charts
│   │   ├── VelocityChart.svelte      # Growth velocity charts
│   │   ├── ShareModal.svelte
│   │   └── ...
│   ├── stores/                 # Svelte stores (state management)
│   │   ├── childStore.js       # Core data store (children, measurements)
│   │   ├── authStore.js        # Authentication state + methods
│   │   ├── chartStore.js       # Chart layout preferences
│   │   └── i18n.js             # Internationalization (en/pl)
│   ├── lib/                    # Utility modules
│   │   ├── api.js              # fetch client for the Worker API
│   │   ├── zscore.js           # WHO LMS z-score calculations
│   │   ├── share.js            # Live share link URLs
│   │   ├── csv.js              # CSV export/import
│   │   ├── utils.js            # Date formatting
│   │   └── __mocks__/api.js    # In-memory API for unit tests
│   └── data/                   # WHO reference datasets
├── eslint.config.js            # ESLint 9 flat config
├── vite.config.js              # Vite + Svelte + Tailwind v4 + Cloudflare plugins
├── vitest.worker.config.js     # Worker test config (@cloudflare/vitest-plugin)
└── package.json                # Dependencies, scripts, lint-staged config
```

## Architecture Deep Dive

### Tech Stack

| Layer      | Technology                                           |
| ---------- | ---------------------------------------------------- |
| Framework  | Svelte 5 (SPA, no SSR)                               |
| Build      | Vite 7 with `@sveltejs/vite-plugin-svelte`           |
| Styling    | Tailwind CSS v4 via `@tailwindcss/vite`              |
| Backend    | Cloudflare Worker (plain JS, no framework)           |
| Database   | Cloudflare D1 (SQLite)                               |
| Charts     | Chart.js 4 (tree-shaken) + chartjs-plugin-annotation |
| Testing    | Vitest 4 + `@cloudflare/vitest-plugin`               |
| Linting    | ESLint 9 + eslint-plugin-svelte                      |
| Formatting | Prettier 3 + prettier-plugin-svelte                  |
| Deployment | `wrangler deploy` via GitHub Actions                 |

The Worker serves both the API (`/api/*`) and the built SPA (static assets), so the app and API share one origin — no CORS, and the session is an `HttpOnly` cookie.

### Key design decisions

- **Optimistic updates**: All mutations update the Svelte store immediately, then fire an async API call. On failure, the store rolls back. This makes the UI feel instant.
- **No localStorage persistence for data**: Child data lives only in D1.
- **Chart layout in localStorage**: Chart ordering and column preferences are stored in localStorage (via `chartStore.js`) since they're UI preferences, not user data.
- **Authorization in the Worker**: D1 has no row-level security, so each route checks ownership itself (`requireOwnedChild`, `WHERE user_id = ?`).
- **No email**: Nothing in the app sends email. There are no magic links, no email verification and no password reset email — see [Authentication](#authentication).

## Data Flow

### Store architecture

```
authStore.js          childStore.js              chartStore.js
   │                     │                           │
   │ auth state          │ children, measurements    │ chart layout
   │ sign in/out         │ CRUD operations           │ group order
   │                     │                           │ columns
   ▼                     ▼                           ▼
            api.js (fetch)                      localStorage
               │
               ▼
     Worker /api/* (worker/)
               │
               ▼
          D1 (SQLite)
```

### Mutation lifecycle (example: adding a measurement)

1. `addMeasurement()` is called in `childStore.js`
2. Store is updated immediately (optimistic) → UI refreshes
3. `api.createMeasurement()` sends `POST /api/children/:id/measurements`
4. **Success**: the temporary ID is replaced with the real one
5. **Failure**: Store rolls back to previous state, `dataError` is set

### Special child types

| Type    | Store             | Synced to backend  | Purpose                 |
| ------- | ----------------- | ------------------ | ----------------------- |
| Regular | `childStore`      | Yes                | Normal user children    |
| Example | `exampleChildId`  | No                 | Demo data for new users |
| Pending | `pendingChildIds` | After profile done | Missing required fields |
| Shared  | `sharedChildIds`  | Read-only          | Shared by another user  |

## Authentication

Implemented in `worker/auth.js`:

1. **Guest**: on first visit the app calls `POST /api/auth/anonymous`, which creates a `users` row with no email and starts a session.
2. **Save account (claim)**: `POST /api/auth/claim` sets an email and password on that same row, so the user ID — and all data — stays the same.
3. **Sign in**: `POST /api/auth/login` with email + password. Signing in from a guest session ends that guest session.
4. **Change password**: `POST /api/auth/password` requires the current password and signs out all other sessions.

Details:

- Passwords are hashed with PBKDF2-SHA256 (`worker/password.js`). The iteration count is the `PASSWORD_ITERATIONS` var in `wrangler.jsonc` (max 100,000, the Workers limit) and is stored in each hash.
- Sessions are random 256-bit tokens in an `HttpOnly; SameSite=Lax` cookie (`Secure` on HTTPS). They last 400 days and slide forward once a day while used.
- Writes must be `Content-Type: application/json` and, when the browser sends an `Origin` header, same-origin.
- Sign-in, claim, password change and guest creation are rate limited per IP (`AUTH_LIMITER` in `wrangler.jsonc`, 10 per minute per action).
- A daily cron (`scheduled` in `worker/index.js`) deletes expired sessions and guest users with no session left (nobody can ever sign in as them again).
- **No password reset email.** An operator can reset a password with `node scripts/set-password.js <email> --remote`.
- Emails are never verified; they are effectively usernames.

## Sharing System

Sharing is done via token-based live links:

- Owner (a saved account, not a guest) creates a named share link with a random token (`#live-share=<token>`)
- Stored in `child_shares`
- Recipient calls `POST /api/shares/accept` to get read-only access (`shared_child_access`)
- Data stays live — the recipient sees the owner's updates on reload
- Both parties must be signed in (guests can accept)
- Owner can revoke access at any time (cascades to every recipient)

## Charts

### Organization

Charts are organized into **groups**, displayed as vertical stacks:

| Group              | Charts                                           |
| ------------------ | ------------------------------------------------ |
| Weight             | Weight over time, Weight z-score, Weight velocity |
| Length             | Length over time, Length z-score, Length velocity |
| Head Circumference | Head circ over time, Head circ z-score           |
| Weight-for-Length  | WFL z-score                                      |

Groups are draggable as a unit. A column selector (2/3/4) controls how many groups appear per row. Chart preferences persist in localStorage.

### Chart types

- **Growth charts** (`GrowthMetricChart.svelte`): Raw measurements plotted against WHO reference bands (median, ±1SD, ±2SD)
- **Z-score charts** (`ZScoreChart.svelte`): Standard deviation scores over time
- **Velocity charts** (`VelocityChart.svelte`): Rate of change (g/day or cm/day) between consecutive measurements

### WHO reference data

Located in `src/data/`. Compact format: `{ [sex]: [[l,m,s], ...] }` where:

- Array index = age in days (0-1826, covering 0-5 years)
- Sex: 1 = male, 2 = female
- Weight-for-length uses length strings as keys instead of day indices

Z-score calculation (`src/lib/zscore.js`) uses the WHO LMS method with bounded extrapolation beyond ±3 SD for weight metrics.

## Internationalization

Two languages: **English** (en) and **Polish** (pl). Auto-detects from browser language.

Translations are in `src/stores/i18n.js` as a flat key-value object. Access via the `$t` derived store:

```svelte
<h1>{$t('app.title')}</h1>
```

To add a new translation key, add it to both the `en` and `pl` objects in `i18n.js`.

## Testing

```bash
npm run test          # Everything: front-end unit tests, then Worker tests
npm run test:watch    # Front-end unit tests in watch mode
npm run test:worker   # Worker tests only
```

### Test organization

- Front-end unit tests are co-located: `foo.js` → `foo.test.js`. `childStore` tests use the in-memory API in `src/lib/__mocks__/api.js`.
- Worker tests live in `worker/test/` and run inside the Workers runtime (workerd) against a real local D1 database with the migrations applied. They drive the Worker through the real client in `src/lib/api.js`, using a fake browser with its own cookie jar (`worker/test/browser.js`).
- The pre-commit hook runs all tests.

### Writing tests

- New API route → add a Worker test, including one that another user can't reach the data
- Test z-score calculations against known WHO values
- Test store mutations and their rollback behavior

## Code Analysis & Reports

A full suite of static analysis tools generates HTML reports in `reports/` (git-ignored).

### Quick start

```bash
npm run analyze          # Run ALL tools, print summary
npm run analyze:open     # Same + open HTML reports in browser
```

### Individual tools

```bash
npm run analyze:coverage       # Test coverage (HTML + lcov + JSON)
npm run analyze:bundle         # Bundle treemap visualization
npm run analyze:duplication    # Copy/paste detection
npm run analyze:deps           # Circular deps (madge) + dead code (knip)
npm run analyze:lighthouse     # Lighthouse performance audit (needs Chrome)
npm run analyze:lighthouse:open  # Same + open report
```

### What each tool does

| Tool                         | Runs via              | Report                                  | What it finds                                                                                 |
| ---------------------------- | --------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| **eslint-plugin-sonarjs**    | `npm run lint`        | Console                                 | Code smells: cognitive complexity, duplicate strings, nested conditionals, ignored exceptions |
| **@vitest/coverage-v8**      | `analyze:coverage`    | `reports/coverage/index.html`           | Line/branch/function/statement coverage with thresholds                                       |
| **jscpd**                    | `analyze:duplication` | `reports/duplication/html/index.html`   | Duplicated code blocks across files                                                           |
| **rollup-plugin-visualizer** | `analyze:bundle`      | `reports/bundle.html`                   | Interactive treemap of bundle composition (gzip + brotli sizes)                               |
| **madge**                    | `analyze:deps`        | Console (+ SVG if graphviz installed)   | Circular dependencies between JS modules                                                      |
| **knip**                     | `analyze:deps`        | Console                                 | Unused exports, files, and dependencies                                                       |
| **Lighthouse**               | `analyze:lighthouse`  | `reports/lighthouse.html`               | Performance, accessibility, best practices, SEO audit                                         |

### Configuration files

- **`.jscpd.json`** — duplication detection thresholds and ignored paths
- **`knip.config.js`** — entry points and ignored dependencies for dead code detection
- **`vite.config.js`** `test.coverage` — coverage thresholds and included/excluded paths
- **`eslint.config.js`** — sonarjs rule tuning (thresholds, disabled rules, per-directory overrides)

### Notes

- The bundle visualizer only activates when `ANALYZE=true` is set (used by `analyze:bundle`). Normal `npm run build` is unaffected.
- Coverage covers the front-end unit tests only; the Worker is covered by `npm run test:worker`.
- The dependency graph SVG requires graphviz. Without it, madge still detects circular deps but skips the graph.
- Lighthouse builds the app, starts a preview server, runs the audit, and cleans up automatically. Requires Chrome/Chromium.

## Code Style & Linting

Enforced automatically via pre-commit hooks (Husky + lint-staged):

| Rule                  | Tool       | Config             |
| --------------------- | ---------- | ------------------ |
| Formatting            | Prettier   | `.prettierrc`      |
| Code quality          | ESLint     | `eslint.config.js` |
| Code smells           | SonarJS    | `eslint.config.js` |
| 2-space indentation   | Prettier   | -                  |
| Single quotes         | Prettier   | -                  |
| Semicolons            | Prettier   | -                  |
| PascalCase components | Convention | `*.svelte` files   |
| lowercase utilities   | Convention | `*.js` files       |
| Unused vars prefix    | ESLint     | `_` prefix allowed |

```bash
npm run lint         # Check only (src/, worker/, scripts/)
npm run lint:fix     # Auto-fix
npm run format       # Format all files
npm run format:check # Check without changing
```

### Svelte 5 pitfall

Always use optional chaining for derived store values in templates, even inside `{#if}` blocks:

```svelte
<!-- Derived values can be momentarily undefined during render cycles -->
{#if $activeChild}
  {profile?.birthDate}  <!-- Always use ?. -->
{/if}
```

## Deployment

### First-time Cloudflare setup

1. `npx wrangler login`
2. `npx wrangler d1 create crescere` — copy the printed `database_id` into `wrangler.jsonc` (only for a new deployment; the id there is the production database)
3. `npm run deploy` — builds, applies migrations to the remote database, and deploys the Worker

The app is then live at `https://crescere.<your-subdomain>.workers.dev`.

### Production (automatic)

Push to `master` triggers `.github/workflows/deploy.yml`, which runs the tests, applies D1 migrations and runs `wrangler deploy`. It needs two GitHub secrets:

| Secret                  | Value                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`  | API token with **Workers Scripts: Edit** and **D1: Edit** permissions    |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (dashboard → Workers & Pages → right sidebar) |

### Manual preview

```bash
npm run preview  # Build and serve the production build (with the Worker) locally
```

### Free plan limits

The Workers Free plan allows 10 ms of CPU per request. Hashing a password at 100,000 PBKDF2 iterations takes roughly 10–15 ms, so sign-in, save account and change password may hit that limit (error 1102). If they do, either move to Workers Paid or lower `PASSWORD_ITERATIONS` in `wrangler.jsonc`. Existing hashes keep their own iteration count, so after lowering it, reset the password once with `scripts/set-password.js --iterations N`.

## Common Tasks

### Add a new database table or column

1. `npx wrangler d1 migrations create crescere my_change`
2. Write SQL in the generated file in `migrations/`
3. `npm run db:migrate:local`
4. Add the route in `worker/index.js` and its handler in `worker/data.js` — scope every query to `user.id`
5. Add the client function in `src/lib/api.js` (and `src/lib/__mocks__/api.js`)
6. Add Worker tests, then update stores as needed

### Reset a user's password

```bash
node scripts/set-password.js someone@example.com --remote
```

### Add a new translation

Add the key to both `en` and `pl` objects in `src/stores/i18n.js`.

### Add a new chart type

1. Create the chart component in `src/components/`
2. Add chart entries to the relevant group in `chartStore.js` `defaultChartOrder`
3. Update `chartGroupMap` if adding to an existing group or creating a new one
4. Add translation keys for the chart title
5. Add rendering logic in `ChartGrid.svelte` (growth/zscore/velocity switch)

### Modify WHO reference data

1. Edit the source data
2. Run `node scripts/compress-who-data.js` to recompress
3. Update z-score tests if calculation logic changes

## Troubleshooting

### `no such table` errors in dev

The local database hasn't been migrated. `npm run dev` does it automatically; otherwise run `npm run db:migrate:local`.

### Sign-in fails with error 1102 in production

CPU limit exceeded on the Workers Free plan — see [Free plan limits](#free-plan-limits).

### HMR not working

The Vite dev server should auto-detect file changes. If HMR stops working, restart with `npm run dev`. Changes in `worker/` reload the Worker automatically.

### Build warning about chunk size

The ~690 KB bundle is expected. Chart.js is the largest contributor. This is tracked in `ideas.md` as a potential optimization.
