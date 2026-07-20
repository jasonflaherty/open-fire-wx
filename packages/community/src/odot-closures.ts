import { withHourlyCacheBust } from '@openfirewx/shared';
import { haversineKm } from './geo';

/** ODOT TripCheck live incident feeds (ArcGIS JSON over .js URLs). */
export const ODOT_INCD_URL =
  'https://www.tripcheck.com/Scripts/map/data/INCD.js';
export const ODOT_INCD_LINE_URL =
  'https://www.tripcheck.com/Scripts/map/data/INCDLine.js';

export type RoadClosureStatus = 'closed' | 'conditional' | 'restricted';

export type RoadClosureProperties = {
  id: string;
  route?: string;
  name?: string;
  status: RoadClosureStatus;
  statusLabel?: string;
  subtype?: string;
  category?: string;
  comments?: string;
  updated?: string;
  beginMarker?: string;
  endMarker?: string;
  source: 'ODOT TripCheck';
  tripcheckUrl: string;
};

export type RoadClosureFeature = {
  type: 'Feature';
  geometry:
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'LineString'; coordinates: [number, number][] }
    | { type: 'MultiLineString'; coordinates: [number, number][][] };
  properties: RoadClosureProperties;
};

export type RoadClosureCollection = {
  type: 'FeatureCollection';
  features: RoadClosureFeature[];
  generatedAt?: string;
  source?: string;
};

type EsriFeature = {
  attributes?: Record<string, unknown>;
  geometry?: {
    x?: number;
    y?: number;
    paths?: number[][][];
  };
};

type EsriFeatureSet = {
  features?: EsriFeature[];
  spatialReference?: { wkid?: number };
};

const TRIPCHECK_MAP =
  'https://www.tripcheck.com/Page/Map';

function mercatorToLonLat(x: number, y: number): [number, number] {
  const lon = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lon, lat];
}

function optionalString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

function isClosureRelated(attrs: Record<string, unknown>): boolean {
  const subtype = String(attrs.eventSubTypeName ?? '').toLowerCase();
  const severity = String(attrs.odotSeverityDescript ?? '').toLowerCase();
  const comments = String(attrs.comments ?? '').toLowerCase();
  const category = String(attrs.odotCategoryDescript ?? '').toLowerCase();

  if (subtype === 'closure') return true;
  if (severity.includes('closure')) return true;
  if (comments.includes('closed to') || comments.includes('road closed')) {
    return true;
  }
  if (comments.includes('no through traffic')) return true;
  // Fire / slide impacts that close highway segments
  if (
    (subtype === 'wildfire' || subtype === 'landslide' || subtype === 'fire') &&
    (severity.includes('closure') ||
      comments.includes('closed') ||
      comments.includes('impassable'))
  ) {
    return true;
  }
  if (category.includes('closure')) return true;
  return false;
}

function closureStatus(attrs: Record<string, unknown>): RoadClosureStatus {
  const severity = String(attrs.odotSeverityDescript ?? '').toLowerCase();
  if (severity.includes('conditional')) return 'conditional';
  if (severity.includes('restrict')) return 'restricted';
  return 'closed';
}

function geometryFromEsri(
  feature: EsriFeature,
): RoadClosureFeature['geometry'] | null {
  const geom = feature.geometry;
  const attrs = feature.attributes ?? {};
  if (geom?.paths?.length) {
    const lines = geom.paths
      .map((path) => path.map(([x, y]) => mercatorToLonLat(x, y)))
      .filter((path) => path.length >= 2);
    if (lines.length === 1) {
      return { type: 'LineString', coordinates: lines[0]! };
    }
    if (lines.length > 1) {
      return { type: 'MultiLineString', coordinates: lines };
    }
  }

  if (geom?.x != null && geom?.y != null) {
    return { type: 'Point', coordinates: mercatorToLonLat(geom.x, geom.y) };
  }

  const lat = Number(attrs.startLatitude);
  const lon = Number(attrs.startLongitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return { type: 'Point', coordinates: [lon, lat] };
  }
  return null;
}

function normalizeFeature(raw: EsriFeature): RoadClosureFeature | null {
  const attrs = raw.attributes ?? {};
  if (!isClosureRelated(attrs)) return null;
  const geometry = geometryFromEsri(raw);
  if (!geometry) return null;

  const id = String(
    attrs.incidentId ?? attrs.tocsEventId ?? `${attrs.route}-${attrs.startTime}`,
  );
  const status = closureStatus(attrs);

  return {
    type: 'Feature',
    geometry,
    properties: {
      id,
      route: optionalString(attrs.route),
      name: optionalString(attrs.locationName),
      status,
      statusLabel: optionalString(attrs.odotSeverityDescript),
      subtype: optionalString(attrs.eventSubTypeName),
      category: optionalString(attrs.odotCategoryDescript),
      comments: optionalString(attrs.comments),
      updated: optionalString(attrs.lastUpdated),
      beginMarker: optionalString(attrs.beginMarker),
      endMarker: optionalString(attrs.endMarker),
      source: 'ODOT TripCheck',
      tripcheckUrl: TRIPCHECK_MAP,
    },
  };
}

async function fetchEsriFeatureSet(url: string): Promise<EsriFeatureSet> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`ODOT TripCheck fetch failed (${res.status})`);
  }
  return (await res.json()) as EsriFeatureSet;
}

/** Prefer line geometry when the same incident appears as point + line. */
export function mergeClosureFeatures(
  points: RoadClosureFeature[],
  lines: RoadClosureFeature[],
): RoadClosureFeature[] {
  const byId = new Map<string, RoadClosureFeature>();
  for (const feature of points) {
    byId.set(feature.properties.id, feature);
  }
  for (const feature of lines) {
    byId.set(feature.properties.id, feature);
  }
  return [...byId.values()];
}

export async function fetchLiveOdotClosures(): Promise<RoadClosureCollection> {
  const [pointsSet, linesSet] = await Promise.all([
    fetchEsriFeatureSet(ODOT_INCD_URL),
    fetchEsriFeatureSet(ODOT_INCD_LINE_URL),
  ]);

  const points = (pointsSet.features ?? [])
    .map(normalizeFeature)
    .filter((f): f is RoadClosureFeature => f !== null);
  const lines = (linesSet.features ?? [])
    .map(normalizeFeature)
    .filter((f): f is RoadClosureFeature => f !== null);

  return {
    type: 'FeatureCollection',
    features: mergeClosureFeatures(points, lines),
    generatedAt: new Date().toISOString(),
    source: 'ODOT TripCheck',
  };
}

export async function fetchOdotClosures(options?: {
  staticUrl?: string;
  preferLive?: boolean;
}): Promise<RoadClosureCollection> {
  const preferLive = options?.preferLive ?? true;
  const staticUrl = options?.staticUrl;

  const tryStatic = async (): Promise<RoadClosureCollection | null> => {
    if (!staticUrl) return null;
    try {
      const res = await fetch(withHourlyCacheBust(staticUrl), {
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as RoadClosureCollection;
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
      return await fetchLiveOdotClosures();
    } catch {
      const cached = await tryStatic();
      if (cached) return cached;
      throw new Error('Unable to load ODOT road closures');
    }
  }

  const cached = await tryStatic();
  if (cached) return cached;
  return fetchLiveOdotClosures();
}

export function closureColor(status: RoadClosureStatus | undefined): string {
  switch (status) {
    case 'conditional':
      return '#e9c46a';
    case 'restricted':
      return '#e85d04';
    case 'closed':
    default:
      return '#c1121f';
  }
}

function featurePoint(feature: RoadClosureFeature): { lat: number; lng: number } | null {
  const g = feature.geometry;
  if (g.type === 'Point') {
    return { lng: g.coordinates[0], lat: g.coordinates[1] };
  }
  if (g.type === 'LineString' && g.coordinates.length) {
    const mid = g.coordinates[Math.floor(g.coordinates.length / 2)]!;
    return { lng: mid[0]!, lat: mid[1]! };
  }
  if (g.type === 'MultiLineString' && g.coordinates[0]?.length) {
    const line = g.coordinates[0]!;
    const mid = line[Math.floor(line.length / 2)]!;
    return { lng: mid[0]!, lat: mid[1]! };
  }
  return null;
}

export function findClosuresNear(
  collection: RoadClosureCollection,
  point: { lat: number; lng: number },
  options?: { limit?: number; maxKm?: number },
): Array<RoadClosureFeature & { distanceKm: number }> {
  const limit = options?.limit ?? 5;
  const maxKm = options?.maxKm ?? 50;
  return collection.features
    .map((f) => {
      const p = featurePoint(f);
      if (!p) return null;
      return { ...f, distanceKm: haversineKm(point, p) };
    })
    .filter(
      (row): row is RoadClosureFeature & { distanceKm: number } =>
        row !== null && row.distanceKm <= maxKm,
    )
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
