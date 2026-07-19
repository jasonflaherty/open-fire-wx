import type { LayerPlugin } from '@openfirewx/shared';
import {
  aqiCategory,
  aqiColor,
  fetchAirNowPm25,
  type AqiCollection,
} from '@openfirewx/weather';

export const aqiPlugin: LayerPlugin = {
  id: 'aqi',
  name: 'AQI',
  icon: 'wind',
  description: 'AirNow PM2.5 air quality monitors',
  enabledByDefault: false,
  cache: {
    maxAgeSeconds: 60 * 30,
    strategy: 'network-first',
  },
  legend: {
    title: 'AQI',
    items: [
      { label: 'Good', color: '#2d6a4f' },
      { label: 'Moderate', color: '#e9c46a' },
      { label: 'Unhealthy (sensitive)', color: '#e85d04' },
      { label: 'Unhealthy', color: '#c1121f' },
    ],
  },
  async layer(ctx) {
    const L = (await import('leaflet')).default;
    const bounds = ctx.map.getBounds();

    let collection: AqiCollection;
    try {
      collection = await fetchAirNowPm25({
        west: bounds.getWest() - 2,
        south: bounds.getSouth() - 1,
        east: bounds.getEast() + 2,
        north: bounds.getNorth() + 1,
      });
    } catch {
      // Fall back to CONUS if the view query fails
      try {
        collection = await fetchAirNowPm25();
      } catch {
        collection = { type: 'FeatureCollection', features: [] };
      }
    }

    const canvas = L.canvas({ padding: 0.5 });
    const layer = L.geoJSON(collection as unknown as GeoJSON.GeoJsonObject, {
      pointToLayer(feature, latlng) {
        const aqi = feature.properties?.aqi as number | undefined;
        const color = aqiColor(aqi);
        return L.circleMarker(latlng, {
          radius: 7,
          color: '#1a1c1e',
          weight: 1,
          fillColor: color,
          fillOpacity: 0.9,
          renderer: canvas,
        });
      },
      onEachFeature(feature, marker) {
        const name = feature.properties?.siteName ?? 'Monitor';
        const aqi = feature.properties?.aqi;
        const pm25 = feature.properties?.pm25;
        const area = feature.properties?.area;
        const bits = [
          `<strong>${name}</strong>`,
          area ? String(area) : null,
          aqi != null ? `AQI ${aqi} · ${aqiCategory(aqi)}` : null,
          pm25 != null ? `PM2.5 ${Number(pm25).toFixed(1)} µg/m³` : null,
        ].filter(Boolean);
        marker.bindPopup(bits.join('<br/>'));
      },
    });

    layer.addTo(ctx.map);

    return {
      layer,
      destroy() {
        ctx.map.removeLayer(layer);
      },
    };
  },
};

export default aqiPlugin;
