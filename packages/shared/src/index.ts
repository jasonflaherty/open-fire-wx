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

export type MapContext = {
  map: LeafletMap;
  basePath: string;
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
