import { useSpaceRepositories } from '@/features/spaces/space-context';
import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { type WeatherSettings } from '@/database/weather';
import { reportStorageError } from '@/database/storage-health';
import { useStorageHealth } from '@/features/storage/use-storage-health';
export function useWeather() {
  const { personalWeather } = useSpaceRepositories();
  const { retryVersion } = useStorageHealth();
  const [settings, setSettings] = useState<WeatherSettings>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const sub = liveQuery(() => personalWeather.get()).subscribe({
      next: (value) => {
        setSettings(value);
        setError(undefined);
      },
      error: (cause) => {
        reportStorageError(cause, true);
        setError('Weather settings could not be loaded. Use Retry storage.');
      },
    });
    return () => sub.unsubscribe();
  }, [retryVersion, personalWeather]);
  return { settings, error };
}
