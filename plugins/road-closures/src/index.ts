import type { LayerPlugin } from '@openfirewx/shared';
import {
  closureColor,
  fetchOdotClosures,
  type RoadClosureCollection,
  type RoadClosureStatus,
} from '@openfirewx/community';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatUpdated(value: unknown): string | null {
  if (value == null || value === '') return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export const roadClosuresPlugin: LayerPlugin = {
  id: 'road-closures',
  name: 'Road Closures',
  icon: 'road',
  description: 'ODOT TripCheck highway closures and conditional closures',
  enabledByDefault: false,
  cache: {
    maxAgeSeconds: 60 * 15,
    strategy: 'network-first',
  },
  legend: {
    title: 'Closures',
    items: [
      { label: 'Closed', color: '#c1121f' },
      { label: 'Conditional', color: '#e9c46a' },
      { label: 'Restricted', color: '#e85d04' },
    ],
  },
  async layer(ctx) {
    const L = (await import('leaflet')).default;
    const dataUrl = `${ctx.basePath}/data/odot-closures.json`;

    let collection: RoadClosureCollection;
    try {
      // TripCheck blocks browser CORS — use CI-refreshed static dump first
      collection = await fetchOdotClosures({
        staticUrl: dataUrl,
        preferLive: false,
      });
    } catch {
      collection = { type: 'FeatureCollection', features: [] };
    }

    const layer = L.geoJSON(collection as unknown as GeoJSON.GeoJsonObject, {
      style(feature) {
        const status = feature?.properties?.status as RoadClosureStatus | undefined;
        const color = closureColor(status);
        return {
          color,
          weight: 4,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        };
      },
      pointToLayer(feature, latlng) {
        const status = feature.properties?.status as RoadClosureStatus | undefined;
        const color = closureColor(status);
        return L.circleMarker(latlng, {
          radius: 7,
          color: '#1a1c1e',
          weight: 1,
          fillColor: color,
          fillOpacity: 0.92,
        });
      },
      onEachFeature(feature, featureLayer) {
        const route = feature.properties?.route;
        const name = feature.properties?.name ?? 'Road closure';
        const statusLabel =
          feature.properties?.statusLabel ?? feature.properties?.status;
        const subtype = feature.properties?.subtype;
        const comments = feature.properties?.comments;
        const updated = formatUpdated(feature.properties?.updated);
        const begin = feature.properties?.beginMarker;
        const end = feature.properties?.endMarker;
        const link = feature.properties?.tripcheckUrl;

        const title = [route, name].filter(Boolean).join(' · ');
        const bits = [
          `<strong>${escapeHtml(String(title))}</strong>`,
          statusLabel ? escapeHtml(String(statusLabel)) : null,
          subtype ? escapeHtml(String(subtype)) : null,
          begin || end
            ? escapeHtml([begin, end].filter(Boolean).join(' → '))
            : null,
          comments ? escapeHtml(String(comments)) : null,
          updated ? `Updated ${escapeHtml(updated)}` : null,
          link
            ? `<a href="${escapeHtml(String(link))}" target="_blank" rel="noopener noreferrer">ODOT TripCheck</a>`
            : null,
          '<span style="color:#a8adb4">Source: ODOT TripCheck</span>',
        ].filter(Boolean);
        featureLayer.bindPopup(bits.join('<br/>'));
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

export default roadClosuresPlugin;
