import {
  validateForecast,
  validateLocation,
  type WeatherLocation,
  type TemperatureUnit,
  type WeatherForecast,
} from '@/database/weather';
export const WEATHER_ORIGINS = [
  'https://api.open-meteo.com/*',
  'https://geocoding-api.open-meteo.com/*',
];
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Weather returned an invalid response.');
  return value as Record<string, unknown>;
}
export async function weatherJson(
  url: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  const response = await fetcher(url, {
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
      : AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error('Weather could not be reached. Try again later.');
  if (Number(response.headers.get('content-length')) > 64_000)
    throw new Error('Weather returned too much data.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Weather returned no data.');
  const decoder = new TextDecoder();
  let text = '',
    length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > 64_000) {
        await reader.cancel();
        throw new Error('Weather returned too much data.');
      }
      text += decoder.decode(part.value, { stream: true });
    }
    text += decoder.decode();
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error('Weather returned an invalid response.');
    }
  } finally {
    reader.releaseLock();
  }
}
export function parseCities(value: unknown): WeatherLocation[] {
  const data = object(value);
  if (data.results === undefined) return [];
  if (!Array.isArray(data.results) || data.results.length > 5)
    throw new Error('City search returned an invalid response.');
  return data.results.map((item: unknown) => {
    const city = object(item);
    if (typeof city.name !== 'string')
      throw new Error('City search returned an invalid city.');
    const label = [city.name, city.admin1, city.country]
      .filter((part): part is string => typeof part === 'string' && !!part)
      .join(', ');
    return validateLocation({
      label,
      latitude: city.latitude as number,
      longitude: city.longitude as number,
    });
  });
}
export async function searchCities(query: string, signal?: AbortSignal) {
  if (query.trim().length < 2 || query.length > 80)
    throw new Error('Enter a city name between 2 and 80 characters.');
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({
    name: query.trim(),
    count: '5',
    language: 'en',
    format: 'json',
  }).toString();
  return parseCities(await weatherJson(url.href, signal));
}
export function parseForecast(
  value: unknown,
  unit: TemperatureUnit,
  now = Date.now(),
): WeatherForecast {
  const data = object(value),
    current = object(data.current),
    daily = object(data.daily),
    currentUnits = object(data.current_units),
    dailyUnits = object(data.daily_units);
  const symbol = unit === 'celsius' ? '°C' : '°F';
  if (
    currentUnits.temperature_2m !== symbol ||
    dailyUnits.temperature_2m_max !== symbol ||
    dailyUnits.temperature_2m_min !== symbol
  )
    throw new Error('Weather returned unexpected temperature units.');
  const dates = daily.time,
    low = daily.temperature_2m_min,
    high = daily.temperature_2m_max,
    codes = daily.weather_code;
  if (
    !Array.isArray(dates) ||
    !Array.isArray(low) ||
    !Array.isArray(high) ||
    !Array.isArray(codes) ||
    [dates, low, high, codes].some((items) => items.length !== 3)
  )
    throw new Error('The forecast is incomplete. Try again later.');
  return validateForecast({
    fetchedAt: now,
    temperature: current.temperature_2m as number,
    code: current.weather_code as number,
    days: dates.map((date, index) => ({
      date: date as string,
      low: low[index] as number,
      high: high[index] as number,
      code: codes[index] as number,
    })),
  });
}
export async function fetchForecast(
  location: WeatherLocation,
  unit: TemperatureUnit,
) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code',
    timezone: 'auto',
    forecast_days: '3',
    temperature_unit: unit,
  }).toString();
  return parseForecast(await weatherJson(url.href), unit);
}
export function weatherDescription(code: number) {
  if (code === 0) return 'Clear sky';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Conditions unavailable';
}
