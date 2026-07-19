# Design Philosophy

Open Fire WX is a wildfire intelligence platform. Every contribution is judged against these principles.

## Core principles

### Fast
- Loads in under 2 seconds on a typical connection
- Works well on slow connections
- PWA installs quickly

### Open
- MIT licensed
- Public roadmap
- Community plugins welcome
- Transparent governance

### Simple
- **Every screen answers one question**
- No clutter
- No hidden menus

### Beautiful
Inspired by Apple Weather, Apple Maps, Windy, and FlightRadar24: minimal, modern, smooth.

## Issue evaluation checklist

Maintainers (and the automated issue triage Action) ask:

1. **Does this keep the UI simple?**
2. **Does it improve wildfire awareness?**
3. **Does it work well on mobile?**
4. **Does it increase complexity?** (prefer less)
5. **Is it appropriate as a plugin instead of core functionality?**

If an idea adds surface area without answering a clearer question for the user, it should be a plugin — or deferred.

## Plugin vs core

| Put in **core** | Put in a **plugin** |
|-----------------|---------------------|
| Map shell, brand, layer host | Individual data layers |
| Design tokens, accessibility | New basemaps, radar, smoke, lightning |
| PWA install + offline shell | Specialized agency feeds |

## Visual identity

| Color | Purpose |
|-------|---------|
| Deep charcoal | Base UI |
| White | Cards and text |
| Fire orange | Active fires |
| Crimson | Extreme conditions |
| Golden yellow | Warnings |
| Blue | Weather |
| Forest green | Safe conditions |
