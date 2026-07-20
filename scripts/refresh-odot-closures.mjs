#!/usr/bin/env node
/**
 * Fetches ODOT TripCheck closures and writes apps/web/public/data/odot-closures.json
 * for GitHub Pages (TripCheck blocks browser CORS).
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const INCD_URL = 'https://www.tripcheck.com/Scripts/map/data/INCD.js';
const INCD_LINE_URL = 'https://www.tripcheck.com/Scripts/map/data/INCDLine.js';
const TRIPCHECK_MAP = 'https://www.tripcheck.com/Page/Map';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../apps/web/public/data/odot-closures.json');

function mercatorToLonLat(x, y) {
  const lon = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lon, lat];
}

function optionalString(value) {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

function isClosureRelated(attrs) {
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

function closureStatus(attrs) {
  const severity = String(attrs.odotSeverityDescript ?? '').toLowerCase();
  if (severity.includes('conditional')) return 'conditional';
  if (severity.includes('restrict')) return 'restricted';
  return 'closed';
}

function geometryFromEsri(feature) {
  const geom = feature.geometry;
  const attrs = feature.attributes ?? {};
  if (geom?.paths?.length) {
    const lines = geom.paths
      .map((path) => path.map(([x, y]) => mercatorToLonLat(x, y)))
      .filter((path) => path.length >= 2);
    if (lines.length === 1) return { type: 'LineString', coordinates: lines[0] };
    if (lines.length > 1) return { type: 'MultiLineString', coordinates: lines };
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

function normalize(feature) {
  const attrs = feature.attributes ?? {};
  if (!isClosureRelated(attrs)) return null;
  const geometry = geometryFromEsri(feature);
  if (!geometry) return null;
  const id = String(
    attrs.incidentId ?? attrs.tocsEventId ?? `${attrs.route}-${attrs.startTime}`,
  );
  return {
    type: 'Feature',
    geometry,
    properties: {
      id,
      route: optionalString(attrs.route),
      name: optionalString(attrs.locationName),
      status: closureStatus(attrs),
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

async function fetchSet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Upstream HTTP ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  console.log('Fetching ODOT TripCheck closures…');
  const [pointsSet, linesSet] = await Promise.all([
    fetchSet(INCD_URL),
    fetchSet(INCD_LINE_URL),
  ]);

  const byId = new Map();
  for (const raw of pointsSet.features ?? []) {
    const feature = normalize(raw);
    if (feature) byId.set(feature.properties.id, feature);
  }
  for (const raw of linesSet.features ?? []) {
    const feature = normalize(raw);
    if (feature) byId.set(feature.properties.id, feature);
  }

  const features = [...byId.values()];
  const collection = {
    type: 'FeatureCollection',
    generatedAt: new Date().toISOString(),
    source: 'ODOT TripCheck',
    features,
  };

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(collection));
  console.log(`Wrote ${features.length} closures → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
