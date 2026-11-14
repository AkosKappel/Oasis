import { createBookmarkSearch } from '@/features/search/search-bookmarks';
import type { Bookmark, Folder, Tag } from '@/types/entities';

interface BookmarkFilters {
  query: string;
  favoritesOnly: boolean;
  folderId: string;
  tagId: string;
}

export function filterBookmarks(
  bookmarks: Bookmark[],
  folders: Folder[],
  tags: Tag[],
  filters: BookmarkFilters,
) {
  const search = createBookmarkSearch(filters.query, folders, tags);
  const matches: { bookmark: Bookmark; score: number }[] = [];
  for (const bookmark of bookmarks) {
    if (filters.favoritesOnly && !bookmark.isFavorite) continue;
    if (
      filters.folderId === 'unorganized'
        ? !!bookmark.folderId
        : filters.folderId && bookmark.folderId !== filters.folderId
    )
      continue;
    if (
      filters.tagId === 'untagged'
        ? bookmark.tags.length > 0
        : filters.tagId && !bookmark.tags.includes(filters.tagId)
    )
      continue;
    const score = search(bookmark);
    if (score !== undefined) matches.push({ bookmark, score });
  }
  return matches
    .sort((a, b) => a.score - b.score)
    .map(({ bookmark }) => bookmark);
}
