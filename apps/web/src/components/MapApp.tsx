'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Brand,
  ControlStrip,
  LayerToggle,
  LocateButton,
  MenuButton,
} from '@openfirewx/ui';
import {
  DEFAULT_STATE_CODE,
  PREFERRED_STATE_KEY,
  US_STATE_VIEWS,
  detectLocale,
  favoriteIdFromSelection,
  getStateView,
  isFavoriteId,
  localeTag,
  readFavorites,
  selectionFromFavorite,
  t as translate,
  toggleFavorite,
  writeFavorites,
  writeLocale,
  type FavoriteFire,
  type FireSelectPayload,
  type LayerPlugin,
  type Locale,
  type MessageKey,
} from '@openfirewx/shared';
import type { CircleMarker, Map as LeafletMap } from 'leaflet';
import { FireInfoSheet } from './FireInfoSheet';
import { FavoritesSheet } from './FavoritesSheet';
import { MoreSheet } from './MoreSheet';

const FireMap = dynamic(
  () => import('@openfirewx/map').then((m) => m.FireMap),
  { ssr: false },
);

const LAYER_DEFS = [
  { id: 'fire-perimeters', labelKey: 'layer.fires' as const, tone: 'fire' as const },
  { id: 'firms-hotspots', labelKey: 'layer.heat' as const, tone: 'hotspot' as const },
  { id: 'smoke', labelKey: 'layer.smoke' as const, tone: 'smoke' as const },
  { id: 'aqi', labelKey: 'layer.aqi' as const, tone: 'aqi' as const },
  { id: 'road-closures', labelKey: 'layer.roads' as const, tone: 'roads' as const },
  { id: 'noaa-weather', labelKey: 'layer.radar' as const, tone: 'weather' as const },
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
  const [locale, setLocale] = useState<Locale>('en');
  const [bootstrapped, setBootstrapped] = useState(false);
  const [selectedFire, setSelectedFire] = useState<FireSelectPayload | null>(
    null,
  );
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteFire[]>([]);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  const stateView = useMemo(() => getStateView(stateCode), [stateCode]);
  const tag = useMemo(() => localeTag(locale), [locale]);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );

  const selectedIsFavorite = useMemo(() => {
    if (!selectedFire) return false;
    return isFavoriteId(favorites, favoriteIdFromSelection(selectedFire));
  }, [favorites, selectedFire]);

  useEffect(() => {
    const nextLocale = detectLocale();
    setStateCode(readSavedStateCode());
    setFavorites(readFavorites());
    setLocale(nextLocale);
    document.documentElement.lang = nextLocale;
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
        { roadClosuresPlugin },
        { noaaWeatherPlugin },
      ] = await Promise.all([
        import('@openfirewx/plugin-fire-perimeters'),
        import('@openfirewx/plugin-firms-hotspots'),
        import('@openfirewx/plugin-smoke'),
        import('@openfirewx/plugin-aqi'),
        import('@openfirewx/plugin-road-closures'),
        import('@openfirewx/plugin-noaa-weather'),
      ]);
      if (cancelled) return;
      const list = [
        firePerimetersPlugin,
        firmsHotspotsPlugin,
        smokePlugin,
        aqiPlugin,
        roadClosuresPlugin,
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

  const closePanels = useCallback(() => {
    setSelectedFire(null);
    setFavoritesOpen(false);
    setMoreOpen(false);
  }, []);

  const onMapReady = useCallback(
    (map: LeafletMap) => {
      mapRef.current = map;
      map.on('click', () => closePanels());
    },
    [closePanels],
  );

  const onFireSelect = useCallback((payload: FireSelectPayload) => {
    setFavoritesOpen(false);
    setMoreOpen(false);
    setSelectedFire(payload);
  }, []);

  const closeFireSheet = useCallback(() => {
    setSelectedFire(null);
  }, []);

  const closeFavorites = useCallback(() => {
    setFavoritesOpen(false);
  }, []);

  const closeMore = useCallback(() => {
    setMoreOpen(false);
  }, []);

  const onToggleFavorite = useCallback(() => {
    if (!selectedFire) return;
    setFavorites((prev) => {
      const next = toggleFavorite(prev, selectedFire);
      writeFavorites(next);
      return next;
    });
  }, [selectedFire]);

  const onRemoveFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.id !== id);
      writeFavorites(next);
      return next;
    });
  }, []);

  const onSelectFavorite = useCallback((favorite: FavoriteFire) => {
    const selection = selectionFromFavorite(favorite);
    setFavoritesOpen(false);
    setMoreOpen(false);
    setSelectedFire(selection);
    mapRef.current?.flyTo(
      [favorite.lat, favorite.lng],
      Math.max(mapRef.current.getZoom(), 10),
      { duration: 0.7 },
    );
  }, []);

  function toggleMore() {
    setMoreOpen((open) => {
      const next = !open;
      if (next) {
        setSelectedFire(null);
        setFavoritesOpen(false);
      }
      return next;
    });
  }

  function openFavoritesFromMore() {
    setMoreOpen(false);
    setSelectedFire(null);
    setFavoritesOpen(true);
  }

  function onLocaleChange(next: Locale) {
    setLocale(next);
    writeLocale(next);
    document.documentElement.lang = next;
  }

  function toggle(id: string) {
    setEnabled((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      if (id === 'fire-perimeters' && !next.includes(id)) {
        setSelectedFire(null);
      }
      return next;
    });
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
      window.alert(t('locate.unavailable'));
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
        .bindPopup(t('locate.here'))
        .addTo(map);

      setLocating(false);
    });

    map.once('locationerror', () => {
      setLocating(false);
      window.alert(t('locate.failed'));
    });

    map.locate({
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30_000,
    });
  }

  if (!bootstrapped) {
    return <div className="shell" aria-busy="true" />;
  }

  const sheetOpen = Boolean(selectedFire) || favoritesOpen || moreOpen;
  const menuLabel =
    favorites.length > 0
      ? t('chrome.moreWithFavorites', { count: favorites.length })
      : t('chrome.more');

  return (
    <div className="shell" data-sheet={sheetOpen ? 'open' : 'closed'}>
      {ready ? (
        <FireMap
          className="map-root"
          plugins={plugins}
          enabledPluginIds={enabled}
          basePath={basePath || ''}
          center={stateView.center}
          zoom={stateView.zoom}
          onMapReady={onMapReady}
          onFireSelect={onFireSelect}
        />
      ) : (
        <div className="map-root" aria-busy="true" />
      )}
      <header className="chrome" aria-label={t('chrome.mapControls')}>
        <div className="chrome__bar">
          <Brand name={t('brand.name')} tagline={undefined} />
          <div className="chrome__tools">
            <MenuButton
              active={moreOpen}
              badgeCount={favorites.length}
              label={menuLabel}
              onClick={toggleMore}
            />
          </div>
        </div>
        <ControlStrip className="chrome__layers">
          {LAYER_DEFS.map((layer) => (
            <LayerToggle
              key={layer.id}
              label={t(layer.labelKey)}
              active={enabled.includes(layer.id)}
              tone={layer.tone}
              onClick={() => toggle(layer.id)}
            />
          ))}
        </ControlStrip>
      </header>
      <div className="locate-wrap">
        <LocateButton
          locating={locating}
          aria-label={locating ? t('locate.finding') : t('locate.label')}
          title={t('locate.label')}
          onClick={() => void locateMe()}
        />
      </div>
      <MoreSheet
        open={moreOpen}
        onClose={closeMore}
        locale={locale}
        onLocaleChange={onLocaleChange}
        stateCode={stateCode}
        onStateChange={onStateChange}
        favoritesCount={favorites.length}
        onOpenFavorites={openFavoritesFromMore}
        t={t}
      />
      <FireInfoSheet
        selection={selectedFire}
        onClose={closeFireSheet}
        favorited={selectedIsFavorite}
        onToggleFavorite={onToggleFavorite}
        localeTag={tag}
        t={t}
      />
      <FavoritesSheet
        open={favoritesOpen}
        favorites={favorites}
        onClose={closeFavorites}
        onSelect={onSelectFavorite}
        onRemove={onRemoveFavorite}
        localeTag={tag}
        t={t}
      />
    </div>
  );
}
