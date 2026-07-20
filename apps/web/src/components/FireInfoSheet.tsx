'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '@openfirewx/ui';
import {
  fetchInciwebNewsForFire,
  type InciwebNewsItem,
} from '@openfirewx/fire';
import {
  evacLevelLabel,
  findClosuresNear,
  findEvacZonesNear,
  findSheltersNear,
  type EvacZoneCollection,
  type EvacZoneFeature,
  type RoadClosureCollection,
  type RoadClosureFeature,
  type ShelterCollection,
  type ShelterFeature,
} from '@openfirewx/community';
import {
  favoriteIdFromSelection,
  withHourlyCacheBust,
  type FireSelectPayload,
  type MessageKey,
} from '@openfirewx/shared';

function formatUpdated(value: unknown, localeTag: string): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleString(localeTag);
  }
  const asNum = Number(value);
  if (!Number.isNaN(asNum) && String(value).length >= 12) {
    const d = new Date(asNum);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(localeTag);
  }
  const d = new Date(String(value));
  if (!Number.isNaN(d.getTime())) return d.toLocaleString(localeTag);
  return String(value);
}

function formatNewsDate(value: string, localeTag: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(localeTag, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="fire-sheet__stat">
      <span className="fire-sheet__stat-label">{label}</span>
      <span className="fire-sheet__stat-value">{value}</span>
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M12 21s-6.2-4.35-8.5-8.1C1.7 9.7 2.9 6.4 6.1 5.5c1.7-.5 3.5.1 4.5 1.5 1-1.4 2.8-2 4.5-1.5 3.2.9 4.4 4.2 2.6 7.4C18.2 16.65 12 21 12 21z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M20 12a8 8 0 1 1-2.2-5.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M20 4v5h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

async function loadJsonCollection<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(withHourlyCacheBust(url), { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type NearState = 'idle' | 'loading' | 'ready';

export type FireInfoSheetProps = {
  selection: FireSelectPayload | null;
  onClose: () => void;
  favorited: boolean;
  onToggleFavorite: () => void;
  localeTag: string;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  basePath?: string;
};

export function FireInfoSheet({
  selection,
  onClose,
  favorited,
  onToggleFavorite,
  localeTag,
  t,
  basePath = '',
}: FireInfoSheetProps) {
  const open = Boolean(selection);
  const props = selection?.properties;
  const queryName = props?.name?.trim() || 'Fire';
  const displayName = props?.name?.trim() || t('fire.unnamed');
  const selectionKey = selection ? favoriteIdFromSelection(selection) : '';

  const [news, setNews] = useState<InciwebNewsItem[]>([]);
  const [incidentUrl, setIncidentUrl] = useState<string | undefined>();
  const [newsState, setNewsState] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  );
  const [refreshing, setRefreshing] = useState(false);

  const [nearState, setNearState] = useState<NearState>('idle');
  const [evacZones, setEvacZones] = useState<EvacZoneFeature[]>([]);
  const [evacGeneratedAt, setEvacGeneratedAt] = useState<string | undefined>();
  const [roadsNear, setRoadsNear] = useState<
    Array<RoadClosureFeature & { distanceKm: number }>
  >([]);
  const [roadsGeneratedAt, setRoadsGeneratedAt] = useState<string | undefined>();
  const [sheltersNear, setSheltersNear] = useState<
    Array<ShelterFeature & { distanceKm: number }>
  >([]);
  const [sheltersGeneratedAt, setSheltersGeneratedAt] = useState<
    string | undefined
  >();

  const loadNews = useCallback(
    async (force: boolean) => {
      if (!selection) return;
      setNewsState('loading');
      if (force) setRefreshing(true);
      try {
        const result = await fetchInciwebNewsForFire(queryName, {
          state: selection.properties.state,
          limit: 3,
          force,
        });
        setNews(result.items);
        setIncidentUrl(result.incidentUrl);
        setNewsState('ready');
      } catch {
        setNews([]);
        setIncidentUrl(undefined);
        setNewsState('error');
      } finally {
        setRefreshing(false);
      }
    },
    [selection, queryName],
  );

  useEffect(() => {
    if (!selection) {
      setNews([]);
      setIncidentUrl(undefined);
      setNewsState('idle');
      setRefreshing(false);
      return;
    }

    let cancelled = false;
    setNewsState('loading');
    setNews([]);
    setIncidentUrl(undefined);

    void (async () => {
      try {
        const result = await fetchInciwebNewsForFire(queryName, {
          state: selection.properties.state,
          limit: 3,
        });
        if (cancelled) return;
        setNews(result.items);
        setIncidentUrl(result.incidentUrl);
        setNewsState('ready');
      } catch {
        if (cancelled) return;
        setNews([]);
        setNewsState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectionKey, selection, queryName]);

  useEffect(() => {
    if (!selection) {
      setNearState('idle');
      setEvacZones([]);
      setRoadsNear([]);
      setSheltersNear([]);
      setEvacGeneratedAt(undefined);
      setRoadsGeneratedAt(undefined);
      setSheltersGeneratedAt(undefined);
      return;
    }

    let cancelled = false;
    setNearState('loading');
    const point = selection.latlng;

    void (async () => {
      const [evac, roads, shelters] = await Promise.all([
        loadJsonCollection<EvacZoneCollection>(
          `${basePath}/data/evacuations-or.json`,
        ),
        loadJsonCollection<RoadClosureCollection>(
          `${basePath}/data/odot-closures.json`,
        ),
        loadJsonCollection<ShelterCollection>(`${basePath}/data/shelters-or.json`),
      ]);
      if (cancelled) return;

      setEvacZones(evac ? findEvacZonesNear(evac, point) : []);
      setEvacGeneratedAt(evac?.generatedAt);
      setRoadsNear(roads ? findClosuresNear(roads, point, { maxKm: 50, limit: 5 }) : []);
      setRoadsGeneratedAt(roads?.generatedAt);
      setSheltersNear(
        shelters ? findSheltersNear(shelters, point, { limit: 3 }) : [],
      );
      setSheltersGeneratedAt(shelters?.generatedAt);
      setNearState('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [selectionKey, selection, basePath]);

  const acres =
    props?.acres != null
      ? t('fire.acres', {
          acres: Math.round(Number(props.acres)).toLocaleString(localeTag),
        })
      : null;
  const contained =
    props?.percentContained != null
      ? t('fire.contained', {
          pct: Math.round(Number(props.percentContained)),
        })
      : null;
  const updated = formatUpdated(props?.updated, localeTag);
  const place = [props?.county, props?.state].filter(Boolean).join(', ');

  const actions = useMemo(
    () => (
      <>
        <button
          type="button"
          className="ofwx-sheet__action"
          data-active={favorited}
          aria-label={favorited ? t('fire.unfavorite') : t('fire.favorite')}
          aria-pressed={favorited}
          title={favorited ? t('fire.unfavorite') : t('fire.favorite')}
          onClick={onToggleFavorite}
        >
          <HeartIcon filled={favorited} />
        </button>
        <button
          type="button"
          className="ofwx-sheet__action"
          data-spinning={refreshing}
          aria-label={t('fire.refresh')}
          title={t('fire.refresh')}
          disabled={refreshing || !selection}
          onClick={() => void loadNews(true)}
        >
          <RefreshIcon />
        </button>
      </>
    ),
    [favorited, onToggleFavorite, refreshing, selection, loadNews, t],
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={displayName}
      actions={actions}
      footer={
        incidentUrl ? (
          <a
            className="fire-sheet__official"
            href={incidentUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('fire.openInciweb')}
          </a>
        ) : null
      }
    >
      <div className="fire-sheet">
        {(acres || contained || place || updated) && (
          <div className="fire-sheet__stats">
            {acres ? <MetaStat label={t('fire.size')} value={acres} /> : null}
            {contained ? (
              <MetaStat label={t('fire.containment')} value={contained} />
            ) : null}
            {place ? <MetaStat label={t('fire.location')} value={place} /> : null}
            {updated ? <MetaStat label={t('fire.updated')} value={updated} /> : null}
          </div>
        )}

        {props?.cause ? (
          <p className="fire-sheet__meta">
            <span className="fire-sheet__meta-label">{t('fire.cause')}</span>{' '}
            {props.cause}
          </p>
        ) : null}

        {props?.shortDescription ? (
          <p className="fire-sheet__summary">{props.shortDescription}</p>
        ) : null}

        {props?.personnel != null ? (
          <p className="fire-sheet__meta">
            <span className="fire-sheet__meta-label">{t('fire.personnel')}</span>{' '}
            {Math.round(props.personnel).toLocaleString(localeTag)}
          </p>
        ) : null}

        <section className="fire-sheet__near" aria-label={t('fire.evacHeading')}>
          <h3 className="fire-sheet__near-heading">{t('fire.evacHeading')}</h3>
          <p className="fire-sheet__near-coverage">{t('fire.evacCoverage')}</p>
          {nearState === 'loading' ? (
            <p className="fire-sheet__near-status">{t('fire.evacLoading')}</p>
          ) : null}
          {nearState === 'ready' && evacZones.length === 0 ? (
            <p className="fire-sheet__near-status">{t('fire.evacEmpty')}</p>
          ) : null}
          {evacZones.length > 0 ? (
            <ul className="fire-sheet__near-list">
              {evacZones.map((zone) => {
                const zoneUpdated = formatUpdated(
                  zone.properties.updatedAt ?? evacGeneratedAt,
                  localeTag,
                );
                return (
                  <li key={zone.properties.id} className="fire-sheet__near-item">
                    <div className="fire-sheet__near-title">
                      {evacLevelLabel(zone.properties.level)}
                    </div>
                    <div className="fire-sheet__near-detail">{zone.properties.name}</div>
                    {zone.properties.county ? (
                      <div className="fire-sheet__near-meta">
                        {zone.properties.county}
                        {zone.properties.fireName
                          ? ` · ${zone.properties.fireName}`
                          : ''}
                      </div>
                    ) : null}
                    <div className="fire-sheet__near-source">
                      {zone.properties.sourceUrl ? (
                        <a
                          href={zone.properties.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {zone.properties.source}
                        </a>
                      ) : (
                        <span>
                          {t('fire.source')}: {zone.properties.source}
                        </span>
                      )}
                      {zoneUpdated ? ` · ${zoneUpdated}` : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        <section className="fire-sheet__near" aria-label={t('fire.roadsHeading')}>
          <h3 className="fire-sheet__near-heading">{t('fire.roadsHeading')}</h3>
          {nearState === 'loading' ? (
            <p className="fire-sheet__near-status">{t('fire.roadsLoading')}</p>
          ) : null}
          {nearState === 'ready' && roadsNear.length === 0 ? (
            <p className="fire-sheet__near-status">{t('fire.roadsEmpty')}</p>
          ) : null}
          {roadsNear.length > 0 ? (
            <ul className="fire-sheet__near-list">
              {roadsNear.map((road) => {
                const title =
                  road.properties.name ||
                  road.properties.route ||
                  'Road closure';
                const roadUpdated = formatUpdated(
                  road.properties.updated ?? roadsGeneratedAt,
                  localeTag,
                );
                return (
                  <li
                    key={road.properties.id}
                    className="fire-sheet__near-item"
                  >
                    <div className="fire-sheet__near-title">{title}</div>
                    {road.properties.route && road.properties.name ? (
                      <div className="fire-sheet__near-detail">
                        {road.properties.route}
                      </div>
                    ) : null}
                    <div className="fire-sheet__near-meta">
                      {t('fire.kmAway', {
                        km: road.distanceKm.toFixed(0),
                      })}
                      {road.properties.statusLabel
                        ? ` · ${road.properties.statusLabel}`
                        : road.properties.status
                          ? ` · ${road.properties.status}`
                          : ''}
                    </div>
                    <div className="fire-sheet__near-source">
                      {road.properties.tripcheckUrl ? (
                        <a
                          href={road.properties.tripcheckUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {road.properties.source}
                        </a>
                      ) : (
                        <span>
                          {t('fire.source')}: {road.properties.source}
                        </span>
                      )}
                      {roadUpdated ? ` · ${roadUpdated}` : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        <section
          className="fire-sheet__near"
          aria-label={t('fire.sheltersHeading')}
        >
          <h3 className="fire-sheet__near-heading">{t('fire.sheltersHeading')}</h3>
          <p className="fire-sheet__near-disclaimer">
            {t('fire.sheltersDisclaimer')}
          </p>
          {nearState === 'loading' ? (
            <p className="fire-sheet__near-status">{t('fire.sheltersLoading')}</p>
          ) : null}
          {nearState === 'ready' && sheltersNear.length === 0 ? (
            <p className="fire-sheet__near-status">{t('fire.sheltersEmpty')}</p>
          ) : null}
          {sheltersNear.length > 0 ? (
            <ul className="fire-sheet__near-list">
              {sheltersNear.map((shelter) => {
                const shelterUpdated = formatUpdated(
                  shelter.properties.updatedAt ?? sheltersGeneratedAt,
                  localeTag,
                );
                return (
                  <li
                    key={shelter.properties.id}
                    className="fire-sheet__near-item"
                  >
                    <div className="fire-sheet__near-title">
                      {shelter.properties.name}
                    </div>
                    {shelter.properties.address ? (
                      <div className="fire-sheet__near-detail">
                        {shelter.properties.address}
                      </div>
                    ) : null}
                    <div className="fire-sheet__near-meta">
                      {t('fire.kmAway', {
                        km: shelter.distanceKm.toFixed(0),
                      })}
                      {shelter.properties.petsAllowed === true
                        ? ' · Pets OK'
                        : shelter.properties.livestockAllowed === true
                          ? ' · Livestock capable'
                          : ''}
                    </div>
                    <div className="fire-sheet__near-source">
                      {shelter.properties.sourceUrl ? (
                        <a
                          href={shelter.properties.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {shelter.properties.source}
                        </a>
                      ) : (
                        <span>
                          {t('fire.source')}: {shelter.properties.source}
                        </span>
                      )}
                      {shelterUpdated ? ` · ${shelterUpdated}` : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        <section
          className="fire-sheet__news"
          aria-label={t('fire.officialUpdates')}
        >
          <h3 className="fire-sheet__news-heading">{t('fire.officialUpdates')}</h3>
          {newsState === 'loading' ? (
            <p className="fire-sheet__news-status">
              {refreshing ? t('fire.refreshingUpdates') : t('fire.loadingUpdates')}
            </p>
          ) : null}
          {newsState === 'error' ? (
            <p className="fire-sheet__news-status">{t('fire.updatesError')}</p>
          ) : null}
          {newsState === 'ready' && news.length === 0 ? (
            <p className="fire-sheet__news-status">{t('fire.updatesEmpty')}</p>
          ) : null}
          {news.length > 0 ? (
            <ul className="fire-sheet__news-list">
              {news.map((item) => (
                <li key={item.link} className="fire-sheet__news-item">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fire-sheet__news-link"
                  >
                    <span className="fire-sheet__news-title">{item.title}</span>
                    {item.publishedAt ? (
                      <time className="fire-sheet__news-date">
                        {formatNewsDate(item.publishedAt, localeTag)}
                      </time>
                    ) : null}
                    {item.description ? (
                      <span className="fire-sheet__news-desc">
                        {item.description.length > 180
                          ? `${item.description.slice(0, 180)}…`
                          : item.description}
                      </span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </BottomSheet>
  );
}
