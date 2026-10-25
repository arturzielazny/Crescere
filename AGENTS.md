# Repository Guidelines

## Project Structure & Module Organization
- `src/` is the app source. Entry points are `src/main.js` and `src/App.svelte`.
- UI lives in `src/components/` (Svelte components, PascalCase files).
- State and i18n are in `src/stores/` (Svelte stores).
- Core logic is in `src/lib/` (API client, z-score, sharing, CSV).
- The backend is a Cloudflare Worker in `worker/` with a D1 database; schema migrations are in `migrations/`.
- WHO reference datasets live in `src/data/`.
- Build output goes to `dist/` (generated).
- Utility scripts live in `scripts/` (e.g., WHO data compression, password reset).

## Build, Test, and Development Commands
- `npm install` — install dependencies.
- `npm run dev` — start Vite dev server with HMR, the Worker API and a local D1 database.
- `npm run build` — production build into `dist/`.
- `npm run preview` — serve the built app locally.
- `npm run test` — run front-end unit tests and Worker tests; `npm run test:watch` for watch mode.
- `npm run lint` / `npm run lint:fix` — ESLint checks and fixes.
- `npm run format` / `npm run format:check` — Prettier formatting.

## Coding Style & Naming Conventions
- 2-space indentation, single quotes, semicolons (Prettier enforced).
- `.svelte` components use PascalCase; `.js` utilities are lowercase.
- Prefix intentionally unused vars with `_` to satisfy ESLint.
- Tailwind is used via `src/app.css`.

## Testing Guidelines
- Test framework: Vitest.
- Tests live near code (example: `src/lib/zscore.test.js`); Worker tests live in `worker/test/`.
- Name tests `*.test.js` and keep coverage around core logic (z-scores, stores, API access control).

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and sentence case (e.g., “Fix chart titles on language change”).
- PRs should include a clear description, linked issue (if any), and test results.
- Include before/after screenshots or GIFs for UI changes.

## Agent-Specific Notes
- Derived store values can be briefly undefined during Svelte render cycles; use optional chaining in templates.
- D1 has no row-level security: every Worker query must be scoped to the signed-in user, with a test proving other users can't reach the data.
