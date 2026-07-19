# Contributing

Thanks for helping build Open Fire WX.

## Before you open an issue or PR

Read [Design Philosophy](apps/docs/DESIGN_PHILOSOPHY.md). Ask:

1. Does this keep the UI simple?
2. Does it improve wildfire awareness?
3. Does it work well on mobile?
4. Does it increase complexity?
5. Should it be a **plugin** instead of core?

## Good first issues

- Add a new basemap
- Improve dark mode / contrast
- Add keyboard shortcuts
- Create a new weather layer plugin
- Improve accessibility
- Add localization
- Add a new fire data provider

## Local development

```bash
pnpm install
pnpm dev
```

- Node 20+
- pnpm 9+

## Adding a layer plugin

1. Copy `examples/example-plugin`
2. Implement the `LayerPlugin` contract from `@openfirewx/shared`
3. Add the workspace package under `plugins/`
4. Register it in `apps/web/src/components/MapApp.tsx`

## Pull requests

- Keep PRs focused and small
- Prefer plugins over core UI growth
- Include screenshots for visual changes
- Ensure `pnpm typecheck` and `pnpm build` pass

Humans make the final merge decision. Automated issue triage may leave a recommendation comment — it is advisory only.
