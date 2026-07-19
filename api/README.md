# API (future)

GitHub Pages serves a static site, so this package is a **stub** for a future edge/API backend (e.g. Cloudflare Workers or Hono).

For the MVP:

- Fire perimeters are refreshed into `apps/web/public/data/fires.json` via `pnpm refresh-data` / `.github/workflows/refresh-data.yml` (daily; history pruned every ~3 days)
- The browser loads that static file (with live CORS fallback where available)

Do not add Node server routes required at runtime until hosting moves beyond static Pages.
