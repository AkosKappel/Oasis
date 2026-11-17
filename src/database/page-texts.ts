import { db, type OasisDatabase } from './schema';
import { requireSpace } from './records';
import type { RecordMetadata } from '@/types/entities';

export const MAX_PAGE_TEXT = 100_000;
export const MAX_HIGHLIGHTS = 200;
export const MAX_HIGHLIGHT_NOTE = 1000;

export interface PageHighlight {
  id: string;
  start: number;
  end: number;
  note?: string;
  createdAt: number;
}

export interface PageText extends RecordMetadata {
  spaceId: string;
  bookmarkId: string;
  text: string;
  capturedAt: number;
  highlights: PageHighlight[];
}

/** Collapses page whitespace into readable paragraphs and bounds the size. */
export function normalizePageText(input: string) {
  return input
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_PAGE_TEXT);
}

export function validateHighlights(text: string, input: unknown) {
  if (!Array.isArray(input) || input.length > MAX_HIGHLIGHTS)
    throw new Error('Saved highlights are invalid.');
  const highlights = input.map((value: PageHighlight) => {
    if (
      !value ||
      typeof value.id !== 'string' ||
      !value.id ||
      value.id.length > 200 ||
      !Number.isInteger(value.start) ||
      !Number.isInteger(value.end) ||
      value.start < 0 ||
      value.end <= value.start ||
      value.end > text.length ||
      !Number.isFinite(value.createdAt) ||
      (value.note !== undefined &&
        (typeof value.note !== 'string' ||
          value.note.length > MAX_HIGHLIGHT_NOTE))
    )
      throw new Error('Saved highlights are invalid.');
    return {
      id: value.id,
      start: value.start,
      end: value.end,
      ...(value.note?.trim() ? { note: value.note.trim() } : {}),
      createdAt: value.createdAt,
    };
  });
  if (new Set(highlights.map((item) => item.id)).size !== highlights.length)
    throw new Error('Saved highlights are invalid.');
  return highlights.sort((a, b) => a.start - b.start);
}

/** Keeps highlights whose quoted text still appears in a refreshed copy. */
export function reanchorHighlights(
  previous: string,
  next: string,
  highlights: PageHighlight[],
) {
  const kept: PageHighlight[] = [];
  for (const highlight of highlights) {
    const quote = previous.slice(highlight.start, highlight.end);
    const start = next.indexOf(quote);
    if (start >= 0)
      kept.push({ ...highlight, start, end: start + quote.length });
  }
  return kept;
}

export function createPageTextRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  async function owned(bookmarkId: string) {
    const record = await database.pageTexts.get(bookmarkId);
    if (
      record &&
      (record.spaceId !== spaceId || record.deletedAt !== undefined)
    )
      return undefined;
    return record;
  }
  function write<T>(action: () => Promise<T>) {
    return database.transaction(
      'rw',
      [database.spaces, database.bookmarks, database.pageTexts],
      async () => {
        await requireSpace(database, spaceId);
        return action();
      },
    );
  }
  async function existing(bookmarkId: string, revision: number) {
    const record = await owned(bookmarkId);
    if (!record || record.updatedAt !== revision)
      throw new Error(
        'This page text changed in another tab. Reopen it to see the latest version.',
      );
    return record;
  }
  return {
    get(bookmarkId: string) {
      return database.transaction(
        'r',
        database.spaces,
        database.pageTexts,
        async () => {
          await requireSpace(database, spaceId);
          return owned(bookmarkId);
        },
      );
    },
    /** IDs of bookmarks with a saved copy, for showing the Page text action. */
    async savedIds() {
      return database.transaction(
        'r',
        database.spaces,
        database.pageTexts,
        async () => {
          await requireSpace(database, spaceId);
          const ids: string[] = [];
          await database.pageTexts
            .where('spaceId')
            .equals(spaceId)
            .each((record) => {
              if (record.deletedAt === undefined) ids.push(record.bookmarkId);
            });
          return new Set(ids);
        },
      );
    },
    // Known limit: a linear scan over saved copies. Add a word index if libraries keep thousands of them.
    async search(query: string) {
      const needle = query.trim().toLowerCase();
      if (needle.length < 3) return new Set<string>();
      return database.transaction(
        'r',
        database.spaces,
        database.pageTexts,
        async () => {
          await requireSpace(database, spaceId);
          const ids: string[] = [];
          await database.pageTexts
            .where('spaceId')
            .equals(spaceId)
            .each((record) => {
              if (
                record.deletedAt === undefined &&
                record.text.toLowerCase().includes(needle)
              )
                ids.push(record.bookmarkId);
            });
          return new Set(ids);
        },
      );
    },
    async save(bookmarkId: string, input: string) {
      const text = normalizePageText(input);
      if (!text) throw new Error('This page has no readable text to save.');
      return write(async () => {
        const bookmark = await database.bookmarks.get(bookmarkId);
        if (
          !bookmark ||
          bookmark.spaceId !== spaceId ||
          bookmark.deletedAt !== undefined
        )
          throw new Error('Save the bookmark before keeping its page text.');
        const previous = await owned(bookmarkId);
        const now = Math.max(Date.now(), (previous?.updatedAt ?? 0) + 1);
        await database.pageTexts.put({
          id: bookmarkId,
          spaceId,
          bookmarkId,
          text,
          capturedAt: now,
          highlights: previous
            ? reanchorHighlights(previous.text, text, previous.highlights)
            : [],
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        });
      });
    },
    addHighlight(
      bookmarkId: string,
      revision: number,
      start: number,
      end: number,
      note = '',
    ) {
      return write(async () => {
        const record = await existing(bookmarkId, revision);
        if (record.highlights.length >= MAX_HIGHLIGHTS)
          throw new Error('Remove a highlight before adding another.');
        if (
          record.highlights.some((item) => start < item.end && end > item.start)
        )
          throw new Error('Choose text that is not already highlighted.');
        const now = Math.max(Date.now(), record.updatedAt + 1);
        const highlights = validateHighlights(record.text, [
          ...record.highlights,
          { id: crypto.randomUUID(), start, end, note, createdAt: now },
        ]);
        await database.pageTexts.update(bookmarkId, {
          highlights,
          updatedAt: now,
        });
      });
    },
    updateHighlight(
      bookmarkId: string,
      revision: number,
      id: string,
      note: string,
    ) {
      return write(async () => {
        const record = await existing(bookmarkId, revision);
        if (!record.highlights.some((item) => item.id === id))
          throw new Error('This highlight was removed.');
        const highlights = validateHighlights(
          record.text,
          record.highlights.map((item) =>
            item.id === id ? { ...item, note } : item,
          ),
        );
        await database.pageTexts.update(bookmarkId, {
          highlights,
          updatedAt: Math.max(Date.now(), record.updatedAt + 1),
        });
      });
    },
    removeHighlight(bookmarkId: string, revision: number, id: string) {
      return write(async () => {
        const record = await existing(bookmarkId, revision);
        await database.pageTexts.update(bookmarkId, {
          highlights: record.highlights.filter((item) => item.id !== id),
          updatedAt: Math.max(Date.now(), record.updatedAt + 1),
        });
      });
    },
    remove(bookmarkId: string, revision: number) {
      return write(async () => {
        const record = await existing(bookmarkId, revision);
        const now = Math.max(Date.now(), record.updatedAt + 1);
        await database.pageTexts.update(bookmarkId, {
          text: '',
          highlights: [],
          deletedAt: now,
          updatedAt: now,
        });
      });
    },
  };
}
