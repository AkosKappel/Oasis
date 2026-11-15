import type { Bookmark } from '@/types/entities';
export type SmartCollection =
  | 'all'
  | 'recent'
  | 'favorites'
  | 'untagged'
  | 'unorganized'
  | 'recently-opened'
  | 'frequently-opened';
export function smartCollection(
  bookmarks: Bookmark[],
  collection: SmartCollection,
): Bookmark[] {
  switch (collection) {
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
