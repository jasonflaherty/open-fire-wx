/** Shared geo helpers for community layers (WGS84). */

const EARTH_KM = 6371;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Ray-cast for Polygon / MultiPolygon GeoJSON rings (lon/lat order). */
export function pointInPolygon(
  lng: number,
  lat: number,
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  },
): boolean {
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as number[][][];
    const outer = rings[0];
    if (!outer || !pointInRing(lng, lat, outer)) return false;
    for (let i = 1; i < rings.length; i++) {
      if (pointInRing(lng, lat, rings[i]!)) return false;
    }
    return true;
  }
  if (geometry.type === 'MultiPolygon') {
    const polys = geometry.coordinates as number[][][][];
    return polys.some((poly) =>
      pointInPolygon(lng, lat, { type: 'Polygon', coordinates: poly }),
    );
  }
  return false;
}

/** Approximate centroid from polygon exterior ring (for nearest-zone fallback). */
export function polygonCentroid(geometry: {
  type: string;
  coordinates: number[][][] | number[][][][];
}): { lat: number; lng: number } | null {
  let ring: number[][] | undefined;
  if (geometry.type === 'Polygon') {
    ring = (geometry.coordinates as number[][][])[0];
  } else if (geometry.type === 'MultiPolygon') {
    ring = (geometry.coordinates as number[][][][])[0]?.[0];
  }
  if (!ring || ring.length === 0) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const pt of ring) {
    if (pt[0] == null || pt[1] == null) continue;
    sx += pt[0];
    sy += pt[1];
    n += 1;
  }
  if (!n) return null;
  return { lng: sx / n, lat: sy / n };
}
