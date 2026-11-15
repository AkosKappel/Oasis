import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import { useStorageHealth } from '@/features/storage/use-storage-health';
import { reportStorageError } from '@/database/storage-health';
import type { ContentFeedback } from '@/database/content-feedback';
export function useContentFeedback() {
  const { contentFeedback } = useSpaceRepositories();
  const { retryVersion } = useStorageHealth();
  const [feedback, setFeedback] = useState<ContentFeedback[]>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const sub = liveQuery(() => contentFeedback.list()).subscribe({
      next: (value) => {
        setFeedback(value);
        setError(undefined);
      },
      error: (cause) => {
        reportStorageError(cause, true);
        setError('Content preferences could not be loaded. Use Retry storage.');
      },
    });
    return () => sub.unsubscribe();
  }, [contentFeedback, retryVersion]);
  return { feedback, error };
}
