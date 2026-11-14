import { expect, it, vi } from 'vitest';
import {
  parseCities,
  parseForecast,
  weatherJson,
  weatherDescription,
} from './weather-api';
export const sampleForecast = {
  current: { temperature_2m: 12, weather_code: 2 },
  current_units: { temperature_2m: '°C' },
  daily_units: { temperature_2m_max: '°C', temperature_2m_min: '°C' },
  daily: {
    time: ['2026-11-14', '2026-11-15', '2026-11-16'],
    temperature_2m_min: [5, 6, 7],
    temperature_2m_max: [12, 13, 14],
    weather_code: [2, 61, 0],
  },
};
it('validates city coordinates and forecast units before display', () => {
  expect(parseCities({})).toEqual([]);
  expect(
    parseCities({
      results: [
        {
          name: 'Bratislava',
          country: 'Slovakia',
          latitude: 48.15,
          longitude: 17.11,
        },
      ],
    }),
  ).toEqual([
    { label: 'Bratislava, Slovakia', latitude: 48.15, longitude: 17.11 },
  ]);
  expect(() =>
    parseCities({
      results: [{ name: 'Bad', latitude: Infinity, longitude: 0 }],
    }),
  ).toThrow('city');
  expect(parseForecast(sampleForecast, 'celsius', 1000)).toMatchObject({
    fetchedAt: 1000,
    temperature: 12,
    days: [{ low: 5 }, { low: 6 }, { low: 7 }],
  });
  expect(() => parseForecast(sampleForecast, 'fahrenheit')).toThrow('units');
  expect(weatherDescription(61)).toBe('Rain');
  expect(weatherDescription(97)).toBe('Thunderstorm');
});
it('bounds streamed responses, rejects HTTP errors and omits credentials', async () => {
  const mock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(sampleForecast)));
  await weatherJson('https://api.open-meteo.com/v1/forecast', undefined, mock);
  expect(mock.mock.calls[0]?.[1]).toMatchObject({
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
  });
  mock.mockResolvedValue(new Response('bad', { status: 500 }));
  await expect(
    weatherJson('https://api.open-meteo.com', undefined, mock),
  ).rejects.toThrow('reached');
  mock.mockResolvedValue(new Response('x'.repeat(64_001)));
  await expect(
    weatherJson('https://api.open-meteo.com', undefined, mock),
  ).rejects.toThrow('too much');
  mock.mockResolvedValue(new Response('not json'));
  await expect(
    weatherJson('https://api.open-meteo.com', undefined, mock),
  ).rejects.toThrow('invalid');
});
