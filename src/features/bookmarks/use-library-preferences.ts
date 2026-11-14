import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import {
  defaultLibraryPreferences,
  personalLibraryPreferences,
} from '@/database/library-preferences';
export function useLibraryPreferences() {
  const [preferences, setPreferences] = useState(defaultLibraryPreferences);
  const [error, setError] = useState<string>();
  useEffect(() => {
    const sub = liveQuery(() => personalLibraryPreferences.get()).subscribe({
      next: (value) => {
        setPreferences(value);
        setError(undefined);
      },
      error: () =>
        setError(
          'Library preferences could not be loaded. Reload to try again.',
        ),
    });
    return () => sub.unsubscribe();
  }, []);
  return { preferences, error };
}
