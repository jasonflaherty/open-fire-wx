export const LOCALE_KEY = 'ofwx.locale';

export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

const en = {
  'brand.name': 'Fire WX',
  'chrome.mapControls': 'Map controls',
  'chrome.more': 'Menu',
  'chrome.moreWithFavorites': 'Menu, {count} favorites',

  'layer.fires': 'Fires',
  'layer.heat': 'Heat',
  'layer.smoke': 'Smoke',
  'layer.aqi': 'AQI',
  'layer.radar': 'Radar',
  'layer.roads': 'Roads',
  'layer.evac': 'Evac',
  'layer.shelters': 'Shelters',

  'more.title': 'Menu',
  'more.region': 'Region',
  'more.language': 'Language',
  'more.favorites': 'Favorites',
  'more.favoritesHint': 'Saved fires for quick access',
  'more.openFavorites': 'View favorites',
  'more.favoritesCount': '{count} saved',
  'more.favoritesEmpty': 'None saved yet',

  'lang.en': 'English',
  'lang.es': 'Español',
  'state.label': 'State',
  'state.aria': 'Map state',

  'locate.label': 'My location',
  'locate.finding': 'Finding your location',
  'locate.unavailable': 'Location is not available in this browser.',
  'locate.failed': 'Could not find your location. Check browser permissions.',
  'locate.here': 'You are here',

  'favorites.title': 'Favorites',
  'favorites.empty':
    'Heart a fire in its details sheet to save it here for quick access.',
  'favorites.remove': 'Remove {name} from favorites',
  'favorites.removeTitle': 'Remove',

  'fire.acres': '{acres} acres',
  'fire.contained': '{pct}% contained',
  'fire.size': 'Size',
  'fire.containment': 'Containment',
  'fire.location': 'Location',
  'fire.updated': 'Updated',
  'fire.cause': 'Cause',
  'fire.personnel': 'Personnel',
  'fire.officialUpdates': 'Official updates',
  'fire.loadingUpdates': 'Loading InciWeb updates…',
  'fire.refreshingUpdates': 'Refreshing InciWeb updates…',
  'fire.updatesError': 'Could not load official updates right now.',
  'fire.updatesEmpty': 'No recent InciWeb publications matched this fire.',
  'fire.openInciweb': 'Open on InciWeb',
  'fire.favorite': 'Add to favorites',
  'fire.unfavorite': 'Remove from favorites',
  'fire.refresh': 'Refresh fire updates',
  'fire.close': 'Close',
  'fire.unnamed': 'Fire',

  'fire.evacHeading': 'Evacuation',
  'fire.evacCoverage': 'Evac data: OR (Deschutes, Jackson)',
  'fire.evacEmpty': 'No evacuation zones for this location in covered counties.',
  'fire.evacLoading': 'Checking evacuation zones…',
  'fire.roadsHeading': 'Nearby road closures',
  'fire.roadsEmpty': 'No ODOT closures within 50 km.',
  'fire.roadsLoading': 'Checking road closures…',
  'fire.sheltersHeading': 'Nearby shelters',
  'fire.sheltersEmpty': 'No listed shelters nearby.',
  'fire.sheltersLoading': 'Checking shelters…',
  'fire.sheltersDisclaimer': 'Confirm with county OEM before you go.',
  'fire.kmAway': '{km} km away',
  'fire.source': 'Source',

  'common.close': 'Close',
} as const;

export type MessageKey = keyof typeof en;

const es: Record<MessageKey, string> = {
  'brand.name': 'Fire WX',
  'chrome.mapControls': 'Controles del mapa',
  'chrome.more': 'Menú',
  'chrome.moreWithFavorites': 'Menú, {count} favoritos',

  'layer.fires': 'Fuegos',
  'layer.heat': 'Calor',
  'layer.smoke': 'Humo',
  'layer.aqi': 'AQI',
  'layer.radar': 'Radar',
  'layer.roads': 'Rutas',
  'layer.evac': 'Evac',
  'layer.shelters': 'Refugios',

  'more.title': 'Menú',
  'more.region': 'Región',
  'more.language': 'Idioma',
  'more.favorites': 'Favoritos',
  'more.favoritesHint': 'Incendios guardados para acceso rápido',
  'more.openFavorites': 'Ver favoritos',
  'more.favoritesCount': '{count} guardados',
  'more.favoritesEmpty': 'Ninguno guardado aún',

  'lang.en': 'English',
  'lang.es': 'Español',
  'state.label': 'Estado',
  'state.aria': 'Estado del mapa',

  'locate.label': 'Mi ubicación',
  'locate.finding': 'Buscando tu ubicación',
  'locate.unavailable': 'La ubicación no está disponible en este navegador.',
  'locate.failed':
    'No se pudo encontrar tu ubicación. Revisa los permisos del navegador.',
  'locate.here': 'Estás aquí',

  'favorites.title': 'Favoritos',
  'favorites.empty':
    'Marca un incendio con el corazón en su hoja de detalles para guardarlo aquí.',
  'favorites.remove': 'Quitar {name} de favoritos',
  'favorites.removeTitle': 'Quitar',

  'fire.acres': '{acres} acres',
  'fire.contained': '{pct}% contenido',
  'fire.size': 'Tamaño',
  'fire.containment': 'Contención',
  'fire.location': 'Ubicación',
  'fire.updated': 'Actualizado',
  'fire.cause': 'Causa',
  'fire.personnel': 'Personal',
  'fire.officialUpdates': 'Actualizaciones oficiales',
  'fire.loadingUpdates': 'Cargando actualizaciones de InciWeb…',
  'fire.refreshingUpdates': 'Actualizando InciWeb…',
  'fire.updatesError': 'No se pudieron cargar las actualizaciones oficiales.',
  'fire.updatesEmpty':
    'No hay publicaciones recientes de InciWeb para este incendio.',
  'fire.openInciweb': 'Abrir en InciWeb',
  'fire.favorite': 'Agregar a favoritos',
  'fire.unfavorite': 'Quitar de favoritos',
  'fire.refresh': 'Actualizar información del incendio',
  'fire.close': 'Cerrar',
  'fire.unnamed': 'Incendio',

  'fire.evacHeading': 'Evacuación',
  'fire.evacCoverage': 'Datos de evac: OR (Deschutes, Jackson)',
  'fire.evacEmpty':
    'No hay zonas de evacuación para esta ubicación en los condados cubiertos.',
  'fire.evacLoading': 'Buscando zonas de evacuación…',
  'fire.roadsHeading': 'Cierres de ruta cercanos',
  'fire.roadsEmpty': 'No hay cierres ODOT a menos de 50 km.',
  'fire.roadsLoading': 'Buscando cierres de ruta…',
  'fire.sheltersHeading': 'Refugios cercanos',
  'fire.sheltersEmpty': 'No hay refugios listados cerca.',
  'fire.sheltersLoading': 'Buscando refugios…',
  'fire.sheltersDisclaimer': 'Confirma con el OEM del condado antes de ir.',
  'fire.kmAway': 'a {km} km',
  'fire.source': 'Fuente',

  'common.close': 'Cerrar',
};

const catalogs: Record<Locale, Record<MessageKey, string>> = { en, es };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function detectLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(LOCALE_KEY);
    if (saved && isLocale(saved)) return saved;
  } catch {
    /* ignore */
  }
  try {
    const nav = navigator.language?.toLowerCase() ?? 'en';
    if (nav.startsWith('es')) return 'es';
  } catch {
    /* ignore */
  }
  return 'en';
}

export function readLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(LOCALE_KEY);
    if (saved && isLocale(saved)) return saved;
  } catch {
    /* ignore */
  }
  return 'en';
}

export function writeLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function localeTag(locale: Locale): string {
  return locale === 'es' ? 'es-US' : 'en-US';
}

export function t(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  let text = catalogs[locale][key] ?? catalogs.en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
