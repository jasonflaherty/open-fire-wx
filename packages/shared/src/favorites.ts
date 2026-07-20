export const FAVORITES_KEY = 'ofwx.favoriteFires';

export type FavoriteFire = {
  id: string;
  name: string;
  state?: string;
  county?: string;
  acres?: number;
  percentContained?: number;
  lat: number;
  lng: number;
  irwinId?: string;
  uniqueFireIdentifier?: string;
  savedAt: number;
};

export type FavoriteSelection = {
  properties: {
    name?: string;
    acres?: number;
    percentContained?: number;
    state?: string;
    county?: string;
    irwinId?: string;
    uniqueFireIdentifier?: string;
  };
  latlng: { lat: number; lng: number };
};

export function favoriteIdFromSelection(selection: FavoriteSelection): string {
  const { properties: props, latlng } = selection;
  const irwin = props.irwinId?.trim();
  if (irwin) return `irwin:${irwin}`;
  const unique = props.uniqueFireIdentifier?.trim();
  if (unique) return `ufi:${unique}`;
  const name = (props.name ?? 'fire').trim().toLowerCase().replace(/\s+/g, '-');
  const state = (props.state ?? '').trim().toLowerCase();
  return `geo:${name}|${state}|${latlng.lat.toFixed(3)},${latlng.lng.toFixed(3)}`;
}

export function favoriteFromSelection(selection: FavoriteSelection): FavoriteFire {
  const { properties: props, latlng } = selection;
  return {
    id: favoriteIdFromSelection(selection),
    name: props.name?.trim() || 'Fire',
    state: props.state,
    county: props.county,
    acres: props.acres,
    percentContained: props.percentContained,
    lat: latlng.lat,
    lng: latlng.lng,
    irwinId: props.irwinId,
    uniqueFireIdentifier: props.uniqueFireIdentifier,
    savedAt: Date.now(),
  };
}

export function selectionFromFavorite(favorite: FavoriteFire): FavoriteSelection {
  return {
    properties: {
      name: favorite.name,
      state: favorite.state,
      county: favorite.county,
      acres: favorite.acres,
      percentContained: favorite.percentContained,
      irwinId: favorite.irwinId,
      uniqueFireIdentifier: favorite.uniqueFireIdentifier,
    },
    latlng: { lat: favorite.lat, lng: favorite.lng },
  };
}

export function readFavorites(): FavoriteFire[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FavoriteFire =>
        Boolean(
          item &&
            typeof item === 'object' &&
            typeof (item as FavoriteFire).id === 'string' &&
            typeof (item as FavoriteFire).name === 'string' &&
            typeof (item as FavoriteFire).lat === 'number' &&
            typeof (item as FavoriteFire).lng === 'number',
        ),
    );
  } catch {
    return [];
  }
}

export function writeFavorites(favorites: FavoriteFire[]): void {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    /* private mode / quota */
  }
}

export function isFavoriteId(favorites: FavoriteFire[], id: string): boolean {
  return favorites.some((f) => f.id === id);
}

export function toggleFavorite(
  favorites: FavoriteFire[],
  selection: FavoriteSelection,
): FavoriteFire[] {
  const id = favoriteIdFromSelection(selection);
  if (favorites.some((f) => f.id === id)) {
    return favorites.filter((f) => f.id !== id);
  }
  return [favoriteFromSelection(selection), ...favorites];
}
