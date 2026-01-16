# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server with HMR
npm run build        # Create production build in dist/
npm run preview      # Serve production build locally
```

No test framework or linting is currently configured.

**Deployment:** Push to `master` triggers GitHub Actions deployment to https://arturzielazny.github.io/Crescere/

## Architecture Overview

Svelte 5 SPA for pediatric growth monitoring using WHO child growth standards. Runs entirely client-side with localStorage persistence.

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

- 2-space indentation, single quotes, semicolons
- PascalCase for `.svelte` components, lowercase for `.js` utilities
- Tailwind CSS via `@import "tailwindcss"` in `app.css`
- JavaScript with JSDoc type hints (`checkJs: true`)

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

## Build Optimizations

Bundle: ~553 KB (172 KB gzipped)

1. **Tree-shaken Chart.js**: Only imports LineController, LineElement, PointElement, LinearScale, Filler, Legend, Tooltip.

2. **Compact WHO data**: Arrays `[l,m,s]` instead of objects. Run `node scripts/compress-who-data.js` to recompress if data changes.
