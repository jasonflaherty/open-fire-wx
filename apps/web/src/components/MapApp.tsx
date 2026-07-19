'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Brand, ControlStrip, LayerToggle } from '@openfirewx/ui';
import type { LayerPlugin } from '@openfirewx/shared';

const FireMap = dynamic(
  () => import('@openfirewx/map').then((m) => m.FireMap),
  { ssr: false },
);

const LAYERS = [
  { id: 'fire-perimeters', label: 'Fires', tone: 'fire' as const },
  { id: 'firms-hotspots', label: 'Heat', tone: 'hotspot' as const },
  { id: 'noaa-weather', label: 'Radar', tone: 'weather' as const },
];

export function MapApp() {
  const [plugins, setPlugins] = useState<LayerPlugin[]>([]);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [
        { firePerimetersPlugin },
        { firmsHotspotsPlugin },
        { noaaWeatherPlugin },
      ] = await Promise.all([
        import('@openfirewx/plugin-fire-perimeters'),
        import('@openfirewx/plugin-firms-hotspots'),
        import('@openfirewx/plugin-noaa-weather'),
      ]);
      if (cancelled) return;
      const list = [firePerimetersPlugin, firmsHotspotsPlugin, noaaWeatherPlugin];
      setPlugins(list);
      setEnabled(list.filter((p) => p.enabledByDefault).map((p) => p.id));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id: string) {
    setEnabled((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="shell">
      {ready ? (
        <FireMap
          className="map-root"
          plugins={plugins}
          enabledPluginIds={enabled}
          basePath={basePath || ''}
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
      </header>
    </div>
  );
}
