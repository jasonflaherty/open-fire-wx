#!/usr/bin/env node
/**
 * Fetches current NIFC WFIGS perimeters and writes apps/web/public/data/fires.json
 * for GitHub Pages static hosting / offline fallback.
 *
 * NIFC ArcGIS sometimes drops mid-transfer from Actions runners — on failure we
 * keep the existing dump so Pages deploys still succeed.
 */
import { access, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const QUERY =
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

const FETCH_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../apps/web/public/data/fires.json');

function pageUrl(offset, pageSize) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: OUT_FIELDS,
    f: 'geojson',
    outSR: '4326',
    returnGeometry: 'true',
    resultOffset: String(offset),
    resultRecordCount: String(pageSize),
  });
  return `${QUERY}?${params.toString()}`;
}

function optionalString(value) {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

function normalize(feature) {
  const props = feature.properties ?? {};
  const personnel = Number(props.attr_TotalIncidentPersonnel ?? NaN);
  return {
    type: 'Feature',
    geometry: feature.geometry,
    properties: {
      name: props.poly_IncidentName ?? props.name ?? 'Unnamed fire',
      acres: props.poly_GISAcres ?? props.acres,
      percentContained: props.attr_PercentContained ?? props.percentContained,
      updated: props.poly_DateCurrent ?? props.updated,
      state: optionalString(props.attr_POOState ?? props.state) ?? '',
      shortDescription: optionalString(props.attr_IncidentShortDescription),
      cause: optionalString(props.attr_FireCause),
      irwinId: optionalString(props.poly_IRWINID ?? props.attr_IrwinID),
      uniqueFireIdentifier: optionalString(props.attr_UniqueFireIdentifier),
      county: optionalString(props.attr_POOCounty),
      personnel: Number.isFinite(personnel) ? personnel : undefined,
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
      if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) {
        throw new Error(`ArcGIS error: ${JSON.stringify(data.error)}`);
      }
      return data;
    } catch (err) {
      lastError = err;
      console.warn(
        `NIFC page offset=${offset} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${err.message}`,
      );
      if (attempt < MAX_ATTEMPTS) await sleep(1500 * attempt);
    }
  }
  throw lastError;
}

async function fetchAll() {
  const pageSize = 500;
  const features = [];
  let offset = 0;

  for (;;) {
    const data = await fetchPage(offset, pageSize);
    const page = (data.features ?? []).map(normalize).filter((f) => f.geometry);
    features.push(...page);
    const exceeded = Boolean(data.properties?.exceededTransferLimit);
    if (!exceeded || page.length === 0) break;
    offset += pageSize;
  }

  return features;
}

async function keepExisting(reason) {
  if (await fileExists(outPath)) {
    console.warn(`${reason}. Keeping existing dump at ${outPath}`);
    return;
  }
  throw new Error(`${reason}. No existing fires.json to keep.`);
}

async function main() {
  console.log('Fetching NIFC perimeters…');
  try {
    const features = await fetchAll();
    if (features.length === 0) {
      await keepExisting('NIFC returned 0 features');
      return;
    }

    const collection = {
      type: 'FeatureCollection',
      generatedAt: new Date().toISOString(),
      source: 'NIFC WFIGS Current Perimeters',
      features,
    };

    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(collection));
    console.log(`Wrote ${collection.features.length} features → ${outPath}`);
  } catch (err) {
    console.warn(`NIFC unavailable (${err?.cause?.message ?? err.message}).`);
    await keepExisting('NIFC fetch failed');
  }
}

main().catch(async (err) => {
  console.error(err);
  try {
    await keepExisting('NIFC refresh failed');
    process.exit(0);
  } catch {
    process.exit(1);
  }
});
