#!/usr/bin/env node
/**
 * Builds apps/web/public/data/shelters-or.json from curated Oregon sites
 * plus Oregon OEM live shelters when the FeatureServer responds.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OEM_QUERY =
  'https://services1.arcgis.com/znO8Hz1SuVVohYhZ/arcgis/rest/services/Emergency_Response_OEM_Public/FeatureServer/3/query';

const CURATED = [
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
    geometry: { type: 'Point', coordinates: [-120.846, 44.3] },
    properties: {
      id: 'curated-crook-fairgrounds',
      name: 'Crook County Fairgrounds',
      address: '1280 S Main St, Prineville, OR 97754',
      county: 'Crook',
      petsAllowed: 'unknown',
      livestockAllowed: true,
      petsNotes:
        'Regional livestock-capable fairgrounds; confirm with county OEM before travel.',
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
      petsNotes:
        'People shelter only unless OEM announces otherwise; ask about pets before arriving.',
      status: 'unknown',
      source: 'Curated (historical OEM use)',
      sourceUrl: 'https://jacksoncountyor.org/emergency',
      updatedAt: '2026-07-19',
    },
  },
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../apps/web/public/data/shelters-or.json');

async function fetchOemShelters() {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: '*',
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: '500',
  });
  const res = await fetch(`${OEM_QUERY}?${params}`, {
    signal: AbortSignal.timeout(20_000),
    headers: { 'User-Agent': 'open-fire-wx-refresh/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  const features = [];
  for (const raw of data.features ?? []) {
    const props = raw.properties ?? {};
    const geom = raw.geometry;
    if (!geom || geom.type !== 'Point') continue;
    const [lng, lat] = geom.coordinates ?? [];
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    const shelterType = Number(props.SHELTER_TYPE);
    const description = String(props.SHELTER_DESCRIPTION ?? 'Shelter').trim();
    const livestockAllowed =
      shelterType === 3 || /animal|livestock|horse/i.test(description);
    const updatedRaw = props.EditDate ?? props.CreationDate;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        id: `oem:${props.GlobalID ?? props.OBJECTID}`,
        name: description,
        petsAllowed: livestockAllowed || /pet/i.test(description) ? true : 'unknown',
        livestockAllowed: livestockAllowed ? true : 'unknown',
        petsNotes: livestockAllowed
          ? 'Listed as large-animal / livestock shelter by Oregon OEM.'
          : 'Pet policy not specified — confirm with county OEM.',
        status: 'open',
        source: 'Oregon OEM',
        sourceUrl: 'https://www.oregon.gov/oem/Pages/default.aspx',
        updatedAt:
          typeof updatedRaw === 'number'
            ? new Date(updatedRaw).toISOString()
            : undefined,
        incidentName: props.INCIDENT_NAME || undefined,
      },
    });
  }
  return features;
}

async function main() {
  console.log('Building Oregon shelters dump…');
  let live = [];
  try {
    live = await fetchOemShelters();
    console.log(`OEM live shelters: ${live.length}`);
  } catch (err) {
    console.warn(`OEM shelters unavailable (${err.message}); curated only.`);
  }

  const byId = new Map();
  for (const f of CURATED) byId.set(f.properties.id, f);
  for (const f of live) byId.set(f.properties.id, f);

  const collection = {
    type: 'FeatureCollection',
    generatedAt: new Date().toISOString(),
    source: 'Curated Oregon sites + Oregon OEM shelters when published',
    disclaimer:
      'Confirm with county OEM before you go. Open/closed status changes quickly during incidents.',
    features: [...byId.values()],
  };

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(collection));
  console.log(`Wrote ${collection.features.length} shelters → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
