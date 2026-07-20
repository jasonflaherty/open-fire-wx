import { withHourlyCacheBust } from '@openfirewx/shared';
import { haversineKm } from './geo';

/** Oregon OEM incident shelters (sparse; may be empty outside active incidents). */
export const OR_OEM_SHELTERS_QUERY =
  'https://services1.arcgis.com/znO8Hz1SuVVohYhZ/arcgis/rest/services/Emergency_Response_OEM_Public/FeatureServer/3/query';

export type ShelterStatus = 'open' | 'standby' | 'unknown';

export type ShelterProperties = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  county?: string;
  petsAllowed: boolean | 'unknown';
  livestockAllowed: boolean | 'unknown';
  petsNotes?: string;
  status: ShelterStatus;
  source: string;
  sourceUrl?: string;
  updatedAt?: string;
  incidentName?: string;
};

export type ShelterFeature = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: ShelterProperties;
};

export type ShelterCollection = {
  type: 'FeatureCollection';
  features: ShelterFeature[];
  generatedAt?: string;
  source?: string;
  disclaimer?: string;
};

function optionalString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

/** Curated Oregon sites that historically support people and/or animals. */
export const CURATED_OR_SHELTERS: ShelterFeature[] = [
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-121.174, 44.271] },
    properties: {
      id: 'curated-deschutes-fairgrounds',
      name: 'Deschutes County Fairgrounds & Expo Center',
      address: '3800 SW Airport Way, Redmond, OR 97756',
      phone: '541-548-2711',
      county: 'Deschutes',
      petsAllowed: 'unknown',
      livestockAllowed: true,
        petsNotes:
        'Fairgrounds historically host large-animal evacuation support; confirm pet/livestock intake with Deschutes OEM.',
      status: 'unknown',
      source: 'Curated (Deschutes County Fair & Expo)',
      sourceUrl: 'https://www.deschutes.org/emergency',
      updatedAt: '2026-07-19',
    },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-122.916, 42.375] },
    properties: {
      id: 'curated-jackson-expo',
      name: 'Jackson County Expo',
      address: '1 Peninger Rd, Central Point, OR 97502',
      phone: '541-774-8270',
      county: 'Jackson',
      petsAllowed: 'unknown',
      livestockAllowed: true,
      petsNotes:
        'Expo grounds are often used for emergency animal staging; confirm with Jackson County Emergency Management.',
      status: 'unknown',
      source: 'Curated (Jackson County Expo)',
      sourceUrl: 'https://jacksoncountyor.org/emergency',
      updatedAt: '2026-07-19',
    },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-121.0, 44.3] },
    properties: {
      id: 'curated-crook-fairgrounds',
      name: 'Crook County Fairgrounds',
      address: '1280 Main St, Prineville, OR 97754',
      county: 'Crook',
      petsAllowed: 'unknown',
      livestockAllowed: true,
      petsNotes: 'Regional livestock-capable fairgrounds; confirm with county OEM before travel.',
      status: 'unknown',
      source: 'Curated (Crook County Fairgrounds)',
      sourceUrl: 'https://co.crook.or.us/',
      updatedAt: '2026-07-19',
    },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-122.875, 42.326] },
    properties: {
      id: 'curated-medford-armory',
      name: 'Medford National Guard Armory (historical shelter site)',
      address: '1701 S Pacific Hwy, Medford, OR 97501',
      county: 'Jackson',
      petsAllowed: 'unknown',
      livestockAllowed: false,
      petsNotes: 'People shelter only unless OEM announces otherwise; ask about pets before arriving.',
      status: 'unknown',
      source: 'Curated (historical OEM use)',
      sourceUrl: 'https://jacksoncountyor.org/emergency',
      updatedAt: '2026-07-19',
    },
  },
];

function normalizeOemShelter(raw: {
  geometry?: { type?: string; coordinates?: number[] } | null;
  properties?: Record<string, unknown>;
}): ShelterFeature | null {
  const props = raw.properties ?? {};
  const geom = raw.geometry;
  if (!geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates)) {
    return null;
  }
  const [lng, lat] = geom.coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  const shelterType = Number(props.SHELTER_TYPE);
  const description = optionalString(props.SHELTER_DESCRIPTION) ?? 'Shelter';
  const livestockAllowed = shelterType === 3 || /animal|livestock|horse/i.test(description);
  const petsAllowed =
    livestockAllowed || /pet/i.test(description) ? true : ('unknown' as const);

  const updatedRaw = props.EditDate ?? props.LAST_UPDATED ?? props.CreationDate;
  let updatedAt: string | undefined;
  if (typeof updatedRaw === 'number') {
    updatedAt = new Date(updatedRaw).toISOString();
  } else {
    updatedAt = optionalString(updatedRaw);
  }

  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng as number, lat as number] },
    properties: {
      id: String(props.GlobalID ?? props.OBJECTID ?? description),
      name: description,
      petsAllowed,
      livestockAllowed: livestockAllowed ? true : 'unknown',
      petsNotes: livestockAllowed
        ? 'Listed as large-animal / livestock shelter by Oregon OEM.'
        : 'Pet policy not specified — confirm with county OEM.',
      status: 'open',
      source: 'Oregon OEM',
      sourceUrl: 'https://www.oregon.gov/oem/Pages/default.aspx',
      updatedAt,
      incidentName: optionalString(props.INCIDENT_NAME),
    },
  };
}

export async function fetchLiveOemShelters(): Promise<ShelterFeature[]> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: '*',
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: '500',
  });
  const res = await fetch(`${OR_OEM_SHELTERS_QUERY}?${params}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Oregon OEM shelters fetch failed (${res.status})`);
  const data = (await res.json()) as {
    features?: Array<{
      geometry?: { type?: string; coordinates?: number[] } | null;
      properties?: Record<string, unknown>;
    }>;
    error?: unknown;
  };
  if (data.error) throw new Error(JSON.stringify(data.error));
  return (data.features ?? [])
    .map(normalizeOemShelter)
    .filter((f): f is ShelterFeature => f !== null);
}

export function mergeShelterFeatures(
  curated: ShelterFeature[],
  live: ShelterFeature[],
): ShelterFeature[] {
  const byId = new Map<string, ShelterFeature>();
  for (const f of curated) byId.set(f.properties.id, f);
  for (const f of live) byId.set(`oem:${f.properties.id}`, f);
  return [...byId.values()];
}

export async function buildOrSheltersCollection(): Promise<ShelterCollection> {
  let live: ShelterFeature[] = [];
  try {
    live = await fetchLiveOemShelters();
  } catch {
    live = [];
  }
  return {
    type: 'FeatureCollection',
    features: mergeShelterFeatures(CURATED_OR_SHELTERS, live),
    generatedAt: new Date().toISOString(),
    source: 'Curated Oregon sites + Oregon OEM shelters when published',
    disclaimer:
      'Confirm with county OEM before you go. Open/closed status changes quickly during incidents.',
  };
}

export async function fetchOrShelters(options?: {
  staticUrl?: string;
}): Promise<ShelterCollection> {
  const staticUrl = options?.staticUrl;
  if (staticUrl) {
    try {
      const res = await fetch(withHourlyCacheBust(staticUrl), {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as ShelterCollection;
        if (data?.type === 'FeatureCollection' && Array.isArray(data.features)) {
          return data;
        }
      }
    } catch {
      /* fall through */
    }
  }
  return buildOrSheltersCollection();
}

export function findSheltersNear(
  collection: ShelterCollection,
  point: { lat: number; lng: number },
  options?: { limit?: number; petsOnly?: boolean; maxKm?: number },
): Array<ShelterFeature & { distanceKm: number }> {
  const limit = options?.limit ?? 3;
  const maxKm = options?.maxKm ?? 80;
  return collection.features
    .filter((f) => {
      if (!options?.petsOnly) return true;
      return f.properties.petsAllowed === true || f.properties.livestockAllowed === true;
    })
    .map((f) => {
      const [lng, lat] = f.geometry.coordinates;
      return {
        ...f,
        distanceKm: haversineKm(point, { lat, lng }),
      };
    })
    .filter((f) => f.distanceKm <= maxKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
