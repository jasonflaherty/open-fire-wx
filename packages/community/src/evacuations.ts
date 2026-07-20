import { withHourlyCacheBust } from '@openfirewx/shared';
import { haversineKm, pointInPolygon, polygonCentroid } from './geo';

/** Oregon OEM public wildfire evacuation areas (Ready / Set / Go). */
export const OR_OEM_EVAC_QUERY =
  'https://services.arcgis.com/uUvqNMGPm7axC2dD/arcgis/rest/services/Fire_Evacuation_Areas_Public/FeatureServer/0/query';

export const OR_EVAC_COVERAGE_COUNTIES = ['Deschutes', 'Jackson'] as const;

export const OR_OEM_EVAC_SOURCE_URL =
  'https://www.oregon.gov/oem/Pages/default.aspx';

export type EvacLevel =
  | 'advisory'
  | 'ready'
  | 'set'
  | 'go'
  | 'lifted'
  | 'unknown';

export type EvacZoneProperties = {
  id: string;
  level: EvacLevel;
  name: string;
  county: string;
  fireName?: string;
  source: string;
  sourceUrl?: string;
  updatedAt?: string;
  hazardType?: string;
};

export type EvacZoneFeature = {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: EvacZoneProperties;
};

export type EvacZoneCollection = {
  type: 'FeatureCollection';
  features: EvacZoneFeature[];
  generatedAt?: string;
  source?: string;
  coverage?: string[];
};

function optionalString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

export function mapOemEvacLevel(raw: unknown): EvacLevel {
  const n = Number(raw);
  if (n === 1) return 'ready';
  if (n === 2) return 'set';
  if (n === 3) return 'go';
  if (n === 0 || n === 4 || n === 5) return 'lifted';
  if (typeof raw === 'string') {
    const s = raw.toLowerCase();
    if (s.includes('ready') || s.includes('level 1')) return 'ready';
    if (s.includes('set') || s.includes('level 2')) return 'set';
    if (s.includes('go') || s.includes('level 3')) return 'go';
    if (s.includes('lift') || s.includes('normal')) return 'lifted';
  }
  return 'unknown';
}

export function evacColor(level: EvacLevel | undefined): string {
  switch (level) {
    case 'ready':
      return '#2d6a4f';
    case 'set':
      return '#e9c46a';
    case 'go':
      return '#c1121f';
    case 'advisory':
      return '#3a86ff';
    case 'lifted':
      return '#8d99ae';
    default:
      return '#a8adb4';
  }
}

export function evacLevelLabel(level: EvacLevel): string {
  switch (level) {
    case 'ready':
      return 'Level 1 — Ready';
    case 'set':
      return 'Level 2 — Set';
    case 'go':
      return 'Level 3 — Go';
    case 'advisory':
      return 'Advisory';
    case 'lifted':
      return 'Lifted / Normal';
    default:
      return 'Unknown';
  }
}

function normalizeOemFeature(raw: {
  type?: string;
  geometry?: EvacZoneFeature['geometry'] | null;
  properties?: Record<string, unknown>;
}): EvacZoneFeature | null {
  const props = raw.properties ?? {};
  const geometry = raw.geometry;
  if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) {
    return null;
  }
  const county = optionalString(props.County) ?? '';
  if (
    !OR_EVAC_COVERAGE_COUNTIES.includes(
      county as (typeof OR_EVAC_COVERAGE_COUNTIES)[number],
    )
  ) {
    return null;
  }
  const level = mapOemEvacLevel(props.Fire_Evacuation_Level);
  if (level === 'lifted' || level === 'unknown') return null;

  const updatedRaw = props.last_edited_date ?? props.updatedAt;
  let updatedAt: string | undefined;
  if (typeof updatedRaw === 'number') {
    updatedAt = new Date(updatedRaw).toISOString();
  } else {
    updatedAt = optionalString(updatedRaw);
  }

  const id = String(
    props.GlobalID ?? props.OBJECTID ?? props.Evac_Area_Name ?? Math.random(),
  );

  return {
    type: 'Feature',
    geometry,
    properties: {
      id,
      level,
      name:
        optionalString(props.Evac_Area_Name) ??
        optionalString(props.Fire_Name) ??
        'Evacuation zone',
      county,
      fireName: optionalString(props.Fire_Name),
      source: 'Oregon OEM',
      sourceUrl: OR_OEM_EVAC_SOURCE_URL,
      updatedAt,
      hazardType: optionalString(props.HazardType),
    },
  };
}

export async function fetchLiveOrEvacuations(): Promise<EvacZoneCollection> {
  const counties = OR_EVAC_COVERAGE_COUNTIES.map((c) => `'${c}'`).join(',');
  const params = new URLSearchParams({
    where: `County IN (${counties}) AND Fire_Evacuation_Level IN (1,2,3)`,
    outFields:
      'OBJECTID,GlobalID,Fire_Name,Fire_Evacuation_Level,County,Evac_Area_Name,last_edited_date,HazardType',
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: '2000',
  });
  const res = await fetch(`${OR_OEM_EVAC_QUERY}?${params}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Oregon OEM evac fetch failed (${res.status})`);
  const data = (await res.json()) as {
    type?: string;
    features?: Array<{
      geometry?: EvacZoneFeature['geometry'] | null;
      properties?: Record<string, unknown>;
    }>;
    error?: unknown;
  };
  if (data.error) throw new Error(`Oregon OEM evac error: ${JSON.stringify(data.error)}`);

  const features = (data.features ?? [])
    .map(normalizeOemFeature)
    .filter((f): f is EvacZoneFeature => f !== null);

  return {
    type: 'FeatureCollection',
    features,
    generatedAt: new Date().toISOString(),
    source: 'Oregon OEM Fire Evacuation Areas',
    coverage: [...OR_EVAC_COVERAGE_COUNTIES],
  };
}

export async function fetchOrEvacuations(options?: {
  staticUrl?: string;
  preferLive?: boolean;
}): Promise<EvacZoneCollection> {
  const preferLive = options?.preferLive ?? true;
  const staticUrl = options?.staticUrl;

  const tryStatic = async (): Promise<EvacZoneCollection | null> => {
    if (!staticUrl) return null;
    try {
      const res = await fetch(withHourlyCacheBust(staticUrl), {
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as EvacZoneCollection;
      if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  };

  if (preferLive) {
    try {
      return await fetchLiveOrEvacuations();
    } catch {
      const cached = await tryStatic();
      if (cached) return cached;
      throw new Error('Unable to load Oregon evacuation zones');
    }
  }

  const cached = await tryStatic();
  if (cached) return cached;
  return fetchLiveOrEvacuations();
}

export function findEvacZonesNear(
  collection: EvacZoneCollection,
  point: { lat: number; lng: number },
  options?: { nearestLimit?: number; maxNearestKm?: number },
): EvacZoneFeature[] {
  const nearestLimit = options?.nearestLimit ?? 3;
  const maxNearestKm = options?.maxNearestKm ?? 25;

  const intersecting = collection.features.filter((f) =>
    pointInPolygon(point.lng, point.lat, f.geometry),
  );
  if (intersecting.length > 0) {
    const rank = (level: EvacLevel) =>
      level === 'go' ? 0 : level === 'set' ? 1 : level === 'ready' ? 2 : 3;
    return [...intersecting].sort(
      (a, b) => rank(a.properties.level) - rank(b.properties.level),
    );
  }

  const ranked = collection.features
    .map((f) => {
      const c = polygonCentroid(f.geometry);
      if (!c) return null;
      return { feature: f, km: haversineKm(point, c) };
    })
    .filter((row): row is { feature: EvacZoneFeature; km: number } => row !== null)
    .filter((row) => row.km <= maxNearestKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, nearestLimit)
    .map((row) => row.feature);

  return ranked;
}
