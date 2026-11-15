import { useSpaceRepositories } from '@/features/spaces/space-context';
import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { type HomeWidget } from '@/database/home-widgets';
import { reportStorageError } from '@/database/storage-health';
import { useStorageHealth } from '@/features/storage/use-storage-health';
export function useHomeWidgets() {
  const { personalHomeWidgets } = useSpaceRepositories();
  const { retryVersion } = useStorageHealth();
  const [widgets, setWidgets] = useState<HomeWidget[]>([]);
  const [error, setError] = useState<string>();
  useEffect(() => {
    const sub = liveQuery(() => personalHomeWidgets.list()).subscribe({
      next: (value) => {
        setWidgets(value);
        setError(undefined);
      },
      error: (cause) => {
        reportStorageError(cause, true);
        setError('Widgets could not be loaded. Use Retry storage.');
      },
    });
    return () => sub.unsubscribe();
  }, [retryVersion, personalHomeWidgets]);
  return { widgets, error };
}
