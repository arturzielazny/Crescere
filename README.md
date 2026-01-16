# Crescere

A pediatric growth monitoring app based on WHO Child Growth Standards. Track your child's weight, length, and head circumference with automatic z-score calculations and visual growth charts.

**Live demo:** https://arturzielazny.github.io/Crescere/

## Features

- **Multiple children** — Track growth for multiple children in one place
- **Z-score calculations** — Automatic WHO standard z-scores (WAZ, LAZ, HCZ, WFL)
- **Visual charts** — Growth curves with ±1SD and ±2SD reference bands
- **Future projections** — Add future measurements for growth forecasting
- **Shareable links** — Share child data via compressed URL
- **Offline-capable** — All data stored locally in your browser
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
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Tech Stack

- [Svelte 5](https://svelte.dev/) — UI framework
- [Vite](https://vitejs.dev/) — Build tool
- [Chart.js](https://www.chartjs.org/) — Charts
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [LZ-String](https://github.com/pieroxy/lz-string) — URL compression

## Data Sources

Growth standards from [WHO Child Growth Standards](https://www.who.int/tools/child-growth-standards) (0-5 years).

## Privacy

All data is stored locally in your browser's localStorage. Nothing is sent to any server. Shared links contain the data itself (compressed in the URL fragment), not references to server-stored data.

## License

MIT
