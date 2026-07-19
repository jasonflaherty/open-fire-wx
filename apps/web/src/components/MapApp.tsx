'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Brand, ControlStrip, LayerToggle, StatusText } from '@openfirewx/ui';
import type { LayerPlugin } from '@openfirewx/shared';

const FireMap = dynamic(
  () => import('@openfirewx/map').then((m) => m.FireMap),
  { ssr: false },
);

export function MapApp() {
  const [plugins, setPlugins] = useState<LayerPlugin[]>([]);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ firePerimetersPlugin }, { noaaWeatherPlugin }] = await Promise.all([
        import('@openfirewx/plugin-fire-perimeters'),
        import('@openfirewx/plugin-noaa-weather'),
      ]);
      if (cancelled) return;
      const list = [firePerimetersPlugin, noaaWeatherPlugin];
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
      <header className="chrome">
        <div className="chrome__panel">
          <Brand />
          <StatusText>Active perimeters · dark basemap</StatusText>
        </div>
        <div className="chrome__panel chrome__controls">
          <ControlStrip>
            <LayerToggle
              label="Fires"
              active={enabled.includes('fire-perimeters')}
              tone="fire"
              onClick={() => toggle('fire-perimeters')}
            />
            <LayerToggle
              label="Radar"
              active={enabled.includes('noaa-weather')}
              tone="weather"
              onClick={() => toggle('noaa-weather')}
            />
          </ControlStrip>
        </div>
      </header>
    </div>
  );
}
