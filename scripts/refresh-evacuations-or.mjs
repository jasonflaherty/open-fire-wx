#!/usr/bin/env node
/**
 * Fetches Oregon OEM evacuation polygons (Deschutes + Jackson Ready/Set/Go)
 * into apps/web/public/data/evacuations-or.json for GitHub Pages.
 */
import { access, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const QUERY =
  'https://services.arcgis.com/uUvqNMGPm7axC2dD/arcgis/rest/services/Fire_Evacuation_Areas_Public/FeatureServer/0/query';
const COUNTIES = ['Deschutes', 'Jackson'];
const SOURCE_URL = 'https://www.oregon.gov/oem/Pages/default.aspx';
const FETCH_TIMEOUT_MS = 25_000;
const MAX_ATTEMPTS = 3;

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../apps/web/public/data/evacuations-or.json');

function mapLevel(raw) {
  const n = Number(raw);
  if (n === 1) return 'ready';
  if (n === 2) return 'set';
  if (n === 3) return 'go';
  return 'unknown';
}

function optionalString(value) {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': 'open-fire-wx-refresh/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      console.warn(`Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${err.message}`);
      if (attempt < MAX_ATTEMPTS) await sleep(1500 * attempt);
    }
  }
  throw lastError;
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('Fetching Oregon OEM evacuations (Deschutes, Jackson)…');
  try {
    const counties = COUNTIES.map((c) => `'${c}'`).join(',');
    const params = new URLSearchParams({
      where: `County IN (${counties}) AND Fire_Evacuation_Level IN (1,2,3)`,
      outFields:
        'OBJECTID,GlobalID,Fire_Name,Fire_Evacuation_Level,County,Evac_Area_Name,last_edited_date,HazardType',
      outSR: '4326',
      f: 'geojson',
      resultRecordCount: '2000',
    });
    const data = await fetchJson(`${QUERY}?${params}`);
    if (data.error) throw new Error(JSON.stringify(data.error));

    const features = [];
    for (const raw of data.features ?? []) {
      const props = raw.properties ?? {};
      const level = mapLevel(props.Fire_Evacuation_Level);
      if (level === 'unknown') continue;
      if (!COUNTIES.includes(props.County)) continue;
      const geom = raw.geometry;
      if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) {
        continue;
      }
      const updatedRaw = props.last_edited_date;
      features.push({
        type: 'Feature',
        geometry: geom,
        properties: {
          id: String(props.GlobalID ?? props.OBJECTID),
          level,
          name:
            optionalString(props.Evac_Area_Name) ??
            optionalString(props.Fire_Name) ??
            'Evacuation zone',
          county: props.County,
          fireName: optionalString(props.Fire_Name),
          source: 'Oregon OEM',
          sourceUrl: SOURCE_URL,
          updatedAt:
            typeof updatedRaw === 'number'
              ? new Date(updatedRaw).toISOString()
              : optionalString(updatedRaw),
          hazardType: optionalString(props.HazardType),
        },
      });
    }

    const collection = {
      type: 'FeatureCollection',
      generatedAt: new Date().toISOString(),
      source: 'Oregon OEM Fire Evacuation Areas',
      coverage: COUNTIES,
      features,
    };

    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(collection));
    console.log(`Wrote ${features.length} zones → ${outPath}`);
  } catch (err) {
    console.warn(`Oregon OEM evacuations unavailable (${err.message}).`);
    if (await fileExists(outPath)) {
      console.warn(`Keeping existing dump at ${outPath}`);
      return;
    }
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(
      outPath,
      JSON.stringify({
        type: 'FeatureCollection',
        generatedAt: new Date().toISOString(),
        source: 'Oregon OEM Fire Evacuation Areas',
        coverage: COUNTIES,
        features: [],
        note: 'Upstream unavailable during refresh',
      }),
    );
    console.warn(`Wrote empty evacuations fallback → ${outPath}`);
  }
}

main().catch(async (err) => {
  console.error(err);
  if (await fileExists(outPath)) process.exit(0);
  process.exit(1);
});
