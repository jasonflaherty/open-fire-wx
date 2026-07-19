export type FireFeatureProperties = {
  name?: string;
  acres?: number;
  percentContained?: number;
  updated?: string;
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

const NIFC_PERIMETERS_URL =
  'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query?where=1%3D1&outFields=poly_IncidentName,poly_GISAcres,poly_PercentContained,poly_DateCurrent,attr_POOState&f=geojson&outSR=4326';

function normalizeFeature(raw: Record<string, unknown>): FireFeature | null {
  const geometry = raw.geometry as FireFeature['geometry'] | undefined;
  if (!geometry) return null;
  const props = (raw.properties ?? {}) as Record<string, unknown>;
  return {
    type: 'Feature',
    geometry,
    properties: {
      name: String(props.poly_IncidentName ?? props.name ?? 'Unnamed fire'),
      acres: Number(props.poly_GISAcres ?? props.acres ?? 0) || undefined,
      percentContained:
        Number(props.poly_PercentContained ?? props.percentContained ?? NaN) ||
        undefined,
      updated: String(props.poly_DateCurrent ?? props.updated ?? ''),
      state: String(props.attr_POOState ?? props.state ?? ''),
    },
  };
}

export async function fetchFirePerimeters(options?: {
  staticUrl?: string;
  liveUrl?: string;
}): Promise<FireCollection> {
  const staticUrl = options?.staticUrl;
  const liveUrl = options?.liveUrl ?? NIFC_PERIMETERS_URL;

  if (staticUrl) {
    try {
      const res = await fetch(staticUrl);
      if (res.ok) {
        const data = (await res.json()) as FireCollection;
        if (data?.type === 'FeatureCollection') {
          return data;
        }
      }
    } catch {
      // fall through to live
    }
  }

  const res = await fetch(liveUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch fire perimeters (${res.status})`);
  }
  const data = (await res.json()) as {
    type: string;
    features?: Array<Record<string, unknown>>;
  };

  const features = (data.features ?? [])
    .map(normalizeFeature)
    .filter((f): f is FireFeature => f !== null);

  return {
    type: 'FeatureCollection',
    features,
    generatedAt: new Date().toISOString(),
    source: 'NIFC WFIGS Current Perimeters',
  };
}

export { NIFC_PERIMETERS_URL };
