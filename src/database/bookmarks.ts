import { db, type OasisDatabase } from './schema';
import type { Bookmark } from '@/types/entities';

export interface BookmarkInput {
  title: string;
  url: string;
  description: string;
  isFavorite: boolean;
}

export function validateBookmark(input: BookmarkInput): BookmarkInput {
  const title = input.title.trim();
  if (!title) throw new Error('Enter a title for your bookmark.');
  let url: URL;
  try {
    url = new URL(input.url.trim());
  } catch {
    throw new Error('Enter a complete URL, such as https://example.com.');
  }
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname) {
    throw new Error('Use an http:// or https:// URL.');
  }
  if (url.username || url.password) {
    throw new Error('Remove the username and password from the URL.');
  }
  return {
    title,
    url: url.href,
    description: input.description.trim(),
    isFavorite: input.isFavorite,
  };
}

export function createBookmarkRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  async function requireSpace() {
    const space = await database.spaces.get(spaceId);
    if (!space || space.deletedAt !== undefined)
      throw new Error('This space is unavailable.');
  }
  async function requireBookmark(id: string) {
    const bookmark = await database.bookmarks.get(id);
    if (
      !bookmark ||
      bookmark.spaceId !== spaceId ||
      bookmark.deletedAt !== undefined
    ) {
      throw new Error('This bookmark is no longer available.');
    }
    return bookmark;
  }
  return {
    async list() {
      await requireSpace();
      return database.bookmarks
        .where('spaceId')
        .equals(spaceId)
        .filter((bookmark) => bookmark.deletedAt === undefined)
        .reverse()
        .sortBy('createdAt');
    },
    async save(input: BookmarkInput, id?: string) {
      const values = validateBookmark(input);
      return database.transaction(
        'rw',
        database.spaces,
        database.bookmarks,
        async () => {
          await requireSpace();
          const now = Date.now();
          if (id) {
            await requireBookmark(id);
            await database.bookmarks.update(id, { ...values, updatedAt: now });
            return id;
          }
          const bookmark: Bookmark = {
            ...values,
            id: crypto.randomUUID(),
            spaceId,
            tags: [],
            isPinned: false,
            sortOrder: now,
            createdAt: now,
            updatedAt: now,
            openCount: 0,
          };
          await database.bookmarks.add(bookmark);
          return bookmark.id;
        },
      );
    },
    async remove(id: string) {
      await database.transaction(
        'rw',
        database.spaces,
        database.bookmarks,
        async () => {
          await requireSpace();
          await requireBookmark(id);
          const now = Date.now();
          await database.bookmarks.update(id, {
            deletedAt: now,
            updatedAt: now,
          });
        },
      );
    },
  };
}

export const personalBookmarks = createBookmarkRepository('default');
