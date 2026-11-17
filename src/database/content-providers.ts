import { db, type OasisDatabase } from './schema';
import { requireSpace } from './records';
import type { RecordMetadata } from '@/types/entities';

export type ProviderKind = 'picture' | 'quote';

export interface DailyPicture {
  day: string;
  title: string;
  url: string;
  artist: string;
  license: string;
  licenseUrl?: string;
  filePage: string;
}

export interface DailyQuote {
  day: string;
  text: string;
  author: string;
}

export interface ContentProviders extends RecordMetadata {
  spaceId: string;
  picture: boolean;
  quote: boolean;
  dailyPicture?: DailyPicture;
  dailyQuote?: DailyQuote;
  claims?: Partial<Record<ProviderKind, number>>;
}

export const PICTURE_FEED =
  'https://en.wikipedia.org/api/rest_v1/feed/featured';
export const QUOTE_FEED = 'https://zenquotes.io/api/today';
export const QUOTE_ORIGIN = 'https://zenquotes.io/*';
// Another tab that claimed a fetch within this window is trusted to finish it.
const CLAIM_WINDOW = 60_000;
const WIKIMEDIA_HOSTS = ['upload.wikimedia.org', 'thumb.wikimedia.org'];

function plain(value: unknown, max: number) {
  if (typeof value !== 'string') return '';
  const text = value
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, max);
}

function wikimediaUrl(value: unknown) {
  if (typeof value !== 'string') return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && WIKIMEDIA_HOSTS.includes(url.hostname))
      return url.href;
  } catch {
    return;
  }
}

/** Picks a background-sized image from the Wikipedia featured feed. */
export function parsePicture(input: unknown, day: string): DailyPicture {
  const image = (input as { image?: Record<string, unknown> } | null)?.image;
  const original = image?.image as { source?: string; width?: number };
  const thumbnail = image?.thumbnail as { source?: string };
  const license = image?.license as { type?: string; url?: string };
  let url = wikimediaUrl(thumbnail?.source);
  // Wikimedia serves fixed thumbnail widths; 1920 suits a background.
  if (url && (original?.width ?? 0) >= 1920)
    url = url.replace(/\/\d+px-([^/?]+)/, '/1920px-$1');
  const filePage = (() => {
    try {
      const page = new URL(String(image?.file_page));
      return page.protocol === 'https:' &&
        page.hostname === 'commons.wikimedia.org'
        ? page.href
        : undefined;
    } catch {
      return undefined;
    }
  })();
  const title = plain(image?.title, 200)
    .replace(/^File:/, '')
    .replace(/\.[a-z0-9]{2,5}$/i, '');
  const licenseName = plain(license?.type, 80);
  if (!url || !filePage || !title || !licenseName)
    throw new Error('Today’s picture is not available.');
  let licenseUrl: string | undefined;
  try {
    licenseUrl =
      license?.url && new URL(license.url).protocol === 'https:'
        ? new URL(license.url).href
        : undefined;
  } catch {
    licenseUrl = undefined;
  }
  return {
    day,
    title,
    url,
    artist:
      plain((image?.artist as { text?: string })?.text, 200) ||
      'Unknown author',
    license: licenseName,
    ...(licenseUrl ? { licenseUrl } : {}),
    filePage,
  };
}

export function parseQuote(input: unknown, day: string): DailyQuote {
  const first = Array.isArray(input) ? input[0] : undefined;
  const text = plain(first?.q, 500),
    author = plain(first?.a, 120);
  // ZenQuotes answers rate-limited requests with an explanatory pseudo-quote.
  if (!text || !author || /zenquotes\.io/i.test(text))
    throw new Error('Today’s quote is not available.');
  return { day, text, author };
}

export function createContentProviderRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  const id = `${spaceId}:providers`;
  async function existing() {
    const record = await database.contentProviders.get(id);
    if (
      record &&
      (record.spaceId !== spaceId || record.deletedAt !== undefined)
    )
      throw new Error('Content settings are unavailable.');
    return record;
  }
  function write(change: (record: ContentProviders) => ContentProviders) {
    return database.transaction(
      'rw',
      database.spaces,
      database.contentProviders,
      async () => {
        await requireSpace(database, spaceId);
        const now = Date.now();
        const current = (await existing()) ?? {
          id,
          spaceId,
          picture: false,
          quote: false,
          createdAt: now,
          updatedAt: now,
        };
        const next = change(current);
        if (next !== current)
          await database.contentProviders.put({ ...next, updatedAt: now });
        return next !== current;
      },
    );
  }
  return {
    get() {
      return database.transaction(
        'r',
        database.spaces,
        database.contentProviders,
        async () => {
          await requireSpace(database, spaceId);
          return (
            (await existing()) ?? {
              id,
              spaceId,
              picture: false,
              quote: false,
              createdAt: 0,
              updatedAt: 0,
            }
          );
        },
      );
    },
    async setEnabled(kind: ProviderKind, enabled: boolean) {
      if (kind !== 'picture' && kind !== 'quote')
        throw new Error('Choose a valid content source.');
      await write((record) => ({
        ...record,
        [kind]: enabled,
        // Turning a source off forgets its cached item.
        ...(enabled
          ? {}
          : kind === 'picture'
            ? { dailyPicture: undefined }
            : { dailyQuote: undefined }),
      }));
    },
    /** True when this tab should fetch today's item for an enabled source. */
    async claim(kind: ProviderKind, day: string, now = Date.now()) {
      return write((record) => {
        const cached =
          kind === 'picture' ? record.dailyPicture : record.dailyQuote;
        if (
          !record[kind] ||
          cached?.day === day ||
          now - (record.claims?.[kind] ?? 0) < CLAIM_WINDOW
        )
          return record;
        return { ...record, claims: { ...record.claims, [kind]: now } };
      });
    },
    async storePicture(item: DailyPicture) {
      await write((record) =>
        record.picture ? { ...record, dailyPicture: item } : record,
      );
    },
    async storeQuote(item: DailyQuote) {
      await write((record) =>
        record.quote ? { ...record, dailyQuote: item } : record,
      );
    },
  };
}
