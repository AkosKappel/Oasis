import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { personalWeather, type WeatherSettings } from '@/database/weather';
import { reportStorageError } from '@/database/storage-health';
import { useStorageHealth } from '@/features/storage/use-storage-health';
export function useWeather() {
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
  }, [retryVersion]);
  return { settings, error };
}
