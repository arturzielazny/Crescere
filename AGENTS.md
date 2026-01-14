# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the Svelte application code.
  - `src/App.svelte` is the root component, and `src/main.js` is the entry point.
  - `src/components/` contains UI components (e.g., `ChildProfile.svelte`, `ZScoreChart.svelte`).
  - `src/lib/` contains shared utilities like `storage.js` and `zscore.js`.
  - `src/data/` stores WHO reference datasets (e.g., `who-weight.js`).
  - `src/stores/` contains Svelte stores (e.g., `childStore.js`).
  - `src/assets/` holds static assets used by the app.
- `public/` contains static files copied as-is during build.
- `index.html`, `vite.config.js`, and `svelte.config.js` define the app shell and build tooling.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the Vite dev server with HMR.
- `npm run build`: create a production build in `dist/`.
- `npm run preview`: serve the production build locally.

## Coding Style & Naming Conventions
- Use 2-space indentation in `.svelte` and `.js` files.
- Prefer semicolons and single quotes in JavaScript, matching existing files.
- Components use PascalCase filenames (e.g., `MeasurementTable.svelte`).
- Utility modules are lowercase (e.g., `storage.js`), and Svelte stores live in `src/stores/`.
- Styling uses Tailwind via `@import "tailwindcss"` in `src/app.css`.

## Testing Guidelines
- No test framework or scripts are configured yet.
- If adding tests, include a `test` script in `package.json` and document where tests live (e.g., `src/__tests__/`).

## Commit & Pull Request Guidelines
- No Git history is present in this repository, so no commit convention is established.
- Until a standard is defined, keep commit messages short and imperative (e.g., “Add z-score chart legend”).
- PRs should describe the change, list manual test steps, and include screenshots for UI updates.

## Configuration & Data Notes
- Growth reference data lives in `src/data/` and is imported by charting logic in `src/lib/`.
- Local persistence uses browser storage via `src/lib/storage.js`; avoid server-side assumptions.
