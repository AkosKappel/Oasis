import { useSpace } from '@/features/spaces/space-context';
import { reportStorageError } from '@/database/storage-health';
import { useStorageHealth } from '@/features/storage/use-storage-health';
import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { getPersonalLibrary } from '@/database/library';

export function useLibrary() {
  const { spaceId } = useSpace();
  const { retryVersion } = useStorageHealth();
  const [library, setLibrary] =
    useState<Awaited<ReturnType<typeof getPersonalLibrary>>>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const subscription = liveQuery(() => getPersonalLibrary(spaceId)).subscribe(
      {
        next: (items) => {
          setLibrary(items);
          setError(undefined);
        },
        error: (cause) => {
          reportStorageError(cause, true);
          setError(
            'Your library could not be loaded. Use Retry storage to try again.',
          );
        },
      },
    );
    return () => subscription.unsubscribe();
  }, [retryVersion, spaceId]);
  return { library, error };
}
