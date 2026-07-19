import type { LayerPlugin } from '@openfirewx/shared';
import L from 'leaflet';

/** Skeleton plugin — copy into plugins/ and register from apps/web. */
export const examplePlugin: LayerPlugin = {
  id: 'example',
  name: 'Example Layer',
  icon: 'layers',
  enabledByDefault: false,
  legend: {
    title: 'Example',
    items: [{ label: 'Demo', color: '#2d6a4f' }],
  },
  layer(ctx) {
    const marker = L.circleMarker([39.5, -111.5], {
      radius: 10,
      color: '#2d6a4f',
      fillOpacity: 0.6,
    }).addTo(ctx.map);

    return {
      layer: marker,
      destroy() {
        ctx.map.removeLayer(marker);
      },
    };
  },
};

export default examplePlugin;
