import type { LayerPlugin } from '@openfirewx/shared';
import {
  fetchOrShelters,
  type ShelterCollection,
  type ShelterFeature,
} from '@openfirewx/community';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function petLabel(value: boolean | 'unknown' | undefined): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'Unknown — confirm with OEM';
}

function isPetsCapable(feature: ShelterFeature): boolean {
  return (
    feature.properties.petsAllowed === true ||
    feature.properties.livestockAllowed === true
  );
}

function bindShelterPopup(
  feature: GeoJSON.Feature,
  marker: { bindPopup: (html: string) => void },
) {
  const p = feature.properties ?? {};
  const name = p.name ?? 'Shelter';
  const bits = [
    `<strong>${escapeHtml(String(name))}</strong>`,
    p.address ? escapeHtml(String(p.address)) : null,
    p.phone ? escapeHtml(String(p.phone)) : null,
    p.county ? escapeHtml(String(p.county)) : null,
    `Pets: ${escapeHtml(petLabel(p.petsAllowed as boolean | 'unknown'))}`,
    `Livestock: ${escapeHtml(petLabel(p.livestockAllowed as boolean | 'unknown'))}`,
    p.petsNotes ? escapeHtml(String(p.petsNotes)) : null,
    p.incidentName ? `Incident: ${escapeHtml(String(p.incidentName))}` : null,
    p.sourceUrl
      ? `<a href="${escapeHtml(String(p.sourceUrl))}" target="_blank" rel="noopener noreferrer">${escapeHtml(String(p.source ?? 'Source'))}</a>`
      : escapeHtml(String(p.source ?? '')),
    '<em style="color:#a8adb4">Confirm with county OEM before you go.</em>',
  ].filter(Boolean);
  marker.bindPopup(bits.join('<br/>'));
}

export const sheltersPlugin: LayerPlugin = {
  id: 'shelters',
  name: 'Shelters',
  icon: 'shelter',
  description: 'Oregon shelters and animal-capable fairgrounds (confirm before travel)',
  enabledByDefault: false,
  cache: {
    maxAgeSeconds: 60 * 60,
    strategy: 'network-first',
  },
  legend: {
    title: 'Shelters',
    items: [
      { label: 'People / mixed', color: '#3a86ff' },
      { label: 'Livestock capable', color: '#2d6a4f' },
      { label: 'Pets OK filter', color: '#a8adb4' },
    ],
  },
  async layer(ctx) {
    const L = (await import('leaflet')).default;
    const dataUrl = `${ctx.basePath}/data/shelters-or.json`;

    let collection: ShelterCollection;
    try {
      collection = await fetchOrShelters({ staticUrl: dataUrl });
    } catch {
      collection = { type: 'FeatureCollection', features: [] };
    }

    let petsOnly = false;

    const buildLayer = (features: ShelterFeature[]) =>
      L.geoJSON(
        { type: 'FeatureCollection', features } as GeoJSON.GeoJsonObject,
        {
          pointToLayer(feature, latlng) {
            const livestock = feature.properties?.livestockAllowed === true;
            const color = livestock ? '#2d6a4f' : '#3a86ff';
            return L.circleMarker(latlng, {
              radius: 8,
              color: '#1a1c1e',
              weight: 1,
              fillColor: color,
              fillOpacity: 0.9,
            });
          },
          onEachFeature(feature, marker) {
            bindShelterPopup(feature, marker);
          },
        },
      );

    let layer = buildLayer(collection.features);
    layer.addTo(ctx.map);

    const FilterControl = L.Control.extend({
      onAdd() {
        const wrap = L.DomUtil.create('label', 'ofwx-shelter-filter');
        wrap.style.cssText =
          'display:flex;align-items:center;gap:0.35rem;padding:0.35rem 0.55rem;background:rgba(26,28,30,0.92);color:#f4f1ea;border-radius:4px;font:12px/1.2 system-ui,sans-serif;cursor:pointer;user-select:none;';
        const input = L.DomUtil.create('input') as HTMLInputElement;
        input.type = 'checkbox';
        input.checked = petsOnly;
        const text = L.DomUtil.create('span');
        text.textContent = 'Pets OK';
        wrap.appendChild(input);
        wrap.appendChild(text);
        L.DomEvent.disableClickPropagation(wrap);
        L.DomEvent.on(input, 'change', () => {
          petsOnly = input.checked;
          ctx.map.removeLayer(layer);
          const features = petsOnly
            ? collection.features.filter(isPetsCapable)
            : collection.features;
          layer = buildLayer(features);
          layer.addTo(ctx.map);
        });
        return wrap;
      },
    });
    const filterControl = new FilterControl({ position: 'bottomleft' });
    ctx.map.addControl(filterControl);

    return {
      layer,
      destroy() {
        ctx.map.removeControl(filterControl);
        ctx.map.removeLayer(layer);
      },
    };
  },
};

export default sheltersPlugin;
