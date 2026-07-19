import type { LayerPlugin } from '@openfirewx/shared';
import { fetchSmokeLayerTime, smokeExportImageUrl } from '@openfirewx/weather';

export const smokePlugin: LayerPlugin = {
  id: 'smoke',
  name: 'Smoke',
  icon: 'smoke',
  description: 'NOAA surface smoke concentration guidance',
  enabledByDefault: false,
  cache: {
    maxAgeSeconds: 60 * 60,
    strategy: 'network-first',
  },
  legend: {
    title: 'Smoke',
    items: [{ label: 'Surface concentration', color: '#8d99ae' }],
  },
  async layer(ctx) {
    const L = (await import('leaflet')).default;
    const time = await fetchSmokeLayerTime();

    const SmokeGrid = L.GridLayer.extend({
      options: {
        opacity: 0.62,
        className: 'ofwx-smoke-tiles',
      },
      createTile(coords: L.Coords, done: L.DoneCallback) {
        const tile = document.createElement('img');
        tile.alt = '';
        tile.setAttribute('role', 'presentation');
        tile.crossOrigin = 'anonymous';

        // Leaflet GridLayer provides this helper on instances
        const bounds = (
          this as unknown as { _tileCoordsToBounds: (c: L.Coords) => L.LatLngBounds }
        )._tileCoordsToBounds(coords);
        const size = this.getTileSize();

        tile.onload = () => done(undefined, tile);
        tile.onerror = () => done(new Error('Smoke tile failed'), tile);
        tile.src = smokeExportImageUrl({
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
          width: size.x,
          height: size.y,
          time,
        });

        return tile;
      },
    });

    const overlay = new SmokeGrid();
    overlay.addTo(ctx.map);

    return {
      layer: overlay,
      destroy() {
        ctx.map.removeLayer(overlay);
      },
    };
  },
};

export default smokePlugin;
