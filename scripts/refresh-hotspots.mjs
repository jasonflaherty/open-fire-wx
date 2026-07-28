#!/usr/bin/env node
/**
 * Fetches CONUS VIIRS thermal hotspots (last 24h) into
 * apps/web/public/data/hotspots.json for GitHub Pages fallback.
 *
 * Living Atlas sometimes drops mid-transfer from Actions runners — on failure
 * we keep the existing dump so Pages deploys still succeed.
 */
import { access, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const QUERY =
  'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Satellite_VIIRS_Thermal_Hotspots_and_Fire_Activity/FeatureServer/0/query';

const CONUS = '-125,24,-66,50';
const FETCH_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;
const MAX = 4000;

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../apps/web/public/data/hotspots.json');

function pageUrl(offset, pageSize) {
  const params = new URLSearchParams({
    where: 'hours_old<24',
    geometry: CONUS,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields:
      'latitude,longitude,bright_ti4,frp,confidence,acq_date,acq_time,satellite,hours_old',
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
  const coords = feature.geometry?.coordinates ?? [
    props.longitude,
    props.latitude,
  ];
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

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function fetchPage(offset, pageSize) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(pageUrl(offset, pageSize), {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': 'open-fire-wx-refresh/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(JSON.stringify(data.error));
      return data;
    } catch (err) {
      lastError = err;
      console.warn(
        `VIIRS page offset=${offset} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${err.message}`,
      );
      if (attempt < MAX_ATTEMPTS) await sleep(1500 * attempt);
    }
  }
  throw lastError;
}

async function keepExisting(reason) {
  if (await fileExists(outPath)) {
    console.warn(`${reason}. Keeping existing dump at ${outPath}`);
    return;
  }
  throw new Error(`${reason}. No existing hotspots.json to keep.`);
}

async function main() {
  console.log('Fetching VIIRS hotspots (CONUS, 24h)…');
  try {
    const features = [];
    let offset = 0;
    const pageSize = 500;

    for (;;) {
      const data = await fetchPage(offset, pageSize);
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
      await keepExisting('VIIRS returned 0 hotspots');
      return;
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
  } catch (err) {
    console.warn(`VIIRS unavailable (${err?.cause?.message ?? err.message}).`);
    await keepExisting('VIIRS fetch failed');
  }
}

main().catch(async (err) => {
  console.error(err);
  try {
    await keepExisting('VIIRS refresh failed');
    process.exit(0);
  } catch {
    process.exit(1);
  }
});
