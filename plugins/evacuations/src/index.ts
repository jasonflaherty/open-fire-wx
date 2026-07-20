import type { LayerPlugin } from '@openfirewx/shared';
import {
  OR_EVAC_COVERAGE_COUNTIES,
  evacColor,
  evacLevelLabel,
  fetchOrEvacuations,
  type EvacLevel,
  type EvacZoneCollection,
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

export const evacuationsPlugin: LayerPlugin = {
  id: 'evacuations',
  name: 'Evacuations',
  icon: 'evac',
  description: `Oregon Ready/Set/Go zones (${OR_EVAC_COVERAGE_COUNTIES.join(', ')})`,
  enabledByDefault: false,
  cache: {
    maxAgeSeconds: 60 * 30,
    strategy: 'network-first',
  },
  legend: {
    title: 'Evac (OR)',
    items: [
      { label: 'Ready', color: '#2d6a4f' },
      { label: 'Set', color: '#e9c46a' },
      { label: 'Go', color: '#c1121f' },
    ],
  },
  async layer(ctx) {
    const L = (await import('leaflet')).default;
    const dataUrl = `${ctx.basePath}/data/evacuations-or.json`;

    let collection: EvacZoneCollection;
    try {
      collection = await fetchOrEvacuations({
        staticUrl: dataUrl,
        preferLive: true,
      });
    } catch {
      collection = {
        type: 'FeatureCollection',
        features: [],
        coverage: [...OR_EVAC_COVERAGE_COUNTIES],
      };
    }

    const layer = L.geoJSON(collection as unknown as GeoJSON.GeoJsonObject, {
      style(feature) {
        const level = feature?.properties?.level as EvacLevel | undefined;
        const color = evacColor(level);
        return {
          color,
          weight: 1.5,
          opacity: 0.95,
          fillColor: color,
          fillOpacity: 0.28,
        };
      },
      onEachFeature(feature, featureLayer) {
        const level = feature.properties?.level as EvacLevel | undefined;
        const name = feature.properties?.name ?? 'Evacuation zone';
        const county = feature.properties?.county;
        const fireName = feature.properties?.fireName;
        const updated = formatUpdated(feature.properties?.updatedAt);
        const source = feature.properties?.source ?? 'Oregon OEM';
        const sourceUrl = feature.properties?.sourceUrl;
        const bits = [
          `<strong>${escapeHtml(String(name))}</strong>`,
          level ? escapeHtml(evacLevelLabel(level)) : null,
          county ? escapeHtml(String(county)) : null,
          fireName ? escapeHtml(String(fireName)) : null,
          updated ? `Updated ${escapeHtml(updated)}` : null,
          sourceUrl
            ? `<a href="${escapeHtml(String(sourceUrl))}" target="_blank" rel="noopener noreferrer">${escapeHtml(String(source))}</a>`
            : escapeHtml(String(source)),
          `<span style="color:#a8adb4">Coverage: OR (${OR_EVAC_COVERAGE_COUNTIES.join(', ')})</span>`,
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

export default evacuationsPlugin;
