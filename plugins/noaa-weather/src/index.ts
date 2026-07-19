import type { LayerPlugin } from '@openfirewx/shared';
import { fetchRainViewerTileUrl } from '@openfirewx/weather';

export const noaaWeatherPlugin: LayerPlugin = {
  id: 'noaa-weather',
  name: 'Radar',
  icon: 'cloud',
  description: 'Precipitation radar overlay (RainViewer)',
  enabledByDefault: false,
  cache: {
    maxAgeSeconds: 60 * 10,
    strategy: 'network-first',
  },
  legend: {
    title: 'Weather',
    items: [{ label: 'Precipitation', color: '#3a86ff' }],
  },
  async layer(ctx) {
    const L = (await import('leaflet')).default;
    const tileUrl =
      (await fetchRainViewerTileUrl()) ??
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    const overlay = L.tileLayer(tileUrl, {
      opacity: 0.55,
      attribution: '&copy; RainViewer',
      maxZoom: 12,
    });

    overlay.addTo(ctx.map);

    return {
      layer: overlay,
      destroy() {
        ctx.map.removeLayer(overlay);
      },
    };
  },
};

export default noaaWeatherPlugin;
