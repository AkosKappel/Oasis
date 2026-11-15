import { useSpaceRepositories } from '@/features/spaces/space-context';
import { useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { Button } from '@/components/ui/button';
import { type WeatherLocation, type TemperatureUnit } from '@/database/weather';
import { reportStorageError } from '@/database/storage-health';
import { searchCities, WEATHER_ORIGINS } from './weather-api';
import { useWeather } from './use-weather';
export function WeatherSettingsPanel() {
  const { personalWeather } = useSpaceRepositories();
  const { settings, error: loadError } = useWeather();
  const [allowed, setAllowed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>(),
    [message, setMessage] = useState('');
  const [query, setQuery] = useState(''),
    [cities, setCities] = useState<WeatherLocation[]>([]),
    [unit, setUnit] = useState<TemperatureUnit>();
  const request = useRef<AbortController>(null);
  useEffect(() => {
    let active = true;
    void browser.permissions
      .contains({ origins: WEATHER_ORIGINS })
      .then((value) => {
        if (active) setAllowed(value);
      })
      .catch(() => {
        if (active) setError('Weather access could not be checked. Try again.');
      });
    return () => {
      active = false;
      request.current?.abort();
    };
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    setMessage('');
    try {
      await action();
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Weather settings could not be saved. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  const selectedUnit = unit ?? settings?.unit ?? 'celsius';
  return (
    <section
      aria-labelledby="weather-settings-title"
      className="mt-7 border-t border-border pt-5"
    >
      <h3 id="weather-settings-title" className="font-semibold">
        Weather
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Optional current conditions and a three-day forecast from{' '}
        <a
          className="underline"
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
        >
          Open-Meteo
        </a>
        . Searching sends the city name; updates send the chosen coordinates and
        your IP address. No device location is requested.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        The free service is for personal/non-commercial use.{' '}
        <a
          className="underline"
          href="https://open-meteo.com/en/terms"
          target="_blank"
          rel="noreferrer"
        >
          Provider terms
        </a>
        . City data:{' '}
        <a
          className="underline"
          href="https://www.geonames.org/"
          target="_blank"
          rel="noreferrer"
        >
          GeoNames
        </a>
        .
      </p>
      {settings?.enabled && (
        <p className="mt-3 text-sm">Shown on Home: {settings.location.label}</p>
      )}
      {!allowed ? (
        <Button
          className="mt-4"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const granted = await browser.permissions.request({
                origins: WEATHER_ORIGINS,
              });
              setAllowed(granted);
              if (!granted)
                throw new Error(
                  'Weather stays off. Allow access to search for a city.',
                );
            })
          }
        >
          Allow weather access
        </Button>
      ) : (
        <>
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                request.current?.abort();
                request.current = new AbortController();
                const results = await searchCities(
                  query,
                  request.current.signal,
                );
                setCities(results);
                if (!results.length)
                  setMessage(
                    'No matching cities. Try a nearby city or add a country.',
                  );
              });
            }}
          >
            <label className="field">
              Weather city
              <input
                type="search"
                minLength={2}
                maxLength={80}
                required
                value={query}
                disabled={busy}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="City or city, country"
              />
            </label>
            <label className="field">
              Temperature units
              <select
                value={selectedUnit}
                disabled={busy}
                onChange={(event) =>
                  setUnit(event.target.value as TemperatureUnit)
                }
              >
                <option value="celsius">Celsius (°C)</option>
                <option value="fahrenheit">Fahrenheit (°F)</option>
              </select>
            </label>
            <Button disabled={busy}>Find city</Button>
          </form>
          <ul className="mt-3 flex flex-col gap-2">
            {cities.map((city) => (
              <li key={`${city.latitude}:${city.longitude}`}>
                <Button
                  className="h-auto min-h-10 w-full whitespace-normal text-left"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await personalWeather.configure(city, selectedUnit);
                      setCities([]);
                      setMessage('Weather is enabled for this city.');
                    })
                  }
                >
                  Use {city.label}
                </Button>
              </li>
            ))}
          </ul>
          {settings && (
            <Button
              className="mt-3"
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await personalWeather.configure(
                    settings.location,
                    selectedUnit,
                  );
                  setMessage('Saved city and units applied.');
                })
              }
            >
              Use saved city and units
            </Button>
          )}
        </>
      )}
      {(allowed || settings?.enabled) && (
        <Button
          className="mt-3"
          variant="outline"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await personalWeather.disable();
              await browser.permissions.remove({ origins: WEATHER_ORIGINS });
              setAllowed(false);
              setCities([]);
              setMessage('Weather is off and network access was removed.');
            })
          }
        >
          Turn weather off
        </Button>
      )}
      {(error || loadError) && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error || loadError}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
