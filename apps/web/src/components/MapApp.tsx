'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Brand,
  ControlStrip,
  LayerToggle,
  LocateButton,
  StateSelect,
} from '@openfirewx/ui';
import {
  DEFAULT_STATE_CODE,
  PREFERRED_STATE_KEY,
  US_STATE_VIEWS,
  getStateView,
  type LayerPlugin,
} from '@openfirewx/shared';
import type { CircleMarker, Map as LeafletMap } from 'leaflet';

const FireMap = dynamic(
  () => import('@openfirewx/map').then((m) => m.FireMap),
  { ssr: false },
);

const LAYERS = [
  { id: 'fire-perimeters', label: 'Fires', tone: 'fire' as const },
  { id: 'firms-hotspots', label: 'Heat', tone: 'hotspot' as const },
  { id: 'smoke', label: 'Smoke', tone: 'smoke' as const },
  { id: 'aqi', label: 'AQI', tone: 'aqi' as const },
  { id: 'noaa-weather', label: 'Radar', tone: 'weather' as const },
];

function readSavedStateCode(): string {
  try {
    const saved = window.localStorage.getItem(PREFERRED_STATE_KEY);
    if (saved && US_STATE_VIEWS.some((s) => s.code === saved)) {
      return saved;
    }
  } catch {
    /* private mode / blocked storage */
  }
  return DEFAULT_STATE_CODE;
}

function saveStateCode(code: string) {
  try {
    window.localStorage.setItem(PREFERRED_STATE_KEY, code);
  } catch {
    /* ignore */
  }
}

export function MapApp() {
  const [plugins, setPlugins] = useState<LayerPlugin[]>([]);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [stateCode, setStateCode] = useState(DEFAULT_STATE_CODE);
  const [bootstrapped, setBootstrapped] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  const stateView = useMemo(() => getStateView(stateCode), [stateCode]);

  useEffect(() => {
    setStateCode(readSavedStateCode());
    setBootstrapped(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [
        { firePerimetersPlugin },
        { firmsHotspotsPlugin },
        { smokePlugin },
        { aqiPlugin },
        { noaaWeatherPlugin },
      ] = await Promise.all([
        import('@openfirewx/plugin-fire-perimeters'),
        import('@openfirewx/plugin-firms-hotspots'),
        import('@openfirewx/plugin-smoke'),
        import('@openfirewx/plugin-aqi'),
        import('@openfirewx/plugin-noaa-weather'),
      ]);
      if (cancelled) return;
      const list = [
        firePerimetersPlugin,
        firmsHotspotsPlugin,
        smokePlugin,
        aqiPlugin,
        noaaWeatherPlugin,
      ];
      setPlugins(list);
      setEnabled(list.filter((p) => p.enabledByDefault).map((p) => p.id));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, []);

  const onMapReady = useCallback((map: LeafletMap) => {
    mapRef.current = map;
  }, []);

  function toggle(id: string) {
    setEnabled((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function onStateChange(code: string) {
    const next = getStateView(code);
    setStateCode(next.code);
    saveStateCode(next.code);
    mapRef.current?.flyTo(next.center, next.zoom, { duration: 0.7 });
  }

  async function locateMe() {
    const map = mapRef.current;
    if (!map || locating) return;
    if (!navigator.geolocation) {
      window.alert('Location is not available in this browser.');
      return;
    }

    setLocating(true);
    const L = (await import('leaflet')).default;

    map.once('locationfound', (event) => {
      const { lat, lng } = event.latlng;
      map.flyTo([lat, lng], Math.max(map.getZoom(), 11), { duration: 0.8 });

      markerRef.current?.remove();
      markerRef.current = L.circleMarker([lat, lng], {
        radius: 8,
        color: '#3a86ff',
        fillColor: '#3a86ff',
        fillOpacity: 0.85,
        weight: 2,
      })
        .bindPopup('You are here')
        .addTo(map);

      setLocating(false);
    });

    map.once('locationerror', () => {
      setLocating(false);
      window.alert('Could not find your location. Check browser permissions.');
    });

    map.locate({
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30_000,
    });
  }

  // Wait for localStorage read so the first paint uses the saved state
  if (!bootstrapped) {
    return <div className="shell" aria-busy="true" />;
  }

  return (
    <div className="shell">
      {ready ? (
        <FireMap
          className="map-root"
          plugins={plugins}
          enabledPluginIds={enabled}
          basePath={basePath || ''}
          center={stateView.center}
          zoom={stateView.zoom}
          onMapReady={onMapReady}
        />
      ) : (
        <div className="map-root" aria-busy="true" />
      )}
      <header className="chrome" aria-label="Map controls">
        <Brand name="Fire WX" tagline={undefined} />
        <ControlStrip>
          {LAYERS.map((layer) => (
            <LayerToggle
              key={layer.id}
              label={layer.label}
              active={enabled.includes(layer.id)}
              tone={layer.tone}
              onClick={() => toggle(layer.id)}
            />
          ))}
        </ControlStrip>
        <StateSelect
          value={stateCode}
          options={US_STATE_VIEWS}
          onChange={onStateChange}
        />
      </header>
      <div className="locate-wrap">
        <LocateButton locating={locating} onClick={() => void locateMe()} />
      </div>
    </div>
  );
}
