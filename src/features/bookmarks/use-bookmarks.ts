import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { personalBookmarks } from '@/database/bookmarks';
import type { Bookmark } from '@/types/entities';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const subscription = liveQuery(() => personalBookmarks.list()).subscribe({
      next: (items) => {
        setBookmarks(items);
        setError(undefined);
      },
      error: () =>
        setError(
          'Your library could not be loaded. Reload the page to try again.',
        ),
    });
    return () => subscription.unsubscribe();
  }, []);
  return { bookmarks, error };
}
