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

  const res = await fetch(`${AIRNOW_PM25_MONITORS_QUERY}?${params.toString()}`, {
    cache: 'no-store',
  });
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

/* -------------------------------------------------------------------------- */
/* NOAA / NWS point forecast (api.weather.gov)                                */
/* -------------------------------------------------------------------------- */

export type NoaaForecastPeriod = {
  name: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  detailedForecast: string;
  isDaytime: boolean;
};

export type NoaaPointWeather = {
  place: string;
  latitude: number;
  longitude: number;
  forecastOffice?: string;
  periods: NoaaForecastPeriod[];
};

const NWS_HEADERS = {
  Accept: 'application/geo+json',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function fetchNoaaPointWeather(
  latitude: number,
  longitude: number,
): Promise<NoaaPointWeather> {
  const lat = Number(latitude.toFixed(4));
  const lon = Number(longitude.toFixed(4));
  const pointsRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
    headers: NWS_HEADERS,
    cache: 'no-store',
  });
  if (!pointsRes.ok) {
    throw new Error(`NWS points failed (${pointsRes.status})`);
  }

  const points = (await pointsRes.json()) as {
    properties?: {
      forecast?: string;
      cwa?: string;
      relativeLocation?: {
        properties?: { city?: string; state?: string };
      };
    };
  };

  const forecastUrl = points.properties?.forecast;
  if (!forecastUrl) {
    throw new Error('No NWS forecast for this location');
  }

  const place = [
    points.properties?.relativeLocation?.properties?.city,
    points.properties?.relativeLocation?.properties?.state,
  ]
    .filter(Boolean)
    .join(', ');

  const forecastRes = await fetch(forecastUrl, {
    headers: NWS_HEADERS,
    cache: 'no-store',
  });
  if (!forecastRes.ok) {
    throw new Error(`NWS forecast failed (${forecastRes.status})`);
  }

  const forecast = (await forecastRes.json()) as {
    properties?: {
      periods?: Array<Record<string, unknown>>;
    };
  };

  const periods = (forecast.properties?.periods ?? []).slice(0, 3).map((p) => ({
    name: String(p.name ?? ''),
    temperature: Number(p.temperature ?? NaN),
    temperatureUnit: String(p.temperatureUnit ?? 'F'),
    windSpeed: String(p.windSpeed ?? ''),
    windDirection: String(p.windDirection ?? ''),
    shortForecast: String(p.shortForecast ?? ''),
    detailedForecast: String(p.detailedForecast ?? ''),
    isDaytime: Boolean(p.isDaytime),
  }));

  return {
    place: place || `${lat}, ${lon}`,
    latitude: lat,
    longitude: lon,
    forecastOffice: points.properties?.cwa,
    periods,
  };
}

export function formatNoaaWeatherPopupHtml(wx: NoaaPointWeather): string {
  const current = wx.periods[0];
  const next = wx.periods[1];
  const rows = [
    `<div class="ofwx-wx-popup">`,
    `<strong class="ofwx-wx-popup__place">${escapeHtml(wx.place)}</strong>`,
    `<p class="ofwx-wx-popup__meta">NOAA / NWS${
      wx.forecastOffice ? ` · ${escapeHtml(wx.forecastOffice)}` : ''
    }</p>`,
  ];

  if (current) {
    rows.push(
      `<div class="ofwx-wx-popup__period">`,
      `<div class="ofwx-wx-popup__name">${escapeHtml(current.name)}</div>`,
      `<div class="ofwx-wx-popup__temp">${current.temperature}°${escapeHtml(
        current.temperatureUnit,
      )}</div>`,
      `<div>${escapeHtml(current.shortForecast)}</div>`,
      `<div class="ofwx-wx-popup__wind">Wind ${escapeHtml(current.windDirection)} ${escapeHtml(
        current.windSpeed,
      )}</div>`,
      current.detailedForecast
        ? `<p class="ofwx-wx-popup__detail">${escapeHtml(current.detailedForecast)}</p>`
        : '',
      `</div>`,
    );
  }

  if (next) {
    rows.push(
      `<div class="ofwx-wx-popup__next"><span>${escapeHtml(next.name)}</span> · ${
        next.temperature
      }°${escapeHtml(next.temperatureUnit)} · ${escapeHtml(next.shortForecast)}</div>`,
    );
  }

  rows.push(`</div>`);
  return rows.join('');
}
