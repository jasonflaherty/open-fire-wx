# Open Fire WX

Open source wildfire intelligence map — fast, simple, and beautiful.

**Live:** https://jasonflaherty.github.io/open-fire-wx/

Every screen answers one question. The first screen answers: **Where are the fires?**

## Principles

- **Fast** — under 2s loads, works on slow connections, installable PWA
- **Open** — MIT license, public roadmap, community plugins
- **Simple** — no clutter, no hidden menus
- **Beautiful** — inspired by Apple Weather, Windy, FlightRadar24

Read the [design philosophy](apps/docs/DESIGN_PHILOSOPHY.md).

## Quick start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

```bash
pnpm build          # static export → apps/web/out
pnpm refresh-data   # fetch NIFC perimeters → public/data/fires.json
pnpm typecheck
```

## Monorepo layout

```
apps/web          Next.js static PWA (Leaflet map)
apps/docs         Philosophy & docs
packages/*        Shared UI, map host, fire/weather helpers
plugins/*         Layer plugins (fire perimeters, radar, …)
design-system/    Color & typography tokens
api/              Future backend stub
workers/          Future ingest stub
examples/         Example plugin skeleton
```

## Plugins

Layers are plugins. Each defines `name`, `icon`, `layer`, optional `cache`, `settings`, and `legend`. The map host loads enabled plugins — see [`plugins/fire-perimeters`](plugins/fire-perimeters) and [`examples/example-plugin`](examples/example-plugin).

## GitHub Pages

The app is a static export (`output: 'export'`) with `basePath: /open-fire-wx`.

Deploy is handled by [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) on every push to `main`.

**Required repo setting:** Settings → Pages → **Build and deployment** → Source: **GitHub Actions** (not the `gh-pages` branch).

## License

MIT © Jason Flaherty
