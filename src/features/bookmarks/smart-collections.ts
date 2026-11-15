import type { Bookmark } from '@/types/entities';
export type SmartCollection =
  'all' | 'recent' | 'favorites' | 'untagged' | 'unorganized';
export function smartCollection(
  bookmarks: Bookmark[],
  collection: SmartCollection,
): Bookmark[] {
  switch (collection) {
    case 'recent':
      return [...bookmarks]
        .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id))
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
