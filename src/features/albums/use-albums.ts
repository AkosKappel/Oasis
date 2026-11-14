import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { personalAlbums } from '@/database/albums';
export function useAlbums() {
  const [data, setData] =
    useState<Awaited<ReturnType<typeof personalAlbums.list>>>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const sub = liveQuery(() => personalAlbums.list()).subscribe({
      next: (value) => {
        setData(value);
        setError(undefined);
      },
      error: () => setError('Images could not be loaded. Reload to try again.'),
    });
    return () => sub.unsubscribe();
  }, []);
  return { data, error };
}
