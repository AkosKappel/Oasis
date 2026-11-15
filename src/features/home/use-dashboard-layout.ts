import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import { useStorageHealth } from '@/features/storage/use-storage-health';
import { reportStorageError } from '@/database/storage-health';
import type { DashboardLayout } from '@/database/dashboard-layout';
export function useDashboardLayout() {
  const { dashboardLayout } = useSpaceRepositories();
  const { retryVersion } = useStorageHealth();
  const [layout, setLayout] = useState<DashboardLayout>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const subscription = liveQuery(() => dashboardLayout.get()).subscribe({
      next: (value) => {
        setLayout(value);
        setError(undefined);
      },
      error: (cause) => {
        reportStorageError(cause, true);
        setError('Home layout could not be loaded. Use Retry storage.');
      },
    });
    return () => subscription.unsubscribe();
  }, [dashboardLayout, retryVersion]);
  return { layout, error };
}
