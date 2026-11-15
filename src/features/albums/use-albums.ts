import { useSpaceRepositories } from '@/features/spaces/space-context';
import { reportStorageError } from '@/database/storage-health';
import { useStorageHealth } from '@/features/storage/use-storage-health';
import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
export function useAlbums() {
  const { personalAlbums } = useSpaceRepositories();
  const { retryVersion } = useStorageHealth();
  const [data, setData] =
    useState<Awaited<ReturnType<typeof personalAlbums.list>>>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const sub = liveQuery(() => personalAlbums.list()).subscribe({
      next: (value) => {
        setData(value);
        setError(undefined);
      },
      error: (cause) => {
        reportStorageError(cause, true);
        setError('Images could not be loaded. Use Retry storage to try again.');
      },
    });
    return () => sub.unsubscribe();
  }, [retryVersion, personalAlbums]);
  return { data, error };
}
