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
