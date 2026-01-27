# Repository Guidelines

## Project Structure & Module Organization
- `src/` is the app source. Entry points are `src/main.js` and `src/App.svelte`.
- UI lives in `src/components/` (Svelte components, PascalCase files).
- State and i18n are in `src/stores/` (Svelte stores).
- Core logic is in `src/lib/` (storage, z-score, sharing, charts).
- WHO reference datasets live in `src/data/`.
- Static assets are in `public/`.
- Build output goes to `dist/` (generated).
- Utility scripts live in `scripts/` (e.g., WHO data compression).

## Build, Test, and Development Commands
- `npm install` — install dependencies.
- `npm run dev` — start Vite dev server with HMR.
- `npm run build` — production build into `dist/`.
- `npm run preview` — serve the built app locally.
- `npm run test` — run Vitest once; `npm run test:watch` for watch mode.
- `npm run lint` / `npm run lint:fix` — ESLint checks and fixes.
- `npm run format` / `npm run format:check` — Prettier formatting.

## Coding Style & Naming Conventions
- 2-space indentation, single quotes, semicolons (Prettier enforced).
- `.svelte` components use PascalCase; `.js` utilities are lowercase.
- Prefix intentionally unused vars with `_` to satisfy ESLint.
- Tailwind is used via `src/app.css`.

## Testing Guidelines
- Test framework: Vitest.
- Tests live near code (example: `src/lib/storage.test.js`).
- Name tests `*.test.js` and keep coverage around core logic (storage, z-scores, migrations).

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and sentence case (e.g., “Fix chart titles on language change”).
- PRs should include a clear description, linked issue (if any), and test results.
- Include before/after screenshots or GIFs for UI changes.

## Agent-Specific Notes
- Derived store values can be briefly undefined during Svelte render cycles; use optional chaining in templates.
- localStorage schema is versioned; update migrations and tests when changing it.
