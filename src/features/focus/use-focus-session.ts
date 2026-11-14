import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import {
  personalFocusSession,
  type FocusSession,
} from '@/database/focus-session';
import { reportStorageError } from '@/database/storage-health';
import { useStorageHealth } from '@/features/storage/use-storage-health';
export function useFocusSession() {
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
  }, [retryVersion]);
  return { session, error };
}
