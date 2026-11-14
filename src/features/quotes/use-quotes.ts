import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { personalQuotes } from '@/database/quotes';
export function useQuotes() {
  const [data, setData] =
    useState<Awaited<ReturnType<typeof personalQuotes.list>>>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const sub = liveQuery(() => personalQuotes.list()).subscribe({
      next: (value) => {
        setData(value);
        setError(undefined);
      },
      error: () => setError('Quotes could not be loaded. Reload to try again.'),
    });
    return () => sub.unsubscribe();
  }, []);
  return { data, error };
}
