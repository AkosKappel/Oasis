import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { browser } from 'wxt/browser';
import {
  parsePicture,
  parseQuote,
  PICTURE_FEED,
  QUOTE_FEED,
  QUOTE_ORIGIN,
  type ContentProviders,
} from '@/database/content-providers';
import { reportStorageError } from '@/database/storage-health';
import { useSpaceRepositories } from '@/features/spaces/space-context';

async function getJson(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Provider answered ${response.status}.`);
  return response.json() as Promise<unknown>;
}

/** Today's provider items for Home. Fetches at most once per source and day. */
export function useContentProviders(day: string) {
  const { contentProviders } = useSpaceRepositories();
  const [settings, setSettings] = useState<ContentProviders>();
  useEffect(() => {
    const subscription = liveQuery(() => contentProviders.get()).subscribe({
      next: setSettings,
      error: (cause) => reportStorageError(cause, true),
    });
    return () => subscription.unsubscribe();
  }, [contentProviders]);
  const wantPicture = !!settings?.picture && settings.dailyPicture?.day !== day;
  const wantQuote = !!settings?.quote && settings.dailyQuote?.day !== day;
  useEffect(() => {
    if (!wantPicture) return;
    void (async () => {
      if (!(await contentProviders.claim('picture', day))) return;
      const [year, month, date] = day.split('-');
      const feed = await getJson(`${PICTURE_FEED}/${year}/${month}/${date}`, {
        'Api-User-Agent': 'Oasis browser extension',
      });
      await contentProviders.storePicture(parsePicture(feed, day));
    })().catch(() => {
      // Offline or unavailable: Home keeps the album background and retries after the claim window.
    });
  }, [wantPicture, day, contentProviders]);
  useEffect(() => {
    if (!wantQuote) return;
    void (async () => {
      if (!(await browser.permissions.contains({ origins: [QUOTE_ORIGIN] })))
        return;
      if (!(await contentProviders.claim('quote', day))) return;
      await contentProviders.storeQuote(
        parseQuote(await getJson(QUOTE_FEED), day),
      );
    })().catch(() => {
      // Offline or unavailable: Home keeps the local quote collection.
    });
  }, [wantQuote, day, contentProviders]);
  return {
    settings,
    picture:
      settings?.picture && settings.dailyPicture?.day === day
        ? settings.dailyPicture
        : undefined,
    quote:
      settings?.quote && settings.dailyQuote?.day === day
        ? settings.dailyQuote
        : undefined,
  };
}
