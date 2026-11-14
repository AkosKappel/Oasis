import { db, type OasisDatabase } from './schema';
import { requireSpace } from './records';
import type { RecordMetadata } from '@/types/entities';
export interface WeatherLocation {
  label: string;
  latitude: number;
  longitude: number;
}
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export interface WeatherForecast {
  fetchedAt: number;
  temperature: number;
  code: number;
  days: { date: string; low: number; high: number; code: number }[];
}
export interface WeatherSettings extends RecordMetadata {
  spaceId: string;
  enabled: boolean;
  location: WeatherLocation;
  unit: TemperatureUnit;
  forecast?: WeatherForecast;
  lastAttempt?: number;
  leaseUntil?: number;
}
export const WEATHER_CACHE_MS = 60 * 60_000;
export const WEATHER_MANUAL_MS = 15 * 60_000;
export const WEATHER_RETRY_MS = 60_000;
export function validateLocation(input: WeatherLocation): WeatherLocation {
  if (
    !input ||
    typeof input.label !== 'string' ||
    !input.label.trim() ||
    input.label.trim().length > 120 ||
    !Number.isFinite(input.latitude) ||
    Math.abs(input.latitude) > 90 ||
    !Number.isFinite(input.longitude) ||
    Math.abs(input.longitude) > 180
  )
    throw new Error('Choose a valid city.');
  return {
    label: input.label.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
  };
}
export function weatherKey(value: Pick<WeatherSettings, 'location' | 'unit'>) {
  return `${value.location.latitude}:${value.location.longitude}:${value.unit}`;
}
export function validateForecast(input: WeatherForecast): WeatherForecast {
  const temperature = (value: unknown) =>
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= -150 &&
    value <= 170;
  const code = (value: unknown) =>
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 99;
  if (
    !input ||
    !Number.isSafeInteger(input.fetchedAt) ||
    input.fetchedAt < 0 ||
    !temperature(input.temperature) ||
    !code(input.code) ||
    !Array.isArray(input.days) ||
    input.days.length !== 3
  )
    throw new Error('Weather data is unavailable. Try again later.');
  for (const day of input.days)
    if (
      !day ||
      typeof day.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
      !Number.isFinite(Date.parse(day.date)) ||
      new Date(`${day.date}T12:00:00Z`).toISOString().slice(0, 10) !==
        day.date ||
      !temperature(day.low) ||
      !temperature(day.high) ||
      day.low > day.high ||
      !code(day.code)
    )
      throw new Error('The forecast is incomplete. Try again later.');
  if (new Set(input.days.map((day) => day.date)).size !== 3)
    throw new Error('The forecast dates are invalid.');
  return {
    fetchedAt: input.fetchedAt,
    temperature: input.temperature,
    code: input.code,
    days: input.days.map((day) => ({
      date: day.date,
      low: day.low,
      high: day.high,
      code: day.code,
    })),
  };
}
export function createWeatherRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  const id = `${spaceId}:weather`;
  async function current() {
    const existing = await database.weatherSettings.get(id);
    if (
      existing &&
      (existing.spaceId !== spaceId || existing.deletedAt !== undefined)
    )
      throw new Error('Weather settings are unavailable.');
    return existing;
  }
  return {
    async get() {
      return database.transaction(
        'r',
        database.spaces,
        database.weatherSettings,
        async () => {
          await requireSpace(database, spaceId);
          return current();
        },
      );
    },
    async configure(location: WeatherLocation, unit: TemperatureUnit) {
      const value = validateLocation(location);
      if (!['celsius', 'fahrenheit'].includes(unit))
        throw new Error('Choose Celsius or Fahrenheit.');
      await database.transaction(
        'rw',
        database.spaces,
        database.weatherSettings,
        async () => {
          await requireSpace(database, spaceId);
          const existing = await current();
          const now = Date.now();
          const same =
            existing &&
            weatherKey(existing) === weatherKey({ location: value, unit });
          await database.weatherSettings.put({
            id,
            spaceId,
            enabled: true,
            location: value,
            unit,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            ...(same
              ? {
                  forecast: existing.forecast,
                  lastAttempt: existing.lastAttempt,
                }
              : {}),
          });
        },
      );
    },
    async disable() {
      await database.transaction(
        'rw',
        database.spaces,
        database.weatherSettings,
        async () => {
          await requireSpace(database, spaceId);
          const existing = await current();
          if (existing)
            await database.weatherSettings.update(id, {
              enabled: false,
              leaseUntil: undefined,
              updatedAt: Date.now(),
            });
        },
      );
    },
    async claimRefresh(force = false) {
      return database.transaction(
        'rw',
        database.spaces,
        database.weatherSettings,
        async () => {
          await requireSpace(database, spaceId);
          const existing = await current();
          const now = Date.now();
          if (
            !existing?.enabled ||
            (existing.leaseUntil ?? 0) > now ||
            (existing.lastAttempt !== undefined &&
              now - existing.lastAttempt < WEATHER_RETRY_MS) ||
            (existing.forecast &&
              now - existing.forecast.fetchedAt <
                (force ? WEATHER_MANUAL_MS : WEATHER_CACHE_MS))
          )
            return undefined;
          await database.weatherSettings.update(id, {
            lastAttempt: now,
            leaseUntil: now + 15_000,
          });
          return { ...existing, lastAttempt: now };
        },
      );
    },
    async finishRefresh(claim: WeatherSettings, forecast?: WeatherForecast) {
      const value = forecast ? validateForecast(forecast) : undefined;
      await database.transaction(
        'rw',
        database.spaces,
        database.weatherSettings,
        async () => {
          await requireSpace(database, spaceId);
          const existing = await current();
          if (
            !existing?.enabled ||
            weatherKey(existing) !== weatherKey(claim) ||
            existing.lastAttempt !== claim.lastAttempt
          )
            return;
          await database.weatherSettings.update(id, {
            ...(value ? { forecast: value } : {}),
            leaseUntil: undefined,
            updatedAt: Date.now(),
          });
        },
      );
    },
  };
}
export const personalWeather = createWeatherRepository('default');
