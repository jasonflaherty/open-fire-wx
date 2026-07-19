'use client';

import { useEffect, useState } from 'react';
import { BottomSheet } from '@openfirewx/ui';
import {
  fetchInciwebNewsForFire,
  type InciwebNewsItem,
} from '@openfirewx/fire';
import type { FireSelectPayload } from '@openfirewx/shared';

function formatUpdated(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
  }
  const asNum = Number(value);
  if (!Number.isNaN(asNum) && String(value).length >= 12) {
    const d = new Date(asNum);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }
  return String(value);
}

function formatNewsDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
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

export type FireInfoSheetProps = {
  selection: FireSelectPayload | null;
  onClose: () => void;
};

export function FireInfoSheet({ selection, onClose }: FireInfoSheetProps) {
  const open = Boolean(selection);
  const props = selection?.properties;
  const name = props?.name?.trim() || 'Fire';

  const [news, setNews] = useState<InciwebNewsItem[]>([]);
  const [incidentUrl, setIncidentUrl] = useState<string | undefined>();
  const [newsState, setNewsState] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  );

  useEffect(() => {
    if (!selection) {
      setNews([]);
      setIncidentUrl(undefined);
      setNewsState('idle');
      return;
    }

    let cancelled = false;
    setNewsState('loading');
    setNews([]);
    setIncidentUrl(undefined);

    void (async () => {
      try {
        const result = await fetchInciwebNewsForFire(name, {
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
  }, [selection, name]);

  const acres =
    props?.acres != null
      ? `${Math.round(Number(props.acres)).toLocaleString()} acres`
      : null;
  const contained =
    props?.percentContained != null
      ? `${Math.round(Number(props.percentContained))}% contained`
      : null;
  const updated = formatUpdated(props?.updated);
  const place = [props?.county, props?.state].filter(Boolean).join(', ');

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={name}
      footer={
        incidentUrl ? (
          <a
            className="fire-sheet__official"
            href={incidentUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on InciWeb
          </a>
        ) : null
      }
    >
      <div className="fire-sheet">
        {(acres || contained || place || updated) && (
          <div className="fire-sheet__stats">
            {acres ? <MetaStat label="Size" value={acres} /> : null}
            {contained ? <MetaStat label="Containment" value={contained} /> : null}
            {place ? <MetaStat label="Location" value={place} /> : null}
            {updated ? <MetaStat label="Updated" value={updated} /> : null}
          </div>
        )}

        {props?.cause ? (
          <p className="fire-sheet__meta">
            <span className="fire-sheet__meta-label">Cause</span> {props.cause}
          </p>
        ) : null}

        {props?.shortDescription ? (
          <p className="fire-sheet__summary">{props.shortDescription}</p>
        ) : null}

        {props?.personnel != null ? (
          <p className="fire-sheet__meta">
            <span className="fire-sheet__meta-label">Personnel</span>{' '}
            {Math.round(props.personnel).toLocaleString()}
          </p>
        ) : null}

        <section className="fire-sheet__news" aria-label="Official updates">
          <h3 className="fire-sheet__news-heading">Official updates</h3>
          {newsState === 'loading' ? (
            <p className="fire-sheet__news-status">Loading InciWeb updates…</p>
          ) : null}
          {newsState === 'error' ? (
            <p className="fire-sheet__news-status">
              Could not load official updates right now.
            </p>
          ) : null}
          {newsState === 'ready' && news.length === 0 ? (
            <p className="fire-sheet__news-status">
              No recent InciWeb publications matched this fire.
            </p>
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
                        {formatNewsDate(item.publishedAt)}
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
