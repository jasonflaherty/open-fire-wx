import { withHourlyCacheBust } from '@openfirewx/shared';

export type FireFeatureProperties = {
  name?: string;
  acres?: number;
  percentContained?: number;
  updated?: string | number;
  state?: string;
  shortDescription?: string;
  cause?: string;
  irwinId?: string;
  uniqueFireIdentifier?: string;
  county?: string;
  personnel?: number;
};

export type FireFeature = {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon' | 'Point';
    coordinates: number[] | number[][] | number[][][];
  };
  properties: FireFeatureProperties;
};

export type FireCollection = {
  type: 'FeatureCollection';
  features: FireFeature[];
  generatedAt?: string;
  source?: string;
};

/** NIFC WFIGS current interagency perimeters (GeoJSON). */
export const NIFC_PERIMETERS_QUERY =
  'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query';

const OUT_FIELDS = [
  'poly_IncidentName',
  'poly_GISAcres',
  'attr_PercentContained',
  'poly_DateCurrent',
  'attr_POOState',
  'poly_IRWINID',
  'attr_IrwinID',
  'attr_UniqueFireIdentifier',
  'attr_IncidentShortDescription',
  'attr_FireCause',
  'attr_POOCounty',
  'attr_TotalIncidentPersonnel',
].join(',');

function nifcPageUrl(offset: number, pageSize: number): string {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: OUT_FIELDS,
    f: 'geojson',
    outSR: '4326',
    returnGeometry: 'true',
    resultOffset: String(offset),
    resultRecordCount: String(pageSize),
  });
  return `${NIFC_PERIMETERS_QUERY}?${params.toString()}`;
}

function optionalString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

function normalizeFeature(raw: Record<string, unknown>): FireFeature | null {
  const geometry = raw.geometry as FireFeature['geometry'] | undefined;
  if (!geometry) return null;
  const props = (raw.properties ?? {}) as Record<string, unknown>;
  const updated = props.poly_DateCurrent ?? props.updated;
  const personnel = Number(props.attr_TotalIncidentPersonnel ?? props.personnel ?? NaN);
  return {
    type: 'Feature',
    geometry,
    properties: {
      name: String(props.poly_IncidentName ?? props.name ?? 'Unnamed fire'),
      acres: Number(props.poly_GISAcres ?? props.acres ?? NaN) || undefined,
      percentContained:
        Number(props.attr_PercentContained ?? props.percentContained ?? NaN) ||
        undefined,
      updated:
        typeof updated === 'number' || typeof updated === 'string' ? updated : '',
      state: optionalString(props.attr_POOState ?? props.state) ?? '',
      shortDescription: optionalString(
        props.attr_IncidentShortDescription ?? props.shortDescription,
      ),
      cause: optionalString(props.attr_FireCause ?? props.cause),
      irwinId: optionalString(props.poly_IRWINID ?? props.attr_IrwinID ?? props.irwinId),
      uniqueFireIdentifier: optionalString(
        props.attr_UniqueFireIdentifier ?? props.uniqueFireIdentifier,
      ),
      county: optionalString(props.attr_POOCounty ?? props.county),
      personnel: Number.isFinite(personnel) ? personnel : undefined,
    },
  };
}

function isArcGisError(data: unknown): boolean {
  return Boolean(
    data &&
      typeof data === 'object' &&
      'error' in data &&
      (data as { error?: unknown }).error,
  );
}

export async function fetchLiveFirePerimeters(): Promise<FireCollection> {
  const pageSize = 500;
  const features: FireFeature[] = [];
  let offset = 0;

  for (;;) {
    const res = await fetch(nifcPageUrl(offset, pageSize), { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to fetch fire perimeters (${res.status})`);
    }
    const data = (await res.json()) as {
      type?: string;
      features?: Array<Record<string, unknown>>;
      properties?: { exceededTransferLimit?: boolean };
      error?: unknown;
    };

    if (isArcGisError(data)) {
      throw new Error('ArcGIS query failed — check outFields / parameters');
    }

    const page = (data.features ?? [])
      .map(normalizeFeature)
      .filter((f): f is FireFeature => f !== null);
    features.push(...page);

    const exceeded = Boolean(data.properties?.exceededTransferLimit);
    if (!exceeded || page.length === 0) break;
    offset += pageSize;
  }

  return {
    type: 'FeatureCollection',
    features,
    generatedAt: new Date().toISOString(),
    source: 'NIFC WFIGS Current Perimeters',
  };
}

export async function fetchFirePerimeters(options?: {
  staticUrl?: string;
  preferLive?: boolean;
}): Promise<FireCollection> {
  const preferLive = options?.preferLive ?? true;
  const staticUrl = options?.staticUrl;

  const tryStatic = async (): Promise<FireCollection | null> => {
    if (!staticUrl) return null;
    try {
      const res = await fetch(withHourlyCacheBust(staticUrl), { cache: 'no-store' });
      if (!res.ok) return null;
      const data = (await res.json()) as FireCollection;
      if (data?.type !== 'FeatureCollection') return null;
      if (!Array.isArray(data.features) || data.features.length === 0) return null;
      // Skip known sample placeholder
      if (String(data.source ?? '').includes('sample')) return null;
      return data;
    } catch {
      return null;
    }
  };

  if (preferLive) {
    try {
      return await fetchLiveFirePerimeters();
    } catch {
      const cached = await tryStatic();
      if (cached) return cached;
      throw new Error('Unable to load fire perimeters from live or static sources');
    }
  }

  const cached = await tryStatic();
  if (cached) return cached;
  return fetchLiveFirePerimeters();
}

/** @deprecated use NIFC_PERIMETERS_QUERY */
export const NIFC_PERIMETERS_URL = nifcPageUrl(0, 2000);

/* -------------------------------------------------------------------------- */
/* NASA FIRMS / VIIRS hotspots (Living Atlas — no API key)                    */
/* -------------------------------------------------------------------------- */

export type HotspotProperties = {
  frp?: number;
  confidence?: string;
  brightness?: number;
  satellite?: string;
  hoursOld?: number;
  acquired?: string | number;
};

export type HotspotFeature = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: HotspotProperties;
};

export type HotspotCollection = {
  type: 'FeatureCollection';
  features: HotspotFeature[];
  generatedAt?: string;
  source?: string;
};

/** Esri Living Atlas VIIRS thermal hotspots (FIRMS-derived). */
export const VIIRS_HOTSPOTS_QUERY =
  'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Satellite_VIIRS_Thermal_Hotspots_and_Fire_Activity/FeatureServer/0/query';

const CONUS_BBOX = '-125,24,-66,50';

function viirsPageUrl(offset: number, pageSize: number, maxHoursOld: number): string {
  const params = new URLSearchParams({
    where: `hours_old<${maxHoursOld}`,
    geometry: CONUS_BBOX,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'latitude,longitude,bright_ti4,frp,confidence,acq_date,acq_time,satellite,hours_old',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
    resultOffset: String(offset),
    resultRecordCount: String(pageSize),
  });
  return `${VIIRS_HOTSPOTS_QUERY}?${params.toString()}`;
}

function normalizeHotspot(raw: Record<string, unknown>): HotspotFeature | null {
  const geometry = raw.geometry as HotspotFeature['geometry'] | undefined;
  const props = (raw.properties ?? {}) as Record<string, unknown>;
  let coordinates = geometry?.coordinates;
  if (!coordinates) {
    const lon = Number(props.longitude);
    const lat = Number(props.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    coordinates = [lon, lat];
  }
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: coordinates as [number, number] },
    properties: {
      frp: Number(props.frp ?? NaN) || undefined,
      confidence: props.confidence != null ? String(props.confidence) : undefined,
      brightness: Number(props.bright_ti4 ?? props.brightness ?? NaN) || undefined,
      satellite: props.satellite != null ? String(props.satellite) : undefined,
      hoursOld: Number(props.hours_old ?? NaN) || undefined,
      acquired: (props.acq_date as string | number | undefined) ?? undefined,
    },
  };
}

export async function fetchLiveHotspots(options?: {
  maxHoursOld?: number;
  maxFeatures?: number;
}): Promise<HotspotCollection> {
  const maxHoursOld = options?.maxHoursOld ?? 24;
  const maxFeatures = options?.maxFeatures ?? 5000;
  const pageSize = 500;
  const features: HotspotFeature[] = [];
  let offset = 0;

  for (;;) {
    const res = await fetch(viirsPageUrl(offset, pageSize, maxHoursOld), {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch VIIRS hotspots (${res.status})`);
    }
    const data = (await res.json()) as {
      features?: Array<Record<string, unknown>>;
      properties?: { exceededTransferLimit?: boolean };
      error?: unknown;
    };
    if (isArcGisError(data)) {
      throw new Error('VIIRS hotspot query failed');
    }
    const page = (data.features ?? [])
      .map(normalizeHotspot)
      .filter((f): f is HotspotFeature => f !== null);
    features.push(...page);
    if (features.length >= maxFeatures) {
      features.length = maxFeatures;
      break;
    }
    if (!data.properties?.exceededTransferLimit || page.length === 0) break;
    offset += pageSize;
  }

  return {
    type: 'FeatureCollection',
    features,
    generatedAt: new Date().toISOString(),
    source: 'NASA FIRMS / VIIRS (Living Atlas)',
  };
}

export async function fetchHotspots(options?: {
  staticUrl?: string;
  preferLive?: boolean;
}): Promise<HotspotCollection> {
  const preferLive = options?.preferLive ?? true;
  const tryStatic = async (): Promise<HotspotCollection | null> => {
    if (!options?.staticUrl) return null;
    try {
      const res = await fetch(withHourlyCacheBust(options.staticUrl), {
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as HotspotCollection;
      if (data?.type !== 'FeatureCollection' || !data.features?.length) return null;
      return data;
    } catch {
      return null;
    }
  };

  if (preferLive) {
    try {
      return await fetchLiveHotspots();
    } catch {
      const cached = await tryStatic();
      if (cached) return cached;
      throw new Error('Unable to load hotspots');
    }
  }

  return (await tryStatic()) ?? fetchLiveHotspots();
}

export {
  INCIWEB_PUBLICATION_RSS,
  fetchInciwebNewsForFire,
  fetchInciwebPublicationFeed,
  matchInciwebNewsForFire,
  stripHtml,
  type InciwebNewsItem,
} from './inciweb';
