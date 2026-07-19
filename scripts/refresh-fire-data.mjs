#!/usr/bin/env node
/**
 * Fetches current NIFC WFIGS perimeters and writes apps/web/public/data/fires.json
 * for GitHub Pages static hosting.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL =
  'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query?where=1%3D1&outFields=poly_IncidentName,poly_GISAcres,poly_PercentContained,poly_DateCurrent,attr_POOState&f=geojson&outSR=4326';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../apps/web/public/data/fires.json');

function normalize(feature) {
  const props = feature.properties ?? {};
  return {
    type: 'Feature',
    geometry: feature.geometry,
    properties: {
      name: props.poly_IncidentName ?? props.name ?? 'Unnamed fire',
      acres: props.poly_GISAcres ?? props.acres,
      percentContained: props.poly_PercentContained ?? props.percentContained,
      updated: props.poly_DateCurrent ?? props.updated,
      state: props.attr_POOState ?? props.state,
    },
  };
}

async function main() {
  console.log('Fetching NIFC perimeters…');
  const res = await fetch(URL);
  if (!res.ok) {
    throw new Error(`Upstream error ${res.status}`);
  }
  const data = await res.json();
  const collection = {
    type: 'FeatureCollection',
    generatedAt: new Date().toISOString(),
    source: 'NIFC WFIGS Current Perimeters',
    features: (data.features ?? []).map(normalize).filter((f) => f.geometry),
  };

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(collection));
  console.log(`Wrote ${collection.features.length} features → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
