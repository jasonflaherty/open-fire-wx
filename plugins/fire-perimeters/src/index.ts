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

export const firePerimetersPlugin: LayerPlugin = {
  id: 'fire-perimeters',
  name: 'Fire Perimeters',
  icon: 'fire',
  description: 'Current interagency wildfire perimeters',
  enabledByDefault: true,
  cache: {
    maxAgeSeconds: 60 * 30,
    strategy: 'static',
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
      collection = await fetchFirePerimeters({ staticUrl: dataUrl });
    } catch {
      collection = { type: 'FeatureCollection', features: [] };
    }

    const geoJson = L.geoJSON(collection as unknown as GeoJSON.GeoJsonObject, {
      style: styleFeature,
      onEachFeature(feature, layer) {
        const name = feature.properties?.name ?? 'Fire';
        const acres = feature.properties?.acres;
        const contained = feature.properties?.percentContained;
        const bits = [
          `<strong>${name}</strong>`,
          acres != null ? `${Math.round(acres).toLocaleString()} acres` : null,
          contained != null ? `${Math.round(contained)}% contained` : null,
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
