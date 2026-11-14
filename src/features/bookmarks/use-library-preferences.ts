import { reportStorageError } from '@/database/storage-health';
import { useStorageHealth } from '@/features/storage/use-storage-health';
import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import {
  defaultLibraryPreferences,
  personalLibraryPreferences,
} from '@/database/library-preferences';
export function useLibraryPreferences() {
  const { retryVersion } = useStorageHealth();
  const [preferences, setPreferences] = useState(defaultLibraryPreferences);
  const [error, setError] = useState<string>();
  useEffect(() => {
    const sub = liveQuery(() => personalLibraryPreferences.get()).subscribe({
      next: (value) => {
        setPreferences(value);
        setError(undefined);
      },
      error: (cause) => {
        reportStorageError(cause, true);
        setError(
          'Library preferences could not be loaded. Use Retry storage to try again.',
        );
      },
    });
    return () => sub.unsubscribe();
  }, [retryVersion]);
  return { preferences, error };
}
