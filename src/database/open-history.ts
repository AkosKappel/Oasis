import { db, type OasisDatabase } from './schema';
import { requireOwnedRecord, requireSpace } from './records';

export function createOpenHistoryRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  return {
    async record(id: string) {
      await database.transaction(
        'rw',
        database.spaces,
        database.bookmarks,
        database.libraryPreferences,
        async () => {
          await requireSpace(database, spaceId);
          const preferences = await database.libraryPreferences.get(
            `${spaceId}:library`,
          );
          if (
            preferences &&
            (preferences.spaceId !== spaceId ||
              preferences.deletedAt !== undefined)
          )
            throw new Error('Library preferences are unavailable.');
          if (!preferences?.trackOpens) return;
          const bookmark = await requireOwnedRecord(
            database.bookmarks,
            id,
            spaceId,
            'bookmark',
          );
          const now = Date.now();
          await database.bookmarks.update(id, {
            openCount: Math.min(
              Number.MAX_SAFE_INTEGER,
              Math.max(0, Math.floor(bookmark.openCount)) + 1,
            ),
            lastOpenedAt: now,
            updatedAt: now,
          });
        },
      );
    },
    async clear() {
      await database.transaction(
        'rw',
        database.spaces,
        database.bookmarks,
        async () => {
          await requireSpace(database, spaceId);
          await database.bookmarks
            .where('spaceId')
            .equals(spaceId)
            .filter((record) => record.deletedAt === undefined)
            .modify({
              openCount: 0,
              lastOpenedAt: undefined,
              updatedAt: Date.now(),
            });
        },
      );
    },
  };
}
