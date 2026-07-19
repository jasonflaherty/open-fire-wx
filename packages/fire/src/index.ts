export type FireFeatureProperties = {
  name?: string;
  acres?: number;
  percentContained?: number;
  updated?: string | number;
  state?: string;
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

function normalizeFeature(raw: Record<string, unknown>): FireFeature | null {
  const geometry = raw.geometry as FireFeature['geometry'] | undefined;
  if (!geometry) return null;
  const props = (raw.properties ?? {}) as Record<string, unknown>;
  const updated = props.poly_DateCurrent ?? props.updated;
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
      state: String(props.attr_POOState ?? props.state ?? ''),
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
    const res = await fetch(nifcPageUrl(offset, pageSize));
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
      const res = await fetch(staticUrl);
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
