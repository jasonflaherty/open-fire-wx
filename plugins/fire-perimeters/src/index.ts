import type { LayerPlugin } from '@openfirewx/shared';
import { fetchFirePerimeters, type FireCollection } from '@openfirewx/fire';

function styleFeature() {
  return {
    color: '#e85d04',
    weight: 1.5,
    opacity: 0.95,
    fillColor: '#e85d04',
    fillOpacity: 0.35,
  };
}

function formatUpdated(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
  }
  const asNum = Number(value);
  if (!Number.isNaN(asNum) && String(value).length >= 12) {
    const d = new Date(asNum);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
  }
  return String(value);
}

export const firePerimetersPlugin: LayerPlugin = {
  id: 'fire-perimeters',
  name: 'Fire Perimeters',
  icon: 'fire',
  description: 'Current interagency wildfire perimeters (NIFC WFIGS)',
  enabledByDefault: true,
  cache: {
    maxAgeSeconds: 60 * 30,
    strategy: 'network-first',
  },
  legend: {
    title: 'Fires',
    items: [{ label: 'Active perimeter', color: '#e85d04' }],
  },
  async layer(ctx) {
    const L = (await import('leaflet')).default;
    const dataUrl = `${ctx.basePath}/data/fires.json`;

    let collection: FireCollection;
    try {
      // Prefer live NIFC (CORS-enabled); fall back to static JSON on Pages
      collection = await fetchFirePerimeters({
        staticUrl: dataUrl,
        preferLive: true,
      });
    } catch {
      collection = { type: 'FeatureCollection', features: [] };
    }

    const geoJson = L.geoJSON(collection as unknown as GeoJSON.GeoJsonObject, {
      style: styleFeature,
      onEachFeature(feature, layer) {
        const name = feature.properties?.name ?? 'Fire';
        const acres = feature.properties?.acres;
        const contained = feature.properties?.percentContained;
        const state = feature.properties?.state;
        const updated = formatUpdated(feature.properties?.updated);
        const bits = [
          `<strong>${name}</strong>`,
          state ? String(state) : null,
          acres != null ? `${Math.round(Number(acres)).toLocaleString()} acres` : null,
          contained != null ? `${Math.round(Number(contained))}% contained` : null,
          updated ? `Updated ${updated}` : null,
        ].filter(Boolean);
        layer.bindPopup(bits.join('<br/>'));
      },
    });

    geoJson.addTo(ctx.map);

    return {
      layer: geoJson,
      destroy() {
        ctx.map.removeLayer(geoJson);
      },
    };
  },
};

export default firePerimetersPlugin;
