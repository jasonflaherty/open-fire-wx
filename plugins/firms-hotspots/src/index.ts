import type { LayerPlugin } from '@openfirewx/shared';
import { fetchHotspots, type HotspotCollection } from '@openfirewx/fire';

function hotspotRadius(frp?: number): number {
  if (frp == null || frp <= 0) return 3;
  if (frp < 5) return 3;
  if (frp < 20) return 5;
  if (frp < 50) return 7;
  return 9;
}

function hotspotColor(confidence?: string): string {
  const c = (confidence ?? '').toLowerCase();
  if (c === 'high') return '#c1121f';
  if (c === 'nominal') return '#e85d04';
  return '#e9c46a';
}

export const firmsHotspotsPlugin: LayerPlugin = {
  id: 'firms-hotspots',
  name: 'Satellite Heat',
  icon: 'satellite',
  description: 'NASA FIRMS / VIIRS thermal hotspots (last 24h, CONUS)',
  enabledByDefault: true,
  cache: {
    maxAgeSeconds: 60 * 30,
    strategy: 'network-first',
  },
  legend: {
    title: 'Satellite heat',
    items: [
      { label: 'High confidence', color: '#c1121f' },
      { label: 'Nominal', color: '#e85d04' },
      { label: 'Low', color: '#e9c46a' },
    ],
  },
  async layer(ctx) {
    const L = (await import('leaflet')).default;
    const dataUrl = `${ctx.basePath}/data/hotspots.json`;

    let collection: HotspotCollection;
    try {
      collection = await fetchHotspots({
        staticUrl: dataUrl,
        preferLive: true,
      });
    } catch {
      collection = { type: 'FeatureCollection', features: [] };
    }

    const canvas = L.canvas({ padding: 0.5 });
    const layer = L.geoJSON(collection as unknown as GeoJSON.GeoJsonObject, {
      pointToLayer(feature, latlng) {
        const frp = feature.properties?.frp as number | undefined;
        const confidence = feature.properties?.confidence as string | undefined;
        return L.circleMarker(latlng, {
          radius: hotspotRadius(frp),
          color: hotspotColor(confidence),
          fillColor: hotspotColor(confidence),
          fillOpacity: 0.75,
          weight: 0.5,
          opacity: 0.95,
          renderer: canvas,
        });
      },
      onEachFeature(feature, marker) {
        const frp = feature.properties?.frp;
        const confidence = feature.properties?.confidence ?? 'n/a';
        const hours = feature.properties?.hoursOld;
        const bits = [
          '<strong>Satellite heat detection</strong>',
          `Confidence: ${confidence}`,
          frp != null ? `FRP: ${Number(frp).toFixed(1)} MW` : null,
          hours != null ? `${hours}h ago` : null,
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

export default firmsHotspotsPlugin;
