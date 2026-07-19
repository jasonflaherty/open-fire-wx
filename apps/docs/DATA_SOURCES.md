# Data Sources

Open Fire WX treats map layers as **plugins**. Core stays thin; data providers plug in.

## Recommended MVP stack

| Purpose | Source | Priority | Status |
|---------|--------|----------|--------|
| Fire perimeters | NIFC WFIGS | ★★★★★ | Live (plugin) |
| Satellite hotspots | NASA FIRMS / VIIRS (Living Atlas) | ★★★★★ | Live (plugin) |
| Official incidents | NIFC / InciWeb | ★★★★★ | Partial (perimeter metadata) |
| Weather / radar | NOAA / RainViewer | ★★★★★ | Radar overlay |
| Wind | NOAA | ★★★★ | Planned |
| Smoke | NOAA HRRR Smoke | ★★★★ | Planned |
| Air quality | AirNow | ★★★ | Planned |
| Terrain | USGS | ★★★ | Planned |
| Basemap | OSM / Carto Dark (Leaflet) | ★★★★★ | Live |

## Active fire incidents

### National Interagency Fire Center (NIFC)
Best for large incident information, fire perimeters, incident metadata, InciWeb integration.

Provides: fire name, acres, containment, incident ID, cause (when available).

**Use as the main official fire layer.** Current plugin: `plugins/fire-perimeters` → WFIGS Current Perimeters.

### InciWeb
Best for official incident reports, news, closures, evacuations, photos.

**Use for a fire details panel** (planned) — not the primary map geometry.

### NIFC perimeters (GIS)
Current and historical perimeter polygons. Prefer polygons over points for confirmed incidents.

## Satellite fire detection

### NASA FIRMS (highly recommended)
Active fire hotspots from VIIRS / MODIS with confidence, detection time, and FRP.

- Worldwide, near real-time, excellent API ([MAP_KEY](https://firms.modaps.eosdis.nasa.gov/api/map_key/) optional for direct FIRMS API)
- Shows heat before official incidents exist

**Current plugin:** `plugins/firms-hotspots` uses the public ArcGIS Living Atlas VIIRS thermal layer (CORS-friendly, no key). Optional future path: direct FIRMS Area API via `FIRMS_MAP_KEY` for global refresh jobs.

## USGS
Burn scars, terrain, elevation, hillshade — useful for spread context and later “why is this active?” analysis.

## Weather

| Source | Role |
|--------|------|
| NOAA | Primary: wind, temp, RH, forecasts, watches/warnings |
| National Weather Service | Red Flag Warnings, Fire Weather Watches, spot forecasts, discussions |
| Open-Meteo | Free global backup (no API key) |

## Smoke & air quality

| Source | Role |
|--------|------|
| NOAA HRRR Smoke | Current + forecast smoke concentration |
| AirNow | AQI, PM2.5, PM10, ozone |

## Lightning

| Source | Notes |
|--------|------|
| NLDN | Excellent, commercial |
| Blitzortung | Community / free option |

## Evacuations & road closures
Vary by state/county. Plugin-per-region (Caltrans, ODOT, WSDOT, county OEM feeds).

## Basemaps
Avoid Google Maps (licensing/cost). Prefer: OpenStreetMap, MapLibre/OpenFreeMap, OpenTopoMap, USGS topo, ESRI imagery (check license).

## Fuel models & terrain
USFS vegetation / fuel models; USGS DEMs, slope, aspect, hillshade — valuable for fire behavior estimates later.

## Historical fires
NIFC historical perimeters, MTBS, FIRMS archive — timeline playback and trends.

## Global expansion
FIRMS already global. Also: CWFIS (Canada), EFFIS (Europe), Australia state agencies, NZ Fire and Emergency.

## Differentiator: “Why is this fire active?”
Plain-language synthesis of weather, terrain, and recent observations, e.g.:

> Low humidity (12%), southwest winds at 18 mph, temperatures above 95°F, and steep southwest-facing slopes are contributing to increased fire activity today.

Keep the UI simple: one panel, one explanation — not a dashboard.
