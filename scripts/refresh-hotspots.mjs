#!/usr/bin/env node
/**
 * Fetches CONUS VIIRS thermal hotspots (last 24h) into
 * apps/web/public/data/hotspots.json for GitHub Pages fallback.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const QUERY =
  'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Satellite_VIIRS_Thermal_Hotspots_and_Fire_Activity/FeatureServer/0/query';

const CONUS = '-125,24,-66,50';
const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../apps/web/public/data/hotspots.json');
const MAX = 4000;

function pageUrl(offset, pageSize) {
  const params = new URLSearchParams({
    where: 'hours_old<24',
    geometry: CONUS,
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
  return `${QUERY}?${params.toString()}`;
}

function normalize(feature) {
  const props = feature.properties ?? {};
  const coords = feature.geometry?.coordinates ?? [props.longitude, props.latitude];
  if (coords[0] == null || coords[1] == null) return null;
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: coords },
    properties: {
      frp: props.frp,
      confidence: props.confidence,
      brightness: props.bright_ti4,
      satellite: props.satellite,
      hoursOld: props.hours_old,
      acquired: props.acq_date,
    },
  };
}

async function main() {
  console.log('Fetching VIIRS hotspots (CONUS, 24h)…');
  const features = [];
  let offset = 0;
  const pageSize = 500;

  for (;;) {
    const res = await fetch(pageUrl(offset, pageSize));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(JSON.stringify(data.error));
    for (const f of data.features ?? []) {
      const n = normalize(f);
      if (n) features.push(n);
      if (features.length >= MAX) break;
    }
    if (features.length >= MAX) break;
    if (!data.properties?.exceededTransferLimit) break;
    offset += pageSize;
  }

  if (features.length === 0) {
    throw new Error('VIIRS returned 0 hotspots — refusing to overwrite');
  }

  const collection = {
    type: 'FeatureCollection',
    generatedAt: new Date().toISOString(),
    source: 'NASA FIRMS / VIIRS (Living Atlas)',
    features,
  };

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(collection));
  console.log(`Wrote ${features.length} hotspots → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
