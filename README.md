# Crescere

A pediatric growth monitoring app based on WHO Child Growth Standards. Track your child's weight, length, and head circumference with automatic z-score calculations and visual growth charts.

**Live:** https://crescere.arturedward.workers.dev

## Features

- **Multiple children** — Track growth for multiple children in one place
- **Z-score calculations** — Automatic WHO standard z-scores (WAZ, LAZ, HCZ, WFL) with percentiles
- **Visual charts** — Growth curves with ±1SD and ±2SD reference bands, z-score and growth velocity charts
- **Future projections** — Add future measurements for growth forecasting
- **Guest mode** — Start right away without an account; save it later with an email and password, keeping all data
- **Live share links** — Give a partner or doctor read-only access to a child; revoke any time
- **CSV export/import** and a print view
- **Bilingual** — English and Polish interface

## Z-Score Indicators

| Indicator | What it measures                                           |
| --------- | ---------------------------------------------------------- |
| **WAZ**   | Weight-for-Age — is weight appropriate for age?            |
| **LAZ**   | Length-for-Age — long-term growth indicator                |
| **HCZ**   | Head Circumference-for-Age — brain development proxy       |
| **WFL**   | Weight-for-Length — proportionality (for younger children) |

## Development

Requires Node.js 20+. No accounts, Docker or database setup needed for local work.

```bash
npm install
npm run dev      # http://localhost:5173 — app + Worker API + local D1 database
npm test         # Front-end unit tests + Worker tests
```

## Deployment

Deploys run from your machine (there is no CI):

```bash
npx wrangler login   # once per machine
npm run deploy       # build, apply D1 migrations to production, deploy the Worker
```

Other production commands: `npm run logs` (live logs), `npm run db:backup` (export the database to `backups/`), `npx wrangler rollback` (previous Worker version).

**[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** covers architecture, the API, auth, testing, deployment and production operations.

## Tech Stack

- [Svelte 5](https://svelte.dev/) + [Vite](https://vitejs.dev/) — UI and build
- [Chart.js](https://www.chartjs.org/) — Charts
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) — API and hosting (`worker/`)
- [Cloudflare D1](https://developers.cloudflare.com/d1/) — SQLite database (`migrations/`)

## Data Sources

Growth standards from [WHO Child Growth Standards](https://www.who.int/tools/child-growth-standards) (0-5 years).

## Privacy

Child data is stored in a Cloudflare D1 database tied to your account (guest or saved). The app sends no email: there is no email verification and no password reset, so keep your password safe. Share links contain only a random token; the recipient sees the data only while the link is active.

## License

MIT
