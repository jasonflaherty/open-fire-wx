# Roadmap

Public roadmap for Open Fire WX. Data priorities live in [DATA_SOURCES.md](apps/docs/DATA_SOURCES.md).

## MVP data stack

| Purpose | Source | Status |
|---------|--------|--------|
| Official fire perimeters | NIFC WFIGS | Done |
| Satellite hotspots | NASA FIRMS / VIIRS | Done |
| Weather / radar | NOAA / RainViewer | Radar done |
| Wind visualization | NOAA | Next |
| Smoke forecasts | NOAA HRRR Smoke | Next |
| Air quality | AirNow | Later |
| Terrain | USGS | Later |
| Basemap | OSM + dark tiles | Done (Leaflet) |

## Open Fire Maps

- [x] Active perimeter map (Leaflet)
- [x] Plugin-based layers
- [x] Static GitHub Pages deploy
- [x] Satellite hotspots (FIRMS / VIIRS)
- [ ] InciWeb details panel
- [ ] Additional basemaps (topo, imagery)
- [ ] Evacuation / road-closure plugins (regional)

## Open Fire Weather

- [x] Radar overlay (plugin)
- [ ] Wind
- [ ] Relative humidity
- [ ] Temperature
- [ ] Red Flag Warnings / Fire Weather Watches

## Open Fire Forecast

- [ ] Next 72 hours
- [ ] Smoke forecast (HRRR)
- [ ] AI summaries
- [ ] Spread potential

## Open Fire History

- [ ] Fire progression
- [ ] Historical weather
- [ ] Burn scars (MTBS / USGS)

## Open Fire AI

- [ ] “Why is this fire active?” panel
- [ ] Natural-language summaries
- [ ] Risk explanations
- [ ] Predictive insights
- [x] AI-assisted issue triage (advisory)

## Platform

- [ ] Offline map downloads
- [ ] Localization
- [ ] Optional edge API beyond Pages
- [ ] Global default extent (FIRMS-first)
