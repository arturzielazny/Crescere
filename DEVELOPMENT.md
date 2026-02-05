# Developer Onboarding Guide

Welcome to **Crescere** — a pediatric growth tracker built with Svelte 5 and Supabase. This guide covers everything you need to get the project running locally, understand the architecture, and start contributing.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Local Supabase Setup](#local-supabase-setup)
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
- **Supabase CLI** — required for the local database ([install guide](https://supabase.com/docs/guides/cli/getting-started))
- **Docker** — required by Supabase CLI for local containers

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/arturzielazny/Crescere.git
cd Crescere
npm install

# 2. Start local Supabase (Docker must be running)
supabase start

# 3. Start dev server
npm run dev
```

The app will be available at **http://localhost:5173/Crescere/**.

### Without Supabase (limited)

If you only need to work on UI/charts and don't need auth or persistence:

```bash
npm install
npm run dev
```

The app will start but show a console warning about missing Supabase credentials. You can browse the UI using the example (demo) child, but cannot sign in or persist data.

## Local Supabase Setup

### First-time setup

```bash
# Start local Supabase Docker containers
supabase start

# This outputs connection info:
#   API URL:    http://127.0.0.1:54321
#   Anon key:   eyJhbG...
#   Studio URL: http://127.0.0.1:54323
```

The `.env.local` file is pre-configured with the default local Supabase credentials. You should not need to change it.

### Local services

| Service        | URL                          | Purpose                              |
|----------------|------------------------------|--------------------------------------|
| API            | http://127.0.0.1:54321      | REST API (PostgREST)                 |
| Studio         | http://127.0.0.1:54323      | Database admin UI                    |
| Inbucket       | http://127.0.0.1:54324      | Email testing (catches magic links)  |
| Database       | localhost:54322              | Postgres 17 (direct connection)      |

### Database schema

Migrations are in `supabase/migrations/`:

1. **`20250201000000_initial_schema.sql`** — Core tables:
   - `children` (id, user_id, name, birth_date, sex, created_at, updated_at)
   - `measurements` (id, child_id, date, weight, length, head_circ)
   - `user_preferences` (user_id, active_child_id)
   - Row-Level Security (RLS) policies enforce per-user ownership

2. **`20250202000000_child_sharing.sql`** — Sharing system:
   - `child_shares` (token-based named share links)
   - `shared_child_access` (tracks who accepted which shares)
   - `accept_share(share_token)` RPC function

### Useful Supabase commands

```bash
supabase start          # Start local containers
supabase stop           # Stop local containers
supabase status         # Show running service URLs and keys
supabase db reset       # Re-run all migrations + seed (destructive!)
supabase db diff        # Generate migration from schema changes
supabase migration new  # Create empty migration file
```

### Connecting to the local database directly

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## Project Structure

```
crescere/
├── .env.local                  # Local Supabase credentials (pre-configured)
├── .env.example                # Template for production credentials
├── .github/workflows/
│   └── deploy.yml              # GitHub Pages deployment (master → production)
├── .husky/
│   └── pre-commit              # Runs lint-staged + tests before each commit
├── supabase/
│   ├── config.toml             # Local Supabase configuration
│   ├── migrations/             # Database schema migrations (SQL)
│   └── seed.sql                # Seed data (currently empty)
├── scripts/
│   └── compress-who-data.js    # Utility to recompress WHO reference data
├── src/
│   ├── main.js                 # App entry point
│   ├── app.css                 # Global styles (Tailwind v4 import)
│   ├── App.svelte              # Root component (auth, routing, migration)
│   ├── components/             # Svelte UI components
│   │   ├── Header.svelte
│   │   ├── WelcomeScreen.svelte
│   │   ├── ChildList.svelte
│   │   ├── ChildProfile.svelte
│   │   ├── MeasurementTable.svelte
│   │   ├── ChartGrid.svelte          # Chart group layout + drag reorder
│   │   ├── GrowthMetricChart.svelte   # Raw measurement charts
│   │   ├── ZScoreChart.svelte         # Z-score deviation charts
│   │   ├── VelocityChart.svelte       # Growth velocity charts
│   │   ├── ShareModal.svelte
│   │   ├── ConfirmModal.svelte
│   │   └── Toast.svelte
│   ├── stores/                 # Svelte stores (state management)
│   │   ├── childStore.js       # Core data store (children, measurements)
│   │   ├── authStore.js        # Authentication state + methods
│   │   ├── chartStore.js       # Chart layout preferences
│   │   └── i18n.js             # Internationalization (en/pl)
│   ├── lib/                    # Utility modules
│   │   ├── api.js              # Supabase CRUD operations
│   │   ├── supabaseClient.js   # Supabase client initialization
│   │   ├── zscore.js           # WHO LMS z-score calculations
│   │   ├── share.js            # URL sharing (snapshot + live)
│   │   ├── storage.js          # Legacy localStorage (migration only)
│   │   ├── migrate.js          # localStorage → Supabase migration
│   │   ├── utils.js            # Date formatting, age calculation
│   │   └── __mocks__/          # Vitest mocks
│   │       └── supabaseClient.js
│   └── data/                   # WHO reference datasets
│       ├── who-weight.js       # Weight-for-age LMS tables
│       ├── who-length.js       # Length-for-age LMS tables
│       ├── who-headc.js        # Head circumference-for-age LMS tables
│       └── who-wfl.js          # Weight-for-length LMS tables
├── eslint.config.js            # ESLint 9 flat config
├── svelte.config.js            # Svelte preprocessor config
├── vite.config.js              # Vite + Svelte + Tailwind v4 plugins
├── jsconfig.json               # JS/TS language service config
├── .prettierrc                 # Prettier formatting rules
├── CLAUDE.md                   # AI assistant guidance
├── ideas.md                    # Feature backlog and known issues
└── package.json                # Dependencies, scripts, lint-staged config
```

## Architecture Deep Dive

### Tech Stack

| Layer          | Technology                                    |
|----------------|-----------------------------------------------|
| Framework      | Svelte 5 (SPA, no SSR)                        |
| Build          | Vite 7 with `@sveltejs/vite-plugin-svelte`    |
| Styling        | Tailwind CSS v4 via `@tailwindcss/vite`        |
| Backend        | Supabase (Postgres + Auth + RLS + RPC)         |
| Charts         | Chart.js 4 (tree-shaken) + chartjs-plugin-annotation |
| Testing        | Vitest 4                                       |
| Linting        | ESLint 9 + eslint-plugin-svelte                |
| Formatting     | Prettier 3 + prettier-plugin-svelte            |
| Deployment     | GitHub Pages via GitHub Actions                |

### Key design decisions

- **Optimistic updates**: All mutations update the Svelte store immediately, then fire an async Supabase call. On failure, the store rolls back. This makes the UI feel instant.
- **No localStorage persistence**: Child data is stored exclusively in Supabase. The `storage.js` file exists solely to migrate data from the pre-Supabase era.
- **Chart layout in localStorage**: Chart ordering and column preferences are stored in localStorage (via `chartStore.js`) since they're UI preferences, not user data.
- **Row-Level Security**: Every Supabase table has RLS policies. Users can only access their own data. Sharing is enforced at the database level.

## Data Flow

### Store architecture

```
authStore.js          childStore.js              chartStore.js
   │                     │                           │
   │ auth state          │ children, measurements    │ chart layout
   │ sign in/out         │ CRUD operations           │ group order
   │                     │                           │ columns
   ▼                     ▼                           ▼
supabaseClient.js ←── api.js                    localStorage
   │
   ▼
Supabase (Postgres + Auth)
```

### Mutation lifecycle (example: adding a measurement)

1. `addMeasurement()` is called in `childStore.js`
2. Store is updated immediately (optimistic) → UI refreshes
3. `api.addMeasurement()` sends an INSERT to Supabase
4. **Success**: No further action needed (store already has the data)
5. **Failure**: Store rolls back to previous state, `dataError` is set

### Special child types

| Type           | Store                | Synced to Supabase | Purpose                              |
|----------------|----------------------|--------------------|--------------------------------------|
| Regular        | `childStore`         | Yes                | Normal user children                 |
| Example        | `exampleChildId`     | No                 | Demo data for new users              |
| Pending        | `pendingChildIds`    | After profile done | Missing required fields              |
| Shared         | `sharedChildIds`     | Read-only          | Shared by another user               |

## Authentication

Three methods, all via Supabase Auth:

1. **Anonymous**: Auto-created guest account. Can be upgraded to email later.
2. **Magic link**: Passwordless email OTP. Supabase sends a login link.
3. **Email + password**: Standard sign-up and sign-in.

### Auth flow

1. `WelcomeScreen.svelte` shows on first visit (no session)
2. User chooses "Continue as Guest" (anonymous) or signs in with email
3. `authStore.js` manages the session and exposes `user`, `isAuthenticated`, `isAnonymous`
4. On auth state change, `App.svelte` calls `enableSync()` on `childStore` to load data from Supabase

### Testing magic links locally

When running with local Supabase, emails are caught by **Inbucket** at http://127.0.0.1:54324. Enter any email address, click "Send link", then check Inbucket to find the login URL.

## Sharing System

Sharing is done via Supabase token-based live links:

- Owner creates a named share link with a unique token (`#live-share=<token>`)
- Stored in `child_shares` table
- Recipient calls `accept_share` RPC to get read-only access
- Data stays live — recipient sees updates in real-time
- Both parties must be authenticated
- Owner can revoke access at any time

## Charts

### Organization

Charts are organized into **groups**, displayed as vertical stacks:

| Group           | Charts                                           |
|-----------------|--------------------------------------------------|
| Weight          | Weight over time, Weight z-score, Weight velocity |
| Length          | Length over time, Length z-score, Length velocity  |
| Head Circumference | Head circ over time, Head circ z-score         |
| Weight-for-Length | WFL z-score                                    |

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
npm run test              # Unit tests only (excludes integration)
npm run test:watch        # Unit tests in watch mode
npm run test:integration  # Integration tests (requires local Supabase)
npm run test:all          # All tests
```

### Test organization

- Unit tests are co-located: `foo.js` → `foo.test.js`
- Integration tests: `foo.integration.test.js` (require running Supabase)
- Supabase client is mocked in `src/lib/__mocks__/supabaseClient.js` for unit tests
- The pre-commit hook runs unit tests automatically

### Writing tests

- Use Vitest (compatible with Jest API)
- Mock the Supabase client for unit tests — don't make real API calls
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

| Tool | Runs via | Report | What it finds |
|------|----------|--------|---------------|
| **eslint-plugin-sonarjs** | `npm run lint` | Console | Code smells: cognitive complexity, duplicate strings, nested conditionals, ignored exceptions |
| **@vitest/coverage-v8** | `analyze:coverage` | `reports/coverage/index.html` | Line/branch/function/statement coverage with thresholds |
| **jscpd** | `analyze:duplication` | `reports/duplication/html/index.html` | Duplicated code blocks across files |
| **rollup-plugin-visualizer** | `analyze:bundle` | `reports/bundle.html` | Interactive treemap of bundle composition (gzip + brotli sizes) |
| **madge** | `analyze:deps` | Console (+ SVG if graphviz installed) | Circular dependencies between JS modules |
| **knip** | `analyze:deps` | Console | Unused exports, files, and dependencies |
| **Lighthouse** | `analyze:lighthouse` | `reports/lighthouse.html` | Performance, accessibility, best practices, SEO audit |

### Configuration files

- **`.jscpd.json`** — duplication detection thresholds and ignored paths
- **`knip.config.js`** — entry points and ignored dependencies for dead code detection
- **`vite.config.js`** `test.coverage` — coverage thresholds and included/excluded paths
- **`eslint.config.js`** — sonarjs rule tuning (thresholds, disabled rules, per-directory overrides)

### Notes

- The bundle visualizer only activates when `ANALYZE=true` is set (used by `analyze:bundle`). Normal `npm run build` is unaffected.
- Coverage thresholds are intentionally low (30%) since Svelte components aren't unit-tested. The `src/lib/` layer has ~84% coverage.
- The dependency graph SVG requires graphviz: `brew install graphviz`. Without it, madge still detects circular deps but skips the graph.
- Lighthouse builds the app, starts a preview server, runs the audit, and cleans up automatically. Requires Chrome/Chromium.

## Code Style & Linting

Enforced automatically via pre-commit hooks (Husky + lint-staged):

| Rule                  | Tool      | Config                |
|-----------------------|-----------|-----------------------|
| Formatting            | Prettier  | `.prettierrc`         |
| Code quality          | ESLint    | `eslint.config.js`    |
| Code smells           | SonarJS   | `eslint.config.js`    |
| 2-space indentation   | Prettier  | -                     |
| Single quotes         | Prettier  | -                     |
| Semicolons            | Prettier  | -                     |
| PascalCase components | Convention | `*.svelte` files      |
| lowercase utilities   | Convention | `*.js` files          |
| Unused vars prefix    | ESLint    | `_` prefix allowed    |

```bash
npm run lint         # Check only
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

### Production (automatic)

Push to `master` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`):

1. Installs dependencies (`npm ci`)
2. Builds with production Supabase credentials injected from GitHub secrets
3. Deploys `dist/` to GitHub Pages

Live at: https://arturzielazny.github.io/Crescere/

### GitHub secrets required

| Secret              | Value                           |
|---------------------|---------------------------------|
| `SUPABASE_URL`      | Production Supabase project URL |
| `SUPABASE_ANON_KEY` | Production Supabase anon key    |

### Manual preview

```bash
npm run build    # Build to dist/
npm run preview  # Serve locally
```

Note: The app uses `base: '/Crescere/'` in `vite.config.js` for GitHub Pages path. All routes are relative to this base.

## Common Tasks

### Add a new database table

1. Create a migration: `supabase migration new my_table_name`
2. Write SQL in the generated file (include RLS policies!)
3. Apply locally: `supabase db reset`
4. Add CRUD functions in `src/lib/api.js`
5. Update stores as needed

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

### "Supabase credentials not configured" warning

The `.env.local` file should contain local Supabase URLs. Run `supabase status` to get the correct values, or just run `supabase start` if the containers aren't running.

### Supabase containers won't start

Make sure Docker is running. Try `supabase stop` then `supabase start`. If that fails, `supabase stop --no-backup` to clean up.

### Tests fail with Supabase errors

Unit tests mock Supabase — they should not need a running instance. If integration tests fail, ensure `supabase start` is running.

### HMR not working

The Vite dev server should auto-detect file changes. If HMR stops working, restart with `npm run dev`. Check that you're editing files inside `src/`.

### Build warning about chunk size

The ~777 KB bundle is expected. Chart.js is the largest contributor. This is tracked in `ideas.md` as a potential optimization.
