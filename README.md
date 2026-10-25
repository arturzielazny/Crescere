# Crescere

A pediatric growth monitoring app based on WHO Child Growth Standards. Track your child's weight, length, and head circumference with automatic z-score calculations and visual growth charts.

Runs on Cloudflare Workers + D1.

## Features

- **Multiple children** — Track growth for multiple children in one place
- **Z-score calculations** — Automatic WHO standard z-scores (WAZ, LAZ, HCZ, WFL)
- **Visual charts** — Growth curves with ±1SD and ±2SD reference bands
- **Future projections** — Add future measurements for growth forecasting
- **Guest mode** — Start right away without an account; save it later with an email and password, keeping all data
- **Live share links** — Give a partner or doctor read-only access to a child; revoke any time
- **CSV export/import** and a print view
- **Bilingual** — English and Polish interface

## Z-Score Indicators

| Indicator | What it measures |
|-----------|------------------|
| **WAZ** | Weight-for-Age — is weight appropriate for age? |
| **LAZ** | Length-for-Age — long-term growth indicator |
| **HCZ** | Head Circumference-for-Age — brain development proxy |
| **WFL** | Weight-for-Length — proportionality (for younger children) |

## Development

```bash
npm install      # Install dependencies
npm run dev      # Dev server with the Worker API and a local D1 database
npm test         # Front-end unit tests + Worker tests
npm run build    # Production build
npm run deploy   # Build, migrate the remote D1 database, deploy the Worker
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for architecture and first-time Cloudflare setup.

## Tech Stack

- [Svelte 5](https://svelte.dev/) — UI framework
- [Vite](https://vitejs.dev/) — Build tool
- [Chart.js](https://www.chartjs.org/) — Charts
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) + [D1](https://developers.cloudflare.com/d1/) — API and database

## Data Sources

Growth standards from [WHO Child Growth Standards](https://www.who.int/tools/child-growth-standards) (0-5 years).

## Privacy

Child data is stored in a Cloudflare D1 database tied to your account (guest or saved). The app sends no email: there is no email verification and no password reset, so keep your password safe. Share links contain only a random token; the recipient sees the data only while the link is active.

## License

MIT
