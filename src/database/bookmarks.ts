import { moveBefore } from './manual-order';
import { createLibraryPreferencesRepository } from './library-preferences';
import { db, type OasisDatabase } from './schema';
import type { Bookmark } from '@/types/entities';
import { requireOwnedRecord, requireSpace } from './records';

export interface BookmarkInput {
  title: string;
  url: string;
  description: string;
  isFavorite: boolean;
  folderId?: string;
  tags?: string[];
}

export type BulkBookmarkAction =
  | { kind: 'move'; folderId?: string }
  | { kind: 'tags'; tags: string[]; mode: 'add' | 'remove' }
  | { kind: 'delete' };

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
    ...(input.folderId !== undefined
      ? { folderId: input.folderId.trim() || undefined }
      : {}),
    ...(input.tags !== undefined ? { tags: [...new Set(input.tags)] } : {}),
  };
}

export function createBookmarkRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  return {
    async list() {
      await requireSpace(database, spaceId);
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
        database.folders,
        database.tags,
        async () => {
          await requireSpace(database, spaceId);
          if (values.folderId)
            await requireOwnedRecord(
              database.folders,
              values.folderId,
              spaceId,
              'folder',
            );
          if (values.tags) {
            for (const tagId of values.tags)
              await requireOwnedRecord(database.tags, tagId, spaceId, 'tag');
          }
          const now = Date.now();
          if (id) {
            await requireOwnedRecord(
              database.bookmarks,
              id,
              spaceId,
              'bookmark',
            );
            await database.bookmarks.update(id, { ...values, updatedAt: now });
            return id;
          }
          const bookmark: Bookmark = {
            ...values,
            id: crypto.randomUUID(),
            spaceId,
            tags: values.tags ?? [],
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
    async bulkUpdate(ids: string[], action: BulkBookmarkAction) {
      if (
        !Array.isArray(ids) ||
        !ids.length ||
        new Set(ids).size > 1000 ||
        ids.some((id) => typeof id !== 'string' || !id)
      )
        throw new Error('Select between 1 and 1,000 bookmarks.');
      if (!action || !['move', 'tags', 'delete'].includes(action.kind))
        throw new Error('Choose a valid bulk action.');
      if (
        action.kind === 'tags' &&
        (!Array.isArray(action.tags) ||
          !action.tags.length ||
          action.tags.length > 100 ||
          !['add', 'remove'].includes(action.mode))
      )
        throw new Error('Choose up to 100 tags to add or remove.');
      return database.transaction(
        'rw',
        database.spaces,
        database.bookmarks,
        database.folders,
        database.tags,
        async () => {
          await requireSpace(database, spaceId);
          const bookmarks = await Promise.all(
            [...new Set(ids)].map((id) =>
              requireOwnedRecord(database.bookmarks, id, spaceId, 'bookmark'),
            ),
          );
          if (action.kind === 'move' && action.folderId)
            await requireOwnedRecord(
              database.folders,
              action.folderId,
              spaceId,
              'folder',
            );
          if (action.kind === 'tags')
            for (const id of action.tags)
              await requireOwnedRecord(database.tags, id, spaceId, 'tag');
          const now = Date.now();
          await database.bookmarks.bulkPut(
            bookmarks.map((bookmark) => ({
              ...bookmark,
              updatedAt: now,
              ...(action.kind === 'delete'
                ? { deletedAt: now }
                : action.kind === 'move'
                  ? { folderId: action.folderId || undefined }
                  : {
                      tags:
                        action.mode === 'add'
                          ? [...new Set([...bookmark.tags, ...action.tags])]
                          : bookmark.tags.filter(
                              (id) => !action.tags.includes(id),
                            ),
                    }),
            })),
          );
          return bookmarks.length;
        },
      );
    },
    async reorder(id: string, beforeId: string | null) {
      await database.transaction(
        'rw',
        database.spaces,
        database.bookmarks,
        database.libraryPreferences,
        async () => {
          await requireSpace(database, spaceId);
          const records = await database.bookmarks
            .where('spaceId')
            .equals(spaceId)
            .filter((record) => record.deletedAt === undefined)
            .toArray();
          const changes = moveBefore(records, id, beforeId);
          const byId = new Map(records.map((record) => [record.id, record]));
          await database.bookmarks.bulkPut(
            changes.map((change) => ({
              ...byId.get(change.id)!,
              sortOrder: change.sortOrder,
              updatedAt: Date.now(),
            })),
          );
          await createLibraryPreferencesRepository(spaceId, database).save({
            sort: 'manual',
          });
        },
      );
    },
    async remove(id: string) {
      await database.transaction(
        'rw',
        database.spaces,
        database.bookmarks,
        async () => {
          await requireSpace(database, spaceId);
          await requireOwnedRecord(database.bookmarks, id, spaceId, 'bookmark');
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
