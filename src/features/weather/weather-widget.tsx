import { useSpaceRepositories } from '@/features/spaces/space-context';
import { useEffect, useState } from 'react';
import {
  WEATHER_CACHE_MS,
  WEATHER_MANUAL_MS,
  WEATHER_RETRY_MS,
  weatherKey,
} from '@/database/weather';
import { reportStorageError } from '@/database/storage-health';
import { useWeather } from './use-weather';
import { refreshWeather } from './weather-service';
import { weatherDescription } from './weather-api';
export function WeatherWidget({ now }: { now: Date }) {
  const { personalWeather } = useSpaceRepositories();
  const { settings, error: loadError } = useWeather();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>(),
    [message, setMessage] = useState('');
  const key = settings ? weatherKey(settings) : undefined,
    enabled = settings?.enabled;
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void refreshWeather(false, personalWeather)
      .then(() => {
        if (active) setError(undefined);
      })
      .catch((cause: unknown) => {
        reportStorageError(cause);
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Weather is unavailable. Try again later.',
          );
      });
    return () => {
      active = false;
    };
  }, [key, enabled, personalWeather]);
  if (!settings?.enabled)
    return loadError ? (
      <p role="alert" className="mt-4 text-sm">
        {loadError}
      </p>
    ) : null;
  const forecast = settings.forecast,
    age = forecast ? now.getTime() - forecast.fetchedAt : Infinity;
  const freshEnough = forecast && age < 48 * WEATHER_CACHE_MS,
    symbol = settings.unit === 'celsius' ? '°C' : '°F';
  const cooling =
    (settings.lastAttempt !== undefined &&
      now.getTime() - settings.lastAttempt < WEATHER_RETRY_MS) ||
    (forecast && age < WEATHER_MANUAL_MS);
  return (
    <section
      aria-label="Weather"
      className="mt-7 w-full max-w-sm rounded-lg border border-current/20 bg-surface/20 p-4 text-sm"
    >
      <h2 className="break-words text-xs text-muted-foreground">
        {settings.location.label}
      </h2>
      {freshEnough ? (
        <>
          <p className="mt-2 text-2xl">
            {Math.round(forecast.temperature)}
            {symbol}{' '}
            <span className="text-sm">{weatherDescription(forecast.code)}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Modelled conditions
          </p>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {forecast.days.map((day) => (
              <li key={day.date}>
                <p className="text-xs">
                  {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                    undefined,
                    { weekday: 'short' },
                  )}
                </p>
                <p className="mt-1 text-sm">
                  {Math.round(day.high)}° / {Math.round(day.low)}°
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {weatherDescription(day.code)}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3">
          {forecast
            ? 'This forecast has expired. Refresh when online.'
            : 'No forecast saved yet. Refresh when online.'}
        </p>
      )}
      {forecast && (
        <p className="mt-3 text-xs text-muted-foreground">
          {age >= WEATHER_CACHE_MS ? 'Saved forecast · ' : ''}Updated{' '}
          {new Date(forecast.fetchedAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Weather by Open-Meteo
        </a>
        <button
          type="button"
          className="rounded px-2 py-1 underline disabled:opacity-60"
          disabled={busy || !!cooling}
          onClick={() => {
            setBusy(true);
            setError(undefined);
            setMessage('');
            void refreshWeather(true, personalWeather)
              .then((updated) =>
                setMessage(
                  updated
                    ? 'Weather updated.'
                    : 'Recently checked. Try again later.',
                ),
              )
              .catch((cause: unknown) => {
                reportStorageError(cause);
                setError(
                  cause instanceof Error
                    ? cause.message
                    : 'Weather is unavailable.',
                );
              })
              .finally(() => setBusy(false));
          }}
        >
          {' '}
          {busy ? 'Refreshing…' : 'Refresh weather'}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Refresh is available every 15 minutes after a successful update.
      </p>
      {error && (
        <p role="status" className="mt-2 text-xs">
          {error} {forecast ? 'Your saved forecast is kept.' : ''}
        </p>
      )}
      {message && (
        <p role="status" className="mt-2 text-xs">
          {message}
        </p>
      )}
    </section>
  );
}
