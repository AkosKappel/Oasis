import { createSpaceRepository } from './spaces';
import { afterEach, expect, it, vi } from 'vitest';
import { OasisDatabase } from './schema';
import {
  createWeatherRepository,
  WEATHER_CACHE_MS,
  validateForecast,
} from './weather';
const database = new OasisDatabase('weather-test'),
  repository = createWeatherRepository('default', database);
const city = { label: 'Bratislava', latitude: 48.15, longitude: 17.11 };
const forecast = {
  fetchedAt: 100_000,
  temperature: 10,
  code: 2,
  days: ['2026-11-14', '2026-11-15', '2026-11-16'].map((date) => ({
    date,
    low: 5,
    high: 12,
    code: 2,
  })),
};
afterEach(async () => {
  vi.restoreAllMocks();
  await database.delete();
});
it('starts off, claims one request across tabs and caches successful updates', async () => {
  await database.open();
  expect(await repository.get()).toBeUndefined();
  await repository.configure(city, 'celsius');
  const clock = vi.spyOn(Date, 'now').mockReturnValue(100_000);
  const claims = await Promise.all([
    repository.claimRefresh(),
    repository.claimRefresh(),
  ]);
  expect(claims.filter(Boolean)).toHaveLength(1);
  await repository.finishRefresh(claims.find(Boolean)!, forecast);
  clock.mockReturnValue(200_000);
  expect(await repository.claimRefresh()).toBeUndefined();
  expect(await repository.claimRefresh(true)).toBeUndefined();
  clock.mockReturnValue(100_000 + WEATHER_CACHE_MS);
  expect(await repository.claimRefresh()).toBeDefined();
});
it('keeps cached data on failure, ignores stale city responses and disables future requests', async () => {
  await database.open();
  vi.spyOn(Date, 'now').mockReturnValue(100_000);
  await repository.configure(city, 'celsius');
  const claim = (await repository.claimRefresh())!;
  await repository.finishRefresh(claim, forecast);
  await repository.finishRefresh(claim);
  expect((await repository.get())?.forecast).toEqual(forecast);
  await repository.configure(
    { label: 'Tokyo', latitude: 35.68, longitude: 139.69 },
    'fahrenheit',
  );
  await repository.finishRefresh(claim, forecast);
  expect((await repository.get())?.forecast).toBeUndefined();
  await repository.disable();
  expect(await repository.claimRefresh()).toBeUndefined();
  await expect(
    createWeatherRepository('missing', database).configure(city, 'celsius'),
  ).rejects.toThrow('space');
  await expect(
    repository.configure({ ...city, latitude: 91 }, 'celsius'),
  ).rejects.toThrow('city');
});
it('rejects incomplete, impossible and non-finite forecast values', () => {
  expect(() => validateForecast({ ...forecast, temperature: NaN })).toThrow(
    'unavailable',
  );
  expect(() =>
    validateForecast({
      ...forecast,
      days: [
        { date: '2026-02-30', low: 3, high: 4, code: 0 },
        ...forecast.days.slice(1),
      ],
    }),
  ).toThrow('incomplete');
  expect(() =>
    validateForecast({
      ...forecast,
      days: forecast.days.map((day) => ({ ...day, high: day.low - 1 })),
    }),
  ).toThrow('incomplete');
});

it('retains shared access until weather is disabled in every active space', async () => {
  await database.open();
  const work = await createSpaceRepository(database).save('Work');
  const other = createWeatherRepository(work, database);
  await repository.configure(city, 'celsius');
  await other.configure(city, 'fahrenheit');
  expect(await repository.disable()).toBe(false);
  expect((await other.get())?.enabled).toBe(true);
  expect(await other.disable()).toBe(true);
  await other.configure(city, 'celsius');
  await createSpaceRepository(database).remove(work);
  expect(await repository.disable()).toBe(true);
});
