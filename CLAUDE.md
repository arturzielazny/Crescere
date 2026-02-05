# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Crescere** (v0.1.0) - A pediatric growth tracker using WHO child growth standards.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server with HMR
npm run build        # Create production build in dist/
npm run preview      # Serve production build locally
npm run test         # Run unit tests once
npm run test:watch   # Run unit tests in watch mode
npm run test:integration  # Run Supabase integration tests (requires local Supabase)
npm run test:all     # Run all tests (unit + integration)
npm run lint         # Check code with ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format code with Prettier
npm run format:check # Check formatting without changes
```

**Pre-commit hooks:** Husky + lint-staged automatically runs ESLint, Prettier, and unit tests on every commit.

**Deployment:** Push to `master` triggers GitHub Actions deployment to https://arturzielazny.github.io/Crescere/

## Architecture Overview

Svelte 5 SPA for pediatric growth monitoring. Uses Supabase for persistence, authentication, and real-time sharing.

### Core Data Flow

1. **State Management** (`src/stores/childStore.js`): Central `childStore` (writable) holds `children[]` array and `activeChildId`. Derived stores (`activeChild`, `measurementsWithZScores`) compute current selection and enriched data. All mutations use **optimistic updates** — the UI updates instantly, then an async Supabase call runs in the background. On failure, the store rolls back and `dataError` is set.

2. **Persistence** (`src/lib/api.js` + Supabase): All data is stored in Supabase (tables: `children`, `measurements`, `user_preferences`). There is no localStorage persistence for child data. The `src/lib/storage.js` file is retained solely for migrating legacy localStorage data to Supabase (imported by `App.svelte` and `src/lib/migrate.js`).

3. **Authentication** (`src/stores/authStore.js`): Three methods via Supabase Auth:
   - Anonymous sign-in (auto-created, upgradeable)
   - Magic link (email OTP)
   - Email + password

4. **Z-Score Calculation** (`src/lib/zscore.js`): Implements WHO LMS method with two variants:
   - Standard LMS for length-for-age, head circumference-for-age
   - Bounded LMS for weight-for-age, weight-for-length (clamps at ±3 SD with linear extrapolation)

5. **WHO Reference Data** (`src/data/`): Four datasets in compact array format `{ [sex]: [[l,m,s], ...] }` where array index = day. Sex: 1=male, 2=female. Age range: 0-1826 days (0-5 years). WFL uses length strings as keys.

6. **Sharing** (`src/lib/share.js`): Two mechanisms:
   - **Snapshot sharing**: URL-based via LZ-String compression in hash fragment (`#share=...`). Static point-in-time copy. No auth required to view.
   - **Live sharing**: Supabase token-based (`#live-share=<token>`). Named share links with read-only access. Both parties must be authenticated.

7. **i18n** (`src/stores/i18n.js`): English (en) and Polish (pl). Auto-detects browser language.

### Special Child Types

- **Example child** (`exampleChildId`): Client-side demo data, never synced. Auto-removed when user adds a real child.
- **Temporary child** (`temporaryChildId`): Imported from a share URL, held in-memory until explicitly saved.
- **Pending child** (`pendingChildIds`): Created locally but missing required fields (birthDate, sex). Synced to Supabase once profile is complete.

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

Bundle: ~777 KB (233 KB gzipped)

1. **Tree-shaken Chart.js**: Only imports LineController, LineElement, PointElement, LinearScale, Filler, Legend, Tooltip.

2. **Compact WHO data**: Arrays `[l,m,s]` instead of objects. Run `node scripts/compress-who-data.js` to recompress if data changes.

## Supabase

Database schema is defined in `supabase/migrations/`. Two migrations exist:
- `20250201000000_initial_schema.sql`: Core tables (`children`, `measurements`, `user_preferences`) with RLS policies
- `20250202000000_child_sharing.sql`: Sharing tables (`child_shares`, `shared_child_access`) with RLS and `accept_share` RPC

Local development uses Docker-based Supabase (`supabase start`). Production credentials are injected via GitHub Actions secrets during deployment.

### Legacy localStorage Migration

`src/lib/storage.js` contains a schema-versioned localStorage system (current: v2). This is no longer the primary data store — it exists solely to support one-time migration of pre-Supabase data. The `migrateToSupabase()` function in `src/lib/migrate.js` reads from localStorage and writes to Supabase, then clears localStorage. Do not add new localStorage-based persistence.
