# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start Vite dev server with HMR
- `npm run build` - Create production build in `dist/`
- `npm run preview` - Serve production build locally

No test framework or linting is currently configured.

## Architecture Overview

This is a Svelte 5 SPA for pediatric growth monitoring using WHO child growth standards. It runs entirely client-side with localStorage persistence.

### Core Data Flow

1. **State Management** (`src/stores/childStore.js`): Central `childStore` (writable) holds `children[]` array and `activeChildId`. Derived stores (`activeChild`, `measurementsWithZScores`) compute current selection and enriched data.

2. **Z-Score Calculation** (`src/lib/zscore.js`): Implements WHO LMS method with two variants:
   - Standard LMS for length-for-age, head circumference-for-age
   - Bounded LMS for weight-for-age, weight-for-length (clamps at ±3 SD with linear extrapolation)

3. **WHO Reference Data** (`src/data/`): Four datasets (weight, length, headc, wfl) in compact array format `{ [sex]: [[l,m,s], ...] }` where array index = day. Sex: 1=male, 2=female. Age range: 0-1826 days (0-5 years). WFL uses length strings as keys instead of arrays.

4. **Persistence** (`src/lib/storage.js`): localStorage with schema versioning (current: v2). Handles v1→v2 migration (single→multiple children). Auto-saves on state changes.

5. **Sharing** (`src/lib/share.js`): URL-based sharing using LZ-String compression. Data is encoded in hash fragment (`#share=...`) for privacy. Compact format strips UUIDs and uses single-char keys.

6. **Utilities** (`src/lib/utils.js`): Shared helpers for date checking, color conversion, and z-score formatting.

7. **i18n** (`src/stores/i18n.js`): Client-side translations for English (en) and Polish (pl). Auto-detects browser language.

### Key Data Models

```javascript
// Child
{ id: string, profile: { name, birthDate, sex }, measurements: [] }

// Measurement
{ id: string, date: string, weight: number|null, length: number|null, headCirc: number|null }
// weight in grams, length/headCirc in cm
```

### Component Structure

- `App.svelte` - Root layout, component orchestration, share URL handling
- `ChildList.svelte` - Child selection and management
- `ChildProfile.svelte` - Profile form (name, DOB, sex)
- `MeasurementTable.svelte` - Inline editable measurements table (requires at least one value)
- `GrowthMetricChart.svelte` - Weight/length/head circumference vs age charts
- `ZScoreChart.svelte` - Z-score trend charts (WAZ, LAZ, HCZ, WFLZ)
- `ShareModal.svelte` - Display shareable URL with copy button
- `ImportConfirmModal.svelte` - Confirm import of shared child data

Charts use Chart.js with WHO reference bands (±1SD, ±2SD) and a vertical "now" line at current age. Z-scores use 4-level color coding: green bold (±1SD), yellow (±1-2SD), red (±2-3SD), red bold (>±3SD). Future measurements appear as faded triangles for forecasting.

## Code Style

- 2-space indentation
- Single quotes, semicolons in JavaScript
- PascalCase for `.svelte` components, lowercase for `.js` utilities
- Tailwind CSS for styling via `@import "tailwindcss"` in `app.css`
- JavaScript with JSDoc type hints (`checkJs: true` in jsconfig.json)

## Build Optimizations

The bundle is optimized to ~553 KB (172 KB gzipped):

1. **Tree-shaken Chart.js**: Only imports used components (LineController, LineElement, PointElement, LinearScale, Filler, Legend, Tooltip) instead of all registerables. Saves ~42 KB.

2. **Compact WHO data format**: Reference data uses arrays `[l,m,s]` instead of objects `{l,m,s}`. Reduces data files by ~50%. Run `node scripts/compress-who-data.js` to recompress if data changes.

Further optimization options if needed:
- Lazy-load charts via dynamic imports
- Reduce decimal precision in WHO data
- Use binary encoding with runtime decompression
- External CDN for Chart.js
