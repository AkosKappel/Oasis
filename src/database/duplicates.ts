import { db, type OasisDatabase } from './schema';
import { requireOwnedRecord, requireSpace } from './records';
import type { Bookmark } from '@/types/entities';
export function duplicateUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    )
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
export function duplicateGroups(bookmarks: Bookmark[]) {
  const groups = new Map<string, Bookmark[]>();
  for (const bookmark of bookmarks) {
    if (bookmark.deletedAt !== undefined) continue;
    const key = duplicateUrl(bookmark.url);
    if (!key) continue;
    const existing = groups.get(key);
    if (existing) existing.push(bookmark);
    else groups.set(key, [bookmark]);
  }
  return [...groups]
    .filter(([, items]) => items.length > 1)
    .map(([url, items]) => ({
      url,
      bookmarks: [...items].sort(
        (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
      ),
    }))
    .sort(
      (a, b) =>
        b.bookmarks.length - a.bookmarks.length || a.url.localeCompare(b.url),
    );
}
type ReviewedBookmark = Pick<Bookmark, 'id' | 'updatedAt'>;
export function createDuplicateRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  return {
    async removeCopies(keeper: ReviewedBookmark, copies: ReviewedBookmark[]) {
      if (
        !copies.length ||
        copies.length > 1000 ||
        copies.some((item) => item.id === keeper.id) ||
        new Set(copies.map((item) => item.id)).size !== copies.length
      )
        throw new Error('Choose copies to remove and keep one bookmark.');
      await database.transaction(
        'rw',
        database.spaces,
        database.bookmarks,
        async () => {
          await requireSpace(database, spaceId);
          const kept = await requireOwnedRecord(
            database.bookmarks,
            keeper.id,
            spaceId,
            'bookmark',
          );
          const key = duplicateUrl(kept.url);
          if (!key) throw new Error('This URL cannot be compared.');
          if (kept.updatedAt !== keeper.updatedAt)
            throw new Error('A bookmark changed. Review the group again.');
          const records: Bookmark[] = [];
          for (const reviewed of copies) {
            const record = await requireOwnedRecord(
              database.bookmarks,
              reviewed.id,
              spaceId,
              'bookmark',
            );
            if (
              duplicateUrl(record.url) !== key ||
              record.updatedAt !== reviewed.updatedAt
            )
              throw new Error('A bookmark changed. Review the group again.');
            records.push(record);
          }
          const now = Date.now();
          await database.bookmarks.bulkPut(
            records.map((record) => ({
              ...record,
              deletedAt: now,
              favicon: undefined,
              image: undefined,
              updatedAt: now,
            })),
          );
        },
      );
    },
  };
}
export const personalDuplicates = createDuplicateRepository('default');
