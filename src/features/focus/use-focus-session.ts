import { useSpaceRepositories } from '@/features/spaces/space-context';
import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { type FocusSession } from '@/database/focus-session';
import { reportStorageError } from '@/database/storage-health';
import { useStorageHealth } from '@/features/storage/use-storage-health';
export function useFocusSession() {
  const { personalFocusSession } = useSpaceRepositories();
  const { retryVersion } = useStorageHealth();
  const [session, setSession] = useState<FocusSession>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const sub = liveQuery(() => personalFocusSession.get()).subscribe({
      next: (value) => {
        setSession(value);
        setError(undefined);
      },
      error: (cause) => {
        reportStorageError(cause, true);
        setError('Focus mode could not be loaded. Use Retry storage.');
      },
    });
    return () => sub.unsubscribe();
  }, [retryVersion, personalFocusSession]);
  return { session, error };
}
