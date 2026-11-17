import { db, type OasisDatabase } from './schema';
import { requireOwnedRecord, requireSpace } from './records';
import { validateBookmark } from './bookmarks';
import {
  MAX_SESSION_TABS,
  type SessionTab,
} from '@/features/sessions/session-tabs';

export type SessionDestination = { folderId: string } | { name: string };
export function createSessionRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  return {
    async save(tabs: SessionTab[], destination: SessionDestination) {
      if (!tabs.length || tabs.length > MAX_SESSION_TABS)
        throw new Error('Select between 1 and 500 tabs.');
      const values = tabs.map((tab) =>
        validateBookmark({ ...tab, description: '', isFavorite: false }),
      );
      return database.transaction(
        'rw',
        database.spaces,
        database.folders,
        database.bookmarks,
        async () => {
          await requireSpace(database, spaceId);
          let folderId: string | undefined;
          let name: string | undefined;
          if ('folderId' in destination)
            folderId = (
              await requireOwnedRecord(
                database.folders,
                destination.folderId,
                spaceId,
                'folder',
              )
            ).id;
          else {
            name = destination.name.trim();
            if (!name || name.length > 80)
              throw new Error('Enter a folder name of up to 80 characters.');
            if (
              await database.folders
                .where('spaceId')
                .equals(spaceId)
                .filter(
                  (row) =>
                    row.deletedAt === undefined &&
                    !row.parentId &&
                    row.name.toLowerCase() === name!.toLowerCase(),
                )
                .first()
            )
              throw new Error(
                'A top-level folder with this name already exists. Choose it from the folder list.',
              );
          }
          const existing = await database.bookmarks
            .where('spaceId')
            .equals(spaceId)
            .filter((row) => row.deletedAt === undefined)
            .toArray();
          const urls = new Set(existing.map((row) => row.url));
          const unique = values.filter((row) => {
            if (urls.has(row.url)) return false;
            urls.add(row.url);
            return true;
          });
          if (!unique.length) return { saved: 0, skipped: tabs.length };
          const now = Date.now();
          if (!folderId) {
            folderId = crypto.randomUUID();
            await database.folders.add({
              id: folderId,
              spaceId,
              name: name!,
              sortOrder: now,
              createdAt: now,
              updatedAt: now,
            });
          }
          await database.bookmarks.bulkAdd(
            unique.map((value, index) => ({
              ...value,
              id: crypto.randomUUID(),
              spaceId,
              folderId,
              tags: [],
              isPinned: false,
              openCount: 0,
              sortOrder: now + index,
              createdAt: now,
              updatedAt: now,
            })),
          );
          return { saved: unique.length, skipped: tabs.length - unique.length };
        },
      );
    },
  };
}
