'use client';

import { BottomSheet } from '@openfirewx/ui';
import type { FavoriteFire, MessageKey } from '@openfirewx/shared';

function formatAcres(acres: number | undefined, localeTag: string): string | null {
  if (acres == null) return null;
  return `${Math.round(acres).toLocaleString(localeTag)} acres`;
}

export type FavoritesSheetProps = {
  open: boolean;
  favorites: FavoriteFire[];
  onClose: () => void;
  onSelect: (favorite: FavoriteFire) => void;
  onRemove: (id: string) => void;
  localeTag: string;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

export function FavoritesSheet({
  open,
  favorites,
  onClose,
  onSelect,
  onRemove,
  localeTag,
  t,
}: FavoritesSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={t('favorites.title')}>
      <div className="favorites-sheet">
        {favorites.length === 0 ? (
          <p className="favorites-sheet__empty">{t('favorites.empty')}</p>
        ) : (
          <ul className="favorites-sheet__list">
            {favorites.map((favorite) => {
              const acres = formatAcres(favorite.acres, localeTag);
              const contained =
                favorite.percentContained != null
                  ? `${Math.round(favorite.percentContained)}%`
                  : null;
              const place = [favorite.county, favorite.state]
                .filter(Boolean)
                .join(', ');
              const meta = [place, acres, contained].filter(Boolean).join(' · ');

              return (
                <li key={favorite.id} className="favorites-sheet__item">
                  <button
                    type="button"
                    className="favorites-sheet__select"
                    onClick={() => onSelect(favorite)}
                  >
                    <span className="favorites-sheet__name">{favorite.name}</span>
                    {meta ? (
                      <span className="favorites-sheet__meta">{meta}</span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="favorites-sheet__remove"
                    aria-label={t('favorites.remove', { name: favorite.name })}
                    title={t('favorites.removeTitle')}
                    onClick={() => onRemove(favorite.id)}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
}
