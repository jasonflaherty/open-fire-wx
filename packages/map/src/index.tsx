'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import type { LayerPlugin, LeafletLayerHandle } from '@openfirewx/shared';
import { BASE_PATH } from '@openfirewx/shared';
import { LongPressWeather } from './LongPressWeather';

export type FireMapProps = {
  plugins: LayerPlugin[];
  enabledPluginIds: string[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  children?: ReactNode;
  basePath?: string;
  onMapReady?: (map: LeafletMap) => void;
};

function PluginLayers({
  plugins,
  enabledPluginIds,
  basePath,
}: {
  plugins: LayerPlugin[];
  enabledPluginIds: string[];
  basePath: string;
}) {
  const map = useMap();
  const handlesRef = useRef<Map<string, LeafletLayerHandle>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const enabled = new Set(enabledPluginIds);

      for (const [id, handle] of handlesRef.current) {
        if (!enabled.has(id)) {
          handle.destroy();
          handlesRef.current.delete(id);
        }
      }

      for (const plugin of plugins) {
        if (!enabled.has(plugin.id) || handlesRef.current.has(plugin.id)) {
          continue;
        }
        const handle = await plugin.layer({ map, basePath });
        if (cancelled) {
          handle.destroy();
          continue;
        }
        handlesRef.current.set(plugin.id, handle);
      }
    }

    void sync();

    return () => {
      cancelled = true;
    };
  }, [plugins, enabledPluginIds, map, basePath]);

  useEffect(() => {
    return () => {
      for (const handle of handlesRef.current.values()) {
        handle.destroy();
      }
      handlesRef.current.clear();
    };
  }, []);

  return null;
}

function MapReady({ onReady }: { onReady?: (map: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady?.(map);
  }, [map, onReady]);
  return null;
}

export function FireMap({
  plugins,
  enabledPluginIds,
  center = [44.0, -120.5],
  zoom = 7,
  className,
  children,
  basePath = BASE_PATH,
  onMapReady,
}: FireMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={className} aria-busy="true" />;
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      zoomControl={false}
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <PluginLayers
        plugins={plugins}
        enabledPluginIds={enabledPluginIds}
        basePath={basePath}
      />
      <MapReady onReady={onMapReady} />
      <LongPressWeather />
      {children}
    </MapContainer>
  );
}

export { useMap } from 'react-leaflet';
export { LongPressWeather } from './LongPressWeather';
