/** OpenWeatherMap-style tile template helpers for weather overlays. */

export type WeatherOverlayId = 'precipitation' | 'wind' | 'temp';

export const OPEN_METEO_PRECIP_TILE =
  'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png';

/**
 * Public rainfall radar-style tiles via RainViewer (no API key).
 * See https://www.rainviewer.com/api.html
 */
export async function fetchRainViewerTileUrl(): Promise<string | null> {
  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!res.ok) return null;
    const data = (await res.json()) as {
      host: string;
      radar?: { past?: Array<{ path: string }> };
    };
    const frames = data.radar?.past ?? [];
    const latest = frames[frames.length - 1];
    if (!latest) return null;
    return `${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
  } catch {
    return null;
  }
}

export function weatherToneColor(): string {
  return '#3a86ff';
}

/** NOAA NDGD surface smoke concentration (HRRR-based guidance). */
export const NOAA_SMOKE_IMAGE_SERVER =
  'https://mapservices.weather.noaa.gov/raster/rest/services/air_quality/ndgd_smoke_sfc_1hr_avg_time/ImageServer';

export async function fetchSmokeLayerTime(): Promise<number | null> {
  try {
    const res = await fetch(`${NOAA_SMOKE_IMAGE_SERVER}?f=json`);
    if (!res.ok) return null;
    const data = (await res.json()) as { timeInfo?: { timeExtent?: number[] } };
    const extent = data.timeInfo?.timeExtent;
    if (!extent?.length) return null;
    // Prefer "now" clamped into the forecast window; else first slice.
    const now = Date.now();
    const start = extent[0];
    const end = extent[extent.length - 1] ?? start;
    if (now >= start && now <= end) return now;
    return start;
  } catch {
    return null;
  }
}

export function smokeExportImageUrl(options: {
  west: number;
  south: number;
  east: number;
  north: number;
  width: number;
  height: number;
  time?: number | null;
}): string {
  const params = new URLSearchParams({
    bbox: `${options.west},${options.south},${options.east},${options.north}`,
    bboxSR: '4326',
    imageSR: '3857',
    size: `${options.width},${options.height}`,
    format: 'png32',
    transparent: 'true',
    f: 'image',
    interpolation: 'RSP_BilinearInterpolation',
  });
  if (options.time != null) {
    params.set('time', String(options.time));
  }
  return `${NOAA_SMOKE_IMAGE_SERVER}/exportImage?${params.toString()}`;
}

/** AirNow current PM2.5 monitors (EPA / ArcGIS). */
export const AIRNOW_PM25_MONITORS_QUERY =
  'https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/Air_Now_Current_Monitors_PM25/FeatureServer/0/query';

export type AqiFeatureProperties = {
  siteName?: string;
  aqi?: number;
  pm25?: number;
  label?: string;
  source?: string;
  area?: string;
};

export type AqiCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: AqiFeatureProperties;
  }>;
  generatedAt?: string;
  source?: string;
};

export function aqiColor(aqi?: number): string {
  if (aqi == null || Number.isNaN(aqi)) return '#a8adb4';
  if (aqi <= 50) return '#2d6a4f';
  if (aqi <= 100) return '#e9c46a';
  if (aqi <= 150) return '#e85d04';
  if (aqi <= 200) return '#c1121f';
  if (aqi <= 300) return '#6a4c93';
  return '#7e0023';
}

export function aqiCategory(aqi?: number): string {
  if (aqi == null || Number.isNaN(aqi)) return 'Unknown';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for sensitive groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very unhealthy';
  return 'Hazardous';
}

export async function fetchAirNowPm25(options?: {
  west?: number;
  south?: number;
  east?: number;
  north?: number;
}): Promise<AqiCollection> {
  const west = options?.west ?? -125;
  const south = options?.south ?? 24;
  const east = options?.east ?? -66;
  const north = options?.north ?? 50;

  const params = new URLSearchParams({
    where: '1=1',
    geometry: `${west},${south},${east},${north}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'SiteName,PM25,PM25_AQI,PM25_AQI_LABEL,DataSource,ReportingArea_PipeDelimited',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: '2000',
  });

  const res = await fetch(`${AIRNOW_PM25_MONITORS_QUERY}?${params.toString()}`);
  if (!res.ok) throw new Error(`AirNow fetch failed (${res.status})`);
  const data = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: Record<string, unknown>;
    }>;
    error?: unknown;
  };
  if (data.error) throw new Error('AirNow query error');

  const features = (data.features ?? [])
    .map((raw) => {
      const coords = raw.geometry?.coordinates;
      if (!coords) return null;
      const props = raw.properties ?? {};
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: coords },
        properties: {
          siteName: String(props.SiteName ?? 'Monitor'),
          aqi: Number(props.PM25_AQI ?? NaN) || undefined,
          pm25: Number(props.PM25 ?? NaN) || undefined,
          label: props.PM25_AQI_LABEL != null ? String(props.PM25_AQI_LABEL) : undefined,
          source: props.DataSource != null ? String(props.DataSource) : undefined,
          area:
            props.ReportingArea_PipeDelimited != null
              ? String(props.ReportingArea_PipeDelimited)
              : undefined,
        },
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  return {
    type: 'FeatureCollection',
    features,
    generatedAt: new Date().toISOString(),
    source: 'AirNow PM2.5 monitors',
  };
}
