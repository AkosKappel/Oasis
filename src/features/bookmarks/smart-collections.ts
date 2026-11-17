import type { Bookmark } from '@/types/entities';
export type SmartCollection =
  | 'all'
  | 'recent'
  | 'favorites'
  | 'untagged'
  | 'unorganized'
  | 'recently-opened'
  | 'frequently-opened'
  | 'not-opened';
export const NOT_OPENED_DAYS = 90;
export function smartCollection(
  bookmarks: Bookmark[],
  collection: SmartCollection,
  now = Date.now(),
): Bookmark[] {
  switch (collection) {
    case 'not-opened': {
      // Only opens made from Oasis count; never-opened bookmarks age from when they were saved.
      const cutoff = now - NOT_OPENED_DAYS * 86_400_000;
      const activity = (bookmark: Bookmark) =>
        bookmark.lastOpenedAt ?? bookmark.createdAt;
      return bookmarks
        .filter((bookmark) => activity(bookmark) < cutoff)
        .sort((a, b) => activity(a) - activity(b) || a.id.localeCompare(b.id));
    }
    case 'recent':
      return [...bookmarks]
        .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id))
        .slice(0, 50);
    case 'recently-opened':
      return bookmarks
        .filter((bookmark) => bookmark.lastOpenedAt !== undefined)
        .sort(
          (a, b) =>
            b.lastOpenedAt! - a.lastOpenedAt! || a.id.localeCompare(b.id),
        )
        .slice(0, 50);
    case 'frequently-opened':
      return bookmarks
        .filter((bookmark) => bookmark.openCount > 0)
        .sort(
          (a, b) =>
            b.openCount - a.openCount ||
            (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0) ||
            a.id.localeCompare(b.id),
        )
        .slice(0, 50);
    case 'favorites':
      return bookmarks.filter((bookmark) => bookmark.isFavorite);
    case 'untagged':
      return bookmarks.filter((bookmark) => bookmark.tags.length === 0);
    case 'unorganized':
      return bookmarks.filter((bookmark) => !bookmark.folderId);
    default:
      return bookmarks;
  }
}
