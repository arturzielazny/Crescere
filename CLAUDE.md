# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Crescere** (v0.1.0) - A pediatric growth tracker using WHO child growth standards.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server with HMR
npm run build        # Create production build in dist/
npm run preview      # Serve production build locally
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run lint         # Check code with ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format code with Prettier
npm run format:check # Check formatting without changes
```

**Pre-commit hooks:** Husky + lint-staged automatically runs ESLint, Prettier, and tests on every commit.

**Deployment:** Push to `master` triggers GitHub Actions deployment to https://arturzielazny.github.io/Crescere/

## Architecture Overview

Svelte 5 SPA for pediatric growth monitoring. Runs entirely client-side with localStorage persistence.

### Core Data Flow

1. **State Management** (`src/stores/childStore.js`): Central `childStore` (writable) holds `children[]` array and `activeChildId`. Derived stores (`activeChild`, `measurementsWithZScores`) compute current selection and enriched data.

2. **Z-Score Calculation** (`src/lib/zscore.js`): Implements WHO LMS method with two variants:
   - Standard LMS for length-for-age, head circumference-for-age
   - Bounded LMS for weight-for-age, weight-for-length (clamps at ±3 SD with linear extrapolation)

3. **WHO Reference Data** (`src/data/`): Four datasets in compact array format `{ [sex]: [[l,m,s], ...] }` where array index = day. Sex: 1=male, 2=female. Age range: 0-1826 days (0-5 years). WFL uses length strings as keys.

4. **Persistence** (`src/lib/storage.js`): localStorage with schema versioning (current: v2). Auto-saves on state changes.

5. **Sharing** (`src/lib/share.js`): URL-based sharing using LZ-String compression in hash fragment (`#share=...`).

6. **i18n** (`src/stores/i18n.js`): English (en) and Polish (pl). Auto-detects browser language.

### Key Data Models

```javascript
// Child
{ id: string, profile: { name, birthDate, sex }, measurements: [] }

// Measurement (weight in grams, length/headCirc in cm)
{ id: string, date: string, weight: number|null, length: number|null, headCirc: number|null }
```

### Charts

Charts use Chart.js (tree-shaken imports) with:
- WHO reference bands (±1SD, ±2SD)
- Vertical "now" line at current age (chartjs-plugin-annotation)
- 4-level z-score coloring: green bold (±1SD), yellow (±1-2SD), red (±2-3SD), red bold (>±3SD)
- Future measurements as faded triangles

## Code Style

- 2-space indentation, single quotes, semicolons (enforced by Prettier)
- PascalCase for `.svelte` components, lowercase for `.js` utilities
- Tailwind CSS via `@import "tailwindcss"` in `app.css`
- JavaScript with JSDoc type hints (`checkJs: true`)
- ESLint with Svelte plugin for code quality
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

Bundle: ~553 KB (172 KB gzipped)

1. **Tree-shaken Chart.js**: Only imports LineController, LineElement, PointElement, LinearScale, Filler, Legend, Tooltip.

2. **Compact WHO data**: Arrays `[l,m,s]` instead of objects. Run `node scripts/compress-who-data.js` to recompress if data changes.

## Schema Migrations

localStorage data is versioned (current: v2). When adding schema changes:

1. Increment `CURRENT_VERSION` in `src/lib/storage.js`
2. Add migration function to `migrations` object (key = source version)
3. Add tests in `src/lib/storage.test.js` to verify migration from all previous versions
4. Run `npm test` to ensure all migrations work correctly
