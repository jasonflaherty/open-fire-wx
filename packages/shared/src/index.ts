import type { Layer, Map as LeafletMap } from 'leaflet';

export type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type CachePolicy = {
  /** Max age in seconds before refetch is recommended */
  maxAgeSeconds: number;
  strategy: 'static' | 'network-first' | 'cache-first';
};

export type PluginSetting = {
  id: string;
  label: string;
  type: 'boolean' | 'select' | 'range';
  defaultValue: string | number | boolean;
  options?: Array<{ label: string; value: string }>;
};

export type LegendItem = {
  label: string;
  color: string;
};

export type LegendSpec = {
  title: string;
  items: LegendItem[];
};

/** Payload when a fire perimeter is selected (opens the details sheet). */
export type FireSelectPayload = {
  properties: {
    name?: string;
    acres?: number;
    percentContained?: number;
    updated?: string | number;
    state?: string;
    shortDescription?: string;
    cause?: string;
    irwinId?: string;
    uniqueFireIdentifier?: string;
    county?: string;
    personnel?: number;
  };
  latlng: { lat: number; lng: number };
};

export type MapContext = {
  map: LeafletMap;
  basePath: string;
  onFireSelect?: (payload: FireSelectPayload) => void;
};

export type LeafletLayerHandle = {
  layer: Layer;
  destroy: () => void;
};

export type LayerPlugin = {
  id: string;
  name: string;
  icon: string;
  description?: string;
  layer: (ctx: MapContext) => LeafletLayerHandle | Promise<LeafletLayerHandle>;
  fetch?: (bounds: Bounds) => Promise<unknown>;
  cache?: CachePolicy;
  settings?: PluginSetting[];
  legend?: LegendSpec;
  enabledByDefault?: boolean;
};

export const PACKAGE_NAME = 'Open Fire WX';
export const BASE_PATH = '/open-fire-wx';

/** Bucket requests into 1-hour windows so reloads bust stale CDN/SW caches. */
export function hourlyCacheBustParam(now = Date.now()): string {
  return `h=${Math.floor(now / (60 * 60 * 1000))}`;
}

export function withHourlyCacheBust(url: string, now = Date.now()): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${hourlyCacheBustParam(now)}`;
}

export {
  US_STATE_VIEWS,
  DEFAULT_STATE_CODE,
  getStateView,
  type UsStateView,
} from './states';

export const PREFERRED_STATE_KEY = 'ofwx.preferredState';
