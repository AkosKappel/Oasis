import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { getPersonalLibrary } from '@/database/library';

export function useLibrary() {
  const [library, setLibrary] =
    useState<Awaited<ReturnType<typeof getPersonalLibrary>>>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const subscription = liveQuery(getPersonalLibrary).subscribe({
      next: (items) => {
        setLibrary(items);
        setError(undefined);
      },
      error: () =>
        setError(
          'Your library could not be loaded. Reload the page to try again.',
        ),
    });
    return () => subscription.unsubscribe();
  }, []);
  return { library, error };
}
