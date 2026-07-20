'use client';

import { BottomSheet, LocaleToggle, StateSelect } from '@openfirewx/ui';
import {
  LOCALES,
  US_STATE_VIEWS,
  type Locale,
  type MessageKey,
} from '@openfirewx/shared';

export type MoreSheetProps = {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  stateCode: string;
  onStateChange: (code: string) => void;
  favoritesCount: number;
  onOpenFavorites: () => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

export function MoreSheet({
  open,
  onClose,
  locale,
  onLocaleChange,
  stateCode,
  onStateChange,
  favoritesCount,
  onOpenFavorites,
  t,
}: MoreSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={t('more.title')}>
      <div className="more-sheet">
        <section className="more-sheet__section">
          <h3 className="more-sheet__heading">{t('more.language')}</h3>
          <LocaleToggle
            value={locale}
            ariaLabel={t('more.language')}
            options={LOCALES.map((code) => ({
              code,
              label: t(code === 'en' ? 'lang.en' : 'lang.es'),
            }))}
            onChange={(code) => onLocaleChange(code as Locale)}
          />
        </section>

        <section className="more-sheet__section">
          <h3 className="more-sheet__heading">{t('more.region')}</h3>
          <StateSelect
            wide
            value={stateCode}
            options={US_STATE_VIEWS}
            onChange={onStateChange}
            label={t('state.label')}
            ariaLabel={t('state.aria')}
          />
        </section>

        <section className="more-sheet__section">
          <h3 className="more-sheet__heading">{t('more.favorites')}</h3>
          <p className="more-sheet__hint">{t('more.favoritesHint')}</p>
          <button
            type="button"
            className="more-sheet__row"
            onClick={onOpenFavorites}
          >
            <span className="more-sheet__row-label">{t('more.openFavorites')}</span>
            <span className="more-sheet__row-meta">
              {favoritesCount > 0
                ? t('more.favoritesCount', { count: favoritesCount })
                : t('more.favoritesEmpty')}
            </span>
          </button>
        </section>
      </div>
    </BottomSheet>
  );
}
