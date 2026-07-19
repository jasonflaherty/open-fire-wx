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
  description: 'Current interagency wildfire perimeters (NIFC WFIGS)',
  enabledByDefault: true,
  cache: {
    maxAgeSeconds: 60 * 60,
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
        layer.on('click', (event) => {
          L.DomEvent.stopPropagation(event);
          ctx.onFireSelect?.({
            properties: {
              name: feature.properties?.name,
              acres: feature.properties?.acres,
              percentContained: feature.properties?.percentContained,
              updated: feature.properties?.updated,
              state: feature.properties?.state,
              shortDescription: feature.properties?.shortDescription,
              cause: feature.properties?.cause,
              irwinId: feature.properties?.irwinId,
              uniqueFireIdentifier: feature.properties?.uniqueFireIdentifier,
              county: feature.properties?.county,
              personnel: feature.properties?.personnel,
            },
            latlng: { lat: event.latlng.lat, lng: event.latlng.lng },
          });
        });
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
